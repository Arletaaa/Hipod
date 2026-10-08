import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LcdBacklight, Scanlines } from '@/components/ipod/Gradients';
import { usePalette, useThemeName } from '@/hooks/useTheme';
import { fonts } from '@/theme/fonts';
import type { Palette } from '@/theme/palettes';

export interface LcdScreenProps {
  title?: string;
  /** 标题栏右侧状态图标（▶ / ❚❚ / 音量 / ⟳）。 */
  statusIcon?: string;
  children?: ReactNode;
}

/**
 * iPod LCD 屏：背光渐变 +（深色风格的）扫描线 + 标题栏 + 分割线 + 内容区。
 */
export function LcdScreen({ title = 'iPod', statusIcon = '▶', children }: LcdScreenProps) {
  const palette = usePalette();
  const theme = useThemeName();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <View style={styles.screen}>
      <LcdBacklight />
      {/* 扫描线只用于深色背光风格；浅色经典风格按参考图不带纹理 */}
      {theme === 'dark' ? <Scanlines /> : null}

      <View style={styles.titleBar}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Text style={styles.statusIcon}>{statusIcon}</Text>
      </View>

      <View style={styles.divider} />
      <View style={styles.content}>{children}</View>
    </View>
  );
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
    titleBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      color: palette.lcd.text,
      fontFamily: fonts.lcd,
      fontSize: 22,
      flexShrink: 1,
    },
    statusIcon: {
      color: palette.lcd.textSecondary,
      fontFamily: fonts.key,
      fontSize: 12,
    },
    divider: {
      height: 1,
      backgroundColor: palette.lcd.divider,
      marginVertical: 8,
    },
    content: {
      // 占满标题栏与分割线之外的剩余空间，交给子内容自行排布/滚动
      flex: 1,
      gap: 4,
    },
  });
}
