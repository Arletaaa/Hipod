// §5.2 字体
// - lcd：LCD 像素字体。使用 **GNU Unifont**（OFL-1.1）——它是少数同时具备
//   像素观感与完整中日韩覆盖的字体，中文不会回退到系统字体（回退会立刻破坏像素风）。
//   VT323 只覆盖拉丁，中文会掉回系统字体，因此仅作为可选的拉丁字体保留。
// - key：点击轮上的刻印标签，用 JetBrains Mono 更利落。
// 加载名需与 _layout.tsx 里 useFonts() 的 key 一一对应。
export const fonts = {
  /** LCD 文本统一使用的中文像素字体。 */
  lcd: 'UnifontPixel',
  /** 拉丁/数字专用的复古终端字体（可选，当前 UI 未直接使用）。 */
  lcdLatin: 'VT323_400Regular',
  key: 'JetBrainsMono_400Regular',
  keyBold: 'JetBrainsMono_700Bold',
} as const;
