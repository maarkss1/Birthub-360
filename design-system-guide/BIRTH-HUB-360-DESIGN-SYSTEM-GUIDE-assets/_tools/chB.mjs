import fs from 'node:fs';
import { ROOT, REPO, A, VPS, esc, img, code, codeFrom, table, kv, badge, rgbToHex, lines, excerpt, exists, crop, defBlock } from './lib.mjs';

const link = (n) => `<a href="#comp/${n}">${n}</a>`;
const STYLE_KEYS = ['width', 'height', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'gap', 'borderRadius', 'borderTopWidth', 'borderTopColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'boxShadow', 'backgroundColor', 'backgroundImage', 'color', 'display', 'position', 'zIndex', 'transition'];
const desc = (file, line) => { const L = lines(file); const out = []; for (let i = line - 2; i >= 0 && out.length < 8; i--) { const t = L[i].trim(); if (/^(\*\/|\/\*\*|\*|\/\/)/.test(t) || /^\*/.test(t)) out.unshift(t.replace(/^(\/\*\*?|\*\/|\*|\/\/)\s?/, '')); else if (t === '') { if (out.length) break; } else break; } return out.join(' ').trim(); };
const findProps = (file, name) => { const L = lines(file); const i = L.findIndex((l) => new RegExp(`^(export\\s+)?(interface|type)\\s+${name}Props\\b`).test(l)); if (i < 0) return null; return defBlock(file, i + 1, 45); };
const findCva = (file) => { const L = lines(file); const i = L.findIndex((l) => /cva\(/.test(l)); if (i < 0) return null; let d = 0, e = i; for (let j = i; j < L.length && j < i + 120; j++) { d += (L[j].match(/\(/g) || []).length - (L[j].match(/\)/g) || []).length; e = j; if (d <= 0 && j > i - 1 && /\);?\s*$/.test(L[j])) break; } return { start: i + 1, end: e + 1, code: L.slice(i, e + 1).join('\n') }; };
const tokenNames = (ctx) => ctx.tokens.tokens.map((t) => t.name);
function tokensIn(ctx, text) { const found = new Set(); for (const m of text.matchAll(/var\((--[\w-]+)/g)) found.add(m[1]); const cols = new Set(ctx.tokens.tokens.filter((t) => t.name.startsWith('--color-')).map((t) => t.name.slice(8))); for (const m of text.matchAll(/(?<![\w-])(?:[a-z-]+:)*(?:bg|text|border|ring|from|to|via|fill|stroke|shadow|outline)-([a-z][\w-]*)/g)) { let c = m[1].replace(/\/\d+$/, ''); if (cols.has(c)) found.add('--color-' + c); } for (const m of text.matchAll(/(?<![\w-])rounded-(card(?:-lg)?)\b/g)) found.add('--radius-' + m[1]); return [...found].slice(0, 24); }

export function compPage(ctx, name) {
  const def = ctx.primaryDef(name); if (!def) return '';
  const cs = ctx.compshots[name]; const routes = ctx.routesByComp[name] || []; const b = defBlock(def.file, def.line, 90);
  const d = desc(def.file, def.line); const props = findProps(def.file, name); const cva = findCva(def.file);
  const toks = tokensIn(ctx, b.code + (cva?.code || ''));
  const propRows = cs ? Object.entries(cs.props).map(([k, v]) => [`<code>${esc(k)}</code>`, `<code>${esc(v)}</code>`]) : [];
  return `<section class="page comp" id="comp/${name}" data-title="${name}"><nav class="crumbs"><a href="#components">Components</a> › <a href="#components">${esc(def.file.split('/').slice(0, -1).join('/'))}</a> › <b>${name}</b></nav>
<h1>${name}</h1><p>${d ? esc(d) : '<em>Sem comentário de documentação no código.</em>'}</p>
<div class="refs"><span class="ref"><b>[ARQUIVO]</b> <code>${def.file}:${def.line}</code></span> <span class="ref"><b>[TELAS]</b> ${routes.length}</span> ${def.exported ? '' : badge('não exportado', '')}</div>
${cs ? `<h3>Screenshot real</h3>${img(cs.shot, name)}<div class="cap">Primeira instância visível em <code>${esc(cs.route)}</code> · ${cs.rect.w}×${cs.rect.h}px · &lt;${cs.tag}&gt;</div><h3>Medidas reais (DOM)</h3>${kv(cs.styles)}<h3>Elemento renderizado (HTML real)</h3>${code(null, 0, 0, cs.html, 'html', 'outerHTML (truncado)')}` : '<div class="callout">Este componente não teve instância visível nas telas percorridas (ou renderiza <code>display: contents</code>/overlay). Não há screenshot próprio para ele — nada foi simulado.</div>'}
<h3>Props (chaves observadas em uso real)</h3>${propRows.length ? table(['Prop', 'Valor/tipo na 1ª instância'], propRows) : '<p>Nenhuma prop observada (ou componente sem props).</p>'}
${props ? code(def.file, props.start, props.end, props.code, 'tsx', 'interface de props') : ''}
${cva ? `<h3>Variantes (cva)</h3>${code(def.file, cva.start, cva.end, cva.code, 'tsx', 'class-variance-authority')}` : ''}
<h3>Código</h3>${code(def.file, b.start, b.end, b.code, 'tsx', b.truncated ? 'truncado em 90 linhas' : '')}
<h3>Tokens referenciados no código</h3><p>${toks.length ? toks.map((t) => `<code>${t}</code>`).join(' ') : 'Nenhum token nomeado encontrado no trecho.'}</p>
<h3>Telas onde aparece</h3><p>${routes.map((r) => `<a href="#screen/${r}"><code>${esc(r)}</code></a>`).join(' · ') || '—'}</p></section>`;
}
export function screenPage(ctx, route) {
  const S = ctx.shots[route]; const d = S[1440]; const root = ctx.rootFor(route); const rc = root.comp ? ctx.primaryDef(root.comp) : null;
  const redirected = d.finalUrl && !d.finalUrl.endsWith(route) && d.finalUrl.replace('http://localhost:3024', '') !== route;
  const comps = ctx.compsByRoute[route] || [];
  const lm = ['aside', 'nav', 'header', 'main', 'h1', 'h2', 'dialog', 'footer'].flatMap((k) => (d.landmarks[k] || []).slice(0, 2).map((l) => [k, `${l.rect.width}×${l.rect.height}`, `${l.rect.x}, ${l.rect.y}`, `${l.styles.paddingTop} ${l.styles.paddingRight} ${l.styles.paddingBottom} ${l.styles.paddingLeft}`, l.styles.gap, l.styles.borderRadius, `${l.styles.fontSize}/${l.styles.fontWeight} ${esc(l.styles.fontFamily.split(',')[0])}`, `<code>${esc(l.styles.backgroundColor)}</code>`, l.styles.display, l.styles.position, l.styles.zIndex]));
  const svg = `<svg viewBox="0 0 1440 900" class="schem">${['aside', 'header', 'main', 'dialog'].flatMap((k) => (d.landmarks[k] || []).map((l) => `<rect x="${l.rect.x}" y="${l.rect.y}" width="${l.rect.width}" height="${Math.min(l.rect.height, 900 - l.rect.y)}" class="sr sr-${k}"/><text x="${l.rect.x + 8}" y="${l.rect.y + 22}">${k} ${l.rect.width}×${l.rect.height}</text>`)).join('')}${(d.groups?.card || []).flatMap((g) => g.samples).slice(0, 8).map((s) => `<rect x="${s.rect.x}" y="${s.rect.y}" width="${s.rect.width}" height="${s.rect.height}" class="sr sr-card"/>`).join('')}</svg>`;
  const resp = VPS.map(([w, h]) => S[w] ? `<figure class="vp"><figcaption>${w}×${h} · scrollW ${S[w].scroll.docW}px ${S[w].hOverflow ? '· <b class="bad">overflow-x</b>' : ''} · alvos&lt;44px: ${S[w].touch.small}/${S[w].touch.total}</figcaption>${img(S[w].screenshot, `${route} ${w}`)}</figure>` : `<figure class="vp"><figcaption>${w}×${h}</figcaption><div class="missing">não capturado</div></figure>`).join('');
  const stateShots = route === '/app' ? `<h2>Estados</h2><p>Ver capítulos <a href="#states">States</a> e <a href="#modals">Modals</a> (tema, paleta de comandos, menu do usuário).</p>` : '';
  const nameText = d.h1?.[0] || route;
  const cgroups = ['button', 'input', 'card', 'badge', 'table', 'dialog'].map((c) => `${c}: ${(d.groups?.[c] || []).reduce((a, g) => a + g.count, 0)}`).join(' · ');
  const rl = root.line; const routeCode = rl ? codeFrom('src/App.tsx', Math.max(1, rl), Math.min(ctx.appLines.length, rl + 8), 'tsx', 'declaração da rota') : '';
  const rootCode = rc ? (() => { const b = defBlock(rc.file, rc.line, 60); return code(rc.file, b.start, b.end, b.code, 'tsx', b.truncated ? 'trecho do componente raiz' : 'componente raiz'); })() : '';
  return `<section class="page screen" id="screen/${route}" data-title="Tela ${route}"><nav class="crumbs"><a href="#route-matrix">Route Matrix</a> › <b>${esc(route)}</b></nav>
<h1>${esc(nameText.length > 60 ? route : nameText)} <small><code>${esc(route)}</code></small></h1>
<div class="refs"><span class="ref"><b>[TELA REAL]</b> renderizada pela rota ${redirected ? `(redireciona para <code>${esc(d.finalUrl.replace('http://localhost:3024', ''))}</code>)` : ''}</span><span class="ref"><b>[ROTA]</b> <code>${esc(route)}</code></span><span class="ref"><b>[ARQUIVO]</b> ${rc ? `<code>${rc.file}:${rc.line}</code>` : 'n/d'}</span><span class="ref"><b>[COMPONENTES]</b> ${comps.length}</span></div>
<h2>Screenshot real</h2>${img(d.screenshot, route)}<div class="cap">${d.screenshot} · viewport ${d.viewport.w}×${d.viewport.h} · ${d.timestamp}</div>
<h2>Estrutura</h2><p>Retângulos medidos do DOM (aside/header/main/dialog e cards):</p>${svg}
<h2>Dimensões reais</h2>${table(['Landmark', 'W×H', 'x, y', 'padding', 'gap', 'radius', 'fonte', 'background', 'display', 'position', 'z'], lm)}
<p>Documento: scrollWidth ${d.scroll.docW}px, scrollHeight ${d.scroll.docH}px. Elementos visíveis por tipo — ${cgroups}.</p>
<h2>Componentes utilizados (${comps.length})</h2><p class="chips">${comps.map(link).join(' ')}</p>
<h2>Código</h2>${routeCode}${rootCode}
<h2>Responsividade</h2><div class="vps">${resp}</div>${stateShots}
${d.consoleErrors?.length ? `<h2>Erros de console observados</h2>${code(null, 0, 0, d.consoleErrors.join('\n'), 'text')}` : ''}</section>`;
}
export function components(ctx) {
  const names = Object.keys(ctx.routesByComp).sort();
  const byDir = {}; for (const n of names) { const f = ctx.primaryDef(n).file; const dir = f.split('/').slice(0, f.startsWith('src/features') ? 3 : 3).join('/'); (byDir[dir] = byDir[dir] || []).push(n); }
  const withShot = names.filter((n) => ctx.compshots[n]).length;
  const sect = Object.entries(byDir).sort().map(([dir, arr]) => `<details><summary><b>${dir}</b> — ${arr.length}</summary><div class="compgrid">${arr.map((n) => `<a class="compcard" href="#comp/${n}">${ctx.compshots[n] ? img(ctx.compshots[n].shot, n, 'thumb') : '<div class="nothumb">sem instância visível</div>'}<b>${n}</b></a>`).join('')}</div></details>`).join('');
  return `<h1>Components</h1><p>Somente componentes <b>definidos em <code>src/</code> e efetivamente renderizados</b> em alguma tela (detectados na árvore de fibras do React): ${names.length} componentes, ${withShot} com screenshot próprio. Arquivos que não renderizam nada nas telas percorridas não entram como “componente”.</p>${sect}`;
}
function groupCards(ctx, cat, n = 16, extra = '') {
  const list = ctx.aggList(cat).filter((g) => g.sample).slice(0, n);
  return list.map((g) => { const s = g.sample; const routes = Object.keys(g.routes); const src = (s.comps || []).find((c) => ctx.compindex[c]); const def = src ? ctx.primaryDef(src) : null;
    return `<div class="item"><div class="itemhead"><h4>${esc(s.text || `<${s.tag}>`)}</h4><span>${g.count} ocorrência(s) em ${routes.length} tela(s)</span></div>
<div class="itemgrid"><div>${s.shot ? img(s.shot, s.text) : crop(ctx.shots[g.route]?.[1440]?.screenshot, s.rect, g.vw.w, g.vw.h, { maxW: 380 })}</div>
<div>${table(['Medida', 'Valor'], [['tamanho', `${s.rect.width}×${s.rect.height}px`], ['padding', `${s.styles.paddingTop} ${s.styles.paddingRight} ${s.styles.paddingBottom} ${s.styles.paddingLeft}`], ['radius', s.styles.borderRadius], ['borda', `${s.styles.borderTopWidth} ${s.styles.borderTopStyle} <code>${s.styles.borderTopColor}</code>`], ['fonte', `${esc(s.styles.fontFamily.split(',')[0])} ${s.styles.fontSize}/${s.styles.lineHeight} ${s.styles.fontWeight}`], ['fundo', `<code>${esc(s.styles.backgroundColor)}</code> ${s.styles.backgroundImage !== 'none' ? '+ gradiente' : ''}`], ['cor', `<code>${esc(s.styles.color)}</code>`], ['sombra', `<code>${esc(s.styles.boxShadow.slice(0, 80))}</code>`], ['transition', `<code>${esc((s.styles.transition || '').slice(0, 80))}</code>`]])}</div></div>
<div class="refs"><span class="ref"><b>[ARQUIVO]</b> ${def ? `<code>${def.file}:${def.line}</code>` : 'n/d'}</span><span class="ref"><b>[COMPONENTES]</b> ${(s.comps || []).slice(0, 4).map((c) => ctx.compindex[c] ? link(c) : c).join(' › ')}</span><span class="ref"><b>[TELAS]</b> ${routes.slice(0, 5).map((r) => `<a href="#screen/${r}"><code>${esc(r)}</code></a>`).join(' ')}${routes.length > 5 ? ' …' : ''}</span></div>
<details><summary>HTML real renderizado</summary>${code(null, 0, 0, s.html, 'html', 'outerHTML (truncado em 700 chars)')}</details></div>`; }).join('');
}
export function buttons(ctx) {
  const list = ctx.aggList('button'); const heights = {}, rads = {}; for (const g of list) { const s = g.sample; if (!s) continue; heights[s.rect.height] = (heights[s.rect.height] || 0) + g.count; rads[s.styles.borderRadius] = (rads[s.styles.borderRadius] || 0) + g.count; }
  const def = ctx.primaryDef('Button'); const cva = def ? (() => { const c = findCva(def.file); return c ? code(def.file, c.start, c.end, c.code, 'tsx', 'variantes do Button (cva)') : ''; })() : '';
  const stateImgs = ctx.states.states.filter((s) => /^button|^nav-item/.test(s.name) && s.ok).map((s) => stateBlock(ctx, s)).join('');
  return `<h1>Buttons</h1><p>${list.length} assinaturas visuais distintas de <code>&lt;button&gt;</code> em todas as telas (mesma altura+padding+radius+fonte+cor+fundo+sombra). Botões são agrupados por assinatura computada, não por string de classes.</p>
<h2>Distribuição medida</h2><div class="grid2"><div>${table(['Altura (px)', 'Botões'], Object.entries(heights).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k, v]))}</div><div>${table(['border-radius', 'Botões'], Object.entries(rads).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [`<code>${k}</code>`, v]))}</div></div>
<h2>Primitivo <code>Button</code></h2>${def ? `<p>Arquivo <code>${def.file}:${def.line}</code>. Comparar com o uso real: nas telas medidas, botões com componente raiz <code>Button</code>: ${list.filter((g) => (g.sample?.comps || []).includes('Button')).reduce((a, g) => a + g.count, 0)} de ${list.reduce((a, g) => a + g.count, 0)}.</p>${cva}` : '<p>Button.tsx não encontrado.</p>'}
<h2>Estados capturados</h2>${stateImgs || '<p>Estados não capturados nesta execução.</p>'}
<h2>Variantes reais encontradas nas telas</h2>${groupCards(ctx, 'button', 18)}`;
}
export function stateBlock(ctx, s) {
  const st = s.states; const keys = ['backgroundColor', 'color', 'borderTopColor', 'boxShadow', 'transform', 'outlineStyle', 'outlineColor', 'outlineWidth', 'opacity', 'cursor'];
  const names = ['default', 'hover', 'focus', 'active']; const diff = keys.map((k) => [`<code>${k}</code>`, ...names.map((n) => `<code>${esc(String(st[n]?.[k] ?? '—').slice(0, 60))}</code>`)]);
  return `<div class="item"><div class="itemhead"><h4>${esc(s.name)}</h4><span>${esc(s.route)}</span></div><div class="statestrip">${names.map((n) => `<figure><figcaption>${n}</figcaption>${img(`states/${s.name}__${n}.png`, `${s.name} ${n}`)}</figure>`).join('')}</div>${table(['Propriedade', ...names], diff)}<p>transition: <code>${esc(st.default?.transition || '')}</code></p></div>`;
}
export function inputs(ctx) {
  const stateImgs = ctx.states.states.filter((s) => /^input/.test(s.name) && s.ok).map((s) => stateBlock(ctx, s)).join('');
  const errImg = exists(`${ROOT}/states/login-error-email-invalido.png`) ? `<h3>Estado de erro real (e-mail inválido no login)</h3>${img('states/login-error-email-invalido.png', 'erro')}` : '';
  const defs = ['Input', 'Select', 'Textarea', 'CyberInput', 'Toggle', 'Label'].filter((n) => ctx.compindex[n]).map((n) => { const d = ctx.primaryDef(n); const b = defBlock(d.file, d.line, 60); return `<h3>${n}</h3>${ctx.compshots[n] ? img(ctx.compshots[n].shot, n) : ''}${code(d.file, b.start, b.end, b.code)}`; }).join('');
  return `<h1>Inputs</h1><p>Campos capturados no DOM real: ${ctx.aggList('input').length} assinaturas de input/select/textarea, ${ctx.aggList('checkbox').length} de checkbox/radio/switch.</p><h2>Estados</h2>${stateImgs || '<p>—</p>'}${errImg}<h2>Variantes reais</h2>${groupCards(ctx, 'input', 12) || '<p>Nenhum input visível nas telas autenticadas em estado vazio; ver login (estados acima).</p>'}${groupCards(ctx, 'checkbox', 6)}<h2>Primitivos</h2>${defs}`;
}
export function cards(ctx) {
  const defs = ['Card', 'KpiCard', 'HolographicCard', 'TiltCard'].filter((n) => ctx.compindex[n]).map((n) => { const d = ctx.primaryDef(n); const b = defBlock(d.file, d.line, 50); return `<h3>${n}</h3>${ctx.compshots[n] ? img(ctx.compshots[n].shot, n) : ''}${code(d.file, b.start, b.end, b.code)}`; }).join('');
  const cva = (() => { const d = ctx.primaryDef('Card'); if (!d) return ''; const c = findCva(d.file); return c ? code(d.file, c.start, c.end, c.code, 'tsx', 'Card — variantes/padding (cva)') : ''; })();
  return `<h1>Cards</h1><p>Superfícies com radius ≥ 8px, borda ou sombra, fundo opaco/translúcido e conteúdo — ${ctx.aggList('card').length} assinaturas medidas (a largura entra na assinatura, portanto o mesmo componente em larguras diferentes conta separadamente).</p>${cva}<h2>Cards reais nas telas</h2>${groupCards(ctx, 'card', 18)}<h2>Primitivos</h2>${defs}`;
}
export function navigation(ctx) {
  const rows = VPS.map(([w, h]) => { const d = ctx.shots['/app']?.[w]; if (!d) return null; const a = d.landmarks.aside?.[0], hd = d.landmarks.header?.[0], n = d.landmarks.nav?.[0]; const f = (l) => (l ? `${l.rect.width}×${l.rect.height}` : 'oculto/ausente'); return [`${w}×${h}`, f(a), f(hd), f(n)]; }).filter(Boolean);
  const comps = ['Sidebar', 'AppTopbar', 'MainLayout', 'CommandPalette', 'TabNavCards', 'Pagination', 'ThemeSwitcher'].filter((n) => ctx.compindex[n]).map((n) => { const d = ctx.primaryDef(n); const b = defBlock(d.file, d.line, 45); return `<h3>${n}</h3>${ctx.compshots[n] ? img(ctx.compshots[n].shot, n) : '<p><em>sem instância visível no estado capturado</em></p>'}<p><code>${d.file}:${d.line}</code></p>${code(d.file, b.start, b.end, b.code)}`; }).join('');
  const st = ctx.states.states.filter((s) => /^nav-item/.test(s.name) && s.ok).map((s) => stateBlock(ctx, s)).join('');
  const mob = ['mobile-app-closed', 'mobile-app-menu-open'].filter((n) => exists(`${ROOT}/states/${n}.png`)).map((n) => `<figure class="vp"><figcaption>${n}</figcaption>${img(`states/${n}.png`, n)}</figure>`).join('');
  return `<h1>Navigation</h1><h2>Largura da navegação por viewport (<code>/app</code>)</h2>${table(['Viewport', 'aside', 'header', 'nav'], rows)}<h2>Estados dos itens de navegação</h2>${st}<h2>Mobile (390×844)</h2><div class="vps">${mob || '<p>não capturado</p>'}</div><h2>Componentes</h2>${comps}`;
}
export function tables(ctx) {
  const names = Object.keys(ctx.compindex).filter((n) => /Table|Grid$|List$|Pagination/.test(n) && ctx.routesByComp[n]);
  const g = ctx.aggList('table');
  return `<h1>Tables</h1><p>Elementos <code>&lt;table&gt;</code>/<code>role=table|grid</code> visíveis nas telas em estado vazio: ${g.reduce((a, x) => a + x.count, 0)} (${g.length} assinaturas).</p>${groupCards(ctx, 'table', 8)}<h2>Componentes de tabela/lista renderizados</h2><p class="chips">${names.map(link).join(' ') || '—'}</p><h2>Primitivos</h2>${['Table', 'VirtualTable', 'CompareTable', 'Pagination'].filter((n) => ctx.compindex[n]).map((n) => { const d = ctx.primaryDef(n); const b = defBlock(d.file, d.line, 40); return `<h3>${n}</h3><p><code>${d.file}:${d.line}</code> · ${ctx.routesByComp[n] ? 'renderizado em ' + ctx.routesByComp[n].length + ' tela(s)' : 'não renderizado nas telas percorridas (estado vazio)'}</p>${ctx.compshots[n] ? img(ctx.compshots[n].shot, n) : ''}${code(d.file, b.start, b.end, b.code)}`; }).join('')}`;
}
export function charts(ctx) {
  const names = Object.keys(ctx.compindex).filter((n) => /Chart|Funnel|Donut|Heatmap|Bars|Sparkline|Orb|Gauge|Kpi/.test(n));
  const rc = Object.keys(ctx.compshots).filter((n) => names.includes(n));
  const rechartsFiles = []; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = `${d}/${f.name}`; if (f.isDirectory()) { if (f.name !== 'node_modules') walk(p); } else if (/\.tsx$/.test(f.name) && fs.readFileSync(p, 'utf8').includes("from 'recharts'")) rechartsFiles.push(p.replace(REPO + '/', '')); } }; walk(`${REPO}/src`);
  return `<h1>Charts</h1><p>Gráficos usam <code>recharts</code> em ${rechartsFiles.length} arquivos e SVG/CSS próprio (<code>FunnelBars</code>, <code>ChannelDonut</code>, <code>CalendarHeatmap</code>). Com o banco vazio, muitos gráficos aparecem no estado vazio.</p><h3>Arquivos com recharts</h3><p>${rechartsFiles.map((f) => `<code>${f}</code>`).join(' · ')}</p><h2>Componentes visuais de dados</h2>${names.map((n) => { const d = ctx.primaryDef(n); const b = defBlock(d.file, d.line, 30); return `<div class="item"><h4><a href="#comp/${n}">${n}</a></h4><p><code>${d.file}:${d.line}</code> · ${ctx.routesByComp[n] ? `visível em ${ctx.routesByComp[n].length} tela(s)` : 'não renderizado nas telas percorridas'}</p>${ctx.compshots[n] ? img(ctx.compshots[n].shot, n) : ''}</div>`; }).join('')}`;
}
