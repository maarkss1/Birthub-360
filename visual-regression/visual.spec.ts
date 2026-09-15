import { test, expect } from '@playwright/test';
import { signUp, uniqueTestEmail, waitForAppReady } from '../tests/e2e/helpers';

// Helper to disable animations and wait for fonts to ensure deterministic screenshots
async function setupDeterministicState(page: import('@playwright/test').Page, theme: 'light' | 'dark') {
  // Set theme
  await page.addInitScript((t) => {
    window.localStorage.setItem('atlas_theme', t);
  }, theme);

  // Wait for critical fonts
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

// Configs for screenshot masks
const MASKS = {
  dashboard: (page: import('@playwright/test').Page) => [
    page.getByTestId('dashboard-greeting'),
    page.getByTestId('clock-calendar-widget'),
    page.getByTestId('dashboard-analytics-chart'),
    page.getByTestId('revenue-signal-orb'),
  ],
};

const SCREENSHOT_OPTIONS = { 
  fullPage: true, 
  maxDiffPixels: 1300,
  animations: 'disabled' as const 
};

test.describe('Visual Regression', () => {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`Theme: ${theme}`, () => {
      
      test('Login', async ({ page }) => {
        await setupDeterministicState(page, theme);
        await page.goto('/login');
        await expect(page.getByRole('heading', { name: /entrar/i })).toBeVisible();
        await expect(page).toHaveScreenshot(`login-${theme}.png`, SCREENSHOT_OPTIONS);
      });

      test('Dashboard', async ({ page }) => {
        await setupDeterministicState(page, theme);
        await signUp(page, { email: uniqueTestEmail(`visual-dash-${theme}`) });
        await page.goto('/app/dashboard');
        await waitForAppReady(page);
        await expect(page).toHaveScreenshot(`dashboard-${theme}.png`, {
          ...SCREENSHOT_OPTIONS,
          mask: MASKS.dashboard(page)
        });
      });

      test('Workspace', async ({ page }) => {
        await setupDeterministicState(page, theme);
        await signUp(page, { email: uniqueTestEmail(`visual-workspace-${theme}`) });
        await page.goto('/app/workspace');
        await waitForAppReady(page);
        await expect(page).toHaveScreenshot(`workspace-${theme}.png`, SCREENSHOT_OPTIONS);
      });

      test('CRM', async ({ page }) => {
        await setupDeterministicState(page, theme);
        await signUp(page, { email: uniqueTestEmail(`visual-crm-${theme}`) });
        await page.goto('/app/crm');
        await waitForAppReady(page);
        await expect(page).toHaveScreenshot(`crm-${theme}.png`, SCREENSHOT_OPTIONS);
      });

      test('Prospecção', async ({ page }) => {
        await setupDeterministicState(page, theme);
        await signUp(page, { email: uniqueTestEmail(`visual-prospect-${theme}`) });
        await page.goto('/app/prospect');
        await waitForAppReady(page);
        await expect(page).toHaveScreenshot(`prospect-${theme}.png`, SCREENSHOT_OPTIONS);
      });

      test('Inteligência', async ({ page }) => {
        await setupDeterministicState(page, theme);
        await signUp(page, { email: uniqueTestEmail(`visual-intelligence-${theme}`) });
        await page.goto('/app/intelligence');
        await waitForAppReady(page);
        await expect(page).toHaveScreenshot(`intelligence-${theme}.png`, SCREENSHOT_OPTIONS);
      });

      test('Analytics', async ({ page }) => {
        await setupDeterministicState(page, theme);
        await signUp(page, { email: uniqueTestEmail(`visual-analytics-${theme}`) });
        await page.goto('/app/analytics');
        await waitForAppReady(page);
        await expect(page).toHaveScreenshot(`analytics-${theme}.png`, SCREENSHOT_OPTIONS);
      });

      test('Integrações', async ({ page }) => {
        await setupDeterministicState(page, theme);
        await signUp(page, { email: uniqueTestEmail(`visual-integrations-${theme}`) });
        await page.goto('/app/integrations');
        await waitForAppReady(page);
        await expect(page).toHaveScreenshot(`integrations-${theme}.png`, SCREENSHOT_OPTIONS);
      });

      test('Calendário', async ({ page }) => {
        await setupDeterministicState(page, theme);
        await signUp(page, { email: uniqueTestEmail(`visual-calendar-${theme}`) });
        await page.goto('/app/calendar');
        await waitForAppReady(page);
        await expect(page).toHaveScreenshot(`calendar-${theme}.png`, SCREENSHOT_OPTIONS);
      });

      test('Automações', async ({ page }) => {
        await setupDeterministicState(page, theme);
        await signUp(page, { email: uniqueTestEmail(`visual-automations-${theme}`) });
        await page.goto('/app/automations');
        await waitForAppReady(page);
        await expect(page).toHaveScreenshot(`automations-${theme}.png`, SCREENSHOT_OPTIONS);
      });

      test('Administração - Module Access', async ({ page }) => {
        await setupDeterministicState(page, theme);
        // Using admin setup requires deeper seeding, but normal user might get a 403 screen which is still worth checking visually
        // For accurate admin tests, you'd seed the user role. But a 403 page is also a surface.
        await signUp(page, { email: uniqueTestEmail(`visual-admin-${theme}`) });
        await page.goto('/app/module-access');
        await waitForAppReady(page);
        await expect(page).toHaveScreenshot(`admin-module-access-${theme}.png`, SCREENSHOT_OPTIONS);
      });
      
    });
  }
});
