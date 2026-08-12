import { useEffect, useMemo } from 'react';
import { LatheGeometry } from 'three';
import type { Texture } from 'three';
import { NOSE_START, RING_HEIGHT, SHIP_HEIGHT, SHIP_RADIUS } from '../constants.ts';
import { hullProfile } from './hullProfile.ts';
import EngineCluster from './EngineCluster.tsx';
import Flaps from './Flaps.tsx';

interface StarshipProps {
  steelMap: Texture;
  tilesMap: Texture;
  plumeMap: Texture;
  isBurning: boolean;
}

/** Block 2 ship: 9 m stainless barrel, windward tiles, 3+3 Raptors. */
export default function Starship({ steelMap, tilesMap, plumeMap, isBurning }: StarshipProps) {
  const points = useMemo(() => hullProfile(), []);
  const hullGeo = useMemo(() => new LatheGeometry(points, 72), [points]);
  const tileGeo = useMemo(
    () => new LatheGeometry(points, 72, Math.PI * 0.42, Math.PI * 1.16),
    [points]
  );
  const rings = useMemo(() => {
    const ys: number[] = [];
    for (let y = RING_HEIGHT; y < NOSE_START; y += RING_HEIGHT) ys.push(y);
    return ys;
  }, []);

  useEffect(() => {
    return () => {
      hullGeo.dispose();
      tileGeo.dispose();
    };
  }, [hullGeo, tileGeo]);

  return (
    <group>
      <mesh geometry={hullGeo} castShadow={false}>
        <meshStandardMaterial
          map={steelMap}
          color="#e8eaed"
          metalness={0.7}
          roughness={0.34}
          envMapIntensity={1.45}
        />
      </mesh>
      <mesh geometry={tileGeo} scale={1.006}>
        <meshStandardMaterial
          map={tilesMap}
          metalness={0.08}
          roughness={0.82}
          envMapIntensity={0.25}
        />
      </mesh>
      {rings.map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[SHIP_RADIUS + 0.012, 0.02, 6, 72]} />
          <meshStandardMaterial color="#9aa0a6" metalness={0.95} roughness={0.32} />
        </mesh>
      ))}
      <Flaps steelMap={steelMap} tilesMap={tilesMap} />
      <EngineCluster plumeMap={plumeMap} isBurning={isBurning} />
      <mesh position={[0, SHIP_HEIGHT - 0.05, 0]}>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshStandardMaterial color="#d5d8dc" metalness={0.9} roughness={0.22} />
      </mesh>
    </group>
  );
}
