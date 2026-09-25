import { fileURLToPath } from 'node:url';
// Um screenshot REAL por componente React definido em src (primeira instância visível), + props reais.
import { chromium } from '../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, ''); const BASE = 'http://localhost:3024';
fs.mkdirSync(`${ROOT}/comp`, { recursive: true });
const idx = JSON.parse(fs.readFileSync(`${ROOT}/data/compindex.json`)); const NAMES = Object.keys(idx);
const outPath = `${ROOT}/data/compshots.json`; const rec = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath)) : {};
const routes = fs.readdirSync(`${ROOT}/data`).filter(f => /__1440x900\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(`${ROOT}/data/${f}`))).filter(d => !d.error).map(d => d.route);
const extra = ['/app'];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
function probe({ names, skip, mode }) {
  const set = new Set(names), skipS = new Set(skip);
  const fk = el => Object.keys(el).find(k => k.startsWith('__reactFiber$'));
  const nm = f => { const t = f.type; if (!t || typeof t === 'string') return null; const n = t.displayName || t.name || (t.render && (t.render.displayName || t.render.name)) || (t.type && (t.type.displayName || t.type.name)); return n && /^[A-Z]/.test(n) ? n : null; };
  const hostOf = f => { let c = f.child, g = 0; while (c && g++ < 40) { if (c.stateNode && c.stateNode.nodeType === 1) return c.stateNode; c = c.child; } return null; };
  const vis = el => { const r = el.getBoundingClientRect(); const c = getComputedStyle(el); return r.width >= 16 && r.height >= 10 && c.visibility !== 'hidden' && c.display !== 'none' && c.display !== 'contents' && +c.opacity > 0; };
  const seenF = new Set(), found = {}; let idc = 0;
  for (const el of document.body.querySelectorAll('*')) {
    const k = fk(el); if (!k) continue; let f = el[k], g = 0;
    while (f && g++ < 200) { if (!seenF.has(f)) { seenF.add(f); const n = nm(f); if (n && set.has(n) && !skipS.has(n) && !found[n]) { const h = hostOf(f); if (h && h !== document.body && h.id !== 'root' && vis(h)) { const r = h.getBoundingClientRect(); if (r.width <= 1500 && r.height <= 1000) { const c = getComputedStyle(h); const id = 'cid' + (idc++); h.setAttribute('data-cid', id); const props = {}; const mp = f.memoizedProps || {}; for (const [pk, pv] of Object.entries(mp)) { if (pk === 'children' || pk === 'ref') continue; const t = typeof pv; props[pk] = (t === 'string' || t === 'number' || t === 'boolean') ? String(pv).slice(0, 50) : (pv === null ? 'null' : t === 'object' ? (Array.isArray(pv) ? 'array' : 'object') : t); } found[n] = { name: n, cid: id, tag: h.tagName.toLowerCase(), cls: (h.getAttribute('class') || '').slice(0, 300), rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }, props, hasChildren: mp.children !== undefined, styles: { display: c.display, position: c.position, backgroundColor: c.backgroundColor, color: c.color, borderRadius: c.borderRadius, padding: c.padding, gap: c.gap, fontFamily: c.fontFamily.split(',')[0], fontSize: c.fontSize, fontWeight: c.fontWeight, boxShadow: c.boxShadow.slice(0, 120), border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor }, html: h.outerHTML.slice(0, 400) }; } } } } f = f.return; }
  }
  return Object.values(found);
}
async function run(route, w, h, auth = true) {
  const ctx = await browser.newContext({ ...(auth ? { storageState: `${ROOT}/_tools/auth.json` } : {}), viewport: { width: w, height: h } });
  await ctx.addInitScript(() => { try { localStorage.setItem('@prospector:has_seen_tour', 'true'); } catch {} });
  const page = await ctx.newPage(); page.setDefaultTimeout(4000);
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForLoadState('networkidle', { timeout: 3500 }).catch(() => {}); await page.waitForTimeout(1300);
    const list = await page.evaluate(probe, { names: NAMES, skip: Object.keys(rec), mode: 0 }); let n = 0;
    for (const it of list) { try { const loc = page.locator(`[data-cid="${it.cid}"]`); await loc.scrollIntoViewIfNeeded({ timeout: 1500 }); await page.waitForTimeout(80); await loc.screenshot({ path: `${ROOT}/comp/${it.name}.png`, timeout: 3000 }); it.shot = `comp/${it.name}.png`; it.route = route; rec[it.name] = it; n++; } catch { } }
    fs.writeFileSync(outPath, JSON.stringify(rec)); console.log('OK', route, 'new', n, 'total', Object.keys(rec).length);
  } catch (e) { console.log('FAIL', route, String(e).slice(0, 100)); }
  await ctx.close();
}
for (const r of ['/app', ...routes.filter(r => r !== '/app' && r.startsWith('/app'))]) await run(r, 1440, 900);
for (const r of routes.filter(r => !r.startsWith('/app') && !/rota-inex/.test(r))) await run(r, 1440, 900);
await run('/login', 1440, 900, false); await run('/welcome', 1440, 900, false);
await browser.close(); console.log('COMPSHOTS DONE', Object.keys(rec).length);
