import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import type { Mission } from '../game/mission.ts';
import type { useShipTextures } from '../scene/useShipTextures.ts';
import { ParticlePool } from './particles.ts';

export type ShipMaps = ReturnType<typeof useShipTextures>;

export interface ViewProps {
  mission: Mission;
  maps: ShipMaps;
}

/** Vertical field of view of the game camera, degrees. */
export const FOV = 36;
/** Visible height per meter of distance: 2 tan(fov / 2). */
export const VIEW_SPAN = 2 * Math.tan((FOV * Math.PI) / 360);

/** Sets the clip range for a view and puts the old one back on the way out. */
export function useCameraRange(near: number, far: number): void {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    const before = { near: camera.near, far: camera.far };
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
    return () => {
      camera.near = before.near;
      camera.far = before.far;
      camera.updateProjectionMatrix();
    };
  }, [camera, near, far]);
}

/** Smoke and fire pools that live as long as the view. */
export function useParticles(smokeCount: number, fireCount: number) {
  const pools = useMemo(
    () => ({ smoke: new ParticlePool(smokeCount, false), fire: new ParticlePool(fireCount, true) }),
    [smokeCount, fireCount]
  );
  useEffect(
    () => () => {
      pools.smoke.dispose();
      pools.fire.dispose();
    },
    [pools]
  );
  return pools;
}

/** Frame-rate independent blend factor. */
export function ease(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}
