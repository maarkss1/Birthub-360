import { fileURLToPath } from 'node:url';
// Estados (hover/focus/active/disabled/erro), tema claro/escuro e overlays — tudo no navegador real.
import { chromium } from '../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, ''); const BASE = 'http://localhost:3024';
fs.mkdirSync(`${ROOT}/states`, { recursive: true });
const out = { states: [], overlays: [], themes: [], notes: [] };
const P = ['backgroundColor','color','borderTopColor','borderTopWidth','boxShadow','transform','outlineStyle','outlineColor','outlineWidth','outlineOffset','opacity','cursor','textDecorationLine','filter','backgroundImage'];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function ctxFor(w, h, auth = true) { const c = await browser.newContext({ ...(auth ? { storageState: `${ROOT}/_tools/auth.json` } : {}), viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 }); await c.addInitScript(() => { try { localStorage.setItem('@prospector:has_seen_tour', 'true'); } catch {} }); return c; }
const comp = (loc) => loc.evaluate((el, P) => { const c = getComputedStyle(el); const o = {}; for (const p of P) o[p] = c[p]; o.transition = c.transition; const r = el.getBoundingClientRect(); o.rect = { w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; o.html = el.outerHTML.slice(0, 500); return o; }, P);
async function clipShot(page, loc, path, pad = 10) { const b = await loc.boundingBox(); if (!b) return false; const vp = page.viewportSize(); const x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad); await page.screenshot({ path, clip: { x, y, width: Math.min(vp.width - x, b.width + pad * 2), height: Math.min(vp.height - y, b.height + pad * 2) } }); return true; }
async function elementStates(page, name, loc, route) {
  const rec = { name, route, states: {} };
  try {
    await loc.first().scrollIntoViewIfNeeded({ timeout: 2000 }); const el = loc.first();
    await page.mouse.move(0, 0); await page.waitForTimeout(350);
    await clipShot(page, el, `${ROOT}/states/${name}__default.png`); rec.states.default = await comp(el);
    await el.hover(); await page.waitForTimeout(450); await clipShot(page, el, `${ROOT}/states/${name}__hover.png`); rec.states.hover = await comp(el);
    await page.mouse.move(0, 0); await page.waitForTimeout(300);
    await page.keyboard.press('Tab'); await el.evaluate((e) => e.focus({ focusVisible: true })); await page.waitForTimeout(350); await clipShot(page, el, `${ROOT}/states/${name}__focus.png`); rec.states.focus = await comp(el);
    await el.evaluate((e) => e.blur());
    const b = await el.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(250); await clipShot(page, el, `${ROOT}/states/${name}__active.png`); rec.states.active = await comp(el); await page.mouse.move(0, 0); await page.mouse.up();
    rec.ok = true;
  } catch (e) { rec.ok = false; rec.err = String(e).slice(0, 160); }
  out.states.push(rec); console.log('state', name, rec.ok, rec.err || '');
}
async function open(page, route) { await page.goto(BASE + route, { waitUntil: 'domcontentloaded' }); await page.waitForLoadState('networkidle', { timeout: 3500 }).catch(() => {}); await page.waitForTimeout(1500); }

// ---- 1440 /app: estados de componentes reais
{
  const ctx = await ctxFor(1440, 900); const page = await ctx.newPage(); await open(page, '/app');
  await elementStates(page, 'button-primary--novo-negocio', page.getByRole('button', { name: /Novo Negócio/ }), '/app');
  await elementStates(page, 'button-secondary--prospeccao', page.getByRole('button', { name: /^Prospecção$/ }), '/app');
  await elementStates(page, 'button-icon--alternar-tema', page.getByRole('button', { name: /Alternar tema/ }), '/app');
  await elementStates(page, 'nav-item--meu-espaco', page.getByRole('button', { name: /Meu Espaço/ }), '/app');
  await elementStates(page, 'nav-item-ativo--command-center', page.getByRole('button', { name: /^Command Center$/ }).first(), '/app');
  await elementStates(page, 'button-danger--sair-da-conta', page.getByRole('button', { name: /Sair da Conta/ }), '/app');
  await elementStates(page, 'input-search--topbar', page.locator('header input, header [role=search] input, input[placeholder*="Buscar"]').first(), '/app');
  await elementStates(page, 'card-kpi--leads-ativos', page.locator('section', { hasText: 'LEADS ATIVOS NO FUNIL' }).first(), '/app');
  // tema claro/escuro
  const htmlClass0 = await page.evaluate(() => document.documentElement.className);
  await page.screenshot({ path: `${ROOT}/states/theme__A.png` });
  await page.getByRole('button', { name: /Alternar tema/ }).first().evaluate((e)=>e.click()); await page.waitForTimeout(900);
  const htmlClass1 = await page.evaluate(() => document.documentElement.className);
  await page.screenshot({ path: `${ROOT}/states/theme__B.png` });
  const snap = () => page.evaluate(() => { const g = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).backgroundColor : null; }; return { body: getComputedStyle(document.body).backgroundColor, color: getComputedStyle(document.body).color, aside: g('aside'), main: g('main') }; });
  out.themes.push({ before: htmlClass0, after: htmlClass1, afterSnap: await snap() });
  await page.getByRole('button', { name: /Alternar tema/ }).first().evaluate((e)=>e.click()); await page.waitForTimeout(600);
  // overlays
  const ov = async (name, action, closer) => { try { await action(); await page.waitForTimeout(900); await page.screenshot({ path: `${ROOT}/states/overlay-${name}.png` }); const info = await page.evaluate(() => { const d = document.querySelector('[role=dialog],[aria-modal=true],[role=menu],[role=listbox],[data-radix-popper-content-wrapper],[cmdk-root]'); if (!d) return null; const c = getComputedStyle(d); const r = d.getBoundingClientRect(); return { tag: d.tagName, role: d.getAttribute('role'), cls: (d.getAttribute('class') || '').slice(0, 300), rect: { x: r.x, y: r.y, w: r.width, h: r.height }, bg: c.backgroundColor, radius: c.borderRadius, shadow: c.boxShadow, z: c.zIndex, backdrop: c.backdropFilter, html: d.outerHTML.slice(0, 600) }; }); out.overlays.push({ name, route: '/app', info }); console.log('overlay', name, !!info); } catch (e) { out.overlays.push({ name, err: String(e).slice(0, 140) }); console.log('overlay FAIL', name, String(e).slice(0, 100)); } try { await (closer ? closer() : page.keyboard.press('Escape')); await page.waitForTimeout(500); } catch {} };
  await ov('command-palette', () => page.keyboard.press('Control+k'));
  await ov('novo-negocio', () => page.getByRole('button', { name: /Novo Negócio/ }).first().click());
  await ov('notificacoes', () => page.getByRole('button', { name: /notifica/i }).first().click());
  await ov('menu-usuario', () => page.locator('header button', { hasText: /^M$/ }).first().click());
  await ov('assistente-ia', () => page.getByRole('button', { name: /assistente|copilot|copiloto|ia/i }).last().click());
  await ctx.close();
}
// ---- mobile 390: drawer/menu
{
  const ctx = await ctxFor(390, 844); const page = await ctx.newPage(); await open(page, '/app');
  await page.screenshot({ path: `${ROOT}/states/mobile-app-closed.png` });
  try { const btn = page.locator('header button').first(); await btn.click(); await page.waitForTimeout(900); await page.screenshot({ path: `${ROOT}/states/mobile-app-menu-open.png` }); out.notes.push('mobile menu aberto via primeiro header button'); } catch (e) { out.notes.push('mobile menu FAIL ' + String(e).slice(0, 100)); }
  await ctx.close();
}
// ---- login (sem sessão): input focus, erro de validação (e-mail inválido, sem senha), desabilitado
{
  const ctx = await ctxFor(1440, 900, false); const page = await ctx.newPage(); await open(page, '/login');
  await page.screenshot({ path: `${ROOT}/states/login-default.png` });
  const email = page.locator('input[type=email], input[name=email], input[autocomplete=email], input[autocomplete=username]').first();
  await elementStates(page, 'input-email--login', email, '/login');
  await elementStates(page, 'button-cta--entrar-no-birth-hub', page.getByRole('button', { name: /ENTRAR NO BIRTH HUB/i }), '/login');
  try { await email.fill('email-invalido'); await page.getByRole('button', { name: /ENTRAR NO BIRTH HUB/i }).click(); await page.waitForTimeout(900); await page.screenshot({ path: `${ROOT}/states/login-error-email-invalido.png` }); out.notes.push('login erro: e-mail inválido submetido sem senha (nenhuma credencial)'); } catch (e) { out.notes.push('login erro FAIL ' + String(e).slice(0, 100)); }
  await ctx.close();
}
fs.writeFileSync(`${ROOT}/data/states.json`, JSON.stringify(out, null, 1)); await browser.close(); console.log('STATES DONE');
