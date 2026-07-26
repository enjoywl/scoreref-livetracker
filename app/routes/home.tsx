import { useState, useRef, useEffect, useCallback } from 'react';
import { LiveTracker, type MatchState } from '~/engine/LiveTracker';
import { WebSocketClient } from '~/engine/WebSocketClient';
import { getWsUrl } from '~/lib/ws';
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
};

export default function Home() {
  const [dataSource, setDataSource] = useState('match2.json');
  const trackerRef = useRef<LiveTracker | null>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const [state, setState] = useState<MatchState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState<string>('disconnected');
  const [liveMode, setLiveMode] = useState(false);

  const disconnectLive = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.unsubscribe('/btracker/2343684703');
      wsClientRef.current.disconnect();
    }
    if (trackerRef.current) {
      trackerRef.current.pause();
    }
    setLiveMode(false);
    setWsStatus('disconnected');
  }, []);

  const connectLive = useCallback(async () => {
    if (!wsClientRef.current) {
      wsClientRef.current = new WebSocketClient(getWsUrl());
      wsClientRef.current.onStatusChange = setWsStatus;
      wsClientRef.current.onMessage = (rawEvent: unknown) => {
        if (trackerRef.current) {
          trackerRef.current.addEvent(rawEvent as Record<string, string>);
        }
      };
    }

    try {
      await wsClientRef.current.connect();
    } catch {
      return;
    }

    // Reset and initialize tracker for live mode
    if (trackerRef.current) {
      trackerRef.current.reset();
      trackerRef.current.setMode('live');
    } else {
      trackerRef.current = new LiveTracker([], setState, { mode: 'live' });
    }
    setLiveMode(true);

    wsClientRef.current.subscribe('/btracker/2343684703');
    trackerRef.current.play();
  }, []);

  const loadData = useCallback(async (src: string) => {
    // Disconnect WebSocket if in live mode
    if (liveMode) disconnectLive();

    setLoading(true);
    const resp = await fetch(`data/${src}?t=${Date.now()}`);
    const data = await resp.json() as { events: Array<Record<string, string>> };
    const t = new LiveTracker(data.events, setState);
    trackerRef.current = t;
    setDataSource(src);
    setLoading(false);
    t.seek(0);
  }, [liveMode, disconnectLive]);

  useEffect(() => {
    loadData('demo.json');
  }, [loadData]);

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

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsClientRef.current) wsClientRef.current.disconnect();
    };
  }, []);

  const T = trackerRef.current;
  if (loading || (!T && !liveMode)) return <div className="loading">Loading...</div>;

  return (
    <div className="app">
      <TopBar state={state} team1={T ? T.team1 : ''} team2={T ? T.team2 : ''} champ={T ? T.champ : ''} />
      <FieldView tracker={T!} state={state} />
      <Timeline events={T ? T.events : []} totalMs={state.totalMs || (T ? T.totalMs : 0)} t={state.t} tracker={T!} />
      <Controls
        state={state} tracker={T!} onLoadData={loadData} dataSource={dataSource}
        wsStatus={wsStatus} liveMode={liveMode}
        onConnectLive={connectLive} onDisconnectLive={disconnectLive}
      />
    </div>
  );
}
