/** Protocol-aware WebSocket URL for /v1/soccer/ws */
export function getWsUrl(): string {
  if (typeof window === 'undefined') return '';
  // In dev mode, connect directly to the local backend
  if (import.meta.env.DEV) {
    return 'ws://localhost:3000/v1/soccer/ws';
  }
  // In production, same-origin — Worker proxies via API_BINDING
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/v1/soccer/ws`;
}
