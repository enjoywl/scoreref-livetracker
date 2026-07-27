import { useState } from 'react';
import type { MatchState } from '~/engine/LiveTracker';

interface TopBarProps {
  state: MatchState;
  team1: string;
  team2: string;
  team1Logo: string;
  team2Logo: string;
  champ: string;
}

export default function TopBar({ state, team1, team2, team1Logo, team2Logo, champ }: TopBarProps) {
  const { score, minute, statusText } = state;
  const [img1Err, setImg1Err] = useState(false);
  const [img2Err, setImg2Err] = useState(false);

  return (
    <div className="topbar">
      <span className="champ">{champ || '—'}</span>
      <div className="match">
        <span className="team home">
          {team1Logo && !img1Err && <img src={team1Logo} className="team-logo" alt="" onError={() => setImg1Err(true)} />}
          {team1 || 'HOME'}
        </span>
        <span className="score">{score || '0-0'}</span>
        <span className="team away">
          {team2 || 'AWAY'}
          {team2Logo && !img2Err && <img src={team2Logo} className="team-logo" alt="" onError={() => setImg2Err(true)} />}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="minute">{minute || "0'"}</span>
        <span className="live-dot" />
        <span style={{ fontSize: 11, color: 'var(--dim)' }}>{statusText || 'LIVE'}</span>
      </div>
    </div>
  );
}
