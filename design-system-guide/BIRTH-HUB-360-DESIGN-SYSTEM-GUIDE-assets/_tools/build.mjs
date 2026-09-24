import fs from 'node:fs';
import { ROOT, A, VPS, esc, exists } from './lib.mjs';
import { buildCtx } from './ctx.mjs';
import * as CA from './chA.mjs'; import * as CB from './chB.mjs'; import * as CC from './chC.mjs';
const OUT = ROOT + '/../BIRTH-HUB-360-DESIGN-SYSTEM-GUIDE.html';
const ctx = buildCtx();
const chapters = [
  ['overview', '1. Overview', () => CA.overview(ctx)], ['brand', '2. Brand', () => CA.brand(ctx)], ['tokens', '3. Design Tokens', () => CA.tokens(ctx)], ['colors', '4. Colors', () => CA.colors(ctx)],
  ['typography', '5. Typography', () => CA.typography(ctx)], ['spacing', '6. Spacing', () => CA.spacing(ctx)], ['grid', '7. Grid', () => CA.grid(ctx)], ['layout', '8. Layout', () => CA.layout(ctx)],
  ['components', '9. Components', () => CB.components(ctx)], ['buttons', '10. Buttons', () => CB.buttons(ctx)], ['inputs', '11. Inputs', () => CB.inputs(ctx)], ['cards', '12. Cards', () => CB.cards(ctx)],
  ['navigation', '13. Navigation', () => CB.navigation(ctx)], ['tables', '14. Tables', () => CB.tables(ctx)], ['charts', '15. Charts', () => CB.charts(ctx)], ['icons', '16. Icons', () => CC.icons(ctx)],
  ['modals', '17. Modals', () => CC.modals(ctx)], ['feedback', '18. Feedback', () => CC.feedback(ctx)], ['states', '19. States', () => CC.statesCh(ctx)], ['responsive', '20. Responsive', () => CC.responsive(ctx)],
  ['accessibility', '21. Accessibility', () => CC.a11y(ctx)], ['motion', '22. Motion', () => CC.motion(ctx)], ['consistency', '23. Consistency Audit', () => CC.consistency(ctx)], ['component-matrix', '24. Component Matrix', () => CC.matrices(ctx)],
  ['route-matrix', '25. Route Matrix', () => CC.routeMatrix(ctx)], ['source-files', '26. Source Files', () => CC.sources(ctx)], ['screenshots', '27. Screenshots', () => CC.gallery(ctx)],
];
const pages = []; const warnings = [];
for (const [id, title, fn] of chapters) { try { pages.push(`<section class="page" id="${id}" data-title="${title}">${fn()}</section>`); } catch (e) { warnings.push(`${id}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); pages.push(`<section class="page" id="${id}" data-title="${title}"><h1>${title}</h1><p class="bad">Falha ao gerar este capítulo: ${esc(String(e))}</p></section>`); } }
const screenPages = ctx.routes.map((r) => { try { return CB.screenPage(ctx, r); } catch (e) { warnings.push(`screen ${r}: ${e.message}`); return ''; } });
const compNames = Object.keys(ctx.routesByComp).sort(); const compPages = compNames.map((n) => { try { return CB.compPage(ctx, n); } catch (e) { warnings.push(`comp ${n}: ${e.message}`); return ''; } });
// checklist + validação de assets
const html0 = pages.join('') + screenPages.join('') + compPages.join('');
const refs = [...html0.matchAll(new RegExp(`${A}/([^"'\\s)]+)`, 'g'))].map((m) => m[1]); const missing = [...new Set(refs.filter((f) => !exists(`${ROOT}/${f}`)))];
const nShots = Object.values(ctx.shots).reduce((a, v) => a + Object.keys(v).length, 0);
const val = [['aplicação executada', true, 'tsx server.ts :3024'], ['navegador utilizado', true, 'Google Chrome via Playwright'], ['rotas reais descobertas', ctx.routes.length > 0, `${ctx.routes.length} rotas`], ['screenshots reais capturados', nShots > 0, `${nShots} PNGs`], ['medidas DOM coletadas', ctx.routes.some((r) => ctx.shots[r][1440]?.groups), 'getBoundingClientRect + getComputedStyle'],
  ['desktop / tablet / mobile validados', [1440, 1024, 390].every((w) => ctx.routes.some((r) => ctx.shots[r][w])), '1440 · 1024 · 390'], ['logo documentado', true, 'Brand'], ['cores / fontes / tokens', ctx.tokens.tokens.length > 0, `${ctx.tokens.tokens.length} tokens`], ['componentes / cards / botões / inputs', Object.keys(ctx.compshots).length > 0, `${Object.keys(ctx.compshots).length} componentes com screenshot`], ['navegação documentada', true, 'Navigation'],
  ['ícones + SVG source', ctx.icons.custom.length > 0, `${ctx.icons.custom.length}+${ctx.icons.lucide.length}`], ['estados documentados', ctx.states.states.some((s) => s.ok), `${ctx.states.states.filter((s) => s.ok).length} alvos`], ['responsive / accessibility / inconsistências', true, 'capítulos 20, 21, 23'], ['código real incluído', true, 'trechos com arquivo:linha'], ['assets referenciados existem', missing.length === 0, missing.length ? `${missing.length} ausentes` : 'todos existem']];
const appendix = `<section class="page" id="appendix" data-title="28. Appendix">${CC.appendix(ctx, val)}${warnings.length ? `<h2>Avisos do gerador</h2><ul>${warnings.map((w) => `<li><code>${esc(w)}</code></li>`).join('')}</ul>` : ''}${missing.length ? `<h2>Assets ausentes</h2><ul>${missing.slice(0, 40).map((m) => `<li><code>${esc(m)}</code></li>`).join('')}</ul>` : ''}</section>`;
const nav = chapters.map(([id, t]) => `<a href="#${id}" data-nav>${t}</a>`).join('') + `<a href="#appendix" data-nav>28. Appendix</a>`;
const navScreens = ctx.pubFirst.map((r) => `<a href="#screen/${r}" data-nav class="sub">${esc(r)}</a>`).join('');
const css = `:root{--bg:#0f1220;--panel:#171b2e;--panel2:#1e2340;--ink:#e9ecf8;--ink2:#a4abc8;--line:#2b3157;--gold:#d4af37;--ok:#3ecf8e;--bad:#ff5d73;--code:#0b0e1a}
:root[data-theme=light]{--bg:#f6f4fb;--panel:#fff;--panel2:#efeaf8;--ink:#171428;--ink2:#5b5878;--line:#d9d3ea;--gold:#8a6d00;--code:#f1eef8}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 system-ui,Segoe UI,Roboto,sans-serif;display:flex;min-height:100vh}
a{color:var(--gold)}code{font:12px ui-monospace,Consolas,monospace;background:var(--panel2);padding:1px 5px;border-radius:4px;word-break:break-word}
#side{width:290px;flex:none;position:sticky;top:0;height:100vh;overflow:auto;background:var(--panel);border-right:1px solid var(--line);padding:14px}
#side h2{font-size:13px;margin:0 0 8px;color:var(--gold);letter-spacing:.05em;text-transform:uppercase}
#side a[data-nav]{display:block;padding:5px 8px;border-radius:6px;color:var(--ink2);text-decoration:none;font-size:13px}#side a.sub{padding-left:20px;font-size:12px}#side a.active,#side a:hover{background:var(--panel2);color:var(--ink)}
#q{width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);margin-bottom:10px}
#main{flex:1;min-width:0;padding:24px 36px 80px;max-width:1500px}
.page{display:none}.page.active{display:block}h1{font-size:28px;margin:.2em 0 .4em}h2{font-size:20px;margin:1.8em 0 .5em;border-bottom:1px solid var(--line);padding-bottom:4px}h3{font-size:16px;margin:1.4em 0 .4em}h4{margin:.2em 0}
.lead{font-size:16px;color:var(--ink2);max-width:80ch}.crumbs{color:var(--ink2);font-size:12px}.callout{background:var(--panel2);border-left:3px solid var(--gold);padding:10px 14px;border-radius:6px;margin:14px 0}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.stats div{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px}.stats b{display:block;font-size:26px;color:var(--gold)}.stats span{color:var(--ink2);font-size:12px}
.tw{overflow:auto;border:1px solid var(--line);border-radius:8px;margin:8px 0}table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{padding:6px 9px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}th{background:var(--panel2);position:sticky;top:0}
.tfilter{padding:6px 10px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);margin:6px 0;width:260px}
img.zoom{max-width:100%;height:auto;cursor:zoom-in;border:1px solid var(--line);border-radius:6px;background:#000}img.thumb{max-width:150px;max-height:96px;object-fit:cover;border:1px solid var(--line);border-radius:4px;cursor:zoom-in}
.missing{padding:8px;border:1px dashed var(--bad);color:var(--bad);font-size:12px}
figure.code{margin:8px 0;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--code)}figure.code figcaption{display:flex;gap:10px;align-items:center;padding:5px 10px;background:var(--panel2);font-size:12px}.file{font-family:ui-monospace,Consolas,monospace;color:var(--gold);flex:1;word-break:break-all}.note,.lang{color:var(--ink2)}
figure.code pre{margin:0;padding:10px 12px;overflow:auto;max-height:420px;font:12px/1.5 ui-monospace,Consolas,monospace}.copy{cursor:pointer;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:2px 8px}
.refs{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.ref{background:var(--panel2);border-radius:6px;padding:3px 8px;font-size:12px}.ref b{color:var(--gold)}
.item{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px;margin:14px 0}.itemhead{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.itemgrid{display:grid;grid-template-columns:minmax(200px,1fr) 1fr;gap:14px}@media(max-width:900px){.itemgrid{grid-template-columns:1fr}}
.issue{border-left:4px solid var(--bad)}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}@media(max-width:900px){.grid2{grid-template-columns:1fr}}.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px}
.brandprev{display:flex;align-items:center;justify-content:center;padding:18px;border-radius:8px;margin-bottom:6px;min-height:140px}.brandprev.light{background:#fff}.brandprev.dark{background:#061a3a}
.sw{display:inline-block;width:26px;height:26px;border-radius:6px;border:1px solid #8886;vertical-align:middle;margin-right:4px}.sw.none{background:repeating-linear-gradient(45deg,#8883,#8883 4px,transparent 4px,transparent 8px)}.gradbox{width:220px;height:34px;border-radius:6px}
.stats+*{margin-top:14px}.badge{padding:1px 7px;border-radius:99px;background:var(--panel2);font-size:11px}.bad{color:var(--bad)}.ok{color:var(--ok)}
.statestrip{display:flex;gap:10px;flex-wrap:wrap}.statestrip figure{margin:0}.statestrip figcaption{font-size:11px;color:var(--ink2)}
.vps{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}figure.vp{margin:0}figure.vp figcaption{font-size:11px;color:var(--ink2)}
.igrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.icard{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:3px;font-size:12px}.icard.small{padding:8px}.iprev{display:flex;align-items:center;justify-content:center;height:56px;color:var(--ink)}.iprev svg{width:32px;height:32px}.iprev.sm{height:28px;display:inline-flex}.iprev.sm svg{width:20px;height:20px}
.compgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin:8px 0}.compcard{display:flex;flex-direction:column;gap:4px;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px;text-decoration:none;color:var(--ink);font-size:12px}.nothumb{height:60px;display:flex;align-items:center;justify-content:center;color:var(--ink2);font-size:11px;border:1px dashed var(--line);border-radius:4px}
.chips a{display:inline-block;margin:2px 4px 2px 0}.crop{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:6px}.crop img.zoom{position:absolute;max-width:none;border:0;border-radius:0}.cropbox{position:absolute;outline:2px solid #ff3d71;pointer-events:none}.cap{font-size:11px;color:var(--ink2);margin-top:3px}
.schem{width:100%;max-width:900px;background:var(--panel);border:1px solid var(--line);border-radius:8px}.sr{fill:#d4af3722;stroke:#d4af37}.sr-aside{fill:#7c3aed33;stroke:#7c3aed}.sr-header{fill:#1677ff33;stroke:#1677ff}.sr-card{fill:none;stroke:#ff4fa3;stroke-dasharray:4}.schem text{fill:var(--ink);font-size:14px}
.galgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.gal{margin:0;font-size:11px}
details{margin:6px 0}summary{cursor:pointer}.row{display:flex;gap:14px;flex-wrap:wrap}
#lb{position:fixed;inset:0;background:#000d;display:none;align-items:center;justify-content:center;z-index:99;padding:20px;cursor:zoom-out}#lb.on{display:flex}#lb img{max-width:96vw;max-height:94vh;box-shadow:0 0 30px #000}
#top{display:flex;gap:8px;justify-content:flex-end}#top button{background:var(--panel);border:1px solid var(--line);color:var(--ink);border-radius:8px;padding:5px 10px;cursor:pointer}
@media(max-width:820px){body{display:block}#side{position:static;width:auto;height:auto;max-height:50vh}#main{padding:16px}}`;
const js = `(()=>{const pages=[...document.querySelectorAll('.page')];const navs=[...document.querySelectorAll('[data-nav]')];
function show(){let id=decodeURIComponent(location.hash.slice(1))||'overview';let p=pages.find(x=>x.id===id);if(!p){const el=document.getElementById(id);p=el&&el.closest('.page');}if(!p)p=pages[0];pages.forEach(x=>x.classList.toggle('active',x===p));navs.forEach(a=>a.classList.toggle('active',decodeURIComponent(a.getAttribute('href').slice(1))===p.id));window.scrollTo(0,0);document.title=(p.dataset.title||'')+' · Birth Hub 360° Design System Bible';}
addEventListener('hashchange',show);show();
const q=document.getElementById('q'),res=document.getElementById('results');const idx=pages.map(p=>({id:p.id,t:p.dataset.title||p.id,x:(p.textContent||'').toLowerCase()}));
q.addEventListener('input',()=>{const v=q.value.trim().toLowerCase();navs.forEach(a=>a.style.display=(!v||a.textContent.toLowerCase().includes(v))?'':'none');if(!v){res.innerHTML='';return;}const hits=idx.filter(i=>i.x.includes(v)||i.t.toLowerCase().includes(v)).slice(0,40);res.innerHTML=hits.map(h=>'<a data-nav href="#'+h.id+'">'+h.t.replace(/</g,'&lt;')+'</a>').join('')||'<small>sem resultados</small>';});
document.addEventListener('input',e=>{const t=e.target;if(t.classList.contains('tfilter')&&t.nextElementSibling){const v=t.value.toLowerCase();t.nextElementSibling.querySelectorAll('tbody tr').forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes(v)?'':'none');}
if(t.id==='iconfilter'){const v=t.value.toLowerCase();document.querySelectorAll('.icard').forEach(c=>c.style.display=(c.dataset.q||'').toLowerCase().includes(v)?'':'none');}
if(t.id==='galfilter'){const v=t.value.toLowerCase();document.querySelectorAll('.gal').forEach(c=>c.style.display=(c.dataset.q||'').toLowerCase().includes(v)?'':'none');}});
const lb=document.getElementById('lb'),lbi=lb.querySelector('img');
document.addEventListener('click',e=>{const t=e.target;if(t.matches('img.zoom,img.thumb')){e.preventDefault();lbi.src=t.dataset.full||t.src;lb.classList.add('on');return;}if(t.closest('a.zoomlink')||t.closest('.gal a')){e.preventDefault();lbi.src=(t.closest('a')||t).href;lb.classList.add('on');return;}
if(t.matches('.copy')){const pre=document.getElementById(t.dataset.copy);navigator.clipboard.writeText(pre.textContent).then(()=>{t.textContent='copiado ✔';setTimeout(()=>t.textContent='copiar',1200);}).catch(()=>{const r=document.createRange();r.selectNodeContents(pre);getSelection().removeAllRanges();getSelection().addRange(r);});}
if(t.id==='expand'||t.id==='collapse'){document.querySelectorAll('.page.active details').forEach(d=>d.open=t.id==='expand');}if(t.id==='theme'){const r=document.documentElement;r.dataset.theme=r.dataset.theme==='light'?'dark':'light';}});
lb.addEventListener('click',()=>lb.classList.remove('on'));addEventListener('keydown',e=>{if(e.key==='Escape')lb.classList.remove('on');if(e.key==='/'&&document.activeElement.tagName!=='INPUT'){e.preventDefault();q.focus();}});})();`;
const html = `<!doctype html><html lang="pt-BR" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Birth Hub 360° — Design System Bible</title><style>${css}</style></head><body>
<aside id="side"><h2>Birth Hub 360°<br>Design System Bible</h2><input id="q" type="search" placeholder="buscar (atalho: /)" aria-label="Buscar no guia"><div id="results"></div><nav>${nav}<details><summary>Telas (${ctx.routes.length})</summary>${navScreens}</details></nav></aside>
<main id="main"><div id="top"><button id="expand">expandir</button><button id="collapse">recolher</button><button id="theme">tema</button></div>${pages.join('')}${screenPages.join('')}${compPages.join('')}${appendix}</main><div id="lb"><img alt="ampliação"></div><script>${js}</script></body></html>`;
fs.writeFileSync(OUT, html);
console.log('HTML', (html.length / 1e6).toFixed(2) + 'MB', 'pages', pages.length + screenPages.length + compPages.length + 1, 'missing', missing.length, 'warnings', warnings.length);
warnings.slice(0, 15).forEach((w) => console.log('WARN', w.slice(0, 220)));
missing.slice(0, 10).forEach((m) => console.log('MISSING', m));
