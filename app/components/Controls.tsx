import type { LiveTracker, MatchState } from '~/engine/LiveTracker';
import { formatClock } from '~/lib/time';

const SPEEDS = [1, 5, 10, 50, 100];
const SEEK_STEP_MS = 5000;

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 5.5v13l10.5-6.5z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

interface ControlsProps {
  state: MatchState;
  tracker: LiveTracker;
}

export default function Controls({ state, tracker }: ControlsProps) {
  const { playing, speed } = state;

  const seekBy = (delta: number) => {
    tracker.seek(Math.max(0, Math.min(tracker.totalMs, tracker.t + delta)));
  };

  return (
    <div className="controls">
      <div className="transport">
        <button
          type="button"
          className="icon-btn"
          onClick={() => tracker.seek(0)}
          title="Restart (Home)"
          aria-label="Restart replay"
        >
          <RestartIcon />
        </button>
        <button
          type="button"
          className="icon-btn skip-btn"
          onClick={() => seekBy(-SEEK_STEP_MS)}
          title="Back 5 seconds (←)"
          aria-label="Back 5 seconds"
        >
          −5s
        </button>
        <button
          type="button"
          className="play-btn"
          onClick={() => tracker.toggle()}
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          className="icon-btn skip-btn"
          onClick={() => seekBy(SEEK_STEP_MS)}
          title="Forward 5 seconds (→)"
          aria-label="Forward 5 seconds"
        >
          +5s
        </button>
      </div>

      <span className="control-divider" aria-hidden="true" />

      <div className="speed-group">
        <span className="control-label">Speed</span>
        <div className="segmented" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className={'seg-btn' + (speed === s ? ' active' : '')}
              aria-pressed={speed === s}
              onClick={() => tracker.setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <span className="spacer" />

      <div className="shortcut-hint" aria-hidden="true">
        <kbd className="kbd">Space</kbd>
        <span>play</span>
        <span className="hint-sep">·</span>
        <kbd className="kbd">←</kbd>
        <kbd className="kbd">→</kbd>
        <span>seek 5s</span>
      </div>

      <div className="stat-bar">
        <div className="stat">
          <span className="stat-label">Tracked</span>
          <span className="stat-value">{tracker.trackPts.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Events</span>
          <span className="stat-value">{tracker.events.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Duration</span>
          <span className="stat-value">{formatClock(tracker.totalMs)}</span>
        </div>
      </div>
    </div>
  );
}
