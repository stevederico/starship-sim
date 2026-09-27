import { DEG, G0, clamp, steerRate } from './physics.ts';
import type { Cue, FlightInput } from './types.ts';

/** Booster landing burn into the tower arms. x is meters from the catch line. */
export const CATCH = {
  warp: 1,
  step: 1 / 120,
  /** Thrust acceleration at full throttle, m/s^2. */
  maxAccel: 2.4 * G0,
  /** Drag factor giving a terminal speed near 250 m/s. */
  dragK: G0 / (250 * 250),
  maxTurnRate: 16 * DEG,
  turnTau: 0.18,
  maxTilt: 40 * DEG,
  /** Booster base height when its pins sit on the arms. */
  catchY: 46,
  boosterLength: 70,
  tolX: 6,
  tolY: 5,
  tolVx: 5,
  tolVyDown: 8,
  tolVyUp: 3,
  tolAngle: 10 * DEG,
  /** Hands off the stick, the booster rights itself at this gain, 1/s. */
  levelGain: 1.6,
  towerEdgeX: -9.5,
  towerHeight: 150,
  /** Ground sits below the launch mount, which tops out at y = 0. */
  groundY: -18,
  mountHalfWidth: 10,
  startY: 2000,
  startVy: -170,
  startX: 220,
  startVx: -14,
  /** Landing propellant, counted as delta-v in m/s. */
  fuelMin: 420,
  fuelMax: 900,
  fuelPerReserve: 4000
} as const;

export type CatchStatus = 'flying' | 'caught' | 'crash' | 'tower';

export interface CatchState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angVel: number;
  throttle: number;
  /** Delta-v left, m/s. */
  fuel: number;
  fuelStart: number;
  /** Steady crosswind push, m/s^2. Positive blows downrange. */
  wind: number;
  gustPhase: number;
  status: CatchStatus;
}

/** Landing propellant earned by the reserve left at staging (0..1 of booster load). */
export function catchFuelForReserve(reserveFrac: number): number {
  return clamp(
    CATCH.fuelMin + (reserveFrac - 0.05) * CATCH.fuelPerReserve,
    CATCH.fuelMin,
    CATCH.fuelMax
  );
}

export function createCatch(reserveFrac: number, random: () => number): CatchState {
  const fuel = catchFuelForReserve(reserveFrac);
  return {
    t: 0,
    x: CATCH.startX + (random() - 0.5) * 120,
    y: CATCH.startY,
    vx: CATCH.startVx + (random() - 0.5) * 12,
    vy: CATCH.startVy,
    angle: 0,
    angVel: 0,
    throttle: 0,
    fuel,
    fuelStart: fuel,
    wind: (random() - 0.5) * 1.6,
    gustPhase: random() * Math.PI * 2,
    status: 'flying'
  };
}

export function catchWindAccel(s: CatchState): number {
  // Wind fades near the tower so the last meters are about the pilot.
  const height = clamp((s.y - CATCH.catchY) / 300, 0.25, 1);
  return (s.wind + 0.35 * Math.sin(s.t * 0.9 + s.gustPhase)) * height;
}

/** Height of whatever is under the booster: mount top or open ground. */
export function catchFloor(x: number): number {
  return Math.abs(x) < CATCH.mountHalfWidth ? 0 : CATCH.groundY;
}

/** Seconds of coast left before the suggested landing burn. Zero means burn now. */
export function burnMargin(s: CatchState): number {
  if (s.vy >= -1) return 0;
  const decel = 0.62 * (CATCH.maxAccel - G0);
  const room = s.y - CATCH.catchY - 8 - (s.vy * s.vy) / (2 * decel);
  return Math.max(0, room / -s.vy);
}

/** True when the booster sits inside the arms slowly and upright enough. */
export function isCatchable(s: CatchState): boolean {
  return (
    Math.abs(s.x) <= CATCH.tolX &&
    Math.abs(s.y - CATCH.catchY) <= CATCH.tolY &&
    Math.abs(s.vx) <= CATCH.tolVx &&
    s.vy >= -CATCH.tolVyDown &&
    s.vy <= CATCH.tolVyUp &&
    Math.abs(s.angle) <= CATCH.tolAngle
  );
}

/** 0..1 quality of a catch from how centered, slow and upright it was. */
export function catchPrecision(s: CatchState): number {
  const parts = [
    1 - Math.abs(s.x) / CATCH.tolX,
    1 - Math.abs(s.vx) / CATCH.tolVx,
    1 - Math.abs(s.vy) / CATCH.tolVyDown,
    1 - Math.abs(s.angle) / CATCH.tolAngle
  ];
  const sum = parts.reduce((acc, p) => acc + clamp(p, 0, 1), 0);
  return sum / parts.length;
}

export function catchCue(s: CatchState): Cue {
  const dy = s.y - CATCH.catchY;
  const netMax = CATCH.maxAccel - G0;
  const decel = 0.62 * netMax;
  // Below the arms the only way in is back up.
  const vyDes = dy < -1 ? 2 : -Math.sqrt(2 * decel * Math.max(0, dy - 8)) - 2.5;
  const onProfile = s.vy <= vyDes + 6;
  let ayCmd = G0 + (vyDes - s.vy) * 1.6;
  if (onProfile && dy > 12) ayCmd += decel;

  // Close the gap no faster than a gentle sideways brake can stop.
  const gap = Math.abs(s.x);
  const closing = Math.min(Math.sqrt(2 * 2.5 * gap), gap / 2.5, 40);
  const vxDes = -Math.sign(s.x) * closing;
  const axCmd = (vxDes - s.vx) * 0.9 - catchWindAccel(s);

  if (ayCmd < 0.3 * CATCH.maxAccel && dy > 60) {
    return { angle: clamp(Math.atan2(axCmd, G0), -20 * DEG, 20 * DEG), throttle: 0, action: false };
  }
  const up = Math.max(ayCmd, 0.2 * CATCH.maxAccel);
  const tiltLimit = dy < 40 ? 6 * DEG : 24 * DEG;
  const angle = clamp(Math.atan2(axCmd, up), -tiltLimit, tiltLimit);
  const throttle = clamp(up / Math.cos(angle) / CATCH.maxAccel, 0, 1);
  return { angle, throttle, action: false };
}

export function stepCatch(s: CatchState, input: FlightInput, dt: number): void {
  if (s.status !== 'flying') return;
  s.t += dt;

  // Released stick: grid fins and gimbal bring the booster back upright.
  const steer =
    input.steer !== 0 ? input.steer : clamp((-s.angle * CATCH.levelGain) / CATCH.maxTurnRate, -1, 1);
  s.angVel = steerRate(s.angVel, steer, CATCH.maxTurnRate, CATCH.turnTau, dt);
  s.angle = clamp(s.angle + s.angVel * dt, -CATCH.maxTilt, CATCH.maxTilt);

  const burning = s.fuel > 0 && s.throttle > 0;
  const thrustAcc = burning ? CATCH.maxAccel * s.throttle : 0;
  if (burning) s.fuel = Math.max(0, s.fuel - thrustAcc * dt);

  const speed = Math.hypot(s.vx, s.vy);
  const ax = thrustAcc * Math.sin(s.angle) - CATCH.dragK * speed * s.vx + catchWindAccel(s);
  const ay = thrustAcc * Math.cos(s.angle) - CATCH.dragK * speed * s.vy - G0;
  s.vx += ax * dt;
  s.vy += ay * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;

  if (isCatchable(s)) {
    s.status = 'caught';
  } else if (s.y < CATCH.towerHeight && s.x < CATCH.towerEdgeX && s.x > -40) {
    s.status = 'tower';
  } else if (s.y <= catchFloor(s.x)) {
    s.y = catchFloor(s.x);
    s.status = 'crash';
  }
}
