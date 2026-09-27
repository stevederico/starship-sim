import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SCORE_MAX, rankFor, scoreMission } from './scoring.ts';
import type { MissionRecord } from './scoring.ts';

const PERFECT: MissionRecord = {
  ascent: { status: 'staged', trackError: 0, integrity: 1, reserveFrac: 0.1 },
  catch: { status: 'caught', precision: 1, fuelFrac: 0.6 },
  orbit: { status: 'orbit', accuracy: 1, fuelFrac: 0.1, apoapsis: 150_000, periapsis: 150_000 }
};

describe('scoring', () => {
  it('a perfect flight scores the maximum', () => {
    const score = scoreMission(PERFECT);
    assert.equal(score.fuel, SCORE_MAX.fuel);
    assert.equal(score.accuracy, SCORE_MAX.accuracy);
    assert.equal(score.catch, SCORE_MAX.catch);
    assert.equal(score.total, SCORE_MAX.total);
    assert.equal(score.rank, 'S');
  });

  it('lines add up to the total and respect their caps', () => {
    const score = scoreMission({
      ...PERFECT,
      ascent: { status: 'staged', trackError: 0.05, integrity: 0.7, reserveFrac: 0.14 },
      catch: { status: 'caught', precision: 0.4, fuelFrac: 0.2 }
    });
    const sum = score.lines.reduce((acc, line) => acc + line.points, 0);
    assert.equal(sum, score.total);
    assert.equal(score.total, score.fuel + score.accuracy + score.catch);
    for (const line of score.lines) {
      assert.ok(line.points >= 0 && line.points <= line.max, line.label);
    }
  });

  it('a lost booster scores no catch or booster fuel points', () => {
    const score = scoreMission({
      ...PERFECT,
      catch: { status: 'crash', precision: 0.9, fuelFrac: 0.5 }
    });
    assert.equal(score.catch, 0);
    assert.equal(score.caught, false);
    assert.equal(score.fuel, 2000);
    assert.equal(score.inOrbit, true);
  });

  it('a lost ship scores no orbit or ship fuel points', () => {
    const score = scoreMission({
      ...PERFECT,
      orbit: { status: 'reentry', accuracy: 0.9, fuelFrac: 0.3, apoapsis: 90_000, periapsis: -200_000 }
    });
    assert.equal(score.inOrbit, false);
    assert.equal(score.fuel, 1000);
    assert.equal(score.accuracy, 1800);
  });

  it('a failed ascent keeps only a share of tracking points', () => {
    const score = scoreMission({
      ascent: { status: 'breakup', trackError: 0, integrity: 0, reserveFrac: 0.5 },
      catch: null,
      orbit: null
    });
    assert.equal(score.total, 200);
    assert.equal(score.rank, 'F');
  });

  it('staging far from the ideal reserve scores nothing for timing', () => {
    const score = scoreMission({
      ...PERFECT,
      ascent: { status: 'staged', trackError: 0, integrity: 1, reserveFrac: 0.25 }
    });
    const staging = score.lines.find((line) => line.label === 'Staging timing');
    assert.equal(staging?.points, 0);
  });

  it('ranks follow the thresholds', () => {
    assert.equal(rankFor(10_000), 'S');
    assert.equal(rankFor(8999), 'A');
    assert.equal(rankFor(7499), 'B');
    assert.equal(rankFor(5999), 'C');
    assert.equal(rankFor(3999), 'D');
    assert.equal(rankFor(1999), 'F');
  });
});
