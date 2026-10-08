import { useEffect, useMemo, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { MarqueeText } from '@/components/ipod/MarqueeText';
import { usePalette } from '@/hooks/useTheme';
import { fonts } from '@/theme/fonts';
import type { Palette } from '@/theme/palettes';

export interface MenuListItem {
  id: string;
  label: string;
  sublabel?: string;
  /** 副标题过长时改为跑马灯滚动（如「正在播放」的当前曲名）。 */
  marqueeSublabel?: boolean;
}

export interface MenuListProps {
  items: MenuListItem[];
  selectedIndex: number;
  rowHeight?: number;
  /** 可选高度上限；默认占满 LCD 剩余空间（超出则内部滚动）。 */
  maxHeight?: number;
}

/**
 * iPod 菜单式列表：选中项反色高亮（深色主题=白底蓝字 / 浅色主题=蓝底白字）。
 * 默认占满 LCD 内容区（长列表在内部滚动），也可用 maxHeight 限制高度上限。
 */
export function MenuList({
  items,
  selectedIndex,
  rowHeight = 48,
  maxHeight,
}: MenuListProps) {
  const listRef = useRef<FlatList<MenuListItem>>(null);
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  useEffect(() => {
    if (items.length === 0) return;
    const index = Math.max(0, Math.min(selectedIndex, items.length - 1));
    try {
      if (index === 0) {
        // 选中项就是第一项时不能再用 scrollToIndex(viewPosition: 0.5) 居中——
        // 那会把首行推到视口上方，导致选中项的标题被裁掉（实测只剩 6px 高度）。
        // 这种情况直接回到顶部，保证首行完整可见。
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
        return;
      }
      listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
    } catch {
      // 列表尚未完成布局时滚动失败可忽略
    }
  }, [selectedIndex, items.length]);

  return (
    <FlatList
      ref={listRef}
      style={[styles.list, maxHeight != null ? { maxHeight } : null]}
      data={items}
      keyExtractor={(it) => it.id}
      renderItem={({ item, index }) => {
        const isSelected = index === selectedIndex;
        return (
          <View style={[styles.row, { height: rowHeight }, isSelected && styles.rowSelected]}>
            <View style={styles.rowText}>
              <Text numberOfLines={1} style={[styles.label, isSelected && styles.labelSelected]}>
                {item.label}
              </Text>
              {item.sublabel ? (
                item.marqueeSublabel ? (
                  <MarqueeText
                    text={item.sublabel}
                    style={[styles.sublabel, isSelected && styles.sublabelSelected]}
                  />
                ) : (
                  <Text
                    numberOfLines={1}
                    style={[styles.sublabel, isSelected && styles.sublabelSelected]}
                  >
                    {item.sublabel}
                  </Text>
                )
              ) : null}
            </View>
          </View>
        );
      }}
      getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
      showsVerticalScrollIndicator={false}
    />
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    list: {
      // 占满 LCD 内容区剩余空间；内容超出时列表自身滚动
      flex: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      borderRadius: 2,
    },
    rowSelected: {
      backgroundColor: palette.lcd.selectionBg,
    },
    rowText: {
      flex: 1,
    },
    label: {
      color: palette.lcd.text,
      fontFamily: fonts.lcd,
      // VT323 默认行高约为字号的 1.5 倍，会让「主标题 + 副标题」超出 rowHeight
      // 并向上溢出（第一行标题被列表顶部裁掉），因此显式收紧行高。
      fontSize: 20,
      lineHeight: 22,
    },
    labelSelected: {
      color: palette.lcd.selectionText,
    },
    sublabel: {
      color: palette.lcd.textSecondary,
      fontFamily: fonts.lcd,
      fontSize: 14,
      lineHeight: 16,
      marginTop: 2,
    },
    sublabelSelected: {
      color: palette.lcd.selectionSubText,
    },
  });
}
