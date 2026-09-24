// Abre o Chrome visível para VOCÊ fazer login. Salva só a sessão (cookies) em auth.json.
import { chromium } from '../../../node_modules/playwright/index.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('@prospector:has_seen_tour', 'true'));
const page = await ctx.newPage();
await page.goto('http://localhost:3024/login');
console.log('Aguardando login manual (até 10 min)...');
await page.waitForURL(u => /\/(app|hub|social-selling)/.test(u.pathname), { timeout: 600000 });
await page.waitForTimeout(3000);
await ctx.storageState({ path: new URL('./auth.json', import.meta.url).pathname.replace(/^\//,'') });
console.log('SESSAO SALVA em auth.json');
await browser.close();
