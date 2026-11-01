import type { LiveTracker, ProcessedEvent } from '~/engine/LiveTracker';

interface TimelineEventTooltipProps {
  ev: ProcessedEvent | null;
  leftFrac: number;
  tracker: LiveTracker;
}

function eventSide(ev: ProcessedEvent): 'home' | 'away' | 'neutral' {
  if (ev.info.team === 'home' || ev.info.team === 'away') return ev.info.team;
  if (ev.team === 'home' || ev.team === 'away') return ev.team;
  return 'neutral';
}

export default function TimelineEventTooltip({ ev, leftFrac, tracker }: TimelineEventTooltipProps) {
  if (!ev) return null;

  const side = eventSide(ev);
  const teamName =
    side === 'home' ? tracker.team1 || 'Home' : side === 'away' ? tracker.team2 || 'Away' : '';

  return (
    <div
      className={`tl-tooltip is-${side}`}
      style={{ left: `${leftFrac * 100}%` }}
      role="tooltip"
    >
      <div className="tl-tooltip-inner">
        {teamName && <div className="tl-tooltip-team">{teamName}</div>}
        <div className="tl-tooltip-event">
          <span className="tl-tooltip-icon" aria-hidden="true">
            {ev.info.icon}
          </span>
          <span>{ev.info.zh || ev.info.en}</span>
        </div>
        {ev.tm && <div className="tl-tooltip-minute">{ev.tm}&apos;</div>}
        {/* PG sits on its own row at the bottom. */}
        {ev.pg && <div className="tl-tooltip-player-row">{ev.pg}</div>}
      </div>
    </div>
  );
}
