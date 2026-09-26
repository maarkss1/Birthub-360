import { chromium, Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const CATALOG_DIR = path.join(process.cwd(), 'visual-catalog');
// Use the showcase page we successfully created
const BASE_URL = 'http://localhost:5000/test-showcase.html';

const CATEGORIES = {
  buttons: ['button', '[role="button"]', 'a.inline-flex.items-center.justify-center.rounded-md', '.btn'],
  inputs: ['input:not([type="hidden"])', 'textarea', 'select', '[role="combobox"]', '.input'],
  cards: ['[data-testid*="card"]', '.rounded-xl.border', '.bg-card', '.card', '.rounded-xl'],
  navigation: ['nav', '[role="navigation"]', 'aside'],
  modals: ['[role="dialog"]', '[role="alertdialog"]'],
  tables: ['table', '[role="table"]'],
  badges: ['.inline-flex.items-center.rounded-full', '.badge'],
  icons: ['svg.lucide'],
  switches: ['button[role="switch"]']
};

interface ComponentData {
  id: string;
  category: string;
  name: string;
  imagePath: string;
  pageUrl: string;
  selector: string;
}

const inventory: ComponentData[] = [];
const seenHashes = new Set<string>();

async function ensureDirs() {
  await fs.mkdir(CATALOG_DIR, { recursive: true });
  for (const category of Object.keys(CATEGORIES)) {
    await fs.mkdir(path.join(CATALOG_DIR, category), { recursive: true });
  }
}

function getElementHash(outerHTML: string, rect: any): string {
  const data = `${outerHTML}-${Math.round(rect.width)}-${Math.round(rect.height)}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

async function captureComponentsOnPage(page: Page, url: string, pageName: string) {
  console.log(`Scanning ${url} for components...`);
  await page.goto(url);
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch (e) {
    console.log('Network idle timeout reached, proceeding anyway...');
  }

  await page.waitForTimeout(3000);

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

          // Don't capture massive containers as components
          if (rect.width > 800 || rect.height > 600) continue;

          const outerHTML = await el.evaluate(node => node.outerHTML);
          const hash = getElementHash(outerHTML, rect);

          if (seenHashes.has(hash)) continue;
          seenHashes.add(hash);

          let text = '';
          try {
             text = (await el.innerText()).slice(0, 20).replace(/[^a-zA-Z0-9]/g, '');
          } catch (e) {}

          let classes = '';
          try {
              classes = (await el.getAttribute('class')) || '';
          } catch(e) {}

          const nameInfo = text || classes.split(' ')[0] || 'element';
          const filename = `${category.charAt(0).toUpperCase() + category.slice(1)}-${pageName}-${nameInfo}-${i}.png`;
          const filepath = path.join(CATALOG_DIR, category, filename);

          await el.screenshot({ path: filepath });

          inventory.push({
            id: hash,
            category,
            name: filename.replace('.png', ''),
            imagePath: `${category}/${filename}`,
            pageUrl: url,
            selector
          });

          console.log(`Captured: ${category}/${filename}`);
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
        h2 { margin-top: 3rem; text-transform: capitalize; color: #3f3f46; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
        .card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e4e4e7; display: flex; flex-direction: column; }
        .card-img-wrapper { padding: 1.5rem; background: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 150px; border-bottom: 1px solid #e4e4e7; flex-grow: 1; }
        .card img { max-width: 100%; max-height: 200px; object-fit: contain; cursor: pointer; transition: transform 0.2s; }
        .card img:hover { transform: scale(1.05); }
        .card-content { padding: 1rem; background: white; }
        .card-title { font-weight: 600; margin: 0 0 0.5rem 0; font-size: 0.9rem; word-break: break-all; }
        .card-meta { font-size: 0.8rem; color: #71717a; margin: 0.25rem 0; }

        /* Modal for full images */
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.9); }
        .modal-content { margin: auto; display: block; max-width: 90%; max-height: 90%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .close { position: absolute; top: 15px; right: 35px; color: #f1f1f1; font-size: 40px; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Visual Component Catalog</h1>

    <div style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e4e4e7; margin-bottom: 2rem;">
        <h3>Relatório Final</h3>
        <p><strong>Páginas analisadas:</strong> 1</p>
        <p><strong>Componentes encontrados:</strong> ${inventory.length}</p>
        <p><strong>Componentes únicos:</strong> ${inventory.length}</p>
        <p><strong>Screenshots capturados:</strong> ${inventory.length}</p>
        <p><strong>Categorias encontradas:</strong> ${Object.keys(groupedInventory).length}</p>
        <ul style="margin-top: 1rem; color: #52525b; font-size: 0.9rem;">
            ${Object.entries(groupedInventory).map(([cat, items]) => `<li>${cat}: ${items.length}</li>`).join('')}
        </ul>
    </div>
  `;

  for (const [category, items] of Object.entries(groupedInventory)) {
    if (items.length === 0) continue;
    html += `<h2>${category} (${items.length})</h2><div class="grid">`;
    for (const item of items) {
      html += `
        <div class="card">
            <div class="card-img-wrapper">
                <img src="${item.imagePath}" alt="${item.name}" loading="lazy" onclick="openModal(this.src)">
            </div>
            <div class="card-content">
                <p class="card-title">${item.name}</p>
                <p class="card-meta"><strong>Categoria:</strong> ${item.category}</p>
                <p class="card-meta"><strong>Página:</strong> Showcase</p>
            </div>
        </div>
      `;
    }
    html += `</div>`;
  }

  html += `
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
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    await captureComponentsOnPage(page, BASE_URL, 'Showcase');
  } catch (error) {
    console.error('Error during capture:', error);
  } finally {
    await generateHtmlCatalog();
    await browser.close();
  }
}

run().catch(console.error);
