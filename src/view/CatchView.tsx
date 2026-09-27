import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide, Vector3 } from 'three';
import type { Group, Mesh } from 'three';
import { CATCH } from '../game/catch.ts';
import { clamp } from '../game/physics.ts';
import { createAtmosphere, updateAtmosphere } from './atmosphere.ts';
import Booster from './Booster.tsx';
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
import type { TowerHandle } from './Tower.tsx';

/** The booster turns about this height above its engines. */
const PIVOT = 35;
const ARMS_OPEN = 0.42;
const BEAM_HEIGHT = 1200;
/** Camera sits a little off the side-on line so the arms read as a pair. */
const SWING = 0.32;

/** Booster return: fixed world, camera frames booster and tower together. */
export default function CatchView({ mission, maps }: ViewProps) {
  useCameraRange(10, 3_000_000);
  const atmosphere = useMemo(() => createAtmosphere(maps.space), [maps.space]);
  const { smoke, fire } = useParticles(600, 260);
  const body = useRef<Group>(null);
  const tower = useRef<TowerHandle>(null);
  const exhaust = useRef<ExhaustHandle>(null);
  const beam = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const fx = useRef({
    exploded: false,
    started: false,
    trail: 0,
    dust: 0,
    power: 0,
    arms: ARMS_OPEN,
    y: 0,
    angle: 0,
    distance: 0,
    shakeX: 0,
    shakeY: 0,
    look: new Vector3()
  });

  useFrame(({ camera, size, gl, clock }, delta) => {
    const s = mission.catch;
    if (!s) return;
    const dt = Math.min(delta, 0.1);
    const f = fx.current;
    const caught = s.status === 'caught';
    const lost = s.status === 'crash' || s.status === 'tower';

    if (!f.started) {
      f.started = true;
      f.y = s.y;
      f.angle = s.angle;
    }
    // A caught booster settles onto the arms instead of freezing mid-air.
    const settle = caught ? ease(5, dt) : 1;
    f.y += ((caught ? CATCH.catchY : s.y) - f.y) * settle;
    f.angle += ((caught ? 0 : s.angle) - f.angle) * settle;
    f.arms += ((caught ? 0 : ARMS_OPEN) - f.arms) * ease(caught ? 7 : 3, dt);
    tower.current?.setArms(f.arms);

    updateAtmosphere(atmosphere, Math.max(0, camera.position.y));
    if (body.current) {
      body.current.position.set(s.x, f.y + PIVOT, 0);
      body.current.rotation.z = -f.angle;
      body.current.visible = !lost;
    }

    const power = s.status === 'flying' && s.fuel > 0 && !mission.inIntro ? s.throttle : 0;
    f.power += (power - f.power) * ease(12, dt);
    exhaust.current?.set(f.power, 1);

    if (beam.current) beam.current.visible = !caught && !lost;
    if (ring.current) {
      const pulse = 0.75 + 0.25 * Math.sin(clock.elapsedTime * 5);
      ring.current.scale.setScalar(caught ? 1 : pulse * 0.2 + 0.9);
      ring.current.visible = !lost;
    }

    const scale = gl.domElement.height / VIEW_SPAN;
    smoke.setScale(scale);
    fire.setScale(scale);

    const sin = Math.sin(f.angle);
    const cos = Math.cos(f.angle);
    if (f.power > 0.05) {
      f.trail += dt * 70 * f.power;
      while (f.trail >= 1) {
        f.trail -= 1;
        const shade = 0.8 + Math.random() * 0.15;
        smoke.emit({
          x: s.x - sin * 55 + (Math.random() - 0.5) * 8,
          y: f.y - cos * 55 + (Math.random() - 0.5) * 8,
          z: (Math.random() - 0.5) * 8,
          vx: s.vx * 0.3 - sin * 40 + (Math.random() - 0.5) * 12,
          vy: s.vy * 0.3 - cos * 40 + (Math.random() - 0.5) * 12,
          vz: (Math.random() - 0.5) * 12,
          size: 10,
          growth: 16,
          life: 1.6 + Math.random(),
          r: shade,
          g: shade,
          b: shade,
          alpha: 0.26
        });
      }
      const height = f.y - TOWER.ground;
      if (height < 170) {
        f.dust += dt * 80 * f.power * (1 - height / 170);
        while (f.dust >= 1) {
          f.dust -= 1;
          const a = Math.random() * Math.PI * 2;
          const speed = 20 + Math.random() * 40;
          smoke.emit({
            x: s.x + Math.cos(a) * 6,
            y: TOWER.ground + 1 + Math.random() * 3,
            z: Math.sin(a) * 6,
            vx: Math.cos(a) * speed,
            vy: 2 + Math.random() * 8,
            vz: Math.sin(a) * speed,
            size: 12,
            growth: 20,
            life: 2 + Math.random() * 1.5,
            r: 0.74,
            g: 0.7,
            b: 0.62,
            alpha: 0.4
          });
        }
      }
    }

    if (lost && !f.exploded) {
      f.exploded = true;
      explode(fire, smoke, s.x, f.y + PIVOT, 0, 1);
    }
    smoke.update(dt, 0.6);
    fire.update(dt, 1.4);

    // Frame the booster and the arms together once they fit, else lead the booster.
    const aspect = size.width / size.height;
    const bx = s.x;
    const by = f.y + PIVOT;
    const tx = -4;
    const ty = TOWER.armY - 30;
    const gapX = bx - tx;
    const gapY = by - ty;
    const gap = Math.hypot(gapX, gapY);
    const wanted = Math.abs(gapY) * 1.3 + 260;
    const height = clamp(wanted, 300, 1000);
    const width = Math.abs(gapX) * 1.3 + 130;
    const distance = Math.max(height / VIEW_SPAN, width / (VIEW_SPAN * aspect));
    let lookX = (bx + tx) / 2;
    let lookY = (by + ty) / 2;
    if (wanted > 1000 && gap > 1) {
      const lead = height / 2 - 120;
      lookX = bx - (gapX / gap) * lead;
      lookY = by - (gapY / gap) * lead;
    }
    const pull = caught ? 1 + Math.min(mission.outcomeTime, 3) * 0.06 : 1;
    const blend = f.distance === 0 ? 1 : ease(3.5, dt);
    f.look.x += (lookX - f.look.x) * blend;
    f.look.y += (lookY - f.look.y) * blend;
    f.distance += (distance * pull - f.distance) * blend;

    const boom = f.exploded && mission.outcomeTime < 0.8 ? 5 : 0;
    const amount = f.power * 0.5 + boom;
    f.shakeX += ((Math.random() - 0.5) * amount * 2 - f.shakeX) * 0.5;
    f.shakeY += ((Math.random() - 0.5) * amount * 2 - f.shakeY) * 0.5;

    // Aim low so the action sits clear of the gauges along the bottom.
    const aimY = f.look.y - f.distance * VIEW_SPAN * 0.1;
    const swing = SWING + (caught ? Math.min(mission.outcomeTime, 3) * 0.08 : 0);
    camera.position.set(
      f.look.x + Math.sin(swing) * f.distance + f.shakeX,
      Math.max(TOWER.ground + 12, aimY + f.distance * 0.06 + f.shakeY),
      Math.cos(swing) * f.distance
    );
    camera.lookAt(f.look.x, aimY, 0);
  });

  return (
    <>
      <DayRig />
      <Sky atmosphere={atmosphere} />
      <Ground atmosphere={atmosphere} level={TOWER.ground} />
      <Clouds />
      <Tower ref={tower} armsOpen={ARMS_OPEN} />
      <mesh ref={beam} position={[0, TOWER.armY + BEAM_HEIGHT / 2, 0]} renderOrder={4}>
        <planeGeometry args={[CATCH.tolX * 2, BEAM_HEIGHT]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.13}
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ring} position={[0, TOWER.armY + 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6.4, 0.22, 8, 48]} />
        <meshBasicMaterial color="#4ade80" toneMapped={false} />
      </mesh>
      <group ref={body}>
        <group position={[0, -PIVOT, 0]}>
          <Booster steelMap={maps.steel} />
          <Exhaust ref={exhaust} radius={2.6} length={58} />
        </group>
      </group>
      <primitive object={smoke.points} />
      <primitive object={fire.points} />
    </>
  );
}
