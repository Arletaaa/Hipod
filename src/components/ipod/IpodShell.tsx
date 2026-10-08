import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlbumArtPanel } from '@/components/ipod/AlbumArtPanel';
import { BackdropGlow, MetalBody } from '@/components/ipod/Gradients';
import { ClickWheel, type ClickWheelProps } from '@/components/ipod/ClickWheel';
import { LcdScreen } from '@/components/ipod/LcdScreen';
import { usePalette } from '@/hooks/useTheme';
import type { Palette } from '@/theme/palettes';

export interface IpodShellProps {
  lcdTitle?: string;
  lcdStatusIcon?: string;
  /** LCD 内容区。 */
  children?: ReactNode;
  /** 点击轮回调，原样透传给 ClickWheel。 */
  wheel?: ClickWheelProps;
  /** 是否显示主菜单右侧的分屏封面区（iPod Classic 主菜单布局）。 */
  showAlbumArt?: boolean;
}

/**
 * iPod 外壳：上半屏固定尺寸的 LCD 机身 + 下半屏居中的点击轮。
 *
 * 布局要点（保证所有页面完全一致）：
 * - 两个 slot 各占一半高度（flex:1），因此 LCD 底边始终落在屏幕中线附近，
 *   机身大小与内容多少无关 —— 列表再长也只是在 LCD 内部滚动。
 * - 点击轮在下半屏内垂直居中，于是它与 LCD 的间距和与屏幕底边的间距相等，
 *   整体位于屏幕中下位置，且不会随页面变化而漂移。
 */
export function IpodShell({
  lcdTitle = 'iPod',
  lcdStatusIcon = '▶',
  children,
  wheel,
  showAlbumArt = false,
}: IpodShellProps) {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      <BackdropGlow />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.lcdSlot}>
          <View style={styles.body}>
            <MetalBody />
            <LcdScreen title={lcdTitle} statusIcon={lcdStatusIcon}>
              {showAlbumArt ? (
                <View style={styles.split}>
                  <View style={styles.splitMain}>{children}</View>
                  <AlbumArtPanel />
                </View>
              ) : (
                children
              )}
            </LcdScreen>
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
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    /** 上半屏：LCD 机身槽位。 */
    lcdSlot: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    /** 下半屏：点击轮槽位（内部居中 → 上下间距相等）。 */
    wheelSlot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      width: '100%',
      maxWidth: 360,
      flex: 1,
      // 底色仅作渐变兜底；MetalBody 铺满其上，overflow 裁出圆角
      backgroundColor: palette.body.metal2,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: palette.body.frameBorder,
      padding: 16,
      overflow: 'hidden',
    },
    split: {
      flex: 1,
      flexDirection: 'row',
    },
    splitMain: {
      flex: 1,
    },
  });
}
