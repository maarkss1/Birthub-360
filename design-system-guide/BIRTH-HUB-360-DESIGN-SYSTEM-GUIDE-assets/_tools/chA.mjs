import fs from 'node:fs';
import { ROOT, REPO, A, VPS, esc, img, code, codeFrom, table, kv, badge, tag, rgbToHex, lines, excerpt, exists, crop, defBlock } from './lib.mjs';

const compsOfFiles = (ctx, files) => [...new Set(files.flatMap((f) => (ctx.compsInFile[f] || []).slice(0, 4)))].slice(0, 8);
function resolveVar(val, vals, depth = 0) { if (!val || depth > 6) return val; const m = val.match(/^var\((--[\w-]+)(?:\s*,\s*(.+))?\)$/); if (m) { const r = vals[m[1]]; return r !== undefined ? resolveVar(r, vals, depth + 1) : (m[2] || val); } return val; }
const isColor = (v) => /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\(|oklab\(|color-mix\(|transparent)/i.test(String(v || '').trim());
export function overview(ctx) {
  const nShots = Object.values(ctx.shots).reduce((a, v) => a + Object.keys(v).length, 0);
  const comps = Object.keys(ctx.compshots).length; const groups = Object.values(ctx.agg).reduce((a, m) => a + Object.keys(m).length, 0);
  const pub = ctx.routes.filter((r) => !r.startsWith('/app')).length;
  return `<h1>Birth Hub 360° — Design System Bible</h1>
<p class="lead">Documentação do Design System <b>como ele realmente é renderizado</b>: cada afirmação abaixo vem do código-fonte do repositório, de um screenshot real do navegador ou de uma medição do DOM (<code>getBoundingClientRect</code> e <code>getComputedStyle</code>). Nada foi estimado a olho.</p>
<div class="stats">
<div><b>${ctx.routes.length}</b><span>rotas percorridas</span></div><div><b>${nShots}</b><span>screenshots de tela (viewport × rota)</span></div>
<div><b>${comps}</b><span>componentes com screenshot próprio</span></div><div><b>${groups}</b><span>variantes visuais medidas (botão, input, card…)</span></div>
<div><b>${ctx.tokens.tokens.length}</b><span>tokens CSS extraídos</span></div><div><b>${ctx.icons.custom.length + ctx.icons.lucide.length}</b><span>ícones catalogados (${ctx.icons.custom.length} próprios + ${ctx.icons.lucide.length} lucide)</span></div></div>
<h2>Como este documento foi produzido</h2>
<ol><li>Aplicação executada localmente (<code>tsx server.ts</code>, porta 3024) sobre o stack Docker do projeto (Postgres/Redis/MinIO/Meilisearch).</li>
<li>Navegador real (Google Chrome, headless, via Playwright) percorreu cada rota de <code>src/App.tsx</code> em 7 viewports: 1440×900, 1280×800, 1024×768, 768×1024, 430×932, 390×844, 375×812. O login foi feito manualmente pelo usuário; nenhuma credencial passou por este processo.</li>
<li>Para cada tela foram coletados: screenshot PNG, retângulos de landmarks, estilos computados de botões, inputs, cards, headings, badges, ícones e tipografia, além da árvore de componentes React (via fibras do React em modo dev).</li>
<li>Tokens foram lidos de <code>src/styles/globals.css</code> com número de linha e contagem de usos por regex em <code>src/**</code>.</li></ol>
<h2>Achados principais (verificados em runtime)</h2><ul class="findings">
<li><b>Fontes reais ≠ constituição.</b> O <code>CLAUDE.md</code> diz Sora + Inter; o navegador mede <b>Cabin</b> (títulos de UI), <b>IBM Plex Mono</b> (todo o corpo) e <b>Playfair Display</b> (hero/H1 do dashboard, carregada do Google Fonts). Ver <a href="#typography">Typography</a> e <a href="#consistency">Consistency Audit</a>.</li>
<li><b>Tokens vs. valores fixos:</b> ${ctx.tokens.hexDistinct} cores hex distintas e ${ctx.tokens.twDistinct} classes de paleta padrão do Tailwind digitadas diretamente em <code>src/</code>, fora dos tokens.</li>
<li>Rotas públicas: ${pub}. Demais rotas ficam sob <code>/app/*</code> (ProtectedRoute).</li></ul>
<div class="callout"><b>Limites honestos.</b> O banco local tem poucos dados (dashboards com R$ 0 e listas vazias). Portanto muitas telas são documentadas no <em>estado vazio real</em>. Rotas com parâmetro (<code>/book/:slug</code>, <code>/app/market-intelligence/accounts/:id</code>) só foram exercitadas com um slug/ID que não existe (estado de erro real). Modais que dependem de dados não foram abertos.</div>`;
}
export function brand(ctx) {
  fs.mkdirSync(`${ROOT}/brand`, { recursive: true });
  const dir = `${REPO}/identidade-visual/birthhub360/logos`; const items = [['birthhub360-simbolo.svg', 'Símbolo (emblema completo)', '≥ 96 px'], ['birthhub360-icone.svg', 'Ícone (redução estrutural)', '32–96 px · favicon'], ['birthhub360-logo-horizontal.svg', 'Logo horizontal (assinatura)', 'institucional']];
  for (const [f] of items) fs.copyFileSync(`${dir}/${f}`, `${ROOT}/brand/${f}`);
  const cards = items.map(([f, t, u]) => { const svg = fs.readFileSync(`${dir}/${f}`, 'utf8'); const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1]; const w = (svg.match(/<svg[^>]*\swidth="([^"]+)"/) || [])[1]; const h = (svg.match(/<svg[^>]*\sheight="([^"]+)"/) || [])[1]; const [x, y, vw, vh] = (vb || '0 0 1 1').split(/\s+/).map(Number);
    return `<div class="card brandcard"><div class="brandprev light"><img src="${A}/brand/${f}" alt="${t} sobre claro" style="max-height:120px;max-width:100%"></div><div class="brandprev dark"><img src="${A}/brand/${f}" alt="${t} sobre escuro" style="max-height:120px;max-width:100%"></div><h4>${t}</h4>${table(['Campo', 'Valor'], [['Arquivo', `<code>identidade-visual/birthhub360/logos/${f}</code> (cópia em <code>public/brand/</code>)`], ['viewBox', `<code>${vb}</code>`], ['width/height', `<code>${w || '—'} / ${h || '—'}</code>`], ['Proporção', `${(vw / vh).toFixed(3)} : 1`], ['Tamanho do arquivo', `${fs.statSync(`${dir}/${f}`).size} bytes`], ['Uso', u]])}</div>`; }).join('');
  const shotComps = ['BirthHubLogo', 'BirthHubSignature', 'BirthHubWordmark', 'BrandEmblemBadge', 'BrandOrb'].filter((n) => ctx.compshots[n]).map((n) => `<div class="card"><h4>${n} <small>(aplicado na aplicação)</small></h4>${img(ctx.compshots[n].shot, n)}<p>Medido: ${ctx.compshots[n].rect.w}×${ctx.compshots[n].rect.h}px em <code>${ctx.compshots[n].route}</code> · arquivo <code>${ctx.primaryDef(n)?.file}:${ctx.primaryDef(n)?.line}</code></p></div>`).join('');
  const idxLine = lines('index.html').findIndex((l) => l.includes('rel="icon"')) + 1;
  return `<h1>Brand System</h1><p>Ativos reais em <code>identidade-visual/birthhub360/</code>; a marca em código vive em <code>src/components/brand/BirthHubLogo.tsx</code> (gerado a partir dos SVGs) e <code>src/config/brand.ts</code>.</p>
<div class="grid3">${cards}</div>
<h2>Aplicação na interface (screenshots reais)</h2><div class="grid3">${shotComps || '<p>Nenhum componente de marca capturado.</p>'}</div>
<h2>Favicon</h2><p>Apenas SVG: <code>index.html:${idxLine}</code>. Não existem PNG/ICO de favicon no repositório (<code>public/</code> só tem <code>brand/</code>, <code>fonts/</code>, <code>tools/</code>, <code>data/</code>, <code>design-lab/</code> e dois PNGs soltos <code>q1.png</code>, <code>q2.png</code> sem uso de marca).</p>${codeFrom('index.html', idxLine, idxLine, 'html')}
<h2>Regras e tokens de marca do repositório</h2><p>O README da identidade documenta a paleta <b>anterior</b> (Obsidian/Snow White), segundo o próprio <code>CLAUDE.md</code>. A paleta viva está em <code>globals.css</code> — ver <a href="#colors">Colors</a>.</p>${codeFrom('identidade-visual/birthhub360/tokens/birthhub360.css', 1, Math.min(60, lines('identidade-visual/birthhub360/tokens/birthhub360.css').length), 'css', 'tokens de marca (legado)')}`;
}
export function tokens(ctx) {
  const T = ctx.tokens; const groups = {}; for (const t of T.tokens) (groups[t.group] = groups[t.group] || []).push(t);
  const blocks = T.blocks.map((b) => `<li><code>${esc(b.selector)}</code> — linhas ${b.start}–${b.end} (${b.count} declarações)</li>`).join('');
  const sect = Object.entries(groups).map(([g, arr]) => `<details ${g === 'color' ? 'open' : ''}><summary><b>${g}</b> — ${arr.length} tokens</summary>${table(['Token', 'Valor(es)', 'Origem (arquivo:linha)', 'Usos', 'Usado por (componentes)'], arr.map((t) => [`<code>${t.name}</code>`, Object.entries(t.values).map(([sel, v]) => `<div><small>${esc(sel)}</small> <code>${esc(v)}</code></div>`).join(''), t.origin.map((o) => `<code>src/styles/globals.css:${o.line}</code>`).join('<br>'), t.uses, compsOfFiles(ctx, t.usedIn.map((u) => u[0])).map((c) => `<a href="#comp/${c}">${c}</a>`).join(', ') || '—']), { filter: true })}</details>`).join('');
  return `<h1>Design Tokens</h1><p>Fonte única: <code>src/styles/globals.css</code>. Tailwind 4 CSS-first (sem <code>tailwind.config</code>): tokens nos blocos abaixo. “Usos” = ocorrências reais de <code>var(--token)</code> e da utilidade Tailwind equivalente em <code>src/**</code>.</p><ul>${blocks}</ul>${sect}
<h2>Definição real dos blocos</h2>${codeFrom('src/styles/globals.css', 155, 200, 'css', ':root (trecho)')}${codeFrom('src/styles/globals.css', 446, 490, 'css', '@theme (trecho)')}`;
}
export function colors(ctx) {
  const T = ctx.tokens.tokens; const light = {}, dark = {}, theme = {};
  for (const t of T) { for (const [sel, v] of Object.entries(t.values)) { if (sel === ':root') light[t.name] = v; else if (sel === '.dark') dark[t.name] = v; else if (sel === '@theme') theme[t.name] = v; } }
  const all = { ...theme, ...light }; const allD = { ...all, ...dark };
  const colorTokens = T.filter((t) => t.group === 'color' || isColor(resolveVar(Object.values(t.values)[0], all)));
  const rows = colorTokens.map((t) => { const l = resolveVar(light[t.name] ?? theme[t.name], all), d = resolveVar(dark[t.name] ?? light[t.name] ?? theme[t.name], allD); const sw = (v) => isColor(v) ? `<i class="sw" style="background:${esc(v)}"></i>` : '<i class="sw none"></i>';
    return [`${sw(l)}${sw(d)}`, `<code>${t.name}</code>`, `<code>${esc(l ?? '')}</code>`, `<code>${esc(d ?? '')}</code>`, `<code>src/styles/globals.css:${t.origin[0].line}</code>`, t.uses, compsOfFiles(ctx, t.usedIn.map((u) => u[0])).map((c) => `<a href="#comp/${c}">${c}</a>`).join(', ') || '—']; });
  const rt = (arr, n, kind) => table(['Amostra', 'Valor computado', 'Hex', 'Ocorrências nos elementos visíveis', 'Tags mais comuns'], arr.slice(0, n).map((c) => [`<i class="sw" style="background:${esc(c.value)}"></i>`, `<code>${esc(c.value)}</code>`, `<code>${rgbToHex(c.value)}</code>`, c.count, Object.entries(c.tags).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t, x]) => `${t}×${x}`).join(' ')]), { filter: true });
  const themeImgs = exists(`${ROOT}/states/theme__A.png`) ? `<div class="grid2"><div class="card"><h4>Tema A (padrão ao abrir)</h4>${img('states/theme__A.png', 'tema A')}</div><div class="card"><h4>Tema B (após “Alternar tema”)</h4>${img('states/theme__B.png', 'tema B')}</div></div>${ctx.states.themes[0] ? `<p>Classe do <code>&lt;html&gt;</code>: antes <code>${esc(ctx.states.themes[0].before)}</code> → depois <code>${esc(ctx.states.themes[0].after)}</code>. Fundo do body no tema B: <code>${esc(ctx.states.themes[0].afterSnap?.body)}</code>.</p>` : ''}` : '<p>Screenshots de tema indisponíveis nesta execução.</p>';
  const grad = ctx.gradients.slice(0, 12).map((g) => [`<div class="gradbox" style="background:${esc(g.value)}"></div>`, `<code>${esc(g.value)}</code>`, g.count]);
  const hx = ctx.tokens.hardcodedHex.slice(0, 40).map((h) => [`<i class="sw" style="background:${h.value}"></i>`, `<code>${h.value}</code>`, h.count, h.files.map((f) => `<code>${f[0]}</code>×${f[1]}`).join('<br>')]);
  const tw = ctx.tokens.twDefaultPalette.slice(0, 30).map((h) => [`<code>${h.value}</code>`, h.count, h.files.map((f) => `<code>${f[0]}</code>×${f[1]}`).join('<br>')]);
  return `<h1>Colors</h1><h2>Tokens de cor (claro | escuro)</h2><p>Cada linha mostra dois swatches reais: o primeiro é o valor no tema claro (<code>:root</code>), o segundo no escuro (<code>.dark</code>); variáveis foram resolvidas recursivamente.</p>${table(['Claro | Escuro', 'Token', 'Claro', 'Escuro', 'Origem', 'Usos', 'Componentes'], rows, { filter: true })}
<h2>Tema claro e escuro na aplicação</h2>${themeImgs}
<h2>Cores realmente renderizadas (DOM, todas as telas em 1440px)</h2><h3>Fundos</h3>${rt(ctx.colors.bg, 30)}<h3>Texto</h3>${rt(ctx.colors.color, 20)}<h3>Bordas</h3>${rt(ctx.colors.border, 15)}
<h2>Gradientes</h2>${table(['Amostra', 'Valor computado', 'Ocorrências'], grad)}
<h2>Cores hex hardcoded em <code>src/</code> (${ctx.tokens.hexDistinct} distintas)</h2>${table(['Amostra', 'Hex', 'Ocorrências', 'Arquivos principais'], hx, { filter: true })}
<h2>Paleta padrão do Tailwind fora dos tokens (${ctx.tokens.twDistinct} classes distintas)</h2>${table(['Classe', 'Ocorrências', 'Arquivos principais'], tw, { filter: true })}`;
}
export function typography(ctx) {
  const decl = codeFrom('src/styles/globals.css', 10, 20, 'css', 'declaração de fontes');
  const fam = {}; for (const t of ctx.typoList) { const f = t.key.split('|')[0].split(',')[0].replace(/"/g, ''); const a = (fam[f] = fam[f] || { count: 0, comps: {} }); a.count += t.count; for (const s of t.samples) for (const c of s.comps || []) a.comps[c] = (a.comps[c] || 0) + 1; }
  const famRows = Object.entries(fam).sort((a, b) => b[1].count - a[1].count).map(([f, v]) => [`<span style="font-family:'${f}'">${esc(f)} — Aa Bb 0123</span>`, v.count, Object.entries(v.comps).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => `<a href="#comp/${c}">${c}</a>`).join(', ')]);
  const rows = ctx.typoList.slice(0, 45).map((t) => { const [f, s, w, lh, ls, tt] = t.key.split('|'); const smp = t.samples[0]; return [`<span style="font-family:${f};font-size:${Math.min(parseFloat(s), 34)}px;font-weight:${w};letter-spacing:${ls};text-transform:${tt}">${esc(smp?.text || 'Aa')}</span>`, `<code>${esc(f.split(',')[0])}</code>`, s, w, lh, ls, tt, t.count, [...new Set(t.samples.flatMap((x) => x.comps || []))].slice(0, 3).map((c) => `<a href="#comp/${c}">${c}</a>`).join(', ')]; });
  const heads = ctx.aggList('heading').slice(0, 14).map((h) => { const s = h.sample; return [s.shot ? img(s.shot, s.text) : '', `<code>${s.tag}</code> “${esc(s.text)}”`, `${s.styles.fontFamily.split(',')[0]} ${s.styles.fontSize}/${s.styles.lineHeight} ${s.styles.fontWeight} ls ${s.styles.letterSpacing}`, `${s.rect.width}×${s.rect.height}`, h.count, `<code>${esc(h.route)}</code>`, (s.comps || []).slice(0, 3).map((c) => `<a href="#comp/${c}">${c}</a>`).join(' › ')]; });
  const idx = (n) => { const d = ctx.compindex[n]?.[0]; return d ? `<code>${d.file}:${d.line}</code>` : ''; };
  const h1Line = lines('src/styles/globals.css').findIndex((l) => /^\s*h1[\s,{]/.test(l)) + 1;
  return `<h1>Typography</h1><h2>Declaração no código</h2><p>Comentário e <code>@import</code> reais no topo do CSS:</p>${decl}
<h2>Famílias realmente renderizadas</h2><p>Contagem de elementos com texto em todas as telas (1440px). Compare com <code>CLAUDE.md</code>, que cita Sora/Inter.</p>${table(['Família', 'Elementos', 'Componentes'], famRows)}
<h2>Escala medida no navegador</h2>${table(['Exemplo real', 'Família', 'Tamanho', 'Peso', 'Line-height', 'Letter-spacing', 'Transform', 'Ocorrências', 'Componentes'], rows, { filter: true })}
<h2>Headings (H1–H6) com screenshot</h2>${table(['Screenshot', 'Elemento', 'Fonte medida', 'Dimensões', 'Ocorrências', 'Rota', 'Componentes'], heads)}
${h1Line ? `<h2>Regra base de headings</h2>${codeFrom('src/styles/globals.css', h1Line, Math.min(h1Line + 14, lines('src/styles/globals.css').length), 'css', '@layer base')}` : ''}`;
}
export function spacing(ctx) {
  const rows = []; for (const r of ctx.routes) { const d = ctx.shots[r][1440]; if (!d) continue; for (const k of ['aside', 'header', 'main']) for (const l of (d.landmarks[k] || []).slice(0, 1)) rows.push([`<code>${esc(r)}</code>`, k, `${l.rect.width}×${l.rect.height}`, `${l.styles.paddingTop} ${l.styles.paddingRight} ${l.styles.paddingBottom} ${l.styles.paddingLeft}`, l.styles.gap]); }
  const sp = ctx.tokens.tokens.filter((t) => t.group === 'spacing');
  const gapCounts = {}; for (const r of ctx.routes) for (const g of ctx.shots[r][1440]?.groups?.card || []) { const k = g.samples[0]?.styles.paddingTop; if (k) gapCounts[k] = (gapCounts[k] || 0) + g.count; }
  return `<h1>Spacing</h1><p>Não há escala de espaçamento customizada: o projeto usa a escala padrão do Tailwind 4 (<code>--spacing: 0.25rem</code>). Tokens de espaçamento declarados: ${sp.length ? sp.map((t) => `<code>${t.name}</code>`).join(', ') : 'nenhum'}.</p>
<h2>Padding de cards medido (px → nº de cards)</h2>${table(['padding-top', 'Cards'], Object.entries(gapCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => [`<code>${k}</code>`, v]))}
<h2>Espaçamento interno dos landmarks por tela</h2>${table(['Rota', 'Landmark', 'W×H (px)', 'padding T R B L', 'gap'], rows, { filter: true })}`;
}
export function grid(ctx) {
  const cnt = (rx) => { const o = {}; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = `${d}/${f.name}`; if (f.isDirectory()) { if (f.name !== 'node_modules') walk(p); } else if (/\.tsx$/.test(f.name)) { for (const m of fs.readFileSync(p, 'utf8').matchAll(rx)) o[m[0]] = (o[m[0]] || 0) + 1; } } }; walk(`${REPO}/src`); return Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 14); };
  const gc = cnt(/(?<![\w-])(?:(?:sm|md|lg|xl|2xl):)?grid-cols-\d+(?![\w-])/g), mw = cnt(/(?<![\w-])max-w-(?:\d?xl|screen-\w+|\[[^\]]+\]|prose)(?![\w-])/g);
  const bp = ctx.tokens.tokens.filter((t) => t.group === 'breakpoint');
  return `<h1>Grid</h1><p>Contagens reais de utilidades em <code>src/**/*.tsx</code>. Breakpoints customizados declarados: ${bp.length ? bp.map((t) => `<code>${t.name}: ${Object.values(t.values)[0]}</code>`).join(', ') : 'nenhum (Tailwind padrão: sm 640, md 768, lg 1024, xl 1280, 2xl 1536)'}.</p><div class="grid2"><div>${table(['grid-cols', 'Ocorrências'], gc.map(([k, v]) => [`<code>${k}</code>`, v]))}</div><div>${table(['max-w', 'Ocorrências'], mw.map(([k, v]) => [`<code>${k}</code>`, v]))}</div></div>`;
}
export function layout(ctx) {
  const r = '/app'; const rows = VPS.map(([w, h]) => { const d = ctx.shots[r]?.[w]; if (!d) return null; const g = (k) => d.landmarks[k]?.[0]; const f = (l) => (l ? `${l.rect.width}×${l.rect.height} @${l.rect.x},${l.rect.y}` : '—'); return [`${w}×${h}`, f(g('aside')), f(g('header')), f(g('main')), d.scroll.docW, d.hOverflow ? badge('overflow-x', 'bad') : badge('ok', 'ok')]; }).filter(Boolean);
  const shell = ['MainLayout', 'Sidebar', 'AppTopbar', 'AppLayout'].filter((n) => ctx.compindex[n]).map((n) => { const d = ctx.primaryDef(n); const b = defBlock(d.file, d.line, 40); return `<h3>${n}</h3>${code(d.file, b.start, b.end, b.code, 'tsx', b.truncated ? 'trecho' : '')}`; }).join('');
  const sc = ctx.shots[r]?.[1440];
  const svg = sc ? `<svg viewBox="0 0 1440 900" class="schem">${['aside', 'header', 'main'].flatMap((k) => (sc.landmarks[k] || []).map((l) => `<rect x="${l.rect.x}" y="${l.rect.y}" width="${l.rect.width}" height="${l.rect.height}" class="sr sr-${k}"/><text x="${l.rect.x + 8}" y="${l.rect.y + 24}">${k} ${l.rect.width}×${l.rect.height}</text>`)).join('')}</svg>` : '';
  return `<h1>Layout</h1><p>Casca autenticada (<code>/app/*</code>): <code>AppLayout → MainLayout → Sidebar + AppTopbar + &lt;main&gt;</code>. Medidas reais de <code>/app</code> por viewport:</p>${table(['Viewport', 'aside', 'header', 'main', 'scrollWidth', 'Overflow horizontal'], rows)}<h2>Estrutura medida em 1440×900</h2>${svg}${sc ? img(sc.screenshot, 'layout 1440') : ''}<h2>Código da casca</h2>${shell}`;
}
