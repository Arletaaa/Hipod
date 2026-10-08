import { create } from 'zustand';

import { useSettingsStore } from '@/store/settings';
import type { Track } from '@/types/track';

/** 播放器状态里，由 provider 从 native 回填的字段（秒为单位）。 */
export interface PlayerStatus {
  currentTime: number;
  duration: number;
  isLoaded: boolean;
  isBuffering: boolean;
}

/** 持久化到 AsyncStorage 的播放会话快照。 */
export interface PersistedSession {
  queue: Track[];
  currentIndex: number;
  /** 上次播放位置（秒）。 */
  positionSeconds: number;
  volume: number;
}

interface PlayerState {
  queue: Track[];
  currentIndex: number;
  /** 期望播放状态（true=播放 / false=暂停），由 provider 同步到 native。 */
  isPlaying: boolean;
  status: PlayerStatus;
  /** 递增令牌：变化时 provider 执行一次 seekTo(seekSeconds)。 */
  seekToken: number;
  seekSeconds: number;
  /** 音量 0–1，由 provider 同步到 native。 */
  volume: number;
  error: string | null;

  playQueue: (queue: Track[], index: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seekBy: (deltaSeconds: number) => void;
  setVolume: (volume: number) => void;
  /** 滚轮调音量：按步进增减并夹取到 [0,1]。 */
  adjustVolume: (delta: number) => void;
  setStatus: (status: Partial<PlayerStatus>) => void;
  setError: (error: string | null) => void;
  /** provider 检测到曲目自然播完时调用，按 repeatMode 决定下一步。 */
  handleTrackEnd: () => void;
  /** 从持久化存储恢复播放会话（队列 / 上次位置 / 音量），恢复后处于暂停态。 */
  restoreSession: (session: PersistedSession) => void;
}

const INITIAL_STATUS: PlayerStatus = {
  currentTime: 0,
  duration: 0,
  isLoaded: false,
  isBuffering: false,
};

/** 音量统一保留两位小数，避免浮点噪声写进持久化。 */
function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  status: INITIAL_STATUS,
  seekToken: 0,
  seekSeconds: 0,
  volume: 1,
  error: null,

  playQueue: (queue, index) => {
    if (queue.length === 0) return;
    const safeIndex = Math.max(0, Math.min(index, queue.length - 1));
    set({
      queue,
      currentIndex: safeIndex,
      isPlaying: true,
      status: INITIAL_STATUS,
      error: null,
    });
  },

  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, currentIndex } = get();
    if (queue.length === 0) return;
    set({ currentIndex: (currentIndex + 1) % queue.length });
  },

  prev: () => {
    const { queue, currentIndex } = get();
    if (queue.length === 0) return;
    set({ currentIndex: (currentIndex - 1 + queue.length) % queue.length });
  },

  seekBy: (deltaSeconds) => {
    const { status } = get();
    const target = Math.max(
      0,
      Math.min(status.currentTime + deltaSeconds, status.duration || 0),
    );
    set((s) => ({ seekSeconds: target, seekToken: s.seekToken + 1 }));
  },

  setVolume: (volume) => set({ volume: clampVolume(volume) }),

  adjustVolume: (delta) => set((s) => ({ volume: clampVolume(s.volume + delta) })),

  setStatus: (status) => set((s) => ({ status: { ...s.status, ...status } })),

  setError: (error) => set({ error }),

  handleTrackEnd: () => {
    const { queue, currentIndex } = get();
    if (queue.length === 0) return;
    const repeat = useSettingsStore.getState().repeatMode;

    if (repeat === 'one') {
      // 单曲循环：回到开头继续（provider 收到 seek 指令后 seekTo(0)+play）
      set((s) => ({ seekSeconds: 0, seekToken: s.seekToken + 1, isPlaying: true }));
      return;
    }
    if (repeat === 'all' || currentIndex < queue.length - 1) {
      get().next();
      return;
    }
    // repeat off 且已是最后一首：停在开头，暂停
    set((s) => ({ isPlaying: false, seekSeconds: 0, seekToken: s.seekToken + 1 }));
  },

  restoreSession: ({ queue, currentIndex, positionSeconds, volume }) => {
    if (queue.length === 0) {
      set({ volume: clampVolume(volume) });
      return;
    }
    const safeIndex = Math.max(0, Math.min(currentIndex, queue.length - 1));
    set((s) => ({
      queue,
      currentIndex: safeIndex,
      // 恢复后不自动播放，等用户按播放键
      isPlaying: false,
      status: INITIAL_STATUS,
      volume: clampVolume(volume),
      // 触发一次 seek：provider 会等音频加载完成后定位到上次位置
      seekSeconds: Math.max(0, positionSeconds),
      seekToken: s.seekToken + 1,
      error: null,
    }));
  },
}));
