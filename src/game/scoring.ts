import { DEG, clamp } from './physics.ts';
import { ASCENT } from './ascent.ts';
import type { AscentStatus } from './ascent.ts';
import type { CatchStatus } from './catch.ts';
import type { OrbitStatus } from './orbit.ts';

/** What happened in each phase, reduced to the numbers scoring needs. */
export interface MissionRecord {
  ascent: {
    status: AscentStatus;
    /** Mean guidance error, radians. */
    trackError: number;
    integrity: number;
    /** Booster propellant fraction left at staging or failure. */
    reserveFrac: number;
  };
  catch: {
    status: CatchStatus;
    precision: number;
    /** Landing propellant fraction left. */
    fuelFrac: number;
  } | null;
  orbit: {
    status: OrbitStatus;
    accuracy: number;
    /** Ship propellant fraction left. */
    fuelFrac: number;
    apoapsis: number;
    periapsis: number;
  } | null;
}

export interface ScoreLine {
  label: string;
  points: number;
  max: number;
}

export type Rank = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface Score {
  fuel: number;
  accuracy: number;
  catch: number;
  total: number;
  rank: Rank;
  lines: ScoreLine[];
  caught: boolean;
  inOrbit: boolean;
}

export const SCORE_MAX = { fuel: 3000, accuracy: 3000, catch: 4000, total: 10_000 } as const;

const TRACK_MAX = 800;
const INTEGRITY_MAX = 400;
const STAGING_MAX = 600;
const ORBIT_MAX = 1200;
const BOOSTER_FUEL_MAX = 1000;
const SHIP_FUEL_MAX = 2000;
const CATCH_BASE = 2000;
const CATCH_PRECISION_MAX = 2000;

/**
 * Rank floors. Guidance flying alone lands around 8,800, so S means beating it:
 * a centered hover catch and tight fuel. A clean first flight reaches A.
 */
export const RANK_FLOORS: readonly [Rank, number][] = [
  ['S', 9100],
  ['A', 8000],
  ['B', 6500],
  ['C', 4500],
  ['D', 2500]
];

export function rankFor(total: number): Rank {
  for (const [rank, floor] of RANK_FLOORS) if (total >= floor) return rank;
  return 'F';
}

export function scoreMission(record: MissionRecord): Score {
  const staged = record.ascent.status === 'staged';
  const caught = record.catch?.status === 'caught';
  const inOrbit = record.orbit?.status === 'orbit';

  const trackQuality = clamp(1 - record.ascent.trackError / (10 * DEG), 0, 1);
  // A failed ascent keeps a share of tracking points for the distance flown.
  const flown = clamp(1 - record.ascent.reserveFrac, 0, 1);
  const track = Math.round(TRACK_MAX * trackQuality * (staged ? 1 : 0.5 * flown));
  const integrity = staged ? Math.round(INTEGRITY_MAX * clamp(record.ascent.integrity, 0, 1)) : 0;
  const stagingMiss = Math.abs(record.ascent.reserveFrac - ASCENT.stageIdealFrac);
  const staging = staged
    ? Math.round(STAGING_MAX * clamp(1 - stagingMiss / ASCENT.stageIdealFrac, 0, 1))
    : 0;
  const orbit = inOrbit && record.orbit ? Math.round(ORBIT_MAX * record.orbit.accuracy) : 0;

  const boosterFuel =
    caught && record.catch
      ? Math.round(BOOSTER_FUEL_MAX * clamp(record.catch.fuelFrac / 0.5, 0, 1))
      : 0;
  const shipFuel =
    inOrbit && record.orbit
      ? Math.round(SHIP_FUEL_MAX * clamp(record.orbit.fuelFrac / 0.09, 0, 1))
      : 0;

  const catchBase = caught ? CATCH_BASE : 0;
  const catchPrecision =
    caught && record.catch ? Math.round(CATCH_PRECISION_MAX * record.catch.precision) : 0;

  const accuracy = track + integrity + staging + orbit;
  const fuel = boosterFuel + shipFuel;
  const catchScore = catchBase + catchPrecision;
  const total = accuracy + fuel + catchScore;

  return {
    fuel,
    accuracy,
    catch: catchScore,
    total,
    rank: rankFor(total),
    caught,
    inOrbit,
    lines: [
      { label: 'Guidance tracking', points: track, max: TRACK_MAX },
      { label: 'Airframe through max-Q', points: integrity, max: INTEGRITY_MAX },
      { label: 'Staging timing', points: staging, max: STAGING_MAX },
      { label: 'Orbit accuracy', points: orbit, max: ORBIT_MAX },
      { label: 'Booster fuel left', points: boosterFuel, max: BOOSTER_FUEL_MAX },
      { label: 'Ship fuel left', points: shipFuel, max: SHIP_FUEL_MAX },
      { label: 'Tower catch', points: catchBase, max: CATCH_BASE },
      { label: 'Catch precision', points: catchPrecision, max: CATCH_PRECISION_MAX }
    ]
  };
}
