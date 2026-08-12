import { Vector2 } from 'three';
import { NOSE_START, SHIP_HEIGHT, SHIP_RADIUS } from '../constants.ts';

/** Lathe profile (x = radius, y = height from engine plane). */
export function hullProfile(): Vector2[] {
  const pts: Vector2[] = [
    new Vector2(4.2, 0),
    new Vector2(SHIP_RADIUS, 1.4),
    new Vector2(SHIP_RADIUS, NOSE_START)
  ];
  const noseLen = SHIP_HEIGHT - NOSE_START;
  for (let i = 1; i <= 18; i++) {
    const t = i / 18;
    const y = NOSE_START + t * noseLen;
    const r = SHIP_RADIUS * Math.cos((t * Math.PI) / 2);
    pts.push(new Vector2(Math.max(0.12, r), y));
  }
  return pts;
}
