import { clamp } from './physics.ts';
import type { Cue, FlightInput } from './types.ts';

/** Demo pilot: turns a guidance cue into the same inputs a player gives. */
export function pilotInput(
  cue: Cue,
  angle: number,
  maxTurnRate: number,
  gain: number
): FlightInput {
  return {
    steer: clamp(((cue.angle - angle) * gain) / maxTurnRate, -1, 1),
    throttleRate: 0,
    throttleSet: cue.throttle,
    action: cue.action
  };
}
