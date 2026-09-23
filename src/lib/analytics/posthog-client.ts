import posthog from 'posthog-js';

export function initPostHogClient() {
  if (typeof window !== 'undefined' && process.env.VITE_POSTHOG_KEY) {
    posthog.init(process.env.VITE_POSTHOG_KEY, {
      api_host: process.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.opt_out_capturing();
      }
    });
  }
}
