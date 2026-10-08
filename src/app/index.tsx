import { useRouter } from 'expo-router';

import { IpodShell } from '@/components/ipod/IpodShell';
import { MenuList, type MenuListItem } from '@/components/ipod/MenuList';
import { useEnsureScanned, useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useWheelNav } from '@/hooks/useWheelNav';
import { usePlayerStore } from '@/store/player';
import { shuffleArray } from '@/utils/array';

/** 主菜单（§4 信息架构）。 */
const MENU_ITEMS: MenuListItem[] = [
  { id: 'music', label: '音乐 Music' },
  { id: 'shuffle', label: '随机播放 Shuffle Songs' },
  { id: 'settings', label: '设置 Settings' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { tracks } = useMediaLibrary();
  useEnsureScanned();
  const playQueue = usePlayerStore((s) => s.playQueue);

  const { selected, move, enter } = useWheelNav({
    count: MENU_ITEMS.length,
    onEnter: (index) => {
      const item = MENU_ITEMS[index];
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
        onPlayPause: () => console.log('[wheel] ▶❚❚ 播放 / 暂停'),
        onSelect: enter,
      }}
    >
      <MenuList items={MENU_ITEMS} selectedIndex={selected} rowHeight={40} />
    </IpodShell>
  );
}
