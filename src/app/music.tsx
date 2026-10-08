import { useRouter } from 'expo-router';

import { IpodShell } from '@/components/ipod/IpodShell';
import { MenuList, type MenuListItem } from '@/components/ipod/MenuList';
import { useWheelNav } from '@/hooks/useWheelNav';

/** 音乐子菜单（§4 信息架构）。播放列表属于 v2（M6），此处不列出。 */
const ITEMS: MenuListItem[] = [
  { id: 'nowPlaying', label: '正在播放 Now Playing' },
  { id: 'songs', label: '歌曲 Songs' },
  { id: 'artists', label: '歌手 Artists' },
  { id: 'albums', label: '专辑 Albums' },
];

export default function MusicScreen() {
  const router = useRouter();

  const { selected, move, enter } = useWheelNav({
    count: ITEMS.length,
    onEnter: (index) => {
      switch (ITEMS[index]?.id) {
        case 'nowPlaying':
          router.push('/player');
          break;
        case 'songs':
          router.push('/songs');
          break;
        case 'artists':
          router.push('/artists');
          break;
        case 'albums':
          router.push('/albums');
          break;
        default:
          break;
      }
    },
  });

  return (
    <IpodShell
      lcdTitle="音乐"
      wheel={{
        onMenu: () => router.back(),
        onPrev: () => move(-1),
        onNext: () => move(1),
        onRotate: move,
        onPlayPause: () => console.log('[music] ▶❚❚'),
        onSelect: enter,
      }}
    >
      <MenuList items={ITEMS} selectedIndex={selected} rowHeight={40} />
    </IpodShell>
  );
}
