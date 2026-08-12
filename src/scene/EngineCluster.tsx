import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  DoubleSide,
  type Group,
  type MeshBasicMaterial,
  type Texture
} from 'three';

interface EngineClusterProps {
  plumeMap: Texture;
  isBurning: boolean;
}

interface BellSpec {
  kind: 'sl' | 'vac';
  position: [number, number, number];
}

function bells(): BellSpec[] {
  const out: BellSpec[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    out.push({ kind: 'sl', position: [Math.cos(a) * 1.32, -0.7, Math.sin(a) * 1.32] });
    const b = a + Math.PI / 3;
    out.push({ kind: 'vac', position: [Math.cos(b) * 2.72, -1.15, Math.sin(b) * 2.72] });
  }
  return out;
}

const BELLS = bells();

function Plume({ map, kind }: { map: Texture; kind: 'sl' | 'vac' }) {
  const group = useRef<Group>(null);
  const matA = useRef<MeshBasicMaterial>(null);
  const matB = useRef<MeshBasicMaterial>(null);
  const height = kind === 'vac' ? 9 : 6.5;
  const width = kind === 'vac' ? 2.6 : 1.8;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker = 0.72 + Math.sin(t * 37) * 0.1 + Math.sin(t * 11.3) * 0.08;
    if (matA.current) matA.current.opacity = flicker;
    if (matB.current) matB.current.opacity = flicker * 0.85;
    if (group.current) {
      const s = 1 + Math.sin(t * 22) * 0.04;
      group.current.scale.set(s, 1 + Math.sin(t * 18) * 0.06, s);
    }
    map.offset.y = (t * 0.45) % 1;
  });

  return (
    <group ref={group} position={[0, -height / 2 - 0.4, 0]}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={matA}
          map={map}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={matB}
          map={map}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Bell({ spec, plumeMap, isBurning }: { spec: BellSpec; plumeMap: Texture; isBurning: boolean }) {
  const isVac = spec.kind === 'vac';
  return (
    <group position={spec.position}>
      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry
          args={isVac ? [0.2, 1.12, 2.5, 28, 1, true] : [0.16, 0.68, 1.55, 24, 1, true]}
        />
        <meshStandardMaterial
          color="#2a2c2e"
          metalness={0.85}
          roughness={0.38}
          side={DoubleSide}
        />
      </mesh>
      {isBurning ? <Plume map={plumeMap} kind={spec.kind} /> : null}
    </group>
  );
}

/** Three sea-level Raptors + three vacuum bells. */
export default function EngineCluster({ plumeMap, isBurning }: EngineClusterProps) {
  return (
    <group>
      {BELLS.map((spec) => (
        <Bell
          key={`${spec.kind}-${spec.position.join(',')}`}
          spec={spec}
          plumeMap={plumeMap}
          isBurning={isBurning}
        />
      ))}
      {isBurning ? (
        <pointLight color="#9ecbff" intensity={50} distance={28} position={[0, -1.2, 0]} />
      ) : null}
    </group>
  );
}
