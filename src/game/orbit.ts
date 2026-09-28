import {
  DEG,
  EARTH_RADIUS_M,
  G0,
  MU,
  airDensity,
  clamp,
  orbitElements,
  steerRate
} from './physics.ts';
import type { OrbitElements } from './physics.ts';
import type { Cue, FlightInput } from './types.ts';

/** Ship burn from stage separation to orbit. */
export const ORBIT = {
  warp: 5,
  /** Time slows to this near cutoff so the last call is a fair one. */
  warpFinal: 2,
  step: 0.05,
  dry: 130_000,
  prop: 1_500_000,
  thrust: 14.7e6,
  isp: 365,
  /** Engines throttle back to hold this, m/s^2. */
  maxAccel: 35,
  dragArea: 30,
  targetAlt: 150_000,
  minPeriapsis: 100_000,
  reentryAlt: 45_000,
  /** Real seconds of engines-off coasting on an open trajectory before the ship is written off. */
  coastLimit: 10,
  maxTurnRate: 2.4 * DEG,
  turnTau: 0.4
} as const;

export type OrbitStatus = 'flying' | 'orbit' | 'reentry';

/** Why the ship was lost: fell back in, ran dry, or coasted with the orbit open. */
export type OrbitLoss = 'fall' | 'fuel' | 'coast';

export interface OrbitState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angVel: number;
  throttle: number;
  /** Ship propellant, kg. */
  fuel: number;
  apoapsis: number;
  periapsis: number;
  /** Real seconds spent coasting on a trajectory that will not hold orbit. */
  coast: number;
  loss: OrbitLoss | null;
  status: OrbitStatus;
}

export interface StagingState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
}

export function createOrbit(from: StagingState): OrbitState {
  const el = orbitElements(from.y, from.vx, from.vy);
  return {
    t: 0,
    x: from.x,
    y: from.y,
    vx: from.vx,
    vy: from.vy,
    angle: from.angle,
    angVel: 0,
    throttle: 1,
    fuel: ORBIT.prop,
    apoapsis: el.apoapsis,
    periapsis: el.periapsis,
    coast: 0,
    loss: null,
    status: 'flying'
  };
}

export function orbitFuelFrac(s: OrbitState): number {
  return s.fuel / ORBIT.prop;
}

/** Thrust acceleration at a throttle setting, after the g limiter. */
export function orbitThrustAccel(s: OrbitState, throttle: number): number {
  if (s.fuel <= 0 || throttle <= 0) return 0;
  return Math.min((ORBIT.thrust * throttle) / (ORBIT.dry + s.fuel), ORBIT.maxAccel);
}

export function isOrbitClosed(el: OrbitElements): boolean {
  return el.periapsis >= ORBIT.minPeriapsis && Number.isFinite(el.apoapsis);
}

/** Horizontal speed still missing for the target orbit, m/s. */
export function speedToGo(s: OrbitState): number {
  return Math.max(0, Math.sqrt(MU / (EARTH_RADIUS_M + ORBIT.targetAlt)) - s.vx);
}

/** Sim seconds per real second. Eases down as orbital speed gets close. */
export function orbitWarp(s: OrbitState): number {
  const t = clamp((speedToGo(s) - 150) / 350, 0, 1);
  return ORBIT.warpFinal + (ORBIT.warp - ORBIT.warpFinal) * t;
}

/** 0..1 closeness of the final orbit to the circular target. */
export function orbitAccuracy(s: OrbitState): number {
  if (!Number.isFinite(s.apoapsis)) return 0;
  const error =
    Math.abs(s.apoapsis - ORBIT.targetAlt) + Math.abs(s.periapsis - ORBIT.targetAlt);
  return clamp(1 - error / 200_000, 0, 1);
}

/** Explicit guidance: reach target altitude with zero climb rate at burnout. */
export function orbitCue(s: OrbitState): Cue {
  const r = EARTH_RADIUS_M + s.y;
  const gEff = MU / (r * r) - (s.vx * s.vx) / r;
  const mass = ORBIT.dry + s.fuel;
  const vExhaust = ORBIT.isp * G0;
  const dv = speedToGo(s);
  const mdot = ORBIT.thrust / vExhaust;
  const tgo = Math.max(18, (mass / mdot) * (1 - Math.exp(-dv / vExhaust)));
  const netUp = (6 * (ORBIT.targetAlt - s.y) - 4 * s.vy * tgo) / (tgo * tgo);
  const aFull = orbitThrustAccel(s, Math.max(s.throttle, 0.12)) || 1;
  const sinElev = clamp((netUp + gEff) / aFull, -0.45, 0.8);
  const sma = (s.apoapsis + s.periapsis) / 2;
  const done = Number.isFinite(sma) && sma >= ORBIT.targetAlt;
  // Throttle back for the last stretch so cutoff is not a twitch test.
  const terminal = 0.12 + 0.88 * clamp((dv - 60) / 340, 0, 1);
  return {
    angle: Math.PI / 2 - Math.asin(sinElev),
    throttle: done ? 0 : terminal,
    action: done && s.throttle > 0
  };
}

/** Player asks for engine cutoff. */
export function cutoff(s: OrbitState): void {
  if (s.status === 'flying') s.throttle = 0;
}

export function stepOrbit(s: OrbitState, input: FlightInput, dt: number): void {
  if (s.status !== 'flying') return;
  s.t += dt;

  s.angVel = steerRate(s.angVel, input.steer, ORBIT.maxTurnRate, ORBIT.turnTau, dt);
  s.angle = clamp(s.angle + s.angVel * dt, -Math.PI, Math.PI);

  const full = (ORBIT.thrust * s.throttle) / (ORBIT.dry + s.fuel);
  const thrustAcc = orbitThrustAccel(s, s.throttle);
  if (thrustAcc > 0) {
    // The g limiter throttles the engines, so burn rate follows real thrust.
    const used = (ORBIT.thrust * s.throttle * (thrustAcc / full) * dt) / (ORBIT.isp * G0);
    s.fuel = Math.max(0, s.fuel - used);
  }

  const r = EARTH_RADIUS_M + s.y;
  const speed = Math.hypot(s.vx, s.vy);
  const dragAcc = (0.5 * airDensity(s.y) * speed * speed * ORBIT.dragArea) / (ORBIT.dry + s.fuel);
  const dragX = speed > 0.1 ? (-dragAcc * s.vx) / speed : 0;
  const dragY = speed > 0.1 ? (-dragAcc * s.vy) / speed : 0;

  const ax = thrustAcc * Math.sin(s.angle) + dragX - (s.vx * s.vy) / r;
  const ay = thrustAcc * Math.cos(s.angle) + dragY - MU / (r * r) + (s.vx * s.vx) / r;
  s.vx += ax * dt;
  s.vy += ay * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;

  const el = orbitElements(s.y, s.vx, s.vy);
  s.apoapsis = el.apoapsis;
  s.periapsis = el.periapsis;

  const coasting = thrustAcc <= 0;
  const closed = isOrbitClosed(el);
  // Counted in real seconds, so the limit feels the same at any time warp.
  s.coast = coasting && !closed ? s.coast + dt / orbitWarp(s) : 0;
  if (coasting && closed) {
    s.status = 'orbit';
  } else if (s.y < ORBIT.reentryAlt && s.vy < 0) {
    lose(s, 'fall');
  } else if (s.fuel <= 0 && !closed) {
    lose(s, 'fuel');
  } else if (s.coast >= ORBIT.coastLimit) {
    lose(s, 'coast');
  }
}

function lose(s: OrbitState, loss: OrbitLoss): void {
  s.status = 'reentry';
  s.loss = loss;
}

/** Real seconds left to relight before an open-orbit coast ends the flight. */
export function coastLeft(s: OrbitState): number {
  return Math.max(0, ORBIT.coastLimit - s.coast);
}
