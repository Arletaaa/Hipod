import { getAssetsAsync, requestPermissionsAsync } from 'expo-media-library/legacy';
import type { Asset } from 'expo-media-library/legacy';

import { scanAudioFiles, type FoundAudioFile } from '@/services/filesystemScan';
import { readTrackMetadata, type TrackMetadata } from '@/services/metadata';
import type { Track } from '@/types/track';

const PAGE_SIZE = 200; // 每次分页拉取的资产数
const BATCH_SIZE = 20; // 每批处理的曲目数，批间让出事件循环避免卡 UI

export interface ScanProgress {
  processed: number;
  total: number;
}

/** 扫描诊断信息：用于设置页/空态提示，定位「为什么扫不到歌」。 */
export interface ScanStats {
  /** MediaStore（媒体索引库）命中数。 */
  mediaStoreCount: number;
  /** 仅由文件系统扫描补充（未被媒体索引）的数量。 */
  filesystemCount: number;
  /** 文件系统扫描中不可读目录的错误摘要。 */
  filesystemErrors: string[];
}

export interface ScanResult {
  tracks: Track[];
  stats: ScanStats;
}

/**
 * 扫描本地音频，双来源合并：
 * 1. MediaStore（expo-media-library）——正常索引过的音频，能拿到时长；
 * 2. 文件系统扫描（services/filesystemScan）——兜底：通过 adb push / 文件管理器放入、
 *    但尚未被媒体扫描器索引的文件，MediaStore 查不到，只能靠遍历目录发现。
 *    这类文件拿不到时长（MediaStore 是唯一时长来源），列表显示为「—」，
 *    播放时由 native 播放器回填真实时长。
 *
 * - 请求 READ_MEDIA_AUDIO 权限后开始扫描
 * - 封面惰性：不在此解析（见 services/artwork.ts 的 resolveArtwork）
 * - 分批处理：每 BATCH_SIZE 首让出一次事件循环，并回报进度
 */
export async function scanLibrary(
  onProgress?: (p: ScanProgress) => void,
): Promise<ScanResult> {
  const perm = await requestPermissionsAsync(false, ['audio']);
  if (!perm.granted) {
    throw new Error(
      perm.canAskAgain ? '需要媒体权限才能扫描本地音乐' : '媒体权限被永久拒绝，请在系统设置中开启',
    );
  }

  // ---- 1. MediaStore 分页拉取 ----
  const assets: Asset[] = [];
  let after: string | undefined;
  let hasNext = true;
  while (hasNext) {
    const page = await getAssetsAsync({
      first: PAGE_SIZE,
      mediaType: 'audio',
      sortBy: 'default',
      ...(after ? { after } : {}),
    });
    assets.push(...page.assets);
    hasNext = page.hasNextPage;
    after = page.endCursor;
  }

  // ---- 2. 文件系统兜底（排除已被 MediaStore 收录的同名文件）----
  const fsResult = await scanAudioFiles();
  const knownPaths = new Set(assets.map((a) => normalizePath(a.uri)));
  const extraFiles = fsResult.files.filter((f) => !knownPaths.has(normalizePath(f.uri)));

  // ---- 3. 逐首读标签 ----
  const total = assets.length + extraFiles.length;
  const tracks: Track[] = [];
  let processed = 0;

  const runBatch = async <T, R>(
    items: T[],
    convert: (item: T) => Promise<R>,
    push: (results: R[]) => void,
    report?: () => void,
  ) => {
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      push(await Promise.all(batch.map(convert)));
      processed += batch.length;
      report?.();
      onProgress?.({ processed: Math.min(processed, total), total });
      if (processed < total) {
        // 让出事件循环，保证扫描期间 UI 可响应
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  };

  await runBatch(assets, assetToTrack, (batch) => tracks.push(...batch));
  await runBatch(extraFiles, fileToTrack, (batch) => tracks.push(...batch));

  // 歌曲列表按标题排序（拼音/中文排序留到后续精修）
  tracks.sort((a, b) => a.title.localeCompare(b.title));

  return {
    tracks,
    stats: {
      mediaStoreCount: assets.length,
      filesystemCount: extraFiles.length,
      filesystemErrors: fsResult.errors,
    },
  };
}

/** 统一路径比较：解码百分号转义 + 忽略大小写。 */
function normalizePath(uri: string): string {
  try {
    return decodeURIComponent(uri).toLowerCase();
  } catch {
    return uri.toLowerCase();
  }
}

function fallbackMetadata(filename: string): TrackMetadata {
  return {
    title: titleFromFilename(filename),
    artist: '未知艺术家',
    album: '未知专辑',
    albumArtist: '未知艺术家',
    trackNumber: 0,
  };
}

async function assetToTrack(asset: Asset): Promise<Track> {
  let meta: TrackMetadata;
  try {
    meta = await readTrackMetadata(asset.uri);
  } catch {
    // 单个文件读取失败（损坏/被删）不阻断整库扫描，回退到文件名
    meta = fallbackMetadata(asset.filename);
  }
  return {
    id: asset.id,
    uri: asset.uri,
    title: meta.title,
    artist: meta.artist,
    albumArtist: meta.albumArtist || meta.artist,
    album: meta.album,
    albumId: asset.albumId ?? meta.album,
    duration: Math.round(asset.duration * 1000), // 秒 → 毫秒
    trackNumber: meta.trackNumber,
    ...(meta.year != null ? { year: meta.year } : {}),
  };
}

/** 文件系统发现的曲目：时长未知（0），由播放器在播放时回填。 */
async function fileToTrack(file: FoundAudioFile): Promise<Track> {
  let meta: TrackMetadata;
  try {
    meta = await readTrackMetadata(file.uri);
  } catch {
    meta = fallbackMetadata(file.name);
  }
  return {
    id: `fs:${file.uri}`,
    uri: file.uri,
    title: meta.title,
    artist: meta.artist,
    albumArtist: meta.albumArtist || meta.artist,
    album: meta.album,
    albumId: meta.album,
    duration: 0,
    trackNumber: meta.trackNumber,
    ...(meta.year != null ? { year: meta.year } : {}),
  };
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, '') || '未知曲目';
}
