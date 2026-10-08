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

/** 扫描候选目录：Android 共享存储里常见的音乐位置。 */
const CANDIDATE_DIRS = [
  'file:///storage/emulated/0/Music',
  'file:///storage/emulated/0/Download',
  'file:///storage/emulated/0/Downloads',
  'file:///storage/emulated/0/Documents',
  'file:///storage/emulated/0/Podcasts',
  'file:///storage/emulated/0/Recordings',
  'file:///storage/emulated/0',
];

/** 最大递归深度，避免深层目录拖慢扫描。 */
const MAX_DEPTH = 4;

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
 * 任何目录不可读都只记录错误并跳过，保证整体扫描不中断。
 */
export function scanAudioFiles(): FilesystemScanResult {
  const found = new Map<string, FoundAudioFile>();
  const errors: string[] = [];
  const visited = new Set<string>();

  const walk = (dirUri: string, depth: number): void => {
    if (depth > MAX_DEPTH || visited.has(dirUri)) return;
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

    for (const entry of entries) {
      try {
        if (entry instanceof Directory) {
          walk(entry.uri, depth + 1);
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
  };

  for (const dir of CANDIDATE_DIRS) {
    walk(dir, 0);
  }

  return { files: [...found.values()], errors };
}
