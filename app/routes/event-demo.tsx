import { useEffect, useMemo, useRef, useState } from 'react';
import { LiveTracker, type MatchState, type RawEvent } from '~/engine/LiveTracker';
import { VC, type VCEntry } from '~/data/vcMap';
import FieldView from '~/components/FieldView';

type Team = 'home' | 'away';

interface DemoEvent extends VCEntry {
  base: number;
}

const INITIAL_STATE: MatchState = {
  ballPos: null, activeTooltip: null, currentVC: null, currentPG: '',
  possession: null, playing: false, speed: 10, t: 0, totalMs: 0,
  score: '0-0', minute: "0'", statusText: 'LIVE', zoneAnim: null,
  goalCelebrating: false, closeupArt: null, shootout: null, breakStats: null,
};

const CATEGORY_ORDER: Array<[string, string]> = [
  ['GOAL', '进球'],
  ['SHOT', '射门'],
  ['PENALTY', '点球'],
  ['CORNER', '角球'],
  ['FREE_KICK', '任意球'],
  ['OTHER', '定位球 / 其他'],
  ['ATTACK', '进攻'],
  ['POSSESSION', '控球'],
  ['OFFSIDE', '越位'],
  ['YELLOW_CARD', '黄牌'],
  ['RED_CARD', '红牌'],
  ['SUBSTITUTION', '换人'],
  ['INJURY', '伤病 / 补时'],
  ['VAR', 'VAR'],
  ['MATCH_PHASE', '比赛阶段'],
];

const CATEGORY_LABEL = new Map(CATEGORY_ORDER);
const CATEGORY_INDEX = new Map(CATEGORY_ORDER.map(([cat], i) => [cat, i]));

const EVENTS: DemoEvent[] = Object.entries(VC)
  .map(([code, entry]) => ({ ...entry, base: Number(code) }))
  .sort((a, b) => {
    const ca = CATEGORY_INDEX.get(a.cat) ?? 99;
    const cb = CATEGORY_INDEX.get(b.cat) ?? 99;
    return ca - cb || a.base - b.base;
  });

/** 需要球队前缀（1/2 + 4 位基础码）的事件。其余事件按中立事件发送。 */
const TEAM_BASES = new Set([
  8, 9, 21,
  1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013,
  1024, 1025, 1234, 1236, 1237, 1238, 1300, 1301, 1302,
]);

/** 演示用坐标：主队按向右进攻给出，客队镜像。仅用于 demo 数据，动画仍由生产引擎驱动。 */
const XY_BY_BASE: Record<number, [number, number]> = {
  8: [0.895, 0.5], 9: [0.895, 0.5], 21: [0.895, 0.5],
  1000: [0.78, 0.4], 1001: [0.68, 0.45], 1002: [0.55, 0.5],
  1003: [0.72, 0.5], 1004: [0.99, 0.06], 1005: [0.55, 0.5], 1006: [0.55, 0.5],
  1007: [0.07, 0.5], 1008: [0.895, 0.5], 1009: [0.72, 0.42], 1010: [0.68, 0.4],
  1011: [0.82, 0.45], 1012: [0.82, 0.45], 1013: [0.55, 0.5],
  1024: [0.98, 0.35], 1025: [0.55, 0.5],
  1234: [0.75, 0.48], 1236: [0.68, 0.4], 1237: [0.98, 0.35], 1238: [0.55, 0.5],
  1300: [0.78, 0.4], 1301: [0.68, 0.45], 1302: [0.55, 0.5],
};

const SEED: RawEvent = {
  Player1: '主队演示',
  Player2: '客队演示',
  Champ: '事件动画演示',
  SS: '0-0',
  TM: '35',
  TeamKits: [
    { TC: '#e8edf5', SC: '0' },
    { TC: '#ffd43b', SC: '0' },
  ],
  DeltaMilliseconds: '1200',
};

function demoCode(base: number, team: Team | 'neutral'): string {
  if (team === 'neutral' || !TEAM_BASES.has(base)) return String(base);
  return `${team === 'home' ? '1' : '2'}${String(base).padStart(4, '0')}`;
}

function sampleXY(entry: DemoEvent, team: Team | 'neutral'): string {
  if (!TEAM_BASES.has(entry.base)) {
    if (entry.base === 1239 || entry.base === 3211) return '0.02,0.08';
    if (entry.base === 1242) return '0.92,0.5';
    return '0.5,0.5';
  }
  let [x, y] = XY_BY_BASE[entry.base] ?? [0.55, 0.5];
  if (team === 'away') { x = 1 - x; y = 1 - y; }
  return `${x.toFixed(3)},${y.toFixed(3)}`;
}

function playerName(team: Team | 'neutral'): string {
  if (team === 'home') return '10 号球员';
  if (team === 'away') return '9 号球员';
  return '演示球员';
}

/** 半场/全场演示用的 TeamKits 统计；字段含义与生产 feed 一致。 */
const HALF_TIME_KITS: Array<Record<string, string>> = [
  { TC: '#e8edf5', SC: '2', S1: '5', S2: '4', S3: '45', S4: '22', S7: '54', D1: '6', D3: '2', D4: '0' },
  { TC: '#ffd43b', SC: '1', S1: '3', S2: '5', S3: '38', S4: '15', S7: '46', D1: '3', D3: '1', D4: '0' },
];

const FULL_TIME_KITS: Array<Record<string, string>> = [
  { TC: '#e8edf5', SC: '3', S1: '8', S2: '7', S3: '82', S4: '41', S7: '57', D1: '9', D3: '3', D4: '0' },
  { TC: '#ffd43b', SC: '2', S1: '5', S2: '8', S3: '70', S4: '30', S7: '43', D1: '5', D3: '2', D4: '1' },
];

function buildEvent(entry: DemoEvent, team: Team | 'neutral', withXY: boolean, withPG: boolean): RawEvent {
  const raw: RawEvent = { VC: demoCode(entry.base, team), DeltaMilliseconds: '3000' };
  if (withXY) raw.XY = sampleXY(entry, team);
  if (withPG) raw.PG = playerName(team);
  // 进球事件带比分, 让记分牌脉冲和比分变化可见（生产 feed 的进球消息同样带 SS）
  if (entry.base === 1003) raw.SS = team === 'away' ? '0-1' : '1-0';
  // 半场/全场事件带统计快照，演示休息阶段遮罩；生产 feed 里这些字段随 TeamKits 下发。
  if (entry.base === 1015 || entry.base === 1017 || entry.base === 2000) {
    const full = entry.base !== 1015;
    raw.SS = full ? '3-2' : '2-1';
    raw.TeamKits = full ? FULL_TIME_KITS : HALF_TIME_KITS;
  }
  return raw;
}

/**
 * 点球大战模拟时序（选择“点球大战”事件时逐条播放）：
 * 前 4 轮主客队轮流罚球，主队全中、客队首轮射失；第 5 轮主队主罚命中，
 * 同时模拟生产 feed 的 PG 滞后（命中帧仍只有 4 轮，由事件结果补记）。
 * 结束时 PG = "1#1#1#1~0#1#1#1"（主队 5/5、客队 4/5）。
 */
const SHOOTOUT_SEQUENCE: RawEvent[] = [
  { VC: '1022' },
  // 第 1 轮：主队命中
  { VC: '10021' },
  { VC: '10008', PG: '1~' },
  // 第 1 轮：客队射失（PG 滞后一帧，下一帧才补上 0）
  { VC: '20021' },
  { VC: '20009', PG: '1~' },
  { PG: '1~0' },
  // 第 2 轮
  { VC: '10021' },
  { VC: '10008', PG: '1#1~0' },
  { VC: '20021' },
  { VC: '20008', PG: '1#1~0#1' },
  // 第 3 轮
  { VC: '10021' },
  { VC: '10008', PG: '1#1#1~0#1' },
  { VC: '20021' },
  { VC: '20008', PG: '1#1#1~0#1#1' },
  // 第 4 轮
  { VC: '10021' },
  { VC: '10008', PG: '1#1#1#1~0#1#1' },
  { VC: '20021' },
  { VC: '20008', PG: '1#1#1#1~0#1#1#1' },
  // 第 5 轮：主队命中，PG 仍停在 4 轮，由命中事件补记
  { VC: '10021' },
  { VC: '10008', PG: '1#1#1#1~0#1#1#1' },
].map((raw) => ({ DeltaMilliseconds: '2000', ...raw }));
const SHOOTOUT_STEP_MS = 450;

export function meta() {
  return [
    { title: 'Event Animation Demo — Football Live Tracker' },
    { name: 'description', content: 'Play every VC event through the production LiveTracker animation engine.' },
  ];
}

export default function EventDemo() {
  const [state, setState] = useState<MatchState>(INITIAL_STATE);
  const [runId, setRunId] = useState(0);
  const [selectedBase, setSelectedBase] = useState(1007);
  const [team, setTeam] = useState<Team>('home');
  const [withXY, setWithXY] = useState(false);
  const [withPG, setWithPG] = useState(false);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  const tracker = useMemo(
    () => new LiveTracker([], setState, { mode: 'live' }),
    [runId],
  );

  const entry = EVENTS.find((e) => e.base === selectedBase) ?? EVENTS[0];
  const teamable = TEAM_BASES.has(entry.base);
  const effectiveTeam: Team | 'neutral' = teamable ? team : 'neutral';
  const sentVC = demoCode(entry.base, effectiveTeam);
  const xy = withXY ? sampleXY(entry, effectiveTeam) : null;
  const pg = withPG ? playerName(effectiveTeam) : null;

  // FieldView 在子组件 effect 中注册 SVG refs（先于本 effect 执行），
  // 因此这里直接 addEvent 就能拿到完整 DOM，和生产 live 路由的调用方式一致。
  useEffect(() => {
    const t = tracker;
    t.addEvent(SEED);
    if (entry.base === 1022) {
      // 点球大战：逐条播放模拟时序，让绿色/红色标记按轮次逐个出现
      const timers = SHOOTOUT_SEQUENCE.map((raw, i) =>
        window.setTimeout(() => t.addEvent(raw), i * SHOOTOUT_STEP_MS),
      );
      return () => { timers.forEach(clearTimeout); t.destroy(); };
    }
    t.addEvent(buildEvent(entry, effectiveTeam, withXY, withPG));
    return () => t.destroy();
    // runId 变化会创建新 tracker；其余依赖仅在重绘时变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracker, runId, selectedBase, effectiveTeam, withXY, withPG]);

  // 让侧栏自动滚到当前事件（默认事件在列表靠后位置，移动端尤其需要）
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedBase, runId]);

  const redraw = () => {
    setState(INITIAL_STATE);
    setRunId((n) => n + 1);
  };

  const pick = (base: number) => {
    setSelectedBase(base);
    redraw();
  };

  const chooseTeam = (next: Team) => {
    setTeam(next);
    redraw();
  };

  const toggleXY = (next: boolean) => {
    setWithXY(next);
    redraw();
  };

  const togglePG = (next: boolean) => {
    setWithPG(next);
    redraw();
  };

  const groups = CATEGORY_ORDER
    .map(([cat, label]) => ({ cat, label, items: EVENTS.filter((e) => e.cat === cat) }))
    .filter((g) => g.items.length > 0);

  const hint = entry.base === 1022
    ? '点球大战模拟时序：按轮次播放，绿色 ✓ 得分、红色 ✕ 射失；主队 5 罚全中，客队首轮射失。'
    : [
      !withXY ? '未提供 XY：引擎走 _defaultPos 回退（与生产一致）。' : '',
      entry.cat === 'FREE_KICK' && !withXY ? '任意球走廊依赖 XY，无 XY 时只保留球点光晕。' : '',
      !withPG ? '未提供 PG：tooltip 不显示球员名，动画不受影响。' : '',
    ].filter(Boolean).join(' ');

  return (
    <div className="event-demo">
      <aside className="ed-sidebar">
        <header className="ed-head">
          <h1>事件动画演示</h1>
          <p>{EVENTS.length} 种 VC 事件 · 生产 LiveTracker 引擎</p>
        </header>

        <div className="ed-controls">
          <div className="ed-row">
            <span className="ed-label">球队</span>
            <div className="ed-seg">
              <button
                type="button"
                className={teamable && team === 'home' ? 'active' : ''}
                disabled={!teamable}
                onClick={() => chooseTeam('home')}
              >
                主队
              </button>
              <button
                type="button"
                className={teamable && team === 'away' ? 'active' : ''}
                disabled={!teamable}
                onClick={() => chooseTeam('away')}
              >
                客队
              </button>
            </div>
            {!teamable && <span className="ed-neutral">中立事件</span>}
          </div>

          <div className="ed-row">
            <label className="ed-check">
              <input type="checkbox" checked={withXY} onChange={(e) => toggleXY(e.target.checked)} />
              提供 XY
            </label>
            <label className="ed-check">
              <input type="checkbox" checked={withPG} onChange={(e) => togglePG(e.target.checked)} />
              提供 PG
            </label>
            <button type="button" className="ed-replay" onClick={redraw}>重播</button>
          </div>
        </div>

        <nav className="ed-list" aria-label="Event types">
          {groups.map((g) => (
            <section key={g.cat}>
              <h2>{g.label}<span>{g.items.length}</span></h2>
              {g.items.map((e) => (
                <button
                  key={e.base}
                  ref={e.base === selectedBase ? activeItemRef : undefined}
                  type="button"
                  data-vc={e.base}
                  className={'ed-item' + (e.base === selectedBase ? ' active' : '')}
                  onClick={() => pick(e.base)}
                >
                  <span className="ed-item-icon" aria-hidden="true">{e.icon}</span>
                  <span className="ed-item-main">
                    <span className="ed-item-title">{e.zh}</span>
                    <span className="ed-item-sub">{e.en}</span>
                  </span>
                  <span className="ed-item-code">{TEAM_BASES.has(e.base) ? 'H/A' : '—'}</span>
                </button>
              ))}
            </section>
          ))}
        </nav>
      </aside>

      <main className="ed-main">
        <div className="ed-info">
          <div className="ed-info-title">
            <span aria-hidden="true">{entry.icon}</span>
            <strong>{entry.zh}</strong>
            <span className="ed-info-en">{entry.en}</span>
            <span className="ed-chip">VC {sentVC}</span>
            <span className="ed-chip">{CATEGORY_LABEL.get(entry.cat) ?? entry.cat}</span>
          </div>
          <div className="ed-meta">
            {entry.base === 1022 ? (
              <>
                <span>XY: 无</span>
                <span>PG: 点球大战比分串（逐帧更新）</span>
                <span>球队: 主 / 客</span>
              </>
            ) : (
              <>
                <span>XY: {xy ?? '无'}</span>
                <span>PG: {pg ?? '无'}</span>
                <span>球队: {effectiveTeam === 'neutral' ? '中立' : effectiveTeam === 'home' ? '主队' : '客队'}</span>
              </>
            )}
          </div>
        </div>

        <div className="ed-stage">
          <FieldView key={runId} tracker={tracker} state={state} />
        </div>

        <p className="ed-hint">{hint || 'XY / PG 均已提供。'}</p>
      </main>
    </div>
  );
}
