import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ORBIT,
  createOrbit,
  cutoff,
  orbitAccuracy,
  orbitCue,
  orbitFuelFrac,
  coastLeft,
  orbitThrustAccel,
  orbitWarp,
  speedToGo,
  stepOrbit
} from './orbit.ts';
import type { OrbitState, StagingState } from './orbit.ts';
import { DEG, circularSpeed } from './physics.ts';
import { pilotInput } from './pilot.ts';
import { NO_INPUT } from './types.ts';

const STAGING: StagingState = { x: 60_000, y: 60_000, vx: 1260, vy: 1015, angle: 58 * DEG };

function flyCue(from: StagingState): OrbitState {
  const s = createOrbit(from);
  while (s.status === 'flying' && s.t < 3000) {
    const cue = orbitCue(s);
    if (cue.action) cutoff(s);
    else if (s.throttle > 0) s.throttle = cue.throttle;
    stepOrbit(s, pilotInput(cue, s.angle, ORBIT.maxTurnRate, 1.5), ORBIT.step);
  }
  return s;
}

describe('ship to orbit', () => {
  it('guidance reaches the target orbit with propellant to spare', () => {
    const s = flyCue(STAGING);
    assert.equal(s.status, 'orbit');
    assert.ok(s.periapsis >= ORBIT.minPeriapsis);
    assert.ok(Math.abs(s.apoapsis - ORBIT.targetAlt) < 15_000, `apoapsis ${s.apoapsis}`);
    assert.ok(orbitAccuracy(s) > 0.9);
    assert.ok(orbitFuelFrac(s) > 0.04, `fuel ${orbitFuelFrac(s)}`);
  });

  it('later staging leaves the ship more propellant', () => {
    const early = flyCue({ x: 40_000, y: 46_000, vx: 890, vy: 880, angle: 50 * DEG });
    const late = flyCue({ x: 80_000, y: 69_000, vx: 1525, vy: 1090, angle: 60 * DEG });
    assert.equal(early.status, 'orbit');
    assert.equal(late.status, 'orbit');
    assert.ok(orbitFuelFrac(late) > orbitFuelFrac(early));
  });

  it('no burn is written off instead of a long coast', () => {
    const s = createOrbit(STAGING);
    s.throttle = 0;
    while (s.status === 'flying' && s.t < 3000) stepOrbit(s, NO_INPUT, ORBIT.step);
    assert.equal(s.status, 'reentry');
    assert.equal(s.loss, 'coast');
    assert.ok(s.t < ORBIT.coastLimit * ORBIT.warp + 1, `coasted ${s.t} sim s`);
  });

  it('an early cutoff is not an orbit and the engines can relight', () => {
    const s = createOrbit(STAGING);
    for (let i = 0; i < 400; i++) stepOrbit(s, NO_INPUT, ORBIT.step);
    cutoff(s);
    stepOrbit(s, NO_INPUT, ORBIT.step);
    assert.equal(s.status, 'flying');
    const fuel = s.fuel;
    s.throttle = 1;
    stepOrbit(s, NO_INPUT, ORBIT.step);
    assert.ok(s.fuel < fuel);
  });

  it('coasting with the orbit open ends the flight within the coast limit', () => {
    const s = createOrbit(STAGING);
    for (let i = 0; i < 400; i++) stepOrbit(s, NO_INPUT, ORBIT.step);
    cutoff(s);
    let real = 0;
    while (s.status === 'flying' && real < 60) {
      real += ORBIT.step / orbitWarp(s);
      stepOrbit(s, NO_INPUT, ORBIT.step);
    }
    assert.equal(s.status, 'reentry');
    assert.equal(s.loss, 'coast');
    assert.ok(Math.abs(real - ORBIT.coastLimit) < 0.2, `ended after ${real} real s`);
  });

  it('relighting resets the coast clock', () => {
    const s = createOrbit(STAGING);
    cutoff(s);
    for (let i = 0; i < 40; i++) stepOrbit(s, NO_INPUT, ORBIT.step);
    assert.ok(coastLeft(s) < ORBIT.coastLimit);
    s.throttle = 1;
    stepOrbit(s, NO_INPUT, ORBIT.step);
    assert.equal(coastLeft(s), ORBIT.coastLimit);
    assert.equal(s.status, 'flying');
  });

  it('burning straight up runs dry without an orbit', () => {
    const s = createOrbit({ ...STAGING, angle: 0 });
    while (s.status === 'flying' && s.t < 3000) stepOrbit(s, NO_INPUT, ORBIT.step);
    assert.equal(s.status, 'reentry');
    assert.equal(s.loss, 'fuel');
    assert.equal(s.fuel, 0);
  });

  it('g limiter caps acceleration when the tanks run low', () => {
    const s = createOrbit(STAGING);
    s.fuel = 20_000;
    assert.equal(orbitThrustAccel(s, 1), ORBIT.maxAccel);
    s.fuel = ORBIT.prop;
    assert.ok(orbitThrustAccel(s, 1) < ORBIT.maxAccel);
    assert.equal(orbitThrustAccel(s, 0), 0);
  });

  it('time and throttle ease down as orbital speed gets close', () => {
    const s = createOrbit(STAGING);
    assert.equal(orbitWarp(s), ORBIT.warp);
    assert.equal(orbitCue(s).throttle, 1);
    s.vx = circularSpeed(ORBIT.targetAlt) - 100;
    s.y = ORBIT.targetAlt;
    s.vy = 0;
    assert.equal(orbitWarp(s), ORBIT.warpFinal);
    assert.ok(Math.abs(speedToGo(s) - 100) < 1e-6);
    const late = orbitCue(s).throttle;
    assert.ok(late > 0.12 && late < 0.3, `throttle ${late}`);
  });

  it('a cutoff one second late still lands a usable orbit', () => {
    const s = createOrbit(STAGING);
    let late = 0;
    while (s.status === 'flying' && s.t < 3000) {
      const cue = orbitCue(s);
      if (cue.action) late += ORBIT.step;
      if (late >= orbitWarp(s)) cutoff(s);
      else if (s.throttle > 0 && !cue.action) s.throttle = cue.throttle;
      stepOrbit(s, pilotInput(cue, s.angle, ORBIT.maxTurnRate, 1.5), ORBIT.step);
    }
    assert.equal(s.status, 'orbit');
    assert.ok(orbitAccuracy(s) > 0.7, `accuracy ${orbitAccuracy(s)}`);
  });

  it('coasting in a closed orbit counts as orbit', () => {
    const s = createOrbit({ x: 0, y: 150_000, vx: circularSpeed(150_000), vy: 0, angle: 90 * DEG });
    s.throttle = 0;
    stepOrbit(s, NO_INPUT, ORBIT.step);
    assert.equal(s.status, 'orbit');
    assert.ok(orbitAccuracy(s) > 0.99);
  });
});
