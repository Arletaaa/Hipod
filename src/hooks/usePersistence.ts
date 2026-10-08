import { useEffect, useRef } from 'react';

import { loadSession, loadSettings, saveSession, saveSettings } from '@/services/persistence';
import { usePlayerStore } from '@/store/player';
import { useSettingsStore } from '@/store/settings';

/** 播放中定期落盘位置的间隔（毫秒）。 */
const POSITION_SAVE_INTERVAL = 5000;
/** 结构变化（换歌 / 音量 / 播放态）落盘的防抖时长（毫秒）。 */
const STRUCTURE_SAVE_DEBOUNCE = 500;

/**
 * 启动时恢复「设置 + 播放会话」，运行期把变化写回 AsyncStorage。
 * - 设置：变化即存（数据极小）
 * - 会话：队列/曲目/音量/播放态变化时防抖存；播放中每 5s 存一次位置
 */
export function usePersistence() {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 启动恢复（只跑一次）
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [settings, session] = await Promise.all([loadSettings(), loadSession()]);
      if (cancelled) return;
      if (settings) useSettingsStore.getState().hydrate(settings);
      if (session) usePlayerStore.getState().restoreSession(session);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 设置：变化即存
  useEffect(() => {
    return useSettingsStore.subscribe((state, prev) => {
      if (state.repeatMode === prev.repeatMode && state.shuffle === prev.shuffle) return;
      void saveSettings({ repeatMode: state.repeatMode, shuffle: state.shuffle });
    });
  }, []);

  // 播放会话：结构变化防抖存 + 播放中定期存位置
  useEffect(() => {
    const persist = () => {
      const { queue, currentIndex, status, volume } = usePlayerStore.getState();
      if (queue.length === 0) return;
      void saveSession({ queue, currentIndex, positionSeconds: status.currentTime, volume });
    };

    const scheduleSave = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        persist();
      }, STRUCTURE_SAVE_DEBOUNCE);
    };

    const unsubscribe = usePlayerStore.subscribe((state, prev) => {
      if (
        state.queue !== prev.queue ||
        state.currentIndex !== prev.currentIndex ||
        state.volume !== prev.volume ||
        state.isPlaying !== prev.isPlaying
      ) {
        scheduleSave();
      }
    });

    const timer = setInterval(() => {
      const { isPlaying, queue } = usePlayerStore.getState();
      if (isPlaying && queue.length > 0) persist();
    }, POSITION_SAVE_INTERVAL);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      clearInterval(timer);
      unsubscribe();
    };
  }, []);
}
