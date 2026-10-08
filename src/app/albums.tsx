import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { IpodShell } from '@/components/ipod/IpodShell';
import { LibraryList } from '@/components/ipod/LibraryList';
import type { MenuListItem } from '@/components/ipod/MenuList';
import { useEnsureScanned, useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useWheelNav } from '@/hooks/useWheelNav';
import { buildAlbums } from '@/services/libraryIndex';

export default function AlbumsScreen() {
  const router = useRouter();
  const { tracks } = useMediaLibrary();
  useEnsureScanned();

  const albums = useMemo(() => buildAlbums(tracks), [tracks]);
  const items: MenuListItem[] = useMemo(
    () =>
      albums.map((album) => ({
        id: `${album.artist}|||${album.name}`,
        label: album.name,
        sublabel: `${album.artist} · ${album.tracks.length} 首`,
      })),
    [albums],
  );

  const { selected, move, enter } = useWheelNav({
    count: items.length,
    onEnter: (index) => {
      const album = albums[index];
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
      lcdTitle={`专辑 ${albums.length}`}
      wheel={{
        onMenu: () => router.back(),
        onPrev: () => move(-1),
        onNext: () => move(1),
        onRotate: move,
        onPlayPause: () => console.log('[albums] ▶❚❚'),
        onSelect: enter,
      }}
    >
      <LibraryList items={items} selectedIndex={selected} emptyText="没有专辑信息" />
    </IpodShell>
  );
}
