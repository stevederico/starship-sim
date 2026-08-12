/**
 * dottie-analytics helpers with a localhost guard.
 */

interface AnalyticsClient {
  track: (eventName?: string, data?: Record<string, unknown>) => void;
  identify: (idOrData: string | Record<string, unknown>, data?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    dottie?: AnalyticsClient;
  }
}

const isLocal = () => ['localhost', '127.0.0.1'].includes(window.location.hostname);

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'number') sanitized[key] = Math.round(value * 10000) / 10000;
    else if (typeof value === 'string') sanitized[key] = value.slice(0, 500);
    else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      sanitized[key] = JSON.stringify(value).slice(0, 500);
    } else sanitized[key] = value;
  }
  return sanitized;
}

/** Track a kebab-case event. No-ops on localhost. */
export function trackEvent(eventName: string, data: Record<string, unknown> = {}) {
  if (isLocal() || typeof window === 'undefined') return;
  try {
    window.dottie?.track?.(eventName, sanitize(data));
  } catch (error) {
    console.warn('Dottie trackEvent failed:', error);
  }
}

/** Identify the current user. No-ops on localhost. */
export function identifyUser(userId: string, data: Record<string, unknown> = {}) {
  if (isLocal() || typeof window === 'undefined') return;
  try {
    window.dottie?.identify?.(userId, data);
  } catch (error) {
    console.warn('Dottie identifyUser failed:', error);
  }
}

/** Track a pageview. No-ops on localhost. */
export function trackPageView(url?: string) {
  if (isLocal() || typeof window === 'undefined') return;
  try {
    window.dottie?.track?.(url ?? window.location.pathname);
  } catch (error) {
    console.warn('Dottie trackPageView failed:', error);
  }
}
