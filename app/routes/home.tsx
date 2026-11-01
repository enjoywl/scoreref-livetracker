import { useState, useRef, useEffect } from 'react';
import { LiveTracker, type MatchState } from '~/engine/LiveTracker';
import FieldView from '~/components/FieldView';
import Timeline from '~/components/Timeline';
import Controls from '~/components/Controls';
import Loading from '~/components/Loading';

export function meta() {
  return [
    { title: 'Football Live Tracker' },
    { name: 'description', content: 'Real-time football match visualization' },
  ];
}

const INITIAL_STATE: MatchState = {
  ballPos: null, activeTooltip: null, currentVC: null, currentPG: '',
  possession: null, playing: false, speed: 10, t: 0, totalMs: 0,
  score: '0-0', minute: "0'", statusText: 'LIVE',
  zoneAnim: null, goalCelebrating: false, closeupArt: null, shootout: null,
  breakStats: null,
};

export default function Home() {
  const trackerRef = useRef<LiveTracker | null>(null);
  const [state, setState] = useState<MatchState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`data/demo.json?t=${Date.now()}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const raw = await resp.json();
        const events = Array.isArray(raw) ? raw : (raw as { events: Array<Record<string, string>> }).events;
        if (!Array.isArray(events) || events.length === 0) {
          setLoading(false);
          return;
        }
        const t = new LiveTracker(events, setState);
        trackerRef.current = t;
        setLoading(false);
        t.seek(0);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to load match data'));
        setLoading(false);
      }
    })();

    return () => {
      trackerRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') return;
      const T = trackerRef.current;
      if (!T) return;
      switch (e.key) {
        case ' ': e.preventDefault(); T.toggle(); break;
        case 'ArrowLeft': T.seek(Math.max(0, T.t - 5000)); break;
        case 'ArrowRight': T.seek(Math.min(T.totalMs, T.t + 5000)); break;
        case 'Home': T.seek(0); break;
        case 'End': T.seek(T.totalMs); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (loading) {
    return <Loading label="Preparing match" detail="Loading the demo tracking feed…" />;
  }

  if (error) {
    return (
      <div className="screen-message" role="alert">
        <div className="screen-message-icon" aria-hidden="true">!</div>
        <h1>Unable to load match</h1>
        <p>{error.message || 'Something went wrong while fetching the demo data.'}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }

  const T = trackerRef.current;
  if (!T || T.events.length === 0) {
    return (
      <div className="screen-message">
        <div className="screen-message-icon" aria-hidden="true">?</div>
        <h1>No match data</h1>
        <p>The demo feed is empty. Add events to public/data/demo.json to see the replay.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <FieldView tracker={T} state={state} />
      <Timeline events={T.events} totalMs={state.totalMs || T.totalMs} t={state.t} tracker={T} />
      <Controls state={state} tracker={T} />
    </div>
  );
}
