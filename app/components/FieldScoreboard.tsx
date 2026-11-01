import { useMemo } from 'react';
import type { LiveTracker, MatchState } from '~/engine/LiveTracker';
import { vcBase, POSS_CODES } from '~/data/vcMap';
import { LiveTracker as LiveTrackerClass } from '~/engine/LiveTracker';
import EntityImage from './EntityImage';
import KitIcon from './KitIcon';

interface FieldScoreboardProps {
  tracker: LiveTracker;
  state: MatchState;
}

interface TeamStats {
  onTarget: number;
  offTarget: number;
  attacks: number;
  dangerous: number;
  corners: number;
  yellow: number;
  red: number;
  subs: number;
  possession: number;
}

function computeStats(events: LiveTracker['events'], totalMs: number, team: 'home' | 'away'): TeamStats {
  const sorted = [...events].sort((a, b) => a.t - b.t);
  let ms = 0;
  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];
    if (ev.team !== team) continue;
    const base = vcBase(ev.vc);
    const isMove =
      LiveTrackerClass.DA_CODES.has(base) ||
      LiveTrackerClass.ATTACK_CODES.has(base) ||
      POSS_CODES.has(base);
    if (!isMove) continue;
    const nextT = i + 1 < sorted.length ? sorted[i + 1].t : totalMs;
    ms += Math.max(0, nextT - ev.t);
  }
  const otherTeam = team === 'home' ? 'away' : 'home';
  const otherMs = (() => {
    let m = 0;
    for (let i = 0; i < sorted.length; i++) {
      const ev = sorted[i];
      if (ev.team !== otherTeam) continue;
      const base = vcBase(ev.vc);
      const isMove =
        LiveTrackerClass.DA_CODES.has(base) ||
        LiveTrackerClass.ATTACK_CODES.has(base) ||
        POSS_CODES.has(base);
      if (!isMove) continue;
      const nextT = i + 1 < sorted.length ? sorted[i + 1].t : totalMs;
      m += Math.max(0, nextT - ev.t);
    }
    return m;
  })();
  const total = ms + otherMs || 1;

  const stats = { onTarget: 0, offTarget: 0, attacks: 0, dangerous: 0, corners: 0, yellow: 0, red: 0, subs: 0, possession: 0 };
  for (const ev of sorted) {
    if (ev.team !== team) continue;
    const base = vcBase(ev.vc);
    const cat = ev.info.cat;
    if (base === 1008 || base === 1011) stats.onTarget++;
    if (base === 1012) stats.offTarget++;
    if (LiveTrackerClass.ATTACK_CODES.has(base)) stats.attacks++;
    if (LiveTrackerClass.DA_CODES.has(base)) stats.dangerous++;
    if (cat === 'CORNER') stats.corners++;
    if (cat === 'YELLOW_CARD') stats.yellow++;
    if (cat === 'RED_CARD') stats.red++;
    if (cat === 'SUBSTITUTION') stats.subs++;
  }
  stats.possession = Math.round((ms / total) * 100);
  return stats;
}

export default function FieldScoreboard({ tracker, state }: FieldScoreboardProps) {
  const homeName = tracker.team1 || 'Home';
  const awayName = tracker.team2 || 'Away';
  const homeColor = tracker.team1Color || 'var(--home)';
  const awayColor = tracker.team2Color || 'var(--away)';
  const totalMs = state.totalMs || tracker.totalMs;

  const home = useMemo(() => computeStats(tracker.events, totalMs, 'home'), [tracker.events, totalMs]);
  const away = useMemo(() => computeStats(tracker.events, totalMs, 'away'), [tracker.events, totalMs]);

  // 比分拆成 主队-客队 两段加间隔，避免数字挤在中间的短横线上
  const scoreParts = state.score.split('-');
  const hasScoreParts = scoreParts.length === 2 && !!scoreParts[0].trim() && !!scoreParts[1].trim();

  // 比分更新由独立事件驱动，这里只做展示，不额外做闪动/脉冲反馈。

  return (
    <div className="field-scoreboard">
      <div className="fs-card">
        <div className="fs-main">
          <div className="fs-side fs-home" style={{ ['--team-color' as string]: homeColor }}>
            <EntityImage type="team" id={tracker.team1Id} alt={homeName} className="fs-crest" fallbackColor={homeColor} />
            <span className="fs-team-name">{homeName}</span>
            <div className="fs-mini-stats">
              <span title="Yellow cards"><i className="card-icon card-yellow" /> {home.yellow}</span>
              <span title="Red cards"><i className="card-icon card-red" /> {home.red}</span>
              <span title="Corners">🚩 {home.corners}</span>
            </div>
          </div>

          <div className="fs-center">
            <KitIcon color={homeColor} kit={tracker.team1Kit} className="fs-kit fs-kit-home" />
            <div className="fs-score-col">
              <span className="fs-minute">{state.minute}</span>
              <span className="fs-score-value">
                {hasScoreParts ? (
                  <>
                    <span>{scoreParts[0].trim()}</span>
                    <span className="fs-score-sep">-</span>
                    <span>{scoreParts[1].trim()}</span>
                  </>
                ) : (
                  state.score
                )}
              </span>
            </div>
            <KitIcon color={awayColor} kit={tracker.team2Kit} className="fs-kit fs-kit-away" />
          </div>

          <div className="fs-side fs-away" style={{ ['--team-color' as string]: awayColor }}>
            <span className="fs-team-name">{awayName}</span>
            <div className="fs-mini-stats">
              <span title="Yellow cards"><i className="card-icon card-yellow" /> {away.yellow}</span>
              <span title="Red cards"><i className="card-icon card-red" /> {away.red}</span>
              <span title="Corners">🚩 {away.corners}</span>
            </div>
            <EntityImage type="team" id={tracker.team2Id} alt={awayName} className="fs-crest" fallbackColor={awayColor} />
          </div>
        </div>
      </div>
    </div>
  );
}
