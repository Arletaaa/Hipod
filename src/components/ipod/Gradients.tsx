import { StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { usePalette } from '@/hooks/useTheme';

/**
 * iPod 视觉质感的渐变底面（§5.1）。
 * 全部为绝对定位铺满父容器，调用方只需保证父容器有 overflow: hidden（裁圆角）。
 * 颜色取自当前主题调色板，深/浅两套风格共用同一批组件。
 */

/** LCD 背光径向渐变：中心偏亮 → 边缘偏暗。 */
export function LcdBacklight() {
  const palette = usePalette();
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id="lcdBacklight" cx="50%" cy="42%" r="82%">
          <Stop offset="0%" stopColor={palette.lcd.bg3} />
          <Stop offset="55%" stopColor={palette.lcd.bg2} />
          <Stop offset="100%" stopColor={palette.lcd.bg1} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#lcdBacklight)" />
    </Svg>
  );
}

/** LCD 扫描线纹理：每 4px 一条极淡细线，营造像素屏质感。 */
export function Scanlines({ opacity = 0.05 }: { opacity?: number }) {
  const palette = usePalette();
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="lcdScanlines" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width="4" height="1" fill={palette.lcd.text} opacity={opacity} />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#lcdScanlines)" />
    </Svg>
  );
}

/** 机身竖向渐变（深色 = 黑色金属 / 浅色 = 银色）。 */
export function MetalBody() {
  const palette = usePalette();
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id="metalBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={palette.body.metal1} />
          <Stop offset="42%" stopColor={palette.body.metal2} />
          <Stop offset="100%" stopColor={palette.body.metal3} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#metalBody)" />
    </Svg>
  );
}

/** 页面背景光晕（§5.1：背景 + 光晕）。 */
export function BackdropGlow() {
  const palette = usePalette();
  const glow = palette.backdrop.glowOpacity;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id="backdropGlow" cx="50%" cy="28%" r="72%">
          <Stop offset="0%" stopColor={palette.backdrop.glow} stopOpacity={glow} />
          <Stop offset="60%" stopColor={palette.backdrop.glow} stopOpacity={glow * 0.3} />
          <Stop offset="100%" stopColor={palette.body.background} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#backdropGlow)" />
    </Svg>
  );
}

/** 点击轮表面径向渐变（偏上高光）。 */
export function WheelSurface() {
  const palette = usePalette();
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id="wheelSurface" cx="50%" cy="32%" r="78%">
          <Stop offset="0%" stopColor={palette.body.wheel1} />
          <Stop offset="58%" stopColor={palette.body.wheel2} />
          <Stop offset="100%" stopColor={palette.body.wheel3} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#wheelSurface)" />
    </Svg>
  );
}
