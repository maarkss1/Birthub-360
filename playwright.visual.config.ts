import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ?? '3000';
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?.trim() || undefined;

export default defineConfig({
  testDir: './visual-regression',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [['html', { outputFolder: 'visual-regression-report', open: 'never' }]],
  snapshotPathTemplate: '{testDir}/baselines/{testFilePath}/{arg}-{projectName}{ext}',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        viewport: { width: 1440, height: 900 },
        ...(chromiumExecutablePath ? { launchOptions: { executablePath: chromiumExecutablePath } } : {}),
      },
    },
    {
      name: 'laptop',
      use: {
        viewport: { width: 1366, height: 768 },
        ...(chromiumExecutablePath ? { launchOptions: { executablePath: chromiumExecutablePath } } : {}),
      },
    },
    {
      name: 'tablet',
      use: {
        viewport: { width: 768, height: 1024 },
        ...(chromiumExecutablePath ? { launchOptions: { executablePath: chromiumExecutablePath } } : {}),
      },
    },
    {
      name: 'mobile',
      use: {
        viewport: { width: 390, height: 844 },
        ...(chromiumExecutablePath ? { launchOptions: { executablePath: chromiumExecutablePath } } : {}),
      },
    }
  ],
  webServer: {
    command: 'npm run start:e2e',
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      NODE_ENV: process.env.NODE_ENV ?? 'test',
      PORT,
      API_RATE_LIMIT_MAX: process.env.API_RATE_LIMIT_MAX ?? '5000',
      AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX ?? '500',
    },
  },
});
