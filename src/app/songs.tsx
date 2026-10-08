import { useRouter } from 'expo-router';

import { IpodShell } from '@/components/ipod/IpodShell';
import { LibraryList } from '@/components/ipod/LibraryList';
import type { MenuListItem } from '@/components/ipod/MenuList';
import { useEnsureScanned, useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useWheelNav } from '@/hooks/useWheelNav';
import { usePlaybackToggle } from '@/hooks/usePlaybackToggle';
import { usePlayerStore } from '@/store/player';
import { formatTrackDuration } from '@/utils/format';

export default function SongsScreen() {
  const router = useRouter();
  const togglePlayback = usePlaybackToggle();
  const { tracks } = useMediaLibrary();
  useEnsureScanned();
  const playQueue = usePlayerStore((s) => s.playQueue);

  const items: MenuListItem[] = tracks.map((t) => ({
    id: t.id,
    label: t.title,
    sublabel: `${t.artist} · ${formatTrackDuration(t.duration)}`,
  }));

  const { selected, move, enter } = useWheelNav({
    count: items.length,
    onEnter: (index) => {
      // 中键以当前列表为队列，播放选中的曲目并进入播放界面
      playQueue(tracks, index);
      router.push('/player');
    },
  });

  return (
    <IpodShell
      lcdTitle={`歌曲 ${tracks.length}`}
      wheel={{
        onMenu: () => router.back(),
        onPrev: () => move(-1),
        onNext: () => move(1),
        onRotate: move,
        onPlayPause: togglePlayback,
        onSelect: enter,
      }}
    >
      <LibraryList items={items} selectedIndex={selected} />
    </IpodShell>
  );
}
