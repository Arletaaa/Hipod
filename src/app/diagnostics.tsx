import { getPermissionsAsync } from 'expo-media-library/legacy';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { IpodShell } from '@/components/ipod/IpodShell';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { SCAN_DIRECTORY_LABELS } from '@/services/filesystemScan';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/** 滚轮每档滚动的像素数。 */
const SCROLL_STEP = 48;

/**
 * 扫描诊断页：把「为什么扫不到歌」需要的全部信息一次展示完，不必接 adb。
 * - 权限状态 / 曲库总数
 * - 双来源命中数（媒体库 vs 目录扫描）
 * - 目录扫描的错误摘要与检查清单
 * - 示例曲目路径、时长未知数量（时长未知 = 仅由目录扫描发现）
 */
export default function DiagnosticsScreen() {
  const router = useRouter();
  const { tracks, scanStats, scanStatus, scanError, scan } = useMediaLibrary();

  const [permission, setPermission] = useState<string>('检查中…');
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await getPermissionsAsync(false, ['audio']);
        if (cancelled) return;
        setPermission(result.granted ? '已授权' : result.canAskAgain ? '未授权' : '被永久拒绝');
      } catch {
        if (!cancelled) setPermission('读取失败');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scanStatus]);

  const onScroll = useCallback((step: number) => {
    offsetRef.current = Math.max(0, offsetRef.current + step * SCROLL_STEP);
    scrollRef.current?.scrollTo({ y: offsetRef.current, animated: true });
  }, []);

  const unknownDuration = tracks.filter((t) => t.duration <= 0).length;
  const samples = tracks.slice(0, 3);

  return (
    <IpodShell
      lcdTitle="扫描诊断"
      lcdStatusIcon={scanStatus === 'scanning' ? '⟳' : '▶'}
      wheel={{
        onMenu: () => router.back(),
        onPrev: () => onScroll(-1),
        onNext: () => onScroll(1),
        onRotate: onScroll,
        onPlayPause: () => console.log('[diagnostics] ▶❚❚'),
        onSelect: () => void scan(),
      }}
    >
      <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.line}>权限：{permission}</Text>
        <Text style={styles.line}>扫描状态：{scanStatus}</Text>
        <Text style={styles.line}>曲库总数：{tracks.length} 首</Text>
        <Text style={styles.line}>媒体库命中：{scanStats?.mediaStoreCount ?? '-'} 首</Text>
        <Text style={styles.line}>目录扫描补充：{scanStats?.filesystemCount ?? '-'} 首</Text>
        <Text style={styles.line}>时长未知：{unknownDuration} 首</Text>
        {scanError ? <Text style={styles.error}>错误：{scanError}</Text> : null}

        <Text style={styles.section}>检查的目录</Text>
        {SCAN_DIRECTORY_LABELS.map((label) => (
          <Text key={label} style={styles.line}>
            · {label}
          </Text>
        ))}

        <Text style={styles.section}>目录读取问题</Text>
        {scanStats && scanStats.filesystemErrors.length > 0 ? (
          scanStats.filesystemErrors.slice(0, 5).map((error) => (
            <Text key={error} style={styles.error}>
              · {shorten(error)}
            </Text>
          ))
        ) : (
          <Text style={styles.line}>· 无</Text>
        )}

        <Text style={styles.section}>曲目示例</Text>
        {samples.length > 0 ? (
          samples.map((track) => (
            <Text key={track.id} style={styles.line}>
              · {shorten(track.uri)}
            </Text>
          ))
        ) : (
          <Text style={styles.line}>· 无</Text>
        )}

        <Text style={styles.hint}>中键重新扫描 · MENU 返回 · 滚轮翻页</Text>
      </ScrollView>
    </IpodShell>
  );
}

/** 去掉冗长的 file:// 前缀，便于在窄屏阅读。 */
function shorten(value: string): string {
  return value.replace('file:///storage/emulated/0', '内部存储');
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 260,
  },
  line: {
    color: colors.lcd.textSecondary,
    fontFamily: fonts.lcd,
    fontSize: 16,
    lineHeight: 21,
  },
  error: {
    color: colors.lcd.textMuted,
    fontFamily: fonts.lcd,
    fontSize: 14,
    lineHeight: 19,
  },
  section: {
    color: colors.lcd.text,
    fontFamily: fonts.lcd,
    fontSize: 18,
    marginTop: 8,
  },
  hint: {
    color: colors.lcd.textMuted,
    fontFamily: fonts.lcd,
    fontSize: 12,
    marginTop: 10,
  },
});
