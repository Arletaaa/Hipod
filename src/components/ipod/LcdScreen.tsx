import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LcdBacklight, Scanlines } from '@/components/ipod/Gradients';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export interface LcdScreenProps {
  title?: string;
  /** 标题栏右侧状态图标，默认 ▶。 */
  statusIcon?: string;
  children?: ReactNode;
}

/**
 * iPod 蓝白背光 LCD 屏：径向背光渐变（§5.1）+ 扫描线质感 + 标题栏 + 分割线 + 内容区。
 * 渐变与扫描线均为绝对定位底层，内容浮在其上。
 */
export function LcdScreen({ title = 'iPod', statusIcon = '▶', children }: LcdScreenProps) {
  return (
    <View style={styles.screen}>
      <LcdBacklight />
      <Scanlines />

      <View style={styles.titleBar}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.statusIcon}>{statusIcon}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    // 底色仅作渐变兜底（渐变铺满其上）
    backgroundColor: colors.lcd.bg1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.lcd.border,
    padding: 14,
    overflow: 'hidden',
  },
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.lcd.text,
    fontFamily: fonts.lcd,
    fontSize: 24,
  },
  statusIcon: {
    color: colors.lcd.textSecondary,
    fontFamily: fonts.lcd,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lcd.divider,
    marginVertical: 8,
  },
  content: {
    gap: 4,
  },
});
