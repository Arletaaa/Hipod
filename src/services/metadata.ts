import { getMetadata, MetadataPresets } from '@missingcore/react-native-metadata-retriever';

/**
 * 读取单个音频文件的标签（不含封面、不含时长）。
 * 用 MetadataPresets.standard：artist / albumArtist / albumTitle / title / trackNumber / year。
 * 注意字段名：专辑是 `albumTitle`（不是 `album`）。
 */
export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  trackNumber: number;
  year?: number;
}

export async function readTrackMetadata(uri: string): Promise<TrackMetadata> {
  const meta = await getMetadata(uri, MetadataPresets.standard);

  const title = (meta.title ?? '').trim();
  const artist = (meta.artist ?? '').trim();
  const album = (meta.albumTitle ?? '').trim();
  const albumArtist = (meta.albumArtist ?? '').trim();
  const trackNumber = meta.trackNumber ?? 0;
  const year = meta.year ?? undefined;

  return {
    title: title || fallbackTitleFromUri(uri),
    artist: artist || '未知艺术家',
    album: album || '未知专辑',
    albumArtist: albumArtist || artist || '未知艺术家',
    trackNumber,
    ...(year != null ? { year } : {}),
  };
}

function fallbackTitleFromUri(uri: string): string {
  try {
    const base = decodeURIComponent(uri).split('/').pop() ?? uri;
    return base.replace(/\.[^.]+$/, '') || '未知曲目';
  } catch {
    return '未知曲目';
  }
}
