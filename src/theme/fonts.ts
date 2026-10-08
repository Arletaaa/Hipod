// §5.2 字体 —— LCD 像素字 VT323 + 按键标签 JetBrains Mono
// 加载名需与 _layout.tsx 里 useFonts() 的 key 一一对应
export const fonts = {
  lcd: 'VT323_400Regular',
  key: 'JetBrainsMono_400Regular',
  keyBold: 'JetBrainsMono_700Bold',
} as const;
