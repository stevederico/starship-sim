// Records a phone-size (1080x1920, 30 fps) promo cut of one full flight.
// Frames are stepped by hand through the dev-only ?step hook, so the result is
// smooth no matter how slow screenshots are. Guidance flies the run.
//
// Needs: dev server (bun run dev), agent-browser, ffmpeg.
// usage: PORT=5173 node scripts/capture-video.mjs [out.mp4]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const FPS = 30;
const port = process.env.PORT ?? '5173';
const out = process.argv[2] ?? 'media/steel-ascent-phone.mp4';
const frames = 'media/frames';
const env = { ...process.env, AGENT_BROWSER_SESSION: process.env.AGENT_BROWSER_SESSION ?? 'steel-ascent' };

const run = (...args) => execFileSync('agent-browser', args, { env, encoding: 'utf8' }).trim();
const evalJs = (js) => JSON.parse(JSON.parse(run('eval', js).split('\n').pop()));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Page helpers: virtual clock for the 2.8 s banner timer, CSS animations off,
// and one call that steps the sim and reports state.
const SETUP = `(() => {
  const real = window.setTimeout;
  window.__vt = 0;
  window.__timers = [];
  window.setTimeout = (fn, ms, ...rest) => {
    if (ms === 2800) { window.__timers.push({ at: window.__vt + ms / 1000, fn }); return 0; }
    return real(fn, ms, ...rest);
  };
  window.__advance = (sim, video) => {
    if (sim > 0) window.__step(sim);
    window.__vt += video;
    const due = window.__timers.filter((t) => t.at <= window.__vt);
    window.__timers = window.__timers.filter((t) => t.at > window.__vt);
    due.forEach((t) => t.fn());
    const m = window.__game.mission;
    const s = m.phase === 'catch' ? m.catch : m.phase === 'orbit' ? m.orbit : m.ascent;
    return JSON.stringify({ phase: m.phase, pt: m.phaseTime, out: m.outcomeTime, status: s && s.status, y: s && s.y });
  };
  const style = document.createElement('style');
  style.textContent = '.banner{animation:none!important}';
  document.head.appendChild(style);
  return JSON.stringify(true);
})()`;

/** Each shot runs until done(state) is true, at speed sim seconds per video second. */
const SHOTS = [
  { name: 'liftoff', speed: 1, done: (s) => s.phase === 'ascent' && s.pt >= 3 },
  { name: 'climb', speed: 10, done: (s) => s.phase === 'ascent' && s.pt >= 43 },
  { name: 'staging', speed: 1.6, done: (s) => s.phase === 'catch' },
  { name: 'catch-brief', speed: 3, done: (s) => s.phase === 'catch' && s.pt >= 2.3 },
  { name: 'catch-fall', speed: 4, done: (s) => s.phase === 'catch' && s.y < 330 },
  { name: 'catch-final', speed: 1.4, done: (s) => s.status === 'caught' },
  { name: 'arms-close', speed: 1, done: (s) => s.status === 'caught' && s.out >= 1.6 },
  { name: 'orbit-brief', speed: 5, done: (s) => s.phase === 'orbit' && s.pt >= 2.3 },
  { name: 'orbit-burn', speed: 14, done: (s) => s.status === 'orbit' },
  { name: 'orbit-hold', speed: 1, done: (s) => s.status === 'orbit' && s.out >= 1.2 },
  { name: 'to-results', speed: 0, done: (s) => s.phase === 'results' },
  { name: 'results', speed: 1, done: (s) => s.phase === 'results' && s.pt >= 2 }
];

rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

run('open', `http://127.0.0.1:${port}/?step=1&touch=1`);
run('set', 'viewport', '405', '720', '2.6667');
const warm = join(frames, 'warm.png');
for (let i = 0; i < 20 && run('eval', 'typeof window.__step') !== '"function"'; i++) {
  run('screenshot', warm); // a paint mounts the canvas in a background tab
  await sleep(400);
}
rmSync(warm, { force: true });
evalJs(SETUP);
const launch = /button "LAUNCH" \[ref=(e\d+)\]/.exec(run('snapshot', '-i', '-c'))?.[1];
run('click', `@${launch}`);
evalJs('(() => { window.__game.mission.autopilot = true; return JSON.stringify(true); })()');

// Silent pre-roll to the moment the engines light.
let state = evalJs('window.__advance(0, 0)');
while (!(state.phase === 'countdown' && state.pt >= 2.1)) state = evalJs('window.__advance(0.05, 0.05)');

let frame = 0;
for (const shot of SHOTS) {
  const start = frame;
  while (!shot.done(state)) {
    if (shot.speed === 0) {
      state = evalJs('window.__advance(0.1, 0)');
      continue;
    }
    state = evalJs(`window.__advance(${shot.speed / FPS}, ${1 / FPS})`);
    run('screenshot', join(frames, `f${String(frame).padStart(5, '0')}.png`));
    frame += 1;
  }
  console.log(`${shot.name}: ${((frame - start) / FPS).toFixed(1)} s`);
}

console.log(`frames: ${readdirSync(frames).length}, ${(frame / FPS).toFixed(1)} s`);
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', String(FPS), '-i', join(frames, 'f%05d.png'),
  '-vf', 'scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-maxrate', '8M', '-bufsize', '16M',
  '-r', String(FPS), '-an', '-movflags', '+faststart', out
]);
console.log(`wrote ${out}`);
