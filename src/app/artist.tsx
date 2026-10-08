import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';

import { IpodShell } from '@/components/ipod/IpodShell';
import { LibraryList } from '@/components/ipod/LibraryList';
import type { MenuListItem } from '@/components/ipod/MenuList';
import { useEnsureScanned, useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useWheelNav } from '@/hooks/useWheelNav';
import { usePlaybackToggle } from '@/hooks/usePlaybackToggle';
import { buildAlbums, buildArtists } from '@/services/libraryIndex';

/** 歌手 → 专辑列表（§4 信息架构：歌手 ──▶ 专辑 ──▶ 曲目）。 */
export default function ArtistScreen() {
  const router = useRouter();
  const togglePlayback = usePlaybackToggle();
  const params = useLocalSearchParams<{ artist?: string }>();
  const { tracks } = useMediaLibrary();
  useEnsureScanned();

  const artistName = params.artist ?? '';
  const artist = useMemo(
    () => buildArtists(buildAlbums(tracks)).find((a) => a.name === artistName) ?? null,
    [tracks, artistName],
  );

  const items: MenuListItem[] = useMemo(
    () =>
      (artist?.albums ?? []).map((album) => ({
        id: album.name,
        label: album.name,
        sublabel: `${album.tracks.length} 首${album.year != null ? ` · ${album.year}` : ''}`,
      })),
    [artist],
  );

  const { selected, move, enter } = useWheelNav({
    count: items.length,
    onEnter: (index) => {
      const album = artist?.albums[index];
      if (album) {
        router.push({
          pathname: '/album',
          params: { album: album.name, artist: album.artist },
        });
      }
    },
  });

  return (
    <IpodShell
      lcdTitle={artistName || '歌手'}
      wheel={{
        onMenu: () => router.back(),
        onPrev: () => move(-1),
        onNext: () => move(1),
        onRotate: move,
        onPlayPause: togglePlayback,
        onSelect: enter,
      }}
    >
      <LibraryList items={items} selectedIndex={selected} emptyText="该歌手没有专辑" />
    </IpodShell>
  );
}
