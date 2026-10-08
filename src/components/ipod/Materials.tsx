import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

import { usePalette } from '@/hooks/useTheme';

/**
 * 真实材质图层（全部为绝对定位铺满父容器，父容器需 overflow: hidden）。
 *
 * 贴图由 scripts/generate-textures.py 程序化生成并入库：
 * 之所以用位图而不是 SVG 噪点滤镜，是因为 react-native-svg 15 在 Android 上
 * 未实现 feTurbulence（源码里直接调用 warnUnimplementedFilter）。
 */

const SILICONE_GRAIN = require('../../../assets/textures/silicone-grain.png');
const BRUSHED_METAL = require('../../../assets/textures/brushed-metal.png');
const SHEEN = require('../../../assets/textures/sheen.png');
const GLASS_STREAK = require('../../../assets/textures/glass-streak.png');
const NOISE_OVERLAY = require('../../../assets/textures/noise-overlay.png');

/** 贴图资源（供需要自行组合的组件使用，例如让颗粒随转动旋转）。 */
export const TEXTURES = {
  siliconeGrain: SILICONE_GRAIN,
  brushedMetal: BRUSHED_METAL,
  sheen: SHEEN,
  glassStreak: GLASS_STREAK,
  noiseOverlay: NOISE_OVERLAY,
} as const;

export interface LayerProps {
  style?: StyleProp<ImageStyle>;
  opacity?: number;
}

/** 哑光硅胶颗粒（平铺）。 */
export function GrainLayer({ style, opacity }: LayerProps) {
  const palette = usePalette();
  return (
    <Image
      source={SILICONE_GRAIN}
      resizeMode="repeat"
      style={[StyleSheet.absoluteFill, { opacity: opacity ?? palette.material.grainOpacity }, style]}
    />
  );
}

/** 阳极氧化铝拉丝（平铺）。 */
export function BrushedLayer({ style, opacity }: LayerProps) {
  const palette = usePalette();
  return (
    <Image
      source={BRUSHED_METAL}
      resizeMode="repeat"
      style={[
        StyleSheet.absoluteFill,
        { opacity: opacity ?? palette.material.brushedOpacity },
        style,
      ]}
    />
  );
}

/** 柔和高光光斑：中心亮、边缘透明（可被陀螺仪驱动的位移使用）。 */
export function SheenLayer({ style, opacity = 1 }: LayerProps) {
  return (
    <Image
      source={SHEEN}
      resizeMode="stretch"
      style={[StyleSheet.absoluteFill, { opacity }, style]}
    />
  );
}

/** 屏幕玻璃反射（斜向柔光带）。 */
export function GlassLayer({ style, opacity = 1 }: LayerProps) {
  return (
    <Image
      source={GLASS_STREAK}
      resizeMode="stretch"
      style={[StyleSheet.absoluteFill, { opacity }, style]}
    />
  );
}

/** 极淡全表面噪点：消除渐变色带、提升真实感。 */
export function NoiseLayer({ style, opacity = 1 }: LayerProps) {
  return (
    <Image
      source={NOISE_OVERLAY}
      resizeMode="repeat"
      style={[StyleSheet.absoluteFill, { opacity }, style]}
    />
  );
}

/**
 * 受光边缘：顶部一条高光、底部一条阴影，模拟金属件的倒角。
 * 用于机身与操作件，让轮廓"立起来"。
 */
export function BevelEdges({ radius = 0 }: { radius?: number }) {
  const palette = usePalette();
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: radius }]} pointerEvents="none">
      <View
        style={[
          styles.bevelTop,
          { borderTopColor: palette.material.metalHighlight, borderTopLeftRadius: radius, borderTopRightRadius: radius },
        ]}
      />
      <View
        style={[
          styles.bevelBottom,
          {
            borderBottomColor: palette.material.metalShadow,
            borderBottomLeftRadius: radius,
            borderBottomRightRadius: radius,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bevelTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1.5,
    borderTopWidth: 1.5,
  },
  bevelBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1.5,
    borderBottomWidth: 1.5,
  },
});
