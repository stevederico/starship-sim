// Plays the game through agent-browser and screenshots chosen moments.
// Needs the dev server (bun run dev). Uses the dev-only ?step hook, which
// drives frames by hand so it works even in a background tab.
//
// usage: node scripts/play-browser.mjs <prefix> <url-query> <shots-json> [chunk]
//   shots: [{phase, at, name}] shoots once phase matches and phaseTime >= at
//          [{phase, status, name}] shoots once phase and status match
// env: PORT (default 5173), SHOT_DIR (default docs/screenshots/)
// example: node scripts/play-browser.mjs demo- demo=1 '[{"phase":"results","at":0,"name":"end"}]'
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const [prefix, query, shotsJson, chunkArg] = process.argv.slice(2);
const shots = JSON.parse(shotsJson);
const chunk = Number(chunkArg ?? 0.5);
const env = { ...process.env, AGENT_BROWSER_SESSION: 'starship-sim' };
const dir = process.env.SHOT_DIR ?? new URL('../docs/screenshots/', import.meta.url).pathname;
const port = process.env.PORT ?? '5173';
const warmup = join(tmpdir(), 'starship-sim-warmup.png');
const run = (...args) => {
  try { return execFileSync('agent-browser', args, { env, encoding: 'utf8' }).trim(); } catch (e) { return `ERR ${e.stdout || e.message}`; }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const probe = (step) => `(()=>{${step > 0 ? `window.__step(${step});` : ''}const m=window.__game.mission;const s=m.phase==='catch'?m.catch:m.phase==='orbit'?m.orbit:m.ascent;return JSON.stringify({phase:m.phase,pt:+m.phaseTime.toFixed(2),status:s&&s.status,y:s&&Math.round(s.y),x:s&&Math.round(s.x),thr:s&&+s.throttle.toFixed(2),ang:s&&+(s.angle*57.3).toFixed(1),score:m.score&&m.score.total})})()`;
const read = (out) => { try { return JSON.parse(JSON.parse(out.split('\n').pop())); } catch { return { raw: out }; } };

const url = `http://127.0.0.1:${port}/?step=1&${query}`;
// A session whose pinned tab was closed needs a fresh tab.
if (run('open', url).includes('tab_gone')) run('tab', 'new', url);
await sleep(2500);
let waited = 0;
while (run('eval', 'typeof window.__step') !== '"function"' && waited++ < 20) {
  // A screenshot forces a paint, which mounts the canvas in a background tab.
  run('screenshot', warmup);
  await sleep(500);
}
rmSync(warmup, { force: true });
if (!query.includes('demo')) {
  const snap = run('snapshot', '-i', '-c');
  const ref = /button "LAUNCH" \[ref=(e\d+)\]/.exec(snap)?.[1];
  console.log('click LAUNCH', ref, run('click', '@' + ref));
}
const pending = [...shots];
let total = 0;
let last = '';
while (total < 400) {
  const state = read(run('eval', probe(chunk)));
  total += chunk;
  if (state.raw) { console.log('probe failed', state.raw); break; }
  if (state.phase !== last) { console.log(`${total.toFixed(1)}s -> ${state.phase}`, JSON.stringify(state)); last = state.phase; }
  for (let i = pending.length - 1; i >= 0; i--) {
    const shot = pending[i];
    if (shot.status ? (state.status === shot.status && state.phase === shot.phase) : (state.phase === shot.phase && state.pt >= shot.at)) {
      pending.splice(i, 1);
      await sleep(250);
      run('screenshot', `${dir}${prefix}${shot.name}.png`);
      console.log('shot', shot.name, JSON.stringify(state));
    }
  }
  if (state.phase === 'results' && pending.length === 0) break;
  if (state.phase === 'title' && total > 5) break;
}
console.log('errors:', run('errors'));
console.log('console:', run('console').split('\n').filter((l) => !/vite|DevTools/i.test(l)).slice(-8).join('\n'));
