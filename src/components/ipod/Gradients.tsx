import { StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { colors } from '@/theme/colors';

/**
 * iPod 视觉质感的渐变底面（§5.1）。
 * 全部为绝对定位铺满父容器，调用方只需保证父容器有 overflow: hidden（裁圆角）。
 */

/** LCD 径向背光：#1a3a5f 中心 → #0d2340 → #071426 边缘。 */
export function LcdBacklight() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id="lcdBacklight" cx="50%" cy="42%" r="82%">
          <Stop offset="0%" stopColor={colors.lcd.bg3} />
          <Stop offset="55%" stopColor={colors.lcd.bg2} />
          <Stop offset="100%" stopColor={colors.lcd.bg1} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#lcdBacklight)" />
    </Svg>
  );
}

/** LCD 扫描线纹理：每 4px 一条极淡亮线，营造像素屏质感。 */
export function Scanlines({ opacity = 0.05 }: { opacity?: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="lcdScanlines" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width="4" height="1" fill={colors.lcd.text} opacity={opacity} />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#lcdScanlines)" />
    </Svg>
  );
}

/** 金属机身竖向渐变：#2c2c32 → #17171b → #0f0f13。 */
export function MetalBody() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id="metalBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={colors.body.metal1} />
          <Stop offset="42%" stopColor={colors.body.metal2} />
          <Stop offset="100%" stopColor={colors.body.metal3} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#metalBody)" />
    </Svg>
  );
}

/** 页面背景蓝光晕（§5.1：背景 + 蓝光晕）。 */
export function BackdropGlow() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id="backdropGlow" cx="50%" cy="28%" r="72%">
          <Stop offset="0%" stopColor="#1a3a5f" stopOpacity={0.55} />
          <Stop offset="60%" stopColor="#0d2340" stopOpacity={0.18} />
          <Stop offset="100%" stopColor={colors.body.background} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#backdropGlow)" />
    </Svg>
  );
}

/** 点击轮表面径向渐变（偏上高光）：#26262b → #141419 → #0d0d11。 */
export function WheelSurface() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id="wheelSurface" cx="50%" cy="32%" r="78%">
          <Stop offset="0%" stopColor={colors.body.wheel1} />
          <Stop offset="58%" stopColor={colors.body.wheel2} />
          <Stop offset="100%" stopColor={colors.body.wheel3} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#wheelSurface)" />
    </Svg>
  );
}
