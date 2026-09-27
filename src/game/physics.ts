/** Shared flight maths. Pure functions, SI units, no rendering imports. */

export const G0 = 9.80665;
export const EARTH_RADIUS_M = 6_371_000;
export const MU = 3.986004418e14;
export const DEG = Math.PI / 180;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Exponential atmosphere, kg/m^3. Zero above 120 km. */
export function airDensity(altitude: number): number {
  if (altitude > 120_000) return 0;
  return 1.225 * Math.exp(-Math.max(0, altitude) / 7600);
}

export function gravityAt(altitude: number): number {
  const r = EARTH_RADIUS_M + altitude;
  return MU / (r * r);
}

/** Dynamic pressure in pascals. */
export function dynamicPressure(altitude: number, speed: number): number {
  return 0.5 * airDensity(altitude) * speed * speed;
}

export function circularSpeed(altitude: number): number {
  return Math.sqrt(MU / (EARTH_RADIUS_M + altitude));
}

export interface OrbitElements {
  /** Altitude of the high point, meters. Infinity on escape. */
  apoapsis: number;
  /** Altitude of the low point, meters. Negative means it hits the ground. */
  periapsis: number;
  eccentricity: number;
}

/** Two-body orbit from altitude, horizontal speed and vertical speed. */
export function orbitElements(altitude: number, vHoriz: number, vVert: number): OrbitElements {
  const r = EARTH_RADIUS_M + altitude;
  const energy = (vHoriz * vHoriz + vVert * vVert) / 2 - MU / r;
  const h = r * vHoriz;
  const eccentricity = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (MU * MU)));
  if (energy >= 0) {
    const rp = (h * h) / (MU * (1 + eccentricity));
    return { apoapsis: Infinity, periapsis: rp - EARTH_RADIUS_M, eccentricity };
  }
  const a = -MU / (2 * energy);
  return {
    apoapsis: a * (1 + eccentricity) - EARTH_RADIUS_M,
    periapsis: a * (1 - eccentricity) - EARTH_RADIUS_M,
    eccentricity
  };
}

/** Small seeded generator so runs can be replayed in tests. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** First-order steering response toward a commanded turn rate. */
export function steerRate(
  angVel: number,
  steer: number,
  maxRate: number,
  tau: number,
  dt: number
): number {
  const target = clamp(steer, -1, 1) * maxRate;
  return angVel + (target - angVel) * (1 - Math.exp(-dt / tau));
}
