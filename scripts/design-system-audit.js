#!/usr/bin/env node

/**
 * Birth Hub 360° — Visual Design System Audit
 * 
 * A comprehensive automated tool for discovering, documenting, and rendering
 * the existing visual components of the Birth Hub 360° CRM.
 * 
 * This tool performs reverse engineering of the codebase to create a complete
 * visual inventory without modifying the original project.
 * 
 * Usage:
 *   node scripts/design-system-audit.js [options]
 * 
 * Options:
 *   --viewport=1440x900    Set viewport size for screenshots
 *   --output=prints-design-system  Set output directory
 *   --category=buttons     Audit specific category only
 *   --component=Button    Audit specific component only
 *   --debug               Keep temporary files for debugging
 *   --no-cleanup          Don't remove temporary files
 *   --help                 Show this help message
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { spawn } from 'child_process';
import * as http from 'http';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  viewport: '1440x900',
  output: 'prints-design-system',
  category: null,
  component: null,
  debug: false,
  noCleanup: false,
  help: false
};

for (const arg of args) {
  if (arg === '--debug') options.debug = true;
  else if (arg === '--no-cleanup') options.noCleanup = true;
  else if (arg === '--help') options.help = true;
  else if (arg.startsWith('--viewport=')) options.viewport = arg.split('=')[1];
  else if (arg.startsWith('--output=')) options.output = arg.split('=')[1];
  else if (arg.startsWith('--category=')) options.category = arg.split('=')[1];
  else if (arg.startsWith('--component=')) options.component = arg.split('=')[1];
}

if (options.help) {
  console.log(`
Birth Hub 360° — Visual Design System Audit

Usage:
  node scripts/design-system-audit.js [options]

Options:
  --viewport=1440x900    Set viewport size for screenshots
  --output=prints-design-system  Set output directory
  --category=buttons     Audit specific category only
  --component=Button    Audit specific component only
  --debug               Keep temporary files for debugging
  --no-cleanup          Don't remove temporary files
  --help                 Show this help message
`);
  process.exit(0);
}

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = {
    info: '✓',
    warn: '⚠',
    error: '✗',
    debug: '◦'
  }[type] || '•';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (error) {
    return null;
  }
}

// ============================================================================
// PROJECT DISCOVERY
// ============================================================================

async function discoverProject() {
  log('[1/7] Scanning project structure...');

  const project = {
    root: PROJECT_ROOT,
    packageJson: null,
    tsconfig: null,
    viteConfig: null,
    srcDir: null,
    componentsDir: null,
    stylesDir: null,
    globalsCss: null,
    extensions: [],
    aliases: {},
    dependencies: {},
    devDependencies: {}
  };

  // Read package.json
  const packageJsonPath = join(PROJECT_ROOT, 'package.json');
  if (existsSync(packageJsonPath)) {
    project.packageJson = readJson(packageJsonPath);
    project.dependencies = project.packageJson?.dependencies || {};
    project.devDependencies = project.packageJson?.devDependencies || {};
    log('✓ package.json found');
  }

  // Read tsconfig.json
  const tsconfigPath = join(PROJECT_ROOT, 'tsconfig.json');
  if (existsSync(tsconfigPath)) {
    project.tsconfig = readJson(tsconfigPath);
    project.aliases = project.tsconfig?.compilerOptions?.paths || {};
    log('✓ tsconfig.json found');
  }

  // Read vite.config.ts
  const viteConfigPath = join(PROJECT_ROOT, 'vite.config.ts');
  if (existsSync(viteConfigPath)) {
    project.viteConfig = readFileSync(viteConfigPath, 'utf-8');
    log('✓ vite.config.ts found');
  }

  // Discover source directories
  const srcDir = join(PROJECT_ROOT, 'src');
  if (existsSync(srcDir)) {
    project.srcDir = srcDir;
    log('✓ src/ directory found');
  }

  const componentsDir = join(srcDir, 'components');
  if (existsSync(componentsDir)) {
    project.componentsDir = componentsDir;
    log('✓ src/components/ directory found');
  }

  const stylesDir = join(srcDir, 'styles');
  if (existsSync(stylesDir)) {
    project.stylesDir = stylesDir;
    log('✓ src/styles/ directory found');
  }

  const globalsCss = join(stylesDir, 'globals.css');
  if (existsSync(globalsCss)) {
    project.globalsCss = globalsCss;
    log('✓ src/styles/globals.css found');
  }

  // Detect file extensions
  const extensions = ['.tsx', '.ts', '.jsx', '.js'];
  project.extensions = extensions;

  return project;
}

// ============================================================================
// DESIGN TOKEN EXTRACTION
// ============================================================================

function extractDesignTokens(globalsCssPath) {
  log('[2/7] Extracting design tokens...');

  const css = readFileSync(globalsCssPath, 'utf-8');
  const tokens = {
    colors: [],
    typography: [],
    spacing: [],
    radius: [],
    shadows: [],
    other: []
  };

  // Extract CSS custom properties
  const tokenRegex = /--([\w-]+):\s*([^;]+);/g;
  let match;

  while ((match = tokenRegex.exec(css)) !== null) {
    const [, name, value] = match;
    const lineNumber = css.substring(0, match.index).split('\n').length;

    const token = {
      name: `--${name}`,
      value: value.trim(),
      file: globalsCssPath,
      line: lineNumber
    };

    // Categorize token
    if (name.includes('color') || name.includes('bg') || name.includes('text') ||
      name.includes('brand') || name.includes('gold') || name.includes('iris') ||
      name.includes('nav') || name.includes('accent') || name.includes('critical') ||
      name.includes('ok') || name.includes('warn') || name.includes('info') ||
      name.includes('surface') || name.includes('ink') || name.includes('overlay')) {
      tokens.colors.push({ ...token, category: 'color' });
    } else if (name.includes('font') || name.includes('text')) {
      tokens.typography.push({ ...token, category: 'typography' });
    } else if (name.includes('spacing') || name.includes('space') || name.includes('gap') || name.includes('padding') || name.includes('margin')) {
      tokens.spacing.push({ ...token, category: 'spacing' });
    } else if (name.includes('radius') || name.includes('rounded')) {
      tokens.radius.push({ ...token, category: 'radius' });
    } else if (name.includes('shadow') || name.includes('glow')) {
      tokens.shadows.push({ ...token, category: 'shadow' });
    } else {
      tokens.other.push({ ...token, category: 'other' });
    }
  }

  const totalTokens = tokens.colors.length + tokens.typography.length +
    tokens.spacing.length + tokens.radius.length +
    tokens.shadows.length + tokens.other.length;

  log(`✓ ${totalTokens} design tokens found`);
  return tokens;
}

// ============================================================================
// FONT INVENTORY
// ============================================================================

function extractFonts(globalsCssPath) {
  log('[3/7] Detecting fonts...');

  const css = readFileSync(globalsCssPath, 'utf-8');
  const fonts = [];

  // Extract @font-face declarations
  const fontFaceRegex = /@font-face\s*{([^}]+)}/g;
  let match;

  while ((match = fontFaceRegex.exec(css)) !== null) {
    const content = match[1];
    const familyMatch = content.match(/font-family:\s*["']([^"']+)["']/);
    const weightMatch = content.match(/font-weight:\s*([^;]+)/);
    const styleMatch = content.match(/font-style:\s*([^;]+)/);
    const srcMatch = content.match(/src:\s*url\(["']?([^"')\s]+)["']?\)/);

    if (familyMatch) {
      fonts.push({
        family: familyMatch[1],
        weight: weightMatch ? weightMatch[1].trim() : 'normal',
        style: styleMatch ? styleMatch[1].trim() : 'normal',
        src: srcMatch ? srcMatch[1].trim() : null,
        file: globalsCssPath,
        origin: 'self-hosted'
      });
    }
  }

  // Extract Google Fonts imports
  const googleFontsRegex = /@import url\(["']https:\/\/fonts\.googleapis\.com\/css2\?family=([^&'"]+)/g;
  while ((match = googleFontsRegex.exec(css)) !== null) {
    const fontFamily = match[1].replace(/[+:]/g, ' ');
    fonts.push({
      family: fontFamily,
      weight: 'variable',
      style: 'normal',
      src: match[0],
      file: globalsCssPath,
      origin: 'google-fonts'
    });
  }

  log(`✓ ${fonts.length} font families found`);
  return fonts;
}

// ============================================================================
// COMPONENT DISCOVERY
// ============================================================================

async function discoverComponents(project) {
  log('[4/7] Discovering components...');

  // Use regex-based discovery for better memory efficiency
  // TypeScript AST analysis with ts-morph can consume too much memory on large projects
  const components = discoverComponentsRegex(project);

  log(`✓ ${components.length} components discovered`);
  return components;
}

function classifyComponent(name, filePath) {
  const lowerName = name.toLowerCase();
  const lowerPath = filePath.toLowerCase();

  // Button classification
  if (lowerName.includes('button')) return 'button';

  // Card classification
  if (lowerName.includes('card') || lowerName.includes('metric') || lowerName.includes('kpi')) return 'card';

  // Icon classification
  if (lowerName.includes('icon')) return 'icon';

  // Input classification
  if (lowerName.includes('input') || lowerName.includes('textfield')) return 'input';

  // Badge classification
  if (lowerName.includes('badge')) return 'badge';

  // Modal/Dialog classification
  if (lowerName.includes('modal') || lowerName.includes('dialog')) return 'modal';

  // Table classification
  if (lowerName.includes('table') || lowerName.includes('grid')) return 'table';

  // Navigation classification
  if (lowerName.includes('nav') || lowerName.includes('sidebar') || lowerName.includes('header')) return 'navigation';

  // Form classification
  if (lowerName.includes('form') || lowerName.includes('select') || lowerName.includes('textarea') || lowerName.includes('checkbox')) return 'form';

  // Layout classification
  if (lowerName.includes('layout') || lowerName.includes('container') || lowerName.includes('wrapper')) return 'layout';

  // Default classification
  return 'other';
}

// Fallback regex-based component discovery
function discoverComponentsRegex(project) {
  const components = [];

  try {
    // Find all TSX files using glob (cross-platform)
    const tsxFiles = glob.sync('src/**/*.tsx', {
      cwd: project.root,
      absolute: true
    });

    for (const filePath of tsxFiles) {
      const content = readFileSync(filePath, 'utf-8');

      // Match component exports
      const patterns = [
        /export\s+(?:const|function)\s+(\w+)\s*=/g,
        /export\s+function\s+(\w+)/g,
        /export\s+class\s+(\w+)/g,
        /export\s+default\s+(?:const|function)\s+(\w+)\s*=/g,
        /export\s+(?:const|function)\s+(\w+)\s*\(/g
      ];

      for (const pattern of patterns) {
        let match;
        // Reset regex state for each pattern
        pattern.lastIndex = 0;
        while ((match = pattern.exec(content)) !== null) {
          const name = match[1];
          // Filter out non-component names
          if (name && name[0] === name[0].toUpperCase() && name.length > 2) {
            // Avoid duplicates
            if (!components.find(c => c.name === name && c.file === filePath)) {
              components.push({
                name,
                file: filePath,
                exportType: 'named',
                type: 'unknown',
                category: classifyComponent(name, filePath),
                props: [],
                imports: []
              });
            }
          }
        }
      }
    }
  } catch (error) {
    log(`Error in regex discovery: ${error.message}`, 'error');
  }

  return components;
}

// ============================================================================
// CATALOG GENERATION
// ============================================================================

function generateCatalog(components, project, options) {
  log('[5/9] Building temporary catalog...');

  const tempDir = join(project.root, '.tmp', 'design-system-audit');
  ensureDir(tempDir);

  // Generate catalog entry point
  const catalogContent = generateCatalogApp(components, project, options);
  writeFileSync(join(tempDir, 'CatalogApp.tsx'), catalogContent);

  // Generate HTML entry
  const htmlContent = generateCatalogHtml();
  writeFileSync(join(tempDir, 'index.html'), htmlContent);

  // Generate Vite config
  const viteConfig = generateCatalogViteConfig(project);
  writeFileSync(join(tempDir, 'vite.config.ts'), viteConfig);

  // Generate tsconfig
  const tsconfig = generateCatalogTsConfig(project);
  writeFileSync(join(tempDir, 'tsconfig.json'), tsconfig);

  log('✓ Temporary catalog generated');
  return { tempDir, port: 5173 };
}

function generateCatalogApp(components, project, options) {
  const imports = new Set();
  const componentImports = [];
  const componentRenderings = [];

  // Filter components based on options
  let filteredComponents = components;
  if (options.category) {
    filteredComponents = components.filter(c => c.category === options.category);
  }
  if (options.component) {
    filteredComponents = components.filter(c => c.name === options.component);
  }

  // Generate imports and renderings for each component
  for (const component of filteredComponents) {
    const relativePath = component.file.replace(project.root, '').replace(/\\/g, '/');
    const importName = `Comp_${component.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

    imports.add(`import { ${component.name} as ${importName} } from '${relativePath}';`);

    componentImports.push(`import { ${component.name} as ${importName} } from '${relativePath}';`);

    componentRenderings.push(`
      <div 
        data-design-id="${component.name}"
        data-component-name="${component.name}"
        data-component-file="${component.file}"
        data-component-category="${component.category}"
        className="catalog-item"
      >
        <div className="catalog-item-header">
          <h3>${component.name}</h3>
          <span className="catalog-item-category">${component.category}</span>
        </div>
        <div className="catalog-item-preview">
          <${importName} />
        </div>
        <div className="catalog-item-info">
          <p>File: ${relativePath}</p>
        </div>
      </div>
    `);
  }

  return `import React from 'react';
import { createRoot } from 'react-dom/client';
${componentImports.join('\n')}

import './catalog.css';

function CatalogApp() {
  return (
    <div className="catalog">
      <header className="catalog-header">
        <h1>Birth Hub 360° — Design System Audit</h1>
        <p>Components: ${filteredComponents.length}</p>
      </header>
      <main className="catalog-main">
        <aside className="catalog-sidebar">
          <nav>
            <h2>Categories</h2>
            <ul>
              <li><a href="#all">All (${filteredComponents.length})</a></li>
              <li><a href="#buttons">Buttons</a></li>
              <li><a href="#cards">Cards</a></li>
              <li><a href="#icons">Icons</a></li>
              <li><a href="#forms">Forms</a></li>
              <li><a href="#navigation">Navigation</a></li>
              <li><a href="#tables">Tables</a></li>
            </ul>
          </nav>
        </aside>
        <div className="catalog-content">
          ${componentRenderings.join('\n')}
        </div>
      </main>
    </div>
  );
}

// Initialize the app
const root = createRoot(document.getElementById('root')!);
root.render(<CatalogApp />);
`;
}

function generateCatalogHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Birth Hub 360° — Design System Audit</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/CatalogApp.tsx"></script>
</body>
</html>`;
}

function generateCatalogViteConfig(project) {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});`;
}

function generateCatalogTsConfig(project) {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
      paths: {
        '@/*': ['./src/*']
      }
    },
    include: ['.', '../src'],
    references: [{ path: '../tsconfig.json' }]
  }, null, 2);
}

// ============================================================================
// CATALOG CSS
// ============================================================================

function generateCatalogCss(tempDir) {
  const css = `
.catalog {
  min-height: 100vh;
  background: #f8fafc;
  font-family: system-ui, -apple-system, sans-serif;
}

.catalog-header {
  background: linear-gradient(135deg, #0b132b 0%, #1a1a2e 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.catalog-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
}

.catalog-main {
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: calc(100vh - 120px);
}

.catalog-sidebar {
  background: white;
  border-right: 1px solid #e2e8f0;
  padding: 1.5rem;
}

.catalog-sidebar nav h2 {
  margin-top: 0;
  font-size: 1.25rem;
}

.catalog-sidebar ul {
  list-style: none;
  padding: 0;
}

.catalog-sidebar li {
  margin-bottom: 0.5rem;
}

.catalog-sidebar a {
  color: #475569;
  text-decoration: none;
  display: block;
  padding: 0.5rem;
  border-radius: 0.375rem;
}

.catalog-sidebar a:hover {
  background: #f1f5f9;
  color: #0b132b;
}

.catalog-content {
  padding: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  align-content: start;
}

.catalog-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.catalog-item-header {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.catalog-item-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #0b132b;
}

.catalog-item-category {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: #f1f5f9;
  border-radius: 0.25rem;
  color: #64748b;
  text-transform: uppercase;
}

.catalog-item-preview {
  padding: 2rem;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.catalog-item-info {
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  font-size: 0.875rem;
  color: #64748b;
}

.catalog-item-info p {
  margin: 0;
  word-break: break-all;
}
`;

  writeFileSync(join(tempDir, 'catalog.css'), css);
}

// ============================================================================
// VITE SERVER MANAGEMENT
// ============================================================================

function startViteServer(tempDir) {
  return new Promise((resolve, reject) => {
    log('[6/9] Starting Vite server...');

    // Try to use local vite binary first, then fall back to npx
    const viteBin = join(PROJECT_ROOT, 'node_modules', '.bin', 'vite');
    const viteCmd = existsSync(viteBin) ? viteBin : 'vite';

    const viteProcess = spawn(viteCmd, [], {
      cwd: tempDir,
      stdio: 'pipe',
      shell: true
    });

    let serverReady = false;
    let output = '';

    viteProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Local:') && !serverReady) {
        serverReady = true;
        const match = output.match(/Local:\s+(http:\/\/[^\s]+)/);
        if (match) {
          log(`✓ Server ready at ${match[1]}`);
          resolve({ process: viteProcess, url: match[1] });
        }
      }
    });

    viteProcess.stderr.on('data', (data) => {
      output += data.toString();
      // Check for port in use message and try to extract the new port
      if (output.includes('Port') && output.includes('is in use') && !serverReady) {
        const portMatch = output.match(/trying another one\.\s+Local:\s+(http:\/\/localhost:\d+)/);
        if (portMatch) {
          serverReady = true;
          log(`✓ Server ready at ${portMatch[1]}`);
          resolve({ process: viteProcess, url: portMatch[1] });
        }
      }
    });

    viteProcess.on('error', (error) => {
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        viteProcess.kill();
        reject(new Error('Vite server failed to start within 30 seconds'));
      }
    }, 30000);
  });
}

function stopViteServer(viteProcess) {
  if (viteProcess && viteProcess.process) {
    viteProcess.process.kill();
    log('Vite server stopped');
  }
}

// ============================================================================
// PUPPETEER SCREENSHOT CAPTURE
// ============================================================================

async function captureScreenshots(serverUrl, components, outputDir, options) {
  log('[7/9] Rendering components and capturing screenshots...');

  let puppeteer;
  try {
    puppeteer = await import('puppeteer');
  } catch (error) {
    log('Puppeteer not found, skipping screenshots', 'warn');
    return [];
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const [width, height] = options.viewport.split('x').map(Number);

  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  // Navigate to catalog
  await page.goto(serverUrl, { waitUntil: 'networkidle0' });

  // Wait for fonts and animations
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    await new Promise(resolve =>
      requestAnimationFrame(() =>
        requestAnimationFrame(resolve)
      )
    );
  });

  const screenshots = [];
  const errors = [];

  // Capture each component
  for (const component of components) {
    try {
      const selector = `[data-component-name="${component.name}"]`;
      const element = await page.$(selector);

      if (element) {
        const categoryDir = join(outputDir, component.category);
        ensureDir(categoryDir);

        const screenshotPath = join(categoryDir, `${component.name}.png`);

        // Try to capture the specific element
        try {
          await element.screenshot({ path: screenshotPath, type: 'png' });
          screenshots.push({
            component: component.name,
            path: screenshotPath,
            category: component.category,
            status: 'success'
          });
          log(`✓ ${component.name}`);
        } catch (error) {
          // Fallback to full page screenshot if element capture fails
          await page.screenshot({ path: screenshotPath, type: 'png' });
          screenshots.push({
            component: component.name,
            path: screenshotPath,
            category: component.category,
            status: 'partial'
          });
          log(`⚠ ${component.name} (partial capture)`, 'warn');
        }
      } else {
        errors.push({
          component: component.name,
          error: 'Element not found in DOM'
        });
        log(`✗ ${component.name} (not found)`, 'error');
      }
    } catch (error) {
      errors.push({
        component: component.name,
        error: error.message
      });
      log(`✗ ${component.name} (${error.message})`, 'error');
    }
  }

  await browser.close();
  log(`✓ ${screenshots.length} screenshots captured`);

  return { screenshots, errors };
}

// ============================================================================
// DOCUMENTATION GENERATION
// ============================================================================

function generateDocumentation(project, tokens, fonts, components, screenshots, errors, outputDir) {
  log('[8/9] Generating documentation...');

  // Generate JSON inventory
  const jsonInventory = {
    project: {
      name: project.packageJson?.name || 'Birth Hub 360°',
      version: project.packageJson?.version || '0.0.1',
      root: project.root
    },
    stack: {
      react: project.dependencies?.react || 'unknown',
      typescript: project.devDependencies?.typescript || 'unknown',
      vite: project.devDependencies?.vite || 'unknown',
      tailwind: project.devDependencies?.tailwindcss || 'unknown'
    },
    tokens,
    fonts,
    components: components.map(c => ({
      name: c.name,
      file: c.file,
      category: c.category,
      exportType: c.exportType,
      type: c.type
    })),
    screenshots,
    errors,
    statistics: {
      totalComponents: components.length,
      totalScreenshots: screenshots.length,
      totalErrors: errors.length,
      successRate: components.length > 0
        ? ((screenshots.length / components.length) * 100).toFixed(1)
        : 0,
      totalTokens: tokens.colors.length + tokens.typography.length +
        tokens.spacing.length + tokens.radius.length +
        tokens.shadows.length + tokens.other.length,
      totalFonts: fonts.length
    }
  };

  writeFileSync(join(outputDir, 'design-system.json'), JSON.stringify(jsonInventory, null, 2));

  // Generate Markdown documentation
  const markdown = generateMarkdown(jsonInventory);
  writeFileSync(join(outputDir, 'design-system.md'), markdown);

  log('✓ Documentation generated');
}

function generateMarkdown(inventory) {
  const { project, stack, tokens, fonts, components, screenshots, errors, statistics } = inventory;

  let md = `# Birth Hub 360° — Visual Design System Audit

## Executive Summary

This document provides a comprehensive inventory of the visual design system for Birth Hub 360°, automatically generated from the codebase.

**Project:** ${project.name} v${project.version}
**Generated:** ${new Date().toISOString()}

## Statistics

- **Total Components:** ${statistics.totalComponents}
- **Successfully Rendered:** ${statistics.totalScreenshots}
- **Failed:** ${statistics.totalErrors}
- **Success Rate:** ${statistics.successRate}%
- **Design Tokens:** ${statistics.totalTokens}
- **Font Families:** ${statistics.totalFonts}

## Project Stack

- React: ${stack.react}
- TypeScript: ${stack.typescript}
- Vite: ${stack.vite}
- Tailwind CSS: ${stack.tailwind}

## Design Tokens

### Colors (${tokens.colors.length})

| Token | Value | File | Line |
|-------|-------|------|------|
${tokens.colors.slice(0, 20).map(t => `| \`${t.name}\` | ${t.value} | ${t.file.split('/').pop()} | ${t.line} |`).join('\n')}
${tokens.colors.length > 20 ? `... and ${tokens.colors.length - 20} more colors` : ''}

### Typography (${tokens.typography.length})

| Token | Value | File | Line |
|-------|-------|------|------|
${tokens.typography.map(t => `| \`${t.name}\` | ${t.value} | ${t.file.split('/').pop()} | ${t.line} |`).join('\n')}

### Spacing (${tokens.spacing.length})

| Token | Value | File | Line |
|-------|-------|------|------|
${tokens.spacing.map(t => `| \`${t.name}\` | ${t.value} | ${t.file.split('/').pop()} | ${t.line} |`).join('\n')}

### Radius (${tokens.radius.length})

| Token | Value | File | Line |
|-------|-------|------|------|
${tokens.radius.map(t => `| \`${t.name}\` | ${t.value} | ${t.file.split('/').pop()} | ${t.line} |`).join('\n')}

### Shadows (${tokens.shadows.length})

| Token | Value | File | Line |
|-------|-------|------|------|
${tokens.shadows.map(t => `| \`${t.name}\` | ${t.value} | ${t.file.split('/').pop()} | ${t.line} |`).join('\n')}

## Typography

### Font Families (${fonts.length})

| Family | Weight | Style | Origin |
|--------|--------|-------|--------|
${fonts.map(f => `| ${f.family} | ${f.weight} | ${f.style} | ${f.origin} |`).join('\n')}

## Components

### By Category

${Object.entries(components.reduce((acc, c) => {
    acc[c.category] = acc[c.category] || [];
    acc[c.category].push(c);
    return acc;
  }, {})).map(([category, comps]) => `
#### ${category.charAt(0).toUpperCase() + category.slice(1)} (${comps.length})

${comps.map(c => `
##### ${c.name}

**File:** \`${c.file.replace(project.root, '')}\`

**Type:** ${c.type}

**Export:** ${c.exportType}

**Screenshot:** ${screenshots.find(s => s.component === c.name)?.path || 'Not available'}

`).join('')}
`).join('')}

## Render Errors

${errors.length > 0 ? `
| Component | Error |
|-----------|-------|
${errors.map(e => `| ${e.component} | ${e.error} |`).join('\n')}
` : 'No render errors.'}

## Component → Source Mapping

${components.map(c => `
### ${c.name}

- **Source:** \`${c.file.replace(project.root, '')}\`
- **Category:** ${c.category}
- **Screenshot:** ${screenshots.find(s => s.component === c.name)?.path || 'Not available'}
- **Status:** ${screenshots.find(s => s.component === c.name)?.status || 'not rendered'}
`).join('\n')}

---

*This document was automatically generated by the Birth Hub 360° Design System Audit tool.*
`;

  return md;
}

// ============================================================================
// CLEANUP
// ============================================================================

function cleanup(tempDir, options) {
  if (!options.noCleanup && !options.debug) {
    try {
      rmSync(tempDir, { recursive: true, force: true });
      log('Temporary files cleaned up');
    } catch (error) {
      log(`Warning: Could not clean up temporary files: ${error.message}`, 'warn');
    }
  } else {
    log(`Temporary files preserved in: ${tempDir}`, 'debug');
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n[BIRTH HUB 360° — DESIGN SYSTEM AUDIT]\n');

  try {
    // Phase 1: Project Discovery
    const project = await discoverProject();

    if (!project.globalsCss) {
      throw new Error('globals.css not found - cannot extract design tokens');
    }

    // Phase 2: Design Token Extraction
    const tokens = extractDesignTokens(project.globalsCss);

    // Phase 3: Font Inventory
    const fonts = extractFonts(project.globalsCss);

    // Phase 4: Component Discovery
    const components = await discoverComponents(project);

    // Phase 5: Catalog Generation (for screenshot capture)
    const { tempDir, port } = generateCatalog(components, project, options);
    generateCatalogCss(tempDir);

    // Phase 6: Start Vite Server
    const viteServer = await startViteServer(tempDir);

    // Phase 7: Screenshot Capture
    const outputDir = join(PROJECT_ROOT, options.output);
    ensureDir(outputDir);

    // Create category directories
    const categories = [...new Set(components.map(c => c.category))];
    for (const category of categories) {
      ensureDir(join(outputDir, category));
    }

    log('[6/7] Capturing screenshots...');
    const { screenshots, errors } = await captureScreenshots(
      viteServer.url,
      components,
      outputDir,
      options
    );

    // Phase 8: Documentation Generation
    log('[7/7] Generating documentation...');
    generateDocumentation(project, tokens, fonts, components, screenshots, errors, outputDir);

    // Phase 9: Cleanup
    stopViteServer(viteServer);
    cleanup(tempDir, options);

    // Final Statistics
    console.log('\n[BIRTH HUB 360° DESIGN SYSTEM AUDIT COMPLETE]\n');
    console.log(`Components discovered: ${components.length}`);
    console.log(`Components rendered: ${screenshots.length}`);
    console.log(`Components failed: ${errors.length}`);
    console.log(`Screenshots generated: ${screenshots.length}`);
    console.log(`Design tokens discovered: ${tokens.colors.length + tokens.typography.length + tokens.spacing.length + tokens.radius.length + tokens.shadows.length + tokens.other.length}`);
    console.log(`Fonts discovered: ${fonts.length}`);
    console.log(`Success rate: ${components.length > 0 ? ((screenshots.length / components.length) * 100).toFixed(1) : 0}%\n`);
    console.log(`Documentation:`);
    console.log(`./${options.output}/design-system.md\n`);
    console.log(`Machine-readable inventory:`);
    console.log(`./${options.output}/design-system.json\n`);
    console.log(`Screenshots:`);
    console.log(`./${options.output}/\n`);

  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Run the audit
main();
