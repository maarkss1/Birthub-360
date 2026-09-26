import posthog from 'posthog-js';

export function initPostHogClient() {
  if (typeof window !== 'undefined' && import.meta.env.VITE_POSTHOG_KEY) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY as string, {
      api_host: (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://app.posthog.com',
      loaded: (ph) => {
        if (import.meta.env.DEV) ph.opt_out_capturing();
      },
    });
  }
}
