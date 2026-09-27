import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { DoubleSide, Matrix4 } from 'three';
import type { InstancedMesh, Texture } from 'three';
import { RING_HEIGHT, SHIP_RADIUS } from '../constants.ts';

export const BOOSTER = {
  length: 70,
  /** Height of the catch pins above the engine plane. */
  pinY: 64,
  /** Where the ship sits on top. */
  topY: 71.4
} as const;

interface BoosterProps {
  steelMap: Texture;
}

const RADIUS = SHIP_RADIUS;
const QUARTERS = [0.25, 0.75, 1.25, 1.75].map((n) => n * Math.PI);

function engineSpots(): [number, number][] {
  const out: [number, number][] = [];
  const rings: [number, number, number][] = [
    [3, 0.95, 0],
    [10, 2.35, 0.2],
    [20, 3.9, 0]
  ];
  for (const [count, radius, phase] of rings) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + phase;
      out.push([Math.cos(a) * radius, Math.sin(a) * radius]);
    }
  }
  return out;
}

/** First stage: steel barrel, grid fins, chines, catch pins, 33 engine bells. */
export default function Booster({ steelMap }: BoosterProps) {
  const bells = useRef<InstancedMesh>(null);
  const spots = useMemo(engineSpots, []);
  const steel = useMemo(() => {
    const map = steelMap.clone();
    map.repeat.set(2, 11);
    map.needsUpdate = true;
    return map;
  }, [steelMap]);
  const welds = useMemo(() => {
    const ys: number[] = [];
    for (let y = 3 + RING_HEIGHT * 2; y < 68; y += RING_HEIGHT * 2) ys.push(y);
    return ys;
  }, []);

  useEffect(() => () => steel.dispose(), [steel]);

  useLayoutEffect(() => {
    const mesh = bells.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    spots.forEach(([x, z], i) => {
      matrix.makeTranslation(x, -0.2, z);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [spots]);

  return (
    <group>
      <mesh position={[0, 36, 0]}>
        <cylinderGeometry args={[RADIUS, RADIUS, 66, 64]} />
        <meshStandardMaterial
          map={steel}
          color="#e8eaed"
          metalness={0.7}
          roughness={0.34}
          envMapIntensity={1.45}
        />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[RADIUS, RADIUS - 0.25, 3, 64, 1, true]} />
        <meshStandardMaterial color="#54585c" metalness={0.8} roughness={0.45} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[RADIUS - 0.1, 48]} />
        <meshStandardMaterial color="#151617" metalness={0.6} roughness={0.7} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 70.2, 0]}>
        <cylinderGeometry args={[RADIUS, RADIUS, 2.4, 64, 1, true]} />
        <meshStandardMaterial color="#2a2d30" metalness={0.8} roughness={0.5} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 69, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[RADIUS - 0.05, 48]} />
        <meshStandardMaterial color="#1c1e20" metalness={0.7} roughness={0.6} />
      </mesh>
      {welds.map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[RADIUS + 0.012, 0.022, 6, 64]} />
          <meshStandardMaterial color="#9aa0a6" metalness={0.95} roughness={0.32} />
        </mesh>
      ))}
      {QUARTERS.map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <mesh position={[RADIUS + 2.3, 65.5, 0]}>
            <boxGeometry args={[4.4, 0.4, 3.4]} />
            <meshStandardMaterial color="#3a3e42" metalness={0.85} roughness={0.5} />
          </mesh>
          <mesh position={[RADIUS + 0.35, 13, 0]}>
            <boxGeometry args={[0.9, 19, 0.6]} />
            <meshStandardMaterial color="#c9cdd1" metalness={0.8} roughness={0.38} />
          </mesh>
        </group>
      ))}
      {[1, -1].map((side) => (
        <mesh key={side} position={[0, BOOSTER.pinY, side * (RADIUS + 0.55)]}>
          <boxGeometry args={[0.9, 0.7, 1.3]} />
          <meshStandardMaterial color="#4a4e52" metalness={0.85} roughness={0.45} />
        </mesh>
      ))}
      <instancedMesh ref={bells} args={[undefined, undefined, spots.length]}>
        <cylinderGeometry args={[0.2, 0.62, 1.5, 14, 1, true]} />
        <meshStandardMaterial color="#2a2c2e" metalness={0.85} roughness={0.4} side={DoubleSide} />
      </instancedMesh>
    </group>
  );
}
