import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router';
import { LiveTracker, type MatchState, type RawEvent } from '~/engine/LiveTracker';
import { WebSocketClient } from '~/engine/WebSocketClient';
import { getWsUrl } from '~/lib/ws';
import FieldView from '~/components/FieldView';
import Loading from '~/components/Loading';

export function meta() {
  return [
    { title: 'Live Tracker — Football Match' },
    { name: 'description', content: 'Real-time football match live tracking' },
  ];
}

interface WsMessage {
  matchId?: string;
  event?: Record<string, unknown>;
  ts?: number;
  snapshot?: boolean;
  /** 服务端在发送时刻计算的当前比赛时间（毫秒） */
  matchTimeMs?: number;
  /** 比赛时钟是否在走表（服务端合并后的 TT 状态） */
  clockRunning?: boolean;
}

function adaptMessage(msg: WsMessage): RawEvent[] {
  const raw: Record<string, unknown> = {};
  const ev = msg.event;
  if (ev) {
    for (const [k, v] of Object.entries(ev)) {
      if (v === undefined || v === null) continue;
      // TeamKits 是 [主队, 客队] 对象数组（TC 球衣主色），不能当普通标量丢弃，
      // 否则 LiveTracker 永远拿不到球衣颜色，只能显示默认色。
      if (k === 'TeamKits' && Array.isArray(v)) {
        raw.TeamKits = v;
      } else if (typeof v !== 'object') {
        raw[k] = String(v);
      }
    }
  }
  // 服务端时钟是消息级元数据，注入事件后交给 LiveTracker 统一消费
  if (typeof msg.matchTimeMs === 'number') {
    raw.matchTimeMs = String(Math.round(msg.matchTimeMs));
  }
  if (typeof msg.clockRunning === 'boolean') {
    raw.clockRunning = String(msg.clockRunning);
  }
  // 快照标记：LiveTracker 收到后只按 VC 还原状态，忽略快照里可能过期的 XY
  if (msg.snapshot === true) {
    raw.snapshot = 'true';
  }

  return Object.keys(raw).length > 0 ? [raw as RawEvent] : [];
}

const INITIAL_STATE: MatchState = {
  ballPos: null, activeTooltip: null, currentVC: null, currentPG: '',
  possession: null, playing: false, speed: 10, t: 0, totalMs: 0,
  score: '0-0', minute: "0'", statusText: 'LIVE', zoneAnim: null,
  goalCelebrating: false, closeupArt: null, shootout: null, breakStats: null,
};

export default function LiveTrackerRoute() {
  const { matchId } = useParams();
  const trackerRef = useRef<LiveTracker | null>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const [state, setState] = useState<MatchState>(INITIAL_STATE);
  const [status, setStatus] = useState<'connecting' | 'error' | 'live'>('connecting');

  // 用户队列流程: 订阅 /user/queue/live-tracker 后向 /app/live-tracker/subscribe 注册,
  // 服务端会先补发一条 snapshot=true 的累计快照(比分/时间/球位/队名),再推实时事件。
  // 公开广播 /topic/live-tracker/{matchId} 无快照且会与用户队列重复,故不用。
  const queueDest = '/user/queue/live-tracker';

  if (!trackerRef.current) {
    trackerRef.current = new LiveTracker([], setState, { mode: 'live' });
  }

  useEffect(() => {
    const t = trackerRef.current!;
    let cancelled = false;

    const raf = requestAnimationFrame(async () => {
      const ws = new WebSocketClient(getWsUrl());
      wsClientRef.current = ws;
      ws.onMessage = (rawEvent: unknown) => {
        const events = adaptMessage(rawEvent as WsMessage);
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
      ws.subscribe(queueDest);
      ws.send('/app/live-tracker/subscribe', { matchId });
      t.play();
      setStatus('live');
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      t.destroy();
      if (wsClientRef.current) {
        wsClientRef.current.send('/app/live-tracker/unsubscribe', { matchId });
        wsClientRef.current.unsubscribe(queueDest);
        wsClientRef.current.disconnect();
      }
    };
  }, [queueDest, matchId]);

  const T = trackerRef.current!;

  if (status === 'error') {
    return (
      <div className="screen-message">
        <div className="screen-message-icon" aria-hidden="true">!</div>
        <h1>Live feed unavailable</h1>
        <p>We couldn&apos;t connect to match {matchId}. Check the channel and try again.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <FieldView tracker={T} state={state} />

      {status === 'connecting' && (
        <Loading overlay label="Connecting to match" detail={`Live channel ${matchId ?? ''}`} />
      )}
    </div>
  );
}
