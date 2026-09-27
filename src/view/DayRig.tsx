import { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { CanvasTexture, EquirectangularReflectionMapping, SRGBColorSpace } from 'three';
import { SUN_DIRECTION } from './atmosphere.ts';

function daylightTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, 128);
    sky.addColorStop(0, '#3f78c9');
    sky.addColorStop(0.46, '#cfe2f5');
    sky.addColorStop(0.5, '#e9eef2');
    sky.addColorStop(0.54, '#8b8672');
    sky.addColorStop(1, '#4a4a40');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 256, 128);
    const sun = ctx.createRadialGradient(170, 30, 0, 170, 30, 34);
    sun.addColorStop(0, 'rgba(255,250,235,1)');
    sun.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, 256, 128);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.mapping = EquirectangularReflectionMapping;
  return texture;
}

/** Daylight reflections and sun for the pad and the catch. */
export default function DayRig() {
  const { scene } = useThree();
  const texture = useMemo(daylightTexture, []);

  useLayoutEffect(() => {
    scene.background = null;
    scene.environment = texture;
    scene.environmentIntensity = 0.9;
    return () => {
      scene.environment = null;
      texture.dispose();
    };
  }, [scene, texture]);

  const sun = SUN_DIRECTION;
  return (
    <>
      <hemisphereLight args={['#d6e6ff', '#57503f', 0.7]} />
      <directionalLight
        position={[sun.x * 1000, sun.y * 1000, sun.z * 1000]}
        intensity={3.6}
        color="#fff3e0"
      />
    </>
  );
}
