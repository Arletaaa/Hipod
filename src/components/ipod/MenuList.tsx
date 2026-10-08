import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export interface MenuListItem {
  id: string;
  label: string;
  sublabel?: string;
}

export interface MenuListProps {
  items: MenuListItem[];
  selectedIndex: number;
  rowHeight?: number;
  maxHeight?: number;
}

/**
 * iPod 菜单式列表：选中项反色高亮（白底蓝字），滚轮/按键移动选中时自动居中滚动。
 * 高度 = min(items.length * rowHeight, maxHeight)，短列表不滚动、长列表滚动。
 */
export function MenuList({
  items,
  selectedIndex,
  rowHeight = 44,
  maxHeight = 300,
}: MenuListProps) {
  const listRef = useRef<FlatList<MenuListItem>>(null);
  const height = Math.min(items.length * rowHeight, maxHeight);

  useEffect(() => {
    if (items.length === 0) return;
    try {
      listRef.current?.scrollToIndex({
        index: Math.max(0, Math.min(selectedIndex, items.length - 1)),
        viewPosition: 0.5,
        animated: true,
      });
    } catch {
      // 列表尚未完成布局时滚动失败可忽略
    }
  }, [selectedIndex, items.length]);

  return (
    <FlatList
      ref={listRef}
      style={{ height }}
      data={items}
      keyExtractor={(it) => it.id}
      renderItem={({ item, index }) => {
        const isSelected = index === selectedIndex;
        return (
          <View style={[styles.row, { height: rowHeight }, isSelected && styles.rowSelected]}>
            <Text numberOfLines={1} style={[styles.label, isSelected && styles.labelSelected]}>
              {item.label}
            </Text>
            {item.sublabel ? (
              <Text
                numberOfLines={1}
                style={[styles.sublabel, isSelected && styles.sublabelSelected]}
              >
                {item.sublabel}
              </Text>
            ) : null}
          </View>
        );
      }}
      getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: 2,
  },
  rowSelected: {
    backgroundColor: colors.lcd.text,
  },
  label: {
    color: colors.lcd.text,
    fontFamily: fonts.lcd,
    fontSize: 20,
  },
  labelSelected: {
    color: colors.lcd.bg1,
  },
  sublabel: {
    color: colors.lcd.textSecondary,
    fontFamily: fonts.lcd,
    fontSize: 14,
    marginTop: 1,
  },
  sublabelSelected: {
    color: colors.lcd.bg2,
  },
});
