// STOMP probe for the live-tracker WS service.
// Usage: node scripts/probe_ws.js [ws://localhost:7070/ws] [matchId] [seconds]
import WebSocket from 'ws';

const url = process.argv[2] || 'ws://localhost:7070/ws';
const matchId = process.argv[3] || '31292812';
const seconds = Number(process.argv[4] || 45);

const ws = new WebSocket(url);
let done = false;

function frame(command, headers = {}, body = '') {
  const lines = [command];
  for (const [k, v] of Object.entries(headers)) lines.push(`${k}:${v}`);
  return `${lines.join('\n')}\n\n${body}\0`;
}

function parseFrames(data) {
  return String(data)
    .split('\0')
    .filter(f => f.trim())
    .map(f => {
      const [head, ...rest] = f.split('\n\n');
      const [command, ...headerLines] = head.split('\n');
      const headers = {};
      for (const line of headerLines) {
        const i = line.indexOf(':');
        if (i > 0) headers[line.slice(0, i)] = line.slice(i + 1);
      }
      return { command, headers, body: rest.join('\n\n') };
    });
}

function fmt(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} (${ms}ms)`;
}

// 1xbet 源时间：yyyyMMddHHmmss[.SSS] 或 yyyyMMddHHmmssSSS
function parseSourceTime(value) {
  const s = String(value ?? '').trim();
  if (s.length < 14) return 0;
  const y = +s.slice(0, 4), mo = +s.slice(4, 6), d = +s.slice(6, 8);
  const h = +s.slice(8, 10), mi = +s.slice(10, 12), se = +s.slice(12, 14);
  let ms = Date.UTC(y, mo - 1, d, h, mi, se);
  const start = s[14] === '.' ? 15 : 14;
  const frac = s.slice(start, start + 3).padEnd(3, '0');
  if (/^\d{3}$/.test(frac)) ms += Number(frac);
  return ms;
}

// 快照里最后一次时钟事件给出的“源侧”比赛时间（不是当前时间，仅供参考）
function sourceClockMs(ev) {
  const tm = parseInt(ev.TM ?? '', 10);
  const ts = parseInt(ev.TS ?? '', 10);
  if (!Number.isFinite(tm)) return null;
  let base = (tm * 60 + (Number.isFinite(ts) ? ts : 0)) * 1000;
  const st = parseSourceTime(ev.ServerTime) + (parseInt(ev.DeltaMilliseconds ?? '', 10) || 0);
  const tu = parseSourceTime(ev.TU);
  if (ev.TT === '1' && st > 0 && tu > 0) base += Math.max(0, st - tu);
  return base;
}

ws.on('open', () => {
  console.log(`connected ${url}, subscribing match ${matchId}`);
  ws.send(frame('CONNECT', { 'accept-version': '1.2', 'heart-beat': '0,0' }));
});

ws.on('message', raw => {
  for (const f of parseFrames(raw)) {
    if (f.command === 'CONNECTED') {
      ws.send(frame('SUBSCRIBE', { id: 'sub-0', destination: '/user/queue/live-tracker', ack: 'auto' }));
      const body = JSON.stringify({ matchId });
      ws.send(frame('SEND', {
        destination: '/app/live-tracker/subscribe',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      }, body));
      console.log(`CONNECTED session=${f.headers.session} -> subscribe sent`);
      continue;
    }
    if (f.command === 'MESSAGE') {
      let msg;
      try { msg = JSON.parse(f.body); } catch { continue; }
      const ev = msg.event || {};
      const now = Date.now();
      const mt = msg.matchTimeMs;
      const source = msg.snapshot === true ? sourceClockMs(ev) : null;
      console.log(JSON.stringify({
        at: new Date(now).toISOString(),
        snapshot: msg.snapshot === true,
        matchTimeMs: mt,
        clock: typeof mt === 'number' ? fmt(mt) : null,
        clockRunning: msg.clockRunning,
        tm: ev.TM, ts: ev.TS, tt: ev.TT,
        serverTime: ev.ServerTime, tu: ev.TU, deltaMs: ev.DeltaMilliseconds,
        vc: ev.VC, xy: ev.XY, ss: ev.SS,
        // 快照中时钟字段对应的“源侧”读数；matchTimeMs 应比它更新
        sourceClockMs: source,
        aheadOfSourceMs: source !== null && typeof mt === 'number' ? mt - source : null,
      }));
    } else if (f.command === 'ERROR') {
      console.log('STOMP ERROR', f.headers, f.body);
    }
  }
});

ws.on('error', e => console.error('ws error', e.message));
ws.on('close', () => { done = true; console.log('closed'); });

setTimeout(() => {
  if (!done) {
    console.log(`done after ${seconds}s`);
    ws.close();
  }
}, seconds * 1000);
