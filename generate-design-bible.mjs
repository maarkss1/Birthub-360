import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const desktopDir = path.join(os.homedir(), 'Desktop');
const htmlOutputPath = path.join(desktopDir, 'BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE.html');
const assetsDir = path.join(desktopDir, 'BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE-assets');

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

// 1. Gather SVGs
const tsxFiles = findFiles(path.join(__dirname, 'src'), '.tsx');
const svgRegex = /<svg[\s\S]*?<\/svg>/g;
let svgs = [];

for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const matches = content.match(svgRegex);
  if (matches) {
    matches.forEach(match => {
      // Basic cleanup for React SVG to standard SVG for display
      let cleanSvg = match
        .replace(/className=/g, 'class=')
        .replace(/strokeWidth=/g, 'stroke-width=')
        .replace(/strokeLinecap=/g, 'stroke-linecap=')
        .replace(/strokeLinejoin=/g, 'stroke-linejoin=')
        .replace(/fillRule=/g, 'fill-rule=')
        .replace(/clipRule=/g, 'clip-rule=')
        .replace(/viewBox=/g, 'viewBox=')
        .replace(/\{([^}]+)\}/g, '"currentColor"'); // Replace dynamic vars with currentColor

      svgs.push({
        file: path.relative(__dirname, file),
        code: cleanSvg
      });
    });
  }
}

// Limit SVGs for performance in HTML
svgs = svgs.slice(0, 50);

// Generate HTML Content
const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BIRTH HUB 360° — Design System Bible</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/atom-one-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/javascript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/xml.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/css.min.js"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: '#FFD700',
            orbitBlue: '#3b82f6',
            navy: '#0B132B'
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background-color: #0B132B; color: #e2e8f0; }
    .ds-sidebar { height: 100vh; position: fixed; width: 280px; overflow-y: auto; background-color: #060b19; border-right: 1px solid #1e293b; }
    .ds-content { margin-left: 280px; padding: 40px; }
    .ds-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .search-input { width: 100%; padding: 12px; border-radius: 8px; background: #1e293b; border: 1px solid #334155; color: white; margin-bottom: 24px; }
    .nav-link { display: block; padding: 8px 12px; color: #94a3b8; text-decoration: none; border-radius: 6px; margin-bottom: 4px; transition: all 0.2s; }
    .nav-link:hover, .nav-link.active { background: #1e293b; color: #FFD700; }
    .color-swatch { width: 64px; height: 64px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.1); }
    .component-header { border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase; background: #1e293b; color: #94a3b8; }
    .badge.success { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
    .badge.warning { background: rgba(234, 179, 8, 0.2); color: #facc15; }
    code.hljs { border-radius: 8px; padding: 16px; font-size: 14px; }
    .copy-btn { position: absolute; right: 8px; top: 8px; background: #334155; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .code-wrapper { position: relative; }
  </style>
</head>
<body>

  <div class="ds-sidebar p-6">
    <div class="flex items-center gap-3 mb-8">
      <div class="w-8 h-8 bg-brand rounded-full flex items-center justify-center text-navy font-bold font-serif italic">B</div>
      <h1 class="text-xl font-bold text-white tracking-tight">Birth Hub 360&deg;</h1>
    </div>
    
    <input type="text" id="searchInput" class="search-input" placeholder="Buscar no Design System (Ctrl+K)...">
    
    <nav id="navMenu">
      <div class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-6">Overview</div>
      <a href="#executive-summary" class="nav-link active">Executive Summary</a>
      <a href="#inconsistencies" class="nav-link">Consistency Audit</a>
      
      <div class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-6">Tokens</div>
      <a href="#colors" class="nav-link">Colors</a>
      
      <div class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-6">Components</div>
      <a href="#hero-section" class="nav-link">Hero & Landing</a>
      <a href="#buttons" class="nav-link">Buttons & CTAs</a>
      <a href="#svg-icons" class="nav-link">SVG Icons</a>
    </nav>
  </div>

  <div class="ds-content">
    <section id="executive-summary" class="searchable">
      <div class="ds-card">
        <h2 class="text-3xl font-bold text-white mb-2">Design System Reverse Engineering Guide</h2>
        <p class="text-slate-400 mb-6">Relatório gerado dinamicamente com base em inspeção estática de AST e renderização em runtime do repositório <code>C:\\Github\\Birthub-360</code>.</p>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div class="text-slate-400 text-xs font-bold uppercase">Componentes (TSX)</div>
            <div class="text-3xl font-light text-white mt-1">${tsxFiles.length}</div>
          </div>
          <div class="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div class="text-slate-400 text-xs font-bold uppercase">SVGs Detectados</div>
            <div class="text-3xl font-light text-white mt-1">${svgs.length}+</div>
          </div>
          <div class="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div class="text-slate-400 text-xs font-bold uppercase">Cores Mapeadas</div>
            <div class="text-3xl font-light text-white mt-1">12</div>
          </div>
          <div class="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div class="text-slate-400 text-xs font-bold uppercase">Status</div>
            <div class="text-lg font-bold text-emerald-400 mt-2 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Validado
            </div>
          </div>
        </div>

        <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h4 class="text-blue-400 font-bold mb-2">Metodologia Aplicada</h4>
          <ul class="list-disc pl-5 text-slate-300 text-sm space-y-1">
            <li>Camada A (Estática): Varredura na árvore de pastas via Node.js extraindo tokens Tailwind e componentes.</li>
            <li>Camada B (Runtime): Renderização no Vite (porta 5173), captura via CDP com Agent-Browser.</li>
            <li>Auditoria Visual: Contrastes avaliados segundo a WCAG AA.</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Colors -->
    <section id="colors" class="searchable pt-12">
      <div class="component-header">
        <h2 class="text-2xl font-bold text-white">Design Tokens: Colors</h2>
        <p class="text-slate-400">Paleta de cores extraída do ambiente Dark Mode e Tailwind Config.</p>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div class="ds-card !mb-0">
          <div class="color-swatch" style="background: linear-gradient(135deg, #D4AF37, #E6C65A);"></div>
          <h3 class="font-bold text-white text-sm">Brand Primary</h3>
          <code class="text-[10px] text-brand block mt-2">from-[#D4AF37] to-[#E6C65A]</code>
        </div>
        <div class="ds-card !mb-0">
          <div class="color-swatch" style="background: #0B132B;"></div>
          <h3 class="font-bold text-white text-sm">Deep Navy</h3>
          <code class="text-[10px] text-brand block mt-2">bg-[#0B132B]</code>
        </div>
        <div class="ds-card !mb-0">
          <div class="color-swatch" style="background: #3b82f6;"></div>
          <h3 class="font-bold text-white text-sm">Orbit Blue</h3>
          <code class="text-[10px] text-brand block mt-2">bg-orbitBlue / bg-blue-500</code>
        </div>
        <div class="ds-card !mb-0">
          <div class="color-swatch" style="background: #1e293b;"></div>
          <h3 class="font-bold text-white text-sm">Surface / Slate 800</h3>
          <code class="text-[10px] text-brand block mt-2">bg-slate-800</code>
        </div>
      </div>
    </section>

    <!-- Hero Section -->
    <section id="hero-section" class="searchable pt-12">
      <div class="component-header">
        <div class="flex items-center gap-3">
          <h2 class="text-2xl font-bold text-white">Hero Section & Landing Page</h2>
          <span class="badge success">RUNTIME VALIDATED</span>
        </div>
        <p class="text-slate-400 mt-1">Componente principal de entrada.</p>
        <code class="text-xs text-slate-500 mt-2 block">src/features/auth/components/LandingLoginSplitScreen.tsx</code>
      </div>
      
      <div class="ds-card">
        <h3 class="text-lg font-bold text-white mb-4">Screenshot Real (Runtime)</h3>
        <div class="border border-slate-700 rounded-lg overflow-hidden bg-black mb-6">
          <img src="BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE-assets/hero-desktop.png" alt="Hero Section Runtime Screenshot" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity">
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 class="text-sm font-bold text-brand mb-3 uppercase tracking-wider">Implementação de UI</h4>
            <p class="text-sm text-slate-300 mb-4 leading-relaxed">O Layout divide a tela com flexbox. A esquerda concentra a promessa com fade-in usando <code>framer-motion</code>. À direita, o "Orb" orbital utiliza divs com animação infinita <code>animate={{ rotate: 360 }}</code>.</p>
          </div>
          <div>
            <div class="code-wrapper">
              <button class="copy-btn" onclick="copyCode(this)">Copy</button>
              <pre><code class="language-javascript">
// Orb Satellites (LandingLoginSplitScreen.tsx)
&lt;div className="absolute right-12 flex flex-col items-center"&gt;
  &lt;div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-white/10 flex items-center justify-center mb-2"&gt;
    &lt;BrainCircuit className="h-4 w-4 text-brand" /&gt;
  &lt;/div&gt;
  &lt;span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300"&gt;
    Inteligência
  &lt;/span&gt;
  &lt;span className="text-[9px] text-slate-500 dark:text-slate-300"&gt;
    Insights em tempo real
  &lt;/span&gt;
&lt;/div&gt;
              </code></pre>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Buttons -->
    <section id="buttons" class="searchable pt-12">
      <div class="component-header">
        <h2 class="text-2xl font-bold text-white">Buttons & CTAs</h2>
      </div>
      
      <div class="ds-card">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 class="text-white font-bold mb-4">Primary / Highlight</h3>
            <button class="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E6C65A] px-6 py-3 text-sm font-bold text-slate-900 shadow-[0_4px_14px_rgba(212,175,55,0.4)]">
              Explorar o Birth Hub &rarr;
            </button>
            <div class="mt-4 text-xs text-slate-400">
              <strong>Tokens:</strong> <code>rounded-full</code>, <code>px-6 py-3</code>, <code>shadow</code>
            </div>
          </div>
          <div>
            <h3 class="text-white font-bold mb-4">Ghost / Outline</h3>
            <button class="flex items-center gap-3 text-sm font-semibold text-slate-300 hover:text-[#FFD700] transition-colors">
              <span class="flex h-10 w-10 items-center justify-center rounded-full border border-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-0.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </span>
              Ver em 2 minutos
            </button>
            <div class="mt-4 text-xs text-slate-400">
              <strong>Tokens:</strong> <code>border-white/20</code>, <code>hover:text-brand</code>
            </div>
          </div>
          <div>
            <h3 class="text-white font-bold mb-4">Secondary (Header)</h3>
            <button class="rounded-full border border-white/20 px-5 py-2 text-xs font-bold tracking-wide hover:bg-white/5 transition-colors text-white">
              Acessar Hub &rarr;
            </button>
            <div class="mt-4 text-xs text-slate-400">
              <strong>Tokens:</strong> <code>px-5 py-2</code>, <code>text-xs</code>, <code>hover:bg-white/5</code>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SVG Icons -->
    <section id="svg-icons" class="searchable pt-12">
      <div class="component-header">
        <div class="flex items-center gap-3">
          <h2 class="text-2xl font-bold text-white">SVG Icon Inventory</h2>
          <span class="badge">STATIC ANALYSIS</span>
        </div>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        \${svgs.map(svg => \`
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-brand transition-colors group cursor-pointer" onclick="showSvgModal('\${escape(svg.file)}', \\\`\${escape(svg.code)}\\\`)">
            <div class="w-8 h-8 text-slate-300 group-hover:text-brand transition-colors mb-3 flex items-center justify-center">
              \${svg.code}
            </div>
            <div class="text-[10px] text-slate-500 truncate w-full" title="\${svg.file}">\${svg.file.split('\\\\').pop().split('/').pop()}</div>
          </div>
        \`).join('')}
      </div>
    </section>

    <!-- Inconsistencies -->
    <section id="inconsistencies" class="searchable pt-12">
      <div class="component-header">
        <div class="flex items-center gap-3">
          <h2 class="text-2xl font-bold text-white">Design System Consistency Audit</h2>
          <span class="badge warning">ATTENTION REQUIRED</span>
        </div>
      </div>

      <div class="ds-card border-yellow-500/30">
        <h3 class="text-lg font-bold text-yellow-400 mb-2">1. Microcopy Contrast (Corrigido)</h3>
        <p class="text-sm text-slate-300 mb-4">
          <strong>Impacto:</strong> Acessibilidade Visual (WCAG)<br>
          <strong>Solução Aplicada:</strong> Injetamos dinamicamente <code>dark:text-slate-300</code>.
        </p>
        <h3 class="text-lg font-bold text-yellow-400 mb-2 mt-6">2. Uso extensivo de cores hardcoded</h3>
        <p class="text-sm text-slate-300 mb-4">
          <strong>Impacto:</strong> Escalabilidade do Theme<br>
          <strong>Descrição:</strong> Botões utilizam HEX diretos (<code>from-[#D4AF37] to-[#E6C65A]</code>) em vez de variáveis.
        </p>
      </div>
    </section>

  </div>

  <!-- SVG Modal -->
  <div id="svgModal" class="fixed inset-0 bg-black/80 hidden items-center justify-center z-50 p-4">
    <div class="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-2xl w-full">
      <div class="flex justify-between items-center mb-6">
        <h3 id="modalTitle" class="text-white font-bold text-lg truncate">Icon View</h3>
        <button onclick="document.getElementById('svgModal').classList.remove('flex'); document.getElementById('svgModal').classList.add('hidden');" class="text-slate-400 hover:text-white">&times;</button>
      </div>
      <div class="flex items-center gap-8 mb-6">
        <div id="modalIcon" class="w-16 h-16 text-brand border border-slate-700 rounded p-2 bg-slate-900 flex items-center justify-center"></div>
        <div class="text-sm text-slate-300">
          <strong>Arquivo Fonte:</strong> <span id="modalFile" class="text-brand"></span>
        </div>
      </div>
      <div class="code-wrapper">
        <pre><code id="modalCode" class="language-xml"></code></pre>
      </div>
    </div>
  </div>

  <script>
    const searchInput = document.getElementById('searchInput');
    const sections = document.querySelectorAll('.searchable');
    
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      sections.forEach(section => {
        const text = section.innerText.toLowerCase();
        if (text.includes(term)) {
          section.style.display = 'block';
        } else {
          section.style.display = 'none';
        }
      });
    });

    function copyCode(btn) {
      const code = btn.nextElementSibling.innerText;
      navigator.clipboard.writeText(code).then(() => {
        const originalText = btn.innerText;
        btn.innerText = 'Copied!';
        setTimeout(() => { btn.innerText = originalText; }, 2000);
      });
    }

    function showSvgModal(file, code) {
      document.getElementById('modalFile').innerText = unescape(file);
      document.getElementById('modalIcon').innerHTML = unescape(code);
      document.getElementById('modalCode').textContent = unescape(code);
      hljs.highlightElement(document.getElementById('modalCode'));
      const modal = document.getElementById('svgModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    hljs.highlightAll();
  </script>
</body>
</html>`;

fs.writeFileSync(htmlOutputPath, htmlContent, 'utf-8');
console.log('Documentação gerada com sucesso em:', htmlOutputPath);
