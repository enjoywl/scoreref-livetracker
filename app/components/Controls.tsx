import type { LiveTracker, MatchState } from '~/engine/LiveTracker';

const SPEEDS = [1, 5, 10, 50, 100];

interface ControlsProps {
  state: MatchState;
  tracker: LiveTracker;
  onLoadData: (src: string) => void;
  dataSource: string;
  wsStatus: string;
  liveMode: boolean;
  onConnectLive: () => void;
  onDisconnectLive: () => void;
}

export default function Controls({ state, tracker, onLoadData, dataSource,
  wsStatus, liveMode, onConnectLive, onDisconnectLive }: ControlsProps) {
  const { playing, speed } = state;
  return (
    <div className="controls">
      <button className="btn play-btn" onClick={() => tracker.toggle()}>
        {playing ? '⏸' : '▶'}
      </button>
      {SPEEDS.map(s => (
        <button
          key={s}
          className={'btn' + (speed === s ? ' active' : '')}
          onClick={() => tracker.setSpeed(s)}
        >
          {s}x
        </button>
      ))}
      <button className="btn" onClick={() => tracker.seek(0)}>↻</button>
      <span style={{ flex: 1 }} />
      <div className="stat-bar">
        <button
          className={'btn' + (dataSource === 'demo.json' ? ' active' : '')}
          style={{ fontSize: 10, padding: '3px 8px' }}
          onClick={() => onLoadData('demo.json')}
        >Demo</button>
        <button
          className={'btn' + (dataSource === 'match2.json' ? ' active' : '')}
          style={{ fontSize: 10, padding: '3px 8px' }}
          onClick={() => onLoadData('match2.json')}
        >Match2</button>
        <span className="ws-dot" style={{
          width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
          background: wsStatus === 'connected' ? '#3fb950' :
                      wsStatus === 'connecting' ? '#d29922' :
                      wsStatus === 'error' ? '#f85149' : '#484f58'
        }} title={`WebSocket: ${wsStatus}`} />
        {!liveMode ? (
          <button className="btn" style={{ fontSize: 10, padding: '3px 8px' }}
            onClick={onConnectLive} disabled={wsStatus === 'connecting'}>
            {wsStatus === 'connecting' ? '...' : 'Live'}
          </button>
        ) : (
          <button className="btn active" style={{ fontSize: 10, padding: '3px 8px' }}
            onClick={onDisconnectLive}>LIVE</button>
        )}
        <span>追踪 <span className="val">{tracker.trackPts.length}</span></span>
        <span>事件 <span className="val">{tracker.events.length}</span></span>
        <span>时长 <span className="val">{(tracker.totalMs / 1000).toFixed(0)}s</span></span>
      </div>
    </div>
  );
}
