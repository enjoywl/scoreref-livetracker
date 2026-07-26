import { useRef, useEffect } from 'react';
import type { LiveTracker, ProcessedEvent } from '~/engine/LiveTracker';

interface TimelineProps {
  events: ProcessedEvent[];
  totalMs: number;
  t: number;
  tracker: LiveTracker;
}

export default function Timeline({ events, totalMs, t, tracker }: TimelineProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frac = totalMs > 0 ? t / totalMs : 0;
    if (fillRef.current) fillRef.current.style.width = (frac * 100) + '%';
    if (trackRef.current && cursorRef.current) {
      const tw = trackRef.current.scrollWidth;
      cursorRef.current.style.left = (frac * tw) + 'px';
      if (outerRef.current) {
        const cp = frac * tw;
        const outer = outerRef.current;
        if (cp > outer.scrollLeft + outer.clientWidth - 40 || cp < outer.scrollLeft + 40) {
          outer.scrollLeft = cp - outer.clientWidth / 2;
        }
      }
    }
  }, [t, totalMs, events.length]);

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('tl-marker')) return;
    const rect = trackRef.current!.getBoundingClientRect();
    tracker.seekFrac((e.clientX - rect.left) / rect.width);
  };

  return (
    <div className="tl-outer" ref={outerRef} onClick={handleClick}>
      <div className="tl-track" ref={trackRef}>
        <div className="tl-axis" />
        <div className="tl-fill" ref={fillRef} />
        <div className="tl-cursor" ref={cursorRef} />
        {events.map((ev, i) => {
          const frac = ev.t / totalMs;
          return (
            <span
              key={i}
              className={'tl-marker' + (ev.info.cat === 'GOAL' ? ' goal-marker' : '')}
              style={{ left: (frac * 100) + '%' }}
              title={`${ev.info.zh}${ev.pg ? ' - ' + ev.pg : ''} (${ev.tm || '?'}')`}
              onClick={(e) => { e.stopPropagation(); tracker.seek(ev.t); }}
            >
              {ev.info.icon}
            </span>
          );
        })}
      </div>
    </div>
  );
}
