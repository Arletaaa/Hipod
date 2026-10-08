import { create } from 'zustand';

import { THEME_ORDER, type ThemeName } from '@/theme/palettes';
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
  /** 界面风格：深色蓝白背光 / 经典银色。 */
  theme: ThemeName;
  setRepeatMode: (mode: RepeatMode) => void;
  /** 设置页中键循环切换：关 → 全部 → 单曲 → 关。 */
  cycleRepeatMode: () => void;
  toggleShuffle: () => void;
  setTheme: (theme: ThemeName) => void;
  /** 设置页中键循环切换界面风格。 */
  cycleTheme: () => void;
  /** 从持久化存储恢复设置。 */
  hydrate: (
    settings: Partial<Pick<SettingsState, 'repeatMode' | 'shuffle' | 'theme'>>,
  ) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  repeatMode: 'off',
  shuffle: false,
  theme: 'light',
  setRepeatMode: (repeatMode) => set({ repeatMode }),
  cycleRepeatMode: () =>
    set((s) => {
      const nextIndex = (REPEAT_ORDER.indexOf(s.repeatMode) + 1) % REPEAT_ORDER.length;
      return { repeatMode: REPEAT_ORDER[nextIndex] ?? 'off' };
    }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  setTheme: (theme) => set({ theme }),
  cycleTheme: () =>
    set((s) => {
      const nextIndex = (THEME_ORDER.indexOf(s.theme) + 1) % THEME_ORDER.length;
      return { theme: THEME_ORDER[nextIndex] ?? 'dark' };
    }),
  hydrate: (settings) => set(settings),
}));
