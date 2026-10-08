import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LcdBacklight, PixelGrid, Vignette } from '@/components/ipod/Gradients';
import { GlassLayer, NoiseLayer } from '@/components/ipod/Materials';
import { usePalette } from '@/hooks/useTheme';
import { fonts } from '@/theme/fonts';
import type { Palette } from '@/theme/palettes';

export interface LcdScreenProps {
  title?: string;
  /** 标题栏右侧状态图标（▶ / ❚❚ / 音量 / ⟳）。 */
  statusIcon?: string;
  children?: ReactNode;
}

/**
 * 复古 LCD：**黑色电子框**包住屏面。
 * - 电子框：外框圆角（radius 18）、内唇高光，宽度收窄到 5px
 * - 屏面：内框接近直角（radius 3），带像素栅格、TN 偏色、暗角与玻璃反射
 */
export function LcdScreen({ title = 'iPod', statusIcon = '▶', children }: LcdScreenProps) {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <View style={styles.bezel}>
      {/* 电子框内唇：一条细高光，制造"屏面陷进框里"的层次 */}
      <View style={styles.bezelLip} pointerEvents="none" />

      <View style={styles.screen}>
        <LcdBacklight />
        {/* 复古层：TN 偏色 → 像素栅格 → 暗角 → 玻璃反射 → 噪点 */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.material.screenCast }]} />
        <PixelGrid />
        <Vignette />
        <GlassLayer opacity={0.7} />
        <NoiseLayer opacity={0.6} />

        <View style={styles.titleBar}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <Text style={styles.statusIcon}>{statusIcon}</Text>
        </View>

        <View style={styles.divider} />
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    /** 黑电子框：外框圆角 + 窄边。 */
    bezel: {
      flex: 1,
      backgroundColor: palette.material.bezel,
      borderRadius: 18,
      padding: 5,
      overflow: 'hidden',
    },
    bezelLip: {
      position: 'absolute',
      left: 3,
      right: 3,
      top: 3,
      bottom: 3,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: palette.material.bezelLip,
    },
    /** 屏面：内框近直角，填满电子框内部。 */
    screen: {
      flex: 1,
      backgroundColor: palette.lcd.bg1,
      borderRadius: 3,
      padding: 10,
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
      marginVertical: 7,
    },
    content: {
      flex: 1,
      gap: 4,
    },
  });
}
