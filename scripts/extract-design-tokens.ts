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
    // Navigate to the main page
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
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

    // Extract component styles separately to avoid type issues
    const buttonStyles = await page.evaluate(() => {
      const elements = document.querySelectorAll('button');
      if (elements.length === 0) return null;
      const element = elements[0];
      const computed = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        component: 'Button',
        count: elements.length,
        styles: {
          display: computed.display,
          position: computed.position,
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
          fontFamily: computed.fontFamily,
        },
        dimensions: {
          width: rect.width,
          height: rect.height,
        },
      };
    });

    const inputStyles = await page.evaluate(() => {
      const elements = document.querySelectorAll('input');
      if (elements.length === 0) return null;
      const element = elements[0];
      const computed = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        component: 'Input',
        count: elements.length,
        styles: {
          display: computed.display,
          padding: computed.padding,
          fontSize: computed.fontSize,
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          borderWidth: computed.borderWidth,
          borderColor: computed.borderColor,
        },
        dimensions: {
          width: rect.width,
          height: rect.height,
        },
      };
    });

    const cardStyles = await page.evaluate(() => {
      const elements = document.querySelectorAll('.card, [class*="Card"], [class*="card"]');
      if (elements.length === 0) return null;
      const element = elements[0];
      const computed = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        component: 'Card',
        count: elements.length,
        styles: {
          display: computed.display,
          padding: computed.padding,
          backgroundColor: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          borderWidth: computed.borderWidth,
          borderColor: computed.borderColor,
          boxShadow: computed.boxShadow,
        },
        dimensions: {
          width: rect.width,
          height: rect.height,
        },
      };
    });

    const componentStyles = {
      buttons: buttonStyles,
      inputs: inputStyles,
      cards: cardStyles,
    };

    // Extract layout information
    const layoutInfo = await page.evaluate(() => {
      const body = document.body;
      const bodyComputed = window.getComputedStyle(body);
      const bodyRect = body.getBoundingClientRect();

      const mainElements = document.querySelectorAll('main, [role="main"], .main-content');
      const navElements = document.querySelectorAll('nav, [role="navigation"]');
      const headerElements = document.querySelectorAll('header, [role="banner"]');
      const sidebarElements = document.querySelectorAll('aside, [role="complementary"], .sidebar');

      const extractLayoutInfo = (elements, name) => {
        if (elements.length === 0) return null;
        const element = elements[0];
        const computed = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return {
          name,
          tag: element.tagName,
          classes: Array.from(element.classList),
          styles: {
            display: computed.display,
            position: computed.position,
            width: computed.width,
            height: computed.height,
            padding: computed.padding,
            margin: computed.margin,
            backgroundColor: computed.backgroundColor,
            zIndex: computed.zIndex,
          },
          dimensions: {
            width: rect.width,
            height: rect.height,
            x: rect.x,
            y: rect.y,
          },
        };
      };

      return {
        body: {
          styles: {
            backgroundColor: bodyComputed.backgroundColor,
            color: bodyComputed.color,
            fontFamily: bodyComputed.fontFamily,
            fontSize: bodyComputed.fontSize,
          },
          dimensions: {
            width: bodyRect.width,
            height: bodyRect.height,
          },
        },
        main: extractLayoutInfo(mainElements, 'Main'),
        nav: extractLayoutInfo(navElements, 'Navigation'),
        header: extractLayoutInfo(headerElements, 'Header'),
        sidebar: extractLayoutInfo(sidebarElements, 'Sidebar'),
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
        const borderColor = computed.borderColor;

        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          colorMap[bgColor] = (colorMap[bgColor] || 0) + 1;
        }
        if (textColor && textColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'transparent') {
          colorMap[textColor] = (colorMap[textColor] || 0) + 1;
        }
        if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent' && borderColor !== 'currentcolor') {
          colorMap[borderColor] = (colorMap[borderColor] || 0) + 1;
        }
      });

      // Sort by usage frequency
      return Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .map(([color, count]) => ({ color, count }))
        .slice(0, 50); // Top 50 colors
    });

    const designTokens = {
      timestamp: new Date().toISOString(),
      cssVariables,
      fonts: fontInfo,
      componentStyles,
      layoutInfo,
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
