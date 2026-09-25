/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.js';
import { initSentry } from './lib/monitoring/sentry.js';
import { initPostHogClient } from './lib/analytics/posthog-client.js';

initSentry(false);
initPostHogClient();
import './styles/globals.css';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Elemento #root não encontrado em index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
