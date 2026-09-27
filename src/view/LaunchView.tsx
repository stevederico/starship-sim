import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { ASCENT } from '../game/ascent.ts';
import { TIMING } from '../game/mission.ts';
import { airDensity, clamp } from '../game/physics.ts';
import Starship from '../scene/Starship.tsx';
import { createAtmosphere, updateAtmosphere } from './atmosphere.ts';
import Booster, { BOOSTER } from './Booster.tsx';
import Clouds from './Clouds.tsx';
import DayRig from './DayRig.tsx';
import Exhaust from './Exhaust.tsx';
import type { ExhaustHandle } from './Exhaust.tsx';
import Ground from './Ground.tsx';
import { explode } from './particles.ts';
import { VIEW_SPAN, ease, useCameraRange, useParticles } from './shared.ts';
import type { ViewProps } from './shared.ts';
import Sky from './Sky.tsx';
import Tower, { TOWER } from './Tower.tsx';

/** The stack turns about this height above its engines. */
const PIVOT = 48;
const ARMS_AWAY = 0.95;
const LOOK_DROP = -30;
/** Camera sits a little off the side-on line so the scene reads as 3D. */
const SWING = 0.3;

/** Pad, ascent and stage separation. The stack stays at the origin, the world moves. */
export default function LaunchView({ mission, maps }: ViewProps) {
  useCameraRange(20, 3_000_000);
  const atmosphere = useMemo(() => createAtmosphere(maps.space), [maps.space]);
  const { smoke, fire } = useParticles(800, 260);
  const world = useRef<Group>(null);
  const stack = useRef<Group>(null);
  const booster = useRef<Group>(null);
  const ship = useRef<Group>(null);
  const exhaust = useRef<ExhaustHandle>(null);
  const [shipBurning, setShipBurning] = useState(false);
  const fx = useRef({ exploded: false, steam: 0, trail: 0, power: 0, shakeX: 0, shakeY: 0 });

  useFrame(({ camera, size, gl }, delta) => {
    const dt = Math.min(delta, 0.1);
    const s = mission.ascent;
    const phase = mission.phase;
    const f = fx.current;
    const separating = phase === 'separation';
    const lost = s.status === 'breakup' || s.status === 'tower' || s.status === 'crash';

    const drift = separating ? mission.phaseTime * ASCENT.warp : 0;
    const px = s.x + s.vx * drift;
    const py = s.y + s.vy * drift;
    const sin = Math.sin(s.angle);
    const cos = Math.cos(s.angle);

    updateAtmosphere(atmosphere, py);
    world.current?.position.set(-px, -(py + PIVOT), 0);
    if (stack.current) {
      stack.current.rotation.z = -s.angle;
      stack.current.visible = !lost;
    }

    const t = separating ? mission.phaseTime : 0;
    if (ship.current) ship.current.position.y = BOOSTER.topY - PIVOT + 4 * t + 5 * t * t;
    if (booster.current) {
      booster.current.position.y = -PIVOT - (2 * t + 3 * t * t);
      booster.current.rotation.z = 0.035 * t * t;
    }
    if (shipBurning !== separating) setShipBurning(separating);

    let power = 0;
    if (phase === 'countdown') {
      const lit = TIMING.ignitionAt - mission.countdownLeft;
      power = lit > 0 ? clamp(lit / TIMING.ignitionAt, 0, 1) * 0.7 : 0;
    } else if (separating) {
      power = clamp(0.35 - t * 0.2, 0, 1);
    } else if (!lost && s.status !== 'staged' && s.fuel > 0) {
      power = s.throttle;
    }
    f.power += (power - f.power) * ease(10, dt);
    const spread = 1 + clamp(py / 20_000, 0, 3);
    exhaust.current?.set(f.power, spread);

    const scale = gl.domElement.height / VIEW_SPAN;
    smoke.setScale(scale);
    fire.setScale(scale);

    if (f.power > 0.05 && py < 260) {
      f.steam += dt * 110 * f.power;
      while (f.steam >= 1) {
        f.steam -= 1;
        const a = Math.random() * Math.PI * 2;
        const speed = 22 + Math.random() * 46;
        const shade = 0.82 + Math.random() * 0.14;
        smoke.emit({
          x: Math.cos(a) * 7,
          y: TOWER.ground + 2 + Math.random() * 5,
          z: Math.sin(a) * 7,
          vx: Math.cos(a) * speed,
          vy: 2 + Math.random() * 12,
          vz: Math.sin(a) * speed,
          size: 16,
          growth: 24,
          life: 3.2 + Math.random() * 2.4,
          r: shade,
          g: shade,
          b: shade,
          alpha: 0.5
        });
      }
    }

    const air = airDensity(py) / 1.225;
    if (f.power > 0.05 && s.status === 'flying' && air > 0.015 && !separating) {
      const vx = s.vx * ASCENT.warp;
      const vy = s.vy * ASCENT.warp;
      const moved = Math.hypot(vx, vy) * dt;
      const count = clamp(Math.ceil(moved / 30), 1, 6);
      const tailX = px - sin * 95;
      const tailY = py - cos * 95;
      for (let i = 0; i < count; i++) {
        const back = (i / count) * dt;
        const shade = 0.78 + Math.random() * 0.16;
        smoke.emit({
          x: tailX - vx * back + (Math.random() - 0.5) * 10,
          y: tailY - vy * back + (Math.random() - 0.5) * 10,
          z: (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 14,
          vy: (Math.random() - 0.5) * 14,
          vz: (Math.random() - 0.5) * 14,
          size: 20 * spread,
          growth: 16 * spread,
          life: 2.2 + Math.random(),
          r: shade,
          g: shade * 0.98,
          b: shade * 0.95,
          alpha: 0.34 * Math.sqrt(air) * f.power
        });
      }
    }

    if (lost && !f.exploded) {
      f.exploded = true;
      explode(fire, smoke, px, py + PIVOT, 0, 1.5);
    }
    smoke.update(dt, 0.5);
    fire.update(dt, 1.4);

    const rattle = lost ? 0 : f.power * 0.5 + clamp(s.q / ASCENT.qLimit, 0, 1.3) * 1.3;
    const boom = f.exploded && mission.outcomeTime < 0.8 ? 6 : 0;
    const amount = rattle + boom;
    f.shakeX += ((Math.random() - 0.5) * amount * 2 - f.shakeX) * 0.5;
    f.shakeY += ((Math.random() - 0.5) * amount * 2 - f.shakeY) * 0.5;

    const aspect = size.width / size.height;
    const climb = clamp(py / 3000, 0, 1);
    const distance = Math.max(400, 118 / (VIEW_SPAN * aspect)) + climb * 90;
    // Aim below the stack so it sits clear of the gauges along the bottom.
    const lookX = -10 * (1 - climb);
    const lookY = LOOK_DROP + (separating ? 10 + t * 8 : 0);
    const swing = SWING * (1 - climb * 0.5);
    camera.position.set(
      lookX + Math.sin(swing) * distance + f.shakeX,
      lookY + 24 - 70 * climb + f.shakeY,
      Math.cos(swing) * distance
    );
    camera.lookAt(lookX, lookY, 0);
  });

  return (
    <>
      <DayRig />
      <Sky atmosphere={atmosphere} />
      <group ref={world}>
        <Ground atmosphere={atmosphere} level={TOWER.ground} />
        <Clouds />
        <Tower armsOpen={ARMS_AWAY} />
        <primitive object={smoke.points} />
        <primitive object={fire.points} />
      </group>
      <group ref={stack}>
        <group ref={booster} position={[0, -PIVOT, 0]}>
          <Booster steelMap={maps.steel} />
          <Exhaust ref={exhaust} radius={4.2} length={95} />
        </group>
        <group ref={ship} position={[0, BOOSTER.topY - PIVOT, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <Starship
            steelMap={maps.steel}
            tilesMap={maps.tiles}
            plumeMap={maps.plume}
            isBurning={shipBurning}
          />
        </group>
      </group>
    </>
  );
}
