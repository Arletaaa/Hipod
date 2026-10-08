import { create } from 'zustand';

import type { RepeatMode } from '@/types/track';

const REPEAT_ORDER: RepeatMode[] = ['off', 'all', 'one'];

export const REPEAT_LABELS: Record<RepeatMode, string> = {
  off: '关闭',
  all: '全部循环',
  one: '单曲循环',
};

interface SettingsState {
  repeatMode: RepeatMode;
  shuffle: boolean;
  setRepeatMode: (mode: RepeatMode) => void;
  /** 设置页中键循环切换：关 → 全部 → 单曲 → 关。 */
  cycleRepeatMode: () => void;
  toggleShuffle: () => void;
  /** 从持久化存储恢复设置。 */
  hydrate: (settings: Partial<Pick<SettingsState, 'repeatMode' | 'shuffle'>>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  repeatMode: 'off',
  shuffle: false,
  setRepeatMode: (repeatMode) => set({ repeatMode }),
  cycleRepeatMode: () =>
    set((s) => {
      const nextIndex = (REPEAT_ORDER.indexOf(s.repeatMode) + 1) % REPEAT_ORDER.length;
      return { repeatMode: REPEAT_ORDER[nextIndex] ?? 'off' };
    }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  hydrate: (settings) => set(settings),
}));
