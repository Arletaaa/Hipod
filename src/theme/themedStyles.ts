import { PALETTES, type Palette, type ThemeName } from '@/theme/palettes';
import { useThemeName } from '@/hooks/useTheme';

/**
 * 把「调色板 → 样式表」的工厂预生成两套（深色 / 浅色），
 * 组件里以 `const styles = useStyles()` 取用当前主题，
 * 既避免每次渲染重建样式，也让切换主题无需重建组件树。
 *
 * @example
 * const useStyles = makeThemedStyles((colors) =>
 *   StyleSheet.create({ root: { color: colors.lcd.text } }),
 * );
 */
export function makeThemedStyles<T>(factory: (palette: Palette) => T): () => T {
  const cache: Record<ThemeName, T> = {
    dark: factory(PALETTES.dark),
    light: factory(PALETTES.light),
  };
  return function useThemedStyles(): T {
    return cache[useThemeName()];
  };
}
