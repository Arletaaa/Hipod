import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackdropGlow, MetalBody } from '@/components/ipod/Gradients';
import { ClickWheel, type ClickWheelProps } from '@/components/ipod/ClickWheel';
import { LcdScreen } from '@/components/ipod/LcdScreen';
import { BevelEdges, BrushedLayer, NoiseLayer } from '@/components/ipod/Materials';
import { usePalette } from '@/hooks/useTheme';
import type { Palette } from '@/theme/palettes';

export interface IpodShellProps {
  lcdTitle?: string;
  lcdStatusIcon?: string;
  /** LCD 内容区。 */
  children?: ReactNode;
  /** 点击轮回调，原样透传给 ClickWheel。 */
  wheel?: ClickWheelProps;
}

/** 机身圆角（外框）；电子框外圆角 = 机身圆角 − 内边距，保证同心。 */
const BODY_RADIUS = 30;
/** 机身内边距：0 = 黑电子框直接贴到设备外沿，不再有金属留白。 */
const BODY_PADDING = 0;

/**
 * iPod 外壳：上半屏黑电子框屏幕 + 下半屏硅胶点击轮，整体为阳极氧化铝机身。
 *
 * 材质分层（自下而上）：阳极氧化铝渐变 → 拉丝贴图 → 倒角高光/阴影 → 细微噪点。
 * 布局：两个 slot 各占一半高度，LCD 底边落在屏幕中线附近；点击轮在下半屏居中，
 * 因此与 LCD 的间距和与屏幕底边的间距相等，且不随页面变化漂移。
 */
export function IpodShell({
  lcdTitle = 'iPod',
  lcdStatusIcon = '▶',
  children,
  wheel,
}: IpodShellProps) {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      <BackdropGlow />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.lcdSlot}>
          {/* 外层只负责柔和投影（设备与页面背景之间靠阴影过渡，不用硬描边） */}
          <View style={styles.bodyShadow}>
            <View style={styles.body}>
              <MetalBody />
              <BrushedLayer />
              <BevelEdges radius={BODY_RADIUS} />
              <NoiseLayer opacity={0.5} />
              {/* 黑电子框直接落在金属上，四周仅留细金属倒角 */}
              <LcdScreen title={lcdTitle} statusIcon={lcdStatusIcon}>
                {children}
              </LcdScreen>
            </View>
          </View>
        </View>

        <View style={styles.wheelSlot}>
          <ClickWheel {...wheel} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.body.background,
    },
    safeArea: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 9,
    },
    lcdSlot: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    wheelSlot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /** 投影层：让机身从页面背景上"浮起"，形成柔和过渡。 */
    bodyShadow: {
      width: '100%',
      maxWidth: 372 + BODY_PADDING * 2,
      flex: 1,
      borderRadius: BODY_RADIUS,
      backgroundColor: palette.body.metal2,
      shadowColor: '#000000',
      shadowOpacity: 0.38,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    /** 阳极氧化铝机身。 */
    body: {
      width: '100%',
      flex: 1,
      backgroundColor: palette.body.metal2,
      borderRadius: BODY_RADIUS,
      // 细金属倒角：黑电子框几乎贴边
      padding: BODY_PADDING,
      overflow: 'hidden',
    },
  });
}
