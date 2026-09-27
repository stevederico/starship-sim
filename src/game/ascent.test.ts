import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ASCENT,
  ascentCue,
  ascentCueAngle,
  ascentFuelFrac,
  ascentTrackError,
  canStage,
  createAscent,
  stepAscent,
  tryStage
} from './ascent.ts';
import type { AscentState } from './ascent.ts';
import { DEG } from './physics.ts';
import { pilotInput } from './pilot.ts';
import { NO_INPUT } from './types.ts';

function active(s: AscentState): boolean {
  return s.status === 'pad' || s.status === 'flying';
}

/** Flies the guidance cue. throttle 'cue' follows the max-Q advice. */
function fly(throttle: 'cue' | 'full', stageAt: number): AscentState {
  const s = createAscent();
  while (active(s) && s.t < 400) {
    const cue = ascentCue(s);
    s.throttle = throttle === 'full' ? 1 : cue.throttle;
    if (ascentFuelFrac(s) <= stageAt) tryStage(s);
    stepAscent(s, pilotInput(cue, s.angle, ASCENT.maxTurnRate, 2), ASCENT.step);
  }
  return s;
}

describe('ascent', () => {
  it('stays on the mount until thrust beats weight', () => {
    const s = createAscent();
    s.throttle = 0.5;
    for (let i = 0; i < 200; i++) stepAscent(s, NO_INPUT, ASCENT.step);
    assert.equal(s.status, 'pad');
    assert.equal(s.y, 0);
    assert.ok(s.fuel < ASCENT.boosterProp, 'engines still burn propellant');
  });

  it('lifts off at full throttle', () => {
    const s = createAscent();
    for (let i = 0; i < 200; i++) stepAscent(s, NO_INPUT, ASCENT.step);
    assert.equal(s.status, 'flying');
    assert.ok(s.y > 0 && s.vy > 0);
  });

  it('pitch program starts vertical and leans downrange', () => {
    assert.equal(ascentCueAngle(0), 0);
    assert.ok(ascentCueAngle(10_000) > ascentCueAngle(2_000));
    assert.equal(ascentCueAngle(200_000), ASCENT.cueMaxTilt);
  });

  it('reaches staging intact when the cue is flown', () => {
    const s = fly('cue', ASCENT.stageIdealFrac);
    assert.equal(s.status, 'staged');
    assert.equal(s.integrity, 1);
    assert.ok(s.peakQ < ASCENT.qLimit);
    assert.ok(s.y > 50_000 && s.y < 80_000, `staging altitude ${s.y}`);
    assert.ok(s.vx > 1000, `downrange speed ${s.vx}`);
    assert.ok(ascentTrackError(s) < 1 * DEG);
    assert.ok(Math.abs(ascentFuelFrac(s) - ASCENT.stageIdealFrac) < 0.005);
  });

  it('full throttle through max-Q damages the airframe', () => {
    const s = fly('full', ASCENT.stageIdealFrac);
    assert.ok(s.peakQ > ASCENT.qLimit);
    assert.ok(s.integrity < 0.6, `integrity ${s.integrity}`);
  });

  it('hard steering at max-Q breaks the vehicle up', () => {
    const s = createAscent();
    while (active(s) && s.t < 400) {
      const hard = s.q > 15_000 ? 1 : 0;
      stepAscent(s, { ...NO_INPUT, steer: hard }, ASCENT.step);
    }
    assert.equal(s.status, 'breakup');
  });

  it('leaning into the tower at liftoff is a strike', () => {
    const s = createAscent();
    while (active(s) && s.t < 60) stepAscent(s, { ...NO_INPUT, steer: -1 }, ASCENT.step);
    assert.equal(s.status, 'tower');
  });

  it('staging is locked until the window opens', () => {
    const s = createAscent();
    for (let i = 0; i < 500; i++) stepAscent(s, NO_INPUT, ASCENT.step);
    assert.equal(canStage(s), false);
    assert.equal(tryStage(s), false);
    assert.equal(s.status, 'flying');
  });

  it('hot-stages by itself when the booster runs low', () => {
    const s = fly('cue', 0);
    assert.equal(s.status, 'staged');
    assert.ok(ascentFuelFrac(s) <= ASCENT.stageForcedFrac);
  });

  it('cutting the engines after liftoff ends on the ground', () => {
    const s = createAscent();
    while (active(s) && s.t < 200) {
      if (s.t > 8) s.throttle = 0;
      stepAscent(s, NO_INPUT, ASCENT.step);
    }
    assert.equal(s.status, 'crash');
  });
});
