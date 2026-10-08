import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { resolveArtwork } from '@/services/artwork';
import { usePlayerStore } from '@/store/player';

/**
 * 挂在根布局的播放引擎：持有唯一的 native AudioPlayer，把它与 player store 桥接。
 * - currentTrack.uri 变化时 useAudioPlayer 自动换源（旧播放器释放）
 * - 单一 reconcile effect 把「期望状态」同步到 native（play/pause/seek/volume）
 * - 监听 didJustFinish，自然播完时交给 store 决定下一首
 * - 锁屏 / 通知栏媒体控制（前台服务由 app.json 的 expo-audio enableBackgroundPlayback 提供）
 */
export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const currentTrack = usePlayerStore((s) => s.queue[s.currentIndex] ?? null);
  const currentUri = currentTrack?.uri ?? null;
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const seekToken = usePlayerStore((s) => s.seekToken);
  const seekSeconds = usePlayerStore((s) => s.seekSeconds);
  const volume = usePlayerStore((s) => s.volume);
  const setStatus = usePlayerStore((s) => s.setStatus);
  const setError = usePlayerStore((s) => s.setError);
  const handleTrackEnd = usePlayerStore((s) => s.handleTrackEnd);

  const player = useAudioPlayer(currentUri, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const isLoaded = status.isLoaded;

  // 全局音频模式：静音模式可播 + 后台播放 + 独占音频焦点（音乐播放器行为）
  // 注意：启用锁屏控制时 interruptionMode 必须是 doNotMix。
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  }, []);

  // 音量：store → native（native 只接受 0–1，越界会抛错，这里兜底钳制含 NaN）
  useEffect(() => {
    player.volume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;
  }, [player, volume]);

  // 锁屏封面：复用 resolveArtwork 的进程级缓存（播放页已解析过时零成本）
  const [lockArtwork, setLockArtwork] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!currentUri) {
      setLockArtwork(null);
      return;
    }
    void resolveArtwork(currentUri).then((uri) => {
      if (!cancelled) setLockArtwork(uri);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUri]);

  // 锁屏 / 通知栏元数据：换歌或封面就绪时刷新；无曲目时清除控制。
  // 依赖收敛为标量（uri/title/…），避免 queue 中曲目对象被重建时反复调用 native。
  const lockTrackUri = currentTrack?.uri ?? null;
  const lockTrackTitle = currentTrack?.title ?? null;
  const lockTrackArtist = currentTrack?.artist ?? null;
  const lockTrackAlbum = currentTrack?.album ?? null;
  const lastLockUriRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lockTrackUri) {
      player.clearLockScreenControls();
      lastLockUriRef.current = null;
      return;
    }
    if (lastLockUriRef.current !== lockTrackUri) {
      // 换曲先清空：新曲目没有内嵌封面时，锁屏不会残留上一首的封面
      player.clearLockScreenControls();
      lastLockUriRef.current = lockTrackUri;
    }
    player.setActiveForLockScreen(
      true,
      {
        title: lockTrackTitle ?? '',
        artist: lockTrackArtist ?? '',
        albumTitle: lockTrackAlbum ?? '',
        ...(lockArtwork ? { artworkUrl: lockArtwork } : {}),
      },
      { showSeekForward: true, showSeekBackward: true },
    );
  }, [
    player,
    lockTrackUri,
    lockTrackTitle,
    lockTrackArtist,
    lockTrackAlbum,
    lockArtwork,
  ]);

  // 挂起的 seek 绑定音源：换源后不再把旧曲目的位置应用到新曲目
  const pendingSeekRef = useRef<{ uri: string; seconds: number } | null>(null);
  useEffect(() => {
    pendingSeekRef.current = null;
  }, [currentUri]);

  // 期望状态 → native 同步（换源、play/pause 切换、seek 指令统一在此处理）
  const lastAppliedSeekRef = useRef(0);
  useEffect(() => {
    if (lastAppliedSeekRef.current !== seekToken) {
      lastAppliedSeekRef.current = seekToken;
      if (isLoaded) {
        void player.seekTo(seekSeconds);
      } else if (currentUri) {
        // 音频尚未加载完成（典型：启动时恢复上次播放位置），记下来等加载后补做
        pendingSeekRef.current = { uri: currentUri, seconds: seekSeconds };
      }
    }
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, isPlaying, seekToken, seekSeconds, isLoaded, currentUri]);

  // 加载完成后补做挂起的 seek（进度恢复）；音源已变则直接丢弃
  useEffect(() => {
    const pending = pendingSeekRef.current;
    if (!isLoaded || !pending) return;
    pendingSeekRef.current = null;
    if (pending.uri !== currentUri) return;
    void player.seekTo(pending.seconds);
  }, [isLoaded, player, currentUri]);

  // native 状态 → store 同步（进度条/时长/加载态）
  useEffect(() => {
    setStatus({
      currentTime: status.currentTime,
      duration: status.duration,
      isLoaded: status.isLoaded,
      isBuffering: status.isBuffering,
    });
  }, [status.currentTime, status.duration, status.isLoaded, status.isBuffering, setStatus]);

  // 播放错误回传
  useEffect(() => {
    setError(status.error);
  }, [status.error, setError]);

  // 自然播完 → 交给 store 决定下一首（用 ref 去重，避免同一完成状态重复触发）
  const didJustFinishRef = useRef(false);
  useEffect(() => {
    if (status.didJustFinish && !didJustFinishRef.current) {
      didJustFinishRef.current = true;
      handleTrackEnd();
    } else if (!status.didJustFinish) {
      didJustFinishRef.current = false;
    }
  }, [status.didJustFinish, handleTrackEnd]);

  return <>{children}</>;
}
