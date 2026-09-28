import { useLayoutEffect } from 'react';
import { useTexture } from '@react-three/drei';
import { RepeatWrapping, SRGBColorSpace } from 'three';

const BASE = import.meta.env.BASE_URL;

const ASSETS = {
  steel: `${BASE}assets/steel.webp`,
  tiles: `${BASE}assets/tiles.webp`,
  earth: `${BASE}assets/earth-day.jpg`,
  space: `${BASE}assets/space-equirect.webp`,
  plume: `${BASE}assets/plume.webp`
};

/** Loads Grok + NASA maps and sets wrap / color space. */
export function useShipTextures() {
  const maps = useTexture(ASSETS);

  useLayoutEffect(() => {
    maps.steel.colorSpace = SRGBColorSpace;
    maps.steel.wrapS = RepeatWrapping;
    maps.steel.wrapT = RepeatWrapping;
    maps.steel.repeat.set(2, 8);
    maps.steel.anisotropy = 8;

    maps.tiles.colorSpace = SRGBColorSpace;
    maps.tiles.wrapS = RepeatWrapping;
    maps.tiles.wrapT = RepeatWrapping;
    maps.tiles.repeat.set(1, 1);
    maps.tiles.anisotropy = 8;

    maps.earth.colorSpace = SRGBColorSpace;
    maps.earth.anisotropy = 8;

    maps.space.colorSpace = SRGBColorSpace;

    maps.plume.colorSpace = SRGBColorSpace;
    maps.plume.wrapS = RepeatWrapping;
    maps.plume.wrapT = RepeatWrapping;
  }, [maps]);

  return maps;
}
