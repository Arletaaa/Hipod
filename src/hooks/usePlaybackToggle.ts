import { useCallback } from 'react';

import { usePlayerStore } from '@/store/player';

/**
 * 轮盘下方 ▶❚❚ 键的统一行为：有曲目时切换播放/暂停，无曲目时不做任何事。
 * 所有页面都用它，这样任意界面按播放键都能暂停/继续当前播放。
 */
export function usePlaybackToggle(): () => void {
  return useCallback(() => {
    const { queue, toggle } = usePlayerStore.getState();
    if (queue.length === 0) return;
    toggle();
  }, []);
}
