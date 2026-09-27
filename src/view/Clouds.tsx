import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { seededRandom } from '../game/physics.ts';

interface CloudSpec {
  position: [number, number, number];
  scale: [number, number, number];
  opacity: number;
}

function cloudTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const random = seededRandom(77);
    for (let i = 0; i < 46; i++) {
      const x = size * (0.2 + random() * 0.6);
      const y = size * (0.42 + random() * 0.26);
      const r = size * (0.08 + random() * 0.16);
      const blob = ctx.createRadialGradient(x, y, 0, x, y, r);
      blob.addColorStop(0, 'rgba(255,255,255,0.34)');
      blob.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = blob;
      ctx.fillRect(0, 0, size, size);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function layout(): CloudSpec[] {
  const random = seededRandom(2026);
  const out: CloudSpec[] = [];
  for (let i = 0; i < 70; i++) {
    const width = 900 + random() * 2600;
    out.push({
      position: [-9000 + random() * 52_000, 1400 + random() * 8200, -900 - random() * 16_000],
      scale: [width, width * (0.4 + random() * 0.25), 1],
      opacity: 0.55 + random() * 0.4
    });
  }
  return out;
}

/** Scattered cumulus behind the flight path. Passing them sells the speed. */
export default function Clouds() {
  const texture = useMemo(cloudTexture, []);
  const clouds = useMemo(layout, []);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group>
      {clouds.map((cloud) => (
        <sprite key={cloud.position.join(',')} position={cloud.position} scale={cloud.scale}>
          <spriteMaterial
            map={texture}
            transparent
            opacity={cloud.opacity}
            depthWrite={false}
            fog={false}
          />
        </sprite>
      ))}
    </group>
  );
}
