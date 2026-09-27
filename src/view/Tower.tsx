import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';
import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Group, InstancedMesh } from 'three';

export const TOWER = {
  ground: -18,
  top: 150,
  /** Tower centerline, meters uprange of the catch line. */
  x: -20,
  half: 6,
  /** Top face of the arms, where the booster pins land. */
  armY: 110,
  armLength: 40,
  armPivotX: -13,
  armGap: 5.6
} as const;

export interface TowerHandle {
  /** Swing of each arm away from closed, radians. */
  setArms: (open: number) => void;
}

interface Beam {
  from: [number, number, number];
  to: [number, number, number];
  thick: number;
}

function lattice(): Beam[] {
  const beams: Beam[] = [];
  const { x, half, ground, top } = TOWER;
  const corners: [number, number][] = [
    [x - half, -half],
    [x + half, -half],
    [x + half, half],
    [x - half, half]
  ];
  for (const [cx, cz] of corners) {
    beams.push({ from: [cx, ground, cz], to: [cx, top, cz], thick: 1.7 });
  }
  const bay = 12;
  let flip = false;
  for (let y = ground; y < top; y += bay) {
    const y1 = Math.min(top, y + bay);
    for (let i = 0; i < 4; i++) {
      const a = corners[i]!;
      const b = corners[(i + 1) % 4]!;
      beams.push({ from: [a[0], y1, a[1]], to: [b[0], y1, b[1]], thick: 0.9 });
      const lo = flip ? a : b;
      const hi = flip ? b : a;
      beams.push({ from: [lo[0], y, lo[1]], to: [hi[0], y1, hi[1]], thick: 0.6 });
    }
    flip = !flip;
  }
  return beams;
}

function Arm({ side }: { side: 1 | -1 }) {
  const { armLength, armY } = TOWER;
  return (
    <group>
      <mesh position={[armLength / 2, armY - 1.3, 0]}>
        <boxGeometry args={[armLength, 2.6, 1.9]} />
        <meshStandardMaterial color="#2b2f33" metalness={0.75} roughness={0.5} />
      </mesh>
      <mesh position={[armLength / 2 + 2, armY + 0.12, -side * 0.5]}>
        <boxGeometry args={[armLength - 6, 0.24, 0.7]} />
        <meshStandardMaterial
          color="#ffb347"
          emissive="#ff8a1f"
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[armLength / 2, armY - 3.4, 0]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[armLength * 0.96, 0.7, 0.9]} />
        <meshStandardMaterial color="#1d2023" metalness={0.75} roughness={0.55} />
      </mesh>
    </group>
  );
}

/** Launch and catch tower with two swinging arms, mount and tank farm. */
const Tower = forwardRef<TowerHandle, { armsOpen: number }>(function Tower({ armsOpen }, ref) {
  const beams = useMemo(lattice, []);
  const frame = useRef<InstancedMesh>(null);
  const front = useRef<Group>(null);
  const back = useRef<Group>(null);

  useImperativeHandle(ref, () => ({
    setArms(open: number) {
      if (front.current) front.current.rotation.y = -open;
      if (back.current) back.current.rotation.y = open;
    }
  }));

  useLayoutEffect(() => {
    const mesh = frame.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const up = new Vector3(0, 1, 0);
    const a = new Vector3();
    const b = new Vector3();
    const mid = new Vector3();
    const dir = new Vector3();
    const turn = new Quaternion();
    const scale = new Vector3();
    beams.forEach((beam, i) => {
      a.set(...beam.from);
      b.set(...beam.to);
      dir.subVectors(b, a);
      const length = dir.length();
      mid.addVectors(a, b).multiplyScalar(0.5);
      turn.setFromUnitVectors(up, dir.normalize());
      scale.set(beam.thick, length, beam.thick);
      matrix.compose(mid, turn, scale);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [beams]);

  const { x, ground, top, armY, armPivotX, armGap } = TOWER;
  const height = top - ground;
  const legs = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      out.push([Math.cos(a) * 7.4, (ground - 3) / 2, Math.sin(a) * 7.4]);
    }
    return out;
  }, [ground]);
  const tanks = useMemo(() => {
    const out: { key: string; position: [number, number, number]; height: number; radius: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const tall = 30 + (i % 3) * 8;
      out.push({
        key: `tank-${i}`,
        position: [-150 - i * 17, ground + tall / 2, -95 - (i % 2) * 22],
        height: tall,
        radius: 6
      });
    }
    return out;
  }, [ground]);

  return (
    <group>
      <instancedMesh ref={frame} args={[undefined, undefined, beams.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#30353a" metalness={0.7} roughness={0.55} />
      </instancedMesh>
      <mesh position={[x, ground + height / 2, 0]}>
        <boxGeometry args={[6.5, height, 6.5]} />
        <meshStandardMaterial color="#1b1e21" metalness={0.5} roughness={0.7} />
      </mesh>
      <mesh position={[x, top + 1.5, 0]}>
        <boxGeometry args={[15, 3, 15]} />
        <meshStandardMaterial color="#25292d" metalness={0.6} roughness={0.6} />
      </mesh>
      <mesh position={[x, top + 16, 0]}>
        <cylinderGeometry args={[0.2, 0.5, 26, 8]} />
        <meshStandardMaterial color="#8d949b" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[armPivotX - 0.4, armY - 2, 0]}>
        <boxGeometry args={[2.4, 13, 17]} />
        <meshStandardMaterial color="#22262a" metalness={0.7} roughness={0.5} />
      </mesh>
      <group ref={front} position={[armPivotX, 0, armGap]} rotation={[0, -armsOpen, 0]}>
        <Arm side={1} />
      </group>
      <group ref={back} position={[armPivotX, 0, -armGap]} rotation={[0, armsOpen, 0]}>
        <Arm side={-1} />
      </group>

      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[8.6, 9.2, 3, 40, 1, true]} />
        <meshStandardMaterial color="#1a1c1e" metalness={0.6} roughness={0.7} side={2} />
      </mesh>
      <mesh position={[0, -3.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.2, 9.2, 40]} />
        <meshStandardMaterial color="#141516" metalness={0.5} roughness={0.8} side={2} />
      </mesh>
      {legs.map((leg) => (
        <mesh key={leg.join(',')} position={leg}>
          <boxGeometry args={[2.2, -(ground + 3), 2.2]} />
          <meshStandardMaterial color="#202326" metalness={0.6} roughness={0.7} />
        </mesh>
      ))}
      {tanks.map((tank) => (
        <mesh key={tank.key} position={tank.position}>
          <cylinderGeometry args={[tank.radius, tank.radius, tank.height, 24]} />
          <meshStandardMaterial color="#e6e8ea" metalness={0.2} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
});

export default Tower;
