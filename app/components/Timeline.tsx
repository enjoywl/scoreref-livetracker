import { Fragment, useRef, useEffect, useMemo, useState } from 'react';
import type { LiveTracker, ProcessedEvent } from '~/engine/LiveTracker';
import { formatClock } from '~/lib/time';
import TimelineEventTooltip from './TimelineEventTooltip';

interface TimelineProps {
  events: ProcessedEvent[];
  totalMs: number;
  t: number;
  tracker: LiveTracker;
}

/** Pick a ruler interval that keeps the number of labels small at any length. */
function tickIntervalMs(totalMs: number): number {
  const sec = totalMs / 1000;
  if (sec <= 60) return 5_000;
  if (sec <= 180) return 20_000;
  if (sec <= 420) return 30_000;
  if (sec <= 900) return 60_000;
  if (sec <= 1_800) return 120_000;
  return 300_000;
}

function eventSide(ev: ProcessedEvent): 'home' | 'away' | 'neutral' {
  if (ev.info.team === 'home' || ev.info.team === 'away') return ev.info.team;
  if (ev.team === 'home' || ev.team === 'away') return ev.team;
  return 'neutral';
}

export default function Timeline({ events, totalMs, t, tracker }: TimelineProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorLabelRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [hovered, setHovered] = useState<{ ev: ProcessedEvent; left: number } | null>(null);

  const ticks = useMemo(() => {
    if (!(totalMs > 0)) return [];
    const step = tickIntervalMs(totalMs);
    const out: number[] = [];
    for (let ms = 0; ms <= totalMs; ms += step) out.push(ms);
    return out;
  }, [totalMs]);

  useEffect(() => {
    const frac = totalMs > 0 ? Math.min(1, Math.max(0, t / totalMs)) : 0;
    if (fillRef.current) fillRef.current.style.width = `${frac * 100}%`;

    if (cursorLabelRef.current) {
      cursorLabelRef.current.textContent = formatClock(t);
      // Keep the bubble inside the track at both ends.
      cursorLabelRef.current.style.transform =
        frac <= 0.035 ? 'translateX(0)' : frac >= 0.965 ? 'translateX(-100%)' : 'translateX(-50%)';
    }

    if (trackRef.current && cursorRef.current) {
      const tw = trackRef.current.scrollWidth;
      const cp = frac * tw;
      cursorRef.current.style.left = `${cp}px`;

      const outer = outerRef.current;
      if (outer && (cp > outer.scrollLeft + outer.clientWidth - 60 || cp < outer.scrollLeft + 40)) {
        outer.scrollLeft = cp - outer.clientWidth / 2;
      }
    }
  }, [t, totalMs, events.length]);

  const seekFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track || totalMs <= 0) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    tracker.seekFrac(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)));
  };

  return (
    <div
      className="tl-outer"
      ref={outerRef}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('.tl-marker')) return;
        draggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        seekFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) seekFromClientX(e.clientX);
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
    >
      <div className="tl-track" ref={trackRef}>
        <div className="tl-ruler" aria-hidden="true">
          {ticks.map((ms) => (
            <span
              className="tl-tick"
              key={ms}
              style={{ left: `${totalMs > 0 ? (ms / totalMs) * 100 : 0}%` }}
            >
              <span className="tl-tick-line" />
              <span className="tl-tick-label">{formatClock(ms)}</span>
            </span>
          ))}
          <span className="tl-end-label">{formatClock(totalMs)}</span>
        </div>

        <div className="tl-axis" />
        <div className="tl-fill" ref={fillRef} />

        {events.map((ev, i) => {
          const frac = totalMs > 0 ? Math.min(1, Math.max(0, ev.t / totalMs)) : 0;
          const side = eventSide(ev);
          const isGoal = ev.info.cat === 'GOAL';
          const left = `${frac * 100}%`;

          return (
            <Fragment key={i}>
              {isGoal && <span className="tl-goal-band" style={{ left }} />}
              <span
                className={`tl-marker is-${side}${isGoal ? ' goal-marker' : ''}`}
                style={{ left }}
                onMouseEnter={() => setHovered({ ev, left: frac })}
                onMouseLeave={() => setHovered(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  tracker.seek(ev.t);
                }}
              >
                {ev.info.icon}
              </span>
            </Fragment>
          );
        })}

        <TimelineEventTooltip ev={hovered?.ev ?? null} leftFrac={hovered?.left ?? 0} tracker={tracker} />

        <div className="tl-cursor" ref={cursorRef}>
          <span className="tl-cursor-line" />
          <span className="tl-cursor-label" ref={cursorLabelRef}>
            {formatClock(t)}
          </span>
        </div>
      </div>
    </div>
  );
}
