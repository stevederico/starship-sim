import { ACESFilmicToneMapping, Color } from 'three';
import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useState } from 'react';
import FlightHud from './hud/FlightHud.tsx';
import Scene from './scene/Scene.tsx';
import { trackEvent } from './utils/analytics.ts';

export default function App() {
  const [isBurning, setIsBurning] = useState(
    () => new URLSearchParams(window.location.search).has('burn')
  );

  const handleToggleBurn = useCallback(() => {
    setIsBurning((prev) => {
      const next = !prev;
      trackEvent(next ? 'engine-ignite' : 'engine-cutoff');
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      }
      event.preventDefault();
      handleToggleBurn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleToggleBurn]);

  return (
    <main className="relative h-full">
      <Canvas
        className="h-full w-full"
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.02,
          powerPreference: 'high-performance'
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new Color('#05070a'));
        }}
        camera={{ position: [78, 22, 42], fov: 36, near: 0.1, far: 4000 }}
      >
        <Suspense fallback={null}>
          <Scene isBurning={isBurning} />
        </Suspense>
      </Canvas>
      <FlightHud isBurning={isBurning} onToggleBurn={handleToggleBurn} />
    </main>
  );
}
