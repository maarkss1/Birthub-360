import * as SentryReact from '@sentry/react';

// Inicializa o Sentry apenas no contexto do browser (React).
// No servidor (server.ts), o @sentry/node é importado diretamente lá.
// Usa import.meta.env (Vite) em vez de process.env (Node), que não existe no browser.
export function initSentry(isServer: boolean) {
  if (isServer) return; // no-op no servidor — server.ts usa @sentry/node diretamente

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  SentryReact.init({
    dsn,
    environment: import.meta.env.MODE ?? 'development',
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  });
}
