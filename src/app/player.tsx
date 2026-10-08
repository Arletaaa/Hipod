import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { IpodShell } from '@/components/ipod/IpodShell';
import { resolveArtwork } from '@/services/artwork';
import { usePlayerStore } from '@/store/player';
import { fonts } from '@/theme/fonts';
import { makeThemedStyles } from '@/theme/themedStyles';
import { formatTime } from '@/utils/format';

/** 滚轮每档（30°）对应的 seek 秒数（进度模式）。 */
const SEEK_STEP = 5;
/** 滚轮每档对应的音量增减（音量模式）。 */
const VOLUME_STEP = 0.05;

/**
 * Now Playing 的 LCD 显示模式，中键循环切换（还原 iPod Classic：按中键在
 * 进度条 / 音量条之间切换，滚轮随当前模式改变作用）。
 */
type LcdMode = 'progress' | 'volume';

const MODE_ORDER: LcdMode[] = ['progress', 'volume'];

export default function PlayerScreen() {
  const router = useRouter();
  const styles = useStyles();

  const track = usePlayerStore((s) => s.queue[s.currentIndex] ?? null);
  const queueLength = usePlayerStore((s) => s.queue.length);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const status = usePlayerStore((s) => s.status);
  const volume = usePlayerStore((s) => s.volume);
  const error = usePlayerStore((s) => s.error);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seekBy = usePlayerStore((s) => s.seekBy);
  const adjustVolume = usePlayerStore((s) => s.adjustVolume);

  const [lcdMode, setLcdMode] = useState<LcdMode>('progress');

  // 惰性封面：切歌时重新解析（resolveArtwork 内部有进程级缓存）
  const [artwork, setArtwork] = useState<string | null>(null);
  const uri = track?.uri ?? null;
  useEffect(() => {
    let cancelled = false;
    setArtwork(null);
    if (uri) {
      void resolveArtwork(uri).then((u) => {
        if (!cancelled) setArtwork(u);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [uri]);

  // 中键：在进度 / 音量之间切换（iPod Classic 的 Now Playing 行为）
  const cycleMode = useCallback(() => {
    setLcdMode((mode) => {
      const nextIndex = (MODE_ORDER.indexOf(mode) + 1) % MODE_ORDER.length;
      return MODE_ORDER[nextIndex] ?? 'progress';
    });
  }, []);

  // 滚轮：按当前模式调进度或调音量
  const onRotate = useCallback(
    (step: number) => {
      if (lcdMode === 'volume') {
        adjustVolume(step * VOLUME_STEP);
      } else {
        seekBy(step * SEEK_STEP);
      }
    },
    [lcdMode, adjustVolume, seekBy],
  );

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const remaining = Math.max(0, status.duration - status.currentTime);
  const percent = (value: number): DimensionValue =>
    `${Math.round(Math.max(0, Math.min(1, value)) * 10000) / 100}%`;

  return (
    <IpodShell
      lcdTitle={isPlaying ? '正在播放' : '已暂停'}
      lcdStatusIcon={lcdMode === 'volume' ? '音量' : isPlaying ? '▶' : '❚❚'}
      wheel={{
        onMenu: () => router.back(),
        onPrev: prev,
        onNext: next,
        onRotate,
        onPlayPause: toggle,
        onSelect: cycleMode,
      }}
    >
      {track ? (
        <View style={styles.nowPlaying}>
          <View style={styles.artworkBox}>
            {artwork ? (
              <Image source={{ uri: artwork }} style={styles.artwork} contentFit="cover" />
            ) : (
              <Text style={styles.artworkPlaceholder}>♪</Text>
            )}
          </View>

          <Text numberOfLines={1} style={styles.title}>
            {track.title}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {track.artist}
          </Text>
          <Text numberOfLines={1} style={styles.album}>
            {track.album}
          </Text>

          {lcdMode === 'progress' ? (
            <View style={styles.barBlock}>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: percent(progress) }]} />
                <View style={[styles.playhead, { left: percent(progress) }]} />
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.time}>{formatTime(status.currentTime)}</Text>
                <Text style={styles.time}>-{formatTime(remaining)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.barBlock}>
              <View style={styles.track}>
                <View style={[styles.volumeFill, { width: percent(volume) }]} />
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.time}>音量</Text>
                <Text style={styles.time}>{Math.round(volume * 100)}%</Text>
              </View>
              <Text style={styles.hint}>转动滚轮调节音量 · 中键切回进度</Text>
            </View>
          )}

          <Text style={styles.counter}>
            {currentIndex + 1} / {queueLength}
            {lcdMode === 'progress' ? ' · 中键切到音量' : ''}
          </Text>
          {error ? (
            <Text numberOfLines={1} style={styles.error}>
              {error}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.empty}>无播放内容</Text>
      )}
    </IpodShell>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    nowPlaying: {
      alignItems: 'center',
      gap: 6,
    },
  artworkBox: {
    width: 96,
    height: 96,
    borderRadius: 6,
    backgroundColor: colors.lcd.bg3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginVertical: 4,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    color: colors.lcd.textSecondary,
    fontSize: 44,
  },
  title: {
    color: colors.lcd.text,
    fontFamily: fonts.lcd,
    fontSize: 24,
    maxWidth: '100%',
  },
  artist: {
    color: colors.lcd.textSecondary,
    fontFamily: fonts.lcd,
    fontSize: 18,
    maxWidth: '100%',
  },
  album: {
    color: colors.lcd.textMuted,
    fontFamily: fonts.lcd,
    fontSize: 16,
    maxWidth: '100%',
  },
  barBlock: {
    width: '100%',
    gap: 4,
    marginTop: 8,
  },
  track: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    backgroundColor: colors.lcd.progressTrack,
    justifyContent: 'center',
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.lcd.progressFill,
  },
  volumeFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.lcd.text,
  },
  /** 菱形播放头：正方形旋转 45°，随时间位移（§5.4）。 */
  playhead: {
    position: 'absolute',
    width: 8,
    height: 8,
    marginLeft: -4,
    backgroundColor: colors.lcd.progressHead,
    transform: [{ rotate: '45deg' }],
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  time: {
    color: colors.lcd.textSecondary,
    fontFamily: fonts.lcd,
    fontSize: 16,
  },
  hint: {
    color: colors.lcd.textMuted,
    fontFamily: fonts.lcd,
    fontSize: 12,
  },
  counter: {
    color: colors.lcd.textMuted,
    fontFamily: fonts.lcd,
    fontSize: 14,
  },
  error: {
    color: colors.lcd.textMuted,
    fontFamily: fonts.lcd,
    fontSize: 12,
    maxWidth: '100%',
  },
    empty: {
      color: colors.lcd.textSecondary,
      fontFamily: fonts.lcd,
      fontSize: 20,
      paddingVertical: 24,
      textAlign: 'center',
    },
  }),
);
