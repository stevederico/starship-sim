import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CATCH,
  catchCue,
  catchFuelForReserve,
  catchPrecision,
  createCatch,
  isCatchable,
  stepCatch
} from './catch.ts';
import type { CatchState } from './catch.ts';
import { seededRandom } from './physics.ts';
import { pilotInput } from './pilot.ts';
import { NO_INPUT } from './types.ts';

function flyCue(reserve: number, seed: number): CatchState {
  const s = createCatch(reserve, seededRandom(seed));
  while (s.status === 'flying' && s.t < 120) {
    const cue = catchCue(s);
    s.throttle = cue.throttle;
    stepCatch(s, pilotInput(cue, s.angle, CATCH.maxTurnRate, 5), CATCH.step);
  }
  return s;
}

function hovering(overrides: Partial<CatchState>): CatchState {
  const s = createCatch(0.1, seededRandom(1));
  return { ...s, x: 0, y: CATCH.catchY, vx: 0, vy: -1, angle: 0, ...overrides };
}

describe('booster catch', () => {
  it('more reserve at staging means more landing propellant', () => {
    assert.equal(catchFuelForReserve(0.02), CATCH.fuelMin);
    assert.ok(catchFuelForReserve(0.1) > catchFuelForReserve(0.06));
    assert.equal(catchFuelForReserve(0.9), CATCH.fuelMax);
  });

  it('the same seed gives the same approach', () => {
    const a = createCatch(0.1, seededRandom(7));
    const b = createCatch(0.1, seededRandom(7));
    assert.deepEqual(a, b);
  });

  it('guidance catches the booster across many approaches', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = flyCue(0.1, seed);
      assert.equal(s.status, 'caught', `seed ${seed} ended ${s.status}`);
      assert.ok(s.fuel > 0);
    }
  });

  it('guidance still makes it on the smallest reserve', () => {
    for (let seed = 1; seed <= 20; seed++) {
      assert.equal(flyCue(0.04, seed).status, 'caught', `seed ${seed}`);
    }
  });

  it('no burn ends on the ground', () => {
    const s = createCatch(0.1, seededRandom(3));
    while (s.status === 'flying' && s.t < 120) stepCatch(s, NO_INPUT, CATCH.step);
    assert.equal(s.status, 'crash');
    assert.equal(s.y, 0);
  });

  it('running dry leaves the booster falling', () => {
    const s = createCatch(0.1, seededRandom(3));
    s.throttle = 1;
    s.fuel = 30;
    while (s.status === 'flying' && s.t < 120) stepCatch(s, NO_INPUT, CATCH.step);
    assert.equal(s.fuel, 0);
    assert.equal(s.status, 'crash');
  });

  it('drifting into the tower is a strike', () => {
    const s = hovering({ x: -8, y: 100, vx: -6, vy: 0 });
    while (s.status === 'flying' && s.t < 10) stepCatch(s, NO_INPUT, CATCH.step);
    assert.equal(s.status, 'tower');
  });

  it('catch needs position, speed and tilt inside tolerance', () => {
    assert.equal(isCatchable(hovering({})), true);
    assert.equal(isCatchable(hovering({ x: CATCH.tolX + 1 })), false);
    assert.equal(isCatchable(hovering({ y: CATCH.catchY + CATCH.tolY + 1 })), false);
    assert.equal(isCatchable(hovering({ vy: -CATCH.tolVyDown - 1 })), false);
    assert.equal(isCatchable(hovering({ vx: CATCH.tolVx + 1 })), false);
    assert.equal(isCatchable(hovering({ angle: CATCH.tolAngle * 1.2 })), false);
  });

  it('precision rewards a centered, slow, upright catch', () => {
    const perfect = catchPrecision(hovering({ vy: 0 }));
    const sloppy = catchPrecision(hovering({ x: 5, vx: 3, vy: -7, angle: CATCH.tolAngle * 0.8 }));
    assert.equal(perfect, 1);
    assert.ok(sloppy < 0.3);
  });
});
