/**
 * Parent-site match detail API.
 *
 * The tracker page can be opened for matches that have no tracking feed at
 * all (or that no longer exist). The WebSocket service stays silent in both
 * cases, so this REST lookup is what lets the page tell them apart and render
 * the real teams/score/clock instead of a fake 0-0 live board.
 *
 * The endpoint returns HTTP 200 with `data: null` for unknown ids, so "not
 * found" is a data check rather than a status-code check.
 */

// Same-origin in production (the page is served from www.scoreref.com).
// The dev server has no /v2 proxy, so local runs query the live API instead
// unless VITE_API_BASE_URL overrides it.
const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'https://www.scoreref.com' : '');
const REQUEST_TIMEOUT_MS = 6000;

export interface ApiTeamInfo {
  id?: number | string;
  name?: string;
  shortName?: string;
  teamColors?: {
    primary?: string;
    secondary?: string;
    text?: string;
  };
}

export interface ApiMatchInfo {
  id?: number | string;
  tag9?: boolean;
  homeTeam?: ApiTeamInfo;
  awayTeam?: ApiTeamInfo;
  tournament?: {
    tournamentName?: string;
    subTournamentName?: string;
    categoryName?: string;
  };
  status?: {
    code?: number;
    desc?: string;
    type?: string;
  };
  time?: {
    periodStartTime?: number;
  };
  lastPeriod?: string;
  matchTime?: number;
  homeScore?: {
    current?: number;
    period1?: number;
    period2?: number;
  };
  awayScore?: {
    current?: number;
    period1?: number;
    period2?: number;
  };
}

export type MatchInfoResult =
  | { kind: 'found'; match: ApiMatchInfo }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string };

interface ApiEnvelope {
  code?: number;
  message?: string;
  data?: ApiMatchInfo | null;
}

export async function fetchMatchInfo(
  matchId: string | undefined,
  signal?: AbortSignal,
): Promise<MatchInfoResult> {
  if (!matchId) return { kind: 'not-found' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetch(
      `${API_BASE}/v2/api/soccer/match/${encodeURIComponent(matchId)}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      },
    );

    if (response.status === 404) return { kind: 'not-found' };
    if (!response.ok) {
      return { kind: 'error', message: `HTTP ${response.status}: ${response.statusText}` };
    }

    const json = (await response.json()) as ApiEnvelope;
    if (json.code !== undefined && json.code !== 0 && json.code !== 200) {
      return { kind: 'error', message: json.message || `API error code ${json.code}` };
    }
    if (!json.data) return { kind: 'not-found' };

    return { kind: 'found', match: json.data };
  } catch (error) {
    if (signal?.aborted) return { kind: 'error', message: 'aborted' };
    return {
      kind: 'error',
      message: error instanceof Error ? error.message : 'Request failed',
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** Period start → base minute mapping used by the parent site's live clock. */
const PERIODS: Record<number, { base: number; length: number }> = {
  6: { base: 0, length: 45 },
  7: { base: 45, length: 45 },
  41: { base: 90, length: 15 },
  42: { base: 105, length: 15 },
};

export function isMatchFinished(match: ApiMatchInfo): boolean {
  const type = (match.status?.type ?? '').toLowerCase();
  const code = match.status?.code;
  return type === 'finished' || (typeof code === 'number' && code >= 100);
}

/** Kickoff scheduled (or postponed/cancelled) and no tracking is expected yet. */
export function isMatchNotStarted(match: ApiMatchInfo): boolean {
  const type = (match.status?.type ?? '').toLowerCase();
  return type === 'scheduled' || type === 'postponed' || type === 'cancelled';
}

/**
 * Display minute for a match that has no live feed. Mirrors the parent site's
 * `computeLiveMinute`: current period base + elapsed since the period started.
 * Returns a whole match minute; the scoreboard appends `:00` seconds.
 */
export function computeMatchMinute(match: ApiMatchInfo): number {
  const type = (match.status?.type ?? '').toLowerCase();
  const code = match.status?.code;
  const lastPeriod = (match.lastPeriod ?? '').toLowerCase();
  const extra =
    code === 41 || code === 42 || lastPeriod === 'extra1' || lastPeriod === 'extra2';

  if (isMatchFinished(match)) return extra ? 120 : 90;
  if (code === 31) return 45; // half time
  if (type !== 'inprogress') return 0;

  const start = match.time?.periodStartTime;
  if (!start) return 0;

  const spec =
    (code !== undefined ? PERIODS[code] : undefined) ??
    (lastPeriod === 'extra1'
      ? PERIODS[41]
      : lastPeriod === 'extra2'
        ? PERIODS[42]
        : undefined);
  if (!spec) return 0;

  const elapsed = Math.max(0, Math.floor((Date.now() / 1000 - start) / 60));
  return spec.base + elapsed;
}

export function matchStatusText(match: ApiMatchInfo): string {
  const type = (match.status?.type ?? '').toLowerCase();
  const code = match.status?.code;
  if (code === 31) return 'HALF TIME';
  if (isMatchFinished(match)) return 'FULL TIME';
  if (type === 'inprogress') return 'LIVE';
  if (type === 'postponed') return 'POSTPONED';
  if (type === 'cancelled') return 'CANCELLED';
  return 'SCHEDULED';
}
