import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackdropGlow, MetalBody } from '@/components/ipod/Gradients';
import { ClickWheel, type ClickWheelProps } from '@/components/ipod/ClickWheel';
import { LcdScreen } from '@/components/ipod/LcdScreen';
import { colors } from '@/theme/colors';

export interface IpodShellProps {
  lcdTitle?: string;
  lcdStatusIcon?: string;
  /** LCD 内容区。 */
  children?: ReactNode;
  /** 点击轮回调，原样透传给 ClickWheel。 */
  wheel?: ClickWheelProps;
}

/**
 * iPod 外壳：固定高度的金属机身，LCD 屏 + 点击轮。
 * 布局要点：LCD 与点击轮之间用固定间距（space-between），
 * 保证不同页面下点击轮始终贴在底部同一位置，不随 LCD 内容高度漂移。
 */
export function IpodShell({ lcdTitle = 'iPod', lcdStatusIcon = '▶', children, wheel }: IpodShellProps) {
  return (
    <View style={styles.container}>
      <BackdropGlow />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.body}>
          <MetalBody />
          <LcdScreen title={lcdTitle} statusIcon={lcdStatusIcon}>
            {children}
          </LcdScreen>
        </View>

        <ClickWheel {...wheel} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.body.background,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  body: {
    width: '100%',
    maxWidth: 360,
    // 底色仅作渐变兜底；MetalBody 铺满其上，overflow 裁出圆角
    backgroundColor: colors.body.metal2,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#000',
    padding: 16,
    overflow: 'hidden',
  },
});
