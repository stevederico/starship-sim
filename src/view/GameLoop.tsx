import { useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Sound } from '../audio/sound.ts';
import { ASCENT } from '../game/ascent.ts';
import { TIMING } from '../game/mission.ts';
import type { Mission, MissionEvent, Phase } from '../game/mission.ts';
import { clamp } from '../game/physics.ts';
import type { Controls } from '../input/controls.ts';

interface GameLoopProps {
  mission: Mission;
  controls: Controls;
  sound: Sound;
  paused: RefObject<boolean>;
  onPhase: (phase: Phase) => void;
  onEvent: (event: MissionEvent) => void;
}

function flightLevels(mission: Mission): [number, number] {
  switch (mission.phase) {
    case 'countdown':
      return [mission.countdownLeft <= TIMING.ignitionAt ? 0.55 : 0, 0];
    case 'ascent': {
      const s = mission.ascent;
      const live = s.status === 'pad' || s.status === 'flying';
      return [live && s.fuel > 0 ? s.throttle : 0, live ? clamp(s.q / ASCENT.qLimit, 0, 1) : 0];
    }
    case 'separation':
      return [0.5, 0];
    case 'catch': {
      const s = mission.catch;
      if (!s || s.status !== 'flying' || mission.inIntro) return [0, 0];
      return [s.fuel > 0 ? s.throttle : 0, clamp(Math.hypot(s.vx, s.vy) / 220, 0, 1)];
    }
    case 'orbit': {
      const s = mission.orbit;
      if (!s || s.status !== 'flying' || mission.inIntro) return [0, 0];
      return [s.fuel > 0 ? s.throttle * 0.6 : 0, 0];
    }
    default:
      return [0, 0];
  }
}

/** Steps the mission once per rendered frame, ahead of the views. */
export default function GameLoop({
  mission,
  controls,
  sound,
  paused,
  onPhase,
  onEvent
}: GameLoopProps) {
  const lastPhase = useRef<Phase>(mission.phase);
  const lastCount = useRef(0);

  useFrame((_, delta) => {
    if (paused.current) {
      sound.setFlight(0, 0);
      return;
    }
    mission.update(delta, controls.read());
    for (const event of mission.drainEvents()) onEvent(event);

    const count = Math.ceil(mission.countdownLeft);
    if (count !== lastCount.current) {
      lastCount.current = count;
      if (count > 0) sound.beep(count === 1 ? 1100 : 820);
    }
    const [engine, wind] = flightLevels(mission);
    sound.setFlight(engine, wind);

    if (mission.phase !== lastPhase.current) {
      lastPhase.current = mission.phase;
      onPhase(mission.phase);
    }
  }, -1);

  return null;
}
