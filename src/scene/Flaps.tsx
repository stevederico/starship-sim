import type { Texture } from 'three';
import { NOSE_START, SHIP_RADIUS } from '../constants.ts';

interface FlapsProps {
  steelMap: Texture;
  tilesMap: Texture;
}

interface FlapProps extends FlapsProps {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
}

function Flap({ steelMap, tilesMap, position, rotation, size }: FlapProps) {
  const [w, h, d] = size;
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          map={steelMap}
          metalness={0.9}
          roughness={0.3}
          envMapIntensity={1}
        />
      </mesh>
      <mesh position={[0, 0, -(d / 2 + 0.012)]}>
        <boxGeometry args={[w * 0.96, h * 0.96, 0.02]} />
        <meshStandardMaterial map={tilesMap} metalness={0.08} roughness={0.85} />
      </mesh>
    </group>
  );
}

/** Two forward ears + two aft flaps, belly tiles toward Earth. */
export default function Flaps({ steelMap, tilesMap }: FlapsProps) {
  const aftY = 9.2;
  const fwdY = NOSE_START + 1.6;
  const cant = 0.28;

  return (
    <group>
      <Flap
        steelMap={steelMap}
        tilesMap={tilesMap}
        position={[SHIP_RADIUS + 0.15, aftY, 0.4]}
        rotation={[0.12, 0, Math.PI / 2 - cant]}
        size={[0.28, 8.4, 3.1]}
      />
      <Flap
        steelMap={steelMap}
        tilesMap={tilesMap}
        position={[-(SHIP_RADIUS + 0.15), aftY, 0.4]}
        rotation={[0.12, 0, -(Math.PI / 2 - cant)]}
        size={[0.28, 8.4, 3.1]}
      />
      <Flap
        steelMap={steelMap}
        tilesMap={tilesMap}
        position={[SHIP_RADIUS - 0.4, fwdY, 0.2]}
        rotation={[0.18, 0, Math.PI / 2 - 0.4]}
        size={[0.2, 4.2, 2.1]}
      />
      <Flap
        steelMap={steelMap}
        tilesMap={tilesMap}
        position={[-(SHIP_RADIUS - 0.4), fwdY, 0.2]}
        rotation={[0.18, 0, -(Math.PI / 2 - 0.4)]}
        size={[0.2, 4.2, 2.1]}
      />
    </group>
  );
}
