import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';

import { IpodShell } from '@/components/ipod/IpodShell';
import { LibraryList } from '@/components/ipod/LibraryList';
import type { MenuListItem } from '@/components/ipod/MenuList';
import { useEnsureScanned, useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useWheelNav } from '@/hooks/useWheelNav';
import { buildAlbums } from '@/services/libraryIndex';
import { usePlayerStore } from '@/store/player';
import { formatTrackDuration } from '@/utils/format';

/** 专辑 → 曲目列表；中键以整张专辑为队列开始播放（iPod 行为）。 */
export default function AlbumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ album?: string; artist?: string }>();
  const { tracks } = useMediaLibrary();
  useEnsureScanned();
  const playQueue = usePlayerStore((s) => s.playQueue);

  const album = useMemo(() => {
    const found = buildAlbums(tracks).find(
      (a) => a.name === (params.album ?? '') && a.artist === (params.artist ?? ''),
    );
    return found ?? null;
  }, [tracks, params.album, params.artist]);

  const albumTracks = album?.tracks ?? [];
  const items: MenuListItem[] = useMemo(
    () =>
      albumTracks.map((track) => ({
        id: track.id,
        label: track.title,
        sublabel: `${track.trackNumber > 0 ? `${track.trackNumber}. ` : ''}${formatTrackDuration(
          track.duration,
        )}`,
      })),
    [albumTracks],
  );

  const { selected, move, enter } = useWheelNav({
    count: items.length,
    onEnter: (index) => {
      if (albumTracks.length === 0) return;
      playQueue(albumTracks, index);
      router.push('/player');
    },
  });

  return (
    <IpodShell
      lcdTitle={album ? `${album.name}` : '专辑'}
      wheel={{
        onMenu: () => router.back(),
        onPrev: () => move(-1),
        onNext: () => move(1),
        onRotate: move,
        onPlayPause: () => console.log('[album] ▶❚❚'),
        onSelect: enter,
      }}
    >
      <LibraryList items={items} selectedIndex={selected} emptyText="该专辑没有曲目" />
    </IpodShell>
  );
}
