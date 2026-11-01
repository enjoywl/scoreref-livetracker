import { useRef, useState, useEffect, useLayoutEffect, useMemo, type CSSProperties } from 'react';
import { LiveTracker, type MatchState, type TooltipData } from '~/engine/LiveTracker';
import { innerToPercent } from '~/data/coords';
import { FAN_COLORS, FAN_WAVE_COLORS, THROW_FAN_COLOR } from '~/data/fanColors';
import BoardMarqueeLayer from './BoardMarqueeLayer';
import BreakStatsOverlay from './BreakStatsOverlay';
import EntityImage from './EntityImage';
import FieldScoreboard from './FieldScoreboard';
import PitchBoards, { PitchCornerFlags } from './PitchBoards';

interface FieldViewProps {
  tracker: LiveTracker;
  state: MatchState;
}

type Side = 'home' | 'away' | 'neutral';

/** Result close-up art shown above the centred tooltip. */
const CLOSEUP_ART = {
  shot_on: { src: '/resource/shot_in.svg', alt: '射正' },
  shot_off: { src: '/resource/shot_out.svg', alt: '射偏' },
  penalty: { src: '/resource/penalty.svg', alt: '点球' },
  penalty_goal: { src: '/resource/penalty_goal.svg', alt: '点球命中' },
  penalty_miss: { src: '/resource/penalty_miss.svg', alt: '点球射失' },
  penalty_period: { src: '/resource/penalty_period.svg', alt: '点球大战' },
  yellow_card: { src: '/resource/yellow_card.svg', alt: '黄牌' },
  red_card: { src: '/resource/red_card.svg', alt: '红牌' },
  injury: { src: '/resource/injury.svg', alt: '伤病' },
  var: { src: '/resource/var.svg', alt: 'VAR' },
  substitution: { src: '/resource/substition.svg', alt: '换人' },
} as const;
type DisplayTooltip = TooltipData & { side: Side };

/** Event labels sometimes carry a "Home "/"Away " prefix; the team row already
 *  shows it, so strip the prefix from the event line. */
function stripSidePrefix(text: string): string {
  return text.replace(/^(Home|Away)\s+/i, '');
}

export default function FieldView({ tracker, state }: FieldViewProps) {
  const refs = useRef<Record<string, SVGElement | null>>({});
  const tipRef = useRef<HTMLDivElement>(null);
  // Measured half-width of the anchored card as a % of the pitch stage, used to
  // keep a centred-above card inside the stage at the near-side corners.
  const [tipHalfPct, setTipHalfPct] = useState(0);

  // Register refs with tracker on mount
  useEffect(() => {
    tracker.setRefs(refs.current);
  }, [tracker]);

  // Re-apply imperative SVG state after React re-renders (before paint)
  useLayoutEffect(() => {
    if (tracker._applyAnimations) tracker._applyAnimations();
  });

  // 每次渲染都新建 ref 回调会让 React 把全部 SVG 节点 detach/attach 一遍；
  // 按名字缓存成稳定函数后，重渲染（每秒走表/每个事件）不再有这批无谓的 DOM 操作。
  const setRef = useMemo(() => {
    const cache = new Map<string, (el: SVGElement | null) => void>();
    return (name: string) => {
      let fn = cache.get(name);
      if (!fn) {
        fn = (el: SVGElement | null) => { if (el) refs.current[name] = el; };
        cache.set(name, fn);
      }
      return fn;
    };
  }, []);

  // 页面切到后台时暂停纯装饰的循环动画（LED 跑马灯、皮球旋转/阴影）。
  // 浏览器对隐藏页仍可能继续推进这些动画，显式暂停可以省 GPU 与电量；
  // 回到前台自动恢复，画面上没有可见差异。
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => root.classList.toggle('page-hidden', document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      root.classList.remove('page-hidden');
    };
  }, []);

  // Tooltip data
  let tooltip: DisplayTooltip | null = null;
  if (state.activeTooltip) {
    const tt = state.activeTooltip;
    const side: Side = tt.team === 'home' || tt.team === 'away' ? tt.team : 'neutral';
    tooltip = {
      ...tt,
      text: stripSidePrefix(tt.text || ''),
      // 点球大战的 PG 是各轮比分，不是球员名，卡片里不显示
      player: LiveTracker._parseShootoutPG(tt.player || '') ? '' : tt.player,
      team: side === 'home' ? (tracker.team1 || 'Home') : side === 'away' ? (tracker.team2 || 'Away') : '',
      // 点球大战不显示比赛时间
      minute: state.shootout ? '' : tt.minute,
      side,
    };
  } else if (state.currentVC && !state.xyPending) {
    // 定位球/进攻/控球等待迟到的 XY 时球点未定，不显示居中的兜底卡片，等动画按真实球点播放
    const vc = state.currentVC;
    const side: Side =
      vc.info.team === 'home' || vc.info.team === 'away'
        ? vc.info.team
        : vc.team === 'home' || vc.team === 'away'
          ? vc.team
          : 'neutral';
    const rawPg = state.currentPG || vc.pg || '';
    tooltip = {
      x: 0, y: 0,
      icon: vc.info.icon || '',
      text: stripSidePrefix(vc.info.en),
      // 点球大战的 PG 是各轮比分，不是球员名，卡片里不显示
      player: LiveTracker._parseShootoutPG(rawPg) ? '' : rawPg,
      team: side === 'home' ? (tracker.team1 || 'Home') : side === 'away' ? (tracker.team2 || 'Away') : '',
      minute: state.shootout
        ? ''
        : LiveTracker.isMotionEvent(vc.vc)
          ? ''
          : `${vc.tm || tracker.matchMinute}'`,
      side,
    };
  }

  // Normally pinned to the pitch center (see .html-tooltip in app.css); free
  // kicks and goal kicks anchor the card to their ball point instead, centred
  // directly above it. The card is kept inside the stage horizontally: points
  // near the touchlines sit close to 0%/100% of the pitch width, so a strictly
  // centred card would hang off the edge.
  const anchor =
    tooltip && state.activeTooltip?.anchorToPos ? innerToPercent(tooltip.x, tooltip.y) : null;

  // Measure the rendered card so the clamp below uses its real width.
  useLayoutEffect(() => {
    const el = tipRef.current;
    if (!el) return;
    const stageW = (el.offsetParent as HTMLElement | null)?.clientWidth || 0;
    if (!stageW) return;
    const next = (el.offsetWidth / 2 / stageW) * 100;
    setTipHalfPct((prev) => (Math.abs(prev - next) > 0.05 ? next : prev));
  });

  const clampedLeftPct = anchor
    ? Math.min(100 - tipHalfPct, Math.max(tipHalfPct, anchor.px))
    : 0;
  const anchoredStyle: CSSProperties | undefined = anchor
    ? state.activeTooltip?.centerAbove
      ? {
          left: `${clampedLeftPct}%`,
          top: `${anchor.py}%`,
          transform: 'translate(-50%, calc(-100% - 0.5em))',
        }
      : {
          left: `${anchor.px}%`,
          top: `${anchor.py}%`,
          transform: `translate(${anchor.px < 50 ? '0.5em' : 'calc(-100% - 0.5em)'}, calc(-100% - 0.5em))`,
        }
    : undefined;
  // Static result close-up (射正/射偏/点球命中/射失).
  const closeupArt = state.closeupArt;
  // Penalty shootout rounds: green tick = scored, red cross = missed.
  // 每轮 5 球；未罚的位置显示空圆，超过 5 球换行继续按 5 球排列。
  const shootout = state.shootout;
  const shootoutRowCount = shootout
    ? Math.max(1, Math.ceil(shootout.home.length / 5), Math.ceil(shootout.away.length / 5))
    : 0;
  const shootoutGoals = (marks: string[]) => marks.filter((m) => m === '1').length;
  const renderShootoutRounds = (marks: string[]) => {
    const rows: Array<Array<string | null>> = [];
    for (let r = 0; r < shootoutRowCount; r++) {
      const row: Array<string | null> = [];
      for (let c = 0; c < 5; c++) row.push(marks[r * 5 + c] ?? null);
      rows.push(row);
    }
    return rows.map((row, ri) => (
      <div className="shootout-row" key={ri}>
        {row.map((mark, i) => (
          <span
            key={i}
            className={
              'shootout-mark' +
              (mark === '1' ? ' is-goal' : mark === '0' ? ' is-miss' : ' is-empty')
            }
            aria-label={mark === '1' ? '得分' : mark === '0' ? '射失' : '未罚'}
          >
            {mark === '1' ? '✓' : mark === '0' ? '✕' : ''}
          </span>
        ))}
      </div>
    ));
  };
  // 进球卡片停在中底端, 避免压住球门前的进球动画; seek 回放走 currentVC 兜底路径时同样适用.
  const dockBottom =
    !!tooltip &&
    (state.activeTooltip ? state.activeTooltip.dockBottom === true : state.currentVC?.info.cat === 'GOAL');

  return (
    <div className="field-scene">
      {/* 半场/全场/加时中场统计遮罩打开时，球场与场上动画整体虚化，突出统计卡片 */}
      <div className={'field-wrap' + (state.breakStats ? ' is-break' : '')}>
        <img src="/resource/pitch_v4.svg" alt="pitch" className="pitch-img" draggable={false} />

        {/* 广告栏拆成三层，从下到上：静态板面 SVG → HTML 跑马灯合成层 → 球员/
            皮球/特效 SVG。这样跑马灯重绘时不再拖着整块 overlay 一起光栅化。 */}
        <svg className="overlay boards-overlay" viewBox="0 0 322 182" xmlns="http://www.w3.org/2000/svg">
          <PitchBoards />
        </svg>
        <BoardMarqueeLayer paused={!!state.breakStats} />

        <svg className="overlay" viewBox="0 0 322 182" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="ballGlowH" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <stop offset="30%" stopColor="#fff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ballGlowA" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffd43b" stopOpacity="1" />
              <stop offset="30%" stopColor="#ffd43b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffd43b" stopOpacity="0" />
            </radialGradient>
            {/* Zone gradients: defensive edge (0.1) → sawtooth edge (0.4) — yellow for attack, red for DA */}
            <linearGradient id="zgHome" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#ffd43b" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffd43b" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="zgAway" x1="1" x2="0" y1="0" y2="0">
              <stop offset="0%" stopColor="#ffd43b" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffd43b" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="zgDAH" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#dc3c3c" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#dc3c3c" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="zgDAA" x1="1" x2="0" y1="0" y2="0">
              <stop offset="0%" stopColor="#dc3c3c" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#dc3c3c" stopOpacity="0.6" />
            </linearGradient>
            {/* Wave gradients: uniform 0.4 opacity — yellow for attack, red for DA */}
            <linearGradient id="wgHome" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#ffd43b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffd43b" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="wgAway" x1="1" x2="0" y1="0" y2="0">
              <stop offset="0%" stopColor="#ffd43b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffd43b" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="wgDAH" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#dc3c3c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#dc3c3c" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="wgDAA" x1="1" x2="0" y1="0" y2="0">
              <stop offset="0%" stopColor="#dc3c3c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#dc3c3c" stopOpacity="0.4" />
            </linearGradient>
            {/* Possession half-field overlay: goal line → center, gray gradient */}
            <linearGradient id="posHalfH" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="posHalfA" x1="1" x2="0" y1="0" y2="0">
              <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.6" />
            </linearGradient>
            <radialGradient id="fbBody" cx=".4" cy=".3" r=".8">
              <stop offset="0" stopColor="#fff" />
              <stop offset=".4" stopColor="#fff" />
              <stop offset=".8" stopColor="#EEE" />
            </radialGradient>
            <radialGradient id="fbShade" cx=".5" cy=".5" r=".5">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset=".8" stopColor="#fff" stopOpacity="0" />
              <stop offset=".99" stopOpacity=".3" />
              <stop offset="1" />
            </radialGradient>
            {/* Throw-in dot subtle glow */}
            <radialGradient ref={setRef('throwDotGlowGrad')} id="throwDotGlow" cx="0" cy="0" r="10" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffd700" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
            </radialGradient>
            {/* Corner fan: radiating sector from the flag, centred on the penalty
                spot (spot = midpoint of the outer arc); transparent at the apex,
                brighter at the arc. Colour is set per event by the engine. */}
            <radialGradient ref={setRef('cornerFanGrad')} id="cornerFanGrad" cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={FAN_COLORS.gray} stopOpacity="0.14" />
              <stop offset="55%" stopColor={FAN_COLORS.gray} stopOpacity="0.36" />
              <stop offset="100%" stopColor={FAN_COLORS.gray} stopOpacity="0.75" />
            </radialGradient>
            {/* Free kick corridor: apex (ball) → goal, fading outward. 直接任意球红 / 间接任意球黄 */}
            <linearGradient ref={setRef('fkGradDirect')} id="fkGradDirect" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={FAN_COLORS.red} stopOpacity="0.6" />
              <stop offset="100%" stopColor={FAN_COLORS.red} stopOpacity="0.15" />
            </linearGradient>
            <linearGradient ref={setRef('fkGradSimple')} id="fkGradSimple" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={FAN_COLORS.yellow} stopOpacity="0.55" />
              <stop offset="100%" stopColor={FAN_COLORS.yellow} stopOpacity="0.15" />
            </linearGradient>
            {/* 球门球走廊: 与角球扇形同色(灰) */}
            <linearGradient ref={setRef('gkGradSimple')} id="gkGradSimple" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={FAN_COLORS.gray} stopOpacity="0.65" />
              <stop offset="100%" stopColor={FAN_COLORS.gray} stopOpacity="0.24" />
            </linearGradient>
            {/* 界外球扇形: 浅绿色, 与球门球/角球的灰色区分 */}
            <linearGradient ref={setRef('throwGradSimple')} id="throwGradSimple" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={THROW_FAN_COLOR} stopOpacity="0.65" />
              <stop offset="100%" stopColor={THROW_FAN_COLOR} stopOpacity="0.24" />
            </linearGradient>
            <clipPath id="fbClip"><circle r="100" /></clipPath>
            <g id="fbPatternRaw" strokeLinejoin="round">
              <path d="M6-32q20 4 40 13 11-16 18-28-14-21-27-29-20 1-36 8 3 17 5 36M-26-2q-19-6-36-9-12 16-14 33 7 18 26 32 18-7 33-15-6-24-9-41m-69 24q-7-10-7-30v88h17q-10-35-10-58m150 2Q41 41 24 52q4 13 7 27 24-1 37-12 10-17 12-32-15-7-25-11M0 120l-3-25q-22-2-39-13-8 2-18-1M-90-48q10-4 22-1 16-22 33-28 0-23-5-23h-60m200 45L87-37Q98-10 97 5l3 1" />
              <path fill="none" d="M6-32Q-18-12-26-2m72-17q8 24 9 43m9-71q13 3 23 10M37-76q2-14-1-24M1-68q-14-9-36-9m-27 66q-5-14-6-38m-8 71q-9 2-19 0m45 32q1 16 8 28m25-43q17 9 41 13m7 27Q20 92-3 95m71-28 12 13m0-45Q90 25 97 5" />
            </g>
            <g id="fbPattern" clipPath="url(#fbClip)">
              <use href="#fbPatternRaw" />
            </g>
            <g id="footballIcon">
              <circle r="100" fill="#fff" />
              <circle r="100" fill="url(#fbBody)" />
              <use href="#fbPattern" stroke="#EEE" strokeWidth="7" />
              <use href="#fbPattern" stroke="#DDD" strokeWidth="4" />
              <use href="#fbPattern" stroke="#999" strokeWidth="2" />
              <use href="#fbPattern" stroke="#000" />
              <circle r="100" fill="url(#fbShade)" />
            </g>
            {/* Goal close-up: vector scene centred on the pitch (no card chrome) */}
            <radialGradient id="goalCamGlowGrad">
              <stop ref={setRef('goalCamGlowStop0')} offset="0%" stopColor="#fff" stopOpacity="0.9" />
              <stop ref={setRef('goalCamGlowStop1')} offset="55%" stopColor="#fff" stopOpacity="0.45" />
              <stop ref={setRef('goalCamGlowStop2')} offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="goalCamFlashGrad">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.7" />
              <stop offset="45%" stopColor="#fff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="goalCamShadowGrad">
              <stop offset="0%" stopColor="#000" stopOpacity="0.38" />
              <stop offset="60%" stopColor="#000" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="goalCamPost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#f2f7fb" />
              <stop offset="100%" stopColor="#c6d2dc" />
            </linearGradient>
            <filter id="goalCamTextGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="1.47" />
            </filter>
          </defs>

          {/* 角旗在广告栏前方：跑马灯是 HTML 层，角旗留在上面的 SVG 里才会
              盖住经过的文字。 */}
          <PitchCornerFlags />

          <g transform="matrix(0.2868546541,0,0,0.2868546541,0,0)">
            {/* Possession tints — trapezoid matching field shape */}
            <polygon ref={setRef('homeTint')} points="231.76,252.28 42.95,537.83 558.53,538.04 560.94,251.62" fill="#fff" opacity="0" />
            <polygon ref={setRef('awayTint')} points="560.94,251.62 558.53,538.04 1078.65,538.26 891.96,250.95" fill="#ffd43b" opacity="0" />

            {/* Possession half-field overlay — gray gradient on own half */}
            <polygon ref={setRef('posHalf')} points="" fill="none" stroke="none" opacity="0" />

            {/* Offside: opponent penalty area shaded between the dashed line and the goal line */}
            <polygon ref={setRef('offsideZone')} points="" fill="#4b5563" opacity="0" />

            {/* Attack zone — rendered from React state */}
            <polygon
              ref={setRef('attackZone')}
              points={state.zoneAnim?.points}
              fill={state.zoneAnim?.fill}
              stroke={state.zoneAnim?.stroke}
              strokeWidth={state.zoneAnim?.strokeWidth}
              opacity={state.zoneAnim?.opacity ?? 0}
            />

            {/* Attack wave — animated sawtooth extension forward */}
            <polygon ref={setRef('attackWave')} points="" fill="rgba(255,255,255,0)" opacity="0" />

            {/* Ball trail — white thin lines + joint dots */}
            <g ref={setRef('ballTrail')} opacity="0">
              <line ref={setRef('trailLine0')} x1="0" y1="0" x2="0" y2="0" stroke="white" strokeWidth="0.5" strokeLinecap="round" opacity="0" />
              <line ref={setRef('trailLine1')} x1="0" y1="0" x2="0" y2="0" stroke="white" strokeWidth="0.5" strokeLinecap="round" opacity="0" />
              <line ref={setRef('trailLine2')} x1="0" y1="0" x2="0" y2="0" stroke="white" strokeWidth="0.5" strokeLinecap="round" opacity="0" />
              <circle ref={setRef('trailDot0')} cx="0" cy="0" r="2.2" fill="#fff" opacity="0" />
              <circle ref={setRef('trailDot1')} cx="0" cy="0" r="2.2" fill="#fff" opacity="0" />
              <circle ref={setRef('trailDot2')} cx="0" cy="0" r="2.2" fill="#fff" opacity="0" />
              <circle ref={setRef('trailDot3')} cx="0" cy="0" r="2.2" fill="#fff" opacity="0" />
            </g>

            {/* Ball */}
            <g className="ball-group" ref={setRef('ballGroup')} opacity="0">
              <g className="shadow-pulse">
                <ellipse cx="0" cy="10" rx="12" ry="4.5" fill="#000" fillOpacity="0.35" />
              </g>
              <g className="shadow-pulse2">
                <ellipse cx="0" cy="7" rx="7" ry="2.5" fill="#000" fillOpacity="0.25" />
              </g>
              <g className="ball-spin">
                <circle ref={setRef('ballGlow')} cx="0" cy="0" r="24" fill="url(#ballGlowH)" opacity="0" />
                <use href="#footballIcon" transform="scale(0.055)" />
              </g>
            </g>


            {/* Event animations */}
            {/* Goal: field FX fallback; normally replaced by the centred close-up */}
            <g data-role="goal-field-fx">
              <path ref={setRef('goalTrail')} d="" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0" />
              <circle ref={setRef('goalBall')} cx="0" cy="0" r="5" fill="#fff" stroke="#fff" strokeWidth="1.5" opacity="0" />
              <line ref={setRef('goalLineFlash')} x1="0" y1="0" x2="0" y2="0" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0" />
              <circle ref={setRef('goalImpact')} cx="0" cy="0" r="0" fill="none" stroke="#fff" strokeWidth="3" opacity="0" />
              <circle ref={setRef('goalRing1')} cx="0" cy="0" r="0" fill="none" stroke="#fff" strokeWidth="3" opacity="0" />
              <circle ref={setRef('goalRing2')} cx="0" cy="0" r="0" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0" />
              <line ref={setRef('goalSpeed0')} x1="0" y1="0" x2="0" y2="0" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0" />
              <line ref={setRef('goalSpeed1')} x1="0" y1="0" x2="0" y2="0" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0" />
              <line ref={setRef('goalSpeed2')} x1="0" y1="0" x2="0" y2="0" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0" />
              <line ref={setRef('goalSpeed3')} x1="0" y1="0" x2="0" y2="0" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0" />
              <line ref={setRef('goalSpeed4')} x1="0" y1="0" x2="0" y2="0" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0" />
            </g>
            <g ref={setRef('cardAnim')} opacity="0">
              <rect ref={setRef('cardRect')} x="0" y="0" width="28" height="38" rx="3" fill="#ffeb3b" />
            </g>

            {/* Free kick: perspective corridor to goal + traveling wave band (fill switched by engine).
                Normal free kicks end on an outward-bulging arc; direct ones stay triangular. */}
            <path ref={setRef('fkCorridor')} d="" fill="url(#fkGradDirect)" stroke="none" opacity="0" />
            <path ref={setRef('fkWave')} d="" fill={FAN_WAVE_COLORS.red} stroke="none" opacity="0" />

            {/* Corner: fan-shaped radiating area from the flag towards the zone
                between the penalty spot and the goal line (arc on the outer edge). */}
            <path ref={setRef('cornerFan')} className="corner-fan" d="" fill="url(#cornerFanGrad)" stroke="none" opacity="0" />
            {/* Radiating pulse: a band inside the fan travelling from the flag outward */}
            <path ref={setRef('cornerFanWave')} className="corner-fan-wave" d="" fill={FAN_WAVE_COLORS.gray} stroke="none" opacity="0" />

            {/* Set-piece dot */}
            <circle ref={setRef('throwDot')} cx="0" cy="0" r="0" fill="#ffd700" opacity="0" />
            <circle ref={setRef('throwDotGlow')} cx="0" cy="0" r="0" fill="url(#throwDotGlow)" opacity="0" />

            {/* Full-field flash */}
            <rect ref={setRef('flashRect')} x="125" y="312" width="875" height="214" fill="#fff" opacity="0" />

            {/* Generic event ring (attack / DA / penalty / free kick / corner / goal kick) */}
            <circle ref={setRef('eventRing')} cx="0" cy="0" r="0" fill="none" stroke="#fff" strokeWidth="3" opacity="0" />

            {/* Offside line: dashed, along the opponent penalty area edge */}
            <line ref={setRef('offsideLine')} x1="0" y1="0" x2="0" y2="0" stroke="#ffeb3b" strokeWidth="3" strokeDasharray="7,4" strokeLinecap="round" opacity="0" />

          </g>

          {/*
            Goal close-up — a vector goal scene centred on the pitch, without any
            card/panel chrome. The engine mirrors only the goal + ball group for
            away goals; the team name and GOAL explosion stay upright.
          */}
          {/* Shot/penalty results use the dedicated illustration below, so the
              drawn goal scene is hidden while one is on screen. */}
          <g
            ref={setRef('goalCam')}
            data-role="goal-cam"
            opacity="0"
            style={closeupArt ? { visibility: 'hidden' } : undefined}
          >
            {/* ~0.373× anchored on the pitch's midfield spot: the goal line
                (local y=104) sits on the drawn centre point (160.639,104.162). */}
            <g transform="translate(123.31,65.34) scale(0.3733)">
              <g ref={setRef('goalCamPop')}>
                <g ref={setRef('goalCamScene')} data-role="goal-cam-scene">
                  {/* turf shadow + only a very light neutral tint inside the
                      goal mouth; the pitch stays visible through the net */}
                  <ellipse cx="100" cy="105" rx="84" ry="11" fill="url(#goalCamShadowGrad)" />
                  <polygon points="36,52 164,52 164,104 36,104" fill="#12181d" opacity="0.12" />

                  {/* back net — rebuilt every frame so it can bulge on impact.
                      Its frame is smaller than the mouth and centred, so none of
                      the mesh spills outside the goal posts. */}
                  <path
                    ref={setRef('goalCamNetPath')}
                    data-role="goal-cam-net"
                    fill="none"
                    stroke="#eaf7ff"
                    strokeWidth="0.34"
                    strokeOpacity="0.42"
                    strokeLinecap="round"
                  />

                  {/* Static back net for the shot close-up (the goal animation
                      rebuilds its own mesh every frame, so this only renders
                      while a shot is on screen). */}
                  {(closeupArt === 'shot_on' || closeupArt === 'shot_off') && (
                    <g data-role="shot-cam-net" fill="none" stroke="#eaf7ff" strokeWidth="0.3" strokeOpacity="0.3">
                      {Array.from({ length: 19 }, (_, i) => {
                        const x = 53 + 104 * (i / 18);
                        return <path key={`shotNetV${i}`} d={`M${x.toFixed(2)},44 V88`} />;
                      })}
                      {Array.from({ length: 15 }, (_, i) => {
                        const y = 44 + 44 * (i / 14);
                        return <path key={`shotNetH${i}`} d={`M53,${y.toFixed(2)} H157`} />;
                      })}
                    </g>
                  )}

                  {/* rear frame: shifted right so the left side net opens up,
                      giving the close-up a slight right-of-centre camera view */}
                  <path d="M53,88 V44 H157 V88" fill="none" stroke="#e9f3fb" strokeWidth="0.7" strokeOpacity="0.2" strokeLinecap="round" strokeLinejoin="round" />

                  {/* side frame: front top/bottom corners → rear corners.
                      Together with the front and rear posts these depth bars
                      close the goal's side profile into a trapezoid. */}
                  <g fill="none" stroke="#dfeef9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M36,52 L53,44" strokeWidth="1.2" strokeOpacity="0.55" />
                    <path d="M36,104 L53,88" strokeWidth="1.2" strokeOpacity="0.42" />
                    <path d="M164,52 L157,44" strokeWidth="1" strokeOpacity="0.45" />
                    <path d="M164,104 L157,88" strokeWidth="1" strokeOpacity="0.34" />
                    {/* rear uprights of the side panels, slightly stronger than
                        the rear frame so each side reads as a complete trapezoid */}
                    <path d="M53,44 V88" strokeWidth="1" strokeOpacity="0.45" />
                    <path d="M157,44 V88" strokeWidth="1" strokeOpacity="0.38" />
                  </g>

                  {/* roof net, in perspective */}
                  <g fill="none" stroke="#eaf7ff" strokeWidth="0.3" strokeOpacity="0.28">
                    {Array.from({ length: 10 }, (_, i) => {
                      const d = i / 9;
                      const y = 52 - 8 * d;
                      return (
                        <path key={`roofW${i}`} d={`M${(36 + 17 * d).toFixed(2)},${y.toFixed(2)} L${(164 - 7 * d).toFixed(2)},${y.toFixed(2)}`} />
                      );
                    })}
                    {Array.from({ length: 17 }, (_, i) => {
                      const w = i / 16;
                      return (
                        <path key={`roofD${i}`} d={`M${(36 + 128 * w).toFixed(2)},52 L${(53 + 104 * w).toFixed(2)},44`} />
                      );
                    })}
                  </g>

                  {/* side nets, including depth lines */}
                  <g fill="none" stroke="#eaf7ff" strokeWidth="0.3" strokeOpacity="0.24">
                    {Array.from({ length: 13 }, (_, i) => {
                      const h = i / 12;
                      return (
                        <path key={`leftD${i}`} d={`M36,${(52 + 52 * h).toFixed(2)} L53,${(44 + 44 * h).toFixed(2)}`} />
                      );
                    })}
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = i / 6;
                      const x = (36 + 17 * d).toFixed(2);
                      return (
                        <path key={`leftV${i}`} d={`M${x},${(52 - 8 * d).toFixed(2)} L${x},${(104 - 16 * d).toFixed(2)}`} />
                      );
                    })}
                    {Array.from({ length: 13 }, (_, i) => {
                      const h = i / 12;
                      return (
                        <path key={`rightD${i}`} d={`M164,${(52 + 52 * h).toFixed(2)} L157,${(44 + 44 * h).toFixed(2)}`} />
                      );
                    })}
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = i / 6;
                      const x = (164 - 7 * d).toFixed(2);
                      return (
                        <path key={`rightV${i}`} d={`M${x},${(52 - 8 * d).toFixed(2)} L${x},${(104 - 16 * d).toFixed(2)}`} />
                      );
                    })}
                  </g>

                  {/* flight path (geometry only), motion trail, ghosts and the
                      spinning ball; drawn before the front frame so the ball
                      reads as inside the goal */}
                  <path ref={setRef('goalCamArc')} d="M12,116 Q50,50 100,66" fill="none" stroke="none" />
                  <path
                    ref={setRef('goalCamTrail')}
                    data-role="goal-cam-trail"
                    d=""
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    opacity="0"
                  />
                  <circle ref={setRef('goalCamGhost0')} cx="0" cy="0" r="4.2" fill="#fff" opacity="0" />
                  <circle ref={setRef('goalCamGhost1')} cx="0" cy="0" r="3.4" fill="#fff" opacity="0" />
                  <circle ref={setRef('goalCamGhost2')} cx="0" cy="0" r="2.7" fill="#fff" opacity="0" />
                  <g ref={setRef('goalCamBall')} data-role="goal-cam-ball" opacity="0">
                    {/* The panel pattern scrolls vertically inside a fixed ball
                        silhouette, so the close-up ball reads as rolling rather
                        than spinning flat in the screen plane. */}
                    <g transform="scale(0.052)">
                      <circle r="100" fill="#fff" />
                      <circle r="100" fill="url(#fbBody)" />
                      <g clipPath="url(#fbClip)">
                        <g ref={setRef('goalCamBallTex')} data-role="goal-cam-ball-tex">
                          {[-200, 0, 200].map((y) => (
                            <g key={y} transform={`translate(0,${y})`}>
                              <use href="#fbPatternRaw" stroke="#EEE" strokeWidth="7" />
                              <use href="#fbPatternRaw" stroke="#DDD" strokeWidth="4" />
                              <use href="#fbPatternRaw" stroke="#999" strokeWidth="2" />
                              <use href="#fbPatternRaw" stroke="#000" />
                            </g>
                          ))}
                        </g>
                      </g>
                      <circle r="100" fill="url(#fbShade)" />
                    </g>
                  </g>

                  {/* Shot results are rendered with the dedicated shot_in /
                      shot_out illustrations outside the SVG overlay. */}

                  {/* front frame: dark rim + brushed post + highlight, with
                      small ground caps so the posts sit on the turf */}
                  <ellipse cx="36" cy="104" rx="2.6" ry="0.9" fill="#000" opacity="0.35" />
                  <ellipse cx="164" cy="104" rx="2.6" ry="0.9" fill="#000" opacity="0.35" />
                  <path d="M37,105 V53 H165 V105" fill="none" stroke="#04080c" strokeWidth="3.6" strokeOpacity="0.32" strokeLinecap="round" strokeLinejoin="round" />
                  <path ref={setRef('goalCamFrame')} d="M36,104 V52 H164 V104" fill="none" stroke="url(#goalCamPost)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M35.6,104 V51.6 H163.6 V104" fill="none" stroke="#fff" strokeWidth="0.7" strokeOpacity="0.6" strokeLinecap="round" strokeLinejoin="round" />

                  {/* impact glow, ring, radial speed lines and white core */}
                  <circle ref={setRef('goalCamGlow')} cx="100" cy="66" r="12" fill="url(#goalCamGlowGrad)" opacity="0" />
                  <circle ref={setRef('goalCamBurst')} cx="100" cy="66" r="0" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0" />
                  <line ref={setRef('goalCamSpeed0')} x1="100" y1="66" x2="100" y2="66" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0" />
                  <line ref={setRef('goalCamSpeed1')} x1="100" y1="66" x2="100" y2="66" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0" />
                  <line ref={setRef('goalCamSpeed2')} x1="100" y1="66" x2="100" y2="66" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0" />
                  <line ref={setRef('goalCamSpeed3')} x1="100" y1="66" x2="100" y2="66" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0" />
                  <line ref={setRef('goalCamSpeed4')} x1="100" y1="66" x2="100" y2="66" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0" />
                  <circle ref={setRef('goalCamCore')} cx="100" cy="66" r="0" fill="#fff" opacity="0" />
                </g>

                {/* team identity + GOAL explosion; never mirrored */}
                <g ref={setRef('goalCamText')} data-role="goal-cam-text">
                  <circle ref={setRef('goalCamTextFlash')} cx="100" cy="33" r="0" fill="url(#goalCamFlashGrad)" opacity="0" />
                  {Array.from({ length: 12 }, (_, i) => (
                    <line
                      key={`goalRay${i}`}
                      ref={setRef(`goalCamRay${i}`)}
                      x1="100"
                      y1="33"
                      x2="100"
                      y2="33"
                      stroke="#fff"
                      strokeWidth={i % 3 === 0 ? 1.9 : 1.1}
                      strokeLinecap="round"
                      opacity="0"
                    />
                  ))}
                  <g ref={setRef('goalCamWordGroup')} data-role="goal-cam-word" opacity="0">
                    <text
                      ref={setRef('goalCamWordGlow')}
                      x="100"
                      y="41"
                      textAnchor="middle"
                      fill="#fff"
                      fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
                      fontSize="14"
                      fontWeight="900"
                      letterSpacing="1.26"
                      filter="url(#goalCamTextGlow)"
                      opacity="0.9"
                    >
                      GOAL
                    </text>
                    <text
                      ref={setRef('goalCamWord')}
                      x="100"
                      y="41"
                      textAnchor="middle"
                      fill="#fff"
                      stroke="#071018"
                      strokeWidth="0.6"
                      paintOrder="stroke"
                      fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
                      fontSize="14"
                      fontWeight="900"
                      letterSpacing="1.26"
                    >
                      GOAL
                    </text>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </svg>

        {/* Result close-up art sits on its own at the top centre of the pitch,
            while its tooltip docks at the bottom centre (`has-art`, see
            app.css), so the two never overlap on small screens. Away-side art
            is mirrored so it still reads as coming from the correct side. */}
        {closeupArt && (
          <div
            key={closeupArt + ':' + (state.currentVC?.t ?? '')}
            className={'result-cam-art' + (closeupArt === 'substitution' ? ' is-sub' : '')}
            aria-hidden="true"
          >
            <img
              src={CLOSEUP_ART[closeupArt].src}
              alt={CLOSEUP_ART[closeupArt].alt}
              className={'result-cam-illustration' + (tooltip?.side === 'away' ? ' is-away' : '')}
              draggable={false}
            />
          </div>
        )}
        {/* Penalty shootout: team names on both sides, score in the middle,
            five kick slots per round with empty circles for kicks not yet taken. */}
        {shootout && (
          <div className="shootout-board" role="status" aria-label="点球大战比分">
            <div className="shootout-side is-home">
              <span className="shootout-team">
                {tracker.team1 || 'Home'}
              </span>
              <div className="shootout-rounds">{renderShootoutRounds(shootout.home)}</div>
            </div>
            <div
              className="shootout-score"
              aria-label={`${shootoutGoals(shootout.home)} 比 ${shootoutGoals(shootout.away)}`}
            >
              <span className="shootout-goals">{shootoutGoals(shootout.home)}</span>
              <span className="shootout-dash">-</span>
              <span className="shootout-goals">{shootoutGoals(shootout.away)}</span>
            </div>
            <div className="shootout-side is-away">
              <div className="shootout-rounds">{renderShootoutRounds(shootout.away)}</div>
              <span className="shootout-team">
                {tracker.team2 || 'Away'}
              </span>
            </div>
          </div>
        )}

        {(tooltip || closeupArt) && !state.breakStats && (
          <div
            className={
              'html-tooltip' +
              (closeupArt && !anchor ? ' has-art' : '') +
              (dockBottom && !anchor ? ' is-bottom' : '')
            }
            style={anchoredStyle}
            ref={tipRef}
          >
            {tooltip && (
              <div className={'tt-inner' + (tooltip.side !== 'neutral' ? ` is-${tooltip.side}` : '')}>
                {tooltip.team && tooltip.side !== 'neutral' && (
                  <EntityImage
                    type="team"
                    id={tooltip.side === 'home' ? tracker.team1Id : tracker.team2Id}
                    alt={tooltip.team}
                    className="tt-crest"
                    fallbackColor={tooltip.side === 'home' ? tracker.team1Color : tracker.team2Color}
                  />
                )}
                <div className="tt-info">
                  {tooltip.team && <div className="tt-team">{tooltip.team}</div>}
                  <div className="tt-event-line">
                    <span className="tt-event">{tooltip.text}</span>
                  </div>
                  {tooltip.player && (
                    <div className="tt-player-row">
                      <span className="tt-player">{tooltip.player}</span>
                    </div>
                  )}
                </div>
                {tooltip.minute && <span className="tt-minute">{tooltip.minute}</span>}
              </div>
            )}
          </div>
        )}

        {state.breakStats && (
          <BreakStatsOverlay
            key={`${state.breakStats.kind}:${state.breakStats.t}`}
            tracker={tracker}
            state={state}
            data={state.breakStats}
          />
        )}

        {/* 底部比分 banner 在半场/全场统计期间保持显示（统计卡片之上） */}
        <FieldScoreboard tracker={tracker} state={state} />
      </div>
    </div>
  );
}
