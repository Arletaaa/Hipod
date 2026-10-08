import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { WheelSurface } from '@/components/ipod/Gradients';
import { NoiseLayer, TEXTURES } from '@/components/ipod/Materials';
import { usePalette } from '@/hooks/useTheme';
import { fonts } from '@/theme/fonts';
import type { Palette } from '@/theme/palettes';

export interface ClickWheelProps {
  onMenu?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onPlayPause?: () => void;
  onSelect?: () => void;
  /** 滚轮转动回调：+1 顺时针（列表下移）/ -1 逆时针（列表上移）。 */
  onRotate?: (step: number) => void;
  /** 滚轮松手（或手势被取消）时回调：用于退出「调节中」状态。 */
  onRotateEnd?: () => void;
}

const SIZE = 264;
const RADIUS = SIZE / 2; // 旋转几何中心
const CENTER = 128; // 中键直径
const DIR = 64; // 四方向键边长
const ROTATE_STEP = Math.PI / 6; // 每 30° 触发一档
/** 轮盘上所有标识（MENU 文字与四个符号键）统一字号。 */
const ICON_SIZE = 19;

/** 随转动旋转的颗粒贴图：做成比滚轮更大的方形，旋转时不会露出边角。 */
const GRAIN_SIZE = SIZE * 1.6;
const GRAIN_OFFSET = -(GRAIN_SIZE - SIZE) / 2;

/**
 * iPod 点击轮（§5.3）：哑光硅胶材质。
 * - 环带为硅胶面，表面颗粒贴图**随手指转动同步旋转**，产生"材质被搓动"的真实感
 * - 四方向键 + 中键为硅胶按键，图标做成微凹刻印（暗字 + 下方 1px 亮边）
 * - 手势：Pan 按角度累计，每 30° 触发一次 onRotate；**无惯性**，松手即停
 */
export function ClickWheel({
  onMenu,
  onPrev,
  onNext,
  onPlayPause,
  onSelect,
  onRotate,
  onRotateEnd,
}: ClickWheelProps) {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const onRotateRef = useRef(onRotate);
  useEffect(() => {
    onRotateRef.current = onRotate;
  }, [onRotate]);

  const onRotateEndRef = useRef(onRotateEnd);
  useEffect(() => {
    onRotateEndRef.current = onRotateEnd;
  }, [onRotateEnd]);

  const angleRef = useRef(0);
  const accumRef = useRef(0);
  /** 累计旋转角度（度，不取模）：驱动硅胶颗粒层同步旋转。 */
  const totalDegRef = useRef(0);
  const rotationDeg = useRef(new Animated.Value(0)).current;

  const emit = useCallback((dir: number) => {
    onRotateRef.current?.(dir);
  }, []);

  const rotationGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin((e) => {
          angleRef.current = Math.atan2(e.y - RADIUS, e.x - RADIUS);
          accumRef.current = 0;
        })
        .onUpdate((e) => {
          const angle = Math.atan2(e.y - RADIUS, e.x - RADIUS);
          let delta = angle - angleRef.current;
          if (delta > Math.PI) delta -= 2 * Math.PI;
          else if (delta < -Math.PI) delta += 2 * Math.PI;
          angleRef.current = angle;
          accumRef.current += delta;

          // 颗粒层跟随手指连续旋转（不走 state，避免每帧重渲染）
          totalDegRef.current += (delta * 180) / Math.PI;
          rotationDeg.setValue(totalDegRef.current);

          // 顺时针（angle 增大）→ 下移；逆时针 → 上移
          while (accumRef.current >= ROTATE_STEP) {
            accumRef.current -= ROTATE_STEP;
            emit(1);
          }
          while (accumRef.current <= -ROTATE_STEP) {
            accumRef.current += ROTATE_STEP;
            emit(-1);
          }
        })
        // onEnd 覆盖正常松手，onFinalize 兜住手势被取消的情况（两者都通知一次收尾）
        .onEnd(() => {
          onRotateEndRef.current?.();
        })
        .onFinalize(() => {
          onRotateEndRef.current?.();
        }),
    [emit, rotationDeg],
  );

  const grainRotate = rotationDeg.interpolate({
    inputRange: [-3600, 3600],
    outputRange: ['-3600deg', '3600deg'],
  });

  return (
    <View style={styles.container}>
      {/* 旋转环带：手势绑定在硅胶环面上，方向键浮于其上互不冲突 */}
      <GestureDetector gesture={rotationGesture}>
        <View style={styles.wheel}>
          <WheelSurface />
          {/* 硅胶颗粒：随转动同步旋转 */}
          <Animated.Image
            source={TEXTURES.siliconeGrain}
            resizeMode="repeat"
            style={[styles.grain, { transform: [{ rotate: grainRotate }] }]}
          />
          <NoiseLayer opacity={0.4} />
        </View>
      </GestureDetector>

      {/* 中键：硅胶按键（外圈凹陷 + 内圈凸起） */}
      <Pressable
        onPress={onSelect}
        style={({ pressed }) => [styles.center, pressed && styles.pressed]}
      >
        <View style={styles.centerInner}>
          <View style={styles.centerGrain} pointerEvents="none">
            <Image source={TEXTURES.siliconeGrain} resizeMode="repeat" style={styles.grainFill} />
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={onMenu}
        style={({ pressed }) => [styles.dir, styles.dirTop, pressed && styles.pressed]}
      >
        <Text style={styles.menuLabel}>MENU</Text>
      </Pressable>
      <Pressable
        onPress={onPrev}
        style={({ pressed }) => [styles.dir, styles.dirLeft, pressed && styles.pressed]}
      >
        <Text style={styles.iconLabel}>⏮</Text>
      </Pressable>
      <Pressable
        onPress={onNext}
        style={({ pressed }) => [styles.dir, styles.dirRight, pressed && styles.pressed]}
      >
        <Text style={styles.iconLabel}>⏭</Text>
      </Pressable>
      <Pressable
        onPress={onPlayPause}
        style={({ pressed }) => [styles.dir, styles.dirBottom, pressed && styles.pressed]}
      >
        <Text style={styles.iconLabel}>▶❚❚</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    container: {
      width: SIZE,
      height: SIZE,
    },
    wheel: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: RADIUS,
      backgroundColor: palette.body.wheel2,
      borderWidth: 1,
      borderColor: palette.body.wheelBorder,
      overflow: 'hidden',
    },
    /** 随转动旋转的颗粒层（比滚轮更大，避免旋转时露角）。 */
    grain: {
      position: 'absolute',
      width: GRAIN_SIZE,
      height: GRAIN_SIZE,
      left: GRAIN_OFFSET,
      top: GRAIN_OFFSET,
      opacity: 0.9,
    },
    center: {
      position: 'absolute',
      left: RADIUS - CENTER / 2,
      top: RADIUS - CENTER / 2,
      width: CENTER,
      height: CENTER,
      borderRadius: CENTER / 2,
      backgroundColor: palette.body.wheelCenter,
      borderWidth: 1,
      borderColor: palette.material.siliconeShade,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerInner: {
      width: CENTER - 22,
      height: CENTER - 22,
      borderRadius: (CENTER - 22) / 2,
      backgroundColor: palette.body.wheelCenterInner,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerGrain: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      opacity: 0.75,
    },
    grainFill: {
      width: '100%',
      height: '100%',
    },
    dir: {
      position: 'absolute',
      width: DIR,
      height: DIR,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dirTop: { top: 8, left: RADIUS - DIR / 2 },
    dirBottom: { bottom: 8, left: RADIUS - DIR / 2 },
    dirLeft: { left: 8, top: RADIUS - DIR / 2 },
    dirRight: { right: 8, top: RADIUS - DIR / 2 },
    /** 刻印感：暗字 + 下方 1px 亮边（凹刻）。字号与符号键统一为 ICON_SIZE。 */
    menuLabel: {
      color: palette.body.wheelIcon,
      fontFamily: fonts.keyBold,
      fontSize: ICON_SIZE,
      letterSpacing: 1,
      textShadowColor: palette.material.siliconeSheen,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 0,
    },
    iconLabel: {
      color: palette.body.wheelIcon,
      fontSize: ICON_SIZE,
      lineHeight: ICON_SIZE + 4,
      textShadowColor: palette.material.siliconeSheen,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 0,
    },
    pressed: {
      opacity: 0.62,
      transform: [{ scale: 0.96 }],
    },
  });
