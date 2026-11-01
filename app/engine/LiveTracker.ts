import { xyPos, xyView, viewToXY, INNER_SCALE, CENTER_FIELD, CENTER_TOP, CENTER_BOTTOM, CORNER_TL, CORNER_TR, CORNER_BL, CORNER_BR, GOAL_LEFT, GOAL_RIGHT, POST_LEFT_FAR, POST_LEFT_NEAR, POST_RIGHT_FAR, POST_RIGHT_NEAR, easeIn, easeOut, FIELD_TOP, FIELD_BOTTOM, FIELD_LEFT_TOP, FIELD_RIGHT_TOP, FIELD_LEFT_BOTTOM, FIELD_RIGHT_BOTTOM, type PositionPoint } from '../data/coords';
import { vcInfo, POSS_CODES, vcBase, type VCEntry } from '../data/vcMap';
import { FAN_COLORS, FAN_WAVE_COLORS } from '../data/fanColors';

// =============================================================================
// LiveTracker — 足球比赛实时动画引擎
// =============================================================================
//
// 两种模式：
//   live   — streaming: addEvent() 到达即处理，直接 fire→anim→render→notify
//   replay — 离线回放: 所有事件预加载，_frame() rAF 循环驱动时间推进
//
// Live 模式数据流（同步、无延迟）：
//   WS message → addEvent() → _addOne() → _fireLive() → _playEventAnim()
//                           → _applyAnimations() → _notify() → React re-render
//
// Replay 模式数据流（时间驱动）：
//   JSON load → _process() → play() → _frame() → _update() → _updatePosition()
//             → _applyAnimations() → _notify()

// =============================================================================
// 类型定义
// =============================================================================

/** 普通任意球扇形：场地平面(米)极坐标 —— 圆心(ax,ay)、半径 rho、两条边的角度 */
interface FKFanGeo {
  ax: number; ay: number; phi1: number; phi2: number;
  /** phi1 方向上的半径(米) */
  rho: number;
  /** phi2 方向上的半径(米); 省略时与 rho 相同(对称扇形) */
  rho2?: number;
  /** 外弧平缓度(在场地平面内生效): 0=圆弧, 1=直弦; 大于 0 时弧顶向两臂端点连线收敛 */
  flat?: number;
}

/** 场地米制尺寸，用于把归一化数据坐标换算成真实距离/角度 */
const PITCH_LENGTH_M = 105;
const PITCH_WIDTH_M = 68;

export interface TooltipData {
  x: number; y: number;
  icon: string;
  text: string;
  player: string;
  team: string;
  /** 分钟级时间（如 "51'"）；高频运动事件不展示，故可为空 */
  minute: string;
  /** false = 固定位置（如中场）；true/缺省 = 跟随球 */
  followBall?: boolean;
  /** true = 覆盖层用上面的 x/y 定位（角球等定位球），而不是固定在中场 */
  anchorToPos?: boolean;
  /** true = 卡片水平居中在点位正上方（任意球）；false = 贴边避让（角球） */
  centerAbove?: boolean;
  /** true = 卡片停在中底端（进球），给球门动画留出空间 */
  dockBottom?: boolean;
}

export interface ZoneAnimData {
  points: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  bandPoints: string;
  bandFill: string;
}

export interface MatchState {
  ballPos: PositionPoint | null;
  activeTooltip: TooltipData | null;
  currentVC: ProcessedEvent | null;
  currentPG: string;
  possession: string | null;
  playing: boolean;
  speed: number;
  t: number;
  totalMs: number;
  score: string;
  minute: string;
  statusText: string;
  zoneAnim: ZoneAnimData | null;
  /** live：定位球 VC 已到、位置伴侣帧还在路上；球点未定时前端不显示兜底卡片 */
  xyPending?: boolean;
  /** True while the centred goal close-up is on screen (tooltip is suppressed). */
  goalCelebrating: boolean;
  /** Static result close-up art: shot, penalty, card events. */
  closeupArt:
    | 'shot_on' | 'shot_off'
    | 'penalty' | 'penalty_goal' | 'penalty_miss' | 'penalty_period'
    | 'yellow_card' | 'red_card'
    | 'injury' | 'var' | 'substitution'
    | null;
  /** 点球大战各轮结果（'1' 得分 / '0' 射失）；null 表示不在点球大战 */
  shootout: { home: string[]; away: string[] } | null;
  /** 半场/全场统计遮罩；null 表示当前不在休息阶段 */
  breakStats: BreakStatsState | null;
}

/** feed 自带的球队统计（TeamKits S1/S2/S3/S4/S7，以及部分源的 D1/D3/D4）。 */
export interface TeamFeedStats {
  onTarget: number | null;
  offTarget: number | null;
  attacks: number | null;
  dangerous: number | null;
  possession: number | null;
  corners: number | null;
  yellow: number | null;
  red: number | null;
}

export interface BreakFeedStats {
  home: TeamFeedStats;
  away: TeamFeedStats;
}

/** 传给 React 的休息阶段状态；cutoffT 是统计截止时间（live 为事件序号，replay 为毫秒）。 */
export interface BreakStatsState {
  kind: 'half' | 'full';
  /** 加时赛中场（1019）：标题显示 ET HALF TIME，而不是普通半场 */
  et: boolean;
  t: number;
  cutoffT: number;
  feed: BreakFeedStats | null;
}

export interface RawEvent {
  XY?: string;
  DeltaMilliseconds?: string;
  VC?: string;
  PG?: string;
  PD?: string;
  TM?: string;
  tm?: string;
  TS?: string;
  ts?: string;
  TT?: string;
  tt?: string;
  SS?: string;
  ss?: string;
  SC?: string;
  sc?: string;
  ServerTime?: string;
  TU?: string;
  /** 服务端在发送时刻计算的当前比赛时间（毫秒），存在时优先于 ServerTime/TU 推导 */
  matchTimeMs?: string;
  /** 服务端合并后的走表状态（"true"/"false"） */
  clockRunning?: string;
  /** 累计快照消息（"true"）。快照里的 XY 可能是过期的，只按 VC 还原状态 */
  snapshot?: string;
  Player1?: string;
  Player2?: string;
  Champ?: string;
  Team1Id?: string;
  Team2Id?: string;
  home_id?: string;
  away_id?: string;
  ChampId?: string;
  // 快照事件中的主队/客队/联赛 ID
  hid?: string | number;
  aid?: string | number;
  tid?: string | number;
  TeamKits?: Array<Record<string, string>>;
}

/** KC 色板的用途推断（对照真实球衣 / 对方平台图标验证）：
 *  - 主体底色来自 TC，KC 里可能根本没有主体色（如白底 Leeds）
 *  - KC[0] 领口、KC[1] 主图案/条纹、KC[4] 第三色/装饰
 *  - KC[7] 辅色（对方平台图标用它做袖子/饰边）
 *  其余槽位暂不消费。 */
export interface KitColors {
  body: string;
  collar: string;
  pattern: string;
  accent: string;
  secondary: string;
  /** KC 中第一个与主体色明显不同的颜色（半色等版式作为第二主色） */
  alt: string;
  /** 1xbet TeamKits.KI：疑似球衣版式 id（13=左右半色，16=纯色…） */
  design: string;
  colors: string[];
}

export interface EngineOptions {
  mode?: 'replay' | 'live';
}

/** 事件坐标来源：own=消息自带；companion=同 tick 的伴侣帧；backfill=历史轨迹回填；none=无点位 */
export type XySrc = 'own' | 'companion' | 'backfill' | 'none';

export interface ProcessedEvent {
  t: number;
  vc: number;
  info: VCEntry;
  pg: string;
  pd: string;
  xy: string | null;
  tm: string;
  ts: string;
  tt: string;
  ss: string;
  team: string;
  /**
   * 坐标来源。backfill 只是"最近的球位"，不是事件发生点：
   * feed 没有事件坐标的比赛里它可能已经陈旧几十分钟，绘制时应按类别兜底。
   */
  xySrc: XySrc;
  /** live 下创建事件时距最近一条真实 XY 的毫秒数（自带 XY 为 0；回放为 undefined） */
  xyAgeMs?: number;
  /** 事件本身是否携带 XY（xy 可能来自 trackPts 回填，不能据此判断） */
  ownXy: boolean;
  /** 事件携带的 ServerTime + DeltaMilliseconds（0 = 该事件未携带，不参与时钟更新） */
  serverDateMs: number;
  /** 事件携带的 TU（0 = 该事件未携带，不参与时钟更新） */
  tuMs: number;
}

interface TrackPoint {
  t: number;
  xy: string;
  pg: string;
}

function colorDistance(a: string, b: string): number {
  const parse = (hex: string) => {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    const s = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  };
  const ca = parse(a);
  const cb = parse(b);
  if (!ca || !cb) return a.trim().toLowerCase() === b.trim().toLowerCase() ? 0 : 255;
  return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]);
}

export function parseKitColors(kc: string, tc: string, design = ''): KitColors {
  const colors = kc.split(',').map((c) => c.trim()).filter(Boolean);
  const pick = (i: number, fallback: string) => colors[i] || fallback;
  // 主体色以 TC 为准；KC 的频次/首色都不能可靠代表身体色
  const body = tc || colors[0] || '#9AA4B2';
  return {
    body,
    collar: pick(0, body),
    pattern: pick(1, body),
    accent: pick(4, body),
    secondary: pick(7, colors[4] || body),
    alt: colors.find((c) => colorDistance(c, body) > 48) || body,
    design,
    colors,
  };
}

/** 从 TeamKits[i].SC 取主/客队比分，返回 "主-客"。
 *  两个 SC 都是纯数字才采用；缺失或是空串返回空串（不覆盖已有比分）。
 *  注意：增量事件经常只带一支球队的 SC，这种"半条比分"要按球队并进状态，
 *  不能直接用这个函数拼，见 LiveTracker#_applyScoreFields。 */
export function teamKitsScore(raw: RawEvent): string {
  if (!Array.isArray(raw.TeamKits)) return '';
  const [homeKit, awayKit] = raw.TeamKits;
  // 兼容快照里 SC 以字符串或数字形式出现
  const home = String(homeKit?.SC ?? '').trim();
  const away = String(awayKit?.SC ?? '').trim();
  if (!/^\d+$/.test(home) || !/^\d+$/.test(away)) return '';
  return `${home}-${away}`;
}

function emptyTeamFeedStats(): TeamFeedStats {
  return {
    onTarget: null,
    offTarget: null,
    attacks: null,
    dangerous: null,
    possession: null,
    corners: null,
    yellow: null,
    red: null,
  };
}

function emptyBreakFeedStats(): BreakFeedStats {
  return { home: emptyTeamFeedStats(), away: emptyTeamFeedStats() };
}

/** 解析 ZoneViewer 风格的 server 时间戳：YYYYMMDDHHMMSS（后面可能跟毫秒）。
 *  1xbet 的 ZoneViewer 用本地时间构造 Date，这里严格对齐。 */
function parseServerTime(str: string): Date {
  const s = str.slice(0, 14);
  const year = parseInt(s.slice(0, 4), 10);
  const month = parseInt(s.slice(4, 6), 10) - 1;
  const day = parseInt(s.slice(6, 8), 10);
  const hour = parseInt(s.slice(8, 10), 10);
  const minute = parseInt(s.slice(10, 12), 10);
  const second = parseInt(s.slice(12, 14), 10);
  return new Date(year, month, day, hour, minute, second);
}

/** 把 ServerTime 按 UTC 解析成 epoch，仅用于和网关消息的 ts 比较新旧
 *  （ServerTime 本身是 UTC 时间串；走表时长仍用 parseServerTime 的差值）。 */
function parseServerTimeUtcMs(str: string): number {
  const s = str.slice(0, 14);
  return Date.UTC(
    parseInt(s.slice(0, 4), 10),
    parseInt(s.slice(4, 6), 10) - 1,
    parseInt(s.slice(6, 8), 10),
    parseInt(s.slice(8, 10), 10),
    parseInt(s.slice(10, 12), 10),
    parseInt(s.slice(12, 14), 10),
  );
}

/** 判断 TT 字段是否表示计时器正在运行（严格对齐 1xbet：只有 '1' 表示走表） */
function isRunningTT(value: unknown): boolean {
  return String(value) === '1';
}

/** 取第一个非空值并转成字符串（兼容 number 0 / '0'），全部缺失时返回 ''。
 *  live.js 里 Event 是按"消息实际带了哪些字段"合并的，这里需要同样的存在性语义。 */
function firstNonEmpty(...values: unknown[]): string {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return String(v);
  }
  return '';
}

// =============================================================================
// 工具函数
// =============================================================================

/**
 * feed 的 XY 有两种写法：0–1 归一化坐标，或 0–100 百分数（点位可超出边界，如 "92,32"）。
 * 任一分量超过 1 即视为百分数并除以 100，逐条判断，兼容两种格式混用以及 x=0 的点。
 */
function normalizeXY(xy: string): string {
  const [x, y] = xy.split(',').map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return xy;
  if (Math.abs(x) <= 1 && Math.abs(y) <= 1) return xy;
  return `${x / 100},${y / 100}`;
}

/** 将坐标钳制在球场梯形范围内；非数值(NaN/Infinity)直接退回中圈 */
function clampToField(x: number, y: number): { x: number; y: number } {
  // NaN 会让 SVG 的 translate 整条失效, 皮球会掉到画布左上角(球场外), 必须兜底
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: CENTER_FIELD.x, y: CENTER_FIELD.y };
  y = Math.max(FIELD_TOP, Math.min(FIELD_BOTTOM, y));
  const t = (y - FIELD_TOP) / (FIELD_BOTTOM - FIELD_TOP);
  const leftX = FIELD_LEFT_TOP + t * (FIELD_LEFT_BOTTOM - FIELD_LEFT_TOP);
  const rightX = FIELD_RIGHT_TOP + t * (FIELD_RIGHT_BOTTOM - FIELD_RIGHT_TOP);
  x = Math.max(leftX + 2, Math.min(rightX - 2, x));
  return { x, y };
}

// =============================================================================
// LiveTracker 类
// =============================================================================

export class LiveTracker {
  // ---- 公共状态 ----
  onUpdate: ((state: MatchState) => void) | null;
  trackPts: TrackPoint[];
  events: ProcessedEvent[];
  totalMs: number;
  speed: number;
  playing: boolean;
  t: number;
  lastTs: number | null;
  raf: number | null;
  ballPos: PositionPoint | null;

  // ---- 轨迹 & 插值 ----
  trailQ: PositionPoint[];
  ballFrom: PositionPoint | null;
  ballTo: PositionPoint | null;
  ballStart: number;
  /** 本次插值时长（ms）：live 固定 400，replay 随 speed 缩放 */
  ballDur: number;
  lastTpIdx: number;
  lastTpTime: number;
  posPts: PositionPoint[];

  // ---- 事件 & 动画 ----
  possession: string | null;
  lastPossTeam: string | null;
  lastEvIdx: number;
  activeTooltip: TooltipData | null;
  pendingAnims: ProcessedEvent[];
  currentVC: ProcessedEvent | null;
  currentPG: string;
  // 点球大战比分: PG 各轮结果 + 罚球前记录的待补记轮次
  _shootout: { home: string[]; away: string[] } | null;
  _shootoutPending: { side: 'home' | 'away'; len: number } | null;
  _needsNotify: boolean;

  // Attack zone — persists while currentVC is attack/DA, cleared on VC change
  _zoneAnimData: ZoneAnimData | null;
  _waveAnimRaf: number | null;

  // Possession half overlay
  _posHalfTeam: string | null;
  _posHalfAnimRaf: number | null;

  // Throw-in animation
  _throwGlowRaf: number | null;

  // 任意球威胁走廊(live XY 更新时热替换几何,波纹相位不重置)
  _fkWaveRaf: number | null;
  _fkGeo: {
    apex: PositionPoint; far: PositionPoint; near: PositionPoint; direct: boolean;
    /** 普通球顶端圆弧半径(外凸); 直接球为 null */
    arcR: number | null;
    /** 顶端圆弧方向(1 = SVG sweep 正方向, 与走廊方向一致) */
    sweep: number;
    /** 普通任意球：场地平面扇形参数(米制)。存在时弧线/波纹按单应投影逐点采样 */
    fan?: FKFanGeo;
  } | null;
  // 越位黄色虚线闪烁
  _offsideLineRaf: number | null;
  // 角球扇形放射律动(波带从角球点向外扩散,几何随扇形热更新)
  _cornerWaveRaf: number | null;
  /** 角球扇形几何：场平面圆心(cu,cv) + 参考半径 rho + 两条边的场平面方向 phi1/phi2 */
  _cornerFanGeo: {
    x: number; y: number; cu: number; cv: number; rho: number; phi1: number; phi2: number;
    /** 两条直边的半径相对 rho 的缩放(phi1/phi2 方向各一)，默认 1 即正圆扇区 */
    k1: number; k2: number;
    /** 外弧视觉弧度补偿(内部单位)；方向单位向量 bnX/bnY */
    bulge: number; bnX: number; bnY: number;
  } | null;
  /** 球门球瞬态动画（弧线+落点）；live 模式下迟到的 XY 仅重锚几何，不重启时间轴 */
  /** 进球瞬态动画（球路+冲击）；live 模式下迟到的 XY 同样只重锚球路 */
  _goalAnim: { vcT: number; endAt: number; relayout: (start: PositionPoint) => void } | null;
  _goalCelebrating = false;
  closeupArt: MatchState['closeupArt'] = null;
  // 定位球球点光晕(运行中仅更新位置,不打断相位)
  _dotGlowPos: PositionPoint | null;
  _dotGlowPersist: (() => boolean) | null;

  // 一次性动画 generation token — 同名动画重发/reset 时使旧 rAF 循环与 setTimeout 失效
  _animTokens: Record<string, number>;

  // ---- 比赛信息 ----
  team1: string;
  team2: string;
  team1Id: string;
  team2Id: string;
  team1Color: string;
  team2Color: string;
  team1Kit?: KitColors;
  team2Kit?: KitColors;
  /** feed 自带的累计统计（TeamKits S1/S2/S3/S4/S7 等），用于半场/全场统计遮罩 */
  _feedStats: BreakFeedStats;
  /** 当前休息阶段；cutoffT 冻结事件统计，feed 值在 live 下可继续更新 */
  _break: { kind: 'half' | 'full'; t: number; cutoffT: number; et: boolean } | null;
  champ: string;
  champId: string;
  score: string;
  /** 主/客队各自的最新比分：TeamKits 增量往往只带一支球队的 SC（另一侧为 {}），
   *  必须按球队分别记账，不能指望单条消息能拼出完整比分。 */
  _scoreHome: string;
  _scoreAway: string;
  minute: string;
  matchMinute: number;
  matchSecond: number;
  timerRunning: boolean;
  _timerInterval: ReturnType<typeof setInterval> | null;
  /** serverDate（ms）：由事件里的 ServerTime + DeltaMilliseconds 重锚，走表时按 live.js 的 onTimer 持续累加 */
  _timerServerDateMs: number;
  /** 最近一次事件携带的 TU（ms）；0 表示尚未收到 */
  _timerTuMs: number;
  /** 当前生效的 TM/TS（秒），只在事件携带对应字段时更新 */
  _timerTmSec: number;
  _timerTsSec: number;
  /** 上一次把本地流逝时间累加进 serverDate 的时间戳 */
  _clockBaseAt: number;
  /** 比赛已进入加时赛：此时服务端 matchTimeMs 可能仍钉在 90:00，需改用源时钟 */
  _extraTime: boolean;
  /** 已经过显式的加时阶段事件（1018~1021）或确定性的加时信号。
   *  终场没有 TM 时用它区分 90 分钟与 120 分钟，不能拿 _extraTime 顶替：
   *  常规比赛补时同样可能让 TM 超过 90，会把终场横幅误显示成 120:00（20739958）。 */
  _extraTimePhase: boolean;
  /** 本条消息是否改用源时钟（加时赛，或源已走表而服务端仍报停表） */
  _sourceClockPreferred: boolean;
  /** 半场/终场后冻结时钟：停表期间服务端仍可能上报继续走动的 matchTimeMs（如中场 46:06），
   *  在下一阶段开球事件或服务端明确恢复走表前不再采用。 */
  _clockLocked: boolean;
  statusText: string;

  // ---- SVG DOM 引用 ----
  refs: Record<string, SVGElement | null>;

  // ---- 内部 ----
  _cum: number;
  _mode: 'replay' | 'live';
  // 上一个已处理事件索引（live 模式用，避免重复 fire）
  _liveLastIdx: number;
  /** live：定位球 VC 已到、位置帧未到，暂缓播放的事件（等紧随其后的 XY 消息或超时） */
  _pendingXyEv: ProcessedEvent | null;
  _pendingXyTimer: ReturnType<typeof setTimeout> | null;
  /** live：最近一条真实 XY 的到达时间(performance.now)，用于判断球位是否已陈旧 */
  _lastLiveXyAt: number;
  /** 定位球等待 XY 的熔断：连续超时后暂时不再等待，避免无 XY 的比赛每个事件都空等 150ms */
  _xyWaitBreaker: Record<string, { misses: number; until: number }>;

  constructor(rawEvents: RawEvent[], onUpdate: (state: MatchState) => void, options: EngineOptions = {}) {
    this.onUpdate = onUpdate;
    this.trackPts = [];
    this.events = [];
    this.totalMs = 0;
    this.speed = 10;
    this.playing = false;
    this.t = 0; this.lastTs = null; this.raf = null;
    this.ballPos = null;

    this.trailQ = [];
    this.ballFrom = null;
    this.ballTo = null;
    this.ballStart = 0;
    this.ballDur = 400;
    this.lastTpIdx = -1;
    this.lastTpTime = -1;
    this.posPts = [];

    this.possession = null;
    this.lastPossTeam = null;
    this.lastEvIdx = -1;
    this.activeTooltip = null;
    this.pendingAnims = [];
    this.currentVC = null;
    this.currentPG = '';
    this._shootout = null;
    this._shootoutPending = null;
    this._pendingXyEv = null;
    this._pendingXyTimer = null;
    this._lastLiveXyAt = 0;
    this._xyWaitBreaker = {};
    this._needsNotify = false;
    this._zoneAnimData = null;
    this._waveAnimRaf = null;
    this._posHalfTeam = null;
    this._posHalfAnimRaf = null;
    this._throwGlowRaf = null;
    this._fkWaveRaf = null;
    this._fkGeo = null;
    this._offsideLineRaf = null;
    this._cornerWaveRaf = null;
    this._cornerFanGeo = null;
    this._goalAnim = null;
    this._dotGlowPos = null;
    this._dotGlowPersist = null;
    this._animTokens = {};

    this.team1 = '';
    this.team2 = '';
    this.team1Id = '';
    this.team2Id = '';
    this.team1Color = '';
    this.team2Color = '';
    this._feedStats = emptyBreakFeedStats();
    this._break = null;
    this.champ = '';
    this.champId = '';
    this.score = '0-0';
    this._scoreHome = '0';
    this._scoreAway = '0';
    this.minute = "0'";
    this.matchMinute = 0;
    this.matchSecond = 0;
    this.timerRunning = false;
    this._timerInterval = null;
    this._timerServerDateMs = 0;
    this._timerTuMs = 0;
    this._timerTmSec = 0;
    this._timerTsSec = 0;
    this._clockBaseAt = Date.now();
    this._extraTime = false;
    this._extraTimePhase = false;
    this._sourceClockPreferred = false;
    this._clockLocked = false;
    this.statusText = 'LIVE';

    this.refs = {};

    this._cum = 0;
    this._mode = options.mode || 'replay';
    this._liveLastIdx = -1;

    this._process(rawEvents);
  }

  // =============================================================================
  // 事件处理
  // =============================================================================

  /** 批量处理（回放模式初始加载） */
  _process(raw: RawEvent[]): void {
    this._cum = 0;
    for (const r of raw) {
      this._cum += parseInt(r.DeltaMilliseconds!) || 3000;
      this._addOne(r, this._cum);
    }
    this.totalMs = this._cum;
    this.trackPts.sort((a, b) => a.t - b.t);
    this.events.sort((a, b) => a.t - b.t);
    this._rebuildPosPts();
  }

  /** 合并一条消息里的比分字段，返回合并后的 "主-客"；该消息未携带比分时返回 ''。
   *
   *  - SS 是 1xbet 自带的记分牌字段（开局/比分变化/快照时下发），优先级最高；
   *  - 增量事件里 TeamKits 经常只带一支球队的 SC（另一侧是 {}），甚至没有 VC，
   *    因此主/客分开记账，只更新消息里实际出现的那一侧；
   *  - SC 是"当前比分"而不是增量，比分回滚（进球被吹）也能自然生效。 */
  _applyScoreFields(raw: RawEvent): string {
    const ss = firstNonEmpty(raw.SS, raw.SC, raw.ss, raw.sc);
    if (ss) {
      const parts = ss.split(/[-:]/).map((p) => p.trim());
      if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
        this._scoreHome = parts[0];
        this._scoreAway = parts[1];
        return `${parts[0]}-${parts[1]}`;
      }
    }
    let changed = false;
    if (Array.isArray(raw.TeamKits)) {
      const [homeKit, awayKit] = raw.TeamKits;
      // 兼容 SC 以字符串或数字形式出现
      const home = String(homeKit?.SC ?? '').trim();
      const away = String(awayKit?.SC ?? '').trim();
      if (/^\d+$/.test(home)) { this._scoreHome = home; changed = true; }
      if (/^\d+$/.test(away)) { this._scoreAway = away; changed = true; }
    }
    return changed ? `${this._scoreHome}-${this._scoreAway}` : '';
  }

  /** 合并 TeamKits 里的累计统计。S1/S2 偶尔是 "3,3,0"（ALL/90min/ET 三个口径），
   *  先取第一段；增量消息经常只带一支球队，按球队分别记账。 */
  _mergeFeedStats(raw: RawEvent): void {
    if (!Array.isArray(raw.TeamKits)) return;
    const parse = (value: unknown): number | null => {
      const s = String(value ?? '').trim();
      if (!s) return null;
      const first = s.split(',')[0].trim();
      return /^\d+$/.test(first) ? parseInt(first, 10) : null;
    };
    const merge = (dst: TeamFeedStats, kit?: Record<string, string>) => {
      if (!kit) return;
      const set = (key: keyof TeamFeedStats, attr: string) => {
        const n = parse(kit[attr]);
        if (n != null) dst[key] = n;
      };
      set('onTarget', 'S1');
      set('offTarget', 'S2');
      set('attacks', 'S3');
      set('dangerous', 'S4');
      set('possession', 'S7');
      set('corners', 'D1');
      set('yellow', 'D3');
      set('red', 'D4');
    };
    const [homeKit, awayKit] = raw.TeamKits;
    merge(this._feedStats.home, homeKit);
    merge(this._feedStats.away, awayKit);
    // 控球率只推一侧时用补数，避免统计条缺一半
    const hp = this._feedStats.home.possession;
    const ap = this._feedStats.away.possession;
    if (hp != null && ap == null) this._feedStats.away.possession = Math.max(0, 100 - hp);
    else if (ap != null && hp == null) this._feedStats.home.possession = Math.max(0, 100 - ap);
  }

  /** 进入中场/全场休息阶段。重复的 1015（feed 常见）不再重置入场动画。 */
  _setBreak(kind: 'half' | 'full', ev: ProcessedEvent): void {
    if (this._break && this._break.kind === kind) return;
    this._break = { kind, t: ev.t, cutoffT: ev.t, et: vcBase(ev.vc) === 1019 };
  }

  _clearBreak(): void {
    this._break = null;
  }

  /** replay 拖动时间轴后，从当前事件向前找最近的阶段事件，恢复遮罩状态。 */
  _rebuildBreakAt(idx: number): void {
    this._break = null;
    for (let i = idx; i >= 0; i--) {
      const base = vcBase(this.events[i].vc);
      if (LiveTracker.PERIOD_START_CODES.has(base) || base === 1022) return;
      if (base === 1015 || base === 1019) {
        this._break = { kind: 'half', t: this.events[i].t, cutoffT: this.events[i].t, et: base === 1019 };
        return;
      }
      if (base === 1017 || base === 2000) {
        // 1017/2000 是常规终场，不是加时中场
        this._break = { kind: 'full', t: this.events[i].t, cutoffT: this.events[i].t, et: false };
        return;
      }
    }
  }

  /** 单条事件解析：坐标归一化 → 轨迹点/事件分离 → 球队信息提取。
   *  返回该消息处理后的累计比分，'' 表示本条消息与比分无关（供 live 模式直接刷新记分牌）。 */
  _addOne(rawEvent: RawEvent, _t: number): string {
    // 快照里的 XY 可能是过期值：状态/动画只按 VC 还原，坐标一律忽略
    const snapshot = rawEvent.snapshot === 'true';
    const rawXy = snapshot ? undefined : rawEvent.XY;

    const vc = rawEvent.VC ? parseInt(rawEvent.VC) : null;
    // 1357 提前派彩的 PG 是 "2,1" 这类参数(2 球阈值/球队), 不是球员名
    const isEarlyPayout = vc != null && vcBase(vc) === 1357;

    if (rawXy) {
      this.trackPts.push({ t: _t, xy: normalizeXY(rawXy), pg: isEarlyPayout ? '' : rawEvent.PG || '' });
    }

    // 比分：SS 优先，TeamKits[i].SC 按球队合并（增量可能只带一侧）
    const score = this._applyScoreFields(rawEvent);

    if (vc) {
      const info = vcInfo(vc);
      let xy: string | null = rawXy ? normalizeXY(rawXy) : null;
      let xySrc: XySrc = xy ? 'own' : 'none';
      if (!xy && !snapshot) {
        for (let i = this.trackPts.length - 1; i >= 0; i--) {
          if (this.trackPts[i].t <= _t) { xy = this.trackPts[i].xy; xySrc = 'backfill'; break; }
        }
      }
      // live 下记录回填点的新鲜度：部分比赛只有定位球偶尔带位置，
      // 回填点可能已经陈旧几十分钟，不能再当成"事件发生点"来画。
      let xyAgeMs: number | undefined;
      if (this._mode === 'live') {
        xyAgeMs = xySrc === 'own'
          ? 0
          : (this._lastLiveXyAt > 0 ? performance.now() - this._lastLiveXyAt : Number.POSITIVE_INFINITY);
      }
      // 严格对齐 live.js 的 setData/setServerTime：只有消息真的带了
      // ServerTime + DeltaMilliseconds 才重锚 serverDate；缺失记 0 表示"未携带"，
      // 后续 _applyClockFields 不会覆盖已有时钟基准。
      const deltaMs = parseInt(String(rawEvent.DeltaMilliseconds ?? ''), 10) || 0;
      const serverDateMs = rawEvent.ServerTime && deltaMs
        ? parseServerTime(String(rawEvent.ServerTime)).getTime() + deltaMs
        : 0;
      const tuMs = rawEvent.TU ? parseServerTime(String(rawEvent.TU)).getTime() : 0;
      this.events.push({
        t: _t, vc, info,
        pg: isEarlyPayout ? '' : rawEvent.PG || '', pd: rawEvent.PD || '', xy, xySrc, xyAgeMs,
        tm: firstNonEmpty(rawEvent.TM, rawEvent.tm),
        ts: firstNonEmpty(rawEvent.TS, rawEvent.ts),
        tt: firstNonEmpty(rawEvent.TT, rawEvent.tt),
        ss: score,
        team: info.team,
        ownXy: !!rawXy,
        serverDateMs,
        tuMs,
      });
    }

    if (!this.team1 && rawEvent.Player1) {
      this.team1 = rawEvent.Player1;
      this.team2 = rawEvent.Player2 || '';
      this.champ = rawEvent.Champ || '';
    }
    // 新快照契约：hid/aid/tid 优先
    if (rawEvent.hid != null && !this.team1Id) this.team1Id = String(rawEvent.hid);
    if (rawEvent.aid != null && !this.team2Id) this.team2Id = String(rawEvent.aid);
    if (rawEvent.tid != null && !this.champId) this.champId = String(rawEvent.tid);
    // 旧字段兼容
    if (!this.team1Id && rawEvent.Team1Id) this.team1Id = rawEvent.Team1Id;
    if (!this.team2Id && rawEvent.Team2Id) this.team2Id = rawEvent.Team2Id;
    if (!this.team1Id && rawEvent.home_id) this.team1Id = rawEvent.home_id;
    if (!this.team2Id && rawEvent.away_id) this.team2Id = rawEvent.away_id;
    if (!this.champId && rawEvent.ChampId) this.champId = rawEvent.ChampId;

    // 球衣/颜色信息（match_full.json 格式）。对齐 live.js 的 setTeam：
    // TeamKits[0] 是主队、[1] 是客队，TC 为主色；后续快照修正颜色时以最新值为准。
    if (Array.isArray(rawEvent.TeamKits)) {
      this._mergeFeedStats(rawEvent);
      const [homeKit, awayKit] = rawEvent.TeamKits;
      if (homeKit?.TC) this.team1Color = homeKit.TC;
      if (awayKit?.TC) this.team2Color = awayKit.TC;
      if (homeKit?.KC) this.team1Kit = parseKitColors(homeKit.KC, this.team1Color, homeKit.KI);
      if (awayKit?.KC) this.team2Kit = parseKitColors(awayKit.KC, this.team2Color, awayKit.KI);
    }
    return score;
  }

  _rebuildPosPts(): void {
    this.posPts = [];
    let lastPt = -1;
    for (const pt of this.trackPts) {
      if (pt.t !== lastPt) {
        const raw = xyPos(pt.xy);
        if (raw) {
          // clampToField 只返回 {x,y}，时间戳在这里补上；PositionPoint.t 是可选的
          this.posPts.push({ ...clampToField(raw.x, raw.y), t: pt.t });
        }
        lastPt = pt.t;
      }
    }
  }

  // =============================================================================
  // 公开 API
  // =============================================================================

  /**
   * Live 模式：事件到达即处理 — 解析 → 开火 → 动画 → 渲染 → 通知
   * 不做时间累积，不做 rAF 循环（除非有 XY 坐标需要球插值）
   */
  addEvent(rawEvent: RawEvent): void {
    if (this._mode === 'live') {
      this._addEventLive(rawEvent);
    } else {
      this._addEventReplay(rawEvent);
    }
  }

  /** Live 模式：零延迟同步处理 */
  _addEventLive(rawEvent: RawEvent): void {
    // 用单调递增序号作时间戳，仅用于排序
    const seq = this.events.length;
    // _addOne 会合并本条消息的比分字段；增量比分消息经常没有 VC（不会生成事件），
    // 所以必须用它的返回值刷新比分，不能只依赖 _fireLive。
    const score = this._addOne(rawEvent, seq);
    this.totalMs = seq;
    if (score) this.score = score;
    // 点球大战的 PG 也可能单独下发（没有 VC，不会生成事件），必须直接解析
    if (!rawEvent.VC && rawEvent.PG) this._applyShootoutPG(rawEvent.PG);

    // 更新时间字段（纯时间事件 / 快照同样走这里；事件未携带时间字段时是 no-op）
    this._syncClockRaw(rawEvent);

    // 只 fire 新事件（_addOne 可能新增事件到 events 末尾）
    const newEvents = this.events.slice(this._liveLastIdx + 1);
    for (const ev of newEvents) {
      this._fireLive(ev);
    }
    this._liveLastIdx = this.events.length - 1;

    // 有 XY → 更新球位和拖尾；无 XY → 确保球可见。
    // 快照(snapshot)里的 XY 可能是过期值，坐标一律忽略，只按 VC 还原当前状态。
    const isSnapshot = rawEvent.snapshot === 'true';
    // 空串 XY 也是有效信息（伴侣帧明确表示"这个事件没有位置"），必须和"没有 XY 字段"区分
    const hasXyField = !isSnapshot && rawEvent.XY !== undefined;
    const liveXy = hasXyField && rawEvent.XY ? normalizeXY(rawEvent.XY) : null;
    if (liveXy) {
      this._lastLiveXyAt = performance.now();
      this._updateBallFromXY(liveXy);
      this._startBallInterpolation();
    }
    if (hasXyField) {
      const pending = this._pendingXyEv;
      if (pending && this._isXyCompanion(pending, rawEvent)) {
        // 这条消息是等待中事件的伴侣帧
        this._cancelPendingXyAnim();
        if (liveXy) {
          // 真实坐标：直接播放，不再按默认点先画一遍
          pending.xy = liveXy;
          pending.ownXy = true; // 角球吸附/seek 都按真实球点，而不是回填/伪随机点
          pending.xySrc = 'companion';
          pending.xyAgeMs = 0;
          this._noteXyWaitHit(pending);
          this._playLiveAnim(pending);
        } else {
          // 空 XY：feed 明确表示该事件没有位置，立即按兜底播放，不再空等 150ms
          pending.xy = null;
          pending.ownXy = false;
          pending.xySrc = 'none';
          this._noteXyWaitHit(pending);
          this._playLiveAnim(pending);
        }
      } else if (!pending && liveXy && this.currentVC) {
        // 迟到的 XY：重锚当前定位球动画（VC 已播过）
        const vc = this.currentVC;
        const newPos = xyPos(liveXy);
        if (newPos) {
          if (LiveTracker.THROW_CODES.has(vcBase(vc.vc))) {
            vc.xy = liveXy; vc.xySrc = 'companion'; vc.ownXy = true;
            this._animThrow(this._eventPos(vc) ?? newPos, vc);
          } else if (vc.info.cat === 'CORNER') {
            vc.xy = liveXy; vc.xySrc = 'companion'; vc.ownXy = true;
            // XY 后到：吸附到角球点（tooltip 固定在球场中央，无需重锚）
            const corner = this._cornerPos(vc, newPos);
            this._animCorner(corner, vc);
          } else if (vc.info.cat === 'FREE_KICK') {
            // 记录真实球点，之后 seek/回放也按同一位置绘制扇形
            vc.xy = liveXy; vc.xySrc = 'companion'; vc.ownXy = true;
            this._animFKCorridor(newPos, vc);
            // 无 XY 播放时卡片锚定默认站位点; XY 后到时把卡片同步到真实球点
            if (this.activeTooltip && this.activeTooltip.anchorToPos) {
              const spot = clampToField(newPos.x, newPos.y);
              this.activeTooltip.x = spot.x;
              this.activeTooltip.y = spot.y;
            }
          } else if (vc.info.cat === 'PENALTY') {
            const pkBase = vcBase(vc.vc);
            if (pkBase === 21 || pkBase === 1008) {
              // 罚球前的走廊始终以点球点为顶点, 不吃迟到的 XY
              this._animFKCorridor(this._defaultPos(vc), vc);
            } else {
              // 命中/射失/点球大战不画场上动画, 只记录球点
              vc.xy = liveXy; vc.xySrc = 'companion'; vc.ownXy = true;
            }
          } else if (vc.info.cat === 'GOAL' && this._goalAnim && this._goalAnim.vcT === vc.t) {
            vc.xy = liveXy; vc.xySrc = 'companion'; vc.ownXy = true;
            // 进球: 迟到的 XY 同样只重锚球路, 不重启冲击时间轴
            this._animGoal(newPos, vc);
          }
        }
      }
    }
    if (!liveXy && !this.ballPos && this.events.length > 0) {
      this.ballPos = { x: CENTER_FIELD.x, y: CENTER_FIELD.y };
    }

    this._updatePossessionLive();
    this._applyAnimations();
    this._notify();
  }

  /** Live 模式：直接 fire，不走 pendingAnims 队列 */
  _fireLive(ev: ProcessedEvent): void {
    // 新事件到来：上一个还在等 XY 的任意球动画作废（迟到播放会压住当前事件）
    this._cancelPendingXyAnim();
    const isAttackOrDA = LiveTracker.DA_CODES.has(vcBase(ev.vc)) || LiveTracker.ATTACK_CODES.has(vcBase(ev.vc));
    const isPossession = POSS_CODES.has(vcBase(ev.vc));
    if (isAttackOrDA || isPossession) {
      // 进攻/危险进攻/控球：仅在控球方切换时清空轨迹
      if (this.currentVC && this.currentVC.team !== ev.team) this.trailQ = [];
    } else {
      // 静态事件（非运动战）：立即清空轨迹
      this.trailQ = [];
    }
    this.currentVC = ev;
    if (vcBase(ev.vc) === 1357) this.currentPG = '';
    else if (ev.pg) this.currentPG = ev.pg;
    this._applyShootoutEvent(ev);
    this.activeTooltip = null;
    if (ev.ss) this.score = ev.ss;
    // 时钟已由 _addEventLive 开头的 _syncClockRaw 统一处理（服务端 matchTimeMs 优先，
    // 兼容 1xbet ServerTime/TU）。这里不再调用 _syncClock，避免旧锚点覆盖服务端时钟。
    if (vcBase(ev.vc) === 1015) this.statusText = 'HALF TIME';
    if (vcBase(ev.vc) === 1017) this.statusText = 'FULL TIME';
    if (vcBase(ev.vc) === 1016) this.statusText = '2ND HALF';
    // VC=2000 是终场控制事件：快照最后一条常是它而不是 1017
    if (vcBase(ev.vc) === 2000) this.statusText = 'FULL TIME';
    // 中场/终场事件本身必须停表：服务端 clockRunning 若滞后（终场后仍为 true），
    // 也不能让时钟继续走过 90 分钟
    const vcCode = vcBase(ev.vc);
    // 1019/1021 = 加时中场 / 加时结束：与中场、终场一样必须停表
    if (LiveTracker.PERIOD_END_CODES.has(vcCode)) {
      this._setTimerRunning(false);
      this._freezeClockAtPeriodEnd(ev);
    }
    // 休息阶段统计遮罩：半场/全场进入，重新开球或点球大战时退出。
    // 事件统计在进入时冻结 cutoff，feed 统计仍可在遮罩打开期间继续更新。
    // 加时中场(1019)与常规半场一样弹出统计遮罩, 加时下半场开球(1020)再退出
    if (vcCode === 1015 || vcCode === 1019) this._setBreak('half', ev);
    else if (vcCode === 1017 || vcCode === 2000) this._setBreak('full', ev);
    else if (LiveTracker.PERIOD_START_CODES.has(vcCode) || vcCode === 1022) this._clearBreak();
    // 只有定位球需要等位置帧：扇形/光点必须画在事件点上。
    // 进攻/危险进攻/控球的卡片本来就跟着球移动、色块只按球队方向绘制，
    // 等 XY 只会让"整场没有位置数据"的比赛每个事件白闪 150ms，因此不再等待。
    const deferXy = !ev.ownXy && this._needsXyWait(ev);
    // 进攻/危险进攻区域 — 显示并保持到 VC 改变；等 XY 的事件在播放时再画
    if (!isAttackOrDA) this._zoneAnimData = null;
    // 非定位球事件清除扇形动画
    if (!LiveTracker.THROW_CODES.has(vcBase(ev.vc)) && ev.info.cat !== 'CORNER' && ev.info.cat !== 'FREE_KICK' && ev.info.cat !== 'PENALTY') this._clearThrowAnim();
    if (deferXy) {
      this._deferAnimForXy(ev);
    } else {
      this._playLiveAnim(ev);
    }
  }

  /** live 需要等 XY 的事件：只有位置必须精确的定位球
   *  （界外球/角球/任意球/点球/球门球）。连续等不到位置帧时按类别熔断一段时间。 */
  _needsXyWait(ev: ProcessedEvent): boolean {
    const cls = this._xyWaitClass(ev);
    if (!cls) return false;
    const b = this._xyWaitBreaker[cls];
    return !b || b.until <= performance.now();
  }

  _xyWaitClass(ev: ProcessedEvent): 'fk' | 'throw' | 'corner' | 'gk' | null {
    const base = vcBase(ev.vc);
    if (ev.info.cat === 'CORNER') return 'corner';
    if (ev.info.cat === 'FREE_KICK') return 'fk';
    // 点球不再依赖场上位置: 罚球前固定在点球点, 其他点球事件是纯静态信息
    if (ev.info.cat === 'PENALTY') return null;
    if (LiveTracker.THROW_CODES.has(base)) return 'throw';
    if (LiveTracker.GK_CODES.has(base)) return 'gk';
    return null;
  }

  /** 收到位置伴侣：清零该类别的超时计数 */
  _noteXyWaitHit(ev: ProcessedEvent): void {
    const cls = this._xyWaitClass(ev);
    if (!cls) return;
    const b = this._xyWaitBreaker[cls];
    if (b) b.misses = 0;
  }

  /** 等满窗口仍没有位置帧：累计到阈值后熔断，避免无 XY 的比赛反复空等 */
  _noteXyWaitTimeout(ev: ProcessedEvent): void {
    const cls = this._xyWaitClass(ev);
    if (!cls) return;
    const b = this._xyWaitBreaker[cls] ?? (this._xyWaitBreaker[cls] = { misses: 0, until: 0 });
    b.misses++;
    if (b.misses >= LiveTracker.XY_BREAK_AFTER) {
      b.misses = 0;
      b.until = performance.now() + LiveTracker.XY_BREAK_MS;
    }
  }

  /** 判断一条 XY 消息是否是等待中事件的位置伴侣 */
  _isXyCompanion(ev: ProcessedEvent, raw: RawEvent): boolean {
    const a = LiveTracker._normPg(ev.pg);
    const b = LiveTracker._normPg(raw.PG || '');
    // 两边都有球员名时必须一致；一边为空时放宽（feed 常只在 VC 帧带球员）
    return !a || !b || a === b;
  }

  static _normPg(pg: string): string {
    return pg.trim().replace(/[\s,]+$/g, '').toLowerCase();
  }

  /** 坐标是否来自真实 XY（自带或伴侣帧）；回填点不算 */
  _hasTrustedXy(ev: ProcessedEvent): boolean {
    return ev.xySrc === 'own' || ev.xySrc === 'companion';
  }

  /** 事件绘制位置：无真实 XY 时按类别兜底；过于陈旧的回填点也不再采用 */
  _eventPos(ev: ProcessedEvent): PositionPoint | null {
    // 界外球(1024/1237): 对齐 live.js —— x 取位置帧, y 吸附到最近边线(0/1)
    if (LiveTracker.THROW_CODES.has(vcBase(ev.vc))) return this._throwInPos(ev);
    if (ev.xy && ev.xySrc !== 'none') {
      const stale = ev.xySrc === 'backfill' && ev.xyAgeMs != null && ev.xyAgeMs > LiveTracker.XY_STALE_MS;
      if (!stale) {
        const p = xyPos(ev.xy);
        // 越界坐标(如 110,41)夹回场内，卡片/色块才不会飘到场地外
        if (p) return clampToField(p.x, p.y);
      }
    }
    return this._defaultPos(ev);
  }

  /** 界外球球点（1024 直接界外 / 1237 区域界外）：x 保持不变，y 按 live.js 归到上/下边线（y<0.5 → 0，否则 1） */
  _throwInPos(ev: ProcessedEvent): PositionPoint {
    if (ev.xy && ev.xySrc !== 'none') {
      const stale = ev.xySrc === 'backfill' && ev.xyAgeMs != null && ev.xyAgeMs > LiveTracker.XY_STALE_MS;
      if (!stale) {
        const [nx, ny] = ev.xy.split(',').map(Number);
        if (Number.isFinite(nx) && Number.isFinite(ny)) {
          const p = xyPos(`${nx},${ny < 0.5 ? 0 : 1}`);
          if (p) return clampToField(p.x, p.y);
        }
      }
    }
    return this._defaultPos(ev);
  }

  /** live 下球位是否已经太久没有更新（无 XY 的比赛会长时间冻结在最后一个定位球点） */
  _isBallStaleLive(): boolean {
    return this._mode === 'live' && this._lastLiveXyAt > 0 &&
      performance.now() - this._lastLiveXyAt > LiveTracker.BALL_STALE_MS;
  }

  /**
   * 没有可靠球位时，把运动战事件的默认站位当作球位:
   * 回放没有任何位置轨道(无 XY)时直接落到默认点；live 从未收到位置帧或球位已过期时同理。
   * 这样进攻/危险进攻的球点与 tooltip 会出现在默认点位，而不是冻结在中场。
   */
  _useDefaultBall(pos: PositionPoint): void {
    const p = clampToField(pos.x, pos.y);
    if (this._mode === 'live') {
      if (this._lastLiveXyAt === 0 || this._isBallStaleLive()) this.ballPos = { ...p };
    } else if (this.posPts.length === 0) {
      this.ballPos = { ...p };
    }
  }

  /** 进攻/危险进攻色块（_fireLive 与延迟播放共用） */
  _drawAttackZone(ev: ProcessedEvent): void {
    const pos = this._eventPos(ev);
    if (pos) this._animAttackZone(pos, ev.team, LiveTracker.DA_CODES.has(vcBase(ev.vc)));
  }

  /** live 播放：先进攻色块，再分发事件动画（延迟播放与立即播放走同一入口） */
  _playLiveAnim(ev: ProcessedEvent): void {
    const base = vcBase(ev.vc);
    if (LiveTracker.DA_CODES.has(base) || LiveTracker.ATTACK_CODES.has(base)) this._drawAttackZone(ev);
    this._playEventAnim(ev);
  }

  /** VC 先到、XY 未到：暂缓播放，等 XY 消息或超时后按最佳已知位置播放 */
  _deferAnimForXy(ev: ProcessedEvent): void {
    this._cancelPendingXyAnim();
    // 清掉上一个定位球的扇形/光晕，等待期间场上不留旧动画
    this._clearThrowAnim();
    this._pendingXyEv = ev;
    this._pendingXyTimer = setTimeout(() => {
      this._pendingXyTimer = null;
      const pending = this._pendingXyEv;
      this._pendingXyEv = null;
      if (!pending) return;
      this._noteXyWaitTimeout(pending);
      this._playLiveAnim(pending);
      this._applyAnimations();
      this._notify();
    }, LiveTracker.XY_WAIT_MS);
  }

  _cancelPendingXyAnim(): void {
    if (this._pendingXyTimer) {
      clearTimeout(this._pendingXyTimer);
      this._pendingXyTimer = null;
    }
    this._pendingXyEv = null;
  }

  /** 从已归一化的 XY 字符串更新球位和拖尾 */
  _updateBallFromXY(xy: string): void {
    const raw = xyPos(xy);
    if (!raw) return;
    // feed 偶有越界坐标(如 110,41 → 1.1,0.41)，不夹住的话皮球会跑到广告牌/看台上
    const pos = clampToField(raw.x, raw.y);
    const now = performance.now();
    this.ballFrom = this.ballPos ? { ...this.ballPos } : { x: pos.x, y: pos.y };
    this.ballTo = { x: pos.x, y: pos.y };
    this.ballStart = now;
    this.ballDur = 400;
    this.trailQ.push({ x: pos.x, y: pos.y });
    if (this.trailQ.length > 4) this.trailQ.shift();
  }

  /** 球插值动画循环（轻量，仅在有 XY 时运行） */
  _startBallInterpolation(): void {
    // 已在运行则跳过
    if (this._interpRaf) return;
    const step = () => {
      if (!this.ballFrom || !this.ballTo) {
        this._interpRaf = null;
        return;
      }
      const elapsed = performance.now() - this.ballStart;
      if (elapsed >= this.ballDur) {
        this.ballPos = { x: this.ballTo.x, y: this.ballTo.y };
        this.ballFrom = null; this.ballTo = null;
        this._interpRaf = null;
        this._applyAnimations();
        this._notify();
        return;
      }
      const p = easeIn(elapsed / this.ballDur);
      this.ballPos = {
        x: this.ballFrom.x + (this.ballTo.x - this.ballFrom.x) * p,
        y: this.ballFrom.y + (this.ballTo.y - this.ballFrom.y) * p
      };
      this._applyAnimations();
      this._notify();
      this._interpRaf = requestAnimationFrame(step);
    };
    this._interpRaf = requestAnimationFrame(step);
  }
  _interpRaf: number | null = null;

  /** Live 模式：直接取最后一个控球事件 */
  _updatePossessionLive(): void {
    this.possession = null;
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (POSS_CODES.has(vcBase(this.events[i].vc))) {
        this.possession = this.events[i].team; break;
      }
    }
  }

  /** Replay 模式：累加时间戳，追加到数组，_frame 循环负责渲染 */
  _addEventReplay(rawEvent: RawEvent): void {
    this._cum += parseInt(rawEvent.DeltaMilliseconds!) || 3000;
    this._addOne(rawEvent, this._cum);
    this.totalMs = this._cum;
    this._rebuildPosPts();
    if (this.playing && !this.raf) {
      this.lastTs = null;
      this.raf = requestAnimationFrame(n => this._frame(n));
    }
  }

  setMode(mode: 'replay' | 'live'): void { this._mode = mode; }

  reset(): void {
    if (this._interpRaf) { cancelAnimationFrame(this._interpRaf); this._interpRaf = null; }
    this._cum = 0;
    this.trackPts = [];
    this.posPts = [];
    this.events = [];
    this.totalMs = 0;
    this.t = 0;
    this.team1 = '';
    this.team2 = '';
    this._feedStats = emptyBreakFeedStats();
    this._break = null;
    this.champ = '';
    this.team1Id = '';
    this.team2Id = '';
    this.champId = '';
    this.score = '0-0';
    this._scoreHome = '0';
    this._scoreAway = '0';
    this.minute = "0'";
    this.matchMinute = 0;
    this.matchSecond = 0;
    this.timerRunning = false;
    this._timerServerDateMs = 0;
    this._timerTuMs = 0;
    this._timerTmSec = 0;
    this._timerTsSec = 0;
    this._clockBaseAt = Date.now();
    this._extraTime = false;
    this._extraTimePhase = false;
    this._sourceClockPreferred = false;
    this._clockLocked = false;
    this._stopClock();
    this.statusText = 'LIVE';
    this.pendingAnims = [];
    this.activeTooltip = null;
    this.lastEvIdx = -1;
    this.lastPossTeam = null;
    this.trailQ = [];
    this._zoneAnimData = null;
    if (this._waveAnimRaf) { cancelAnimationFrame(this._waveAnimRaf); this._waveAnimRaf = null; }
    if (this._posHalfAnimRaf) { cancelAnimationFrame(this._posHalfAnimRaf); this._posHalfAnimRaf = null; }
    this._posHalfTeam = null;
    this._clearThrowAnim();
    this._clearOffsideZone();
    this.ballFrom = null;
    this.ballTo = null;
    this.ballStart = 0;
    this.ballDur = 400;
    this.lastTpIdx = -1;
    this.lastTpTime = -1;
    this.ballPos = null;
    this.possession = null;
    this.currentVC = null;
    this.currentPG = '';
    this._shootout = null;
    this._shootoutPending = null;
    this._liveLastIdx = -1;
    this._lastLiveXyAt = 0;
    this._xyWaitBreaker = {};
    this._cancelPendingXyAnim();
    this._animTokens = {};
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.playing = false;
  }

  /** 同步比赛时钟：只有事件实际携带了时间字段才会生效。
   *  语义对齐 live.js 的 Event 合并：缺失的 TM/TS/TT/TU/ServerTime 不会覆盖当前值，
   *  普通事件再也不会把已经走过的时间清零。 */
  _syncClock(ev: ProcessedEvent): void {
    if (this._applyClockFields(ev.tm, ev.ts, ev.tt, ev.serverDateMs, ev.tuMs)) {
      this._updateClockDisplay();
    }
  }

  /** 处理没有 VC 的纯时间更新事件（raw 字段可能是 number，需保持存在性判断） */
  _syncClockRaw(rawEvent: RawEvent): void {
    const tm = firstNonEmpty(rawEvent.TM, rawEvent.tm);
    const ts = firstNonEmpty(rawEvent.TS, rawEvent.ts);
    const tt = firstNonEmpty(rawEvent.TT, rawEvent.tt);
    const matchTimeMs = Number(rawEvent.matchTimeMs);
    const serviceClockMs = Number.isFinite(matchTimeMs) && matchTimeMs > 0 ? matchTimeMs : 0;

    // 加时赛：显式加时阶段事件是确定信号；TM>90 只有在服务端时钟还没走过常规时间
    // （典型是加时赛服务端钉在 90:00）时才成立。常规比赛补时也会把 TM 推过 90，
    // 不能只凭 TM 判定，否则客户端会丢掉服务端时钟，终场横幅一度显示 120:00（20739958）。
    const tmSec = parseInt(tm, 10);
    const servicePastRegulation = serviceClockMs > 90 * 60000 + LiveTracker.CLOCK_TOLERANCE_MS;
    if (Number.isFinite(tmSec) && tmSec > 90 && !servicePastRegulation) {
      this._extraTime = true;
      this._extraTimePhase = true;
    }
    const rawVc = Number(firstNonEmpty(rawEvent.VC));
    if (Number.isFinite(rawVc)) {
      const base = vcBase(rawVc);
      if (base >= 1018 && base <= 1021) {
        this._extraTime = true;
        this._extraTimePhase = true;
      }
    }

    // 服务端 matchTimeMs 不可信时改用源时钟 (TM/TS/TT + ServerTime/TU)：
    //  - 加时赛：服务端可能钉在 90:00（19936468），或从 90:00 重新计时、
    //    丢掉第一个加时半场（20148673 → 95:19，实际 110:07）；
    //  - 服务端 clockRunning 与事件 TT 冲突：源时钟已走表而服务端仍报停表，
    //    常见于加时赛开球时 TM 还没超过 90 的那几分钟。
    // 一旦发现这两种情况，本场后续消息都忽略服务端时钟，避免又被它拉回错误时间。
    const rawRunning = tt === '' ? null : isRunningTT(tt);
    const serviceRunningRaw = rawEvent.clockRunning;
    const serviceRunning = serviceRunningRaw === undefined || serviceRunningRaw === ''
      ? null
      : serviceRunningRaw === 'true' || serviceRunningRaw === '1';
    // 中场/终场停表后，服务端仍可能上报继续走动的 matchTimeMs（例如中场显示 46:06，
    // 与事件 TM=45 不一致）。此时冻结在事件时间，直到开球/下半场/加时开球事件，
    // 或服务端明确恢复走表，才重新接受服务端时钟。
    const phaseStart = Number.isFinite(rawVc) && LiveTracker.PERIOD_START_CODES.has(vcBase(rawVc));
    if (this._clockLocked && !phaseStart && serviceRunning !== true) return;
    if (phaseStart || serviceRunning === true) this._clockLocked = false;
    // 只在“源时钟已在走表、服务端却报停表”时改用源时钟；反方向（快照事件
    // 仍是中场 TT=0、服务端已重新开表）不能因此丢掉服务端的正确锚点。
    const clockStoppedButSourceRunning = rawRunning === true && serviceRunning === false;

    const deltaMs = parseInt(String(rawEvent.DeltaMilliseconds ?? ''), 10) || 0;
    // ServerTime/TU 是 UTC 时间串；统一按 UTC 解析，差值才是真实的已走时长。
    const serverUtcMs = rawEvent.ServerTime
      ? parseServerTimeUtcMs(String(rawEvent.ServerTime)) + deltaMs
      : 0;
    const tuMs = rawEvent.TU ? parseServerTimeUtcMs(String(rawEvent.TU)) : 0;
    // 网关会缓存 1xbet 的比赛状态，快照里的 ServerTime 可能已落后几十秒；TT=1
    // 时比赛时钟一直在走，所以数据陈旧（>2s）时直接用本机当前时间作锚点。
    // 数据新鲜时仍用 ServerTime，避免本机校时偏差影响显示；过旧则不再外推。
    const nowMs = Date.now();
    const staleMs = serverUtcMs > 0 ? nowMs - serverUtcMs : -1;
    const serverDateMs = staleMs > 2000 && staleMs < 30 * 60000 ? nowMs : serverUtcMs;

    // 常规时间优先用服务端时钟：以它为锚点本地走表，刷新/重连后不会先显示旧时间再跳变。
    // 1xbet 下半场开球事件会复用上半场 0:00 的 TM/TS（后端 32963090 是同一个坑），
    // 同时把 TU 换成下半场开球时间。若直接锚定，时钟会从 0:19 这种读数开始走，
    // 而不是 45:19。读数比当前显示落后一个阶段时丢弃 TM/TS，只保留 TT/TU/ServerTime，
    // 让表从服务端锚点（45:00）继续走。加时赛源时钟优先，不做此过滤。
    const referenceMs = Math.max(this._clockTotalMs(), serviceClockMs);
    const sourceBehind = !this._extraTime
      && this._sourceClockMs(tm, ts, tt, serverDateMs, tuMs) + LiveTracker.CLOCK_TOLERANCE_MS
        < referenceMs;
    const sourceTm = sourceBehind ? '' : tm;
    const sourceTs = sourceBehind ? '' : ts;

    // 一旦改用源时钟就沿用，直到服务端明确恢复走表再切回；中间的健康事件
    // （不带 TT）不会把已经走过的读数拉回服务端冻结值。
    this._sourceClockPreferred = this._extraTime
      || clockStoppedButSourceRunning
      || (this._sourceClockPreferred && serviceRunning !== true);

    const serviceClockUsable = !this._sourceClockPreferred && serviceClockMs > 0;
    if (serviceClockUsable) {
      const running = rawEvent.clockRunning;
      if (running !== undefined && running !== '') {
        this._setTimerRunning(running === 'true' || running === '1');
      }
      this._applyMatchTimeAnchor(matchTimeMs);
      this._updateClockDisplay();
      return;
    }

    // 源时钟读数不可信时先用服务端读数补锚点，避免冷启动（页面正好在下半场开球
    // 那一分钟打开、还没有任何锚点）时又从 0 开始读秒。
    if (sourceBehind && serviceClockMs > 0) {
      this._applyMatchTimeAnchor(serviceClockMs);
    }
    if (this._applyClockFields(sourceTm, sourceTs, tt, serverDateMs, tuMs)) {
      this._updateClockDisplay();
    }
  }

  /** 按 live.js 的 setData 合并语义更新时钟字段：只有消息实际携带的字段才写入。
   *  返回是否有时钟字段被更新（false 表示该事件与时钟无关）。 */
  _applyClockFields(tm: string, ts: string, tt: string, serverDateMs: number, tuMs: number): boolean {
    let changed = false;
    if (serverDateMs > 0) {
      this._timerServerDateMs = serverDateMs;
      this._clockBaseAt = Date.now();
      changed = true;
    }
    if (tuMs > 0) { this._timerTuMs = tuMs; changed = true; }
    if (tm !== '') { this._timerTmSec = parseInt(tm, 10) || 0; changed = true; }
    if (ts !== '') { this._timerTsSec = parseInt(ts, 10) || 0; changed = true; }
    if (tt !== '') {
      this._setTimerRunning(isRunningTT(tt));
      changed = true;
    }
    return changed;
  }

  /**
   * 半场/终场：用事件自带的 TM/TS 冻结横幅时钟。服务端在中场停表期间可能仍按
   * 45+补时上报 matchTimeMs（例如 46:06），与事件/ tooltip 的 45' 不一致；
   * 这里以事件时间为准，并锁住后续服务端锚点，直到下一阶段开球。
   */
  _freezeClockAtPeriodEnd(ev: ProcessedEvent): void {
    this._clockLocked = true;
    const base = vcBase(ev.vc);
    const tm = parseInt(String(ev.tm ?? ''), 10);
    const ts = parseInt(String(ev.ts ?? ''), 10);
    // 本阶段终场读数上限：常规 45/90，加时 105/120。
    // 是否加时以显式加时阶段为准（_extraTimePhase），不能用 _extraTime 顶替：
    // 常规比赛补时也会把 TM 推过 90，那样终场会兜底成 120:00（20739958）。
    const etEnd = base === 1019 ? 105 : base === 1021 ? 120 : this._extraTimePhase ? 120 : 90;
    const fallbackMinute = base === 1015 ? 45 : etEnd;
    // 事件自带的 TM 也不能超过阶段上限：终场事件若沿用补时读数，
    // 横幅应回到阶段结束时间，而不是显示 90+补时后的分钟数。
    const minuteCap = base === 1015 ? 45 : etEnd;
    const rawMinute = Number.isFinite(tm) ? tm : fallbackMinute;
    // 读数被压回阶段上限时秒数一并清零，显示 90:00 而不是 90:12
    const capped = rawMinute > minuteCap;
    this._timerTmSec = capped ? minuteCap : rawMinute;
    this._timerTsSec = Number.isFinite(ts) && !capped ? ts : 0;
    this._timerServerDateMs = 0;
    this._timerTuMs = 0;
    this._updateClockDisplay();
  }

  /** 统一设置走表状态；只在状态变化时启停定时器，避免重复重置累加基准。 */
  _setTimerRunning(running: boolean): void {
    if (running === this.timerRunning) return;
    this.timerRunning = running;
    if (running) this._startClock(); else this._stopClock();
  }

  /** 以服务端下发的“当前比赛时间”为锚点。
   *  复用 serverDate/TU 差值保存锚点处的毫秒余数，随后的 1s tick 按真实流逝
   *  时间累加；既保留亚秒精度，也不依赖 1xbet 的 ServerTime/TU 是否新鲜。 */
  _applyMatchTimeAnchor(totalMs: number): void {
    const wholeSec = Math.floor(totalMs / 1000);
    const remainderMs = totalMs - wholeSec * 1000;
    this._timerTmSec = Math.floor(wholeSec / 60);
    this._timerTsSec = wholeSec % 60;
    this._timerTuMs = 1000;
    this._timerServerDateMs = 1000 + remainderMs;
    this._clockBaseAt = Date.now();
  }

  /** 当前显示的比赛时间（毫秒）：TM/TS 读数 + 走表时累加的 ServerTime/TU 差值。 */
  _clockTotalMs(): number {
    const baseMs = (this._timerTmSec * 60 + this._timerTsSec) * 1000;
    // 没有 TU 或还没收到 ServerTime 锚点时，live.js 的 s 也为 0
    const elapsedMs = this.timerRunning && this._timerTuMs > 0 && this._timerServerDateMs > 0
      ? this._timerServerDateMs - this._timerTuMs
      : 0;
    return Math.max(baseMs + elapsedMs, 0);
  }

  /** 用源时钟字段估算当前比赛时间（消息没带的字段沿用已保存的锚点）。 */
  _sourceClockMs(tm: string, ts: string, tt: string, serverDateMs: number, tuMs: number): number {
    const tmSec = tm !== '' ? parseInt(tm, 10) || 0 : this._timerTmSec;
    const tsSec = ts !== '' ? parseInt(ts, 10) || 0 : this._timerTsSec;
    const tu = tuMs > 0 ? tuMs : this._timerTuMs;
    const server = serverDateMs > 0 ? serverDateMs : this._timerServerDateMs;
    const running = tt !== '' ? isRunningTT(tt) : this.timerRunning;
    const elapsed = running && tu > 0 && server > 0 ? Math.max(0, server - tu) : 0;
    return Math.max((tmSec * 60 + tsSec) * 1000 + elapsed, 0);
  }

  /** 按 1xbet ZoneViewer 的 getTimeObj 公式计算显示时间（毫秒级 + Math.round）。
   *  serverDate 由 1s tick 按 onTimer 语义持续累加，这里只做取值，不再每次事件重锚。 */
  _updateClockDisplay(): void {
    const totalMs = this._clockTotalMs();
    const n = totalMs % 60000;
    let minute = Math.round((totalMs - n) / 60000);
    let second = Math.round(n / 1000);
    if (second === 60) {
      second = 0;
      minute += 1;
    }
    this.matchMinute = minute;
    this.matchSecond = second;
  }

  _startClock(): void {
    if (this._timerInterval) return;
    this._clockBaseAt = Date.now();
    this._timerInterval = setInterval(() => {
      const now = Date.now();
      // 对齐 live.js 的 onTimer：走表时把本地流逝时间累加进 serverDate。
      // 回放模式按播放倍速缩放，确保时钟与动画同速。
      if (this.timerRunning && this._timerServerDateMs > 0) {
        const factor = this._mode === 'replay' ? Math.max(this.speed, 0.1) : 1;
        this._timerServerDateMs += (now - this._clockBaseAt) * factor;
      }
      this._clockBaseAt = now;
      this._updateClockDisplay();
      this._notify();
    }, 1000);
  }

  _stopClock(): void {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }

  /** Replay seek：把 0..idx 事件按 live.js 的 Event 合并语义重放一遍，
   *  得到该时间点应有的 TM/TS/TT/TU/serverDate 状态（否则拖动后时间停在旧值）。 */
  _restoreClockAt(idx: number): void {
    this._timerServerDateMs = 0;
    this._timerTuMs = 0;
    this._timerTmSec = 0;
    this._timerTsSec = 0;
    this.timerRunning = false;
    let anchorT = -1;
    for (let i = 0; i <= idx; i++) {
      const ev = this.events[i];
      if (ev.serverDateMs > 0) { this._timerServerDateMs = ev.serverDateMs; anchorT = ev.t; }
      if (ev.tuMs > 0) this._timerTuMs = ev.tuMs;
      if (ev.tm !== '') this._timerTmSec = parseInt(ev.tm, 10) || 0;
      if (ev.ts !== '') this._timerTsSec = parseInt(ev.ts, 10) || 0;
      if (ev.tt !== '') this.timerRunning = isRunningTT(ev.tt);
    }
    // 最后一次 ServerTime 锚点到 seek 位置之间已经走过的时间
    if (this.timerRunning && anchorT >= 0) {
      this._timerServerDateMs += Math.max(0, this.t - anchorT);
    }
    this._clockBaseAt = Date.now();
    // 暂停状态下拖动时间轴只重建显示值，不启动走表；play() 时再启动
    if (this.timerRunning && this.playing) this._startClock(); else this._stopClock();
    this._updateClockDisplay();
  }

  /** 彻底释放资源：组件卸载时调用 */
  destroy(): void {
    this._stopClock();
    this._cancelPendingXyAnim();
    if (this._interpRaf) { cancelAnimationFrame(this._interpRaf); this._interpRaf = null; }
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    if (this._waveAnimRaf) { cancelAnimationFrame(this._waveAnimRaf); this._waveAnimRaf = null; }
    if (this._posHalfAnimRaf) { cancelAnimationFrame(this._posHalfAnimRaf); this._posHalfAnimRaf = null; }
    this._clearThrowAnim();
    this._clearGoalFx();
    this._clearOffsideZone();
    this.onUpdate = null;
  }

  setRefs(refs: Record<string, SVGElement | null>): void {
    this.refs = refs;
    // React 重挂载后新 DOM 元素属性已重置，强制重绘控球半场遮罩
    this._posHalfTeam = null;
  }

  /** 启动/替换同名一次性动画，返回 token；旧循环与 timeout 据此失效 */
  _token(key: string): number {
    const v = (this._animTokens[key] || 0) + 1;
    this._animTokens[key] = v;
    return v;
  }

  _checkToken(key: string, v: number): boolean {
    return this._animTokens[key] === v;
  }

  // ---- 播放控制（replay 模式用） ----

  play(): void {
    if (this._mode === 'live') {
      this.playing = true;
      // pause 会取消插值循环；恢复播放时若有在途插值需重启
      if (this.ballFrom && this.ballTo) this._startBallInterpolation();
      // _startClock 会以当前时刻重新设置累加基准，暂停时长不会被计入
      if (this.timerRunning) this._startClock();
      this._notify();
      return;
    }
    if (this.t >= this.totalMs) this.seek(0); // 重播时重建事件游标与时钟状态
    this.playing = true; this.lastTs = null;
    if (this.timerRunning) this._startClock();
    this._frame(performance.now());
    this._needsNotify = true;
  }
  pause(): void {
    this.playing = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._interpRaf) { cancelAnimationFrame(this._interpRaf); this._interpRaf = null; }
    if (this.timerRunning) this._stopClock();
    this._notify();
  }
  toggle(): void { this.playing ? this.pause() : this.play(); }
  setSpeed(s: number): void { this.speed = s; this._notify(); }

  // =============================================================================
  // Replay 模式：rAF 驱动的时间推进
  // =============================================================================

  seek(ms: number): void {
    this.t = Math.max(0, Math.min(ms, this.totalMs));
    this.lastEvIdx = -1; this.pendingAnims = [];
    this.lastPossTeam = null; this.activeTooltip = null;
    this._clearGoalFx();
    for (let i = 0; i < this.events.length; i++) {
      if (this.events[i].t <= this.t) this.lastEvIdx = i; else break;
    }
    // 比分是累计值，seek 后必须从已发生的事件里重建，否则中场/终场遮罩会显示 0-0。
    let score = '0-0';
    for (let i = 0; i <= this.lastEvIdx; i++) {
      if (this.events[i].ss) score = this.events[i].ss;
    }
    this.score = score;
    // 拖动时间轴后按 live.js 的 Event 合并语义重建时钟状态
    this._restoreClockAt(this.lastEvIdx);
    this._rebuildShootoutAt(this.lastEvIdx);
    this._rebuildBreakAt(this.lastEvIdx);
    let lastBreakT = 0, lastPoss: string | null = null;
    for (let i = 0; i < this.events.length; i++) {
      if (this.events[i].t > this.t) break;
      const et = this.events[i].team;
      if (et !== 'neutral' && POSS_CODES.has(vcBase(this.events[i].vc))) {
        if (lastPoss && et !== lastPoss) lastBreakT = this.events[i].t;
        lastPoss = et;
      }
    }
    this.lastPossTeam = lastPoss;
    this.trailQ = [];
    for (const pt of this.posPts) {
      if (pt.t! <= this.t && pt.t! >= lastBreakT && this.trailQ.length < 4) {
        this.trailQ.push({ x: pt.x, y: pt.y });
      }
    }
    this.ballFrom = null; this.ballTo = null; this.ballStart = 0;
    let curIdx = -1;
    for (let i = this.posPts.length - 1; i >= 0; i--) {
      if (this.posPts[i].t! <= this.t) { curIdx = i; break; }
    }
    if (curIdx >= 0) {
      this.ballPos = { x: this.posPts[curIdx].x, y: this.posPts[curIdx].y };
      this.lastTpIdx = curIdx;
      this.lastTpTime = this.posPts[curIdx].t!;
    } else if (this.posPts.length > 0) {
      this.ballPos = { x: this.posPts[0].x, y: this.posPts[0].y };
      this.lastTpIdx = 0;
      this.lastTpTime = this.posPts[0].t!;
    } else {
      this.ballPos = { x: CENTER_FIELD.x, y: CENTER_FIELD.y };
      this.lastTpIdx = -1; this.lastTpTime = -1;
    }
    this._updatePossession();
    this._updateVCStatus();
    // Show/hide attack zone based on current VC (for timeline clicks)
    if (this.currentVC) {
      const vc = this.currentVC.vc;
      if (LiveTracker.DA_CODES.has(vcBase(vc)) || LiveTracker.ATTACK_CODES.has(vcBase(vc))) {
        const pos = this._eventPos(this.currentVC);
        if (pos) {
          this._useDefaultBall(pos);
          this._animAttackZone(pos, this.currentVC.team, LiveTracker.DA_CODES.has(vcBase(vc)));
          // 与实时播放一致：卡片锚定进攻球点并跟随球位（seek 后 ballPos 已还原）
          this._showTooltip(pos, this.currentVC, true, true, true);
        }
      } else if (POSS_CODES.has(vcBase(vc))) {
        // 控球：seek 后同样锚定球点并跟随球位，与实时播放一致
        const pos = this._eventPos(this.currentVC);
        if (pos) this._showTooltip(pos, this.currentVC, true, true, true);
      } else {
        this._zoneAnimData = null;
      }
    } else {
      this._zoneAnimData = null;
    }
    // Sector animations — clear or restart based on current VC
    this._clearThrowAnim();
    this._clearOffsideZone();
    if (this.currentVC) {
      const vcPos = this._eventPos(this.currentVC);
      if (vcPos) {
        if (LiveTracker.THROW_CODES.has(vcBase(this.currentVC.vc))) {
          this._animThrow(vcPos, this.currentVC);
          // 与实时播放一致：界外球卡片固定在球场中央
          this._showTooltip(CENTER_FIELD, this.currentVC);
        } else if (this.currentVC.info.cat === 'CORNER') {
          // 拖动时间轴回到角球：同样吸附角球点；卡片仍固定在球场中央
          const corner = this._cornerPos(this.currentVC, this._hasTrustedXy(this.currentVC) ? vcPos : null);
          this._animCorner(corner, this.currentVC);
          this._showTooltip(CENTER_FIELD, this.currentVC);
        } else if (this.currentVC.info.cat === 'FREE_KICK') {
          const spot = clampToField(vcPos.x, vcPos.y);
          this._animFKCorridor(spot, this.currentVC);
          // 与实时播放一致: 卡片锚定球点(默认站位或真实 XY), 居中于点位正上方
          this._showTooltip(spot, this.currentVC, true, true);
        } else if (this.currentVC.info.cat === 'PENALTY') {
          const pkBase = vcBase(this.currentVC.vc);
          if (pkBase === 21 || pkBase === 1008) {
            this._animFKCorridor(this._defaultPos(this.currentVC), this.currentVC);
          }
        } else if (this.currentVC.info.cat === 'OFFSIDE') {
          this._animOffside(this.currentVC);
        } else if (LiveTracker.GK_CODES.has(vcBase(this.currentVC.vc))) {
          // 球门球: 本方点球点起脚的扇形出球区(与实时播放一致)
          const spot = this._animGoalKickFan(this.currentVC);
          this._showTooltip(spot, this.currentVC, true, true);
        }
      }
    }
    this._applyAnimations();
    this._notify();
  }
  seekFrac(f: number): void { this.seek(f * this.totalMs); }

  _frame(now: number): void {
    if (!this.playing) return;
    if (this.lastTs !== null) {
      this.t += (now - this.lastTs) * this.speed;
      if (this.t >= this.totalMs) {
        this.t = this.totalMs;
        this._update(); // 触发时间戳恰好等于 totalMs 的末尾事件
        if (this.ballTo) this.ballPos = { ...this.ballTo }; // 播完即止,球直接落到最终位置
        this._applyAnimations();
        this.playing = false;
        this.raf = null;
        this._stopClock(); // 回放结束，时钟停在终场时间，不再继续累加
        this._notify();
        return;
      }
    }
    this.lastTs = now;
    this._update();
    this._applyAnimations();
    if (this._needsNotify) { this._notify(); this._needsNotify = false; }
    if (this.playing) this.raf = requestAnimationFrame(n => this._frame(n));
  }

  _update(): void {
    for (let i = this.lastEvIdx + 1; i < this.events.length; i++) {
      if (this.events[i].t <= this.t) {
        this.lastEvIdx = i;
        this._fire(this.events[i]);
        const evTeam = this.events[i].team;
        const isMovement = LiveTracker.DA_CODES.has(vcBase(this.events[i].vc)) || LiveTracker.ATTACK_CODES.has(vcBase(this.events[i].vc)) || POSS_CODES.has(vcBase(this.events[i].vc));
        if (isMovement) {
          if (evTeam !== 'neutral' && this.lastPossTeam && evTeam !== this.lastPossTeam) this.trailQ = [];
          if (evTeam !== 'neutral') this.lastPossTeam = evTeam;
        } else {
          // 静态事件：立即清空轨迹
          this.trailQ = [];
        }
      } else break;
    }
    this._updatePosition();
    this._updatePossession();
    this._updateVCStatus();
  }

  _updatePosition(): void {
    const t = this.t;
    let posIdx = -1;
    for (let i = this.posPts.length - 1; i >= 0; i--) {
      if (this.posPts[i].t! <= t) { posIdx = i; break; }
    }
    if (posIdx === -1 && this.posPts.length > 0) posIdx = 0;
    if (posIdx === -1) {
      while (this.pendingAnims.length > 0) {
        this._playEventAnim(this.pendingAnims.shift()!);
      }
      if (this.events.length > 0 && !this.ballPos) {
        this.ballPos = { x: CENTER_FIELD.x, y: CENTER_FIELD.y };
      }
      return;
    }

    const dst = this.posPts[posIdx];
    const now = performance.now();

    if (posIdx !== this.lastTpIdx && posIdx > this.lastTpIdx) {
      this.ballFrom = this.ballPos ? { ...this.ballPos } : { x: dst.x, y: dst.y };
      this.ballTo = { x: dst.x, y: dst.y };
      this.ballStart = now;
      // replay 模式插值时长随播放速度缩放，保证快进时球与事件同步
      this.ballDur = 400 / Math.max(this.speed, 0.1);
      this.lastTpIdx = posIdx;
      this.lastTpTime = dst.t!;
      this.trailQ.push({ x: dst.x, y: dst.y });
      if (this.trailQ.length > 4) this.trailQ.shift();
    }

    if (this.ballFrom && this.ballTo) {
      const elapsed = now - this.ballStart;
      if (elapsed >= this.ballDur) {
        this.ballPos = { x: this.ballTo.x, y: this.ballTo.y };
        this.ballFrom = null; this.ballTo = null;
        while (this.pendingAnims.length > 0) {
          this._playEventAnim(this.pendingAnims.shift()!);
        }
      } else {
        const p = easeIn(elapsed / this.ballDur);
        this.ballPos = {
          x: this.ballFrom.x + (this.ballTo.x - this.ballFrom.x) * p,
          y: this.ballFrom.y + (this.ballTo.y - this.ballFrom.y) * p
        };
      }
    } else {
      while (this.pendingAnims.length > 0) {
        this._playEventAnim(this.pendingAnims.shift()!);
      }
    }
  }

  // ---- 点球大战比分 ----

  /** 解析点球大战 PG（"1#0#1~0#1#1"）：'#' 分隔轮次，'1' 得分，'0' 射失。
   *  普通比赛里的 PG 是球员名，因此必须严格校验格式，返回 null 表示不是比分。 */
  static _parseShootoutPG(pg: string): { home: string[]; away: string[] } | null {
    if (!pg || !pg.includes('~')) return null;
    const [homeRaw, awayRaw] = pg.split('~');
    if (!/^[01#]*$/.test(homeRaw) || !/^[01#]*$/.test(awayRaw)) return null;
    const parse = (raw: string): string[] =>
      raw ? raw.split('#').filter((x) => x === '0' || x === '1') : [];
    return { home: parse(homeRaw), away: parse(awayRaw) };
  }

  /** 用 PG 合并点球大战比分。PG 可能滞后于进球事件、也可能与事件补记重复，
   *  所以只接受不短于当前列表的数据，保证轮次只增不减。 */
  _applyShootoutPG(pg: string): void {
    const parsed = LiveTracker._parseShootoutPG(pg);
    if (!parsed) return;
    if (!this._shootout) this._shootout = { home: [], away: [] };
    if (parsed.home.length >= this._shootout.home.length) this._shootout.home = parsed.home;
    if (parsed.away.length >= this._shootout.away.length) this._shootout.away = parsed.away;
  }

  /** 处理与点球大战有关的 VC 事件：开赛/终场、罚球前记 pending、命中/射失即时补记。
   *  普通比赛也可能出现 21/8/9，只有 1022 或合法比分 PG 已经激活点球大战时才生效。 */
  _applyShootoutEvent(ev: ProcessedEvent): void {
    const base = vcBase(ev.vc);
    if (ev.pg) this._applyShootoutPG(ev.pg);
    if (base === 1022) {
      if (!this._shootout) this._shootout = { home: [], away: [] };
      this._shootoutPending = null;
      return;
    }
    if (base === 2000) {
      // 终场：撤掉比分板
      this._shootout = null;
      this._shootoutPending = null;
      return;
    }
    const side = ev.team === 'home' ? 'home' : ev.team === 'away' ? 'away' : null;
    if (!side) return;
    if (base === 21) {
      // 开始罚球：记录该侧已有轮次，用于判断命中/射失事件是否已被 PG 计入
      if (this._shootout) this._shootoutPending = { side, len: this._shootout[side].length };
      return;
    }
    const pending = this._shootoutPending;
    const isGoal = base === 8;
    const isMiss = base === 9 || base === 1023;
    if (!pending || !this._shootout || pending.side !== side || !(isGoal || isMiss)) return;
    this._shootoutPending = null;
    // PG 已经带上这一轮（长度变化）时不重复追加；事件帧里的 PG 常常滞后一帧，
    // 此时用事件本身把结果补上，下一帧 PG 到达时再按"只增不减"合并。
    if (this._shootout[side].length === pending.len) {
      this._shootout[side].push(isGoal ? '1' : '0');
    }
  }

  /** seek/回放跳转后按已发生的事件重建点球大战状态。 */
  _rebuildShootoutAt(lastIdx: number): void {
    this._shootout = null;
    this._shootoutPending = null;
    for (let i = 0; i <= lastIdx && i < this.events.length; i++) {
      this._applyShootoutEvent(this.events[i]);
    }
  }

  _updateVCStatus(): void {
    let latestVC: ProcessedEvent | null = null;
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].t <= this.t) { latestVC = this.events[i]; break; }
    }
    if (latestVC) {
      this.currentVC = latestVC;
      if (vcBase(latestVC.vc) === 1357) this.currentPG = '';
    }
    for (let i = this.trackPts.length - 1; i >= 0; i--) {
      if (this.trackPts[i].t <= this.t && this.trackPts[i].pg) {
        this.currentPG = this.trackPts[i].pg; break;
      }
    }
  }

  /** Replay 模式：事件入队，等球到达位置后播放 */
  _fire(ev: ProcessedEvent): void {
    this.currentVC = ev;
    if (vcBase(ev.vc) === 1357) this.currentPG = '';
    else if (ev.pg) this.currentPG = ev.pg;
    this._applyShootoutEvent(ev);
    this.activeTooltip = null;
    if (ev.ss) this.score = ev.ss;
    this._syncClock(ev);
    if (vcBase(ev.vc) === 1015) this.statusText = 'HALF TIME';
    if (vcBase(ev.vc) === 1017) this.statusText = 'FULL TIME';
    if (vcBase(ev.vc) === 1016) this.statusText = '2ND HALF';
    // VC=2000 是终场控制事件：快照最后一条常是它而不是 1017
    if (vcBase(ev.vc) === 2000) this.statusText = 'FULL TIME';
    // 中场/终场事件本身必须停表：服务端 clockRunning 若滞后（终场后仍为 true），
    // 也不能让时钟继续走过 90 分钟
    const vcCode = vcBase(ev.vc);
    // 1019/1021 = 加时中场 / 加时结束：与中场、终场一样必须停表
    if (vcCode === 1015 || vcCode === 1017 || vcCode === 1019 || vcCode === 1021 || vcCode === 2000) {
      this._setTimerRunning(false);
      this._updateClockDisplay();
    }
    // 加时中场(1019)与常规半场一样弹出统计遮罩, 加时下半场开球(1020)再退出
    if (vcCode === 1015 || vcCode === 1019) this._setBreak('half', ev);
    else if (vcCode === 1017 || vcCode === 2000) this._setBreak('full', ev);
    else if (LiveTracker.PERIOD_START_CODES.has(vcCode) || vcCode === 1022) this._clearBreak();
    // 进攻/危险进攻区域 — 显示并保持到 VC 改变
    const isAttackOrDA = LiveTracker.DA_CODES.has(vcBase(ev.vc)) || LiveTracker.ATTACK_CODES.has(vcBase(ev.vc));
    if (isAttackOrDA) {
      const pos = this._eventPos(ev);
      if (pos) this._animAttackZone(pos, ev.team, LiveTracker.DA_CODES.has(vcBase(ev.vc)));
    } else {
      this._zoneAnimData = null;
    }
    // 非定位球事件清除扇形动画
    if (!LiveTracker.THROW_CODES.has(vcBase(ev.vc)) && ev.info.cat !== 'CORNER' && ev.info.cat !== 'FREE_KICK' && ev.info.cat !== 'PENALTY') this._clearThrowAnim();
    this.pendingAnims.push(ev);
    this._needsNotify = true;
  }

  // =============================================================================
  // 事件动画分发
  // =============================================================================

  /** 危险进攻 VC 集合（基础码） */
  static DA_CODES = new Set([1000, 1300]);
  /** 进攻 VC 集合（基础码） */
  static ATTACK_CODES = new Set([1001, 1301]);
  /** 重新开球的比赛阶段 VC：开球 / 下半场 / 加时开球 / 加时下半场 */
  /** 源时钟读数允许落后当前显示的最大幅度：超过即视为复用了旧阶段字段（中场 0:00）。 */
  static CLOCK_TOLERANCE_MS = 2 * 60 * 1000;
  static PERIOD_START_CODES = new Set([1014, 1016, 1018, 1020]);
  /** 停表的比赛阶段 VC：中场 / 全场 / 加时中场 / 加时结束 / terminal 2000 */
  static PERIOD_END_CODES = new Set([1015, 1017, 1019, 1021, 2000]);
  /** 球门球 VC 集合（基础码） */
  static GK_CODES = new Set([1007]);
  /** 球门球开球点允许的最大偏移（距本方球门线 ~13m，覆盖小禁区+定位误差） */
  /** 界外球 VC 集合（基础码）：1024 直接界外球 / 1237 区域界外球，点位与动画统一处理 */
  static THROW_CODES = new Set([1024, 1237]);
  /** 直接任意球 VC 集合(基础码；可直接射门 → 走廊拉到球门 + 波纹;其余任意球走廊截短) */
  static DIRECT_FK_CODES = new Set([1009]);
  /** 普通任意球扇形半张角(弧度), 与角球扇形一致的圆弧画法; 取 10° 使弧顶曲率与角球相当 */
  static FK_HALF_ANGLE = 0.175;
  /** 界外球扇形半张角(比球门球略宽) */
  static THROW_HALF_ANGLE = 0.4;
  /** 球门球扇形半张角: 比任意球(10°)更开, 显示门将长传的覆盖范围 */
  static GK_HALF_ANGLE = 0.32;
  /** live: 定位球 VC 与 XY 分两条消息到达时的等待窗口(ms)。
   *  只对定位球等位置敏感的动画生效；进攻/危险进攻/控球的卡片跟球移动、色块只按方向绘制，
   * 等待没有收益，反而会让"整场没有位置数据"的比赛每个事件白闪 150ms。
   *  超时则用回填/默认站位播放。 */
  static XY_WAIT_MS = 150;
  /** 回填球位超过该时长(ms)即视为陈旧：不能用它当事件点（有的比赛两次带 XY 的定位球相隔 20+ 分钟） */
  static XY_STALE_MS = 30_000;
  /** live 下超过该时长(ms)没有新的真实 XY 就隐藏皮球，避免球冻结在上一脚任意球的位置 */
  static BALL_STALE_MS = 45_000;
  /** 同一类定位球连续这么多次等不到 XY 后熔断 */
  static XY_BREAK_AFTER = 3;
  /** 熔断时长(ms)：期间该类定位球不再等待，直接按默认站位播放 */
  static XY_BREAK_MS = 120_000;

  /** 高频运动事件（进攻 / 危险进攻 / 控球）：tooltip 不显示分钟时间 */
  static isMotionEvent(vc: number): boolean {
    const base = vcBase(vc);
    return LiveTracker.DA_CODES.has(base) || LiveTracker.ATTACK_CODES.has(base) || POSS_CODES.has(base);
  }

  /**
   * 角球球点（viewBox 内场单位）：主队攻右、客队攻左，取进攻半场的两个角点之一。
   * 有 XY 时吸附到最近的一个角点 —— feed 坐标常落在角球区附近但不精确；
   * 无 XY 时按事件做确定性伪随机，保证回放 / 拖动时间轴时不会在两个角之间跳。
   */
  _cornerPos(ev: ProcessedEvent, xy?: PositionPoint | null): PositionPoint {
    const isAway = ev.team === 'away';
    const isHome = ev.team === 'home';
    const top = isAway ? CORNER_TL : CORNER_TR;
    const bottom = isAway ? CORNER_BL : CORNER_BR;
    // 只有真实 XY（自带/伴侣）才吸附角点；陈旧回填点会让角球吸到十几分钟前的角落
    const p = xy ?? (this._hasTrustedXy(ev) && ev.xy ? xyPos(ev.xy) : null);
    if (p) {
      // 中立角球（VC 无球队前缀）没有"对方半场"可判，直接吸到最近的四角之一
      if (!isHome && !isAway) {
        let best = CORNER_TL;
        let bestD = Infinity;
        for (const c of [CORNER_TL, CORNER_TR, CORNER_BL, CORNER_BR]) {
          const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
          if (d < bestD) { bestD = d; best = c; }
        }
        return best;
      }
      const dTop = (p.x - top.x) ** 2 + (p.y - top.y) ** 2;
      const dBottom = (p.x - bottom.x) ** 2 + (p.y - bottom.y) ** 2;
      return dTop <= dBottom ? top : bottom;
    }
    const h = Math.imul((ev.t | 0) + 1, 2654435761) ^ Math.imul(ev.vc + 1, 40503);
    if (!isHome && !isAway) {
      return [CORNER_TL, CORNER_TR, CORNER_BL, CORNER_BR][(h >>> 8) & 3];
    }
    return ((h >>> 8) & 1) === 0 ? top : bottom;
  }

  /** 无 XY 时按事件类型/球队取默认坐标 */
  _defaultPos(ev: ProcessedEvent): PositionPoint {
    const isHome = ev.team === 'home';
    const { cat } = ev.info;
    const vc = ev.vc;

    if (cat === 'CORNER') return this._cornerPos(ev);
    // 界外球(1024/1237): 对齐 live.js —— 无位置帧时主队 0.75,1、客队 0.25,1（下边线）
    if (LiveTracker.THROW_CODES.has(vcBase(vc))) {
      return xyPos(isHome ? '0.75,1' : '0.25,1')!;
    }
    // 以下默认站位全部用归一化坐标(经单应矩阵映射),保证透视下位置正确
    if (cat === 'PENALTY') {
      // 点球点距球门线 11m: nx = (105-11)/105 ≈ 0.895
      return xyPos(isHome ? '0.895,0.5' : '0.105,0.5')!;
    }
    if (LiveTracker.GK_CODES.has(vcBase(vc))) {
      // 球门球: 点位取本方点球点(距门线 11m)。主队向右进攻, 主队在本方左侧半场, 客队反之。
      return xyPos(isHome ? '0.105,0.5' : '0.895,0.5')!;
    }
    if (cat === 'FREE_KICK') {
      // 无 XY 时的默认任意球站位(距中线约 5m):
      // 直接任意球(危险)在本方中场靠前一点, 普通任意球在本方中场后一点。
      // 主队向右进攻、客队向左, 两档 nx 互为镜像。
      const direct = LiveTracker.DIRECT_FK_CODES.has(vcBase(vc));
      const ahead = isHome ? 0.55 : 0.45;
      const behind = isHome ? 0.45 : 0.55;
      return xyPos(`${direct ? ahead : behind},0.5`)!;
    }
    if (cat === 'SHOT') {
      return xyPos(isHome ? '0.8,0.5' : '0.2,0.5')!;
    }
    // 无 XY 时的默认进攻站位: 过半场 20%(进攻) / 40%(危险进攻), 均在中线纵向居中。
    // 主队向右进攻、客队向左, 两档 nx 互为镜像。
    if (LiveTracker.ATTACK_CODES.has(vcBase(vc))) {
      return xyPos(isHome ? '0.6,0.5' : '0.4,0.5')!;
    }
    if (LiveTracker.DA_CODES.has(vcBase(vc))) {
      return xyPos(isHome ? '0.7,0.5' : '0.3,0.5')!;
    }
    return CENTER_FIELD;
  }

  _playEventAnim(ev: ProcessedEvent): void {
    // VC=2000 是终场控制事件，没有动画内容，不弹“比赛事件”提示
    if (vcBase(ev.vc) === 2000) { this._clearGoalFx(); this._clearOffsideZone(); return; }
    // 上一球的特写卡片刻度较长(2s)，新事件开始时立即收掉，避免遮挡后续动画
    this._clearGoalFx();
    // 越位虚线/灰色区域只属于当前事件，新事件开始时收掉
    this._clearOffsideZone();
    const { cat } = ev.info;
    // 陈旧的"回填球位"不是事件点：定位球退回默认站位，运动战/静态事件按类别兜底
    const pos = this._eventPos(ev);
    if (!pos) return;
    const staleBackfill = ev.xySrc === 'backfill' && ev.xyAgeMs != null && ev.xyAgeMs > LiveTracker.XY_STALE_MS;

    // ---- 进球 ----
    if (cat === 'GOAL') {
      this._animGoal(pos, ev);
      this._showTooltip(CENTER_FIELD, ev);
      return;
    }
    // ---- 射门 ----
    if (cat === 'SHOT') { this._showResultCam(ev); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 黄牌 / 红牌 ----
    if (cat === 'YELLOW_CARD') { this._showResultCam(ev); this._animCard(pos, '#ffeb3b'); this._showTooltip(CENTER_FIELD, ev); return; }
    if (cat === 'RED_CARD') { this._showResultCam(ev); this._animCard(pos, '#f85149'); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 角球 ----
    if (cat === 'CORNER') {
      const corner = this._cornerPos(ev);
      this._animCorner(corner, ev);
      // 角球卡片固定在球场中央（与默认 tooltip 位置一致）
      this._showTooltip(CENTER_FIELD, ev);
      return;
    }
    // ---- 任意球 ----
    if (cat === 'FREE_KICK') {
      this._clearThrowAnim();
      // feed 偶有越界坐标(如 110,41): 与扇形顶点一样夹到球场内, 卡片才不会飘到场外
      const spot = clampToField(pos.x, pos.y);
      this._animPulse(spot, '#ff9800', 667, 30);
      this._animFKCorridor(spot, ev);
      // 任意球卡片统一锚定球点(有/无 XY 都跟随), 居中于点位正上方
      this._showTooltip(spot, ev, true, true);
      return;
    }
    // ---- 点球 ----
    if (cat === 'PENALTY') {
      // 命中/射失/点球大战都是静态信息: 只显示专用特写图 + 提示, 不画场上动画;
      // 只有罚球前(21/1008)保留与直接任意球相同的射门走廊, 顶点固定在点球点。
      this._showResultCam(ev);
      const base = vcBase(ev.vc);
      if (base === 21 || base === 1008) {
        const spot = this._defaultPos(ev);
        this._animPulse(spot, '#ffd700', 1000, 60);
        this._animPulse(spot, '#ffd700', 1000, 35, 200);
        this._clearThrowAnim();
        this._animFKCorridor(spot, ev);
      } else {
        // 收掉此前可能仍在播放的走廊/点位
        this._clearThrowAnim();
      }
      this._showTooltip(CENTER_FIELD, ev);
      return;
    }
    // ---- 伤病 ----
    if (cat === 'INJURY') { this._showResultCam(ev); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 越位 ----
    if (cat === 'OFFSIDE') { this._animOffside(ev); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 换人 ----
    // 换人只保留静态特写图和提示, 不做场上文字闪现
    if (cat === 'SUBSTITUTION') { this._showResultCam(ev); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 危险进攻 / 进攻 (zone triggered in _fire / _fireLive) ----
    if (LiveTracker.DA_CODES.has(vcBase(ev.vc)) || LiveTracker.ATTACK_CODES.has(vcBase(ev.vc))) {
      // 无可靠球位时用默认进攻点（过半场 20% / 40%）作为球点，卡片随之锚定。
      this._useDefaultBall(pos);
      // 卡片锚定在进攻球点正上方，并随后续 XY 消息跟随球移动（不再固定在球场中央）。
      // 球位已陈旧时不跟随：否则卡片会跳到二十分钟前那脚任意球的旧点。
      this._showTooltip(pos, ev, true, true, !staleBackfill);
      return;
    }
    // ---- 控球 (DA/进攻码已在上面的分支处理) ----
    if (POSS_CODES.has(vcBase(ev.vc))) {
      // 控球卡片同样锚定球点正上方，并随球位持续移动
      this._showTooltip(pos, ev, true, true, !staleBackfill);
      return;
    }
    // ---- 球门球 ----
    if (LiveTracker.GK_CODES.has(vcBase(ev.vc))) {
      // 卡片锚定在本方点球点正上方, 避免居中的卡片压住扇形弧顶
      const spot = this._animGoalKickFan(ev);
      this._showTooltip(spot, ev, true, true);
      return;
    }
    // ---- VAR ----
    if (cat === 'VAR') { this._showResultCam(ev); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 半场 / 全场 ----
    // 有统计遮罩时不再弹中场/终场事件卡（对齐 bet365 的 DisplayingHalfTimeStats）。
    if (vcBase(ev.vc) === 1015 || vcBase(ev.vc) === 1017) {
      if (this._break) return;
      this._animFlash(); this._showTooltip(CENTER_FIELD, ev); return;
    }
    // ---- 界外球 ----
    if (LiveTracker.THROW_CODES.has(vcBase(ev.vc))) { this._animThrow(pos, ev); this._showTooltip(CENTER_FIELD, ev); return; }

    this._showTooltip(pos, ev);
  }

  // =============================================================================
  // SVG 动画
  // =============================================================================

  /**
   * 进球：幽灵球从射门位置飞入网窝 → 门线闪光 → 球队色冲击涟漪 + 速度线。
   *
   * 旧实现以网窝为圆心把光环扩到 r=500/720, 远超球场尺寸(≈875×213), 会被 SVG
   * 视口裁成跨看台的巨弧。这里所有光效都以球门为中心且半径 ≤78 内部单位,
   * 只保留球门附近的可读反馈; 整场白闪仍留给半场/终场。
   *
   * 起点优先用事件 XY; 无 XY 或 XY 落在本方半场(数据异常)时回退到最近球位,
   * 再退回点球点, 避免出现反向球路。动画本身是瞬态的, 由 'goal' token 控制。
   */
  _animGoal(pos: PositionPoint, ev: ProcessedEvent): void {
    const r = this.refs;
    if (!r.goalTrail || !r.goalBall || !r.goalLineFlash || !r.goalImpact ||
        !r.goalRing1 || !r.goalRing2) return;
    const trail = r.goalTrail as SVGPathElement;
    const ball = r.goalBall;
    const lineFlash = r.goalLineFlash;
    const impact = r.goalImpact;
    const ring1 = r.goalRing1;
    const ring2 = r.goalRing2;

    const isHome = ev.team === 'home';
    const color = isHome ? '#fff' : '#ffd43b';
    const goal = isHome ? GOAL_RIGHT : GOAL_LEFT;
    const goalLine = xyPos(isHome ? '1,0.5' : '0,0.5')!;
    const penalty = xyPos(isHome ? '0.84,0.5' : '0.16,0.5')!;
    const inAttackingHalf = (p: PositionPoint) =>
      isHome ? p.x > CENTER_FIELD.x : p.x < CENTER_FIELD.x;

    const now = performance.now();
    const pickOrigin = (p: PositionPoint): PositionPoint => {
      let o = p;
      if (!inAttackingHalf(o)) {
        if (this.ballPos && inAttackingHalf(this.ballPos)) o = this.ballPos;
        else o = penalty;
      }
      o = clampToField(o.x, o.y);
      // 起点几乎贴到网窝时退回点球点, 保证有一段可见的飞行轨迹
      if (Math.hypot(goal.x - o.x, goal.y - o.y) < 24) {
        o = clampToField(penalty.x, penalty.y);
      }
      return o;
    };

    let origin = pickOrigin(pos);
    let length = 0;
    const layout = (s: PositionPoint) => {
      origin = pickOrigin(s);
      const ctrl = {
        x: (origin.x + goal.x) / 2,
        // 弧顶最多抬到场地内 8px, 避免球路画到草皮外
        y: Math.max(FIELD_TOP + 8, Math.min(origin.y, goal.y) - 30),
      };
      trail.setAttribute('d', `M${origin.x},${origin.y} Q${ctrl.x},${ctrl.y} ${goal.x},${goal.y}`);
      length = trail.getTotalLength();
    };

    // 同一进球的迟到 XY: 只重锚球路, 不重启时间轴
    if (this._goalAnim && this._goalAnim.vcT === ev.t && now < this._goalAnim.endAt) {
      this._goalAnim.relayout(pos);
      return;
    }

    this._clearGoalFx();
    this._goalCelebrating = true;
    const tok = this._token('goal');

    // ---------------------------------------------------------------------
    // Goal close-up: a vector goal scene drawn over the centre of the pitch.
    // It does not depend on XY/homography, so it stays reliable when the
    // event has no coordinates. Home goals fly left→right; away goals mirror
    // only the goal/ball scene, keeping the team + GOAL type upright.
    // ---------------------------------------------------------------------
    const camRoot = r.goalCam;
    const camScene = r.goalCamScene;
    const camBall = r.goalCamBall;
    const camBallTex = r.goalCamBallTex;
    const camArc = r.goalCamArc as SVGPathElement | null;
    const camBurst = r.goalCamBurst;
    const camGlow = r.goalCamGlow;
    const camNetPath = r.goalCamNetPath as SVGPathElement | null;
    const camFrame = r.goalCamFrame;
    const camPop = r.goalCamPop;
    const camCore = r.goalCamCore;
    const camGhosts = [r.goalCamGhost0, r.goalCamGhost1, r.goalCamGhost2];
    const camTrail = r.goalCamTrail as SVGPathElement | null;
    const camGlowStops = [r.goalCamGlowStop0, r.goalCamGlowStop1, r.goalCamGlowStop2];
    const camSpeeds = [r.goalCamSpeed0, r.goalCamSpeed1, r.goalCamSpeed2, r.goalCamSpeed3, r.goalCamSpeed4];
    const camWordGroup = r.goalCamWordGroup;
    const camWord = r.goalCamWord;
    const camWordGlow = r.goalCamWordGlow;
    const camTextFlash = r.goalCamTextFlash;
    const camRays = Array.from({ length: 12 }, (_, i) => r['goalCamRay' + i]);
    const camReady = !!(camRoot && camScene && camBall && camArc && camBurst && camGlow &&
      camNetPath && camFrame && camWordGroup);

    // Net geometry in close-up coordinates. The rear frame is narrower than the
    // mouth, which keeps every mesh line inside the goal. The mesh is rebuilt
    // each frame; the impact pulls the mesh inward toward the ball like a
    // gravity well, so the net tightens instead of turning sparse. The net is
    // fixed on all four sides, so the edge mask goes to zero at every border.
    const NET_X0 = 53, NET_X1 = 157, NET_Y0 = 44, NET_Y1 = 88;
    const NET_HIT_X = 100, NET_HIT_Y = 66;
    const NET_COLS = 28, NET_ROWS = 20;
    const netPath = (impulse: number, dragP = 0): string => {
      const amp = -0.6 * impulse;
      // The pocket is narrower across than it is deep, so the dragged area
      // trails toward the back of the goal.
      const sigX2 = 2 * 19 * 19;
      const sigY2 = 2 * 31 * 31;
      let d = '';
      const map = (x: number, y: number) => {
        const nx = (x - NET_X0) / (NET_X1 - NET_X0);
        const ny = (y - NET_Y0) / (NET_Y1 - NET_Y0);
        // 0 on all four sides, 1 in the middle: boundary points never move.
        const edge = Math.sin(Math.PI * nx) ** 2 * Math.sin(Math.PI * ny) ** 2;
        const dx = x - NET_HIT_X;
        const dy = y - NET_HIT_Y;
        const f = Math.exp(-(dx * dx) / sigX2 - (dy * dy) / sigY2) * edge;
        const s = 1 + amp * f;
        // A touch of permanent sag makes the net feel hung, not printed; it is
        // anchored at the edges as well.
        const sag = 0.5 * Math.sin(Math.PI * nx) * edge * (0.75 + 0.25 * impulse);
        // Drag the contact patch toward the back of the goal along the shot
        // direction (up and to the right in this right-of-centre view). The
        // flatter falloff (f^0.85) lets the surrounding mesh stretch with the
        // pocket instead of snapping around a small, rigid disc.
        const pull = Math.pow(f, 0.85);
        const dragY = 15 * dragP * pull;
        const dragX = 5 * dragP * pull;
        return {
          x: NET_HIT_X + dx * s + dragX,
          y: NET_HIT_Y + dy * s + sag - dragY,
        };
      };
      // Dense 28 × 20 grid: the close-up is scaled down, so a coarse mesh
      // reads as a loose scaffold rather than netting.
      for (let i = 0; i <= NET_COLS; i++) {
        const x = NET_X0 + ((NET_X1 - NET_X0) * i) / NET_COLS;
        for (let j = 0; j <= NET_ROWS; j++) {
          const p = map(x, NET_Y0 + ((NET_Y1 - NET_Y0) * j) / NET_ROWS);
          d += `${j === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
        }
      }
      for (let j = 0; j <= NET_ROWS; j++) {
        const y = NET_Y0 + ((NET_Y1 - NET_Y0) * j) / NET_ROWS;
        for (let i = 0; i <= NET_COLS; i++) {
          const p = map(NET_X0 + ((NET_X1 - NET_X0) * i) / NET_COLS, y);
          d += `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
        }
      }
      return d;
    };

    if (camReady) {
      camRoot!.setAttribute('opacity', '0');
      camRoot!.setAttribute('transform', '');
      // Mirror the goal/ball scene for away goals; the type stays upright.
      camScene!.setAttribute('transform', isHome ? '' : 'translate(200,0) scale(-1,1)');
      camBurst!.setAttribute('stroke', color);
      for (const s of camGlowStops) { if (s) s.setAttribute('stop-color', color); }
      camNetPath!.setAttribute('d', netPath(0));
      camNetPath!.setAttribute('stroke', '#eaf7ff');
      camNetPath!.setAttribute('stroke-opacity', '0.42');
      if (camFrame) camFrame.setAttribute('transform', '');
      if (camPop) camPop.setAttribute('transform', 'translate(100,60) scale(0.93) translate(-100,-60)');
      if (camCore) camCore.setAttribute('opacity', '0');
      if (camBall) {
        camBall.setAttribute('opacity', '0');
        camBall.setAttribute('transform', 'translate(12,116) rotate(0)');
      }
      for (const g of camGhosts) { if (g) g.setAttribute('opacity', '0'); }
      if (camTrail) {
        camTrail.setAttribute('d', '');
        camTrail.setAttribute('opacity', '0');
        camTrail.setAttribute('stroke', color);
      }
      for (const s of camSpeeds) { if (s) { s.setAttribute('stroke', color); s.setAttribute('opacity', '0'); } }

      // Team identity lives in the HTML badge under the goal; here we only
      // colour the GOAL typography.
      if (camWord) camWord.setAttribute('fill', color);
      if (camWordGlow) camWordGlow.setAttribute('fill', color);
      for (let i = 0; i < camRays.length; i++) {
        const ray = camRays[i];
        if (!ray) continue;
        ray.setAttribute('stroke', i % 2 === 0 ? '#fff' : color);
        ray.setAttribute('opacity', '0');
        ray.setAttribute('x2', '100');
        ray.setAttribute('y2', '33');
      }
      if (camWordGroup) { camWordGroup.setAttribute('opacity', '0'); camWordGroup.setAttribute('transform', ''); }
      if (camTextFlash) { camTextFlash.setAttribute('r', '0'); camTextFlash.setAttribute('opacity', '0'); }
    }
    const camLen = camReady ? camArc!.getTotalLength() : 0;
    const camPoint = (u: number): { x: number; y: number } => {
      const p = Math.max(0, Math.min(1, u));
      if (camLen > 0) {
        const pt = camArc!.getPointAtLength(camLen * p);
        return { x: pt.x, y: pt.y };
      }
      // Fallback: straight line into the net.
      return { x: 12 + 92 * p, y: 116 - 32 * p };
    };
    const GHOST_OP = [0.4, 0.26, 0.14];
    const CAM_SPEED_ANGLES = [140, 160, 180, 205, 225];

    // The close-up replaces the field-level goal FX; only fall back to the
    // old field animation when a host does not provide the close-up refs.
    const speeds: Array<{ el: SVGElement; angle: number; len: number }> = [];
    if (!camReady) {
      trail.setAttribute('stroke', color);
      trail.setAttribute('opacity', '0');
      layout(origin);

      ball.setAttribute('r', '6');
      ball.setAttribute('fill', '#fff');
      ball.setAttribute('stroke', color);
      ball.setAttribute('opacity', '1');
      ball.setAttribute('cx', String(origin.x));
      ball.setAttribute('cy', String(origin.y));

      const far = isHome ? POST_RIGHT_FAR : POST_LEFT_FAR;
      const near = isHome ? POST_RIGHT_NEAR : POST_LEFT_NEAR;
      lineFlash.setAttribute('x1', String(far.x));
      lineFlash.setAttribute('y1', String(far.y));
      lineFlash.setAttribute('x2', String(near.x));
      lineFlash.setAttribute('y2', String(near.y));
      lineFlash.setAttribute('stroke', color);
      lineFlash.setAttribute('opacity', '0');

      for (const ring of [impact, ring1, ring2]) {
        ring.setAttribute('cx', String(goal.x));
        ring.setAttribute('cy', String(goal.y));
        ring.setAttribute('stroke', color);
        ring.setAttribute('r', '0');
        ring.setAttribute('opacity', '0');
      }

      // 速度线: 从门线中心向场内放射。主队向右进攻 → 朝左(140°~220°),
      // 客队反之( -40°~40° ); 长度 44~60, 不会越过球门区。
      const baseAngles = isHome ? [220, 200, 180, 160, 140] : [-40, -20, 0, 20, 40];
      for (let i = 0; i < 5; i++) {
        const el = r['goalSpeed' + i];
        if (!el) continue;
        el.setAttribute('stroke', color);
        el.setAttribute('opacity', '0');
        speeds.push({ el, angle: baseAngles[i], len: 44 + (i % 3) * 8 });
      }
    }

    const t0 = performance.now();
    // The shot + impact animate for ~2s, then the close-up holds in its final
    // state (spinning ball, deformed net, GOAL type) until the next event.
    const FLIGHT = 520;
    const CAM_IN = 220;
    const CAM_FLIGHT = 380;
    const CAM_FLIGHT_DUR = 460;
    const CAM_IMPACT = CAM_FLIGHT + CAM_FLIGHT_DUR; // 840ms
    const CAM_OUT = 1940;
    this._goalAnim = { vcT: ev.t, endAt: Number.POSITIVE_INFINITY, relayout: layout };
    const step = () => {
      if (!this._checkToken('goal', tok)) return;
      const el = performance.now() - t0;

      if (!camReady) {
      // 球路: 140ms 淡入, 到网后 80ms 开始淡出
      const fadeIn = Math.min(1, el / 140);
      const fadeOut = el <= FLIGHT + 80 ? 1 : Math.max(0, 1 - (el - FLIGHT - 80) / 260);
      trail.setAttribute('opacity', String(0.85 * Math.min(fadeIn, fadeOut)));
      trail.setAttribute('stroke-dashoffset', String(-el * 0.06));

      // 幽灵球: 0–520ms 沿弧线加速入网, 到达后 160ms 消失
      const travel = Math.max(0, Math.min(1, el / FLIGHT));
      const pt = trail.getPointAtLength(length * easeIn(travel));
      ball.setAttribute('cx', String(pt.x));
      ball.setAttribute('cy', String(pt.y));
      ball.setAttribute('r', String(6 - 2 * easeIn(travel)));
      const ballFade = el < FLIGHT + 40 ? 1 : Math.max(0, 1 - (el - FLIGHT - 40) / 160);
      ball.setAttribute('opacity', String(ballFade));

      // 门线闪光: 460–760ms
      const lf = Math.max(0, Math.min(1, (el - 460) / 300));
      lineFlash.setAttribute('opacity', String(el < 460 ? 0 : 1 - lf));

      // 网窝冲击: 500–780ms, 小半径白环
      const ip = Math.max(0, Math.min(1, (el - 500) / 280));
      impact.setAttribute('r', String(6 + ip * 38));
      impact.setAttribute('opacity', String(el < 500 ? 0 : 0.95 * (1 - ip)));

      // 球队色涟漪: 500ms 起, 半径上限 78/56
      const p1 = Math.max(0, Math.min(1, (el - 500) / 760));
      ring1.setAttribute('r', String(8 + p1 * 70));
      ring1.setAttribute('opacity', String(el < 500 ? 0 : 0.9 * (1 - p1)));

      const p2 = Math.max(0, Math.min(1, (el - 580) / 640));
      ring2.setAttribute('r', String(4 + p2 * 52));
      ring2.setAttribute('opacity', String(el < 580 ? 0 : 0.65 * (1 - p2)));

      // 速度线: 520ms 起, 每条错开 30ms
      for (let i = 0; i < speeds.length; i++) {
        const s = speeds[i];
        const start = 520 + i * 30;
        const sp = Math.max(0, Math.min(1, (el - start) / 380));
        if (el < start) { s.el.setAttribute('opacity', '0'); continue; }
        const len = s.len * easeOut(sp);
        const rad = (s.angle * Math.PI) / 180;
        s.el.setAttribute('x1', String(goalLine.x));
        s.el.setAttribute('y1', String(goalLine.y));
        s.el.setAttribute('x2', String(goalLine.x + Math.cos(rad) * len));
        s.el.setAttribute('y2', String(goalLine.y + Math.sin(rad) * len));
        s.el.setAttribute('opacity', String(0.9 * (1 - sp)));
      }
      }

      // ---- Goal close-up -----------------------------------------------
      if (camReady) {
        const camIn = Math.max(0, Math.min(1, (el - CAM_IN) / 260));
        camRoot!.setAttribute('opacity', String(camIn));

        // Scene eases in from 0.93 → 1.0 around its centre.
        const pop = Math.max(0, Math.min(1, (el - CAM_IN) / 260));
        if (camPop) {
          camPop.setAttribute('transform',
            `translate(100,60) scale(${(0.93 + 0.07 * easeOut(pop)).toFixed(3)}) translate(-100,-60)`);
        }

        // Spinning football: fade in, fly into the middle of the net, then stay
        // at the impact point and keep spinning while the net holds its shape.
        const ballOn = el < CAM_FLIGHT - 40 ? 0
          : el < CAM_FLIGHT ? (el - (CAM_FLIGHT - 40)) / 40
            : 1;
        const flightFx = el < CAM_IMPACT ? 1 : Math.max(0, 1 - (el - CAM_IMPACT) / 120);
        const travel = Math.max(0, Math.min(1, (el - CAM_FLIGHT) / CAM_FLIGHT_DUR));
        // Constant-ish speed reads as a struck shot (the field trail uses easeIn
        // because it animates the original kick; this is the close-up cut).
        const setT = travel;
        const pt = camPoint(setT);
        // Freeze the contact point after the impact, but keep the ball rolling.
        // The pattern scrolls diagonally at 45° inside the silhouette, so the
        // ball reads as spinning along the shot's direction rather than flat.
        const texSpeed = el > CAM_IMPACT ? (el - CAM_IMPACT) * 1.05 : 0;
        const texPhase = ((setT * 1450 + texSpeed) % 200 + 200) % 200;
        if (camBallTex) {
          camBallTex.setAttribute('transform',
            `rotate(45) translate(0,${(-texPhase).toFixed(2)})`);
        }
        if (camBall) {
          camBall.setAttribute('transform',
            `translate(${pt.x.toFixed(2)},${pt.y.toFixed(2)})`);
          camBall.setAttribute('opacity', String(ballOn));
        }
        if (camTrail) {
          // Short motion streak behind the ball; it fades out at contact so the
          // resting ball is not left with a frozen trail.
          const tail = camPoint(Math.max(0, setT - 0.16));
          camTrail.setAttribute('d',
            `M${tail.x.toFixed(2)},${tail.y.toFixed(2)}L${pt.x.toFixed(2)},${pt.y.toFixed(2)}`);
          camTrail.setAttribute('opacity', String(ballOn * flightFx * 0.4));
        }

        for (let i = 0; i < camGhosts.length; i++) {
          const g = camGhosts[i];
          if (!g) continue;
          const gu = setT - (i + 1) * 0.055;
          if (el < CAM_FLIGHT || gu <= 0.02) { g.setAttribute('opacity', '0'); continue; }
          const gp = camPoint(gu);
          g.setAttribute('cx', String(gp.x));
          g.setAttribute('cy', String(gp.y));
          g.setAttribute('opacity', String(ballOn * flightFx * (GHOST_OP[i] ?? 0)));
        }

        // Impact: ring + team-colored glow + crisp white core.
        const imp = Math.max(0, Math.min(1, (el - CAM_IMPACT) / 420));
        camBurst!.setAttribute('r', String(2 + imp * 19));
        camBurst!.setAttribute('opacity', String(el < CAM_IMPACT ? 0 : 0.95 * (1 - imp)));
        camGlow!.setAttribute('opacity', String(
          el < CAM_IMPACT ? 0 : 0.4 * Math.max(0, 1 - (el - CAM_IMPACT) / 450)));
        if (camCore) {
          const coreP = Math.max(0, Math.min(1, (el - CAM_IMPACT) / 210));
          camCore.setAttribute('r', String(3 + coreP * 6));
          camCore.setAttribute('opacity', String(el < CAM_IMPACT ? 0 : 0.95 * (1 - coreP)));
        }

        // Net: one smooth outward bulge that settles under the ball's weight,
        // plus a team-colored flash. No sine oscillation, so the mesh deforms
        // instead of jittering.
        const netHit = el < CAM_IMPACT ? 0 : Math.max(0, 1 - (el - CAM_IMPACT) / 320);
        const netDt = Math.max(0, el - CAM_IMPACT);
        // Contraction leads; the backward drag builds over the next ~300ms so
        // the pocket keeps travelling into the goal instead of freezing at
        // contact. Both use smoothstep, with no oscillation.
        const bulgeIn = Math.min(1, netDt / 170);
        const bulge = el < CAM_IMPACT ? 0
          : bulgeIn * bulgeIn * (3 - 2 * bulgeIn)
            * (0.92 + 0.08 * (1 - Math.exp(-netDt / 500)));
        const dragIn = Math.min(1, netDt / 280);
        const dragRise = dragIn * dragIn * (3 - 2 * dragIn);
        // A single soft overshoot, then a slow relax: the mesh is tugged past
        // its resting point and settles back without oscillating.
        const dragSettle = Math.min(1, Math.max(0, netDt - 280) / 900);
        const dragRelax = dragSettle * dragSettle * (3 - 2 * dragSettle);
        const dragP = el < CAM_IMPACT ? 0
          : dragRise * (1 + 0.14 * (1 - dragRelax))
            * (0.94 + 0.06 * (1 - Math.exp(-netDt / 700)));
        if (camNetPath) {
          camNetPath.setAttribute('stroke', netHit > 0.01 ? color : '#eaf7ff');
          camNetPath.setAttribute('stroke-opacity', String(0.42 + 0.33 * netHit));
          if (el >= CAM_IMPACT && el <= CAM_OUT) {
            camNetPath.setAttribute('d', netPath(bulge, dragP));
          }
        }

        // Short radial speed lines from the impact point (mirrors with the scene).
        for (let i = 0; i < camSpeeds.length; i++) {
          const s = camSpeeds[i];
          if (!s) continue;
          const start = CAM_IMPACT + i * 14;
          const sp = Math.max(0, Math.min(1, (el - start) / 380));
          if (el < start) { s.setAttribute('opacity', '0'); continue; }
          const ang = ((CAM_SPEED_ANGLES[i] ?? 180) * Math.PI) / 180;
          const len = (12 + (i % 3) * 6) * easeOut(sp);
          s.setAttribute('x2', String(100 + Math.cos(ang) * len));
          s.setAttribute('y2', String(66 + Math.sin(ang) * len));
          s.setAttribute('opacity', String(0.95 * (1 - sp)));
        }

        // Team + GOAL explosion, timed to the net impact.
        const wordP = Math.max(0, Math.min(1, (el - CAM_IMPACT) / 420));
        const back = wordP <= 0 ? 0
          : 1 + 3.4 * Math.pow(wordP - 1, 3) + 2.4 * Math.pow(wordP - 1, 2);
        // Settle at 1× and hold: GOAL no longer pulses once it has landed.
        const wordScale = wordP >= 1 ? 1 : 0.35 + 0.65 * back;
        if (camWordGroup) {
          camWordGroup.setAttribute('opacity', String(Math.min(1, Math.max(0, (el - CAM_IMPACT) / 90))));
          camWordGroup.setAttribute('transform',
            `translate(100,33) scale(${wordScale.toFixed(3)}) translate(-100,-33)`);
        }
        if (camWordGlow) {
          const glowIn = Math.max(0, Math.min(1, (el - CAM_IMPACT) / 240));
          camWordGlow.setAttribute('opacity',
            String(el < CAM_IMPACT ? 0 : 0.8 * (glowIn * glowIn * (3 - 2 * glowIn))));
        }
        if (camTextFlash) {
          const flashP = Math.max(0, Math.min(1, (el - CAM_IMPACT) / 260));
          camTextFlash.setAttribute('r', String(4 + flashP * 54));
          camTextFlash.setAttribute('opacity', String(el < CAM_IMPACT ? 0 : 0.55 * (1 - flashP)));
        }
        // Fireworks keep bursting while the close-up rests: each cycle the rays
        // shoot out, fade, then a new burst starts from the GOAL centre. The
        // GOAL text itself stays static.
        const FW_PERIOD = 900;
        const fwElapsed = Math.max(0, el - CAM_IMPACT);
        const fwCycle = Math.floor(fwElapsed / FW_PERIOD);
        const fwPhase = (fwElapsed % FW_PERIOD) / FW_PERIOD;
        const fwP = Math.min(1, fwPhase / 0.88);
        for (let i = 0; i < camRays.length; i++) {
          const ray = camRays[i];
          if (!ray) continue;
          if (el < CAM_IMPACT) { ray.setAttribute('opacity', '0'); continue; }
          // Rotate and vary each new burst a little so it reads as fireworks
          // rather than a looping mechanical star.
          const ang = ((i * 30 - 90) * Math.PI) / 180 + fwCycle * 0.16;
          const vary = 1 + 0.12 * Math.sin(fwCycle * 1.7 + i * 0.9);
          const len = (16 + (i % 3) * 9) * easeOut(fwP) * vary;
          ray.setAttribute('x2', String(100 + Math.cos(ang) * len));
          ray.setAttribute('y2', String(33 + Math.sin(ang) * len));
          ray.setAttribute('opacity', String(0.9 * (1 - fwP)));
        }
      }

      // Keep the final close-up on screen until _clearGoalFx is called by the
      // next event (or by seek/destroy). The ball keeps spinning meanwhile.
      requestAnimationFrame(step);
    };
    step();
  }

  /** 清掉进球瞬态动画(球路/幽灵球/门线/冲击环/速度线/特写卡片) */
  _clearGoalFx(): void {
    this._token('goal');
    this._goalAnim = null;
    this._goalCelebrating = false;
    this._clearResultCam();
    const r = this.refs;
    if (r.goalTrail) { r.goalTrail.setAttribute('opacity', '0'); r.goalTrail.setAttribute('d', ''); }
    if (r.goalBall) r.goalBall.setAttribute('opacity', '0');
    if (r.goalLineFlash) r.goalLineFlash.setAttribute('opacity', '0');
    if (r.goalImpact) r.goalImpact.setAttribute('opacity', '0');
    if (r.goalRing1) r.goalRing1.setAttribute('opacity', '0');
    if (r.goalRing2) r.goalRing2.setAttribute('opacity', '0');
    for (let i = 0; i < 5; i++) {
      const el = r['goalSpeed' + i];
      if (el) el.setAttribute('opacity', '0');
    }
    // Centred goal close-up (kept last so a seek clears it even mid-flight)
    if (r.goalCam) r.goalCam.setAttribute('opacity', '0');
    if (r.goalCamScene) r.goalCamScene.setAttribute('transform', '');
    if (r.goalCamBall) {
      r.goalCamBall.setAttribute('opacity', '0');
      r.goalCamBall.setAttribute('transform', '');
    }
    if (r.goalCamBallTex) r.goalCamBallTex.setAttribute('transform', 'rotate(45) translate(0,0)');
    if (r.goalCamBurst) r.goalCamBurst.setAttribute('opacity', '0');
    if (r.goalCamGlow) r.goalCamGlow.setAttribute('opacity', '0');
    if (r.goalCamNetPath) {
      r.goalCamNetPath.setAttribute('d', '');
      r.goalCamNetPath.setAttribute('stroke', '#eaf7ff');
      r.goalCamNetPath.setAttribute('stroke-opacity', '0.42');
    }
    if (r.goalCamFrame) r.goalCamFrame.setAttribute('transform', '');
    if (r.goalCamPop) r.goalCamPop.setAttribute('transform', '');
    if (r.goalCamCore) r.goalCamCore.setAttribute('opacity', '0');
    if (r.goalCamTextFlash) {
      r.goalCamTextFlash.setAttribute('r', '0');
      r.goalCamTextFlash.setAttribute('opacity', '0');
    }
    if (r.goalCamWordGroup) {
      r.goalCamWordGroup.setAttribute('opacity', '0');
      r.goalCamWordGroup.setAttribute('transform', '');
    }
    if (r.goalCamWord) r.goalCamWord.setAttribute('fill', '#fff');
    if (r.goalCamWordGlow) r.goalCamWordGlow.setAttribute('fill', '#fff');
    if (r.goalCamTrail) {
      r.goalCamTrail.setAttribute('d', '');
      r.goalCamTrail.setAttribute('opacity', '0');
    }
    for (let i = 0; i < 3; i++) {
      const el = r['goalCamGhost' + i];
      if (el) el.setAttribute('opacity', '0');
    }
    for (let i = 0; i < 5; i++) {
      const el = r['goalCamSpeed' + i];
      if (el) el.setAttribute('opacity', '0');
    }
    for (let i = 0; i < 12; i++) {
      const el = r['goalCamRay' + i];
      if (el) {
        el.setAttribute('opacity', '0');
        el.setAttribute('x2', '100');
        el.setAttribute('y2', '33');
      }
    }
  }

  /**
   * Static result close-up: hide the drawn goal scene and show the supplied
   * illustration instead — shot on/off target or penalty scored/missed.
   * Like the goal close-up it stays on screen next to the tooltip until the
   * next event clears it (_clearGoalFx).
   */
  _showResultCam(ev: ProcessedEvent): void {
    this._clearResultCam();
    const base = vcBase(ev.vc);
    let art: MatchState['closeupArt'] = null;
    if (base === 1011) art = 'shot_on';
    else if (base === 1012) art = 'shot_off';
    else if (base === 8) art = 'penalty_goal';
    else if (base === 9 || base === 1023) art = 'penalty_miss';
    else if (base === 1022) art = 'penalty_period';
    else if (base === 1005) art = 'yellow_card';
    else if (base === 1006) art = 'red_card';
    else if (base === 1025) art = 'injury';
    else if (base === 1242 || base === 1325 || (base >= 1330 && base <= 1333) || (base >= 1345 && base <= 1350)) art = 'var';
    else if (base === 1013 || base === 1238) art = 'substitution';
    if (!art) return;
    const r = this.refs;
    if (!r.goalCam || !r.goalCamScene) return;
    r.goalCam.setAttribute('opacity', '1');
    r.goalCamScene.setAttribute('transform', ev.team === 'away' ? 'translate(200,0) scale(-1,1)' : '');
    if (r.goalCamWordGroup) r.goalCamWordGroup.setAttribute('opacity', '0');
    if (r.goalCamBall) r.goalCamBall.setAttribute('opacity', '0');
    if (r.goalCamNetPath) r.goalCamNetPath.setAttribute('d', '');
    this.closeupArt = art;
    this._needsNotify = true;
    this._notify();
  }

  _clearResultCam(): void {
    this.closeupArt = null;
  }

  /**
   * 定位球球点: 黄点 + 呼吸光晕循环。
   * 运行中重复调用仅热更新位置/存续条件, 相位不重置(live XY 频繁更新时不闪烁)。
   */
  _startDotGlowLoop(rawPos: PositionPoint, persistCheck: () => boolean): void {
    const r = this.refs;
    // 与走廊顶点一致地夹到场内：feed 越界坐标(如 110,41)不能把光点画到广告牌上
    const pos = clampToField(rawPos.x, rawPos.y);
    this._dotGlowPos = pos;
    this._dotGlowPersist = persistCheck;
    if (this._throwGlowRaf) return; // 已在运行: 位置热更新即可
    if (!r.throwDotGlow || !r.throwDotGlowGrad || !r.throwDot) return;
    r.throwDotGlowGrad.setAttribute('cx', String(pos.x));
    r.throwDotGlowGrad.setAttribute('cy', String(pos.y));
    r.throwDotGlow.setAttribute('cx', String(pos.x));
    r.throwDotGlow.setAttribute('cy', String(pos.y));

    const glowStart = performance.now();
    const GLOW_CYCLE_MS = 667; // 原 40 帧 @60fps
    const glowStep = () => {
      this._throwGlowRaf = null;
      const p = this._dotGlowPos;
      if (!p || !this._dotGlowPersist || !this._dotGlowPersist()) {
        r.throwDot!.setAttribute('opacity', '0');
        r.throwDotGlow!.setAttribute('opacity', '0');
        return;
      }
      const s = ((performance.now() - glowStart) % GLOW_CYCLE_MS) / GLOW_CYCLE_MS * 40;
      r.throwDot!.setAttribute('cx', String(p.x));
      r.throwDot!.setAttribute('cy', String(p.y));
      r.throwDot!.setAttribute('r', '4');
      r.throwDot!.setAttribute('opacity', '1');
      const pulse = 1 + Math.sin(s * Math.PI / 20) * 0.25;
      r.throwDotGlowGrad!.setAttribute('cx', String(p.x));
      r.throwDotGlowGrad!.setAttribute('cy', String(p.y));
      r.throwDotGlow!.setAttribute('cx', String(p.x));
      r.throwDotGlow!.setAttribute('cy', String(p.y));
      r.throwDotGlow!.setAttribute('r', String(7 * pulse));
      r.throwDotGlow!.setAttribute('opacity', String(0.3 + Math.sin(s * Math.PI / 20) * 0.2));
      this._throwGlowRaf = requestAnimationFrame(glowStep);
    };
    this._throwGlowRaf = requestAnimationFrame(glowStep);
  }

  _animThrow(pos: PositionPoint, ev: ProcessedEvent): void {
    const r = this.refs;
    if (!r.fkCorridor) return;
    this._clearThrowAnim();

    // 球点已经由 _eventPos 给出（1024/1237 都按 live.js 吸附到上/下边线）。
    // 场平面上的浅绿扇形指向对方点球点，逐点经单应矩阵投影，远端会被透视压扁。
    // 长度按到指向点的距离取 60%，并限制在 12～28m，避免靠近底线的界外球扇形过短。
    const aim = xyPos(ev.team === 'home' ? '0.895,0.5' : '0.105,0.5') ??
      (ev.team === 'home' ? GOAL_RIGHT : GOAL_LEFT);
    const a = viewToXY(pos.x * INNER_SCALE, pos.y * INNER_SCALE);
    const b = viewToXY(aim.x * INNER_SCALE, aim.y * INNER_SCALE);
    const lenToAim = Math.hypot(
      (b.x - a.x) * PITCH_LENGTH_M,
      (b.y - a.y) * PITCH_WIDTH_M,
    ) || 1;
    this._drawForwardFan(pos, ev, Math.min(28, Math.max(12, lenToAim * 0.6)), {
      aim,
      halfAngle: LiveTracker.THROW_HALF_ANGLE,
      gray: true,
      fill: 'url(#throwGradSimple)',
      perspective: true,
      shortenGoalArm: true,
    });
  }

  _clearThrowAnim(): void {
    if (this._throwGlowRaf) { cancelAnimationFrame(this._throwGlowRaf); this._throwGlowRaf = null; }
    this._dotGlowPos = null;
    this._dotGlowPersist = null;
    this._fkGeo = null;
    this._stopFKWave();
    const r = this.refs;
    if (r.throwDot) r.throwDot.setAttribute('opacity', '0');
    if (r.throwDotGlow) r.throwDotGlow.setAttribute('opacity', '0');
    if (r.fkCorridor) r.fkCorridor.setAttribute('opacity', '0');
    if (r.cornerFan) r.cornerFan.setAttribute('opacity', '0');
    if (this._cornerWaveRaf) { cancelAnimationFrame(this._cornerWaveRaf); this._cornerWaveRaf = null; }
    this._cornerFanGeo = null;
    if (r.cornerFanWave) r.cornerFanWave.setAttribute('opacity', '0');
    // Restore ball visibility
    if (r.ballGroup) r.ballGroup.setAttribute('opacity', this.ballPos ? '1' : '0.7');
  }

  _animCard(pos: PositionPoint, color: string): void {
    const r = this.refs;
    if (!r.cardAnim || !r.cardRect) return;
    const cardAnim = r.cardAnim, cardRect = r.cardRect;
    cardRect.setAttribute('x', String(pos.x - 14)); cardRect.setAttribute('y', String(pos.y - 30));
    cardRect.setAttribute('fill', color);
    cardAnim.setAttribute('opacity', '1');
    const tok = this._token('card');
    const y0 = pos.y - 30;
    const start = performance.now();
    const DUR = 667; // 原 40 帧 @60fps
    const anim = () => {
      if (!this._checkToken('card', tok)) return;
      const p = Math.min(1, (performance.now() - start) / DUR);
      cardRect.setAttribute('y', String(y0 - 60 * p));
      cardAnim.setAttribute('opacity', String(Math.max(0, 1 - p * 1.2)));
      if (p < 1) requestAnimationFrame(anim);
      else cardAnim.setAttribute('opacity', '0');
    };
    anim();
  }

  _animCorner(pos: PositionPoint, ev: ProcessedEvent): void {
    this._clearThrowAnim();

    // 场上主效果：从角球点射向"点球点 — 门线"区域的扇形放射区域
    this._showCornerFan(pos, ev);
    // 角球点呼吸光晕,与任意球球点使用同一套(黄点 + 呼吸光晕)
    this._startDotGlowLoop(pos, () =>
      !!(this.currentVC && this.currentVC.info.cat === 'CORNER')
    );
  }

  /**
   * 角球扇形放射区域：上、下四个角统一为近端(下角)的"透视大扇形"观感。
   * 张角直接在场平面定义：以门线为基准, 门线一侧留约 1/12 象限、边线一侧留约 1/5 象限,
   * 即约 64° 的扇形; 上角镜像后与下角完全一致, 仅朝向不同。
   * 场平面半径按"外弧中点的屏幕长度等于统一参考长度 R"二分反解, 使四个角在屏幕上长度一致。
   * 上角两条直边再各自按"镜像下角同角度边的屏幕长度 × 0.8"反解半径缩放, 避免远端被透视
   * 拉长、整体偏大; 外弧在两条边之间按角度线性过渡半径。
   * 外弧沿场平面采样后逐点投影 —— 场平面圆经透视后是椭圆, 直接画屏幕圆弧会与草坪走向脱节。
   * 目标端由角球点所在半场决定，而不是由球队决定：角球只可能攻向角球所在那一端的球门，
   * 否则（如中立队随机到右角球却按球队取左侧目标）扇形会横穿全场指向另一侧禁区。
   */
  _showCornerFan(pos: PositionPoint, ev: ProcessedEvent): void {
    const r = this.refs;
    const fan = r.cornerFan;
    if (!fan) return;

    const attacksRight = pos.x > CENTER_FIELD.x;
    const spot = xyPos(attacksRight ? '0.895,0.5' : '0.105,0.5');
    if (!spot) return;

    // 长度参考角点：同一端的远端(上角)到点球点的屏幕距离。
    // 四个角共用同一屏幕长度, 下角(近景)不会因透视被放大成横跨禁区的巨扇。
    const refCorner = attacksRight ? CORNER_TR : CORNER_TL;
    const R = Math.hypot(spot.x - refCorner.x, spot.y - refCorner.y);
    if (R < 2) return;

    const cu = attacksRight ? 1 : 0;
    const cv = pos.y > CENTER_FIELD.y ? 1 : 0;

    // 场平面张角：门线方向朝场内转过 8% 象限后开始张开, 到 79% 象限处收边。
    // 四点镜像一致, 上角因此与下角呈现同样的大扇形(约 64°), 且保持在场地内。
    const quadrant = Math.PI / 2;
    const goalAngle = cv === 0 ? Math.PI / 2 : -Math.PI / 2; // 门线方向
    const dir = (cv === 0 ? 1 : -1) * (cu === 1 ? 1 : -1); // 由门线转向场内(边线侧)
    const phi1 = goalAngle + dir * quadrant * 0.08;
    const phi2 = goalAngle + dir * quadrant * 0.79;

    // 沿某条边二分求场平面半径, 使该边端点到角点的屏幕距离等于目标值(viewBox 单位)。
    const target = R * INNER_SCALE; // 圆弧半径(内部单位) → viewBox
    const solveRadius = (cvv: number, phi: number, tgt: number): number => {
      const apex = xyView(cu, cvv);
      let lo = 0;
      let hi = 0.8;
      for (let i = 0; i < 32; i++) {
        const mid = (lo + hi) / 2;
        const p = xyView(cu + Math.cos(phi) * mid, cvv + Math.sin(phi) * mid);
        if (Math.hypot(p.x - apex.x, p.y - apex.y) < tgt) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    };

    // 中轴取张角平分线, 先解出参考半径 rho(外弧中点屏幕长度 = R)。
    const bisector = (phi1 + phi2) / 2;
    const rho = solveRadius(cv, bisector, target);

    // 远端(上角)经透视后, 沿边线方向的直边被拉长到近端同角度边的 1.4 倍左右, 扇形"甩"得太远。
    // 以镜像的近端(下角)两条直边的屏幕长度为目标并整体收小 TOP_EDGE_SCALE,
    // 分别反解 phi1/phi2 两条边的半径缩放 k1/k2; 近端下角保持 k=1。
    // 外弧在两条边之间按角度线性过渡半径。
    const TOP_EDGE_SCALE = 0.8;
    let k1 = 1;
    let k2 = 1;
    if (cv === 0) {
      const bPhi1 = -Math.PI / 2 - dir * quadrant * 0.08;
      const bPhi2 = -Math.PI / 2 - dir * quadrant * 0.79;
      const bRho = solveRadius(1, (bPhi1 + bPhi2) / 2, target);
      const apexB = xyView(cu, 1);
      const edgeLen = (phi: number, r: number): number => {
        const p = xyView(cu + Math.cos(phi) * r, 1 + Math.sin(phi) * r);
        return Math.hypot(p.x - apexB.x, p.y - apexB.y);
      };
      k1 = solveRadius(0, phi1, edgeLen(bPhi1, bRho) * TOP_EDGE_SCALE) / rho;
      k2 = solveRadius(0, phi2, edgeLen(bPhi2, bRho) * TOP_EDGE_SCALE) / rho;
    }

    const geo = { x: pos.x, y: pos.y, cu, cv, rho, phi1, phi2, k1, k2, bulge: 0, bnX: 0, bnY: 0 };
    // 视觉弧度补偿：上角(远端)的场平面圆弧经透视压缩后几乎呈直线(矢高 < 1% 弦长),
    // 与下角的明显弧线观感不一致。这里保证外弧矢高至少达到弦长的 MIN_SAG_RATIO,
    // 沿弦的外法线方向(背离顶点)补足差额; 下角本身已超过该比例, 不受影响。
    const MIN_SAG_RATIO = 0.12;
    const basePts = this._fanArcPoints(geo, rho);
    const e0 = basePts[0], e1 = basePts[basePts.length - 1], mid = basePts[basePts.length >> 1];
    const chordDx = e1.x - e0.x, chordDy = e1.y - e0.y;
    const chordLen = Math.hypot(chordDx, chordDy);
    if (chordLen > 1) {
      let bnX = -chordDy / chordLen, bnY = chordDx / chordLen;
      const cx = (e0.x + e1.x) / 2, cy = (e0.y + e1.y) / 2;
      if ((cx - pos.x) * bnX + (cy - pos.y) * bnY < 0) { bnX = -bnX; bnY = -bnY; }
      const sag = (mid.x - cx) * bnX + (mid.y - cy) * bnY;
      geo.bulge = Math.max(0, MIN_SAG_RATIO * chordLen - sag);
      geo.bnX = bnX;
      geo.bnY = bnY;
    }
    this._cornerFanGeo = geo;

    fan.setAttribute('d', this._fanPath(pos, this._fanArcPoints(geo, rho)));

    // 放射渐变：顶点近乎透明、外弧最亮；主客队统一使用浅灰底色
    const color = FAN_COLORS.gray;
    const grad = r.cornerFanGrad;
    if (grad) {
      grad.setAttribute('cx', String(pos.x));
      grad.setAttribute('cy', String(pos.y));
      grad.setAttribute('r', String(R));
      grad.querySelectorAll('stop').forEach((s) => s.setAttribute('stop-color', color));
    }
    fan.setAttribute('opacity', '1');

    // 存下扇形几何供放射律动波带复用
    this._startCornerFanWave();
  }

  /**
   * 场平面圆弧(圆心 cu,cv，参考半径 r)从 phi1 到 phi2 的投影采样点(内部单位)。
   * 两条边的半径按 geo.k1/k2 相对 r 缩放、并随角度线性过渡，因此外弧可以是非正圆的扇形边。
   * geo.bulge 为视觉弧度补偿，按 r/rho 随半径线性缩放，波带内外沿与扇形外弧保持一致。
   */
  _fanArcPoints(geo: NonNullable<LiveTracker['_cornerFanGeo']>, r: number, n = 24): PositionPoint[] {
    let d = geo.phi2 - geo.phi1;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    const pts: PositionPoint[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const phi = geo.phi1 + d * t;
      const rr = r * (geo.k1 + (geo.k2 - geo.k1) * t);
      const v = xyView(geo.cu + rr * Math.cos(phi), geo.cv + rr * Math.sin(phi));
      let x = v.x / INNER_SCALE;
      let y = v.y / INNER_SCALE;
      if (geo.bulge) {
        const f = (r / geo.rho) * Math.sin(t * Math.PI);
        x += geo.bnX * geo.bulge * f;
        y += geo.bnY * geo.bulge * f;
      }
      pts.push({ x, y });
    }
    return pts;
  }

  /** 顶点 + 采样弧点构成的扇形/波带路径。 */
  _fanPath(apex: PositionPoint, pts: PositionPoint[]): string {
    const seg = pts.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return `M ${apex.x.toFixed(1)},${apex.y.toFixed(1)} ${seg} Z`;
  }

  /**
   * 角球扇形放射律动：一条与扇形同角度范围的波带从角球点沿半径向外推出，
   * 到外弧处淡出，循环往复，形成"发射"的节奏。运行中重复调用仅热更新几何。
   */
  _startCornerFanWave(): void {
    if (this._cornerWaveRaf) return;
    const r = this.refs;
    const wave = r.cornerFanWave;
    if (!wave) return;
    const WAVE_MS = 1200;
    const BAND = 0.3; // 带宽(占扇形半径比例)
    const start = performance.now();
    const step = () => {
      this._cornerWaveRaf = null;
      const geo = this._cornerFanGeo;
      if (!geo || !(this.currentVC && this.currentVC.info.cat === 'CORNER')) {
        wave.setAttribute('opacity', '0');
        return;
      }
      const phase = ((performance.now() - start) % WAVE_MS) / WAVE_MS;
      const s = easeOut(phase) * (1 + BAND) - BAND; // 带从顶点进入, 越过外弧后完全离开
      const s0 = Math.max(0, s);
      const s1 = Math.min(1, s + BAND);
      if (s1 > 0 && s0 < 1) {
        // 波带内外沿同样是场平面圆的投影, 随透视贴合草坪
        const outPts = this._fanArcPoints(geo, geo.rho * s1, 18);
        const inPts = this._fanArcPoints(geo, geo.rho * s0, 18);
        const pts = outPts.concat(inPts.reverse());
        wave.setAttribute(
          'd',
          `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} ` +
            pts.slice(1).map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
            ' Z'
        );
        wave.setAttribute('opacity', String(Math.sin(phase * Math.PI) * 0.45));
      } else {
        wave.setAttribute('opacity', '0');
      }
      this._cornerWaveRaf = requestAnimationFrame(step);
    };
    this._cornerWaveRaf = requestAnimationFrame(step);
  }

  /** 任意球/球门球共用同一扇形走廊(wave/球点光晕的存续判定) */
  _fkActive(): boolean {
    const vc = this.currentVC;
    if (!vc) return false;
    const base = vcBase(vc.vc);
    // 界外球与球门球共用同一套扇形/波纹，持续性判断同步覆盖；
    // 点球/即将罚点球(21/1008)也走这条走廊, 需要同样的持续判定。
    return vc.info.cat === 'FREE_KICK' || base === 21 || base === 1008 ||
      LiveTracker.GK_CODES.has(base) ||
      LiveTracker.THROW_CODES.has(base);
  }

  /**
   * 任意球 — 透视"威胁走廊": 以任意球点为顶点、两条边瞄准对方两根门柱的三角形区域,
   * 门柱点经单应矩阵映射, 天然带透视。
   * 直接任意球(11009/21009)走廊直达球门线, 开口即两门柱张角。
   * 普通任意球指向小禁区: 场地平面上是以球点为圆心、半张角 FK_HALF_ANGLE 的圆扇形,
   * 中轴指向两门柱中点; 弧顶与两条边都按场平面采样后经单应矩阵逐点投影,
   * 因此远端(上边线)的扇形会被透视压扁、近端(下边线)更舒展, 而不是屏幕上的正圆弧。
   * 长度取到小禁区线前沿距离的 82%(短于直接球且不贴线)。两者都带向球门推进的波纹带。
   * 无真实 XY 时使用 _defaultPos 的默认站位(普通球在本方中场后、直接球在中场靠前)照常绘制走廊;
   * 后续真实 XY 到达时(live XY 更新路径)只换几何, 波纹/光晕相位不重置。
   * 注意: 本函数不含 _clearThrowAnim() — 新 VC 触发由 _playEventAnim 先清场,
   * live XY 热更新走同一入口但只换几何, 不打断循环。
   */
  _animFKCorridor(pos: PositionPoint, ev: ProcessedEvent): void {
    this._startDotGlowLoop(pos, () => this._fkActive());
    const r = this.refs;
    if (!r.fkCorridor) return;
    const isHome = ev.team === 'home';
    const postFar = isHome ? POST_RIGHT_FAR : POST_LEFT_FAR;
    const postNear = isHome ? POST_RIGHT_NEAR : POST_LEFT_NEAR;
    // 点球(21/1008)也走"顶点→两门柱"的直边走廊, 顶点是点球点
    const base = vcBase(ev.vc);
    const direct = LiveTracker.DIRECT_FK_CODES.has(base) || base === 21 || base === 1008;
    const apex = clampToField(pos.x, pos.y);
    let far = postFar;
    let near = postNear;
    let fan: FKFanGeo | undefined;
    let arcPts: PositionPoint[] | null = null;
    if (!direct) {
      // 普通球: 扇形在场地平面上是圆扇形, 顶点为球点、中轴指向小禁区;
      // 半径截到小禁区线前(上下限与旧实现一致), 用米制坐标保证张角是真实角度。
      const a = viewToXY(apex.x * INNER_SCALE, apex.y * INNER_SCALE);
      const ax = a.x * PITCH_LENGTH_M, ay = a.y * PITCH_WIDTH_M;
      const gx = (isHome ? 1 : 0) * PITCH_LENGTH_M, gy = 0.5 * PITCH_WIDTH_M;
      const lenToGoal = Math.hypot(gx - ax, gy - ay) || 1;
      const phiC = Math.atan2(gy - ay, gx - ax);
      const frontLineX = (isHome ? 0.947619 : 0.052381) * PITCH_LENGTH_M; // 小禁区线
      const along = Math.cos(phiC);
      const tFront = Math.abs(along) > 1e-6 ? (frontLineX - ax) / along : lenToGoal;
      const lenToFront = Math.max(0, tFront);
      const rho = Math.min(lenToGoal, Math.max(lenToGoal * 0.25, lenToFront * 0.82));
      fan = {
        ax, ay, rho,
        phi1: phiC - LiveTracker.FK_HALF_ANGLE,
        phi2: phiC + LiveTracker.FK_HALF_ANGLE,
      };
      const N = 18;
      arcPts = [];
      for (let i = 0; i <= N; i++) {
        arcPts.push(this._fkFanPoint(fan, rho, fan.phi1 + (fan.phi2 - fan.phi1) * (i / N)));
      }
      far = arcPts[0];
      near = arcPts[arcPts.length - 1];
    }
    // 直接球保持"顶点→两门柱"的三角形; 普通球顶边是逐点投影后的圆弧折线
    let arcR: number | null = null;
    let sweep = 0;
    this._fkGeo = { apex, far, near, direct, arcR, sweep, fan };
    const d = arcPts
      ? `M ${apex.x},${apex.y}` + arcPts.map((p) => ` L ${p.x},${p.y}`).join('') + ' Z'
      : `M ${apex.x},${apex.y} L ${far.x},${far.y} L ${near.x},${near.y} Z`;
    r.fkCorridor.setAttribute('d', d);
    // 直接任意球红 / 间接任意球黄
    r.fkCorridor.setAttribute('fill', direct ? 'url(#fkGradDirect)' : 'url(#fkGradSimple)');
    r.fkCorridor.setAttribute('opacity', '1');
    if (r.fkWave) r.fkWave.setAttribute('fill', direct ? FAN_WAVE_COLORS.red : FAN_WAVE_COLORS.yellow);
    const gx = String((far.x + near.x) / 2), gy = String((far.y + near.y) / 2);
    for (const g of [r.fkGradDirect, r.fkGradSimple]) {
      if (!g) continue;
      g.setAttribute('x1', String(apex.x));
      g.setAttribute('y1', String(apex.y));
      g.setAttribute('x2', gx);
      g.setAttribute('y2', gy);
    }
    this._startFKWave();
  }

  /** 场地平面(米)极坐标点; 两条边半径可不同(rho/rho2), radius 统一按比例缩放。 */
  _fkFanPitch(fan: FKFanGeo, radius: number, phi: number): PositionPoint {
    const rho2 = fan.rho2 ?? fan.rho;
    const t = fan.phi2 === fan.phi1 ? 0 : (phi - fan.phi1) / (fan.phi2 - fan.phi1);
    const base = fan.rho + (rho2 - fan.rho) * t;
    const rr = base * (radius / fan.rho);
    return { x: fan.ax + rr * Math.cos(phi), y: fan.ay + rr * Math.sin(phi) };
  }

  /** 场地平面米制点 → 内部单位屏幕坐标(经单应矩阵投影) */
  _pitchToScreen(px: number, py: number): PositionPoint {
    const v = xyView(px / PITCH_LENGTH_M, py / PITCH_WIDTH_M);
    return { x: v.x / INNER_SCALE, y: v.y / INNER_SCALE };
  }

  /** 场平面极坐标 → 内部单位屏幕坐标。
   *  两条边半径可不同(rho/rho2), radius 统一按比例缩放, 便于波纹带复用同一几何。 */
  _fkFanPoint(fan: FKFanGeo, radius: number, phi: number): PositionPoint {
    const p = this._fkFanPitch(fan, radius, phi);
    return this._pitchToScreen(p.x, p.y);
  }

  /** 让弧线更平缓: 保持两端点不动, 把中间点按比例 k 拉向两端点连线(k=0 圆弧, k=1 直弦)。
   *  调用方应在场地平面内调用、再投影, 保证形状始终是地面曲线的透视像。 */
  _flattenArc(pts: PositionPoint[], k: number): PositionPoint[] {
    if (k <= 0 || pts.length < 3) return pts;
    const p0 = pts[0];
    const pN = pts[pts.length - 1];
    return pts.map((p, i) => {
      if (i === 0 || i === pts.length - 1) return p;
      const t = i / (pts.length - 1);
      const cx = p0.x + (pN.x - p0.x) * t;
      const cy = p0.y + (pN.y - p0.y) * t;
      return { x: p.x + (cx - p.x) * k, y: p.y + (cy - p.y) * k };
    });
  }

  /** 走廊波纹带: 高亮区域沿走廊从球点向球门循环推进(1400ms, easeOut)。已运行时不重启, 几何由 _fkGeo 热更新。 */
  _startFKWave(): void {
    if (this._fkWaveRaf) return;
    const r = this.refs;
    if (!r.fkWave) return;
    const wave = r.fkWave;
    const WAVE_MS = 1400;
    const BAND = 0.3; // 带宽(占走廊全长比例)
    const start = performance.now();
    const step = () => {
      this._fkWaveRaf = null;
      const geo = this._fkGeo;
      if (!geo || !this._fkActive()) {
        wave.setAttribute('opacity', '0');
        return;
      }
      const phase = ((performance.now() - start) % WAVE_MS) / WAVE_MS;
      const s = easeOut(phase) * (1 + BAND) - BAND; // 带从球点外进入, 球门线外完全离开
      const s0 = Math.max(0, s), s1 = Math.min(1, s + BAND);
      if (s1 > 0 && s0 < 1) {
        let d: string;
        if (geo.fan) {
          // 普通球: 前缘是按同一透视采样、半径等比缩小的圆弧；
          // 两条边也按场平面半径取值, 不能用屏幕线性插值(会破坏透视)
          const fan = geo.fan;
          const f0 = this._fkFanPoint(fan, fan.rho * s0, fan.phi1);
          const n0 = this._fkFanPoint(fan, fan.rho * s0, fan.phi2);
          const N = 12;
          // 前缘与扇形外弧一样, 先在场地平面内压平再投影, 保证波带贴合且透视一致
          const frontPts: PositionPoint[] = [];
          for (let i = 0; i <= N; i++) {
            frontPts.push(
              this._fkFanPitch(fan, fan.rho * s1, fan.phi1 + (fan.phi2 - fan.phi1) * (i / N)),
            );
          }
          const front = this._flattenArc(frontPts, fan.flat ?? 0)
            .map((p) => this._pitchToScreen(p.x, p.y))
            .map((p) => ` L ${p.x},${p.y}`)
            .join('');
          d = `M ${f0.x},${f0.y}${front} L ${n0.x},${n0.y} Z`;
        } else {
          const L = (a: PositionPoint, b: PositionPoint, t: number): PositionPoint =>
            ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
          const f0 = L(geo.apex, geo.far, s0), f1 = L(geo.apex, geo.far, s1);
          const n0 = L(geo.apex, geo.near, s0), n1 = L(geo.apex, geo.near, s1);
          // 直接球是直边; 球门球仍是屏幕空间圆弧
          const front = geo.arcR === null
            ? `L ${n1.x},${n1.y}`
            : `A ${geo.arcR * s1},${geo.arcR * s1} 0 0 ${geo.sweep} ${n1.x},${n1.y}`;
          d = `M ${f0.x},${f0.y} L ${f1.x},${f1.y} ${front} L ${n0.x},${n0.y} Z`;
        }
        wave.setAttribute('d', d);
        wave.setAttribute('opacity', String(Math.sin(phase * Math.PI) * 0.6));
      } else {
        wave.setAttribute('opacity', '0');
      }
      this._fkWaveRaf = requestAnimationFrame(step);
    };
    this._fkWaveRaf = requestAnimationFrame(step);
  }

  _stopFKWave(): void {
    if (this._fkWaveRaf) { cancelAnimationFrame(this._fkWaveRaf); this._fkWaveRaf = null; }
    if (this.refs.fkWave) this.refs.fkWave.setAttribute('opacity', '0');
  }

  /** 通用脉冲环：在指定位置扩散圆圈，适用于进攻/角球/点球/球门球等。durationMs 毫秒 */
  _animPulse(pos: PositionPoint, color: string, durationMs: number, maxR: number, delay = 0): void {
    const r = this.refs;
    if (!r.eventRing) return;
    const ring = r.eventRing;
    // 延迟脉冲：token 在实际开始时才获取，避免提前掐断正在运行的脉冲
    const schedTok = this._token('pulse-sched');
    const start = () => {
      if (!this._checkToken('pulse-sched', schedTok)) return;
      const tok = this._token('pulse');
      ring.setAttribute('cx', String(pos.x));
      ring.setAttribute('cy', String(pos.y));
      ring.setAttribute('stroke', color);
      ring.setAttribute('r', '4');
      ring.setAttribute('opacity', '1');
      const t0 = performance.now();
      const anim = () => {
        if (!this._checkToken('pulse', tok)) return;
        const p = Math.min(1, (performance.now() - t0) / durationMs);
        ring.setAttribute('r', String(4 + (maxR - 4) * p));
        ring.setAttribute('opacity', String(Math.max(0, 1 - p)));
        if (p < 1) requestAnimationFrame(anim);
        else ring.setAttribute('opacity', '0');
      };
      anim();
    };
    if (delay > 0) setTimeout(start, delay); else start();
  }

  /**
   * 球门球 — 本方点球点起脚的扇形出球区: 以本方点球点为顶点、指向对方球门的扇形,
   * 弧顶画法同任意球/角球扇形(圆心即点球点, 弧度自然), 半张角 FK_HALF_ANGLE。
   * 长度以"点球点到中场线"的距离为上限(再留 6% 余量), 不超过中场。
   * 球点光晕 + 向前推进的波纹带, 持续到下一个事件/VC 切换(_clearThrowAnim 统一清理)。
   */
  _animGoalKickFan(ev: ProcessedEvent): PositionPoint {
    const isHome = ev.team === 'home';
    // 单位置: 本方点球点(主队右攻 → 本方在左)
    const spot = xyPos(isHome ? '0.105,0.5' : '0.895,0.5')!;
    // 场平面(米制)长度上限: 与中场线的交点到球点的距离, 再留 6% 间隙避免压线。
    const a = viewToXY(spot.x * INNER_SCALE, spot.y * INNER_SCALE);
    const ax = a.x * PITCH_LENGTH_M, ay = a.y * PITCH_WIDTH_M;
    const gx = isHome ? PITCH_LENGTH_M : 0;
    const gy = 0.5 * PITCH_WIDTH_M;
    const dx = gx - ax, dy = gy - ay;
    const lenToGoal = Math.hypot(dx, dy) || 1;
    const cx = dx / lenToGoal, cy = dy / lenToGoal;
    const tLine = Math.abs(cx) > 1e-6 ? (PITCH_LENGTH_M / 2 - ax) / cx : lenToGoal;
    const len = Math.max(0, Math.min(lenToGoal, tLine)) * 0.94;
    // 中轴正对对方点球点(与对方球门中心同一条中线), 扇形关于该中轴对称;
    // 两条臂经透视投影后远端(屏幕上边线一侧)被压短, 因此屏幕上看仍然是不等臂,
    // 而远端两顶点的连线保持与对面底线平行。
    const aim = xyPos(isHome ? '0.895,0.5' : '0.105,0.5')!;
    this._drawForwardFan(spot, ev, len, {
      aim,
      halfAngle: LiveTracker.GK_HALF_ANGLE,
      gray: true,
      perspective: true,
      // 下端臂比上端只短一点点
      nearArmScale: 0.99,
      // 前端弧线稍微拉平(场地平面内收敛, 透视仍严格), 避免长扇形弧顶显得过拱
      frontFlatten: 0.5,
    });
    return spot;
  }

  /**
   * 朝对方球门的扇形(球门球 / 界外球共用)：顶点光晕 + 扇形走廊 + 前推波纹。
   * len 为走廊长度(内部单位)；几何按屏幕空间圆弧绘制，波纹由 _fkGeo 驱动。
   * opts.aim 指定指向点(默认对方球门中心)，opts.halfAngle 指定半张角(默认 FK_HALF_ANGLE)，
   * opts.gray 使用与角球扇形一致的灰色填充与白色波带。
   */
  _drawForwardFan(
    spot: PositionPoint,
    ev: ProcessedEvent,
    len: number,
    opts: {
      aim?: PositionPoint; halfAngle?: number; gray?: boolean; fill?: string;
      /** true 时 len 为米制长度, 扇形在场平面上采样后逐点投影(透视正确) */
      perspective?: boolean;
      /** 透视下把靠近对方球门的那条臂收短(界外球斜向传中时使用) */
      shortenGoalArm?: boolean;
      /** 透视扇形下侧(屏幕下方、近边线一侧)那条臂的半径缩放, 用于轻微不等臂 */
      nearArmScale?: number;
      /** 外弧平缓度 0..1: 0=圆弧, 1=直弦; 数值越大前端越平缓 */
      frontFlatten?: number;
    } = {},
  ): void {
    const r = this.refs;
    if (!r.fkCorridor) return;
    this._startDotGlowLoop(spot, () => this._fkActive());
    const aim = opts.aim ?? (ev.team === 'home' ? GOAL_RIGHT : GOAL_LEFT);
    const halfAngle = opts.halfAngle ?? LiveTracker.FK_HALF_ANGLE;
    let far: PositionPoint;
    let near: PositionPoint;
    let d: string;
    if (opts.perspective) {
      // 场平面(米制)扇形: 以球点为圆心, 中轴指向 aim, 半径 len 米;
      // 外弧逐点经单应矩阵投影, 因此远端被透视压扁、近端更舒展。
      const a = viewToXY(spot.x * INNER_SCALE, spot.y * INNER_SCALE);
      const ax = a.x * PITCH_LENGTH_M, ay = a.y * PITCH_WIDTH_M;
      const b = viewToXY(aim.x * INNER_SCALE, aim.y * INNER_SCALE);
      const bx = b.x * PITCH_LENGTH_M, by = b.y * PITCH_WIDTH_M;
      const phiC = Math.atan2(by - ay, bx - ax);
      let phi1 = phiC - halfAngle;
      let phi2 = phiC + halfAngle;
      // 界外球: 靠对方球门一侧的那条臂收短一些(从边线斜向球门时, 靠近球门的半边推进更收敛),
      // 用两条边半径不同的扇形(rho/rho2)表达。球门球等沿中轴正对球门的扇形保持对称。
      let rho = len;
      let rho2 = len;
      if (opts.shortenGoalArm) {
        const gx = (ev.team === 'home' ? 1 : 0) * PITCH_LENGTH_M;
        const gy = 0.5 * PITCH_WIDTH_M;
        const d1 = Math.hypot(ax + len * Math.cos(phi1) - gx, ay + len * Math.sin(phi1) - gy);
        const d2 = Math.hypot(ax + len * Math.cos(phi2) - gx, ay + len * Math.sin(phi2) - gy);
        if (d1 < d2) rho = len * 0.7;
        else rho2 = len * 0.7;
      }
      if (opts.nearArmScale !== undefined) {
        // sin(phi) 更大 = 场地 y 更大 = 屏幕下方(近边线一侧); 只微调这条臂, 中轴方向不变
        if (Math.sin(phi2) > Math.sin(phi1)) rho2 *= opts.nearArmScale;
        else rho *= opts.nearArmScale;
      }
      const flat = opts.frontFlatten ?? 0;
      const fan: FKFanGeo = { ax, ay, rho, rho2, phi1, phi2, flat };
      const N = 18;
      // 先在场地平面内采样并压平外弧, 再逐点投影:
      // 压平发生在真实地面上, 因此扇形始终是某个地面区域的透视像(换机位/球场图仍成立)。
      const rawArc: PositionPoint[] = [];
      for (let i = 0; i <= N; i++) {
        rawArc.push(this._fkFanPitch(fan, fan.rho, fan.phi1 + (fan.phi2 - fan.phi1) * (i / N)));
      }
      const arc = this._flattenArc(rawArc, flat).map((p) => this._pitchToScreen(p.x, p.y));
      // far/near 统一表示屏幕上方/下方那条臂, 主客队语义一致
      const upperIdx = arc[0].y <= arc[arc.length - 1].y ? 0 : arc.length - 1;
      far = arc[upperIdx];
      near = arc[arc.length - 1 - upperIdx];
      d = `M ${spot.x},${spot.y}` + arc.map((p) => ` L ${p.x},${p.y}`).join('') + ' Z';
      this._fkGeo = { apex: spot, far, near, direct: false, arcR: null, sweep: 0, fan };
    } else {
      const dx = aim.x - spot.x, dy = aim.y - spot.y;
      const lenToGoal = Math.hypot(dx, dy) || 1;
      const cx = dx / lenToGoal, cy = dy / lenToGoal;
      const nx = -cy, ny = cx; // 中轴法线
      const halfW = Math.tan(halfAngle) * len;
      const mid = { x: spot.x + cx * len, y: spot.y + cy * len };
      far = { x: mid.x + nx * halfW, y: mid.y + ny * halfW };
      near = { x: mid.x - nx * halfW, y: mid.y - ny * halfW };
      const arcR = Math.hypot(far.x - spot.x, far.y - spot.y);
      const cross = (far.x - spot.x) * (near.y - spot.y) - (far.y - spot.y) * (near.x - spot.x);
      const sweep = cross > 0 ? 1 : 0;
      this._fkGeo = { apex: spot, far, near, direct: false, arcR, sweep };
      d = `M ${spot.x},${spot.y} L ${far.x},${far.y} A ${arcR},${arcR} 0 0 ${sweep} ${near.x},${near.y} Z`;
    }
    r.fkCorridor.setAttribute('d', d);
    r.fkCorridor.setAttribute('fill', opts.fill ?? (opts.gray ? 'url(#gkGradSimple)' : 'url(#fkGradSimple)'));
    r.fkCorridor.setAttribute('opacity', '1');
    if (r.fkWave) r.fkWave.setAttribute('fill', opts.gray ? FAN_WAVE_COLORS.gray : FAN_WAVE_COLORS.yellow);
    const mid = { x: (far.x + near.x) / 2, y: (far.y + near.y) / 2 };
    for (const g of [r.fkGradDirect, r.fkGradSimple, r.gkGradSimple, r.throwGradSimple]) {
      if (!g) continue;
      g.setAttribute('x1', String(spot.x));
      g.setAttribute('y1', String(spot.y));
      g.setAttribute('x2', String(mid.x));
      g.setAttribute('y2', String(mid.y));
    }
    this._startFKWave();
  }

  /**
   * 进攻/危险进攻区域：覆盖球场的锯齿形色块 + 脉冲延伸带
   * 独立于球员位置 — 沿球场白线四角参数化插值，锯齿边与边线平行，边缘精确贴线
   */
  _animAttackZone(_pos: PositionPoint, team: string, dangerous = false): void {
    const toothCount = 4;
    const toRight = team === 'home';
    const dir = toRight ? 1 : -1;
    const percent = toRight
      ? (dangerous ? 0.75 : 0.65)
      : (dangerous ? 0.25 : 0.35);
    const toothH = (dangerous ? 45 : 30) * dir;

    // 沿左边线/右边线的参数化插值 (t: 0=远端, 1=近端),四角为精确白线角点
    const L = (t: number) => ({ x: CORNER_TL.x + t * (CORNER_BL.x - CORNER_TL.x), y: CORNER_TL.y + t * (CORNER_BL.y - CORNER_TL.y) });
    const R = (t: number) => ({ x: CORNER_TR.x + t * (CORNER_BR.x - CORNER_TR.x), y: CORNER_TR.y + t * (CORNER_BR.y - CORNER_TR.y) });
    const baseAt = (t: number, p: number) => {
      const l = L(t), r = R(t);
      return { x: l.x + (r.x - l.x) * p, y: l.y + (r.y - l.y) * p };
    };

    // 锯齿折线: t=0 → t=1,每段中点向前突出
    const teeth = (p: number) => {
      const pts: { x: number; y: number }[] = [];
      pts.push(baseAt(0, p));
      for (let i = 0; i < toothCount; i++) {
        const tm = baseAt((i + 0.5) / toothCount, p);
        pts.push({ x: tm.x + toothH, y: tm.y });
        pts.push(baseAt((i + 1) / toothCount, p));
      }
      return pts;
    };
    const toothPts = teeth(percent);

    // Polygon from defensive-side field edge to sawtooth line
    let zonePts: string;
    if (toRight) {
      // Home attacks right: fill left edge → sawtooth (pushing from own half)
      zonePts = `${CORNER_TL.x},${CORNER_TL.y} ${CORNER_BL.x},${CORNER_BL.y}`;
      for (let i = toothPts.length - 1; i >= 0; i--) {
        zonePts += ` ${toothPts[i].x},${toothPts[i].y}`;
      }
    } else {
      // Away attacks left: fill right edge → sawtooth (pushing from own half)
      zonePts = `${CORNER_TR.x},${CORNER_TR.y} ${CORNER_BR.x},${CORNER_BR.y}`;
      for (let i = toothPts.length - 1; i >= 0; i--) {
        zonePts += ` ${toothPts[i].x},${toothPts[i].y}`;
      }
    }

    // Gradient IDs: defensive edge (0.1) → sawtooth (0.4)
    const zoneGradId = dangerous
      ? (team === 'home' ? 'url(#zgDAH)' : 'url(#zgDAA)')
      : (team === 'home' ? 'url(#zgHome)' : 'url(#zgAway)');
    const waveGradId = dangerous
      ? (team === 'home' ? 'url(#wgDAH)' : 'url(#wgDAA)')
      : (team === 'home' ? 'url(#wgHome)' : 'url(#wgAway)');

    // Always store in React state for JSX rendering
    this._zoneAnimData = {
      points: zonePts,
      fill: zoneGradId,
      stroke: 'none',
      strokeWidth: 0,
      opacity: 1,
      bandPoints: '',
      bandFill: waveGradId,
    };

    this._needsNotify = true;

    // Animated attacking wave — sawtooth edge pulses forward from the base zone
    const r = this.refs;
    // 跟随系统“减少动态效果”偏好：进攻区域保留静态底色，不启动无限 rAF 脉冲循环。
    const reduceMotion = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (r.attackWave && !reduceMotion) {
      if (this._waveAnimRaf) {
        cancelAnimationFrame(this._waveAnimRaf);
        this._waveAnimRaf = null;
      }

      const maxExtend = dangerous ? 0.04 : 0.06;
      const CYCLE_MS = 667; // 原 40 帧 @60fps
      const waveStart = performance.now();

      const waveStep = () => {
        // Sine-based pulse: extend forward then retract, looping while zone is visible
        const t = ((performance.now() - waveStart) % CYCLE_MS) / CYCLE_MS;
        const pulse = Math.sin(t * Math.PI); // 0→1→0 per cycle
        const extPercent = percent + dir * maxExtend * pulse;
        const extToothPts = teeth(extPercent);

        // Wave polygon: extended sawtooth (top→bottom) + base sawtooth (bottom→top)
        let wavePts = '';
        for (const p of extToothPts) wavePts += `${p.x},${p.y} `;
        for (let i = toothPts.length - 1; i >= 0; i--) wavePts += `${toothPts[i].x},${toothPts[i].y} `;

        r.attackWave!.setAttribute('points', wavePts);
        r.attackWave!.setAttribute('fill', waveGradId);
        r.attackWave!.setAttribute('opacity', String(pulse * 0.8));

        // Loop while zone is still visible
        if (this._zoneAnimData) {
          this._waveAnimRaf = requestAnimationFrame(waveStep);
        } else {
          this._waveAnimRaf = null;
          r.attackWave!.setAttribute('opacity', '0');
        }
      };
      this._waveAnimRaf = requestAnimationFrame(waveStep);
    }
  }

  /** 越位：以对方点球点为基准画一条横贯球场的虚线，虚线与底线之间整条区域铺灰色半透明底。
   *  按真实场地尺寸取位: 球场 105×68m, 点球点距底线 11m。 */
  _animOffside(ev: ProcessedEvent): void {
    const r = this.refs;
    // 主队向右进攻 → 对方半场在右侧; 客队(及无前缀的中立事件) → 左侧
    const attackRight = ev.team === 'home';
    const nxLine = attackRight ? 1 - 11 / 105 : 11 / 105;
    const nxGoal = attackRight ? 1 : 0;
    const lineTop = xyPos(`${nxLine},0`)!;
    const lineBottom = xyPos(`${nxLine},1`)!;
    const goalTop = xyPos(`${nxGoal},0`)!;
    const goalBottom = xyPos(`${nxGoal},1`)!;

    if (r.offsideZone) {
      r.offsideZone.setAttribute(
        'points',
        `${lineTop.x},${lineTop.y} ${lineBottom.x},${lineBottom.y} ` +
        `${goalBottom.x},${goalBottom.y} ${goalTop.x},${goalTop.y}`,
      );
      r.offsideZone.setAttribute('opacity', '0.45');
    }
    if (r.offsideLine) {
      r.offsideLine.setAttribute('x1', String(lineTop.x));
      r.offsideLine.setAttribute('y1', String(lineTop.y));
      r.offsideLine.setAttribute('x2', String(lineBottom.x));
      r.offsideLine.setAttribute('y2', String(lineBottom.y));
      r.offsideLine.setAttribute('opacity', '1');
    }
    this._startOffsideLineBlink();
  }

  /** 黄色虚线闪烁(0.9s 一个周期, opacity 1 ↔ 0.15) */
  _startOffsideLineBlink(): void {
    const line = this.refs.offsideLine;
    if (!line) return;
    if (this._offsideLineRaf) { cancelAnimationFrame(this._offsideLineRaf); this._offsideLineRaf = null; }
    const start = performance.now();
    const PERIOD = 900;
    const step = () => {
      const p = ((performance.now() - start) % PERIOD) / PERIOD;
      const k = 0.5 - 0.5 * Math.cos(p * Math.PI * 2);
      line.setAttribute('opacity', String(0.15 + 0.85 * k));
      this._offsideLineRaf = requestAnimationFrame(step);
    };
    this._offsideLineRaf = requestAnimationFrame(step);
  }

  /** 收掉越位虚线/灰色区域(下一个事件或 reset 时) */
  _clearOffsideZone(): void {
    if (this._offsideLineRaf) { cancelAnimationFrame(this._offsideLineRaf); this._offsideLineRaf = null; }
    if (this.refs.offsideZone) this.refs.offsideZone.setAttribute('opacity', '0');
    if (this.refs.offsideLine) this.refs.offsideLine.setAttribute('opacity', '0');
  }

  /** 全场白色闪光 */
  _animFlash(): void {
    const r = this.refs;
    if (!r.flashRect) return;
    const flash = r.flashRect;
    flash.setAttribute('opacity', '0.35');
    const tok = this._token('flash');
    const start = performance.now();
    const DUR = 583; // 原 35 帧 @60fps
    const anim = () => {
      if (!this._checkToken('flash', tok)) return;
      const p = Math.min(1, (performance.now() - start) / DUR);
      flash.setAttribute('opacity', String(Math.max(0, 0.35 * (1 - p))));
      if (p < 1) requestAnimationFrame(anim);
      else flash.setAttribute('opacity', '0');
    };
    anim();
  }

  _showTooltip(
    pos: PositionPoint, ev: ProcessedEvent,
    pinToPos = false, centerAbove = false, followBall?: boolean,
  ): void {
    // 角球 tooltip 固定显示在球场中央（与其他事件一致）；
    // 任意球/球门球(pinToPos)锚定球点并随迟到的真实 XY 同步，避免居中卡片盖住球点光晕；
    // centerAbove 让卡片水平居中于点位正上方。
    // followBall 显式指定是否随球移动：进攻/危险进攻/控球锚定球点后仍需持续跟随，
    // 不能沿用"锚定即固定"的默认值。
    const pinned = pinToPos;
    // live 下以服务端比赛时钟为准，与底部 banner 用同一读数：快照/迟到事件自带的 TM
    // 可能停留在很久之前（20739958 伤病快照 TM=74，而当前已到 103'），
    // 直接用 ev.tm 会让同一时刻的 tooltip 和 banner 显示两个不同的时间。
    // 回放模式保留事件自身的 TM，按回放时间线展示。
    const minute = LiveTracker.isMotionEvent(ev.vc)
      ? ''
      : this._mode === 'live'
        ? `${this.matchMinute > 0 ? this.matchMinute : ev.tm || 0}'`
        : `${ev.tm || this.matchMinute}'`;
    this.activeTooltip = {
      x: pos.x, y: pos.y,
      icon: ev.info.icon || '',
      text: ev.info.en,
      player: [ev.pg, ev.pd].filter(Boolean).join(' — '),
      team: ev.team || 'neutral',
      minute,
      // 锚定中场的 tooltip 固定不动，其余跟随球（显式标记，避免球恰在中场时误判）
      followBall: followBall ?? (pinned ? false : pos !== CENTER_FIELD),
      anchorToPos: pinned,
      centerAbove: pinned && centerAbove,
      dockBottom: ev.info.cat === 'GOAL',
    };
    this._needsNotify = true;
  }

  _updatePossession(): void {
    this.possession = null;
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].t <= this.t && POSS_CODES.has(vcBase(this.events[i].vc))) {
        this.possession = this.events[i].team; break;
      }
    }
  }

  // =============================================================================
  // 渲染 & 通知
  // =============================================================================

  _applyAnimations(): void {
    const r = this.refs;
    if (!r.ballGroup) return;

    if (this.ballPos || this.events.length > 0) {
      // 渲染前的最后一道兜底: 无论状态里是什么(越界/NaN), 皮球都画在球场内
      const bp = clampToField((this.ballPos || CENTER_FIELD).x, (this.ballPos || CENTER_FIELD).y);
      const isAway = this.possession === 'away';
      const vc = this.currentVC;
      // Hide ball + trail for everything except movement (attack / DA / possession)
      const isMovement = vc && (LiveTracker.DA_CODES.has(vcBase(vc.vc)) || LiveTracker.ATTACK_CODES.has(vcBase(vc.vc)) || POSS_CODES.has(vcBase(vc.vc)));
      // live 下位置数据停了太久（无 XY 的比赛）就隐藏球和拖尾，避免球冻结在旧点误导观众
      const ballStale = this._isBallStaleLive();
      const hideBall = (vc && !isMovement) || ballStale;
      // 球不可见时暂停皮球旋转/阴影的无限循环动画（CSS 里 .is-hidden 处理），
      // 避免隐藏元素仍每帧参与样式计算，移动端可少一份持续负载。
      r.ballGroup.classList.toggle('is-hidden', !!hideBall);
      if (hideBall && r.ballTrail) r.ballTrail.setAttribute('opacity', '0');
      if (r.ballGlow) r.ballGlow.setAttribute('fill', isAway ? 'url(#ballGlowA)' : 'url(#ballGlowH)');
      r.ballGroup.setAttribute('transform', `translate(${bp.x},${bp.y})`);
      r.ballGroup.setAttribute('opacity', hideBall ? '0' : (this.ballPos ? '1' : '0.7'));

      const pts = this.trailQ;
      if (!hideBall && this.ballPos && pts.length >= 2) {
        if (r.ballTrail) r.ballTrail.setAttribute('opacity', '1');
        const LINE_OPACITIES = [1.0, 0.9, 0.8];
        for (let i = 0; i < 3; i++) {
          const j = pts.length - 1 - i, k = j - 1;
          const line = r['trailLine' + i];
          if (line && k >= 0 && pts[k] && pts[j]) {
            line.setAttribute('x1', String(pts[k].x));
            line.setAttribute('y1', String(pts[k].y));
            line.setAttribute('x2', String(pts[j].x));
            line.setAttribute('y2', String(pts[j].y));
            line.setAttribute('opacity', String(LINE_OPACITIES[i]));
          } else if (line) {
            line.setAttribute('opacity', '0');
          }
        }
        const DOT_OPACITIES = [1.0, 0.9, 0.8, 0.7];
        for (let i = 0; i < 4; i++) {
          const idx = pts.length - 1 - i;
          const dot = r['trailDot' + i];
          if (dot && idx >= 0 && pts[idx]) {
            dot.setAttribute('cx', String(pts[idx].x));
            dot.setAttribute('cy', String(pts[idx].y));
            dot.setAttribute('opacity', String(DOT_OPACITIES[i]));
          } else if (dot) {
            dot.setAttribute('opacity', '0');
          }
        }
      } else if (r.ballTrail) {
        r.ballTrail.setAttribute('opacity', '0');
      }
    } else {
      r.ballGroup.setAttribute('opacity', '0');
      if (r.ballTrail) r.ballTrail.setAttribute('opacity', '0');
    }

    if (r.homeTint) r.homeTint.setAttribute('opacity', this.possession === 'home' ? '0.07' : '0');
    if (r.awayTint) r.awayTint.setAttribute('opacity', this.possession === 'away' ? '0.07' : '0');

    // Possession half-field overlay — pure possession events only (exclude attack/DA)
    if (r.posHalf) {
      const vc = this.currentVC;
      const isPurePoss = vc && POSS_CODES.has(vcBase(vc.vc))
        && !LiveTracker.DA_CODES.has(vcBase(vc.vc)) && !LiveTracker.ATTACK_CODES.has(vcBase(vc.vc));
      const possTeam = isPurePoss ? vc!.team : null;

      if (possTeam !== this._posHalfTeam) {
        // Cancel previous animation
        if (this._posHalfAnimRaf) { cancelAnimationFrame(this._posHalfAnimRaf); this._posHalfAnimRaf = null; }
        this._posHalfTeam = possTeam;

        if (possTeam === 'home' || possTeam === 'away') {
          // 精确贴白线: 顶/底边沿球门线角点与中线端点之间的斜边展开
          const home = possTeam === 'home';
          const edgeTop = home ? CORNER_TL : CORNER_TR;
          const edgeBot = home ? CORNER_BL : CORNER_BR;
          const expandStart = performance.now();
          const DUR = 233; // 原 14 帧 @60fps
          r.posHalf.setAttribute('fill', home ? 'url(#posHalfH)' : 'url(#posHalfA)');
          r.posHalf.setAttribute('opacity', '1');
          // f: 0.05(起始窄条) → 1(到中线); 顶/底边同一比例,遮罩右缘始终为直线
          const quad = (f: number) => {
            const tx = edgeTop.x + (CENTER_TOP.x - edgeTop.x) * f;
            const ty = edgeTop.y + (CENTER_TOP.y - edgeTop.y) * f;
            const bx = edgeBot.x + (CENTER_BOTTOM.x - edgeBot.x) * f;
            const by = edgeBot.y + (CENTER_BOTTOM.y - edgeBot.y) * f;
            return home
              ? `${edgeTop.x},${edgeTop.y} ${tx},${ty} ${bx},${by} ${edgeBot.x},${edgeBot.y}`
              : `${tx},${ty} ${edgeTop.x},${edgeTop.y} ${edgeBot.x},${edgeBot.y} ${bx},${by}`;
          };
          const expand = () => {
            const t = Math.min(1, (performance.now() - expandStart) / DUR);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out
            r.posHalf!.setAttribute('points', quad(0.05 + 0.95 * eased));
            if (t < 1) {
              this._posHalfAnimRaf = requestAnimationFrame(expand);
            } else {
              this._posHalfAnimRaf = null;
              r.posHalf!.setAttribute('points', quad(1));
            }
          };
          this._posHalfAnimRaf = requestAnimationFrame(expand);
        } else {
          r.posHalf.setAttribute('opacity', '0');
        }
      }
    }

    // Keep tooltip following the ball (except throw-in/corner which are pinned, e.g. CENTER_FIELD)
    if (this.activeTooltip && this.ballPos && this.activeTooltip.followBall !== false) {
      this.activeTooltip.x = this.ballPos.x;
      this.activeTooltip.y = this.ballPos.y;
    }

  }

  _notify(): void {
    this.minute = `${this.matchMinute}:${String(this.matchSecond).padStart(2, '0')}`;
    if (this.onUpdate) {
      this.onUpdate({
        ballPos: this.ballPos,
        activeTooltip: this.activeTooltip,
        currentVC: this.currentVC,
        currentPG: this.currentPG,
        possession: this.possession,
        playing: this.playing,
        speed: this.speed,
        t: this.t,
        totalMs: this.totalMs,
        score: this.score,
        minute: this.minute,
        statusText: this.statusText,
        zoneAnim: this._zoneAnimData,
        xyPending: !!this._pendingXyEv,
        goalCelebrating: this._goalCelebrating,
        closeupArt: this.closeupArt,
        shootout: this._shootout
          ? { home: this._shootout.home.slice(), away: this._shootout.away.slice() }
          : null,
        breakStats: this._break
          ? {
              kind: this._break.kind,
              et: this._break.et,
              t: this._break.t,
              cutoffT: this._break.cutoffT,
              // replay 没有按时间点保存 feed 快照，交给事件统计兜底
              feed: this._mode === 'live'
                ? {
                    home: { ...this._feedStats.home },
                    away: { ...this._feedStats.away },
                  }
                : null,
            }
          : null,
      });
    }
  }
}
