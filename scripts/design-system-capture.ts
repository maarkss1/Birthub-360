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

async function capturePageMetrics(page: Page, route: string, viewport: any) {
  const metrics = await page.evaluate(() => {
    const getComputedStyleRecursive = (element, depth = 0) => {
      if (depth > 10) return null;

      const computed = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      const children = Array.from(element.children)
        .slice(0, 5) // Limit to first 5 children to avoid huge output
        .map(child => getComputedStyleRecursive(child, depth + 1))
        .filter(Boolean);

      return {
        tag: element.tagName,
        id: element.id || null,
        classes: Array.from(element.classList),
        rect: {
          width: rect.width,
          height: rect.height,
          x: rect.x,
          y: rect.y,
          top: rect.top,
          left: rect.left,
        },
        styles: {
          display: computed.display,
          position: computed.position,
          width: computed.width,
          height: computed.height,
          padding: computed.padding,
          margin: computed.margin,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          borderWidth: computed.borderWidth,
          borderColor: computed.borderColor,
          boxShadow: computed.boxShadow,
          zIndex: computed.zIndex,
        },
        children: children.length > 0 ? children : undefined,
      };
    };

    // Get key elements
    const body = document.body;
    const mainElements = document.querySelectorAll('main, [role="main"], .main-content');
    const navElements = document.querySelectorAll('nav, [role="navigation"]');
    const headerElements = document.querySelectorAll('header, [role="banner"]');
    const sidebarElements = document.querySelectorAll('aside, [role="complementary"], .sidebar');
    const cards = document.querySelectorAll('.card, [class*="Card"], [class*="card"]');
    const buttons = document.querySelectorAll('button, [role="button"]');
    const inputs = document.querySelectorAll('input, textarea, select');

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      body: getComputedStyleRecursive(body),
      main: mainElements.length > 0 ? getComputedStyleRecursive(mainElements[0]) : null,
      nav: navElements.length > 0 ? getComputedStyleRecursive(navElements[0]) : null,
      header: headerElements.length > 0 ? getComputedStyleRecursive(headerElements[0]) : null,
      sidebar: sidebarElements.length > 0 ? getComputedStyleRecursive(sidebarElements[0]) : null,
      cardsCount: cards.length,
      buttonsCount: buttons.length,
      inputsCount: inputs.length,
      sampleCard: cards.length > 0 ? getComputedStyleRecursive(cards[0]) : null,
      sampleButton: buttons.length > 0 ? getComputedStyleRecursive(buttons[0]) : null,
      sampleInput: inputs.length > 0 ? getComputedStyleRecursive(inputs[0]) : null,
    };
  });

  return metrics;
}

async function captureDesignTokens(page: Page) {
  // Get CSS variables directly
  const cssVariables = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const variables = {};
    for (let i = 0; i < styles.length; i++) {
      const name = styles[i];
      if (name && name.startsWith('--')) {
        variables[name] = styles.getPropertyValue(name);
      }
    }
    return variables;
  });

  // Get fonts separately
  const fonts = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const fontSet = new Set();
    elements.forEach(el => {
      const computed = getComputedStyle(el);
      if (computed.fontFamily) {
        fontSet.add(computed.fontFamily);
      }
    });
    return Array.from(fontSet);
  });

  return {
    cssVariables,
    fonts,
  };
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

    // Capture metrics
    const metrics = await capturePageMetrics(page, routeConfig.route, viewport);

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
    // First, capture design tokens from the main page
    console.log('\nCapturing design tokens...');
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const tokens = await captureDesignTokens(page);
      const tokensPath = path.join(OUTPUT_DIR, 'design-tokens.json');
      fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
      console.log('✓ Design tokens captured');
    } finally {
      await context.close();
    }

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
