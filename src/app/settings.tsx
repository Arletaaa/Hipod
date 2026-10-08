import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IpodShell } from '@/components/ipod/IpodShell';
import { MenuList, type MenuListItem } from '@/components/ipod/MenuList';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useWheelNav } from '@/hooks/useWheelNav';
import { usePlaybackToggle } from '@/hooks/usePlaybackToggle';
import { usePlayerStore } from '@/store/player';
import { REPEAT_LABELS, useSettingsStore } from '@/store/settings';
import { fonts } from '@/theme/fonts';
import { THEME_LABELS } from '@/theme/palettes';
import { makeThemedStyles } from '@/theme/themedStyles';

/** 设置页里滚轮每档对应的音量增减。 */
const VOLUME_STEP = 0.05;

/**
 * 设置页（§4 信息架构）：重复模式 / 随机播放 / 音量 / 重新扫描曲库 / 扫描诊断 / 关于。
 * 音量需按中键进入调节态后滚轮才生效，滚轮松手即自动退出（避免误调）。
 */
export default function SettingsScreen() {
  const router = useRouter();
  const styles = useStyles();
  const togglePlayback = usePlaybackToggle();
  const repeatMode = useSettingsStore((s) => s.repeatMode);
  const shuffle = useSettingsStore((s) => s.shuffle);
  const theme = useSettingsStore((s) => s.theme);
  const cycleRepeatMode = useSettingsStore((s) => s.cycleRepeatMode);
  const toggleShuffle = useSettingsStore((s) => s.toggleShuffle);
  const cycleTheme = useSettingsStore((s) => s.cycleTheme);
  const volume = usePlayerStore((s) => s.volume);
  const adjustVolume = usePlayerStore((s) => s.adjustVolume);
  const { tracks, scanStatus, scanProgress, scanError, scanStats, scan } = useMediaLibrary();

  const [showAbout, setShowAbout] = useState(false);
  /** 是否处于「音量调节中」：需按中键进入，滚轮松手即退出。 */
  const [volumeAdjusting, setVolumeAdjusting] = useState(false);

  const items: MenuListItem[] = [
    { id: 'repeat', label: '重复模式', sublabel: REPEAT_LABELS[repeatMode] },
    { id: 'shuffle', label: '随机播放', sublabel: shuffle ? '开' : '关' },
    {
      id: 'volume',
      label: '音量',
      sublabel: volumeAdjusting
        ? `转动滚轮调节 ${Math.round(volume * 100)}%`
        : `${Math.round(volume * 100)}%`,
    },
    { id: 'theme', label: '界面风格', sublabel: THEME_LABELS[theme] },
    {
      id: 'rescan',
      label: '重新扫描曲库',
      sublabel:
        scanStatus === 'scanning' && scanProgress
          ? `${scanProgress.processed}/${scanProgress.total}`
          : scanStatus === 'scanning' || scanStatus === 'requesting'
            ? '扫描中…'
            : `${tracks.length} 首`,
    },
    { id: 'diagnostics', label: '扫描诊断', sublabel: '权限 / 来源 / 路径' },
    { id: 'about', label: '关于', sublabel: 'v1.0.0' },
  ];

  const { selected, move, enter } = useWheelNav({
    count: items.length,
    onEnter: (index) => {
      switch (items[index]?.id) {
        case 'repeat':
          cycleRepeatMode();
          break;
        case 'shuffle':
          toggleShuffle();
          break;
        case 'volume':
          // 中键进入音量调节态；之后滚轮才调音量，松手自动退出
          setVolumeAdjusting(true);
          break;
        case 'theme':
          // 中键循环切换界面风格：深色背光 ↔ 经典银色
          cycleTheme();
          break;
        case 'rescan':
          void scan();
          break;
        case 'diagnostics':
          router.push('/diagnostics');
          break;
        case 'about':
          setShowAbout(true);
          break;
        default:
          break;
      }
    },
  });

  // 选中项变化时退出音量调节态（滚轮移动选中后不应还停留在调节模式）
  useEffect(() => {
    setVolumeAdjusting(false);
  }, [selected]);

  // 滚轮：仅在「音量调节中」调音量，否则移动选中项
  const onRotate = useCallback(
    (step: number) => {
      if (volumeAdjusting && !showAbout) {
        adjustVolume(step * VOLUME_STEP);
      } else {
        move(step);
      }
    },
    [volumeAdjusting, showAbout, adjustVolume, move],
  );

  // MENU：在「关于」里先退回列表，否则返回上级菜单
  const onMenu = useCallback(() => {
    if (showAbout) {
      setShowAbout(false);
      return;
    }
    router.back();
  }, [showAbout, router]);

  return (
    <IpodShell
      lcdTitle={showAbout ? '关于' : '设置'}
      lcdStatusIcon={scanStatus === 'scanning' ? '⟳' : '▶'}
      wheel={{
        onMenu,
        onPrev: () => move(-1),
        onNext: () => move(1),
        onRotate,
        // 滚轮松手 → 退出音量调节态（下次要调需再按一次中键）
        onRotateEnd: () => setVolumeAdjusting(false),
        onPlayPause: togglePlayback,
        onSelect: enter,
      }}
    >
      {showAbout ? (
        <View style={styles.about}>
          <Text style={styles.aboutTitle}>HiPod</Text>
          <Text style={styles.aboutLine}>版本 v1.0.0</Text>
          <Text style={styles.aboutLine}>曲库 {tracks.length} 首</Text>
          {scanStats ? (
            <Text style={styles.aboutLine}>
              媒体库 {scanStats.mediaStoreCount} · 目录 {scanStats.filesystemCount}
            </Text>
          ) : null}
          <Text style={styles.aboutLine}>Expo SDK 57 · RN 0.86</Text>
          <Text style={styles.aboutHint}>MENU 返回设置</Text>
        </View>
      ) : (
        <>
          <MenuList items={items} selectedIndex={selected} />
          {scanStatus === 'error' ? (
            <Text numberOfLines={2} style={styles.status}>
              {scanError ?? '扫描失败'}
            </Text>
          ) : null}
        </>
      )}
    </IpodShell>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    status: {
      color: colors.lcd.textMuted,
      fontFamily: fonts.lcd,
      fontSize: 14,
      paddingTop: 6,
    },
    about: {
      gap: 4,
      paddingVertical: 8,
    },
    aboutTitle: {
      color: colors.lcd.text,
      fontFamily: fonts.lcd,
      fontSize: 24,
    },
    aboutLine: {
      color: colors.lcd.textSecondary,
      fontFamily: fonts.lcd,
      fontSize: 18,
    },
    aboutHint: {
      color: colors.lcd.textMuted,
      fontFamily: fonts.lcd,
      fontSize: 14,
      marginTop: 6,
    },
  }),
);
