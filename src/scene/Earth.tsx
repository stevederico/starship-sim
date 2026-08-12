import { BackSide } from 'three';
import type { Texture } from 'three';
import { EARTH_RADIUS, ORBIT_ALTITUDE } from '../constants.ts';

interface EarthProps {
  map: Texture;
}

/** NASA Blue Marble sphere behind the ship. */
export default function Earth({ map }: EarthProps) {
  return (
    <group
      position={[0, -(ORBIT_ALTITUDE + 8), -(EARTH_RADIUS + 70)]}
      rotation={[0.2, 2.35, 0.15]}
    >
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 64, 48]} />
        <meshStandardMaterial map={map} roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh scale={1.045}>
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
  );
}
