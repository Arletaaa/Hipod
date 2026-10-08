import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { WheelSurface } from '@/components/ipod/Gradients';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export interface ClickWheelProps {
  onMenu?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onPlayPause?: () => void;
  onSelect?: () => void;
  /** 滚轮转动回调：+1 顺时针（列表下移）/ -1 逆时针（列表上移）。 */
  onRotate?: (step: number) => void;
}

const SIZE = 264;
const RADIUS = SIZE / 2; // 旋转几何中心
const CENTER = 128; // 中键直径
const DIR = 64; // 四方向键边长
const ROTATE_STEP = Math.PI / 6; // 每 30° 触发一档

/** 惯性滚动：松手时统计最近窗口内的档数推算速度。 */
const VELOCITY_WINDOW_MS = 200;
/** 触发惯性的最低速度（档/秒）。 */
const INERTIA_MIN_VELOCITY = 4;
/** 惯性计时器间隔（毫秒）。 */
const INERTIA_TICK_MS = 60;
/** 每个惯性 tick 的速度衰减系数。 */
const INERTIA_DECAY = 0.78;

interface StepMark {
  t: number;
  dir: number;
}

/**
 * iPod 点击轮（§5.3）：
 * - 环上四个方向键（MENU / ⏮ / ⏭ / ▶❚❚）+ 中键，可点击
 * - 滚轮环带可转动（Pan 手势按角度累计，每 30° 触发一次 onRotate）
 * - 快速转动后松手带惯性：按松手速度继续衰减滚动（§5.3 惯性滚动）
 */
export function ClickWheel({
  onMenu,
  onPrev,
  onNext,
  onPlayPause,
  onSelect,
  onRotate,
}: ClickWheelProps) {
  const onRotateRef = useRef(onRotate);
  useEffect(() => {
    onRotateRef.current = onRotate;
  }, [onRotate]);

  const angleRef = useRef(0);
  const accumRef = useRef(0);
  const marksRef = useRef<StepMark[]>([]);
  const inertiaRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopInertia = useCallback(() => {
    if (inertiaRef.current) {
      clearInterval(inertiaRef.current);
      inertiaRef.current = null;
    }
  }, []);

  useEffect(() => stopInertia, [stopInertia]);

  const emit = useCallback((dir: number) => {
    onRotateRef.current?.(dir);
    const now = Date.now();
    const marks = marksRef.current;
    marks.push({ t: now, dir });
    // 只保留最近窗口内的采样，避免长按拖动被平均成低速
    while (marks.length > 0 && now - marks[0]!.t > VELOCITY_WINDOW_MS) {
      marks.shift();
    }
  }, []);

  /** 松手后按速度继续滚动，速度按 tick 衰减直到低于阈值。 */
  const startInertia = useCallback(
    (velocity: number) => {
      stopInertia();
      let v = velocity;
      let carry = 0;
      inertiaRef.current = setInterval(() => {
        v *= INERTIA_DECAY;
        carry += v * (INERTIA_TICK_MS / 1000);
        while (carry >= 1) {
          carry -= 1;
          emit(1);
        }
        while (carry <= -1) {
          carry += 1;
          emit(-1);
        }
        if (Math.abs(v) < INERTIA_MIN_VELOCITY) stopInertia();
      }, INERTIA_TICK_MS);
    },
    [emit, stopInertia],
  );

  const rotationGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin((e) => {
          stopInertia();
          angleRef.current = Math.atan2(e.y - RADIUS, e.x - RADIUS);
          accumRef.current = 0;
          marksRef.current = [];
        })
        .onUpdate((e) => {
          const angle = Math.atan2(e.y - RADIUS, e.x - RADIUS);
          let delta = angle - angleRef.current;
          if (delta > Math.PI) delta -= 2 * Math.PI;
          else if (delta < -Math.PI) delta += 2 * Math.PI;
          angleRef.current = angle;
          accumRef.current += delta;
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
        .onEnd(() => {
          const marks = marksRef.current;
          if (marks.length === 0) return;
          const signedSum = marks.reduce((acc, m) => acc + m.dir, 0);
          const velocity = signedSum / (VELOCITY_WINDOW_MS / 1000);
          if (Math.abs(velocity) >= INERTIA_MIN_VELOCITY) {
            startInertia(velocity);
          }
        }),
    [emit, startInertia, stopInertia],
  );

  return (
    <View style={styles.container}>
      {/* 旋转环带：手势绑定在圆环背景上，方向键浮于其上互不冲突 */}
      <GestureDetector gesture={rotationGesture}>
        <View style={styles.wheel}>
          <WheelSurface />
        </View>
      </GestureDetector>

      <Pressable
        onPress={onSelect}
        style={({ pressed }) => [styles.center, pressed && styles.pressed]}
      >
        <View style={styles.centerInner} />
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

const styles = StyleSheet.create({
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
    borderRadius: SIZE / 2,
    // 底色仅作渐变兜底；WheelSurface 铺满其上
    backgroundColor: colors.body.wheel2,
    borderWidth: 1,
    borderColor: '#000',
    overflow: 'hidden',
  },
  center: {
    position: 'absolute',
    left: RADIUS - CENTER / 2,
    top: RADIUS - CENTER / 2,
    width: CENTER,
    height: CENTER,
    borderRadius: CENTER / 2,
    backgroundColor: colors.body.wheel3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerInner: {
    width: CENTER - 22,
    height: CENTER - 22,
    borderRadius: (CENTER - 22) / 2,
    backgroundColor: colors.body.wheel1,
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
  menuLabel: {
    color: colors.lcd.textSecondary,
    fontFamily: fonts.key,
    fontSize: 13,
    letterSpacing: 2,
  },
  iconLabel: {
    color: colors.lcd.textSecondary,
    fontSize: 20,
  },
  pressed: {
    opacity: 0.55,
    transform: [{ scale: 0.94 }],
  },
});
