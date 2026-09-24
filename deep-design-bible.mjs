import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const desktopDir = path.join(os.homedir(), 'Desktop');
const htmlOutputPath = path.join(desktopDir, 'BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE.html');

// Utility to recursively find files
function findFiles(dir, ext, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, ext, fileList);
    } else if (filePath.endsWith(ext)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const tsxFiles = findFiles(path.join(__dirname, 'src'), '.tsx');
const tsFiles = findFiles(path.join(__dirname, 'src'), '.ts');
const allFiles = [...tsxFiles, ...tsFiles];

// 1. GATHER ALL SVGS
const svgRegex = /<svg[\s\S]*?<\/svg>/g;
let svgs = [];
let svgSet = new Set(); // to prevent duplicates

// 2. GATHER BUTTONS
const buttonRegex = /<(?:button|Button)[^>]*className=["']([^"']+)["'][^>]*>/g;
let buttons = [];
let buttonSet = new Set();

// 3. GATHER CARDS (heuristic based on Tailwind classes or explicit Card components)
const cardRegex = /<(?:div|Card|article)[^>]*className=["']([^"']*(?:shadow|rounded)[^"']*)["'][^>]*>/g;
let cards = [];
let cardSet = new Set();

// 4. GATHER SCREENS / PAGES
// Look for files in pages/ or screen components
const screens = [];

for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const fileName = path.basename(file);
  const relPath = path.relative(__dirname, file);
  
  // Is it a Screen/Page?
  if (relPath.includes('pages') || relPath.includes('screens') || fileName.includes('Screen') || fileName.includes('Page')) {
    screens.push(relPath);
  }

  // Extract SVGs
  const svgMatches = content.match(svgRegex);
  if (svgMatches) {
    svgMatches.forEach(match => {
      // Very basic normalization for React SVG -> Standard HTML SVG
      let cleanSvg = match
        .replace(/className=/g, 'class=')
        .replace(/strokeWidth=/g, 'stroke-width=')
        .replace(/strokeLinecap=/g, 'stroke-linecap=')
        .replace(/strokeLinejoin=/g, 'stroke-linejoin=')
        .replace(/fillRule=/g, 'fill-rule=')
        .replace(/clipRule=/g, 'clip-rule=')
        .replace(/\{([^}]+)\}/g, '"currentColor"')
        .replace(/<[A-Z][a-zA-Z]*[^>]*\/>/g, '') // Remove nested React components inside SVGs if any
        
      if (!svgSet.has(cleanSvg)) {
        svgSet.add(cleanSvg);
        svgs.push({ file: relPath, code: cleanSvg });
      }
    });
  }

  // Extract Buttons
  let btnMatch;
  while ((btnMatch = buttonRegex.exec(content)) !== null) {
    const classes = btnMatch[1];
    if (!buttonSet.has(classes) && classes.includes('bg-') || classes.includes('border')) {
      buttonSet.add(classes);
      buttons.push({ file: relPath, classes });
    }
  }

  // Extract Cards
  let cardMatch;
  while ((cardMatch = cardRegex.exec(content)) !== null) {
    const classes = cardMatch[1];
    if ((classes.includes('shadow') || classes.includes('border')) && classes.includes('rounded') && classes.includes('p-')) {
      if (!cardSet.has(classes)) {
        cardSet.add(classes);
        cards.push({ file: relPath, classes });
      }
    }
  }
}

// Generate the MASSIVE HTML
const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BIRTH HUB 360° — THE COMPLETE DESIGN BIBLE</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0B132B; color: #e2e8f0; }
    .sidebar { width: 300px; height: 100vh; position: fixed; overflow-y: auto; background: #060b19; border-right: 1px solid #1e293b; padding: 20px; }
    .content { margin-left: 300px; padding: 40px; }
    .section-title { font-size: 2rem; font-weight: bold; margin-bottom: 24px; border-bottom: 1px solid #1e293b; padding-bottom: 16px; color: #FFD700; }
    .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .card-item { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; word-break: break-all; }
    .svg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 16px; }
    .svg-item { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .svg-item svg { width: 32px; height: 32px; color: #94a3b8; }
    .nav-btn { display: block; width: 100%; padding: 10px; text-align: left; background: transparent; color: #94a3b8; margin-bottom: 4px; border-radius: 6px; cursor: pointer; }
    .nav-btn:hover { background: #1e293b; color: #FFD700; }
    code { font-family: monospace; font-size: 0.8rem; color: #38bdf8; }
  </style>
</head>
<body>
  <div class="sidebar">
    <h1 class="text-xl font-bold text-white mb-8">Birth Hub 360°<br><span class="text-sm text-brand font-normal">Design Bible</span></h1>
    <a href="#screens" class="nav-btn">Telas mapeadas (${screens.length})</a>
    <a href="#buttons" class="nav-btn">Botões (${buttons.length})</a>
    <a href="#cards" class="nav-btn">Cards / Containers (${cards.length})</a>
    <a href="#svgs" class="nav-btn">Ícones SVG (${svgs.length})</a>
  </div>

  <div class="content">
    
    <div class="bg-blue-900/20 border border-blue-500 p-6 rounded-lg mb-12">
      <h2 class="text-xl font-bold text-blue-400 mb-2">Engenharia Reversa Completa (Análise Estática)</h2>
      <p class="text-slate-300">O robô varreu <strong>${tsxFiles.length}</strong> componentes React. Abaixo estão listados ABSOLUTAMENTE TODOS os SVGs, padrões de botões, containers/cards e telas identificadas no repositório inteiro.</p>
    </div>

    <!-- TELAS -->
    <section id="screens" class="mb-20">
      <h2 class="section-title">Todas as Telas / Pages</h2>
      <p class="mb-6 text-slate-400">Rotas e telas identificadas pela estrutura de pastas (<code>pages/</code>, <code>screens/</code>).</p>
      <div class="grid-container">
        ${screens.map(s => `
          <div class="card-item">
            <h3 class="font-bold text-white mb-2">${s.split('\\').pop()}</h3>
            <code>${s}</code>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- BOTOES -->
    <section id="buttons" class="mb-20">
      <h2 class="section-title">Todos os Botões (Variantes Tailwind)</h2>
      <p class="mb-6 text-slate-400">Padrões de classe Tailwind encontrados em tags <code>&lt;button&gt;</code>.</p>
      <div class="grid-container">
        ${buttons.map(b => `
          <div class="card-item">
            <button class="${b.classes}" style="margin-bottom: 12px;">Exemplo de Botão</button>
            <hr class="border-slate-700 my-2">
            <code>${b.classes}</code>
            <div class="text-[10px] text-slate-500 mt-2">Encontrado em: ${b.file}</div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- CARDS -->
    <section id="cards" class="mb-20">
      <h2 class="section-title">Todos os Cards e Containers</h2>
      <p class="mb-6 text-slate-400">Identificados por conter bordas, shadows, arredondamentos e padding.</p>
      <div class="grid-container">
        ${cards.map(c => `
          <div class="card-item">
            <div class="${c.classes}" style="min-height: 50px; border: 1px solid rgba(255,255,255,0.2);">Exemplo de Card</div>
            <hr class="border-slate-700 my-2">
            <code>${c.classes}</code>
            <div class="text-[10px] text-slate-500 mt-2">Encontrado em: ${c.file}</div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- SVGS -->
    <section id="svgs" class="mb-20">
      <h2 class="section-title">TODOS OS ÍCONES SVG INLINE</h2>
      <p class="mb-6 text-slate-400">Total de ícones originais rastreados: ${svgs.length}</p>
      <div class="svg-grid">
        ${svgs.map(s => `
          <div class="svg-item" title="${s.file}">
            ${s.code}
            <div class="text-[8px] text-slate-500 mt-2 truncate w-full text-center">${s.file.split('\\').pop()}</div>
          </div>
        `).join('')}
      </div>
    </section>

  </div>
</body>
</html>`;

fs.writeFileSync(htmlOutputPath, htmlContent, 'utf-8');
console.log('Extração MASSIVA gerada com sucesso em:', htmlOutputPath);
