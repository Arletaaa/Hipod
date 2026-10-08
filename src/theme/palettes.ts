/**
 * 双主题调色板：
 * - `dark`  —— 深色蓝白背光（初版风格）
 * - `light` —— iPod Classic 浅色经典风格（银色阳极氧化机身 + 白色硅胶点击轮）
 *
 * 设计方向「工业复刻」：真实材质优先 —— 阳极氧化铝机身、哑光硅胶操作件、
 * 纯黑电子框屏幕（内框直角 / 外框圆角）、早期 TN 屏观感。
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
    /** 机身竖向渐变（阳极氧化铝）。 */
    metal1: string;
    metal2: string;
    metal3: string;
    /** 点击轮表面径向渐变（硅胶）。 */
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
  /**
   * 材质相关：真实感的关键（黑电子框、硅胶、金属高光/阴影、复古屏）。
   */
  material: {
    /** 屏幕黑电子框（外框圆角）。 */
    bezel: string;
    /** 电子框内唇高光，制造凹槽立体感。 */
    bezelLip: string;
    /** 屏面与电子框之间的深色缝隙。 */
    screenGap: string;
    /** 金属机身顶部高光边。 */
    metalHighlight: string;
    /** 金属机身底部阴影边。 */
    metalShadow: string;
    /** 复古屏的底色偏色（早期 TN 屏略偏冷绿）。 */
    screenCast: string;
    /** 像素网格（点阵）颜色。 */
    screenGrid: string;
    /** 文字的点阵描边阴影：让字形看起来由点阵拼出。 */
    textDotShadow: string;
    /** 硅胶件边缘的暗部（让操作件"陷入"机身）。 */
    siliconeShade: string;
    /** 硅胶件上的柔光（顶部受光）。 */
    siliconeSheen: string;
    /** 拉丝贴图的不透明度（0–1）。 */
    brushedOpacity: number;
    /** 颗粒贴图的不透明度（0–1）。 */
    grainOpacity: number;
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
      metal1: '#33343a',
      metal2: '#1b1c20',
      metal3: '#0e0f12',
      wheel1: '#2b2c30',
      wheel2: '#1c1d21',
      wheel3: '#101114',
      wheelCenter: '#191a1e',
      wheelCenterInner: '#26272c',
      wheelIcon: '#c9ccd2',
      wheelBorder: '#000000',
      frameBorder: '#000000',
      background: '#0b0b0e',
    },
    material: {
      bezel: '#050506',
      bezelLip: 'rgba(255,255,255,0.10)',
      screenGap: '#000000',
      metalHighlight: 'rgba(255,255,255,0.16)',
      metalShadow: 'rgba(0,0,0,0.65)',
      screenCast: 'rgba(10,30,50,0.0)',
      screenGrid: 'rgba(230,244,255,0.075)',
      textDotShadow: 'rgba(255,255,255,0.06)',
      siliconeShade: 'rgba(0,0,0,0.55)',
      siliconeSheen: 'rgba(255,255,255,0.10)',
      brushedOpacity: 0.5,
      grainOpacity: 0.85,
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
      // 银色阳极氧化铝
      metal1: '#eceae6',
      metal2: '#d2d0cb',
      metal3: '#a9a7a3',
      // 白色哑光硅胶
      wheel1: '#fbfbf9',
      wheel2: '#f0f0ee',
      wheel3: '#dcdcda',
      wheelCenter: '#eceae8',
      wheelCenterInner: '#f7f7f5',
      wheelIcon: '#63666b',
      wheelBorder: '#c4c4c1',
      frameBorder: '#8d8b87',
      background: '#c6c4c0',
    },
    material: {
      bezel: '#08090a',
      bezelLip: 'rgba(255,255,255,0.14)',
      screenGap: '#000000',
      metalHighlight: 'rgba(255,255,255,0.75)',
      metalShadow: 'rgba(0,0,0,0.30)',
      // 早期 TN 屏那点冷绿偏色
      screenCast: 'rgba(196,214,198,0.16)',
      screenGrid: 'rgba(30,40,35,0.075)',
      textDotShadow: 'rgba(0,0,0,0.07)',
      siliconeShade: 'rgba(0,0,0,0.14)',
      siliconeSheen: 'rgba(255,255,255,0.55)',
      brushedOpacity: 0.75,
      grainOpacity: 0.9,
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
