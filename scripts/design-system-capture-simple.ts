import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface ScreenshotConfig {
  route: string;
  name: string;
  requiresAuth: boolean;
  description?: string;
}

const ROUTES: ScreenshotConfig[] = [
  // Public routes
  { route: '/', name: 'welcome-screen', requiresAuth: false, description: 'Welcome/Landing screen' },
  { route: '/login', name: 'login-screen', requiresAuth: false, description: 'Login screen' },
  { route: '/privacy', name: 'privacy-policy', requiresAuth: false, description: 'Privacy policy page' },
  { route: '/terms', name: 'terms-of-use', requiresAuth: false, description: 'Terms of use page' },
  
  // Hub routes (requires auth)
  { route: '/social-selling', name: 'social-selling-hub', requiresAuth: true, description: 'Social Selling Hub' },
  
  // App routes (requires auth, within /app/*)
  { route: '/app', name: 'dashboard', requiresAuth: true, description: 'Main Dashboard' },
  { route: '/app/dashboard', name: 'dashboard-alias', requiresAuth: true, description: 'Dashboard (alias)' },
  { route: '/app/workspace', name: 'workspace-home', requiresAuth: true, description: 'Workspace Home' },
  { route: '/app/prospect', name: 'prospecting-hub', requiresAuth: true, description: 'Prospecting Hub' },
  { route: '/app/crm', name: 'crm-board', requiresAuth: true, description: 'CRM Board' },
  { route: '/app/crm360', name: 'crm360-overview', requiresAuth: true, description: 'CRM 360 Overview' },
  { route: '/app/mesa-tratamento', name: 'mesa-tratamento', requiresAuth: true, description: 'Mesa de Tratamento' },
  { route: '/app/intelligence', name: 'intelligence-hub', requiresAuth: true, description: 'Intelligence Hub' },
  { route: '/app/companies', name: 'companies-list', requiresAuth: true, description: 'Companies List' },
  { route: '/app/contacts', name: 'contacts-list', requiresAuth: true, description: 'Contacts List' },
  { route: '/app/activities', name: 'activities-list', requiresAuth: true, description: 'Activities List' },
  { route: '/app/voice-hub', name: 'voice-studio', requiresAuth: true, description: 'Voice Studio' },
  { route: '/app/cadence', name: 'cadence-hub', requiresAuth: true, description: 'Cadence Hub' },
  { route: '/app/chatbook', name: 'chatbook-hub', requiresAuth: true, description: 'Chatbook Hub' },
  { route: '/app/roleplay', name: 'roleplay-hub', requiresAuth: true, description: 'Roleplay Hub' },
  { route: '/app/qualification_matrix', name: 'qualification-matrix', requiresAuth: true, description: 'Qualification Matrix' },
  { route: '/app/objections_matrix', name: 'objections-matrix', requiresAuth: true, description: 'Objections Matrix' },
  { route: '/app/topic_training', name: 'topic-training-academy', requiresAuth: true, description: 'Topic Training Academy' },
  { route: '/app/bitrix', name: 'bitrix-guide-hub', requiresAuth: true, description: 'Bitrix Guide Hub' },
  { route: '/app/reports', name: 'reports-hub', requiresAuth: true, description: 'Reports Hub' },
  { route: '/app/integrations', name: 'integrations', requiresAuth: true, description: 'Integrations' },
  { route: '/app/knowledge', name: 'knowledge-base', requiresAuth: true, description: 'Knowledge Base' },
  { route: '/app/analytics', name: 'analytics', requiresAuth: true, description: 'Analytics' },
  { route: '/app/winloss', name: 'win-loss-analysis', requiresAuth: true, description: 'Win/Loss Analysis' },
  { route: '/app/propostas', name: 'propostas-list', requiresAuth: true, description: 'Propostas List' },
  { route: '/app/commercial_intelligence', name: 'commercial-intelligence', requiresAuth: true, description: 'Commercial Intelligence' },
  { route: '/app/daily-plan', name: 'daily-plan-hub', requiresAuth: true, description: 'Daily Plan Hub' },
  { route: '/app/sdr-diagnostic', name: 'sdr-diagnostic', requiresAuth: true, description: 'SDR Diagnostic' },
  { route: '/app/calendar', name: 'calendar', requiresAuth: true, description: 'Calendar' },
  { route: '/app/notifications', name: 'notifications', requiresAuth: true, description: 'Notifications' },
  { route: '/app/automations', name: 'automations', requiresAuth: true, description: 'Automations' },
  { route: '/app/usage', name: 'usage', requiresAuth: true, description: 'Usage/Billing' },
  { route: '/app/editor', name: 'document-editor', requiresAuth: true, description: 'Document Editor' },
  { route: '/app/team', name: 'team', requiresAuth: true, description: 'Team Management' },
  { route: '/app/module-access', name: 'module-access', requiresAuth: true, description: 'Module Access Admin' },
  { route: '/app/settings', name: 'settings', requiresAuth: true, description: 'Settings' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'desktop-full', width: 1920, height: 1080 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'mobile-large', width: 430, height: 932 },
  { name: 'mobile-small', width: 375, height: 812 },
];

const BASE_URL = 'http://localhost:3024';
const OUTPUT_DIR = path.join(process.cwd(), 'design-system-capture');

async function ensureDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureRoute(
  browser: Browser,
  routeConfig: ScreenshotConfig,
  viewport: any,
  outputDir: string
) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  
  const page = await context.newPage();
  
  try {
    console.log(`Navigating to ${routeConfig.route} (${viewport.name})...`);
    
    // Navigate to the route
    await page.goto(`${BASE_URL}${routeConfig.route}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for page to be fully loaded
    await page.waitForTimeout(2000);

    // Check if we need to authenticate
    if (routeConfig.requiresAuth) {
      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/welcome')) {
        console.log(`Route ${routeConfig.route} requires authentication - skipping for now`);
        await context.close();
        return null;
      }
    }

    // Create output directory for this route
    const routeDir = path.join(outputDir, routeConfig.name);
    await ensureDirectory(routeDir);

    // Capture screenshot
    const screenshotPath = path.join(routeDir, `${viewport.name}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
    });

    // Capture basic metrics
    const metrics = await page.evaluate(() => ({
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      title: document.title,
      url: window.location.href,
    }));
    
    // Save metrics
    const metricsPath = path.join(routeDir, `${viewport.name}-metrics.json`);
    fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

    console.log(`✓ Captured ${routeConfig.route} (${viewport.name})`);

    return {
      route: routeConfig.route,
      name: routeConfig.name,
      viewport: viewport.name,
      screenshot: screenshotPath,
      metrics: metricsPath,
      success: true,
    };
  } catch (error) {
    console.error(`✗ Failed to capture ${routeConfig.route} (${viewport.name}):`, error);
    return {
      route: routeConfig.route,
      name: routeConfig.name,
      viewport: viewport.name,
      success: false,
      error: String(error),
    };
  } finally {
    await context.close();
  }
}

async function main() {
  console.log('Starting Design System Capture...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  
  await ensureDirectory(OUTPUT_DIR);

  const browser = await chromium.launch({
    headless: true,
  });

  const results = [];

  try {
    // Capture all routes and viewports
    for (const routeConfig of ROUTES) {
      for (const viewport of VIEWPORTS) {
        const result = await captureRoute(browser, routeConfig, viewport, OUTPUT_DIR);
        if (result) {
          results.push(result);
        }
      }
    }

    // Generate summary report
    const summaryPath = path.join(OUTPUT_DIR, 'capture-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      totalRoutes: ROUTES.length,
      totalViewports: VIEWPORTS.length,
      results: results,
    }, null, 2));

    console.log('\n✓ Capture complete!');
    console.log(`Results saved to: ${OUTPUT_DIR}`);
    console.log(`Summary: ${summaryPath}`);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
