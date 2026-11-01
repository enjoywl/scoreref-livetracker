// Runtime check for the server-owned match clock path in LiveTracker.
// Usage: node_modules/.bin/vite-node scripts/clock_probe.mjs
globalThis.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
globalThis.cancelAnimationFrame = id => clearTimeout(id);

const { LiveTracker } = await import('../app/engine/LiveTracker.ts');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const show = (t, label) => console.log(label, `=> ${t.matchMinute}:${String(t.matchSecond).padStart(2, '0')}`, `running=${t.timerRunning}`);

const t = new LiveTracker([], () => {}, { mode: 'live' });
t.play();

// 服务端快照：25:38.382，走表
t.addEvent({
  matchTimeMs: String(25 * 60000 + 38 * 1000 + 382),
  clockRunning: 'true',
  Player1: 'Home', Player2: 'Away',
});
show(t, 'snapshot  25:38');

await sleep(2100);
show(t, 'after 2s  ');

// 普通增量没有时钟字段：继续按真实时间走
t.addEvent({ XY: '0.5,0.5', VC: '1' });
show(t, 'delta     ');

// 暂停（中场）：matchTimeMs=45:00，clockRunning=false
t.addEvent({ matchTimeMs: String(45 * 60000), clockRunning: 'false', TM: '45', TS: '0', TT: '0' });
show(t, 'paused   45:00');
await sleep(2100);
show(t, 'still paused');

// 下半场恢复：46:03，走表
t.addEvent({ matchTimeMs: String(46 * 60000 + 3000), clockRunning: 'true', TT: '1' });
show(t, 'resume   46:03');
await sleep(1100);
show(t, 'after 1s  ');

// 旧格式兜底：没有 matchTimeMs 时仍走 1xbet 公式
const old = new LiveTracker([], () => {}, { mode: 'live' });
old.play();
old.addEvent({
  TM: '26', TS: '18', TT: '1', TU: '20261027105713',
  ServerTime: '20261027105708.626', DeltaMilliseconds: '9465',
});
show(old, 'legacy   26:23');

t.destroy();
old.destroy();
