import { Directory, File } from 'expo-file-system';

/** 支持的音频扩展名（小写、不含点）。与 design.md §1.2（mp3 / flac / m4a）对齐并做扩展。 */
const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'flac',
  'm4a',
  'aac',
  'wav',
  'ogg',
  'oga',
  'opus',
  'wma',
  'aif',
  'aiff',
]);

/**
 * 扫描候选目录及其递归深度预算：Android 共享存储里常见的音乐位置。
 * 根目录只下钻 1 层——设备根下还有 Android/、系统目录等大量无关内容，深挖代价高收益低。
 */
const CANDIDATE_DIRS: { uri: string; depth: number }[] = [
  { uri: 'file:///storage/emulated/0/Music', depth: 3 },
  { uri: 'file:///storage/emulated/0/Download', depth: 2 },
  { uri: 'file:///storage/emulated/0/Downloads', depth: 2 },
  { uri: 'file:///storage/emulated/0/Documents', depth: 2 },
  { uri: 'file:///storage/emulated/0/Podcasts', depth: 2 },
  { uri: 'file:///storage/emulated/0/Recordings', depth: 2 },
  { uri: 'file:///storage/emulated/0', depth: 1 },
];

/** 单次扫描最多收集的文件数，兜住异常目录结构的极端情况。 */
const MAX_FILES = 5000;

export interface FoundAudioFile {
  uri: string;
  name: string;
}

export interface FilesystemScanResult {
  files: FoundAudioFile[];
  /** 不可读目录等错误的摘要，用于诊断展示（不阻断扫描）。 */
  errors: string[];
}

/**
 * 直接扫描共享存储中的音频文件。
 *
 * 作为 MediaStore（expo-media-library）的兜底：通过 adb push / 文件管理器放进设备、
 * 但尚未被媒体扫描器索引的文件，MediaStore 查不到，只能靠文件系统扫描发现。
 *
 * 注意：`Directory.list()` 是同步 JSI 调用，无法在单次调用内部中断；
 * 因此这里在每个目录处理完后主动让出事件循环，避免长时间独占 JS 线程导致界面卡死。
 * 任何目录不可读都只记录错误并跳过，保证整体扫描不中断。
 */
export async function scanAudioFiles(): Promise<FilesystemScanResult> {
  const found = new Map<string, FoundAudioFile>();
  const errors: string[] = [];
  const visited = new Set<string>();

  const yieldToEventLoop = () => new Promise((resolve) => setTimeout(resolve, 0));

  const walk = async (dirUri: string, depthLeft: number): Promise<void> => {
    if (depthLeft < 0 || visited.has(dirUri) || found.size >= MAX_FILES) return;
    visited.add(dirUri);

    let entries: (File | Directory)[];
    try {
      const dir = new Directory(dirUri);
      if (!dir.exists) return;
      entries = dir.list();
    } catch (err) {
      errors.push(`${dirUri}: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    const subdirectories: string[] = [];
    for (const entry of entries) {
      if (found.size >= MAX_FILES) break;
      try {
        if (entry instanceof Directory) {
          subdirectories.push(entry.uri);
        } else if (entry instanceof File) {
          const ext = entry.extension.replace(/^\./, '').toLowerCase();
          if (AUDIO_EXTENSIONS.has(ext)) {
            found.set(entry.uri, { uri: entry.uri, name: entry.name });
          }
        }
      } catch {
        // 单个条目读取失败忽略
      }
    }

    // 每处理完一个目录就让出一次事件循环，保证扫描期间 UI 仍可响应
    await yieldToEventLoop();

    for (const subdirectory of subdirectories) {
      await walk(subdirectory, depthLeft - 1);
    }
  };

  for (const { uri, depth } of CANDIDATE_DIRS) {
    await walk(uri, depth);
    if (found.size >= MAX_FILES) break;
  }

  return { files: [...found.values()], errors };
}
