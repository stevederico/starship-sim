import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { EARTH_RADIUS_M } from '../game/physics.ts';
import { GROUND_FRAGMENT, GROUND_VERTEX } from './atmosphere.ts';
import type { Atmosphere } from './atmosphere.ts';

interface GroundProps {
  atmosphere: Atmosphere;
  /** Height of the surface in site coordinates. */
  level: number;
}

const SEGMENTS = 96;
const OUTER_RADIUS = 1_700_000;

/** Rings spread wider with distance, dropped onto the curve of the planet. */
function capGeometry(): BufferGeometry {
  const radii: number[] = [];
  for (let r = 60; r < OUTER_RADIUS; r *= 1.5) radii.push(r);
  radii.push(OUTER_RADIUS);

  const positions: number[] = [0, 0, 0];
  for (const r of radii) {
    const drop = EARTH_RADIUS_M - Math.sqrt(EARTH_RADIUS_M * EARTH_RADIUS_M - r * r);
    for (let s = 0; s < SEGMENTS; s++) {
      const a = (s / SEGMENTS) * Math.PI * 2;
      positions.push(Math.cos(a) * r, -drop, Math.sin(a) * r);
    }
  }

  const indices: number[] = [];
  for (let s = 0; s < SEGMENTS; s++) {
    indices.push(0, 1 + ((s + 1) % SEGMENTS), 1 + s);
  }
  for (let ring = 0; ring < radii.length - 1; ring++) {
    const inner = 1 + ring * SEGMENTS;
    const outer = inner + SEGMENTS;
    for (let s = 0; s < SEGMENTS; s++) {
      const next = (s + 1) % SEGMENTS;
      indices.push(inner + s, inner + next, outer + s);
      indices.push(inner + next, outer + next, outer + s);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  return geometry;
}

/** Coast, sea and launch site, drawn by a shader so it stays sharp at any height. */
export default function Ground({ atmosphere, level }: GroundProps) {
  const geometry = useMemo(capGeometry, []);
  // Built by hand: the material must share the live uniform objects.
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: GROUND_VERTEX,
        fragmentShader: GROUND_FRAGMENT,
        uniforms: { uAlt: atmosphere.uAlt, uHaze: atmosphere.uHaze }
      }),
    [atmosphere]
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, level, 0]}
      frustumCulled={false}
      renderOrder={-50}
    />
  );
}
