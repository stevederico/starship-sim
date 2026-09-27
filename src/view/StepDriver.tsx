import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

const FRAME = 1 / 60;

/**
 * Test hook for browser scripts. Background tabs get no animation frames, so
 * the page exposes window.__step(seconds) to run the frames by hand.
 */
export default function StepDriver() {
  const advance = useThree((state) => state.advance);
  const clock = useThree((state) => state.clock);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const step = (seconds: number) => {
      const frames = Math.max(1, Math.round(seconds / FRAME));
      let now = clock.elapsedTime;
      for (let i = 0; i < frames; i++) {
        now += FRAME;
        advance(now);
      }
      window.dispatchEvent(new Event('hud-refresh'));
      return frames;
    };
    Object.assign(window, { __step: step, __scene: scene });
    return () => {
      Reflect.deleteProperty(window, '__step');
      Reflect.deleteProperty(window, '__scene');
    };
  }, [advance, clock, scene]);

  return null;
}
