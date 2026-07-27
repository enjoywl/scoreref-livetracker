import { useState, useRef, useEffect } from 'react';
import { LiveTracker, type MatchState } from '~/engine/LiveTracker';
import TopBar from '~/components/TopBar';
import FieldView from '~/components/FieldView';
import Timeline from '~/components/Timeline';
import Controls from '~/components/Controls';

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
  zoneAnim: null,
};

export default function Home() {
  const trackerRef = useRef<LiveTracker | null>(null);
  const [state, setState] = useState<MatchState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const resp = await fetch(`data/demo.json?t=${Date.now()}`);
      const raw = await resp.json();
      const events = Array.isArray(raw) ? raw : (raw as { events: Array<Record<string, string>> }).events;
      const t = new LiveTracker(events, setState);
      trackerRef.current = t;
      setLoading(false);
      t.seek(0);
    })();
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

  if (loading) return <div className="loading">Loading...</div>;

  const T = trackerRef.current!;
  return (
    <div className="app">
      <TopBar state={state} team1={T.team1} team2={T.team2} team1Logo={T.team1Logo} team2Logo={T.team2Logo} champ={T.champ} />
      <FieldView tracker={T} state={state} />
      <Timeline events={T.events} totalMs={state.totalMs || T.totalMs} t={state.t} tracker={T} />
      <Controls state={state} tracker={T} />
    </div>
  );
}
