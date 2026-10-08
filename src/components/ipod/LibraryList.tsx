import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MenuList, type MenuListItem } from '@/components/ipod/MenuList';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { fonts } from '@/theme/fonts';
import { makeThemedStyles } from '@/theme/themedStyles';

export interface LibraryListProps {
  items: MenuListItem[];
  selectedIndex: number;
  /** 无数据时的提示文案（默认「曲库为空」）。 */
  emptyText?: string;
  rowHeight?: number;
  maxHeight?: number;
}

/**
 * 曲库类列表的公共外壳：统一处理「扫描中 / 扫描失败 / 空库」三种状态，
 * 空库时附带扫描诊断（媒体库命中数 / 目录扫描数），便于定位「为什么没有歌」。
 */
export function LibraryList({
  items,
  selectedIndex,
  emptyText = '曲库为空',
  rowHeight,
  maxHeight,
}: LibraryListProps) {
  const { scanStatus, scanError, scanStats } = useMediaLibrary();
  const styles = useStyles();

  if (scanStatus === 'error') {
    return <Placeholder>{scanError ?? '扫描失败'}</Placeholder>;
  }
  if (scanStatus === 'scanning' || scanStatus === 'requesting') {
    return <Placeholder>正在扫描曲库…</Placeholder>;
  }
  if (items.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.placeholder}>{emptyText}</Text>
        {scanStats ? (
          <Text style={styles.hint}>
            媒体库 {scanStats.mediaStoreCount} 首 · 目录扫描 {scanStats.filesystemCount} 首
            {'\n'}请把音乐放进 Music / Download 目录后重新扫描
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <MenuList
      items={items}
      selectedIndex={selectedIndex}
      {...(rowHeight != null ? { rowHeight } : {})}
      {...(maxHeight != null ? { maxHeight } : {})}
    />
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <Text style={styles.placeholder}>{children}</Text>;
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 16,
      gap: 6,
    },
    placeholder: {
      color: colors.lcd.textSecondary,
      fontFamily: fonts.lcd,
      fontSize: 20,
      textAlign: 'center',
    },
    hint: {
      color: colors.lcd.textMuted,
      fontFamily: fonts.lcd,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
    },
  }),
);
