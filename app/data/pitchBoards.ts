import { depthW, VERTICAL_K, xyView } from '~/data/coords';

/**
 * LED advertising hoardings around the opposite half of the venue: up the left
 * side, rounded top-left corner, across the far touchline, rounded top-right
 * corner, down the right side. Offsets are measured from the pitch lines, so
 * the boards sit on the apron instead of inside the field.
 *
 * The whole U is one continuous centreline. Every panel is a projective quad
 * textured with a "scoreref" marquee whose phase comes from the cumulative
 * distance along the U, so the ticker runs around the rounded corners without
 * restarting at panel seams.
 *
 * 几何只依赖常量：SVG 里的静态板面（PitchBoards）和 HTML 跑马灯层
 * （BoardMarqueeLayer）共用这里的 buildPanels()，保证两者完全对齐。
 */
type Pt = { x: number; y: number }; // metric pitch coords (m), may lie outside

const PITCH_L = 105;
const PITCH_W = 68;
export const BOARD_H_M = 3.6;
const SIDE_OUT_M = 5.5;
const FAR_OUT_M = 7.2;
const SIDE_END_M = 0.92 * PITCH_W;
const CORNER_R_M = 7.0;

const SIDE_PANELS = 6;
const FAR_PANELS = 10;
const CORNER_PANELS = 8;

// One marquee tile: word + gap. The word width matches Arial Bold's natural
// "scoreref" advance (3.947 em) at the font size used below, so nothing is
// squeezed by textLength.
export const PERIOD_M = 11.4;
const WORD_SHARE = 0.72;
export const SPEED_MPS = 2.0;
export const WORD_W = PERIOD_M * WORD_SHARE;
export const FONT_M = WORD_W / 3.947;

export const FILLS = ['#08131f', '#0b1b2a'];
export const BRAND = '#d9ff57';

interface PanelSpec {
  b0: Pt;
  b1: Pt;
  /** Cumulative distance along the U at the panel start (m). */
  s0: number;
  /** Panel chord length (m). */
  len: number;
}

function buildSpecs(): PanelSpec[] {
  const specs: PanelSpec[] = [];
  let s = 0;

  const line = (from: Pt, to: Pt, panels: number) => {
    const len = Math.hypot(to.x - from.x, to.y - from.y);
    for (let i = 0; i < panels; i++) {
      const u0 = i / panels;
      const u1 = (i + 1) / panels;
      specs.push({
        b0: { x: from.x + (to.x - from.x) * u0, y: from.y + (to.y - from.y) * u0 },
        b1: { x: from.x + (to.x - from.x) * u1, y: from.y + (to.y - from.y) * u1 },
        s0: s + len * u0,
        len: len / panels,
      });
    }
    s += len;
  };

  const arc = (c: Pt, r: number, a0: number, a1: number, panels: number) => {
    const arcLen = Math.abs(a1 - a0) * r;
    for (let i = 0; i < panels; i++) {
      const t0 = a0 + ((a1 - a0) * i) / panels;
      const t1 = a0 + ((a1 - a0) * (i + 1)) / panels;
      const p0 = { x: c.x + r * Math.cos(t0), y: c.y + r * Math.sin(t0) };
      const p1 = { x: c.x + r * Math.cos(t1), y: c.y + r * Math.sin(t1) };
      specs.push({
        b0: p0,
        b1: p1,
        s0: s + arcLen * (i / panels),
        len: Math.hypot(p1.x - p0.x, p1.y - p0.y),
      });
    }
    s += arcLen;
  };

  const xLeft = -SIDE_OUT_M;
  const xRight = PITCH_L + SIDE_OUT_M;
  const yFar = -FAR_OUT_M;
  const yCornerStart = yFar + CORNER_R_M;

  // near-left -> up the left side -> rounded top-left -> far side ->
  // rounded top-right -> down the right side (stationary order keeps the text
  // unmirrored: screen x always increases along the path).
  line({ x: xLeft, y: SIDE_END_M }, { x: xLeft, y: yCornerStart }, SIDE_PANELS);
  arc({ x: xLeft + CORNER_R_M, y: yCornerStart }, CORNER_R_M, Math.PI, 1.5 * Math.PI, CORNER_PANELS);
  line({ x: xLeft + CORNER_R_M, y: yFar }, { x: xRight - CORNER_R_M, y: yFar }, FAR_PANELS);
  arc({ x: xRight - CORNER_R_M, y: yCornerStart }, CORNER_R_M, 1.5 * Math.PI, 2 * Math.PI, CORNER_PANELS);
  line({ x: xRight, y: yCornerStart }, { x: xRight, y: SIDE_END_M }, SIDE_PANELS);

  return specs;
}

function viewPoint(p: Pt): { x: number; y: number } {
  return xyView(p.x / PITCH_L, p.y / PITCH_W);
}

function heightAt(p: Pt): number {
  return (VERTICAL_K * BOARD_H_M) / depthW(p.x / PITCH_L, p.y / PITCH_W);
}

export interface BoardPanel {
  key: string;
  /** Panel quad in viewBox units (top-left, top-right, bottom-right, bottom-left). */
  points: Pt[];
  /** Top rail segment. */
  rail: [number, number, number, number];
  /** Affine map from board-local metres to viewBox units: [a, b, 0, d, e, f]. */
  mx: [number, number, number, number, number, number];
  /** Distance (m) along the U at this panel's start, modulo one marquee period. */
  phase: number;
  fill: string;
}

export function buildPanels(): BoardPanel[] {
  return buildSpecs().map((sp, i) => {
    const v0 = viewPoint(sp.b0);
    const v1 = viewPoint(sp.b1);
    const h0 = heightAt(sp.b0);
    const h1 = heightAt(sp.b1);
    const t0 = { x: v0.x, y: v0.y - h0 };
    const t1 = { x: v1.x, y: v1.y - h1 };
    // Local space: x in metres along the panel chord, y in metres downward
    // from the top edge (0 = top).
    const a = (t1.x - t0.x) / sp.len;
    const b = (t1.y - t0.y) / sp.len;
    const d = h0 / BOARD_H_M;
    return {
      key: String(i),
      points: [t0, t1, v1, v0],
      rail: [t0.x, t0.y, t1.x, t1.y],
      mx: [a, b, 0, d, t0.x, t0.y],
      phase: sp.s0 % PERIOD_M,
      fill: FILLS[i % FILLS.length],
    };
  });
}
