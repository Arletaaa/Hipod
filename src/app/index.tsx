import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { IpodShell } from '@/components/ipod/IpodShell';
import { MenuList, type MenuListItem } from '@/components/ipod/MenuList';
import { useEnsureScanned, useMediaLibrary } from '@/hooks/useMediaLibrary';
import { usePlaybackToggle } from '@/hooks/usePlaybackToggle';
import { useWheelNav } from '@/hooks/useWheelNav';
import { usePlayerStore } from '@/store/player';
import { shuffleArray } from '@/utils/array';

/** 主菜单固定项（§4 信息架构）。 */
const BASE_ITEMS: MenuListItem[] = [
  { id: 'music', label: '音乐 Music' },
  { id: 'shuffle', label: '随机播放 Shuffle Songs' },
  { id: 'settings', label: '设置 Settings' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { tracks } = useMediaLibrary();
  useEnsureScanned();
  const togglePlayback = usePlaybackToggle();
  const playQueue = usePlayerStore((s) => s.playQueue);
  const currentTrack = usePlayerStore((s) => s.queue[s.currentIndex] ?? null);

  // 有曲目在播放时，主菜单底部追加「正在播放 + 当前曲名」（曲名过长则跑马灯滚动）
  const items: MenuListItem[] = useMemo(() => {
    if (!currentTrack) return BASE_ITEMS;
    return [
      ...BASE_ITEMS,
      {
        id: 'nowPlaying',
        label: '正在播放',
        sublabel: currentTrack.title,
        marqueeSublabel: true,
      },
    ];
  }, [currentTrack]);

  const { selected, move, enter } = useWheelNav({
    count: items.length,
    onEnter: (index) => {
      const item = items[index];
      if (!item) return;
      switch (item.id) {
        case 'music':
          router.push('/music');
          break;
        case 'shuffle':
          // 随机播放：打乱整个曲库并立即开始播放
          if (tracks.length > 0) {
            playQueue(shuffleArray(tracks), 0);
            router.push('/player');
          } else {
            // 曲库尚未扫描完成或为空：跳到歌曲页查看状态
            router.push('/songs');
          }
          break;
        case 'settings':
          router.push('/settings');
          break;
        case 'nowPlaying':
          router.push('/player');
          break;
        default:
          break;
      }
    },
  });

  return (
    <IpodShell
      lcdTitle="iPod"
      wheel={{
        onMenu: () => console.log('[wheel] MENU → 已在主菜单'),
        onPrev: () => move(-1),
        onNext: () => move(1),
        onRotate: move,
        onPlayPause: togglePlayback,
        onSelect: enter,
      }}
    >
      <MenuList items={items} selectedIndex={selected} rowHeight={48} />
    </IpodShell>
  );
}
