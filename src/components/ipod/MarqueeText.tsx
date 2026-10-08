import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';

export interface MarqueeTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  /** 每轮滚动前后的停顿（毫秒）。 */
  pauseMs?: number;
  /** 滚动速度（像素/秒）。 */
  speed?: number;
}

/**
 * 跑马灯文本：文本宽于容器时循环滚动，放得下则静态显示。
 *
 * 实现要点：RN 中子元素宽度会被父容器约束，若只给文本设 numberOfLines=1，
 * 它会被省略号截断，平移也就没有可见效果。因此这里**按字符估算文本宽度**，
 * 给滚动轨道一个显式宽度（估算值 × 安全系数），文本因此有足够空间不被截断，
 * 再对轨道做 translateX 平移，由外层容器裁剪。
 */
export function MarqueeText({ text, style, pauseMs = 900, speed = 30 }: MarqueeTextProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const fontSize = StyleSheet.flatten(style)?.fontSize ?? 14;
  const trackWidth = Math.max(estimateTextWidth(text, fontSize), containerWidth);
  const distance = Math.max(0, trackWidth - containerWidth);
  const overflow = containerWidth > 0 && distance > 2;

  useEffect(() => {
    translateX.setValue(0);
    if (!overflow) return;
    const duration = Math.max(800, (distance / speed) * 1000);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(pauseMs),
        Animated.timing(translateX, {
          toValue: -distance,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(pauseMs),
        Animated.timing(translateX, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [overflow, distance, speed, pauseMs, translateX]);

  return (
    <View
      style={styles.container}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[styles.track, { width: trackWidth, transform: [{ translateX }] }]}
      >
        <Text numberOfLines={1} style={style}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * 粗略估算文本渲染宽度（VT323 / 等宽字体场景足够用）：
 * CJK 与全角字符按 1 个字宽、其余按 0.6 个字宽，再乘 1.08 安全系数。
 */
function estimateTextWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const char of text) {
    units += /[\u2e80-\u9fff\uff00-\uffef\u3000-\u303f]/.test(char) ? 1 : 0.6;
  }
  return Math.ceil(units * fontSize * 1.08);
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
  },
});
