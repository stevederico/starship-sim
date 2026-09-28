import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Mission, TIMING } from './mission.ts';
import type { MissionEventType, Phase } from './mission.ts';
import { NO_INPUT } from './types.ts';
import type { FlightInput } from './types.ts';

const FRAME = 1 / 60;

interface Run {
  phases: Phase[];
  events: MissionEventType[];
  seconds: number;
}

function run(mission: Mission, input: (m: Mission) => FlightInput, limit = 400): Run {
  const phases: Phase[] = [mission.phase];
  const events: MissionEventType[] = [];
  let seconds = 0;
  while (mission.phase !== 'results' && seconds < limit) {
    mission.update(FRAME, input(mission));
    seconds += FRAME;
    if (phases[phases.length - 1] !== mission.phase) phases.push(mission.phase);
    for (const event of mission.drainEvents()) events.push(event.type);
  }
  return { phases, events, seconds };
}

describe('mission', () => {
  it('starts on the title and counts down to ascent', () => {
    const mission = new Mission();
    assert.equal(mission.phase, 'title');
    mission.start(1);
    assert.equal(mission.phase, 'countdown');
    assert.equal(mission.countdownLeft, TIMING.countdown);
    for (let t = 0; t < TIMING.countdown + 0.1; t += FRAME) mission.update(FRAME, NO_INPUT);
    assert.equal(mission.phase, 'ascent');
    const types = mission.drainEvents().map((event) => event.type);
    assert.deepEqual(types, ['ignition', 'liftoff']);
  });

  it('demo pilot flies the whole mission to rank A, leaving S for a human', () => {
    const mission = new Mission();
    mission.autopilot = true;
    mission.start(11);
    const result = run(mission, () => NO_INPUT);
    assert.deepEqual(result.phases, [
      'countdown',
      'ascent',
      'separation',
      'catch',
      'orbit',
      'results'
    ]);
    for (const type of ['maxq', 'stage-ready', 'stage', 'landing-burn', 'caught', 'cutoff', 'orbit'] as const) {
      assert.ok(result.events.includes(type), `missing event ${type}`);
    }
    const score = mission.score;
    assert.ok(score);
    assert.equal(score.caught, true);
    assert.equal(score.inOrbit, true);
    assert.ok(score.total >= 8500, `total ${score.total}`);
    assert.equal(score.rank, 'A');
    assert.ok(result.seconds < 240, `mission took ${result.seconds}s`);
  });

  it('hands off flying ends the flight early with a low score', () => {
    const mission = new Mission();
    mission.start(5);
    const result = run(mission, () => ({ ...NO_INPUT, throttleSet: 0.4 }));
    assert.equal(mission.phase, 'results');
    assert.ok(result.events.includes('explode') || result.events.includes('stage'));
    assert.ok(mission.score);
    assert.ok(mission.score.total < 4000);
  });

  it('a lost booster still lets the ship fly to orbit', () => {
    const mission = new Mission();
    mission.autopilot = true;
    mission.start(3);
    const result = run(mission, (m) => {
      // Take the pilot away for the landing only.
      m.autopilot = m.phase !== 'catch';
      return NO_INPUT;
    });
    assert.ok(result.events.includes('explode'));
    assert.ok(result.events.includes('orbit'));
    assert.equal(mission.score?.caught, false);
    assert.equal(mission.score?.inOrbit, true);
    assert.equal(mission.score?.catch, 0);
  });

  it('an early cutoff in orbit reaches results in seconds, not minutes', () => {
    const mission = new Mission();
    mission.autopilot = true;
    mission.start(6);
    let orbitSeconds = 0;
    const result = run(mission, (m) => {
      if (m.phase !== 'orbit') return NO_INPUT;
      m.autopilot = false;
      orbitSeconds += FRAME;
      return { ...NO_INPUT, action: true };
    });
    assert.ok(result.events.includes('reentry'));
    assert.equal(mission.orbit?.loss, 'coast');
    assert.equal(mission.phase, 'results');
    assert.ok(orbitSeconds < TIMING.intro + 10 + TIMING.outcome + 1, `orbit phase took ${orbitSeconds}s`);
  });

  it('the action button stages only inside the window', () => {
    const mission = new Mission();
    mission.start(2);
    const press: FlightInput = { ...NO_INPUT, action: true };
    for (let t = 0; t < 10; t += FRAME) mission.update(FRAME, press);
    assert.equal(mission.phase, 'ascent');
  });

  it('restart clears the previous flight', () => {
    const mission = new Mission();
    mission.autopilot = true;
    mission.start(9);
    run(mission, () => NO_INPUT);
    assert.equal(mission.phase, 'results');
    mission.start(10);
    assert.equal(mission.phase, 'countdown');
    assert.equal(mission.score, null);
    assert.equal(mission.catch, null);
    assert.equal(mission.orbit, null);
    assert.equal(mission.ascent.y, 0);
    assert.equal(mission.ascent.status, 'pad');
  });

  it('long frames are clamped so a tab switch cannot skip the flight', () => {
    const mission = new Mission();
    mission.start(1);
    mission.update(30, NO_INPUT);
    assert.equal(mission.phase, 'countdown');
    assert.ok(mission.phaseTime <= TIMING.maxFrame);
  });
});
