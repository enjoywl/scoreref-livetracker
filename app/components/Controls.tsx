import type { LiveTracker, MatchState } from '~/engine/LiveTracker';

const SPEEDS = [1, 5, 10, 50, 100];

interface ControlsProps {
  state: MatchState;
  tracker: LiveTracker;
}

export default function Controls({ state, tracker }: ControlsProps) {
  const { playing, speed } = state;
  return (
    <div className="controls">
      <button className="btn play-btn" onClick={() => tracker.toggle()}>
        {playing ? '⏸' : '▶'}
      </button>
      {SPEEDS.map(s => (
        <button
          key={s}
          className={'btn' + (speed === s ? ' active' : '')}
          onClick={() => tracker.setSpeed(s)}
        >
          {s}x
        </button>
      ))}
      <button className="btn" onClick={() => tracker.seek(0)}>↻</button>
      <span style={{ flex: 1 }} />
      <div className="stat-bar">
        <span>追踪 <span className="val">{tracker.trackPts.length}</span></span>
        <span>事件 <span className="val">{tracker.events.length}</span></span>
        <span>时长 <span className="val">{(tracker.totalMs / 1000).toFixed(0)}s</span></span>
      </div>
    </div>
  );
}
