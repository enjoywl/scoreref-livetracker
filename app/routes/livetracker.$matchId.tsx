import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router';
import { LiveTracker, type MatchState } from '~/engine/LiveTracker';
import { WebSocketClient } from '~/engine/WebSocketClient';
import { getWsUrl } from '~/lib/ws';
import TopBar from '~/components/TopBar';
import FieldView from '~/components/FieldView';

export function meta() {
  return [
    { title: 'Live Tracker — Football Match' },
    { name: 'description', content: 'Real-time football match live tracking' },
  ];
}

interface WsMessage {
  type?: string;
  mid?: string;
  data?: {
    hna?: string;
    ana?: string;
    lna?: string;
    event?: Record<string, unknown>;
  };
}

function adaptMessage(msg: WsMessage, teamInfoSent: { value: boolean }): Array<Record<string, string>> {
  const events: Array<Record<string, string>> = [];

  const hna = msg.data?.hna;
  const ana = msg.data?.ana;
  const lna = msg.data?.lna;

  if (!teamInfoSent.value && hna) {
    teamInfoSent.value = true;
    events.push({
      Player1: hna,
      Player2: ana || '',
      Champ: lna || '',
      VC: '1014',
    } as Record<string, string>);
  }

  const ev = msg.data?.event;
  if (ev) {
    const raw: Record<string, string> = {};
    for (const [k, v] of Object.entries(ev)) {
      if (v !== undefined && v !== null && typeof v !== 'object') {
        raw[k] = String(v);
      }
    }
    if (Object.keys(raw).length > 0) {
      events.push(raw);
    }
  }

  return events;
}

const INITIAL_STATE: MatchState = {
  ballPos: null, activeTooltip: null, currentVC: null, currentPG: '',
  possession: null, playing: false, speed: 10, t: 0, totalMs: 0,
  score: '0-0', minute: "0'", statusText: 'LIVE',
};

export default function LiveTrackerRoute() {
  const { matchId } = useParams();
  const trackerRef = useRef<LiveTracker | null>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const [state, setState] = useState<MatchState>(INITIAL_STATE);
  const [status, setStatus] = useState<'connecting' | 'error' | 'live'>('connecting');

  const channel = `/btracker/${matchId}`;

  if (!trackerRef.current) {
    trackerRef.current = new LiveTracker([], setState, { mode: 'live' });
  }

  const teamInfoSent = useRef({ value: false });

  useEffect(() => {
    const t = trackerRef.current!;
    let cancelled = false;

    const raf = requestAnimationFrame(async () => {
      const ws = new WebSocketClient(getWsUrl());
      wsClientRef.current = ws;
      ws.onMessage = (rawEvent: unknown) => {
        const events = adaptMessage(rawEvent as WsMessage, teamInfoSent);
        for (const ev of events) {
          t.addEvent(ev);
        }
      };

      try {
        await ws.connect();
        if (cancelled) return;
      } catch {
        if (!cancelled) setStatus('error');
        return;
      }

      if (cancelled) return;
      ws.subscribe(channel);
      t.play();
      setStatus('live');
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (wsClientRef.current) {
        wsClientRef.current.unsubscribe(channel);
        wsClientRef.current.disconnect();
      }
    };
  }, [channel]);

  const T = trackerRef.current!;

  if (status === 'error') {
    return <div className="loading">WebSocket connection failed for match {matchId}</div>;
  }

  return (
    <div className="app">
      <TopBar state={state} team1={T.team1} team2={T.team2} champ={T.champ} />
      <FieldView tracker={T} state={state} />

      {status === 'connecting' && (
        <div className="loading" style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(13,17,23,0.92)', zIndex: 100,
        }}>
          Connecting to {channel}...
        </div>
      )}
    </div>
  );
}
