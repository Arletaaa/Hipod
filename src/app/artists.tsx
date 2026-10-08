import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { IpodShell } from '@/components/ipod/IpodShell';
import { LibraryList } from '@/components/ipod/LibraryList';
import type { MenuListItem } from '@/components/ipod/MenuList';
import { useEnsureScanned, useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useWheelNav } from '@/hooks/useWheelNav';
import { buildAlbums, buildArtists } from '@/services/libraryIndex';

export default function ArtistsScreen() {
  const router = useRouter();
  const { tracks } = useMediaLibrary();
  useEnsureScanned();

  const artists = useMemo(() => buildArtists(buildAlbums(tracks)), [tracks]);
  const items: MenuListItem[] = useMemo(
    () =>
      artists.map((artist) => ({
        id: artist.name,
        label: artist.name,
        sublabel: `${artist.albums.length} 张专辑 · ${artist.trackCount} 首`,
      })),
    [artists],
  );

  const { selected, move, enter } = useWheelNav({
    count: items.length,
    onEnter: (index) => {
      const artist = artists[index];
      if (artist) {
        router.push({ pathname: '/artist', params: { artist: artist.name } });
      }
    },
  });

  return (
    <IpodShell
      lcdTitle={`歌手 ${artists.length}`}
      wheel={{
        onMenu: () => router.back(),
        onPrev: () => move(-1),
        onNext: () => move(1),
        onRotate: move,
        onPlayPause: () => console.log('[artists] ▶❚❚'),
        onSelect: enter,
      }}
    >
      <LibraryList items={items} selectedIndex={selected} emptyText="没有歌手信息" />
    </IpodShell>
  );
}
