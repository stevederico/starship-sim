import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, ShaderMaterial } from 'three';
import type { Mesh } from 'three';
import { SKY_FRAGMENT, SKY_VERTEX } from './atmosphere.ts';
import type { Atmosphere } from './atmosphere.ts';

interface SkyProps {
  atmosphere: Atmosphere;
}

/** Dome that rides with the camera: blue at the pad, stars by staging. */
export default function Sky({ atmosphere }: SkyProps) {
  const mesh = useRef<Mesh>(null);
  // Built by hand: the material must share the live uniform objects.
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        uniforms: {
          uAlt: atmosphere.uAlt,
          uSpace: atmosphere.uSpace,
          uSunDir: atmosphere.uSunDir,
          uHaze: atmosphere.uHaze
        },
        side: BackSide,
        depthTest: false,
        depthWrite: false
      }),
    [atmosphere]
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position);
  });

  return (
    <mesh ref={mesh} material={material} scale={5000} renderOrder={-100} frustumCulled={false}>
      <sphereGeometry args={[1, 48, 24]} />
    </mesh>
  );
}
