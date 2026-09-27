import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  airDensity,
  circularSpeed,
  dynamicPressure,
  orbitElements,
  seededRandom,
  steerRate
} from './physics.ts';

describe('physics', () => {
  it('air thins with altitude and ends at space', () => {
    assert.equal(airDensity(0), 1.225);
    assert.ok(airDensity(10_000) < airDensity(1_000));
    assert.equal(airDensity(130_000), 0);
  });

  it('dynamic pressure is half rho v squared', () => {
    assert.equal(dynamicPressure(0, 100), 0.5 * 1.225 * 100 * 100);
  });

  it('circular speed gives a circular orbit', () => {
    const alt = 150_000;
    const el = orbitElements(alt, circularSpeed(alt), 0);
    assert.ok(Math.abs(el.apoapsis - alt) < 1);
    assert.ok(Math.abs(el.periapsis - alt) < 1);
    assert.ok(el.eccentricity < 1e-6);
  });

  it('slow flight is suborbital', () => {
    const el = orbitElements(100_000, 2000, 500);
    assert.ok(el.periapsis < 0);
    assert.ok(el.apoapsis > 100_000);
  });

  it('escape speed has no apoapsis', () => {
    const el = orbitElements(150_000, 12_000, 0);
    assert.equal(el.apoapsis, Infinity);
  });

  it('seeded random repeats for the same seed', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const c = seededRandom(43);
    const first = a();
    assert.equal(first, b());
    assert.notEqual(first, c());
    assert.ok(first >= 0 && first < 1);
  });

  it('steering eases toward the commanded rate', () => {
    let rate = 0;
    for (let i = 0; i < 200; i++) rate = steerRate(rate, 1, 0.5, 0.2, 0.02);
    assert.ok(Math.abs(rate - 0.5) < 1e-3);
    assert.ok(steerRate(0, 1, 0.5, 0.2, 0.02) < 0.1);
  });
});
