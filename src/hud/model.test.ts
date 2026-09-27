import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Mission } from '../game/mission.ts';
import type { Phase } from '../game/mission.ts';
import { NO_INPUT } from '../game/types.ts';
import { formatClock, formatKm, hudModel } from './model.ts';

const FRAME = 1 / 60;

function flyTo(mission: Mission, phase: Phase, extraSeconds = 0): void {
  let guard = 0;
  while (mission.phase !== phase && guard++ < 60 * 400) mission.update(FRAME, NO_INPUT);
  for (let t = 0; t < extraSeconds; t += FRAME) mission.update(FRAME, NO_INPUT);
  mission.drainEvents();
}

function demo(seed: number): Mission {
  const mission = new Mission();
  mission.autopilot = true;
  mission.start(seed);
  return mission;
}

describe('hud model', () => {
  it('formats clock and distance', () => {
    assert.equal(formatClock(0), 'T+ 00:00');
    assert.equal(formatClock(83.9), 'T+ 01:23');
    assert.equal(formatKm(1234), '1.2');
    assert.equal(formatKm(Infinity), '---');
  });

  it('title has no flight data', () => {
    const hud = hudModel(new Mission());
    assert.equal(hud.phase, 'title');
    assert.equal(hud.flying, false);
    assert.equal(hud.readouts.length, 0);
  });

  it('countdown shows whole seconds', () => {
    const mission = new Mission();
    mission.start(1);
    assert.equal(hudModel(mission).countdown, 3);
    for (let t = 0; t < 1.5; t += FRAME) mission.update(FRAME, NO_INPUT);
    assert.equal(hudModel(mission).countdown, 2);
  });

  it('ascent offers staging only inside the window', () => {
    const mission = demo(4);
    flyTo(mission, 'ascent', 5);
    const early = hudModel(mission);
    assert.equal(early.actionLabel, 'Stage');
    assert.equal(early.actionReady, false);
    assert.equal(early.flying, true);
    assert.equal(early.bars.length, 3);
    while (mission.ascent.fuel / 3_400_000 > 0.2) mission.update(FRAME, NO_INPUT);
    const late = hudModel(mission);
    assert.equal(late.actionReady, true);
    assert.match(late.prompt ?? '', /Staging window/);
  });

  it('warns when the air load passes the limit', () => {
    const mission = new Mission();
    mission.start(4);
    flyTo(mission, 'ascent');
    while (mission.ascent.q < 22_500 && mission.ascent.t < 100) mission.update(FRAME, NO_INPUT);
    const hud = hudModel(mission);
    assert.equal(hud.promptTone, 'bad');
    assert.match(hud.prompt ?? '', /Throttle down/);
    assert.equal(hud.bars[0]?.tone, 'bad');
  });

  it('catch opens with a briefing, then counts down to the burn', () => {
    const mission = demo(4);
    flyTo(mission, 'catch');
    const intro = hudModel(mission);
    assert.equal(intro.card?.title, 'Booster return');
    assert.equal(intro.flying, false);
    mission.autopilot = false;
    flyTo(mission, 'catch', 2.6);
    const hud = hudModel(mission);
    assert.equal(hud.card, null);
    assert.equal(hud.flying, true);
    assert.match(hud.prompt ?? '', /Landing burn in/);
    assert.equal(hud.readouts.length, 4);
  });

  it('orbit prompts cutoff once the orbit closes', () => {
    const mission = demo(4);
    flyTo(mission, 'orbit', 3);
    const hud = hudModel(mission);
    assert.equal(hud.actionLabel, 'Cutoff');
    assert.equal(hud.actionReady, true);
    assert.equal(hud.readouts.length, 5);
    assert.ok(hud.prograde !== null);
    mission.autopilot = false;
    let sawCutoffPrompt = false;
    while (mission.orbit?.status === 'flying' && (mission.orbit?.t ?? 0) < 600) {
      mission.update(FRAME, {
        ...NO_INPUT,
        steer: Math.sign(mission.cue.angle - (mission.orbit?.angle ?? 0))
      });
      if (hudModel(mission).prompt === 'Orbit closed. Cut the engines') {
        sawCutoffPrompt = true;
        break;
      }
    }
    assert.equal(sawCutoffPrompt, true);
  });
});
