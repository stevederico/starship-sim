import {
  DEG,
  EARTH_RADIUS_M,
  G0,
  MU,
  airDensity,
  clamp,
  steerRate
} from './physics.ts';
import type { Cue, FlightInput } from './types.ts';

/** Full stack, pad to stage separation. */
export const ASCENT = {
  /** Sim seconds per real second. */
  warp: 3,
  step: 0.02,
  boosterDry: 280_000,
  boosterProp: 3_400_000,
  shipWet: 1_630_000,
  thrust: 75.9e6,
  isp: 335,
  /** Drag coefficient times frontal area, m^2. */
  dragArea: 32,
  /** Dynamic pressure the airframe tolerates, Pa. */
  qLimit: 22_000,
  /** Dynamic pressure times angle of attack the airframe tolerates, Pa rad. */
  qAlphaLimit: 3_400,
  qDamageRate: 0.22,
  qAlphaDamageRate: 0.08,
  maxTurnRate: 3 * DEG,
  turnTau: 0.3,
  maxTilt: 85 * DEG,
  /** Booster propellant fraction where staging unlocks. */
  stageOpenFrac: 0.25,
  stageIdealFrac: 0.1,
  /** Hot-stage fires by itself here. */
  stageForcedFrac: 0.04,
  towerEdgeX: -9.5,
  towerHeight: 150,
  /** Ground sits below the launch mount, which tops out at y = 0. */
  groundY: -18,
  mountHalfWidth: 10,
  /** Pitch program: tilt reached at the top of the turn. */
  cueMaxTilt: 60 * DEG,
  cueStartAlt: 350,
  cueEndAlt: 64_000,
  cueShape: 0.62
} as const;

export type AscentStatus = 'pad' | 'flying' | 'staged' | 'breakup' | 'crash' | 'tower';

export interface AscentState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Tilt from vertical, radians. Positive leans downrange. */
  angle: number;
  angVel: number;
  throttle: number;
  /** Booster propellant, kg. */
  fuel: number;
  /** 1 is pristine, 0 is breakup. */
  integrity: number;
  q: number;
  peakQ: number;
  /** Angle of attack, radians. */
  alpha: number;
  passedMaxQ: boolean;
  /** Sum of guidance error over time, for the accuracy score. */
  trackError: number;
  trackTime: number;
  status: AscentStatus;
}

export function createAscent(): AscentState {
  return {
    t: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    angVel: 0,
    throttle: 1,
    fuel: ASCENT.boosterProp,
    integrity: 1,
    q: 0,
    peakQ: 0,
    alpha: 0,
    passedMaxQ: false,
    trackError: 0,
    trackTime: 0,
    status: 'pad'
  };
}

export function ascentFuelFrac(s: AscentState): number {
  return s.fuel / ASCENT.boosterProp;
}

export function ascentMass(s: AscentState): number {
  return ASCENT.boosterDry + ASCENT.shipWet + s.fuel;
}

export function canStage(s: AscentState): boolean {
  return s.status === 'flying' && ascentFuelFrac(s) <= ASCENT.stageOpenFrac;
}

/** Height of whatever is under the stack: mount top or open ground. */
export function ascentFloor(x: number): number {
  return Math.abs(x) < ASCENT.mountHalfWidth ? 0 : ASCENT.groundY;
}

/** Pitch program tilt for an altitude. */
export function ascentCueAngle(altitude: number): number {
  const span = ASCENT.cueEndAlt - ASCENT.cueStartAlt;
  const t = clamp((altitude - ASCENT.cueStartAlt) / span, 0, 1);
  return ASCENT.cueMaxTilt * Math.pow(t, ASCENT.cueShape);
}

export function ascentCue(s: AscentState): Cue {
  const ratio = s.q / ASCENT.qLimit;
  const throttle = ratio > 0.8 && !s.passedMaxQ ? clamp(1 - (ratio - 0.8) * 3.2, 0.4, 1) : 1;
  return {
    angle: ascentCueAngle(s.y),
    throttle,
    action: canStage(s) && ascentFuelFrac(s) <= ASCENT.stageIdealFrac
  };
}

/** Player asks for stage separation. Returns true when it happened. */
export function tryStage(s: AscentState): boolean {
  if (!canStage(s)) return false;
  s.status = 'staged';
  return true;
}

/** Advance one fixed step of sim time. */
export function stepAscent(s: AscentState, input: FlightInput, dt: number): void {
  if (s.status !== 'pad' && s.status !== 'flying') return;
  s.t += dt;

  const burning = s.fuel > 0 && s.throttle > 0;
  const mass = ascentMass(s);
  const thrustAcc = burning ? (ASCENT.thrust * s.throttle) / mass : 0;
  if (burning) {
    s.fuel = Math.max(0, s.fuel - (ASCENT.thrust * s.throttle * dt) / (ASCENT.isp * G0));
  }

  if (s.status === 'pad') {
    // Held on the mount until thrust beats weight.
    if (thrustAcc > G0 * 1.02) s.status = 'flying';
    else {
      // Tanks ran dry without ever leaving the mount.
      if (s.fuel <= 0) s.status = 'crash';
      return;
    }
  }

  s.angVel = steerRate(s.angVel, input.steer, ASCENT.maxTurnRate, ASCENT.turnTau, dt);
  s.angle = clamp(s.angle + s.angVel * dt, -ASCENT.maxTilt, ASCENT.maxTilt);

  const r = EARTH_RADIUS_M + s.y;
  const speed = Math.hypot(s.vx, s.vy);
  s.q = 0.5 * airDensity(s.y) * speed * speed;
  const dragAcc = (s.q * ASCENT.dragArea) / mass;
  const dragX = speed > 0.1 ? (-dragAcc * s.vx) / speed : 0;
  const dragY = speed > 0.1 ? (-dragAcc * s.vy) / speed : 0;

  const ax = thrustAcc * Math.sin(s.angle) + dragX - (s.vx * s.vy) / r;
  const ay = thrustAcc * Math.cos(s.angle) + dragY - MU / (r * r) + (s.vx * s.vx) / r;
  s.vx += ax * dt;
  s.vy += ay * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;

  s.alpha = speed > 40 ? s.angle - Math.atan2(s.vx, s.vy) : 0;
  if (s.q > s.peakQ) s.peakQ = s.q;
  else if (s.peakQ > 8_000 && s.q < s.peakQ * 0.9) s.passedMaxQ = true;

  const overQ = Math.max(0, s.q / ASCENT.qLimit - 1);
  const overAlpha = Math.max(0, (s.q * Math.abs(s.alpha)) / ASCENT.qAlphaLimit - 1);
  const damage = overQ * ASCENT.qDamageRate + Math.min(overAlpha, 4) * ASCENT.qAlphaDamageRate;
  s.integrity = Math.max(0, s.integrity - damage * dt);

  if (s.y > ASCENT.cueStartAlt) {
    s.trackError += Math.abs(s.angle - ascentCueAngle(s.y)) * dt;
    s.trackTime += dt;
  }

  if (s.integrity <= 0) {
    s.status = 'breakup';
  } else if (s.y < ASCENT.towerHeight && s.x < ASCENT.towerEdgeX) {
    s.status = 'tower';
  } else if (s.y <= ascentFloor(s.x) && s.vy < 0) {
    s.y = ascentFloor(s.x);
    s.status = 'crash';
  } else if (ascentFuelFrac(s) <= ASCENT.stageForcedFrac) {
    s.status = 'staged';
  }
}

/** Mean guidance error in radians over the flight so far. */
export function ascentTrackError(s: AscentState): number {
  return s.trackTime > 0 ? s.trackError / s.trackTime : 0;
}
