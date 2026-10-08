import { useSettingsStore } from '@/store/settings';
import { PALETTES, type Palette, type ThemeName } from '@/theme/palettes';

/** 当前主题名。 */
export function useThemeName(): ThemeName {
  return useSettingsStore((s) => s.theme);
}

/** 当前主题调色板。 */
export function usePalette(): Palette {
  return PALETTES[useThemeName()];
}
