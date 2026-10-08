import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IpodShell } from '@/components/ipod/IpodShell';
import { MenuList, type MenuListItem } from '@/components/ipod/MenuList';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useWheelNav } from '@/hooks/useWheelNav';
import { usePlayerStore } from '@/store/player';
import { REPEAT_LABELS, useSettingsStore } from '@/store/settings';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/** 设置页里滚轮每档对应的音量增减。 */
const VOLUME_STEP = 0.05;
/** 「音量」条目在列表中的下标：选中它时滚轮改为调音量。 */
const VOLUME_INDEX = 2;

/**
 * 设置页（§4 信息架构）：重复模式 / 随机播放 / 音量 / 重新扫描曲库 / 关于。
 * 滚轮在「音量」条目上变为调节音量，其余条目为移动选中。
 */
export default function SettingsScreen() {
  const router = useRouter();
  const repeatMode = useSettingsStore((s) => s.repeatMode);
  const shuffle = useSettingsStore((s) => s.shuffle);
  const cycleRepeatMode = useSettingsStore((s) => s.cycleRepeatMode);
  const toggleShuffle = useSettingsStore((s) => s.toggleShuffle);
  const volume = usePlayerStore((s) => s.volume);
  const adjustVolume = usePlayerStore((s) => s.adjustVolume);
  const { tracks, scanStatus, scanProgress, scanError, scanStats, scan } = useMediaLibrary();

  const [showAbout, setShowAbout] = useState(false);

  const items: MenuListItem[] = [
    { id: 'repeat', label: '重复模式', sublabel: REPEAT_LABELS[repeatMode] },
    { id: 'shuffle', label: '随机播放', sublabel: shuffle ? '开' : '关' },
    { id: 'volume', label: '音量', sublabel: `${Math.round(volume * 100)}%` },
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
          // 音量条目靠滚轮调节，中键无需动作
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

  // 滚轮：选中「音量」时调音量，否则移动选中项
  const onRotate = useCallback(
    (step: number) => {
      if (selected === VOLUME_INDEX && !showAbout) {
        adjustVolume(step * VOLUME_STEP);
      } else {
        move(step);
      }
    },
    [selected, showAbout, adjustVolume, move],
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
        onPlayPause: () => console.log('[settings] ▶❚❚'),
        onSelect: enter,
      }}
    >
      {showAbout ? (
        <View style={styles.about}>
          <Text style={styles.aboutTitle}>iPod Player</Text>
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

const styles = StyleSheet.create({
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
});
