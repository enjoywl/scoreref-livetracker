import type { MatchState } from '~/engine/LiveTracker';

interface TopBarProps {
  state: MatchState;
  team1: string;
  team2: string;
  champ: string;
}

export default function TopBar({ state, team1, team2, champ }: TopBarProps) {
  const { score, minute, statusText } = state;
  return (
    <div className="topbar">
      <span className="champ">{champ || '—'}</span>
      <div className="match">
        <span className="team home">{team1 || 'HOME'}</span>
        <span className="score">{score || '0-0'}</span>
        <span className="team away">{team2 || 'AWAY'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="minute">{minute || "0'"}</span>
        <span className="live-dot" />
        <span style={{ fontSize: 11, color: 'var(--dim)' }}>{statusText || 'LIVE'}</span>
      </div>
    </div>
  );
}
