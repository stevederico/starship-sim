import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ORBIT,
  createOrbit,
  cutoff,
  orbitAccuracy,
  orbitCue,
  orbitFuelFrac,
  orbitThrustAccel,
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

  it('no burn falls back into the atmosphere', () => {
    const s = createOrbit(STAGING);
    s.throttle = 0;
    while (s.status === 'flying' && s.t < 3000) stepOrbit(s, NO_INPUT, ORBIT.step);
    assert.equal(s.status, 'reentry');
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

  it('burning straight up runs dry without an orbit', () => {
    const s = createOrbit({ ...STAGING, angle: 0 });
    while (s.status === 'flying' && s.t < 3000) stepOrbit(s, NO_INPUT, ORBIT.step);
    assert.equal(s.status, 'reentry');
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

  it('coasting in a closed orbit counts as orbit', () => {
    const s = createOrbit({ x: 0, y: 150_000, vx: circularSpeed(150_000), vy: 0, angle: 90 * DEG });
    s.throttle = 0;
    stepOrbit(s, NO_INPUT, ORBIT.step);
    assert.equal(s.status, 'orbit');
    assert.ok(orbitAccuracy(s) > 0.99);
  });
});
