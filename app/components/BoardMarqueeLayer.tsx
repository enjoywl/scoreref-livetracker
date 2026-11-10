import { memo, useEffect, useRef } from 'react';
import {
  BOARD_H_M,
  BRAND,
  FONT_M,
  PERIOD_M,
  SPEED_MPS,
  WORD_W,
  buildPanels,
} from '~/data/pitchBoards';

/**
 * LED 跑马灯放在 HTML 层而不是 SVG overlay 里：Chrome 不会把 SVG 的 CSS
 * transform 动画提升到合成器，原来 38 块面板每帧都要把整块 overlay 重新
 * 光栅化。HTML 合成层由 JS 以 20fps 直接写 translateX，浏览器只在真的更新
 * 时产帧；实测同一观感下 GPU 进程 CPU 从约 23% 降到约 5%，主线程约 0.007s/s。
 *
 * 几何全部用百分比表达（viewBox 322×182 等比映射到 field-wrap），窗口缩放
 * / 手机横竖屏不需要重建或重算；每个面板的仿射矩阵仍来自 buildPanels()，
 * 和 SVG 版完全一致。
 */
const MARQUEE_FPS = 20;

const TILE =
  'url("data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PERIOD_M} ${BOARD_H_M}">` +
      `<text x="0" y="${(BOARD_H_M / 2 + FONT_M * 0.35).toFixed(4)}" textLength="${WORD_W.toFixed(4)}" lengthAdjust="spacingAndGlyphs" fill="${BRAND}" fill-opacity="0.95" font-family="Arial, Helvetica Neue, sans-serif" font-size="${FONT_M.toFixed(4)}" font-weight="700">ScoreRef</text>` +
      `</svg>`,
  ) +
  '")';

const VB_W = 322;
const VB_H = 182;

/**
 * 侧边广告栏沿边线后退，透视会把水平文字压成 50° 以上的斜条：字形竖直向上
 * 扣在板面上（透视正确），但整个词是 53° 的粗斜体，字宽又只剩几像素。
 * 这里对斜率特别大的面板把剪切矩阵向“旋转”方向混合一小段：
 *   τ=0 是原来的透视剪切（字形竖直、斜体 53°），τ=1 是纯旋转（字形正对
 *   基线，看起来像贴在画面上的贴纸）。
 * 取中间值，字形仍然朝板面竖直线倾斜、保留侧面后退的透视感，但斜体角度
 * 明显减小；同时按 1/q 拉宽条带、按 1/|Y| 拉高，把字宽/字高补回来。
 * 锚点取文字基线，保证各面板的跑马灯相位在基线上严格连续。
 * 远端/弯角面板斜率小，τ=0，保持原透视剪切。
 */
const BILLBOARD_MIN_K = 1.1;
const BILLBOARD_BLEND = 0.5;

interface MarqueePanel {
  key: string;
  left: string;
  top: string;
  width: string;
  height: string;
  clip: string;
  holderLeft: string;
  holderTop: string;
  transform: string;
  stripWidth: string;
  stripHeight: string;
  phase: number;
  initialShift: string;
}

const pct = (v: number) => `${v.toFixed(3)}%`;

/** 把 viewBox 几何换算成面板自己的百分比坐标系；每个面板的裁剪框收缩到
 *  quad 的外接矩形，避免整块球场大小的 38 个裁剪层（实测那样反而更慢）。 */
function buildMarqueePanels(): MarqueePanel[] {
  return buildPanels().map((p) => {
    const xs = p.points.map((q) => q.x);
    const ys = p.points.map((q) => q.y);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const w = Math.max(...xs) - x0;
    const h = Math.max(...ys) - y0;
    const [a, b, , d] = p.mx;
    const k = b / a;
    const stripH = BOARD_H_M * d;
    const billboard = Math.abs(k) > BILLBOARD_MIN_K;
    // 剪切（X=(1,k)、Y=(0,1)）和旋转（X=(cosθ,sinθ)、Y=(-sinθ,cosθ)）
    // 按 τ 混合：X = q·(1,k)，Y = (-τ·sinθ, q)，q = 1-τ+τ·cosθ。
    // 基线方向始终是 (1,k)，所以世界坐标里的周期仍是 PERIOD_M。
    const theta = Math.atan(k);
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const tau = billboard ? BILLBOARD_BLEND : 0;
    const q = 1 - tau + tau * cosT;
    const yx = -tau * sinT;
    const yy = q;
    const ylen = Math.hypot(yx, yy);
    // 字形 height 方向缩短了 |Y|，条带相应拉高，屏幕字高保持不变。
    const stripH2 = stripH / (billboard ? ylen : 1);
    // 以「文字基线行」为锚点：基线行在条带里的高度与 TILE 中的文字一致，
    // 这样平移后各面板的相位在基线上严格连续，字不会被拉歪或错位。
    const baseY = stripH2 * ((BOARD_H_M / 2 + FONT_M * 0.35) / BOARD_H_M);
    const tdx = -yx * baseY;
    const tdy = baseY - yy * baseY;
    return {
      key: p.key,
      left: pct((x0 / VB_W) * 100),
      top: pct((y0 / VB_H) * 100),
      width: pct((w / VB_W) * 100),
      height: pct((h / VB_H) * 100),
      // 百分比 clip-path 相对面板自身的外接矩形，所以再按 w/h 归一化。
      clip: `polygon(${p.points
        .map((q) => `${pct(((q.x - x0) / w) * 100)} ${pct(((q.y - y0) / h) * 100)}`)
        .join(', ')})`,
      holderLeft: pct(((p.mx[4] - x0) / w) * 100),
      holderTop: pct(((p.mx[5] - y0) / h) * 100),
      transform: billboard
        ? `translate(${pct((tdx / w) * 100)}, ${pct((tdy / h) * 100)}) matrix(${q.toFixed(5)}, ${(q * k).toFixed(5)}, ${yx.toFixed(5)}, ${yy.toFixed(5)}, 0, 0)`
        : `matrix(1, ${k.toFixed(4)}, 0, 1, 0, 0)`,
      // 两格文字：一个周期 = 条带宽度的一半；X 轴缩短了 q 倍，条带按 1/q 拉宽，
      // 屏幕上的字宽和线速度不变。
      stripWidth: pct(((2 * PERIOD_M * a * 100) / w) / q),
      stripHeight: pct((stripH2 * 100) / h),
      phase: p.phase,
      initialShift: pct(-(p.phase / PERIOD_M) * 50),
    };
  });
}

const PANELS = buildMarqueePanels();

interface BoardMarqueeLayerProps {
  /** 半场/终场统计遮罩打开时停表：遮罩把球场整体虚化，跑马灯看不见。 */
  paused: boolean;
}

const BoardMarqueeLayer = memo(function BoardMarqueeLayer({ paused }: BoardMarqueeLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;
    const layer = layerRef.current;
    if (!layer) return;
    const strips = Array.from(layer.querySelectorAll<HTMLElement>('.board-marquee-strip'));
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer = 0;

    const tick = () => {
      if (document.hidden) return;
      const t = performance.now() / 1000;
      for (let i = 0; i < strips.length; i++) {
        // 一个周期 = 条带宽度的 50%（条带里放了两格文字）。条带按 1/cos 拉宽
        // 只抵消旋转压缩，世界坐标里仍是 PERIOD_M，所以相位不分面板。
        const p = ((t * SPEED_MPS + PANELS[i].phase) / PERIOD_M) % 1;
        strips[i].style.transform = `translateX(${(-p * 50).toFixed(3)}%)`;
      }
    };
    const start = () => {
      if (timer) return;
      tick();
      timer = window.setInterval(tick, 1000 / MARQUEE_FPS);
    };
    const stop = () => {
      if (!timer) return;
      window.clearInterval(timer);
      timer = 0;
    };
    const sync = () => (mq.matches ? stop() : start());

    sync();
    mq.addEventListener('change', sync);
    return () => {
      stop();
      mq.removeEventListener('change', sync);
    };
  }, [paused]);

  return (
    <div className="board-marquee-layer" ref={layerRef} aria-hidden="true">
      {PANELS.map((p) => (
        <div
          key={p.key}
          className="board-marquee-panel"
          style={{
            left: p.left,
            top: p.top,
            width: p.width,
            height: p.height,
            clipPath: p.clip,
          }}
        >
          <div
            className="board-marquee-holder"
            style={{
              left: p.holderLeft,
              top: p.holderTop,
              transform: p.transform,
            }}
          >
            <div
              className="board-marquee-strip"
              style={{
                width: p.stripWidth,
                height: p.stripHeight,
                backgroundImage: TILE,
                transform: `translateX(${p.initialShift})`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

export default BoardMarqueeLayer;
