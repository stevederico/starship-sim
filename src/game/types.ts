/** Player input for one frame. */
export interface FlightInput {
  /** -1 tilt left, +1 tilt right. */
  steer: number;
  /** -1 throttle down, +1 throttle up. */
  throttleRate: number;
  /** Absolute throttle from a slider or a full/cut key. Null when untouched. */
  throttleSet: number | null;
  /** True on the frame the action key or button went down. */
  action: boolean;
}

export const NO_INPUT: FlightInput = {
  steer: 0,
  throttleRate: 0,
  throttleSet: null,
  action: false
};

/** Guidance suggestion shown on the HUD and flown by the demo pilot. */
export interface Cue {
  /** Tilt from vertical, radians. Positive leans downrange. */
  angle: number;
  throttle: number;
  /** Time to press the action button (stage or cutoff). */
  action: boolean;
}
