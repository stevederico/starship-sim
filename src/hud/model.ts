import { ASCENT, ascentFuelFrac, canStage } from '../game/ascent.ts';
import { CATCH, burnMargin, targetDescent } from '../game/catch.ts';
import type { Mission, Phase } from '../game/mission.ts';
import { ORBIT, coastLeft, orbitFuelFrac } from '../game/orbit.ts';
import { circularSpeed, clamp } from '../game/physics.ts';

export type Tone = 'ok' | 'warn' | 'bad' | 'dim';

export interface Readout {
  label: string;
  value: string;
  unit: string;
  tone: Tone;
}

export interface Bar {
  label: string;
  /** Fill, 0..1. */
  value: number;
  /** Target tick, 0..1, or null. */
  marker: number | null;
  text: string;
  tone: Tone;
}

export interface Card {
  title: string;
  lines: string[];
}

export interface HudModel {
  phase: Phase;
  phaseLabel: string;
  clock: string;
  readouts: Readout[];
  bars: Bar[];
  /** Tilt from vertical, radians. */
  angle: number;
  cueAngle: number;
  /** Direction of travel from vertical, or null when too slow to matter. */
  prograde: number | null;
  throttle: number;
  /** Suggested throttle tick. Null once max-Q is behind: from there it is on the pilot. */
  throttleCue: number | null;
  prompt: string | null;
  promptTone: Tone;
  actionLabel: string | null;
  actionReady: boolean;
  card: Card | null;
  countdown: number | null;
  flying: boolean;
}

const PHASE_LABEL: Record<Phase, string> = {
  title: 'Standby',
  countdown: 'Countdown',
  ascent: 'Ascent',
  separation: 'Stage separation',
  catch: 'Booster catch',
  orbit: 'Orbit insertion',
  results: 'Flight complete'
};

const CATCH_CARD: Card = {
  title: 'Booster return',
  lines: ['Light the engines before it is too late', 'Steer between the tower arms', 'Arrive slow and upright']
};

const ORBIT_CARD: Card = {
  title: 'Ship to orbit',
  lines: ['Follow the marker to build speed', 'Cut the engines when the orbit closes', 'Target 150 km, circular']
};

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(whole / 60)).padStart(2, '0');
  const ss = String(whole % 60).padStart(2, '0');
  return `T+ ${mm}:${ss}`;
}

export function formatKm(meters: number): string {
  if (!Number.isFinite(meters)) return '---';
  const km = meters / 1000;
  if (Math.abs(km) >= 1000) return Math.round(km).toLocaleString('en-US');
  return km.toFixed(1);
}

function percent(value: number): string {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}

function throttleHint(mission: Mission): number | null {
  return mission.ascent.passedMaxQ ? null : mission.cue.throttle;
}

/** How far descent speed is off the planned profile, as a tone. */
function descentTone(descent: number, target: number): Tone {
  const over = descent - target;
  if (over > 12) return 'bad';
  if (over > 5 || over < -10) return 'warn';
  return 'ok';
}

function base(mission: Mission): HudModel {
  return {
    phase: mission.phase,
    phaseLabel: PHASE_LABEL[mission.phase],
    clock: formatClock(0),
    readouts: [],
    bars: [],
    angle: 0,
    cueAngle: 0,
    prograde: null,
    throttle: 0,
    throttleCue: 0,
    prompt: null,
    promptTone: 'dim',
    actionLabel: null,
    actionReady: false,
    card: null,
    countdown: null,
    flying: false
  };
}

function ascentModel(mission: Mission): HudModel {
  const s = mission.ascent;
  const hud = base(mission);
  const fuel = ascentFuelFrac(s);
  const speed = Math.hypot(s.vx, s.vy);
  const qRatio = s.q / ASCENT.qLimit;
  const alphaLoad = (s.q * Math.abs(s.alpha)) / ASCENT.qAlphaLimit;
  const flying = s.status === 'pad' || s.status === 'flying';

  hud.clock = formatClock(s.t);
  hud.flying = mission.phase === 'ascent' && flying;
  hud.angle = s.angle;
  hud.cueAngle = mission.cue.angle;
  hud.prograde = speed > 40 ? Math.atan2(s.vx, s.vy) : null;
  hud.throttle = s.throttle;
  hud.throttleCue = throttleHint(mission);
  hud.readouts = [
    { label: 'Altitude', value: formatKm(s.y), unit: 'km', tone: 'ok' },
    { label: 'Speed', value: Math.round(speed).toLocaleString('en-US'), unit: 'm/s', tone: 'ok' },
    { label: 'Downrange', value: formatKm(s.x), unit: 'km', tone: 'ok' }
  ];
  hud.bars = [
    {
      label: 'Air load',
      value: clamp(qRatio / 1.25, 0, 1),
      marker: 1 / 1.25,
      text: `${(s.q / 1000).toFixed(1)} kPa`,
      tone: qRatio > 1 ? 'bad' : qRatio > 0.85 ? 'warn' : 'ok'
    },
    {
      label: 'Airframe',
      value: s.integrity,
      marker: null,
      text: percent(s.integrity),
      tone: s.integrity < 0.4 ? 'bad' : s.integrity < 0.8 ? 'warn' : 'ok'
    },
    {
      label: 'Booster fuel',
      value: fuel,
      marker: ASCENT.stageIdealFrac,
      text: percent(fuel),
      tone: fuel <= ASCENT.stageOpenFrac ? 'warn' : 'ok'
    }
  ];
  hud.actionLabel = 'Stage';
  hud.actionReady = canStage(s);

  if (!hud.flying) return hud;
  if (s.status === 'pad') {
    hud.prompt = 'Throttle up to lift off';
    hud.promptTone = 'warn';
  } else if (qRatio > 1) {
    hud.prompt = 'Over the air load limit. Throttle down';
    hud.promptTone = 'bad';
  } else if (alphaLoad > 0.8) {
    hud.prompt = 'Nose off the airflow. Steer to the marker';
    hud.promptTone = 'bad';
  } else if (qRatio > 0.85 && !s.passedMaxQ) {
    hud.prompt = 'Max-Q. Ease the throttle';
    hud.promptTone = 'warn';
  } else if (canStage(s)) {
    const ideal = fuel <= ASCENT.stageIdealFrac;
    hud.prompt = ideal ? 'Stage now' : 'Staging window open. Best at 10% fuel';
    hud.promptTone = ideal ? 'ok' : 'warn';
  } else {
    hud.prompt = 'Steer to the pitch marker';
  }
  return hud;
}

function catchModel(mission: Mission): HudModel {
  const hud = base(mission);
  const s = mission.catch;
  if (!s) return hud;
  const dy = s.y - CATCH.catchY;
  const fuel = s.fuel / s.fuelStart;
  const speed = Math.hypot(s.vx, s.vy);
  const near = dy < 150;
  const target = targetDescent(s);

  hud.clock = formatClock(mission.ascent.t + 240 + s.t);
  hud.flying = s.status === 'flying' && !mission.inIntro;
  hud.angle = s.angle;
  hud.cueAngle = mission.cue.angle;
  hud.prograde = null;
  hud.throttle = s.throttle;
  hud.throttleCue = throttleHint(mission);
  hud.card = mission.inIntro ? CATCH_CARD : null;

  const side = s.x > 0.5 ? 'R' : s.x < -0.5 ? 'L' : '';
  hud.readouts = [
    { label: 'To arms', value: dy.toFixed(0), unit: 'm', tone: 'ok' },
    {
      label: 'Descent',
      value: (-s.vy).toFixed(0),
      unit: 'm/s',
      tone: s.throttle > 0.05 || near ? descentTone(-s.vy, target) : 'ok'
    },
    {
      label: 'Offset',
      value: `${Math.abs(s.x).toFixed(0)}${side}`,
      unit: 'm',
      tone: Math.abs(s.x) <= CATCH.tolX ? 'ok' : near ? 'bad' : 'warn'
    },
    {
      label: 'Drift',
      value: Math.abs(s.vx).toFixed(1),
      unit: 'm/s',
      tone: Math.abs(s.vx) <= CATCH.tolVx ? 'ok' : near ? 'bad' : 'warn'
    }
  ];
  hud.bars = [
    {
      label: 'Landing fuel',
      value: fuel,
      marker: null,
      text: percent(fuel),
      tone: fuel < 0.15 ? 'bad' : fuel < 0.35 ? 'warn' : 'ok'
    }
  ];

  if (!hud.flying) return hud;
  const margin = burnMargin(s);
  if (s.fuel <= 0) {
    hud.prompt = 'Out of propellant';
    hud.promptTone = 'bad';
  } else if (s.throttle < 0.05 && speed > 30) {
    hud.prompt = margin > 0 ? `Landing burn in ${margin.toFixed(1)} s` : 'Light the engines now';
    hud.promptTone = margin > 1 ? 'warn' : 'bad';
  } else if (dy < -CATCH.tolY) {
    hud.prompt = 'Below the arms. Climb back up';
    hud.promptTone = 'bad';
  } else if (near) {
    hud.prompt = `Ease in at ${Math.max(1, Math.round(target))} m/s. Stay upright`;
    hud.promptTone = descentTone(-s.vy, target);
    hud.promptTone = 'ok';
  } else {
    hud.prompt = `Slow to ${Math.round(target)} m/s. Steer to the beam`;
    hud.promptTone = descentTone(-s.vy, target);
  }
  return hud;
}

function orbitModel(mission: Mission): HudModel {
  const hud = base(mission);
  const s = mission.orbit;
  if (!s) return hud;
  const fuel = orbitFuelFrac(s);
  const target = circularSpeed(ORBIT.targetAlt);
  const closed = s.periapsis >= ORBIT.minPeriapsis && Number.isFinite(s.apoapsis);

  hud.clock = formatClock(mission.ascent.t + s.t);
  hud.flying = s.status === 'flying' && !mission.inIntro;
  hud.angle = s.angle;
  hud.cueAngle = mission.cue.angle;
  hud.prograde = Math.atan2(s.vx, s.vy);
  hud.throttle = s.throttle;
  hud.throttleCue = throttleHint(mission);
  hud.card = mission.inIntro ? ORBIT_CARD : null;
  hud.readouts = [
    { label: 'Altitude', value: formatKm(s.y), unit: 'km', tone: 'ok' },
    { label: 'Speed', value: Math.round(s.vx).toLocaleString('en-US'), unit: 'm/s', tone: 'ok' },
    {
      label: 'Climb',
      value: `${s.vy >= 0 ? '+' : '-'}${Math.abs(s.vy).toFixed(0)}`,
      unit: 'm/s',
      tone: 'ok'
    },
    { label: 'Apoapsis', value: formatKm(s.apoapsis), unit: 'km', tone: 'ok' },
    {
      label: 'Periapsis',
      value: s.periapsis < -999_000 ? '---' : formatKm(s.periapsis),
      unit: 'km',
      tone: closed ? 'ok' : 'warn'
    }
  ];
  hud.bars = [
    {
      label: 'Orbital speed',
      value: clamp(s.vx / target, 0, 1),
      marker: null,
      text: percent(s.vx / target),
      tone: 'ok'
    },
    {
      label: 'Ship fuel',
      value: fuel,
      marker: null,
      text: percent(fuel),
      tone: fuel < 0.05 ? 'bad' : fuel < 0.15 ? 'warn' : 'ok'
    }
  ];
  hud.actionLabel = 'Cutoff';
  hud.actionReady = hud.flying && s.throttle > 0;

  if (!hud.flying) return hud;
  if (mission.cue.action) {
    hud.prompt = 'Orbit closed. Cut the engines';
    hud.promptTone = 'ok';
  } else if (s.throttle <= 0 && !closed) {
    hud.prompt = `Orbit not closed. Relight within ${Math.ceil(coastLeft(s))} s`;
    hud.promptTone = 'bad';
  } else if (s.y < 80_000 && s.vy < 0) {
    hud.prompt = 'Sinking. Pitch up';
    hud.promptTone = 'bad';
  } else {
    hud.prompt = 'Steer to the marker. Build speed';
  }
  return hud;
}

/** Everything the overlay shows, as plain data. */
export function hudModel(mission: Mission): HudModel {
  switch (mission.phase) {
    case 'countdown': {
      const hud = ascentModel(mission);
      hud.countdown = Math.ceil(mission.countdownLeft);
      hud.clock = `T- 00:0${Math.ceil(mission.countdownLeft)}`;
      hud.prompt = null;
      return hud;
    }
    case 'ascent':
    case 'separation':
      return ascentModel(mission);
    case 'catch':
      return catchModel(mission);
    case 'orbit':
      return orbitModel(mission);
    default:
      return base(mission);
  }
}
