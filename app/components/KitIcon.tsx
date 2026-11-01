import { useId } from 'react';
import type { KitColors } from '~/engine/LiveTracker';

interface KitIconProps {
  color?: string;
  kit?: KitColors;
  className?: string;
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const s = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

/** 两色是否肉眼难分（用于决定要不要叠加袖子/条纹） */
function sameColor(a: string, b: string, threshold = 36): boolean {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return a.trim().toLowerCase() === b.trim().toLowerCase();
  return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]) < threshold;
}

/** 浅色底用深色描边/压暗，深色底用浅色提亮 */
function isLight(hex: string): boolean {
  const c = parseHex(hex);
  if (!c) return false;
  return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 > 150;
}

/** 白/黑/灰等中性色。KC[7] 是饱和色时多半是图案或赞助色（如 Leeds 黄），
 *  套到袖子上反而失真，此时袖子保持与身体同色。 */
function isNeutral(hex: string): boolean {
  const c = parseHex(hex);
  if (!c) return true;
  return Math.max(...c) - Math.min(...c) <= 40;
}

/**
 * T-shirt style football jersey icon.
 *
 * 单色模式（没有 KC 数据时）沿用原来的白边效果；
 * 有 KC 时按推断出的用途上色：TC 为身体底色，KC[0] 领口，
 * KC[7] 袖子/饰边，KC[1] 条纹（与底色足够不同才绘制）。
 */
const BODY_PATH = `M8.4 4.2
  Q12 3 15.6 4.2
  L17.2 5.4
  L20.3 6.5
  V10
  L17.5 9.1
  L17.9 21
  Q12 22.1 6.1 21
  L6.5 9.1
  L3.7 10
  V6.5
  L6.8 5.4
  Z`;

export default function KitIcon({ color, kit, className }: KitIconProps) {
  const clipId = useId().replace(/[:]/g, '');
  const body = kit?.body || color || '#fff';
  const light = isLight(body);
  // KI=13：对方平台渲染为左右半色（如 蓝/红 各半），第二色取 KC 中第一个对比色
  const halves = !!kit && kit.design === '13' && !sameColor(kit.alt, body, 48);

  // 浅色球衣用深色压暗，深色球衣用白色提亮，保证袖口/下摆在任何底色上都可见
  const shade = light ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.3)';
  const outline = kit
    ? light
      ? 'rgba(0,0,0,0.35)'
      : 'rgba(255,255,255,0.35)'
    : 'rgba(0,0,0,0.3)';

  const sleeve =
    kit && !halves && !sameColor(kit.secondary, body) && isNeutral(kit.secondary)
      ? kit.secondary
      : null;
  const collar = kit?.collar || 'rgba(255,255,255,0.45)';
  const strip = kit && !halves && !sameColor(kit.pattern, body) ? kit.pattern : null;

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <clipPath id={`kit-body-${clipId}`}>
          <path d="M6.5 9.1 L17.5 9.1 L17.9 21 Q12 22.1 6.1 21 Z" />
        </clipPath>
        <clipPath id={`kit-half-${clipId}`}>
          <rect x="12" y="0" width="12" height="24" />
        </clipPath>
      </defs>

      {/* Main body */}
      <path d={BODY_PATH} fill={body} stroke={outline} strokeWidth="0.5" />

      {/* 左右半色版式：右半用第二主色覆盖 */}
      {halves && (
        <path d={BODY_PATH} fill={kit.alt} clipPath={`url(#kit-half-${clipId})`} />
      )}

      {/* 主图案/条纹（KC[1]），只在和底色明显不同时绘制 */}
      {strip && (
        <g clipPath={`url(#kit-body-${clipId})`} fill={strip} opacity="0.6">
          <rect x="8.55" y="8.5" width="1" height="13.6" />
          <rect x="11.5" y="8.5" width="1" height="13.6" />
          <rect x="14.45" y="8.5" width="1" height="13.6" />
        </g>
      )}

      {/* 袖子（KC[7]） */}
      {sleeve && (
        <>
          <path d="M6.8 5.4 L3.7 6.5 V10 L6.5 9.1 Z" fill={sleeve} />
          <path d="M17.2 5.4 L20.3 6.5 V10 L17.5 9.1 Z" fill={sleeve} />
        </>
      )}

      {/* Sleeve hem bands */}
      <path d="M6.5 8.2 L3.7 9.1 V10 L6.5 9.1 Z" fill={shade} />
      <path d="M17.5 8.2 L20.3 9.1 V10 L17.5 9.1 Z" fill={shade} />

      {/* Bottom hem band */}
      <path
        d="M6.1 20.1
           Q12 21.1 17.9 20.1
           V21
           Q12 22.1 6.1 21
           Z"
        fill={shade}
      />

      {/* Side seams (subtle) */}
      <path
        d="M6.7 9.5 Q6.2 15.2 6.1 20.7"
        fill="none"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="0.5"
      />
      <path
        d="M17.3 9.5 Q17.8 15.2 17.9 20.7"
        fill="none"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="0.5"
      />

      {/* Collar (KC[0]) */}
      <path
        d="M8.4 4.2
           Q12 5.3 15.6 4.2
           L16 4.9
           Q12 6.2 8 4.9
           Z"
        fill={collar}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="0.4"
      />
      {halves && (
        <path
          d="M8.4 4.2
             Q12 5.3 15.6 4.2
             L16 4.9
             Q12 6.2 8 4.9
             Z"
          fill={kit.alt}
          clipPath={`url(#kit-half-${clipId})`}
        />
      )}

      {/* Neck hole */}
      <ellipse cx="12" cy="4.8" rx="2.6" ry="1.1" fill="rgba(0,0,0,0.4)" />
    </svg>
  );
}
