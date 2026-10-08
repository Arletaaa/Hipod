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
 * 黑电子框宽度。取 12dp：把原先那 2dp 金属留白并入黑框，
 * 使黑框成为设备最外层（参考图里浅色面板 + 黑框的总占比 ≈ 3.1% 屏宽，
 * 本机机身宽 372dp，12dp ≈ 3.2%，与之接近）。
 */
const BEZEL_PADDING = 12;
/** 电子框外圆角：与机身圆角同心（机身边距为 0，故两者相同）。 */
const BEZEL_RADIUS = 30;

/**
 * 复古 LCD：**黑色电子框**包住屏面。
 *
 * 关键点：屏面本身**不设 padding**，背景层（背光渐变 / 像素网格 / 暗角 /
 * 玻璃反射）才能铺满整块屏；内边距放在内部的内容容器上。
 * （RN 中绝对定位子元素相对父容器 padding 盒定位，若屏面带 padding，
 *   背景层会被内缩一圈，在右侧/底部露出未上色的灰带。）
 */
export function LcdScreen({ title = 'iPod', statusIcon = '▶', children }: LcdScreenProps) {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <View style={styles.bezel}>
      {/* 电子框内唇：一条细高光，制造"屏面陷进框里"的层次 */}
      <View style={styles.bezelLip} pointerEvents="none" />

      <View style={styles.screen}>
        {/* 背景层：绝对铺满整块屏（不含 padding 内缩） */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <LcdBacklight />
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: palette.material.screenCast }]}
          />
          <PixelGrid />
          <Vignette />
          <GlassLayer opacity={0.35} />
          <NoiseLayer opacity={0.6} />
        </View>

        {/* 内容层：内边距在这里 */}
        <View style={styles.body}>
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
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    /** 黑电子框：外圆角与机身同心 + 加宽的黑边 + 向金属面投下的柔和过渡阴影。 */
    bezel: {
      flex: 1,
      backgroundColor: palette.material.bezel,
      borderRadius: BEZEL_RADIUS,
      padding: BEZEL_PADDING,
      overflow: 'hidden',
      // 让黑玻璃面板看起来嵌进金属面（交界处不再是硬边）
      shadowColor: '#000000',
      shadowOpacity: 0.45,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    bezelLip: {
      position: 'absolute',
      left: BEZEL_PADDING - 2,
      right: BEZEL_PADDING - 2,
      top: BEZEL_PADDING - 2,
      bottom: BEZEL_PADDING - 2,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: palette.material.bezelLip,
    },
    /** 屏面：内框近直角；**不加 padding**，保证背景层铺满。 */
    screen: {
      flex: 1,
      backgroundColor: palette.lcd.bg1,
      borderRadius: 3,
      overflow: 'hidden',
    },
    /** 内容层：标题栏与内容的内边距（取 3dp 网格的整数倍）。 */
    body: {
      flex: 1,
      padding: 9,
    },
    titleBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 9,
    },
    title: {
      color: palette.lcd.text,
      fontFamily: fonts.lcd,
      fontSize: 22,
      lineHeight: 24,
      flexShrink: 1,
      textShadowColor: palette.material.textDotShadow,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 0,
    },
    statusIcon: {
      color: palette.lcd.textSecondary,
      fontFamily: fonts.key,
      fontSize: 12,
    },
    divider: {
      // 高度取 3dp（内含 1px 线），保证纵向节奏整体是网格间距的整数倍
      height: 3,
      borderTopWidth: 1,
      borderTopColor: palette.lcd.divider,
      marginVertical: 6,
    },
    content: {
      flex: 1,
      gap: 3,
    },
  });
}
