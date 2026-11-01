// Extra-time clock check for LiveTracker.
// Usage: node_modules/.bin/vite-node scripts/clock_extra_time_probe.mjs
globalThis.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
globalThis.cancelAnimationFrame = id => clearTimeout(id);

const { LiveTracker } = await import('../app/engine/LiveTracker.ts');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const show = (t, label) => console.log(
  label,
  `=> ${t.matchMinute}:${String(t.matchSecond).padStart(2, '0')}`,
  `running=${t.timerRunning}`,
  `extra=${t._extraTime}`,
  `sourcePreferred=${t._sourceClockPreferred}`,
);

// 用相对当前时间的动态时间戳，保证 ServerTime 的新鲜度符合测试意图
const base = Math.floor(Date.now() / 1000) * 1000;
const pad = n => String(n).padStart(2, '0');
const utc = offsetMs => {
  const d = new Date(base + offsetMs);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
};
// 场景执行时重新取“现在”，避免脚本启动到执行之间的几秒误差
const stamp = offsetMs => utc(Math.round((Date.now() - base) / 1000) * 1000 + offsetMs);

// --- 19936468：服务端加时赛钉在 90:00 / clockRunning=false，源 TM=105 + 已走 7:08 ---
const t = new LiveTracker([], () => {}, { mode: 'live' });
t.play();
t.addEvent({
  matchTimeMs: '5400000',
  clockRunning: 'false',
  TM: '105', TS: '0', TT: '1',
  ServerTime: stamp(0), TU: stamp(-428000), DeltaMilliseconds: '0',
  VC: '11002', XY: '0.04,0.6', SS: '1-1',
});
show(t, 'ET clamped 90 (19936468) 112:08');

await sleep(2100);
show(t, 'ET +2s                  112:10');

// 增量消息：没有 TM/TT，服务端时钟仍是 90:00 / false — 不能回退
t.addEvent({ matchTimeMs: '5400000', clockRunning: 'false', XY: '0.41,0.81' });
show(t, 'ET delta (no rewind)    112:10');

// 加时中场：源时钟停表
t.addEvent({ VC: '1019', TM: '105', TS: '0', TT: '0' });
show(t, 'ET half time            105:00 stopped');

// --- 20148673：服务端 95:19（从 90:00 重新计时，丢了第一个加时半场），
//     源 TM=105 + TU 已走 5:07，实际应为 110:07 ---
const x = new LiveTracker([], () => {}, { mode: 'live' });
x.play();
x.addEvent({
  matchTimeMs: '5719000',
  clockRunning: 'false',
  TM: '105', TS: '0', TT: '1',
  ServerTime: stamp(0), TU: stamp(-307000), DeltaMilliseconds: '0',
  VC: '11000', SS: '1-1',
});
show(x, 'ET shifted 95:19 (20148673) 110:07');

// 增量消息仍带错误 matchTimeMs — 不能被拉回 95:19
x.addEvent({ PG: '', VC: '21002', matchTimeMs: '5719000', clockRunning: 'false' });
show(x, 'ET delta (no rewind)        110:07');
await sleep(2100);
show(x, 'ET +2s                      110:09');

// --- 快照的 ServerTime 已落后 40s：TT=1 时钟一直在走，应按当前时间补齐 ---
const s = new LiveTracker([], () => {}, { mode: 'live' });
s.play();
s.addEvent({
  matchTimeMs: '5719000',
  clockRunning: 'false',
  TM: '105', TS: '0', TT: '1',
  ServerTime: stamp(-40000), TU: stamp(-360000), DeltaMilliseconds: '0',
  VC: '11000',
});
show(s, 'ET stale snapshot 40s       111:00');

// --- 加时赛开球：TM 还是 90，服务端 matchTimeMs=90:00/clockRunning=false，
//     但源 TT=1 已走表（TU 起 60s）→ 应显示 91:00 而不是冻结在 90:00 ---
const k = new LiveTracker([], () => {}, { mode: 'live' });
k.play();
k.addEvent({
  matchTimeMs: '5400000',
  clockRunning: 'false',
  TM: '90', TS: '0', TT: '1',
  ServerTime: stamp(0), TU: stamp(-60000), DeltaMilliseconds: '0',
  VC: '11000',
});
show(k, 'ET kickoff 90+60s            91:00');

// --- 常规时间仍以服务端时钟为准 ---
const r = new LiveTracker([], () => {}, { mode: 'live' });
r.play();
r.addEvent({ matchTimeMs: String(25 * 60000 + 38000), clockRunning: 'true', TM: '25', TS: '38', TT: '1' });
show(r, 'regular                      25:38');

// 常规时间中场停表
r.addEvent({ matchTimeMs: String(45 * 60000), clockRunning: 'false', TM: '45', TS: '0', TT: '0' });
show(r, 'half time                    45:00 stopped');

t.destroy();
x.destroy();
s.destroy();
k.destroy();
r.destroy();
