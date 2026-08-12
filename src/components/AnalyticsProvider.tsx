import { useEffect } from 'react';
import type { ReactNode } from 'react';
import useAdvancedAnalytics from '../utils/useAdvancedAnalytics.ts';

interface AnalyticsProviderProps {
  children?: ReactNode;
}

/** Injects the dottie script when env ids are set, then starts passive tracking. */
export default function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useEffect(() => {
    const src = import.meta.env.VITE_ANALYTICS_SRC;
    const id = import.meta.env.VITE_ANALYTICS_ID;
    if (!src || !id) return;
    if (document.querySelector(`script[data-website-id="${id}"]`)) return;

    const script = document.createElement('script');
    script.defer = true;
    script.src = src;
    script.dataset.websiteId = id;
    document.head.appendChild(script);
  }, []);

  useAdvancedAnalytics();
  return children;
}
