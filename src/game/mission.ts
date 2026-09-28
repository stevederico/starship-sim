import {
  ASCENT,
  ascentCue,
  ascentFuelFrac,
  ascentTrackError,
  createAscent,
  stepAscent,
  tryStage
} from './ascent.ts';
import type { AscentState } from './ascent.ts';
import { CATCH, catchCue, catchPrecision, createCatch, stepCatch } from './catch.ts';
import type { CatchState } from './catch.ts';
import {
  ORBIT,
  createOrbit,
  cutoff,
  orbitAccuracy,
  orbitCue,
  orbitFuelFrac,
  orbitWarp,
  stepOrbit
} from './orbit.ts';
import type { OrbitLoss, OrbitState, StagingState } from './orbit.ts';
import { clamp, seededRandom } from './physics.ts';
import { pilotInput } from './pilot.ts';
import { scoreMission } from './scoring.ts';
import type { MissionRecord, Score } from './scoring.ts';
import type { Cue, FlightInput } from './types.ts';

export type Phase =
  | 'title'
  | 'countdown'
  | 'ascent'
  | 'separation'
  | 'catch'
  | 'orbit'
  | 'results';

export type MissionEventType =
  | 'ignition'
  | 'liftoff'
  | 'maxq'
  | 'stage-ready'
  | 'stage'
  | 'explode'
  | 'booster-inbound'
  | 'landing-burn'
  | 'caught'
  | 'ship-burn'
  | 'cutoff'
  | 'orbit'
  | 'reentry'
  | 'results';

export interface MissionEvent {
  type: MissionEventType;
  /** Short line for the banner. */
  text: string;
}

export const TIMING = {
  countdown: 3,
  ignitionAt: 1.2,
  separation: 3.2,
  /** Sim holds while the phase card reads out. */
  intro: 2.2,
  /** Time to watch an outcome before moving on. */
  outcome: 3.4,
  throttlePerSecond: 0.9,
  maxFrame: 0.1
} as const;

const LOSS_TEXT: Record<OrbitLoss, string> = {
  fall: 'Ship lost on reentry',
  fuel: 'Out of propellant. No orbit',
  coast: 'Orbit never closed. Ship lost'
};

const NO_CUE: Cue = { angle: 0, throttle: 0, action: false };

/** Reads status fresh after sim steps, which change it behind the type checker. */
function statusOf<T extends { status: string }>(state: T): T['status'] {
  return state.status;
}

/** Whole flight as a state machine. View code reads fields, never writes them. */
export class Mission {
  phase: Phase = 'title';
  /** Real seconds spent in the current phase. */
  phaseTime = 0;
  /** Real seconds left on the outcome hold, or 0 when not holding. */
  outcomeTime = 0;
  ascent: AscentState = createAscent();
  catch: CatchState | null = null;
  orbit: OrbitState | null = null;
  staging: StagingState | null = null;
  cue: Cue = NO_CUE;
  score: Score | null = null;
  autopilot = false;
  events: MissionEvent[] = [];

  private random: () => number = seededRandom(1);
  private simDebt = 0;
  private announcedMaxQ = false;
  private announcedStage = false;
  private announcedBurn = false;
  private ignited = false;

  start(seed: number): void {
    this.random = seededRandom(seed);
    this.phase = 'countdown';
    this.phaseTime = 0;
    this.outcomeTime = 0;
    this.ascent = createAscent();
    this.catch = null;
    this.orbit = null;
    this.staging = null;
    this.cue = NO_CUE;
    this.score = null;
    this.events = [];
    this.simDebt = 0;
    this.announcedMaxQ = false;
    this.announcedStage = false;
    this.announcedBurn = false;
    this.ignited = false;
  }

  toTitle(): void {
    this.phase = 'title';
    this.phaseTime = 0;
    this.events = [];
  }

  /** True while the phase card is up and the sim is holding. */
  get inIntro(): boolean {
    return (this.phase === 'catch' || this.phase === 'orbit') && this.phaseTime < TIMING.intro;
  }

  get countdownLeft(): number {
    return this.phase === 'countdown' ? Math.max(0, TIMING.countdown - this.phaseTime) : 0;
  }

  /** Remove and return queued events. */
  drainEvents(): MissionEvent[] {
    if (this.events.length === 0) return this.events;
    const out = this.events;
    this.events = [];
    return out;
  }

  update(realDt: number, input: FlightInput): void {
    const dt = clamp(realDt, 0, TIMING.maxFrame);
    this.phaseTime += dt;

    switch (this.phase) {
      case 'countdown':
        // Throttle is live on the pad, so the player can set it before liftoff.
        if (!this.autopilot) this.ascent.throttle = this.applyThrottle(this.ascent.throttle, input, dt);
        this.updateCountdown();
        break;
      case 'ascent':
        this.updateAscent(dt, input);
        break;
      case 'separation':
        if (this.phaseTime >= TIMING.separation) this.beginCatch();
        break;
      case 'catch':
        this.updateCatch(dt, input);
        break;
      case 'orbit':
        this.updateOrbit(dt, input);
        break;
      default:
        break;
    }
  }

  private emit(type: MissionEventType, text: string): void {
    this.events.push({ type, text });
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTime = 0;
    this.outcomeTime = 0;
    this.simDebt = 0;
  }

  private updateCountdown(): void {
    if (!this.ignited && this.countdownLeft <= TIMING.ignitionAt) {
      this.ignited = true;
      this.emit('ignition', 'Ignition');
    }
    if (this.phaseTime >= TIMING.countdown) {
      this.setPhase('ascent');
      this.emit('liftoff', 'Liftoff');
    }
  }

  /** Holds on a finished phase, then reports true once to move on. */
  private holdOutcome(dt: number): boolean {
    this.outcomeTime += dt;
    return this.outcomeTime >= TIMING.outcome;
  }

  private applyThrottle(current: number, input: FlightInput, dt: number): number {
    if (input.throttleSet !== null) return clamp(input.throttleSet, 0, 1);
    return clamp(current + input.throttleRate * TIMING.throttlePerSecond * dt, 0, 1);
  }

  /** Runs fixed sim steps for the real time that passed. */
  private runSteps(dt: number, warp: number, step: number, once: () => boolean): void {
    this.simDebt += dt * warp;
    while (this.simDebt >= step) {
      this.simDebt -= step;
      if (!once()) {
        this.simDebt = 0;
        return;
      }
    }
  }

  private updateAscent(dt: number, input: FlightInput): void {
    const s = this.ascent;
    if (s.status !== 'pad' && s.status !== 'flying') {
      if (s.status === 'staged') return;
      if (this.holdOutcome(dt)) this.finish();
      return;
    }

    this.cue = ascentCue(s);
    const flown = this.autopilot
      ? pilotInput(this.cue, s.angle, ASCENT.maxTurnRate, 2)
      : input;
    s.throttle = this.applyThrottle(s.throttle, flown, dt);
    if (flown.action && tryStage(s)) {
      this.onStaged();
      return;
    }

    this.runSteps(dt, ASCENT.warp, ASCENT.step, () => {
      stepAscent(s, flown, ASCENT.step);
      return s.status === 'pad' || s.status === 'flying';
    });

    if (!this.announcedMaxQ && s.passedMaxQ) {
      this.announcedMaxQ = true;
      this.emit('maxq', 'Through max-Q');
    }
    if (!this.announcedStage && s.status === 'flying' && ascentFuelFrac(s) <= ASCENT.stageOpenFrac) {
      this.announcedStage = true;
      this.emit('stage-ready', 'Staging window open');
    }

    const after = statusOf(s);
    if (after === 'staged') this.onStaged();
    else if (after === 'breakup') this.emit('explode', 'Airframe breakup');
    else if (after === 'tower') this.emit('explode', 'Tower strike');
    else if (after === 'crash') this.emit('explode', 'Ground impact');
  }

  private onStaged(): void {
    const s = this.ascent;
    this.staging = { x: s.x, y: s.y, vx: s.vx, vy: s.vy, angle: s.angle };
    this.emit('stage', 'Stage separation');
    this.setPhase('separation');
  }

  private beginCatch(): void {
    this.catch = createCatch(ascentFuelFrac(this.ascent), this.random);
    this.cue = catchCue(this.catch);
    this.setPhase('catch');
    this.emit('booster-inbound', 'Booster inbound');
  }

  private updateCatch(dt: number, input: FlightInput): void {
    const s = this.catch;
    if (!s) return;
    if (s.status !== 'flying') {
      if (this.holdOutcome(dt)) this.beginOrbit();
      return;
    }
    if (this.inIntro) return;

    this.cue = catchCue(s);
    const flown = this.autopilot ? pilotInput(this.cue, s.angle, CATCH.maxTurnRate, 5) : input;
    s.throttle = this.applyThrottle(s.throttle, flown, dt);
    if (!this.announcedBurn && s.throttle > 0 && s.fuel > 0) {
      this.announcedBurn = true;
      this.emit('landing-burn', 'Landing burn');
    }

    this.runSteps(dt, CATCH.warp, CATCH.step, () => {
      if (this.autopilot) {
        this.cue = catchCue(s);
        const auto = pilotInput(this.cue, s.angle, CATCH.maxTurnRate, 5);
        s.throttle = auto.throttleSet ?? s.throttle;
        stepCatch(s, auto, CATCH.step);
      } else {
        stepCatch(s, flown, CATCH.step);
      }
      return s.status === 'flying';
    });

    const after = statusOf(s);
    if (after === 'caught') this.emit('caught', 'Booster caught');
    else if (after === 'tower') this.emit('explode', 'Tower strike');
    else if (after === 'crash') this.emit('explode', 'Booster lost');
  }

  private beginOrbit(): void {
    if (!this.staging) return;
    this.orbit = createOrbit(this.staging);
    this.cue = orbitCue(this.orbit);
    this.setPhase('orbit');
    this.emit('ship-burn', 'Ship burn to orbit');
  }

  private updateOrbit(dt: number, input: FlightInput): void {
    const s = this.orbit;
    if (!s) return;
    if (s.status !== 'flying') {
      if (this.holdOutcome(dt)) this.finish();
      return;
    }
    if (this.inIntro) return;

    this.cue = orbitCue(s);
    const flown = this.autopilot ? pilotInput(this.cue, s.angle, ORBIT.maxTurnRate, 1.5) : input;
    if (flown.action && s.throttle > 0) {
      cutoff(s);
      this.emit('cutoff', 'Engine cutoff');
    } else if (!(this.autopilot && s.throttle === 0)) {
      s.throttle = this.applyThrottle(s.throttle, flown, dt);
    }

    this.runSteps(dt, orbitWarp(s), ORBIT.step, () => {
      stepOrbit(s, flown, ORBIT.step);
      return s.status === 'flying';
    });

    const after = statusOf(s);
    if (after === 'orbit') this.emit('orbit', 'Orbit achieved');
    else if (after === 'reentry') {
      this.emit('reentry', LOSS_TEXT[s.loss ?? 'fall']);
    }
  }

  record(): MissionRecord {
    const a = this.ascent;
    return {
      ascent: {
        status: a.status,
        trackError: ascentTrackError(a),
        integrity: a.integrity,
        reserveFrac: ascentFuelFrac(a)
      },
      catch: this.catch
        ? {
            status: this.catch.status,
            precision: catchPrecision(this.catch),
            fuelFrac: this.catch.fuel / this.catch.fuelStart
          }
        : null,
      orbit: this.orbit
        ? {
            status: this.orbit.status,
            accuracy: orbitAccuracy(this.orbit),
            fuelFrac: orbitFuelFrac(this.orbit),
            apoapsis: this.orbit.apoapsis,
            periapsis: this.orbit.periapsis
          }
        : null
    };
  }

  private finish(): void {
    this.score = scoreMission(this.record());
    this.setPhase('results');
    this.emit('results', 'Flight complete');
  }
}
