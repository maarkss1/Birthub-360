import * as SentryNode from '@sentry/node';
import * as SentryReact from '@sentry/react';

export function initSentry(isServer: boolean) {
  const dsn = process.env.VITE_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) return;

  const Sentry = isServer ? SentryNode : SentryReact;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });
}
