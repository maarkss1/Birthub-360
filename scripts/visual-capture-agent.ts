import { chromium, Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const CATALOG_DIR = path.join(process.cwd(), 'visual-catalog');
const BASE_URL = 'http://localhost:3000';

// Let's use the actual application routes
const ROUTES = [
  '/login',
  '/app/dashboard',
  '/app/crm',
  '/app/prospect',
  '/app/intelligence',
  '/app/analytics',
  '/app/integrations',
  '/app/settings'
];

const VIEWPORTS = [
  { name: 'Desktop', width: 1280, height: 800 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 667 }
];

const CATEGORIES = {
  buttons: ['button', '[role="button"]', 'a.inline-flex.items-center.justify-center.rounded-md', '.btn'],
  inputs: ['input:not([type="hidden"])', 'textarea', 'select', '[role="combobox"]', '.input'],
  cards: ['[data-testid*="card"]', '.rounded-xl.border', '.bg-card', '.card', '.rounded-xl'],
  navigation: ['nav', '[role="navigation"]', 'aside'],
  modals: ['[role="dialog"]', '[role="alertdialog"]', '.modal'],
  tables: ['table', '[role="table"]'],
  badges: ['.inline-flex.items-center.rounded-full', '.badge'],
  icons: ['svg.lucide'],
  switches: ['button[role="switch"]', '[role="checkbox"]'],
  tabs: ['[role="tab"]', '[role="tablist"]'],
  alerts: ['[role="alert"]'],
  loaders: ['.animate-spin', '[role="progressbar"]']
};

interface ComponentData {
  id: string;
  category: string;
  name: string;
  imagePath: string;
  pageUrl: string;
  selector: string;
  viewport: string;
}

const inventory: ComponentData[] = [];
const seenHashes = new Set<string>();

async function ensureDirs() {
  await fs.mkdir(CATALOG_DIR, { recursive: true });
  for (const category of Object.keys(CATEGORIES)) {
    await fs.mkdir(path.join(CATALOG_DIR, category), { recursive: true });
  }
}

function getElementHash(outerHTML: string, rect: any, viewportName: string): string {
  const data = `${outerHTML}-${Math.round(rect.width)}-${Math.round(rect.height)}-${viewportName}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

async function login(page: Page) {
    const uniqueEmail = `agent-${Date.now()}@birthhub360.com.br`;
    await page.goto(`${BASE_URL}/login?signup=1`);
    await page.waitForLoadState('networkidle');
    try {
        await page.getByPlaceholder('Seu Nome Completo').fill('Agent QA');
        await page.getByLabel('Credencial Institucional').fill(uniqueEmail);
        await page.getByPlaceholder('••••••••').fill('E2eTestPassword123!');
        await page.getByRole('button', { name: /^Criar conta$/ }).click();
        await page.waitForURL('**/app*', { timeout: 15000 });
        console.log('Successfully logged in.');
    } catch (e) {
        console.log('Login might have failed or skipped. Continuing.', e);
    }
}

async function captureComponentsOnPage(page: Page, route: string, viewportName: string) {
  const url = `${BASE_URL}${route}`;
  const pageName = route === '/' ? 'Home' : route.split('/').pop() || 'index';
  console.log(`Scanning ${url} on ${viewportName} for components...`);

  await page.goto(url);
  try {
    await page.waitForLoadState('networkidle', { timeout: 3000 });
  } catch (e) {
  }

  await page.waitForTimeout(500);

  for (const [category, selectors] of Object.entries(CATEGORIES)) {
    for (const selector of selectors) {
      const elements = await page.locator(selector).all();

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];

        try {
          const isVisible = await el.isVisible();
          if (!isVisible) continue;

          const rect = await el.boundingBox();
          if (!rect || rect.width < 10 || rect.height < 10) continue;
          if (rect.width > 800 || rect.height > 800) continue;

          const outerHTML = await el.evaluate(node => node.outerHTML);
          const hash = getElementHash(outerHTML, rect, viewportName);

          if (seenHashes.has(hash)) continue;
          seenHashes.add(hash);

          let text = '';
          try {
             text = (await el.innerText()).slice(0, 15).replace(/[^a-zA-Z0-9]/g, '');
          } catch (e) {}

          let classes = '';
          try {
              classes = (await el.getAttribute('class')) || '';
          } catch(e) {}

          const nameInfo = text || classes.split(' ')[0] || 'element';
          const filename = `${category.charAt(0).toUpperCase() + category.slice(1)}-${pageName}-${viewportName}-${nameInfo}-${i}.png`;
          const filepath = path.join(CATALOG_DIR, category, filename);

          await el.screenshot({ path: filepath });

          inventory.push({
            id: hash,
            category,
            name: filename.replace('.png', ''),
            imagePath: `${category}/${filename}`,
            pageUrl: route,
            selector,
            viewport: viewportName
          });

        } catch (err) {
        }
      }
    }
  }
}

async function generateHtmlCatalog() {
  console.log('Generating HTML catalog...');
  const htmlPath = path.join(CATALOG_DIR, 'index.html');

  const groupedInventory = inventory.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ComponentData[]>);

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Component Catalog</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f4f4f5; color: #18181b; padding: 2rem; }
        h1 { margin-bottom: 2rem; border-bottom: 2px solid #e4e4e7; padding-bottom: 1rem; }
        h2 { margin-top: 3rem; text-transform: capitalize; color: #3f3f46; border-bottom: 1px solid #e4e4e7; padding-bottom: 0.5rem; }

        .controls { background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e4e4e7; margin-bottom: 2rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;}
        .controls input, .controls select { padding: 0.5rem; border: 1px solid #d4d4d8; border-radius: 4px; }

        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 1rem; }
        .card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e4e4e7; display: flex; flex-direction: column; }
        .card-img-wrapper { padding: 1.5rem; background: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 150px; border-bottom: 1px solid #e4e4e7; flex-grow: 1; }
        .card img { max-width: 100%; max-height: 200px; object-fit: contain; cursor: pointer; transition: transform 0.2s; }
        .card img:hover { transform: scale(1.05); }
        .card-content { padding: 1rem; background: white; }
        .card-title { font-weight: 600; margin: 0 0 0.5rem 0; font-size: 0.9rem; word-break: break-all; }
        .card-meta { font-size: 0.8rem; color: #71717a; margin: 0.25rem 0; }

        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.9); }
        .modal-content { margin: auto; display: block; max-width: 90%; max-height: 90%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .close { position: absolute; top: 15px; right: 35px; color: #f1f1f1; font-size: 40px; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Visual Component Catalog</h1>

    <div style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e4e4e7; margin-bottom: 2rem;">
        <h3>Relatório de Cobertura</h3>
        <p><strong>Páginas analisadas:</strong> ${ROUTES.length}</p>
        <p><strong>Componentes encontrados:</strong> ${inventory.length}</p>
        <p><strong>Componentes únicos:</strong> ${inventory.length}</p>
        <p><strong>Screenshots capturados:</strong> ${inventory.length}</p>
        <p><strong>Categorias encontradas:</strong> ${Object.keys(groupedInventory).length}</p>
        <ul style="margin-top: 1rem; color: #52525b; font-size: 0.9rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
            ${Object.entries(groupedInventory).map(([cat, items]) => `<li>${cat}: ${items.length}</li>`).join('')}
        </ul>
        <p style="margin-top: 1rem; font-size: 0.8rem; color: #a1a1aa;">Nota: Uma falha preexistente no OpenAPI (duplicação de rotas em docs/openapi.yaml) não afeta este catálogo e foi registrada separadamente.</p>
    </div>

    <div class="controls">
      <input type="text" id="searchInput" placeholder="Buscar componente..." onkeyup="filterCatalog()">
      <select id="categoryFilter" onchange="filterCatalog()">
        <option value="">Todas as Categorias</option>
        ${Object.keys(groupedInventory).map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>
      <select id="viewportFilter" onchange="filterCatalog()">
        <option value="">Todos os Viewports</option>
        ${VIEWPORTS.map(v => `<option value="${v.name}">${v.name}</option>`).join('')}
      </select>
    </div>

    <div id="catalogContent">
  `;

  for (const [category, items] of Object.entries(groupedInventory)) {
    if (items.length === 0) continue;
    html += `<div class="category-section" data-category="${category}"><h2>${category} <span style="color:#a1a1aa; font-size:0.9rem;">(${items.length})</span></h2><div class="grid">`;
    for (const item of items) {
      html += `
        <div class="card" data-name="${item.name.toLowerCase()}" data-category="${item.category}" data-viewport="${item.viewport}">
            <div class="card-img-wrapper">
                <img src="${item.imagePath}" alt="${item.name}" loading="lazy" onclick="openModal(this.src)">
            </div>
            <div class="card-content">
                <p class="card-title">${item.name}</p>
                <p class="card-meta"><strong>Categoria:</strong> ${item.category}</p>
                <p class="card-meta"><strong>Página/Rota:</strong> ${item.pageUrl}</p>
                <p class="card-meta"><strong>Viewport:</strong> ${item.viewport}</p>
            </div>
        </div>
      `;
    }
    html += `</div></div>`;
  }

  html += `
    </div>
    <!-- The Modal -->
    <div id="myModal" class="modal" onclick="closeModal()">
      <span class="close" onclick="closeModal()">&times;</span>
      <img class="modal-content" id="img01">
    </div>

    <script>
        function openModal(src) {
            document.getElementById("myModal").style.display = "block";
            document.getElementById("img01").src = src;
        }
        function closeModal() {
            document.getElementById("myModal").style.display = "none";
        }
        document.addEventListener('keydown', function(event){
            if(event.key === "Escape"){
                closeModal();
            }
        });

        function filterCatalog() {
            const searchText = document.getElementById('searchInput').value.toLowerCase();
            const categoryValue = document.getElementById('categoryFilter').value;
            const viewportValue = document.getElementById('viewportFilter').value;

            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                const name = card.getAttribute('data-name');
                const cat = card.getAttribute('data-category');
                const view = card.getAttribute('data-viewport');

                const matchesSearch = name.includes(searchText);
                const matchesCat = categoryValue === "" || cat === categoryValue;
                const matchesView = viewportValue === "" || view === viewportValue;

                if (matchesSearch && matchesCat && matchesView) {
                    card.style.display = "flex";
                } else {
                    card.style.display = "none";
                }
            });

            // Hide empty category sections
            const sections = document.querySelectorAll('.category-section');
            sections.forEach(sec => {
                const visibleCards = sec.querySelectorAll('.card[style="display: flex;"], .card:not([style*="display: none"])');
                if(visibleCards.length === 0) {
                    sec.style.display = 'none';
                } else {
                    sec.style.display = 'block';
                }
            });
        }
    </script>
</body>
</html>
  `;

  await fs.writeFile(htmlPath, html);
  console.log(`Catalog generated at ${htmlPath}`);
}

async function run() {
  await ensureDirs();

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    if (vp.name === 'Desktop') {
       await login(page);
    } else {
       // Just pass auth by reusing cookies or simply doing login again
       await login(page);
    }

    try {
      for (const route of ROUTES) {
        await captureComponentsOnPage(page, route, vp.name);
      }
    } catch (error) {
      console.error(`Error during capture on ${vp.name}:`, error);
    }

    await context.close();
  }

  await generateHtmlCatalog();
  await browser.close();
}

run().catch(console.error);
