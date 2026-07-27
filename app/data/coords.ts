// Field trapezoid constants (inner coords from pitch.svg transform)
export const FIELD_TOP = 30.332;
export const FIELD_BOTTOM = 170.126;
export const FIELD_LEFT_TOP = 172.277;
export const FIELD_RIGHT_TOP = 647.137;
export const FIELD_LEFT_BOTTOM = 55;
export const FIELD_RIGHT_BOTTOM = 764.414;

export interface PositionPoint {
  x: number;
  y: number;
  t?: number;
}

export function xyPos(s: string | null): PositionPoint | null {
  if (!s) return null;
  const [nx, ny] = s.split(',').map(Number);
  const yInner = FIELD_TOP + ny * (FIELD_BOTTOM - FIELD_TOP);
  const leftX = FIELD_LEFT_TOP + ny * (FIELD_LEFT_BOTTOM - FIELD_LEFT_TOP);
  const rightX = FIELD_RIGHT_TOP + ny * (FIELD_RIGHT_BOTTOM - FIELD_RIGHT_TOP);
  const xInner = leftX + nx * (rightX - leftX);
  return { x: xInner, y: yInner };
}

export const GOAL_LEFT = { x: 107, y: 86.6 };
export const GOAL_RIGHT = { x: 712, y: 86.6 };
export const CENTER_FIELD = xyPos("0.5,0.5")!;

// Convert inner coords to SVG viewBox percentage (for HTML overlay positioning)
export function innerToPercent(x: number, y: number): { px: number; py: number } {
  const sx = 32.609401 + 0.26458333 * x;
  const sy = 65.462639 + 0.26458333 * y;
  return { px: (sx / 297) * 100, py: (sy / 210) * 100 };
}

export function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3); }
export function easeIn(t: number): number { return t * t * t; }
