import { create } from 'zustand';

import { scanLibrary, type ScanStats } from '@/services/scanner';
import type { ScanStatus, Track } from '@/types/track';

interface LibraryState {
  tracks: Track[];
  scanStatus: ScanStatus;
  scanProgress: { processed: number; total: number } | null;
  scanError: string | null;
  /** 上次扫描的诊断统计（媒体库命中 / 文件系统补充 / 不可读目录）。 */
  scanStats: ScanStats | null;
  scan: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  scanStatus: 'idle',
  scanProgress: null,
  scanError: null,
  scanStats: null,

  scan: async () => {
    if (get().scanStatus === 'scanning') return;
    set({ scanStatus: 'requesting', scanError: null, scanProgress: null });
    try {
      set({ scanStatus: 'scanning' });
      const { tracks, stats } = await scanLibrary((p) => set({ scanProgress: p }));
      set({ tracks, scanStats: stats, scanStatus: 'done', scanProgress: null });
    } catch (err) {
      set({
        scanStatus: 'error',
        scanError: err instanceof Error ? err.message : String(err),
        scanProgress: null,
      });
    }
  },
}));
