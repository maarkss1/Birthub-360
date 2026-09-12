import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const artifactDir = 'C:\\Users\\Marks\\.gemini\\antigravity\\brain\\b1687234-4a6b-459c-bc6d-083993983f33';
const desktopDir = 'C:\\Users\\Marks\\Desktop\\BirthHub360_Capturas';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}
if (!fs.existsSync(desktopDir)) {
  fs.mkdirSync(desktopDir, { recursive: true });
}

async function saveScreen(page, fileName, fullPage = true) {
  const artifactPath = path.join(artifactDir, fileName);
  const desktopPath = path.join(desktopDir, fileName);
  await page.screenshot({ path: artifactPath, fullPage });
  fs.copyFileSync(artifactPath, desktopPath);
  console.log(`Salvo: ${fileName} -> Artifacts e Desktop`);
}

async function capture() {
  console.log('Iniciando captura de telas...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ==========================================
  // Contexto 1: NÃO AUTENTICADO (Telas Públicas)
  // ==========================================
  const unauthContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  await unauthContext.addInitScript(() => {
    localStorage.setItem('atlas_theme', 'dark');
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  });

  const unauthPage = await unauthContext.newPage();

  // Mock get-session retornando null para simular deslogado
  await unauthPage.route('**/api/auth/get-session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null)
    });
  });

  // 1. Welcome Screen
  console.log('Capturando Tela de Boas-Vindas...');
  await unauthPage.goto('http://localhost:4173/welcome', { waitUntil: 'networkidle' });
  await unauthPage.waitForTimeout(1000);
  await saveScreen(unauthPage, 'tela_welcome_birthhub.png');

  // 2. Login Screen
  console.log('Capturando Tela de Login...');
  await unauthPage.goto('http://localhost:4173/login', { waitUntil: 'networkidle' });
  await unauthPage.waitForTimeout(1000);
  await saveScreen(unauthPage, 'tela_login_birthhub.png');

  // 3. Selection Screen
  console.log('Capturando Tela de Seleção...');
  await unauthPage.goto('http://localhost:4173/select-brand', { waitUntil: 'networkidle' });
  await unauthPage.waitForTimeout(1000);
  await saveScreen(unauthPage, 'tela_selecao_birthhub.png');

  // 4. Reset Password Screen
  console.log('Capturando Tela de Recuperação de Senha...');
  await unauthPage.goto('http://localhost:4173/reset-password', { waitUntil: 'networkidle' });
  await unauthPage.waitForTimeout(1000);
  await saveScreen(unauthPage, 'tela_reset_password_birthhub.png');

  await unauthContext.close();

  // ==========================================
  // Contexto 2: AUTENTICADO (Hub e Dashboard)
  // ==========================================
  const authContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  await authContext.addInitScript(() => {
    localStorage.setItem('atlas_theme', 'dark');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('@prospector:has_seen_tour', 'true');
    localStorage.setItem('hasSeenTour', 'true');
    localStorage.setItem('onboarding_completed', 'true');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  });

  const authPage = await authContext.newPage();

  // Mock de sessão
  await authPage.route('**/api/auth/get-session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'user-birthhub',
          name: 'Comando Birth Hub',
          email: 'admin@birthhub.com.br',
          role: 'ADMIN',
          image: null,
          mustChangePassword: false
        },
        session: {
          id: 'sess-birthhub',
          userId: 'user-birthhub',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        }
      })
    });
  });

  await authPage.route('**/api/module-access/grants/my', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: ['social-selling', 'treinamento-atlasgr', 'proposta-comercial', 'hub-inteligencia-marketing']
      })
    });
  });

  await authPage.route('**/api/analytics/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalLeads: 1420,
          conversionRate: 28.4,
          pendingActivities: 34,
          closedThisMonth: 19,
          pipelineValue: 4850000,
          averageScore: 84
        }
      })
    });
  });

  await authPage.route('**/api/activities/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: []
      })
    });
  });

  // 5. Hub Screen (Órbita de Comando)
  console.log('Capturando Tela do Hub Executivo...');
  await authPage.goto('http://localhost:4173/hub', { waitUntil: 'domcontentloaded' });
  await authPage.waitForTimeout(2000);
  await saveScreen(authPage, 'tela_hub_birthhub.png');

  // 6. Dashboard Comercial (Single Page Dashboard)
  console.log('Capturando Dashboard Comercial...');
  await authPage.goto('http://localhost:4173/app', { waitUntil: 'domcontentloaded' });
  await authPage.waitForTimeout(3000);
  await saveScreen(authPage, 'tela_dashboard_birthhub.png');

  await authContext.close();
  await browser.close();
  console.log('Todas as telas foram capturadas e salvas na Área de Trabalho e Artifacts com sucesso!');
}

capture().catch((err) => {
  console.error('Erro na captura:', err);
  process.exit(1);
});
