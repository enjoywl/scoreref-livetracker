import type { BreakFeedStats, ProcessedEvent } from '~/engine/LiveTracker';
import {
  ATTACK_CODES,
  DA_CODES,
  POSS_CODES,
  THROW_CODES,
  vcBase,
} from '~/data/vcMap';

export interface TeamBreakStats {
  onTarget: number | null;
  offTarget: number | null;
  shots: number | null;
  attacks: number | null;
  dangerous: number | null;
  possession: number | null;
  corners: number | null;
  freeKicks: number | null;
  throwIns: number | null;
  yellow: number | null;
  red: number | null;
}

export interface BreakStatsData {
  home: TeamBreakStats;
  away: TeamBreakStats;
}

function emptyTeamStats(): TeamBreakStats {
  return {
    onTarget: null,
    offTarget: null,
    shots: null,
    attacks: null,
    dangerous: null,
    possession: null,
    corners: null,
    freeKicks: null,
    throwIns: null,
    yellow: null,
    red: null,
  };
}

/** 事件流统计只用于 feed 缺失的字段/回放模式；1008 是点球，不算射正。 */
function countEventStats(events: ProcessedEvent[], cutoffT: number) {
  const home = { onTarget: 0, offTarget: 0, attacks: 0, dangerous: 0, corners: 0, freeKicks: 0, throwIns: 0, yellow: 0, red: 0 };
  const away = { ...home };
  for (const ev of events) {
    if (ev.t > cutoffT) continue;
    const side = ev.team === 'home' ? home : ev.team === 'away' ? away : null;
    if (!side) continue;
    const base = vcBase(ev.vc);
    const cat = ev.info.cat;
    if (base === 1011) side.onTarget++;
    if (base === 1012) side.offTarget++;
    if (ATTACK_CODES.has(base)) side.attacks++;
    if (DA_CODES.has(base)) side.dangerous++;
    if (cat === 'CORNER') side.corners++;
    if (cat === 'FREE_KICK') side.freeKicks++;
    if (THROW_CODES.has(base)) side.throwIns++;
    if (cat === 'YELLOW_CARD') side.yellow++;
    if (cat === 'RED_CARD') side.red++;
  }
  return { home, away };
}

/** 回放/无 feed 时按事件持续时间估算控球率。live 的 t 是事件序号，不能用于这里。 */
function eventPossession(events: ProcessedEvent[], cutoffT: number) {
  const inWindow = events
    .filter((ev) => ev.t <= cutoffT)
    .sort((a, b) => a.t - b.t);
  let homeMs = 0;
  let awayMs = 0;
  for (let i = 0; i < inWindow.length; i++) {
    const ev = inWindow[i];
    if (ev.team !== 'home' && ev.team !== 'away') continue;
    if (!POSS_CODES.has(vcBase(ev.vc))) continue;
    const next = inWindow[i + 1];
    const end = next ? next.t : cutoffT;
    const span = Math.max(0, end - ev.t);
    if (ev.team === 'home') homeMs += span;
    else awayMs += span;
  }
  const total = homeMs + awayMs;
  if (!total) return { home: null, away: null };
  const home = Math.round((homeMs / total) * 100);
  return { home, away: 100 - home };
}

function normalizePossession(home: number | null, away: number | null) {
  if (home == null && away == null) return { home: null, away: null };
  if (home == null) return { home: Math.max(0, 100 - (away as number)), away };
  if (away == null) return { home, away: Math.max(0, 100 - home) };
  const total = home + away;
  if (total <= 0) return { home: null, away: null };
  if (total === 100) return { home, away };
  const normalized = Math.round((home / total) * 100);
  return { home: normalized, away: 100 - normalized };
}

function pick(feedValue: number | null | undefined, eventValue: number): number {
  return feedValue != null ? feedValue : eventValue;
}

export function computeBreakStats(
  events: ProcessedEvent[],
  cutoffT: number,
  feed: BreakFeedStats | null,
): BreakStatsData {
  const eventCounts = countEventStats(events, cutoffT);
  const eventPoss = feed ? { home: null, away: null } : eventPossession(events, cutoffT);
  const feedPoss = normalizePossession(
    feed?.home.possession ?? null,
    feed?.away.possession ?? null,
  );
  const possession = feedPoss.home != null || feedPoss.away != null ? feedPoss : eventPoss;

  const build = (side: 'home' | 'away'): TeamBreakStats => {
    const counts = eventCounts[side];
    const f = feed?.[side];
    const onTarget = pick(f?.onTarget, counts.onTarget);
    const offTarget = pick(f?.offTarget, counts.offTarget);
    return {
      onTarget,
      offTarget,
      shots: onTarget + offTarget,
      attacks: pick(f?.attacks, counts.attacks),
      dangerous: pick(f?.dangerous, counts.dangerous),
      possession: possession[side],
      corners: pick(f?.corners, counts.corners),
      freeKicks: counts.freeKicks,
      throwIns: counts.throwIns,
      yellow: pick(f?.yellow, counts.yellow),
      red: pick(f?.red, counts.red),
    };
  };

  return { home: build('home'), away: build('away') };
}

export interface BreakRow {
  label: string;
  home: number | null;
  away: number | null;
  suffix?: string;
}

export interface BreakSlide {
  key: string;
  title: string;
  rows: BreakRow[];
}

function row(
  label: string,
  home: number | null,
  away: number | null,
  suffix?: string,
): BreakRow {
  return { label, home, away, suffix };
}

/**
 * 第一页展示球队比分（只有卡片头部，无统计行），第二页展示当前用到的全部统计；
 * 后续新增的其他信息再作为新的 slide 追加，多页时自动轮播。无数据的行/页直接跳过。
 */
export function buildBreakSlides(stats: BreakStatsData): BreakSlide[] {
  const { home, away } = stats;
  const statsRows = [
    row('总射门', home.shots, away.shots),
    row('射正', home.onTarget, away.onTarget),
    row('射偏', home.offTarget, away.offTarget),
    row('控球率', home.possession, away.possession, '%'),
    row('进攻', home.attacks, away.attacks),
    row('危险进攻', home.dangerous, away.dangerous),
    row('角球', home.corners, away.corners),
    row('任意球', home.freeKicks, away.freeKicks),
    row('界外球', home.throwIns, away.throwIns),
    row('黄牌', home.yellow, away.yellow),
    row('红牌', home.red, away.red),
  ].filter((r) => r.home != null || r.away != null);

  const slides: BreakSlide[] = [{ key: 'score', title: '比分', rows: [] }];
  if (statsRows.length > 0) {
    slides.push({ key: 'stats', title: '比赛统计', rows: statsRows });
  }
  return slides;
}
