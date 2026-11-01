// pitch_v4.svg 坐标系: viewBox 322×182(球场 + venue 背景一体图)
// 数据坐标 (nx,ny)∈[0,1]²(nx 左→右, ny 远→近)经单应矩阵 H 透视映射到 viewBox。
// H 由球场四角标定(DLT 求解, h33=1):
//   (0,0)→(66.482,  72.367)   (1,0)→(255.863,  71.987)
//   (0,1)→(12.321, 154.278)   (1,1)→(309.414, 154.402)
// 已验证: 中场线端点 / 禁区与小禁区四角 / 中点圆,误差 < 0.1 个 viewBox 单位。
const H11 = 187.9571418422, H12 = -58.6160175618, H13 = 66.482054;
const H21 = -0.7802166132, H22 = 26.1314960362, H23 = 72.366907;
const H31 = -0.0055649073, H32 = -0.3615520886;

// 引擎内部单位 → viewBox 的缩放(= 旧体系 0.26458333 × 322/297,
// 保证球/动画等元素在屏幕上的视觉尺寸与旧版一致)
export const INNER_SCALE = 0.2868546541;

// 球场梯形四角(内部单位 = viewBox / INNER_SCALE),供 clampToField / 默认站位近似使用
export const FIELD_TOP = 252.28;
export const FIELD_BOTTOM = 538.04;
export const FIELD_LEFT_TOP = 231.76;
export const FIELD_RIGHT_TOP = 891.96;
export const FIELD_LEFT_BOTTOM = 42.95;
export const FIELD_RIGHT_BOTTOM = 1078.65;

export interface PositionPoint {
  x: number;
  y: number;
  t?: number;
}

export function xyPos(s: string | null): PositionPoint | null {
  if (!s) return null;
  const [nx, ny] = s.split(',').map(Number);
  // 残缺/非数字坐标(如只有 "50")不能投影出 NaN，否则皮球会直接消失
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;
  const p = xyView(nx, ny);
  return { x: p.x / INNER_SCALE, y: p.y / INNER_SCALE };
}

/** 投影深度因子 w = H31·nx + H32·ny + 1（越小越靠近镜头）。 */
export function depthW(nx: number, ny: number): number {
  return H31 * nx + H32 * ny + 1;
}

/** 数据坐标 (nx,ny ∈ [0,1]) → viewBox 坐标(322×182)，供直接绘制在 overlay 上。 */
export function xyView(nx: number, ny: number): { x: number; y: number } {
  const w = depthW(nx, ny);
  return {
    x: (H11 * nx + H12 * ny + H13) / w,
    y: (H21 * nx + H22 * ny + H23) / w,
  };
}

/** viewBox 坐标 → 数据坐标 (xyView 的逆变换)。 */
export function viewToXY(x: number, y: number): { x: number; y: number } {
  // (H11 - x·H31)·nx + (H12 - x·H32)·ny = x - H13
  // (H21 - y·H31)·nx + (H22 - y·H32)·ny = y - H23
  const a11 = H11 - x * H31, a12 = H12 - x * H32, b1 = x - H13;
  const a21 = H21 - y * H31, a22 = H22 - y * H32, b2 = y - H23;
  const det = a11 * a22 - a12 * a21;
  return { x: (b1 * a22 - a12 * b2) / det, y: (a11 * b2 - b1 * a21) / det };
}

/**
 * 场内点 (nx,ny) 处，viewBox 屏幕方向 (dx,dy) 对应的场平面方向（未归一化）。
 * 单应映射的局部雅可比逆变换：用于把屏幕上的角度落回场地平面，
 * 再按真实圆弧采样并经 xyView 投影，弧线才会贴合草坪透视。
 */
export function pitchDir(nx: number, ny: number, dx: number, dy: number): { x: number; y: number } {
  const w = depthW(nx, ny);
  const X = H11 * nx + H12 * ny + H13;
  const Y = H21 * nx + H22 * ny + H23;
  // J = (1/w²) · [[H11·w − X·H31, H12·w − X·H32], [H21·w − Y·H31, H22·w − Y·H32]]
  const j11 = (H11 * w - X * H31) / (w * w);
  const j12 = (H12 * w - X * H32) / (w * w);
  const j21 = (H21 * w - Y * H31) / (w * w);
  const j22 = (H22 * w - Y * H32) / (w * w);
  const det = j11 * j22 - j12 * j21;
  return { x: (j22 * dx - j12 * dy) / det, y: (-j21 * dx + j11 * dy) / det };
}

// 竖直物体每米的屏幕长度 = VERTICAL_K / w(viewBox 单位)。
// 由新图左门柱标定: 2.44m 门柱投影 6.128 单位, 该处 w = 0.8192。
export const VERTICAL_K = 2.0574;

// 球门网窝中心(内部单位): viewBox (38.31,104.39) / (283.86,104.13)
export const GOAL_LEFT = { x: 133.54, y: 363.92 };
export const GOAL_RIGHT = { x: 989.56, y: 363.02 };
export const CENTER_FIELD = xyPos("0.5,0.5")!;
// 中线两端(内部单位): 顶 (560.94,251.62) / 底 (558.53,538.04)
export const CENTER_TOP = xyPos("0.5,0")!;
export const CENTER_BOTTOM = xyPos("0.5,1")!;
// 白线四角(内部单位,经单应矩阵精确映射),供区域遮罩/进攻色块贴线使用
export const CORNER_TL = xyPos("0,0")!;  // 左球门线远端 (231.76,252.28)
export const CORNER_TR = xyPos("1,0")!;  // 右球门线远端 (891.96,250.95)
export const CORNER_BL = xyPos("0,1")!;  // 左球门线近端 (42.95,537.83)
export const CORNER_BR = xyPos("1,1")!;  // 右球门线近端 (1078.65,538.26)
// 球门门柱(内部单位): 门宽 7.32m / 场宽 68m ≈ 0.1076 → ny = 0.5 ± 0.0538
// 任意球"威胁走廊"的两条边分别瞄准两根门柱,经单应矩阵映射后天然带透视
export const POST_LEFT_FAR = xyPos("0,0.4462")!;
export const POST_LEFT_NEAR = xyPos("0,0.5538")!;
export const POST_RIGHT_FAR = xyPos("1,0.4462")!;
export const POST_RIGHT_NEAR = xyPos("1,0.5538")!;

// 内部单位 → 容器百分比(用于 HTML tooltip 定位)
export function innerToPercent(x: number, y: number): { px: number; py: number } {
  return { px: (x * INNER_SCALE / 322) * 100, py: (y * INNER_SCALE / 182) * 100 };
}

export function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3); }
export function easeIn(t: number): number { return t * t * t; }
