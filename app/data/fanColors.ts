/**
 * 扇形区域共用配色 — 灰 / 黄 / 红 三档:
 *  - gray:   角球、球门球、界外球
 *  - yellow: 普通/间接任意球
 *  - red:    直接任意球
 * 填充用 FAN_COLORS, 沿扇形向前推进的高亮波带用 FAN_WAVE_COLORS(同色系更亮)。
 * 所有扇形相关的渐变 stop、动态填充、波带颜色都从这里引用，不再散落硬编码。
 */
export const FAN_COLORS = {
  gray: '#7a7a7a',
  yellow: '#ffe135',
  red: '#ff3b30',
} as const;

export const FAN_WAVE_COLORS = {
  gray: '#ffffff',
  yellow: '#fff700',
  red: '#ff5347',
} as const;

/** 界外球专用浅绿色扇形底色（与球门球/角球的灰色区分） */
export const THROW_FAN_COLOR = '#90ee90';

export type FanColorKey = keyof typeof FAN_COLORS;
