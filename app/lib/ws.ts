/** Protocol-aware WebSocket URL for /v1/soccer/ws */
export function getWsUrl(): string {
  if (typeof window === 'undefined') return '';
  // Same-origin in both dev and production — the Worker proxies /v1/soccer/ws
  // to the backend (via API_BINDING in prod, localhost:3000 in dev)
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/v1/soccer/ws`;
}
