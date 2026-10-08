import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LcdBacklight, Scanlines } from '@/components/ipod/Gradients';
import { usePalette, useThemeName } from '@/hooks/useTheme';
import { fonts } from '@/theme/fonts';
import type { Palette } from '@/theme/palettes';

export interface LcdScreenProps {
  title?: string;
  /** 状态栏右侧图标（▶ / ❚❚ / 音量 等）。 */
  statusIcon?: string;
  children?: ReactNode;
}

/** 电量图标是装饰性的：项目未引入电池 API，故按固定比例绘制。 */
const BATTERY_FILL = 0.72;

/**
 * iPod LCD 屏：背光渐变 + 扫描线 + 状态栏 + 分割线 + 内容区。
 * 状态栏仿 iPod Classic：左标题 / 中时间 / 右播放图标与电量。
 */
export function LcdScreen({ title = 'iPod', statusIcon = '▶', children }: LcdScreenProps) {
  const palette = usePalette();
  const theme = useThemeName();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const clock = useClock();

  return (
    <View style={styles.screen}>
      <LcdBacklight />
      {/* 扫描线只用于深色背光风格；浅色经典风格按参考图不带纹理 */}
      {theme === 'dark' ? <Scanlines /> : null}

      <View style={styles.statusBar}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Text style={styles.clock}>{clock}</Text>
        <View style={styles.statusRight}>
          <Text style={styles.statusIcon}>{statusIcon}</Text>
          <View style={styles.battery}>
            <View style={[styles.batteryFill, { width: `${BATTERY_FILL * 100}%` }]} />
          </View>
          <View style={styles.batteryNub} />
        </View>
      </View>

      <View style={styles.divider} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

/** 状态栏时间：每 20 秒刷新一次，避免无意义重渲染。 */
function useClock(): string {
  const [text, setText] = useState(() => formatClock(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setText(formatClock(new Date())), 20000);
    return () => clearInterval(timer);
  }, []);
  return text;
}

function formatClock(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: {
      // 填满机身槽位：LCD 尺寸因此与内容多少无关（长列表在 content 内滚动）
      flex: 1,
      // 底色仅作渐变兜底（渐变铺满其上）
      backgroundColor: palette.lcd.bg1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.lcd.border,
      padding: 12,
      overflow: 'hidden',
    },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    title: {
      color: palette.lcd.text,
      fontFamily: fonts.lcd,
      fontSize: 22,
      flexShrink: 1,
    },
    clock: {
      color: palette.lcd.statusText,
      fontFamily: fonts.key,
      fontSize: 13,
    },
    statusRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    statusIcon: {
      color: palette.lcd.statusText,
      fontFamily: fonts.key,
      fontSize: 12,
    },
    battery: {
      width: 24,
      height: 12,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: palette.lcd.statusText,
      padding: 1.5,
      justifyContent: 'center',
    },
    batteryFill: {
      height: '100%',
      borderRadius: 1,
      backgroundColor: palette.lcd.statusText,
    },
    batteryNub: {
      width: 2,
      height: 5,
      marginLeft: 1,
      borderRadius: 1,
      backgroundColor: palette.lcd.statusText,
    },
    divider: {
      height: 1,
      backgroundColor: palette.lcd.divider,
      marginVertical: 8,
    },
    content: {
      // 占满状态栏与分割线之外的剩余空间，交给子内容自行排布/滚动
      flex: 1,
      gap: 4,
    },
  });
}
