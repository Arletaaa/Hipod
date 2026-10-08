import type { Track } from '@/types/track';

/** 专辑分组：同一「专辑艺术家 + 专辑名」的曲目集合。 */
export interface AlbumGroup {
  name: string;
  artist: string;
  year?: number;
  /** 曲目已按音轨号排序。 */
  tracks: Track[];
}

/** 歌手分组（按专辑艺术家聚合，内含其专辑列表）。 */
export interface ArtistGroup {
  name: string;
  albums: AlbumGroup[];
  trackCount: number;
}

/** 专辑分组键：无专辑艺术家时退回曲目艺术家。 */
function albumKeyOf(track: Track): string {
  return `${track.albumArtist || track.artist}|||${track.album}`;
}

function albumArtistOf(track: Track): string {
  return track.albumArtist || track.artist;
}

/**
 * 由曲目列表聚合出专辑（§4 信息架构：专辑 → 曲目）。
 * 排序：专辑艺术家 → 专辑名；专辑内按音轨号，缺失音轨号时按标题。
 */
export function buildAlbums(tracks: Track[]): AlbumGroup[] {
  const map = new Map<string, AlbumGroup>();

  for (const track of tracks) {
    const key = albumKeyOf(track);
    let group = map.get(key);
    if (!group) {
      group = { name: track.album, artist: albumArtistOf(track), tracks: [] };
      map.set(key, group);
    }
    group.tracks.push(track);
    if (group.year == null && track.year != null) group.year = track.year;
  }

  const albums = [...map.values()];
  for (const album of albums) {
    album.tracks.sort(
      (a, b) => (a.trackNumber || 0) - (b.trackNumber || 0) || a.title.localeCompare(b.title),
    );
  }
  albums.sort(
    (a, b) => a.artist.localeCompare(b.artist) || a.name.localeCompare(b.name),
  );
  return albums;
}

/** 由专辑聚合出歌手（§4 信息架构：歌手 → 专辑）。 */
export function buildArtists(albums: AlbumGroup[]): ArtistGroup[] {
  const map = new Map<string, ArtistGroup>();

  for (const album of albums) {
    let group = map.get(album.artist);
    if (!group) {
      group = { name: album.artist, albums: [], trackCount: 0 };
      map.set(album.artist, group);
    }
    group.albums.push(album);
    group.trackCount += album.tracks.length;
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
