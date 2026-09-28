import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide } from 'three';
import type { Group } from 'three';
import { EARTH_RADIUS, SHIP_HEIGHT } from '../constants.ts';
import { orbitWarp } from '../game/orbit.ts';
import { EARTH_RADIUS_M, clamp } from '../game/physics.ts';
import SpaceRig from '../scene/SpaceRig.tsx';
import Starship from '../scene/Starship.tsx';
import { VIEW_SPAN, ease, useCameraRange, useParticles } from './shared.ts';
import type { ViewProps } from './shared.ts';

/** Ground rush is exaggerated so speed reads at cinematic scale. */
const SPIN_GAIN = 5;
/** Title-scene Earth, enlarged so the horizon fills the frame. */
const EARTH_SCALE = 3.5;

/** Ship burn to orbit over the cinematic Earth from the title scene. */
export default function OrbitView({ mission, maps }: ViewProps) {
  useCameraRange(0.5, 6000);
  const { smoke, fire } = useParticles(8, 220);
  const ship = useRef<Group>(null);
  const earth = useRef<Group>(null);
  const globe = useRef<Group>(null);
  const [burning, setBurning] = useState(false);
  const fx = useRef({ spin: 0, height: 0, glow: 0, shakeX: 0, shakeY: 0 });

  useFrame(({ camera, size, gl }, delta) => {
    const s = mission.orbit;
    if (!s) return;
    const dt = Math.min(delta, 0.1);
    const f = fx.current;
    const running = s.status === 'flying' && !mission.inIntro;
    const inOrbit = s.status === 'orbit';
    const lost = s.status === 'reentry' && s.y < 110_000;

    const lit = running && s.throttle > 0 && s.fuel > 0;
    if (lit !== burning) setBurning(lit);

    if (ship.current) {
      const wobble = lost ? Math.sin(mission.outcomeTime * 9) * 0.25 * mission.outcomeTime : 0;
      ship.current.rotation.z = -s.angle + wobble;
    }

    if (running || inOrbit || lost) {
      f.spin += ((s.vx * orbitWarp(s)) / (EARTH_RADIUS_M + s.y)) * SPIN_GAIN * dt;
    }
    const height = 14 + clamp((s.y - 40_000) / 160_000, 0, 1) * 36;
    f.height += (height - f.height) * (f.height === 0 ? 1 : ease(2, dt));
    earth.current?.position.set(0, -(EARTH_RADIUS * EARTH_SCALE + f.height), -60);
    if (globe.current) globe.current.rotation.z = f.spin;

    const scale = gl.domElement.height / VIEW_SPAN;
    smoke.setScale(scale);
    fire.setScale(scale);
    if (lost) {
      f.glow += dt * 90;
      while (f.glow >= 1) {
        f.glow -= 1;
        const along = (Math.random() - 0.5) * SHIP_HEIGHT;
        fire.emit({
          x: Math.sin(s.angle) * along + (Math.random() - 0.5) * 8,
          y: Math.cos(s.angle) * along - 4 + (Math.random() - 0.5) * 6,
          z: (Math.random() - 0.5) * 8,
          vx: -60 - Math.random() * 60,
          vy: 14 + Math.random() * 20,
          vz: (Math.random() - 0.5) * 16,
          size: 7 + Math.random() * 6,
          growth: 9,
          life: 0.7 + Math.random() * 0.6,
          r: 1,
          g: 0.42 + Math.random() * 0.3,
          b: 0.16,
          alpha: 0.7
        });
      }
    }
    fire.update(dt, 0.4);

    const amount = (lit ? 0.12 + s.throttle * 0.22 : 0) + (lost ? 0.8 : 0);
    f.shakeX += ((Math.random() - 0.5) * amount * 2 - f.shakeX) * 0.5;
    f.shakeY += ((Math.random() - 0.5) * amount * 2 - f.shakeY) * 0.5;

    const aspect = size.width / size.height;
    const away = inOrbit ? Math.min(mission.outcomeTime, 4) : 0;
    const distance = Math.max(142, 84 / (VIEW_SPAN * aspect)) * (1 + away * 0.05);
    camera.position.set(-16 + away * 9 + f.shakeX, 15 + away * 3 + f.shakeY, distance);
    camera.lookAt(6, -12, 0);
  });

  return (
    <>
      <SpaceRig map={maps.space} />
      <hemisphereLight args={['#c5d8ff', '#1a1208', 0.55]} />
      <ambientLight intensity={0.16} />
      <directionalLight position={[80, 55, 40]} intensity={4.4} color="#fff4e5" />
      <directionalLight position={[-40, 20, -20]} intensity={0.7} color="#8fb4ff" />
      <group ref={earth} scale={EARTH_SCALE}>
        <group ref={globe}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[EARTH_RADIUS, 96, 64]} />
            <meshStandardMaterial map={maps.earth} roughness={0.92} metalness={0.02} />
          </mesh>
        </group>
        <mesh scale={1.012}>
          <sphereGeometry args={[EARTH_RADIUS, 48, 32]} />
          <meshBasicMaterial
            color="#4d8cff"
            transparent
            opacity={0.14}
            side={BackSide}
            depthWrite={false}
          />
        </mesh>
      </group>
      <group ref={ship}>
        <group position={[0, -SHIP_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <Starship
            steelMap={maps.steel}
            tilesMap={maps.tiles}
            plumeMap={maps.plume}
            isBurning={burning}
          />
        </group>
      </group>
      <primitive object={fire.points} />
    </>
  );
}
