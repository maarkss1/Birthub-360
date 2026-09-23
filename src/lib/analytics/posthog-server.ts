import { PostHog } from 'posthog-node';

let client: PostHog | null = null;

export function getPostHogServer() {
  if (!client && process.env.POSTHOG_KEY) {
    client = new PostHog(process.env.POSTHOG_KEY, {
      host: process.env.POSTHOG_HOST || 'https://app.posthog.com'
    });
  }
  return client;
}
