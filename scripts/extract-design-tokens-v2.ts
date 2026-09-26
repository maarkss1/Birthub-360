import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3024';
const OUTPUT_DIR = path.join(process.cwd(), 'design-system-capture');

async function extractDesignTokens() {
  console.log('Extracting design tokens from application...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  
  try {
    // Navigate to the dashboard page (more complex than welcome screen)
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Extract CSS variables
    const cssVariables = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      const variables = {};
      for (let i = 0; i < styles.length; i++) {
        const name = styles[i];
        if (name && name.startsWith('--')) {
          const value = styles.getPropertyValue(name).trim();
          if (value) {
            variables[name] = value;
          }
        }
      }
      return variables;
    });

    // Extract font information
    const fontInfo = await page.evaluate(() => {
      const fonts = new Set();
      const elements = document.querySelectorAll('*');
      elements.forEach(el => {
        const computed = getComputedStyle(el);
        if (computed.fontFamily) {
          fonts.add(computed.fontFamily);
        }
      });
      return Array.from(fonts);
    });

    // Extract body styles
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      const rect = body.getBoundingClientRect();
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        width: rect.width,
        height: rect.height,
      };
    });

    // Extract button styles
    const buttonStyles = await page.evaluate(() => {
      const elements = document.querySelectorAll('button');
      if (elements.length === 0) return null;
      const element = elements[0];
      const computed = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        count: elements.length,
        display: computed.display,
        padding: computed.padding,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius,
        borderWidth: computed.borderWidth,
        fontFamily: computed.fontFamily,
        width: rect.width,
        height: rect.height,
      };
    });

    // Extract input styles
    const inputStyles = await page.evaluate(() => {
      const elements = document.querySelectorAll('input');
      if (elements.length === 0) return null;
      const element = elements[0];
      const computed = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        count: elements.length,
        display: computed.display,
        padding: computed.padding,
        fontSize: computed.fontSize,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius,
        borderWidth: computed.borderWidth,
        borderColor: computed.borderColor,
        width: rect.width,
        height: rect.height,
      };
    });

    // Extract card styles
    const cardStyles = await page.evaluate(() => {
      const elements = document.querySelectorAll('.card, [class*="Card"], [class*="card"]');
      if (elements.length === 0) return null;
      const element = elements[0];
      const computed = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        count: elements.length,
        display: computed.display,
        padding: computed.padding,
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius,
        borderWidth: computed.borderWidth,
        borderColor: computed.borderColor,
        boxShadow: computed.boxShadow,
        width: rect.width,
        height: rect.height,
      };
    });

    // Extract navigation styles
    const navStyles = await page.evaluate(() => {
      const elements = document.querySelectorAll('nav, [role="navigation"]');
      if (elements.length === 0) return null;
      const element = elements[0];
      const computed = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        count: elements.length,
        display: computed.display,
        position: computed.position,
        width: computed.width,
        height: computed.height,
        backgroundColor: computed.backgroundColor,
        widthPx: rect.width,
        heightPx: rect.height,
        x: rect.x,
        y: rect.y,
      };
    });

    // Extract color palette from actual usage
    const colorPalette = await page.evaluate(() => {
      const colorMap = {};
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        const computed = window.getComputedStyle(el);
        const bgColor = computed.backgroundColor;
        const textColor = computed.color;
        
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          colorMap[bgColor] = (colorMap[bgColor] || 0) + 1;
        }
        if (textColor && textColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'transparent') {
          colorMap[textColor] = (colorMap[textColor] || 0) + 1;
        }
      });

      return Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .map(([color, count]) => ({ color, count }))
        .slice(0, 50);
    });

    const designTokens = {
      timestamp: new Date().toISOString(),
      cssVariables,
      fonts: fontInfo,
      body: bodyStyles,
      buttons: buttonStyles,
      inputs: inputStyles,
      cards: cardStyles,
      navigation: navStyles,
      colorPalette,
    };

    // Save design tokens
    const tokensPath = path.join(OUTPUT_DIR, 'design-tokens-detailed.json');
    fs.writeFileSync(tokensPath, JSON.stringify(designTokens, null, 2));

    console.log('✓ Design tokens extracted successfully');
    console.log(`Saved to: ${tokensPath}`);
    
    return designTokens;

  } finally {
    await context.close();
    await browser.close();
  }
}

extractDesignTokens().catch(console.error);
