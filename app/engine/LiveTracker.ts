import { xyPos, CENTER_FIELD, GOAL_LEFT, GOAL_RIGHT, easeIn, FIELD_TOP, FIELD_BOTTOM, FIELD_LEFT_TOP, FIELD_RIGHT_TOP, FIELD_LEFT_BOTTOM, FIELD_RIGHT_BOTTOM, type PositionPoint } from '../data/coords';
import { vcInfo, POSS_CODES, type VCEntry } from '../data/vcMap';

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

export interface TooltipData {
  x: number; y: number;
  icon: string;
  text: string;
  player: string;
  team: string;
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
}

export interface RawEvent {
  XY?: string;
  DeltaMilliseconds?: string;
  VC?: string;
  PG?: string;
  PD?: string;
  TM?: string;
  SS?: string;
  Player1?: string;
  Player2?: string;
  Champ?: string;
  Team1Id?: string;
  Team2Id?: string;
}

export interface EngineOptions {
  mode?: 'replay' | 'live';
}

export interface ProcessedEvent {
  t: number;
  vc: number;
  info: VCEntry;
  pg: string;
  pd: string;
  xy: string | null;
  tm: string;
  ss: string;
  team: string;
}

interface TrackPoint {
  t: number;
  xy: string;
  pg: string;
}

// =============================================================================
// 工具函数
// =============================================================================

/** 将坐标钳制在球场梯形范围内 */
function clampToField(x: number, y: number): { x: number; y: number } {
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
  trailFlash: number;
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
  _needsNotify: boolean;

  // Attack zone — persists while currentVC is attack/DA, cleared on VC change
  _zoneAnimData: ZoneAnimData | null;
  _waveAnimRaf: number | null;

  // Possession half overlay
  _posHalfTeam: string | null;
  _posHalfAnimRaf: number | null;

  // Throw-in animation
  _throwGlowRaf: number | null;
  _throwSectorRaf: number | null;

  // ---- 比赛信息 ----
  team1: string;
  team2: string;
  team1Logo: string;
  team2Logo: string;
  champ: string;
  score: string;
  minute: string;
  statusText: string;

  // ---- SVG DOM 引用 ----
  refs: Record<string, SVGElement | null>;

  // ---- 内部 ----
  _cum: number;
  _xyScale: number | null;
  _mode: 'replay' | 'live';
  // 上一个已处理事件索引（live 模式用，避免重复 fire）
  _liveLastIdx: number;

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
    this.trailFlash = 0;
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
    this._needsNotify = false;
    this._zoneAnimData = null;
    this._waveAnimRaf = null;
    this._posHalfTeam = null;
    this._posHalfAnimRaf = null;
    this._throwGlowRaf = null;
    this._throwSectorRaf = null;

    this.team1 = '';
    this.team2 = '';
    this.team1Logo = '';
    this.team2Logo = '';
    this.champ = '';
    this.score = '0-0';
    this.minute = "0'";
    this.statusText = 'LIVE';

    this.refs = {};

    this._cum = 0;
    this._xyScale = null;
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
    this._xyScale = null;
    for (const r of raw) {
      this._cum += parseInt(r.DeltaMilliseconds!) || 3000;
      this._addOne(r, this._cum);
    }
    this.totalMs = this._cum;
    this.trackPts.sort((a, b) => a.t - b.t);
    this.events.sort((a, b) => a.t - b.t);
    this._rebuildPosPts();
  }

  /** 单条事件解析：坐标归一化 → 轨迹点/事件分离 → 球队信息提取 */
  _addOne(rawEvent: RawEvent, _t: number): void {
    if (this._xyScale === null && rawEvent.XY) {
      const parts = rawEvent.XY.split(',');
      if (parts.length === 2) {
        this._xyScale = parseFloat(parts[0]) > 1 ? 100 : 1;
      }
    }

    if (rawEvent.XY) {
      let xy = rawEvent.XY;
      if (this._xyScale && this._xyScale !== 1) {
        const [x, y] = xy.split(',').map(Number);
        xy = `${x / this._xyScale},${y / this._xyScale}`;
      }
      this.trackPts.push({ t: _t, xy, pg: rawEvent.PG || '' });
    }

    const vc = rawEvent.VC ? parseInt(rawEvent.VC) : null;
    if (vc) {
      const info = vcInfo(vc);
      let xy: string | null = rawEvent.XY ?? null;
      if (xy && this._xyScale && this._xyScale !== 1) {
        const [x, y] = xy.split(',').map(Number);
        xy = `${x / this._xyScale},${y / this._xyScale}`;
      }
      if (!xy) {
        for (let i = this.trackPts.length - 1; i >= 0; i--) {
          if (this.trackPts[i].t <= _t) { xy = this.trackPts[i].xy; break; }
        }
      }
      this.events.push({
        t: _t, vc, info,
        pg: rawEvent.PG || '', pd: rawEvent.PD || '', xy, tm: rawEvent.TM || '', ss: rawEvent.SS || '',
        team: info.team || 'neutral'
      });
    }

    if (!this.team1 && rawEvent.Player1) {
      this.team1 = rawEvent.Player1;
      this.team2 = rawEvent.Player2 || '';
      this.champ = rawEvent.Champ || '';
      if (rawEvent.Team1Id) this.team1Logo = `https://www.scoreref.com/v1/image/team/${rawEvent.Team1Id}.png`;
      if (rawEvent.Team2Id) this.team2Logo = `https://www.scoreref.com/v1/image/team/${rawEvent.Team2Id}.png`;
    }
  }

  _rebuildPosPts(): void {
    this.posPts = [];
    let lastPt = -1;
    for (const pt of this.trackPts) {
      if (pt.t !== lastPt) {
        const pos = xyPos(pt.xy);
        if (pos) { pos.t = pt.t; this.posPts.push(pos); }
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
    this._addOne(rawEvent, seq);
    this.totalMs = seq;

    // 只 fire 新事件（_addOne 可能新增事件到 events 末尾）
    const newEvents = this.events.slice(this._liveLastIdx + 1);
    for (const ev of newEvents) {
      this._fireLive(ev);
    }
    this._liveLastIdx = this.events.length - 1;

    // 有 XY → 更新球位和拖尾；无 XY → 确保球可见
    if (rawEvent.XY) {
      this._updateBallFromXY(rawEvent.XY!);
      this._startBallInterpolation();
      // XY 到达后更新定位球动画位置（VC 可能先于 XY 到达）
      if (this.currentVC) {
        const vc = this.currentVC;
        const newPos = xyPos(rawEvent.XY);
        if (newPos) {
          if (LiveTracker.THROW_CODES.has(vc.vc)) {
            this._animThrow(newPos, vc);
          } else if (vc.info.cat === 'CORNER') {
            this._animCorner(newPos, vc);
          } else if (vc.info.cat === 'FREE_KICK') {
            this._animFKSector(newPos, vc);
          } else if (vc.info.cat === 'PENALTY') {
            this._animSetPieceSector(newPos, vc);
          }
        }
      }
    } else if (!this.ballPos && this.events.length > 0) {
      this.ballPos = { x: CENTER_FIELD.x, y: CENTER_FIELD.y };
    }

    this._updatePossessionLive();
    this._applyAnimations();
    this._notify();
  }

  /** Live 模式：直接 fire，不走 pendingAnims 队列 */
  _fireLive(ev: ProcessedEvent): void {
    const isAttackOrDA = LiveTracker.DA_CODES.has(ev.vc) || LiveTracker.ATTACK_CODES.has(ev.vc);
    const isPossession = POSS_CODES.has(ev.vc);
    if (isAttackOrDA || isPossession) {
      // 进攻/危险进攻/控球：仅在控球方切换时清空轨迹
      if (this.currentVC && this.currentVC.team !== ev.team) this.trailQ = [];
    } else {
      // 静态事件（非运动战）：立即清空轨迹
      this.trailQ = [];
    }
    this.currentVC = ev;
    if (ev.pg) this.currentPG = ev.pg;
    this.activeTooltip = null;
    const r = this.refs;
    if (r.shotLine) r.shotLine.setAttribute('opacity', '0');
    if (r.missCurve) r.missCurve.setAttribute('opacity', '0');
    if (ev.ss) this.score = ev.ss;
    if (ev.tm) this.minute = ev.tm + "'";
    if (ev.vc === 1015) this.statusText = 'HALF TIME';
    if (ev.vc === 1017) this.statusText = 'FULL TIME';
    if (ev.vc === 1016) this.statusText = '2ND HALF';
    // 进攻/危险进攻区域 — 显示并保持到 VC 改变
    if (isAttackOrDA) {
      const pos = ev.xy ? xyPos(ev.xy) : this._defaultPos(ev);
      if (pos) this._animAttackZone(pos, ev.team, LiveTracker.DA_CODES.has(ev.vc));
    } else {
      this._zoneAnimData = null;
    }
    // 非定位球事件清除扇形动画
    if (!LiveTracker.THROW_CODES.has(ev.vc) && ev.info.cat !== 'CORNER' && ev.info.cat !== 'FREE_KICK' && ev.info.cat !== 'PENALTY') this._clearThrowAnim();
    // Live 模式直接播动画，不排队
    this._playEventAnim(ev);
  }

  /** 从 XY 字符串更新球位和拖尾 */
  _updateBallFromXY(xyStr: string): void {
    let xy = xyStr;
    if (this._xyScale && this._xyScale !== 1) {
      const [x, y] = xy.split(',').map(Number);
      xy = `${x / this._xyScale},${y / this._xyScale}`;
    }
    const pos = xyPos(xy);
    if (!pos) return;
    const now = performance.now();
    this.ballFrom = this.ballPos ? { ...this.ballPos } : { x: pos.x, y: pos.y };
    this.ballTo = { x: pos.x, y: pos.y };
    this.ballStart = now;
    this.trailFlash = now + 300;
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
      if (elapsed >= 400) {
        this.ballPos = { x: this.ballTo.x, y: this.ballTo.y };
        this.ballFrom = null; this.ballTo = null;
        this._interpRaf = null;
        this._applyAnimations();
        this._notify();
        return;
      }
      const p = easeIn(elapsed / 400);
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
      if (POSS_CODES.has(this.events[i].vc)) {
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
    this._xyScale = null;
    this.trackPts = [];
    this.posPts = [];
    this.events = [];
    this.totalMs = 0;
    this.t = 0;
    this.team1 = '';
    this.team2 = '';
    this.champ = '';
    this.team1Logo = '';
    this.team2Logo = '';
    this.score = '0-0';
    this.minute = "0'";
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
    this.ballFrom = null;
    this.ballTo = null;
    this.ballStart = 0;
    this.lastTpIdx = -1;
    this.lastTpTime = -1;
    this.ballPos = null;
    this.possession = null;
    this.currentVC = null;
    this.currentPG = '';
    this._liveLastIdx = -1;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.playing = false;
  }

  setRefs(refs: Record<string, SVGElement | null>): void { this.refs = refs; }

  // ---- 播放控制（replay 模式用） ----

  play(): void {
    if (this._mode === 'live') { this.playing = true; this._notify(); return; }
    if (this.t >= this.totalMs) this.t = 0;
    this.playing = true; this.lastTs = null;
    this._frame(performance.now());
    this._needsNotify = true;
  }
  pause(): void {
    this.playing = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._interpRaf) { cancelAnimationFrame(this._interpRaf); this._interpRaf = null; }
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
    for (let i = 0; i < this.events.length; i++) {
      if (this.events[i].t <= this.t) this.lastEvIdx = i; else break;
    }
    let lastBreakT = 0, lastPoss: string | null = null;
    for (let i = 0; i < this.events.length; i++) {
      if (this.events[i].t > this.t) break;
      const et = this.events[i].team;
      if (et !== 'neutral' && POSS_CODES.has(this.events[i].vc)) {
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
    this.ballFrom = null; this.ballTo = null; this.ballStart = 0; this.trailFlash = 0;
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
      if (LiveTracker.DA_CODES.has(vc) || LiveTracker.ATTACK_CODES.has(vc)) {
        const pos = this.currentVC.xy ? xyPos(this.currentVC.xy) : this._defaultPos(this.currentVC);
        if (pos) this._animAttackZone(pos, this.currentVC.team, LiveTracker.DA_CODES.has(vc));
      } else {
        this._zoneAnimData = null;
      }
    } else {
      this._zoneAnimData = null;
    }
    // Sector animations — clear or restart based on current VC
    this._clearThrowAnim();
    if (this.currentVC) {
      const vcPos = this.currentVC.xy ? xyPos(this.currentVC.xy) : this._defaultPos(this.currentVC);
      if (vcPos) {
        if (LiveTracker.THROW_CODES.has(this.currentVC.vc)) {
          this._animThrow(vcPos, this.currentVC);
        } else if (this.currentVC.info.cat === 'CORNER') {
          this._animCorner(vcPos, this.currentVC);
        } else if (this.currentVC.info.cat === 'FREE_KICK') {
          this._animFKSector(vcPos, this.currentVC);
        } else if (this.currentVC.info.cat === 'PENALTY') {
          this._animSetPieceSector(vcPos, this.currentVC);
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
        if (this._mode === 'replay') {
          this.playing = false;
        } else {
          this.raf = null;
        }
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
        const isMovement = LiveTracker.DA_CODES.has(this.events[i].vc) || LiveTracker.ATTACK_CODES.has(this.events[i].vc) || POSS_CODES.has(this.events[i].vc);
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
      this.lastTpIdx = posIdx;
      this.lastTpTime = dst.t!;
      this.trailFlash = now + 300;
      this.trailQ.push({ x: dst.x, y: dst.y });
      if (this.trailQ.length > 4) this.trailQ.shift();
    }

    if (this.ballFrom && this.ballTo) {
      const elapsed = now - this.ballStart;
      if (elapsed >= 400) {
        this.ballPos = { x: this.ballTo.x, y: this.ballTo.y };
        this.ballFrom = null; this.ballTo = null;
        while (this.pendingAnims.length > 0) {
          this._playEventAnim(this.pendingAnims.shift()!);
        }
      } else {
        const p = easeIn(elapsed / 400);
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

  _updateVCStatus(): void {
    let latestVC: ProcessedEvent | null = null;
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].t <= this.t) { latestVC = this.events[i]; break; }
    }
    if (latestVC) this.currentVC = latestVC;
    for (let i = this.trackPts.length - 1; i >= 0; i--) {
      if (this.trackPts[i].t <= this.t && this.trackPts[i].pg) {
        this.currentPG = this.trackPts[i].pg; break;
      }
    }
  }

  /** Replay 模式：事件入队，等球到达位置后播放 */
  _fire(ev: ProcessedEvent): void {
    this.currentVC = ev;
    if (ev.pg) this.currentPG = ev.pg;
    this.activeTooltip = null;
    const r = this.refs;
    if (r.shotLine) r.shotLine.setAttribute('opacity', '0');
    if (r.missCurve) r.missCurve.setAttribute('opacity', '0');
    if (ev.ss) this.score = ev.ss;
    if (ev.tm) this.minute = ev.tm + "'";
    if (ev.vc === 1015) this.statusText = 'HALF TIME';
    if (ev.vc === 1017) this.statusText = 'FULL TIME';
    if (ev.vc === 1016) this.statusText = '2ND HALF';
    // 进攻/危险进攻区域 — 显示并保持到 VC 改变
    const isAttackOrDA = LiveTracker.DA_CODES.has(ev.vc) || LiveTracker.ATTACK_CODES.has(ev.vc);
    if (isAttackOrDA) {
      const pos = ev.xy ? xyPos(ev.xy) : this._defaultPos(ev);
      if (pos) this._animAttackZone(pos, ev.team, LiveTracker.DA_CODES.has(ev.vc));
    } else {
      this._zoneAnimData = null;
    }
    // 非定位球事件清除扇形动画
    if (!LiveTracker.THROW_CODES.has(ev.vc) && ev.info.cat !== 'CORNER' && ev.info.cat !== 'FREE_KICK' && ev.info.cat !== 'PENALTY') this._clearThrowAnim();
    this.pendingAnims.push(ev);
    this._needsNotify = true;
  }

  // =============================================================================
  // 事件动画分发
  // =============================================================================

  /** 危险进攻 VC 集合 */
  static DA_CODES = new Set([11000, 21000, 11300, 21300]);
  /** 进攻 VC 集合 */
  static ATTACK_CODES = new Set([11001, 21001, 11301, 21301]);
  /** 球门球 VC 集合 */
  static GK_CODES = new Set([11007, 21007]);
  /** 界外球 VC 集合 */
  static THROW_CODES = new Set([11024, 21024, 1237, 11237, 21237]);

  /** 无 XY 时按事件类型/球队取默认坐标 */
  _defaultPos(ev: ProcessedEvent): PositionPoint {
    const isHome = ev.team === 'home';
    const midY = FIELD_TOP + (FIELD_BOTTOM - FIELD_TOP) / 2;
    const midXTop = (FIELD_LEFT_TOP + FIELD_RIGHT_TOP) / 2;
    const midXBot = (FIELD_LEFT_BOTTOM + FIELD_RIGHT_BOTTOM) / 2;
    const halfW = isHome ? (FIELD_RIGHT_TOP - midXTop) : (midXTop - FIELD_LEFT_TOP);
    const { cat } = ev.info;
    const vc = ev.vc;

    if (cat === 'CORNER') {
      return isHome
        ? { x: FIELD_RIGHT_TOP - 15, y: FIELD_TOP + 8 }
        : { x: FIELD_LEFT_TOP + 15, y: FIELD_TOP + 8 };
    }
    if (LiveTracker.THROW_CODES.has(vc)) {
      return isHome
        ? { x: FIELD_RIGHT_TOP - 3, y: FIELD_TOP + 5 }
        : { x: FIELD_LEFT_TOP + 3, y: FIELD_TOP + 5 };
    }
    if (cat === 'PENALTY') {
      return isHome ? { x: 650, y: midY } : { x: 170, y: midY };
    }
    if (LiveTracker.GK_CODES.has(vc)) {
      return isHome ? { x: 680, y: midY } : { x: 140, y: midY };
    }
    if (cat === 'SHOT') {
      return isHome ? { x: 580, y: midY } : { x: 240, y: midY };
    }
    if (LiveTracker.ATTACK_CODES.has(vc)) {
      return isHome
        ? { x: midXTop + halfW / 3, y: midY }
        : { x: midXTop - halfW / 3, y: midY };
    }
    if (LiveTracker.DA_CODES.has(vc)) {
      return isHome
        ? { x: midXTop + halfW / 2, y: midY }
        : { x: midXTop - halfW / 2, y: midY };
    }
    return CENTER_FIELD;
  }

  _playEventAnim(ev: ProcessedEvent): void {
    const { cat } = ev.info;
    const pos = ev.xy ? xyPos(ev.xy) : this._defaultPos(ev);
    if (!pos) return;
    const team = ev.team;
    const teamColor = team === 'home' ? '#fff' : '#ffd43b';

    // ---- 进球 ----
    if (cat === 'GOAL') {
      this._animGoal(team);
      this._animFlash();
      this._showTooltip(CENTER_FIELD, ev);
      return;
    }
    // ---- 射门 ----
    if (cat === 'SHOT') { this._animShot(pos, ev); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 黄牌 / 红牌 ----
    if (cat === 'YELLOW_CARD') { this._animCard(pos, '#ffeb3b'); this._showTooltip(CENTER_FIELD, ev); return; }
    if (cat === 'RED_CARD') { this._animCard(pos, '#f85149'); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 角球 ----
    if (cat === 'CORNER') { this._animCorner(pos, ev); this._animPulse(pos, teamColor, 40, 35); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 任意球 ----
    if (cat === 'FREE_KICK') { this._animFoul(pos); this._animFKSector(pos, ev); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 点球 ----
    if (cat === 'PENALTY') { this._animPulse(pos, '#ffd700', 60, 60); this._animPulse(pos, '#ffd700', 60, 35, 200); this._animSetPieceSector(pos, ev); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 伤病 ----
    if (cat === 'INJURY') { this._animInjury(pos); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 越位 ----
    if (cat === 'OFFSIDE') { this._animOffside(pos); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 换人 ----
    if (cat === 'SUBSTITUTION') { this._animSub(pos); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 危险进攻 / 进攻 (zone triggered in _fire / _fireLive) ----
    if (LiveTracker.DA_CODES.has(ev.vc) || LiveTracker.ATTACK_CODES.has(ev.vc)) { this._showTooltip(pos, ev); return; }
    // ---- 球门球 ----
    if (LiveTracker.GK_CODES.has(ev.vc)) { this._animPulse(pos, teamColor, 40, 40); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- VAR ----
    if (cat === 'VAR') { this._animVar(pos); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 半场 / 全场 ----
    if (ev.vc === 1015 || ev.vc === 1017) { this._animFlash(); this._showTooltip(CENTER_FIELD, ev); return; }
    // ---- 界外球 ----
    if (LiveTracker.THROW_CODES.has(ev.vc)) { this._animThrow(pos, ev); this._showTooltip(CENTER_FIELD, ev); return; }

    this._showTooltip(pos, ev);
  }

  // =============================================================================
  // SVG 动画
  // =============================================================================

  _animGoal(team: string): void {
    const r = this.refs;
    if (!r.goalPulse1 || !r.goalPulse2) return;
    const gx = team === 'home' ? GOAL_RIGHT.x : GOAL_LEFT.x;
    const gy = GOAL_RIGHT.y;
    const gp1 = r.goalPulse1, gp2 = r.goalPulse2;
    gp1.setAttribute('cx', String(gx)); gp1.setAttribute('cy', String(gy));
    gp2.setAttribute('cx', String(gx)); gp2.setAttribute('cy', String(gy));
    gp1.setAttribute('r', '20'); gp1.setAttribute('opacity', '1');
    gp2.setAttribute('r', '10'); gp2.setAttribute('opacity', '0.8');
    let frame = 0;
    const anim = () => {
      frame++;
      gp1.setAttribute('r', String(20 + frame * 8)); gp1.setAttribute('opacity', String(Math.max(0, 1 - frame * 0.02)));
      gp2.setAttribute('r', String(10 + frame * 12)); gp2.setAttribute('opacity', String(Math.max(0, 0.8 - frame * 0.015)));
      if (frame < 60) requestAnimationFrame(anim);
      else { gp1.setAttribute('opacity', '0'); gp2.setAttribute('opacity', '0'); }
    };
    anim();
  }

  _animShot(pos: PositionPoint, ev: ProcessedEvent): void {
    const r = this.refs;
    if (!r.shotLine || !r.missCurve) return;
    const shotLine = r.shotLine, missCurve = r.missCurve;
    const gx = ev.team === 'home' ? GOAL_RIGHT.x : GOAL_LEFT.x;
    const gy = GOAL_RIGHT.y;
    shotLine.setAttribute('x1', String(pos.x)); shotLine.setAttribute('y1', String(pos.y));
    shotLine.setAttribute('x2', String(gx)); shotLine.setAttribute('y2', String(gy));
    shotLine.setAttribute('stroke', ev.vc % 10 === 2 ? '#ff9800' : '#ff0');
    shotLine.setAttribute('opacity', '1');
    if (ev.vc === 11012 || ev.vc === 21012) {
      const startX = this.ballPos ? this.ballPos.x : pos.x;
      const startY = this.ballPos ? this.ballPos.y : pos.y;
      const midX = (startX + gx) / 2, midY = (startY + gy) / 2 + (Math.random() - 0.5) * 60;
      const endX = gx + (Math.random() - 0.5) * 40, endY = gy + (Math.random() - 0.5) * 100;
      missCurve.setAttribute('d', `M${startX},${startY} Q${midX},${midY} ${endX},${endY}`);
      missCurve.setAttribute('opacity', '0.8');
      setTimeout(() => missCurve.setAttribute('opacity', '0'), 2000);
    }
    setTimeout(() => shotLine.setAttribute('opacity', '0'), 2500);
  }

  /** Shared set-piece animation: yellow dot + glow + sector (if throwSector available). 30° spread (±15°). */
  _startSectorLoop(pos: PositionPoint, baseAngle: number, baseLen: number, persistCheck: () => boolean): void {
    const r = this.refs;
    if (this._throwSectorRaf) { cancelAnimationFrame(this._throwSectorRaf); this._throwSectorRaf = null; }
    if (this._throwGlowRaf) { cancelAnimationFrame(this._throwGlowRaf); this._throwGlowRaf = null; }

    // Yellow dot + glow rAF loop
    if (r.throwDotGlow && r.throwDotGlowGrad) {
      r.throwDotGlowGrad.setAttribute('cx', String(pos.x));
      r.throwDotGlowGrad.setAttribute('cy', String(pos.y));
      r.throwDotGlow.setAttribute('cx', String(pos.x));
      r.throwDotGlow.setAttribute('cy', String(pos.y));

      let glowFrame = 0;
      const glowStep = () => {
        glowFrame++;
        r.throwDot!.setAttribute('cx', String(pos.x));
        r.throwDot!.setAttribute('cy', String(pos.y));
        r.throwDot!.setAttribute('r', '4');
        r.throwDot!.setAttribute('opacity', '1');
        const s = glowFrame % 40;
        const pulse = 1 + Math.sin(s * Math.PI / 20) * 0.25;
        r.throwDotGlow!.setAttribute('r', String(7 * pulse));
        r.throwDotGlow!.setAttribute('opacity', String(0.3 + Math.sin(s * Math.PI / 20) * 0.2));
        if (persistCheck()) {
          this._throwGlowRaf = requestAnimationFrame(glowStep);
        } else {
          r.throwDot!.setAttribute('opacity', '0');
          r.throwDotGlow!.setAttribute('opacity', '0');
        }
      };
      this._throwGlowRaf = requestAnimationFrame(glowStep);
    }

    // Sector expansion loop
    if (r.throwSector) {
      const SPREAD = 0.2618;
      const ARC_SEGS = 8;
      const CYCLE_FRAMES = 100;

      if (r.throwSectorGrad) {
        r.throwSectorGrad.setAttribute('cx', String(pos.x));
        r.throwSectorGrad.setAttribute('cy', String(pos.y));
        r.throwSectorGrad.setAttribute('r', String(baseLen));
      }

      let frame = 0;
      const step = () => {
        frame++;
        const phase = (frame % CYCLE_FRAMES) / CYCLE_FRAMES;
        const expand = phase <= 0.5 ? phase * 2 : 2 - phase * 2;
        const len = baseLen * (0.08 + expand * 0.92);

        let pts = `${pos.x},${pos.y}`;
        for (let i = 0; i <= ARC_SEGS; i++) {
          const a = baseAngle - SPREAD + (2 * SPREAD * i) / ARC_SEGS;
          const cx = pos.x + Math.cos(a) * len;
          const cy = pos.y + Math.sin(a) * len;
          const cc = clampToField(cx, cy);
          pts += ` ${cc.x},${cc.y}`;
        }
        r.throwSector!.setAttribute('points', pts);
        r.throwSector!.setAttribute('fill', 'url(#throwSectorGrad)');
        r.throwSector!.setAttribute('opacity', '1');

        if (persistCheck()) {
          this._throwSectorRaf = requestAnimationFrame(step);
        } else {
          r.throwSector!.setAttribute('opacity', '0');
        }
      };
      this._throwSectorRaf = requestAnimationFrame(step);
    }
  }

  _animThrow(pos: PositionPoint, ev: ProcessedEvent): void {
    const r = this.refs;
    if (!r.throwDot) return;
    this._clearThrowAnim();

    const isHome = ev.team === 'home';
    // Snap to sideline
    const t = (pos.y - FIELD_TOP) / (FIELD_BOTTOM - FIELD_TOP);
    const leftEdge = FIELD_LEFT_TOP + t * (FIELD_LEFT_BOTTOM - FIELD_LEFT_TOP);
    const rightEdge = FIELD_RIGHT_TOP + t * (FIELD_RIGHT_BOTTOM - FIELD_RIGHT_TOP);
    pos = { x: isHome ? rightEdge : leftEdge, y: pos.y };

    const goalX = isHome ? GOAL_RIGHT.x : GOAL_LEFT.x;
    const goalY = GOAL_RIGHT.y;
    const baseAngle = Math.atan2(goalY - pos.y, goalX - pos.x);
    const baseLen = Math.min(100, Math.sqrt((goalX - pos.x) ** 2 + (goalY - pos.y) ** 2) * 0.35);

    this._startSectorLoop(pos, baseAngle, baseLen, () =>
      !!(this.currentVC && LiveTracker.THROW_CODES.has(this.currentVC.vc))
    );
  }

  _clearThrowAnim(): void {
    if (this._throwGlowRaf) { cancelAnimationFrame(this._throwGlowRaf); this._throwGlowRaf = null; }
    if (this._throwSectorRaf) { cancelAnimationFrame(this._throwSectorRaf); this._throwSectorRaf = null; }
    const r = this.refs;
    if (r.throwDot) r.throwDot.setAttribute('opacity', '0');
    if (r.throwDotGlow) r.throwDotGlow.setAttribute('opacity', '0');
    if (r.throwSector) r.throwSector.setAttribute('opacity', '0');
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
    let frame = 0, y = pos.y - 30;
    const anim = () => {
      frame++; y -= 1.5;
      cardRect.setAttribute('y', String(y));
      cardAnim.setAttribute('opacity', String(Math.max(0, 1 - frame * 0.03)));
      if (frame < 40) requestAnimationFrame(anim);
      else cardAnim.setAttribute('opacity', '0');
    };
    anim();
  }

  _animInjury(pos: PositionPoint): void {
    const r = this.refs;
    if (!r.injuryCross) return;
    const injuryCross = r.injuryCross;
    const lines = injuryCross.querySelectorAll('line');
    lines[0].setAttribute('x1', String(pos.x - 14)); lines[0].setAttribute('y1', String(pos.y - 14));
    lines[0].setAttribute('x2', String(pos.x + 14)); lines[0].setAttribute('y2', String(pos.y + 14));
    lines[1].setAttribute('x1', String(pos.x + 14)); lines[1].setAttribute('y1', String(pos.y - 14));
    lines[1].setAttribute('x2', String(pos.x - 14)); lines[1].setAttribute('y2', String(pos.y + 14));
    injuryCross.setAttribute('opacity', '1');
    let frame = 0;
    const pulse = () => {
      const s = 1 + Math.sin(frame * 0.15) * 0.3;
      injuryCross.setAttribute('transform', `translate(${pos.x},${pos.y}) scale(${s}) translate(${-pos.x},${-pos.y})`);
      injuryCross.setAttribute('opacity', String(Math.max(0, 1 - frame * 0.015)));
      frame++;
      if (frame < 70) requestAnimationFrame(pulse);
      else injuryCross.setAttribute('opacity', '0');
    };
    pulse();
  }

  _animCorner(pos: PositionPoint, ev: ProcessedEvent): void {
    const r = this.refs;
    if (!r.cornerAnim) return;
    this._clearThrowAnim();

    // Flag icon wave
    const cornerAnim = r.cornerAnim;
    cornerAnim.querySelector('polygon')!.setAttribute('points', `${pos.x},${pos.y} ${pos.x - 10},${pos.y - 6} ${pos.x - 2},${pos.y - 12}`);
    cornerAnim.querySelector('line')!.setAttribute('x1', String(pos.x));
    cornerAnim.querySelector('line')!.setAttribute('y1', String(pos.y));
    cornerAnim.querySelector('line')!.setAttribute('x2', String(pos.x));
    cornerAnim.querySelector('line')!.setAttribute('y2', String(pos.y + 14));
    cornerAnim.setAttribute('opacity', '1');
    let frame = 0;
    const wave = () => {
      const rot = Math.sin(frame * 0.2) * 15;
      cornerAnim.setAttribute('transform', `translate(${pos.x},${pos.y}) rotate(${rot}) translate(${-pos.x},${-pos.y})`);
      cornerAnim.setAttribute('opacity', String(Math.max(0, 1 - frame * 0.02)));
      frame++;
      if (frame < 50) requestAnimationFrame(wave);
      else cornerAnim.setAttribute('opacity', '0');
    };
    wave();

    // Shared dot + sector
    const isHome = ev.team === 'home';
    const goalX = isHome ? GOAL_RIGHT.x : GOAL_LEFT.x;
    const goalY = GOAL_RIGHT.y;
    const baseAngle = Math.atan2(goalY - pos.y, goalX - pos.x);
    this._startSectorLoop(pos, baseAngle, 75, () =>
      !!(this.currentVC && this.currentVC.info.cat === 'CORNER')
    );
  }

  _animFoul(pos: PositionPoint): void {
    const r = this.refs;
    if (!r.foulBurst) return;
    const foulBurst = r.foulBurst;
    foulBurst.querySelector('circle')!.setAttribute('cx', String(pos.x));
    foulBurst.querySelector('circle')!.setAttribute('cy', String(pos.y));
    foulBurst.querySelector('circle')!.setAttribute('r', '8');
    foulBurst.querySelectorAll('line').forEach((l, i) => {
      l.setAttribute('x1', String(pos.x)); l.setAttribute('y1', String(pos.y));
      l.setAttribute('x2', String(pos.x + (i === 0 ? -12 : 12))); l.setAttribute('y2', String(pos.y + (i === 0 ? -12 : 12)));
    });
    foulBurst.setAttribute('opacity', '1');
    let frame = 0;
    const anim = () => {
      foulBurst.querySelector('circle')!.setAttribute('r', String(8 + frame * 3));
      foulBurst.setAttribute('opacity', String(Math.max(0, 1 - frame * 0.03)));
      frame++;
      if (frame < 35) requestAnimationFrame(anim);
      else foulBurst.setAttribute('opacity', '0');
    };
    anim();
  }

  /** Free kick — dot + sector toward opponent goal, persists while VC active */
  _animFKSector(pos: PositionPoint, ev: ProcessedEvent): void {
    this._clearThrowAnim();
    const isHome = ev.team === 'home';
    const goalX = isHome ? GOAL_RIGHT.x : GOAL_LEFT.x;
    const goalY = GOAL_RIGHT.y;
    const baseAngle = Math.atan2(goalY - pos.y, goalX - pos.x);
    const baseLen = Math.min(90, Math.sqrt((goalX - pos.x) ** 2 + (goalY - pos.y) ** 2) * 0.35);
    this._startSectorLoop(pos, baseAngle, baseLen, () =>
      !!(this.currentVC && this.currentVC.info.cat === 'FREE_KICK')
    );
  }

  /** Penalty — dot + sector toward opponent goal, persists while VC active */
  _animSetPieceSector(pos: PositionPoint, ev: ProcessedEvent): void {
    this._clearThrowAnim();
    const isHome = ev.team === 'home';
    const goalX = isHome ? GOAL_RIGHT.x : GOAL_LEFT.x;
    const goalY = GOAL_RIGHT.y;
    const baseAngle = Math.atan2(goalY - pos.y, goalX - pos.x);
    const baseLen = Math.min(80, Math.sqrt((goalX - pos.x) ** 2 + (goalY - pos.y) ** 2) * 0.3);
    this._startSectorLoop(pos, baseAngle, baseLen, () =>
      !!(this.currentVC && this.currentVC.info.cat === 'PENALTY')
    );
  }

  _animSub(pos: PositionPoint): void {
    const r = this.refs;
    if (!r.subAnim) return;
    const subAnim = r.subAnim;
    subAnim.querySelector('rect')!.setAttribute('x', String(pos.x - 18));
    subAnim.querySelector('rect')!.setAttribute('y', String(pos.y - 11));
    subAnim.querySelector('text')!.setAttribute('x', String(pos.x));
    subAnim.querySelector('text')!.setAttribute('y', String(pos.y + 4));
    subAnim.setAttribute('opacity', '1');
    let frame = 0;
    const anim = () => {
      subAnim.setAttribute('opacity', String(Math.max(0, 1 - frame * 0.025)));
      frame++;
      if (frame < 40) requestAnimationFrame(anim);
      else subAnim.setAttribute('opacity', '0');
    };
    anim();
  }

  /** 通用脉冲环：在指定位置扩散圆圈，适用于进攻/角球/点球/球门球等 */
  _animPulse(pos: PositionPoint, color: string, duration: number, maxR: number, delay = 0): void {
    const r = this.refs;
    if (!r.eventRing) return;
    const ring = r.eventRing;
    const start = () => {
      ring.setAttribute('cx', String(pos.x));
      ring.setAttribute('cy', String(pos.y));
      ring.setAttribute('stroke', color);
      ring.setAttribute('r', '4');
      ring.setAttribute('opacity', '1');
      let frame = 0;
      const anim = () => {
        frame++;
        ring.setAttribute('r', String(4 + (maxR - 4) * (frame / duration)));
        ring.setAttribute('opacity', String(Math.max(0, 1 - frame / duration)));
        if (frame < duration) requestAnimationFrame(anim);
        else ring.setAttribute('opacity', '0');
      };
      anim();
    };
    if (delay > 0) setTimeout(start, delay); else start();
  }

  /**
   * 进攻/危险进攻区域：覆盖球场的锯齿形色块 + 脉冲延伸带
   * 独立于球员位置 — 匹配球场梯形透视，锯齿边与球场边线平行
   */
  _animAttackZone(_pos: PositionPoint, team: string, dangerous = false): void {
    const fieldH = FIELD_BOTTOM - FIELD_TOP;
    const toothCount = 4;
    const segH = fieldH / toothCount;
    const toRight = team === 'home';
    const dir = toRight ? 1 : -1;
    const percent = toRight
      ? (dangerous ? 0.75 : 0.65)
      : (dangerous ? 0.25 : 0.35);
    const toothH = (dangerous ? 45 : 30) * dir;

    const leftX = (y: number) => FIELD_LEFT_TOP + (y - FIELD_TOP) * (FIELD_LEFT_BOTTOM - FIELD_LEFT_TOP) / fieldH;
    const rightX = (y: number) => FIELD_RIGHT_TOP + (y - FIELD_TOP) * (FIELD_RIGHT_BOTTOM - FIELD_RIGHT_TOP) / fieldH;
    const baseAtY = (y: number) => leftX(y) + (rightX(y) - leftX(y)) * percent;

    const toothPts: { x: number; y: number }[] = [];
    toothPts.push({ x: baseAtY(FIELD_TOP), y: FIELD_TOP });
    for (let i = 0; i < toothCount; i++) {
      const y0 = FIELD_TOP + i * segH;
      const midY = y0 + segH / 2;
      const y1 = y0 + segH;
      toothPts.push({ x: baseAtY(midY) + toothH, y: midY });
      toothPts.push({ x: baseAtY(y1), y: y1 });
    }

    // Polygon from defensive-side field edge to sawtooth line
    let zonePts: string;
    if (toRight) {
      // Home attacks right: fill left edge → sawtooth (pushing from own half)
      zonePts = `${leftX(FIELD_TOP)},${FIELD_TOP} ${leftX(FIELD_BOTTOM)},${FIELD_BOTTOM}`;
      for (let i = toothPts.length - 1; i >= 0; i--) {
        zonePts += ` ${toothPts[i].x},${toothPts[i].y}`;
      }
    } else {
      // Away attacks left: fill right edge → sawtooth (pushing from own half)
      zonePts = `${rightX(FIELD_TOP)},${FIELD_TOP} ${rightX(FIELD_BOTTOM)},${FIELD_BOTTOM}`;
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
    if (r.attackWave) {
      if (this._waveAnimRaf) {
        cancelAnimationFrame(this._waveAnimRaf);
        this._waveAnimRaf = null;
      }

      const maxExtend = dangerous ? 0.04 : 0.06;
      const cycleFrames = 40;
      let frame = 0;

      const waveStep = () => {
        frame++;
        // Sine-based pulse: extend forward then retract, looping while zone is visible
        const t = frame / cycleFrames;
        const pulse = Math.sin(t * Math.PI); // 0→1→0 per cycle
        const extPercent = percent + dir * maxExtend * pulse;
        const extBaseAtY = (y: number) => leftX(y) + (rightX(y) - leftX(y)) * extPercent;

        const extToothPts: { x: number; y: number }[] = [];
        extToothPts.push({ x: extBaseAtY(FIELD_TOP), y: FIELD_TOP });
        for (let i = 0; i < toothCount; i++) {
          const y0 = FIELD_TOP + i * segH;
          const midY = y0 + segH / 2;
          const y1 = y0 + segH;
          extToothPts.push({ x: extBaseAtY(midY) + toothH, y: midY });
          extToothPts.push({ x: extBaseAtY(y1), y: y1 });
        }

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

  /** 越位线：在事件位置画一条横线 */
  _animOffside(pos: PositionPoint): void {
    const r = this.refs;
    if (!r.offsideLine) return;
    const line = r.offsideLine;
    line.setAttribute('x1', String(pos.x - 40));
    line.setAttribute('y1', String(pos.y));
    line.setAttribute('x2', String(pos.x + 40));
    line.setAttribute('y2', String(pos.y));
    line.setAttribute('opacity', '1');
    let frame = 0;
    const anim = () => {
      line.setAttribute('opacity', String(Math.max(0, 1 - frame * 0.025)));
      frame++;
      if (frame < 50) requestAnimationFrame(anim);
      else line.setAttribute('opacity', '0');
    };
    anim();
  }

  /** VAR 标牌：显示 VAR 方框并脉冲 */
  _animVar(pos: PositionPoint): void {
    const r = this.refs;
    if (!r.varBox) return;
    const box = r.varBox;
    const rect = box.querySelector('rect')!;
    const text = box.querySelector('text')!;
    rect.setAttribute('x', String(pos.x - 22));
    rect.setAttribute('y', String(pos.y - 28));
    text.setAttribute('x', String(pos.x));
    text.setAttribute('y', String(pos.y - 14));
    box.setAttribute('opacity', '1');
    let frame = 0;
    const anim = () => {
      const s = 1 + Math.sin(frame * 0.2) * 0.1;
      box.setAttribute('transform', `translate(${pos.x},${pos.y - 18}) scale(${s}) translate(${-pos.x},${-(pos.y - 18)})`);
      box.setAttribute('opacity', String(Math.max(0, 1 - frame * 0.012)));
      frame++;
      if (frame < 80) requestAnimationFrame(anim);
      else { box.setAttribute('opacity', '0'); box.setAttribute('transform', ''); }
    };
    anim();
  }

  /** 全场白色闪光 */
  _animFlash(): void {
    const r = this.refs;
    if (!r.flashRect) return;
    const flash = r.flashRect;
    flash.setAttribute('opacity', '0.35');
    let frame = 0;
    const anim = () => {
      frame++;
      flash.setAttribute('opacity', String(Math.max(0, 0.35 - frame * 0.01)));
      if (frame < 35) requestAnimationFrame(anim);
      else flash.setAttribute('opacity', '0');
    };
    anim();
  }

  _showTooltip(pos: PositionPoint, ev: ProcessedEvent): void {
    this.activeTooltip = {
      x: pos.x, y: pos.y,
      icon: ev.info.icon || '',
      text: ev.info.zh,
      player: [ev.pg, ev.pd].filter(Boolean).join(' — '),
      team: ev.team || 'neutral',
    };
    this._needsNotify = true;
  }

  _updatePossession(): void {
    this.possession = null;
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].t <= this.t && POSS_CODES.has(this.events[i].vc)) {
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
      const bp = this.ballPos || CENTER_FIELD;
      const isAway = this.possession === 'away';
      const vc = this.currentVC;
      // Hide ball + trail for everything except movement (attack / DA / possession)
      const isMovement = vc && (LiveTracker.DA_CODES.has(vc.vc) || LiveTracker.ATTACK_CODES.has(vc.vc) || POSS_CODES.has(vc.vc));
      const hideBall = vc && !isMovement;
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

      if (r.targetFlash) {
        const now = performance.now();
        if (this.trailFlash > now && this.trailQ.length > 0) {
          const lastTgt = this.trailQ[this.trailQ.length - 1];
          const elapsed = now - (this.trailFlash - 400);
          const p = Math.min(1, elapsed / 400);
          r.targetFlash.setAttribute('cx', String(lastTgt.x));
          r.targetFlash.setAttribute('cy', String(lastTgt.y));
          r.targetFlash.setAttribute('r', String(8 + p * 20));
          r.targetFlash.setAttribute('stroke', isAway ? '#ffd43b' : '#fff');
          r.targetFlash.setAttribute('opacity', String(Math.max(0, 0.9 - p * 0.9)));
        } else {
          r.targetFlash.setAttribute('opacity', '0');
        }
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
      const isPurePoss = vc && POSS_CODES.has(vc.vc)
        && !LiveTracker.DA_CODES.has(vc.vc) && !LiveTracker.ATTACK_CODES.has(vc.vc);
      const possTeam = isPurePoss ? vc!.team : null;

      if (possTeam !== this._posHalfTeam) {
        // Cancel previous animation
        if (this._posHalfAnimRaf) { cancelAnimationFrame(this._posHalfAnimRaf); this._posHalfAnimRaf = null; }
        this._posHalfTeam = possTeam;

        if (possTeam === 'home') {
          const goalEdgeTop = FIELD_LEFT_TOP;
          const goalEdgeBot = FIELD_LEFT_BOTTOM;
          const targetX = 408.7;
          const startX = goalEdgeTop + 25;
          const startXBot = goalEdgeBot + 25;
          let frame = 0;
          const totalFrames = 14;
          r.posHalf.setAttribute('fill', 'url(#posHalfH)');
          r.posHalf.setAttribute('opacity', '1');
          const expand = () => {
            frame++;
            const t = Math.min(1, frame / totalFrames);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out
            const cx = startX + (targetX - startX) * eased;
            const cxBot = startXBot + (targetX - startXBot) * eased;
            r.posHalf!.setAttribute('points', `${goalEdgeTop},${FIELD_TOP} ${cx},${FIELD_TOP} ${cxBot},${FIELD_BOTTOM} ${goalEdgeBot},${FIELD_BOTTOM}`);
            if (frame < totalFrames) {
              this._posHalfAnimRaf = requestAnimationFrame(expand);
            } else {
              this._posHalfAnimRaf = null;
              r.posHalf!.setAttribute('points', `${goalEdgeTop},${FIELD_TOP} ${targetX},${FIELD_TOP} ${targetX},${FIELD_BOTTOM} ${goalEdgeBot},${FIELD_BOTTOM}`);
            }
          };
          this._posHalfAnimRaf = requestAnimationFrame(expand);
        } else if (possTeam === 'away') {
          const goalEdgeTop = FIELD_RIGHT_TOP;
          const goalEdgeBot = FIELD_RIGHT_BOTTOM;
          const targetX = 410.7;
          const startX = goalEdgeTop - 25;
          const startXBot = goalEdgeBot - 25;
          let frame = 0;
          const totalFrames = 14;
          r.posHalf.setAttribute('fill', 'url(#posHalfA)');
          r.posHalf.setAttribute('opacity', '1');
          const expand = () => {
            frame++;
            const t = Math.min(1, frame / totalFrames);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out
            const cx = startX - (startX - targetX) * eased;
            const cxBot = startXBot - (startXBot - targetX) * eased;
            r.posHalf!.setAttribute('points', `${cx},${FIELD_TOP} ${goalEdgeTop},${FIELD_TOP} ${goalEdgeBot},${FIELD_BOTTOM} ${cxBot},${FIELD_BOTTOM}`);
            if (frame < totalFrames) {
              this._posHalfAnimRaf = requestAnimationFrame(expand);
            } else {
              this._posHalfAnimRaf = null;
              r.posHalf!.setAttribute('points', `${targetX},${FIELD_TOP} ${goalEdgeTop},${FIELD_TOP} ${goalEdgeBot},${FIELD_BOTTOM} ${targetX},${FIELD_BOTTOM}`);
            }
          };
          this._posHalfAnimRaf = requestAnimationFrame(expand);
        } else {
          r.posHalf.setAttribute('opacity', '0');
        }
      }
    }

    // Keep tooltip following the ball (except throw-in/corner which use CENTER_FIELD)
    if (this.activeTooltip && this.ballPos) {
      const tt = this.activeTooltip;
      if (tt.x !== CENTER_FIELD.x || tt.y !== CENTER_FIELD.y) {
        tt.x = this.ballPos.x;
        tt.y = this.ballPos.y;
      }
    }

  }

  _notify(): void {
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
      });
    }
  }
}
