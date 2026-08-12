import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { EquirectangularReflectionMapping } from 'three';
import type { Texture } from 'three';

interface SpaceRigProps {
  map: Texture;
}

/** Space panorama as background + steel environment map. */
export default function SpaceRig({ map }: SpaceRigProps) {
  const { scene } = useThree();

  useLayoutEffect(() => {
    map.mapping = EquirectangularReflectionMapping;
    scene.background = map;
    scene.environment = map;
    scene.environmentIntensity = 0.85;
    return () => {
      scene.background = null;
      scene.environment = null;
    };
  }, [map, scene]);

  return null;
}
