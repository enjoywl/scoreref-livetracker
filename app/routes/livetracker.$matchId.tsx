import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router';
import { LiveTracker, type MatchState, type RawEvent } from '~/engine/LiveTracker';
import { WebSocketClient } from '~/engine/WebSocketClient';
import {
  fetchMatchInfo,
  computeMatchMinute,
  matchStatusText,
  isMatchFinished,
  isMatchNotStarted,
  type ApiMatchInfo,
} from '~/lib/matchInfo';
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

type Phase = 'loading' | 'not-found' | 'connecting' | 'live' | 'no-tracker' | 'error';

/** How long to wait for the first WS message before falling back to the
 *  static board. The backend sends a snapshot immediately for tracked
 *  matches, so silence means there is no tracking feed. */
const SNAPSHOT_GRACE_MS = 8_000;

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

/** Copy the REST match details onto the tracker so a match without a live
 *  feed still shows the correct teams, crests, score and clock. */
function applyMatchInfo(tracker: LiveTracker, match: ApiMatchInfo): void {
  const homeScore = match.homeScore?.current ?? 0;
  const awayScore = match.awayScore?.current ?? 0;
  tracker.applyDisplayMeta({
    team1: match.homeTeam?.name || match.homeTeam?.shortName || '',
    team2: match.awayTeam?.name || match.awayTeam?.shortName || '',
    team1Id: match.homeTeam?.id != null ? String(match.homeTeam.id) : undefined,
    team2Id: match.awayTeam?.id != null ? String(match.awayTeam.id) : undefined,
    team1Color: match.homeTeam?.teamColors?.primary,
    team2Color: match.awayTeam?.teamColors?.primary,
    champ: match.tournament?.tournamentName || match.tournament?.subTournamentName || '',
    score: `${homeScore}-${awayScore}`,
    matchMinute: computeMatchMinute(match),
    statusText: matchStatusText(match),
    ballAtCenter: true,
  });
}

/** Centred in the animation area whenever the match has no live feed. */
function trackingNotice(match: ApiMatchInfo | null): { title: string; detail: string } {
  if (match && isMatchNotStarted(match)) {
    return {
      title: 'No tracking data',
      detail: 'Tracking data will appear here after kick-off.',
    };
  }
  if (match && isMatchFinished(match)) {
    return {
      title: 'No tracking data',
      detail: 'This match has finished, so there is no live tracking feed.',
    };
  }
  return {
    title: 'No tracking data',
    detail: 'This match has no live tracking feed. Showing match information only.',
  };
}

export default function LiveTrackerRoute() {
  const { matchId } = useParams();
  const trackerRef = useRef<LiveTracker | null>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const [state, setState] = useState<MatchState>(INITIAL_STATE);
  const [phase, setPhase] = useState<Phase>('loading');
  const [matchInfo, setMatchInfo] = useState<ApiMatchInfo | null>(null);

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
    let received = false;
    let infoFound = false;
    let trackingExpected = false;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    const infoAbort = new AbortController();

    const ws = new WebSocketClient(getWsUrl());
    wsClientRef.current = ws;

    const clearGraceTimer = () => {
      if (graceTimer) {
        clearTimeout(graceTimer);
        graceTimer = null;
      }
    };

    // The backend sends nothing at all for matches without tracking data, so
    // silence after subscribing is the signal to show the static board.
    const armGraceTimer = () => {
      clearGraceTimer();
      graceTimer = setTimeout(() => {
        if (cancelled || received) return;
        setPhase(infoFound ? 'no-tracker' : 'error');
      }, SNAPSHOT_GRACE_MS);
    };

    ws.onMessage = (rawEvent: unknown) => {
      const events = adaptMessage(rawEvent as WsMessage);
      if (events.length === 0) return;
      received = true;
      clearGraceTimer();
      for (const ev of events) {
        t.addEvent(ev);
      }
      if (!cancelled) setPhase('live');
    };

    const connect = async () => {
      try {
        await ws.connect();
      } catch {
        clearGraceTimer();
        if (!cancelled) {
          // A known match without a tracker still has a usable static board;
          // a tracked match cannot render anything without the feed.
          setPhase(trackingExpected ? 'error' : infoFound ? 'no-tracker' : 'error');
        }
        return;
      }

      if (cancelled) return;
      ws.subscribe(queueDest);
      ws.send('/app/live-tracker/subscribe', { matchId });
      t.play();
    };

    void (async () => {
      const result = await fetchMatchInfo(matchId, infoAbort.signal);
      if (cancelled) return;

      if (result.kind === 'not-found') {
        // Unknown ids can never produce a feed; don't open a subscription.
        if (!received) setPhase('not-found');
        return;
      }

      if (result.kind === 'found') {
        infoFound = true;
        setMatchInfo(result.match);
        applyMatchInfo(t, result.match);
        // tag9 marks tracker/animation coverage on the parent site. Missing or
        // false means the match exists but has no live tracking feed.
        trackingExpected = result.match.tag9 === true;
        if (!received) setPhase(trackingExpected ? 'connecting' : 'no-tracker');
      } else {
        // REST lookup failed. The feed is still worth trying: if it streams,
        // the page is live; otherwise the grace timer reports an error.
        if (!received) setPhase('connecting');
      }

      // Start the fallback clock now rather than after CONNECTED: a stuck
      // handshake would otherwise leave the loading overlay up forever.
      if (!received) armGraceTimer();
      await connect();
    })();

    return () => {
      cancelled = true;
      infoAbort.abort();
      clearGraceTimer();
      t.destroy();
      ws.send('/app/live-tracker/unsubscribe', { matchId });
      ws.unsubscribe(queueDest);
      ws.disconnect();
    };
  }, [queueDest, matchId]);

  const T = trackerRef.current!;

  if (phase === 'not-found') {
    return (
      <div className="screen-message">
        <div className="screen-message-icon" aria-hidden="true">?</div>
        <h1>Match not found</h1>
        <p>Match {matchId ?? ''} doesn&apos;t exist or is no longer available.</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="screen-message">
        <div className="screen-message-icon" aria-hidden="true">!</div>
        <h1>Live feed unavailable</h1>
        <p>We couldn&apos;t connect to match {matchId}. Check the channel and try again.</p>
      </div>
    );
  }

  const notice = phase === 'no-tracker' ? trackingNotice(matchInfo) : null;

  return (
    <div className="app">
      <FieldView
        tracker={T}
        state={state}
        staticView={phase === 'no-tracker'}
        notice={
          notice && (
            <>
              <span className="field-notice-title">{notice.title}</span>
              <span className="field-notice-detail">{notice.detail}</span>
            </>
          )
        }
      />

      {(phase === 'loading' || phase === 'connecting') && (
        <Loading
          overlay
          label={phase === 'loading' ? 'Loading match' : 'Connecting to live feed'}
          detail={`Match ${matchId ?? ''}`}
        />
      )}
    </div>
  );
}
