/**
 * Passive analytics for a canvas app.
 * yagni: skateboard scroll/section observers; this surface does not scroll
 */
import { useEffect, useRef } from 'react';
import { trackEvent, trackPageView } from './analytics.ts';

const isLocal = () => ['localhost', '127.0.0.1'].includes(window.location.hostname);

export default function useAdvancedAnalytics() {
  const timeStartRef = useRef(Date.now());
  const timeThresholdsRef = useRef<Set<number>>(new Set());
  const errorCountRef = useRef(0);

  useEffect(() => {
    if (isLocal()) return;

    trackPageView();

    const onError = () => {
      errorCountRef.current += 1;
      if (errorCountRef.current <= 5) trackEvent('js-error');
    };
    window.addEventListener('error', onError);

    const thresholds = [15, 30, 60, 120];
    const timer = window.setInterval(() => {
      const elapsed = Math.round((Date.now() - timeStartRef.current) / 1000);
      for (const t of thresholds) {
        if (elapsed >= t && !timeThresholdsRef.current.has(t)) {
          timeThresholdsRef.current.add(t);
          trackEvent('time-on-page', { seconds: t });
        }
      }
    }, 5000);

    return () => {
      window.removeEventListener('error', onError);
      window.clearInterval(timer);
    };
  }, []);
}
