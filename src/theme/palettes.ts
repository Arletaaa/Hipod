/**
 * 双主题调色板：
 * - `dark`  —— 深色蓝白背光（初版风格）
 * - `light` —— iPod Classic 浅色经典风格（银色机身 + 白色点击轮 + 白底蓝选中）
 *
 * 所有组件样式都从调色板派生（模块作用域预生成两套 StyleSheet），
 * 切换主题时通过 settings store 的 theme 字段驱动重渲染。
 */

export type ThemeName = 'dark' | 'light';

export interface Palette {
  lcd: {
    /** 背光径向渐变的三个停靠色（中心 → 中间 → 边缘）。 */
    bg1: string;
    bg2: string;
    bg3: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    divider: string;
    progressTrack: string;
    progressFill: string;
    progressHead: string;
    /** 选中行反色。 */
    selectionBg: string;
    selectionText: string;
    selectionSubText: string;
  };
  body: {
    /** 机身竖向渐变。 */
    metal1: string;
    metal2: string;
    metal3: string;
    /** 点击轮表面径向渐变。 */
    wheel1: string;
    wheel2: string;
    wheel3: string;
    /** 中键（外圈 / 内圈）。 */
    wheelCenter: string;
    wheelCenterInner: string;
    wheelIcon: string;
    wheelBorder: string;
    frameBorder: string;
    /** 页面背景。 */
    background: string;
  };
  backdrop: {
    glow: string;
    glowOpacity: number;
  };
}

export const PALETTES: Record<ThemeName, Palette> = {
  dark: {
    lcd: {
      bg1: '#071426',
      bg2: '#0d2340',
      bg3: '#1a3a5f',
      text: '#e6f4ff',
      textSecondary: '#9cc6ee',
      textMuted: '#6f9cc8',
      border: '#1e4166',
      divider: '#24456b',
      progressTrack: '#14304d',
      progressFill: '#9cc6ee',
      progressHead: '#e6f4ff',
      selectionBg: '#e6f4ff',
      selectionText: '#071426',
      selectionSubText: '#0d2340',
    },
    body: {
      metal1: '#2c2c32',
      metal2: '#17171b',
      metal3: '#0f0f13',
      wheel1: '#26262b',
      wheel2: '#141419',
      wheel3: '#0d0d11',
      wheelCenter: '#0d0d11',
      wheelCenterInner: '#26262b',
      wheelIcon: '#9cc6ee',
      wheelBorder: '#000',
      frameBorder: '#000',
      background: '#0b0b0e',
    },
    backdrop: { glow: '#1a3a5f', glowOpacity: 0.55 },
  },

  light: {
    lcd: {
      bg1: '#dfe3e6',
      bg2: '#f4f6f7',
      bg3: '#ffffff',
      text: '#1b1b1b',
      textSecondary: '#5d5d5d',
      textMuted: '#8c8c8c',
      border: '#a9a9a9',
      divider: '#c9c9c9',
      progressTrack: '#cfcfcf',
      progressFill: '#4a7ec7',
      progressHead: '#6b6b6b',
      selectionBg: '#3f74c9',
      selectionText: '#ffffff',
      selectionSubText: '#dbe6f7',
    },
    body: {
      metal1: '#e2e2e2',
      metal2: '#c9c9c9',
      metal3: '#a9a9a9',
      wheel1: '#ffffff',
      wheel2: '#f2f2f2',
      wheel3: '#dcdcdc',
      wheelCenter: '#e6e6e6',
      wheelCenterInner: '#f7f7f7',
      wheelIcon: '#5f5f5f',
      wheelBorder: '#b5b5b5',
      frameBorder: '#8f8f8f',
      background: '#c9c9c9',
    },
    backdrop: { glow: '#ffffff', glowOpacity: 0.5 },
  },
};

export const THEME_LABELS: Record<ThemeName, string> = {
  dark: '深色背光',
  light: '经典银色',
};

export const THEME_ORDER: ThemeName[] = ['dark', 'light'];

export function isThemeName(value: unknown): value is ThemeName {
  return value === 'dark' || value === 'light';
}
