import { test, expect } from '@playwright/test';
import { signUp, uniqueTestEmail, setUserRole } from './helpers';

/**
 * BILLING-008 (onda 5): os painéis de conexão Stripe/Omie (Integrations.tsx) não tinham NENHUMA
 * cobertura E2E — nem eles, nem qualquer outro painel de conexão deste módulo (Bitrix/3CX/Slack/
 * Voice Hub também estão sem E2E hoje). Cobre o que é seguro testar sem depender de uma credencial
 * real de sandbox Stripe/Omie (não disponível neste ambiente): render dos formulários, validação
 * client-side que impede a chamada de rede com campo vazio, e o gate de RBAC (ADMIN/GESTOR podem
 * mutar; outros papéis veem o painel em modo somente leitura, mesmo comportamento já real do
 * backend — GET /connections é aberto a qualquer papel do tenant, só connect/disconnect/test
 * exigem ADMIN/GESTOR, ver stripe.routes.ts/omie.routes.ts). Conectar de verdade com uma chave
 * válida e ver o status "Conectado" fica fora de escopo aqui — exigiria uma credencial real de
 * sandbox Stripe/Omie, que este ambiente de teste não tem.
 */

async function openStripeTab(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Integrações/ }).first().click();
  await expect(page).toHaveURL(/\/app\/integrations/);
  await page.getByRole('button', { name: 'Stripe' }).click();
}

async function openOmieTab(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Integrações/ }).first().click();
  await expect(page).toHaveURL(/\/app\/integrations/);
  await page.getByRole('button', { name: 'Omie' }).click();
}

test.describe('Integrações — Stripe/Omie (BILLING-008)', () => {
  test('ADMIN vê o painel Stripe com o formulário de conexão habilitado', async ({ page }) => {
    await signUp(page, { email: uniqueTestEmail('billing008-stripe-admin') });
    await openStripeTab(page);

    await expect(page.getByText('Não conectado')).toBeVisible();
    await expect(page.getByLabel('Chave secreta da API')).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Conectar Stripe' })).toBeEnabled();
  });

  test('ADMIN: tentar conectar Stripe sem chave secreta recusa antes de qualquer chamada de rede', async ({
    page,
  }) => {
    await signUp(page, { email: uniqueTestEmail('billing008-stripe-empty') });
    await openStripeTab(page);

    let connectCalled = false;
    await page.route('**/api/integrations/stripe/connect', (route) => {
      connectCalled = true;
      return route.continue();
    });

    await page.getByRole('button', { name: 'Conectar Stripe' }).click();

    await expect(page.getByText('Informe a chave secreta da API do Stripe.')).toBeVisible();
    expect(connectCalled).toBe(false);
  });

  test('ADMIN vê o painel Omie com o formulário de conexão habilitado', async ({ page }) => {
    await signUp(page, { email: uniqueTestEmail('billing008-omie-admin') });
    await openOmieTab(page);

    await expect(page.getByText('Não conectado')).toBeVisible();
    await expect(page.getByLabel('Chave de Integração (App Key)')).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Conectar Omie' })).toBeEnabled();
  });

  test('ADMIN: tentar conectar Omie sem credenciais recusa antes de qualquer chamada de rede', async ({
    page,
  }) => {
    await signUp(page, { email: uniqueTestEmail('billing008-omie-empty') });
    await openOmieTab(page);

    let connectCalled = false;
    await page.route('**/api/integrations/omie/connect', (route) => {
      connectCalled = true;
      return route.continue();
    });

    await page.getByRole('button', { name: 'Conectar Omie' }).click();

    await expect(
      page.getByText('Informe a Chave de Integração (App Key) e o App Secret do Omie.'),
    ).toBeVisible();
    expect(connectCalled).toBe(false);
  });

  test('SDR não vê "Integrações" no menu, mas acesso direto por URL mostra os painéis em modo somente leitura', async ({
    page,
  }) => {
    const email = uniqueTestEmail('billing008-sdr');
    await signUp(page, { email });
    await setUserRole(email, 'SDR');
    await page.reload();

    await expect(page.getByRole('button', { name: /Integrações/ })).toHaveCount(0);

    // Mesmo comportamento real do backend (GET /connections aberto a qualquer papel do tenant) —
    // a rota de frontend não bloqueia o acesso direto, só o menu não oferece o atalho.
    await page.goto('/app/integrations');
    await page.getByRole('button', { name: 'Stripe' }).click();

    const connectStripeButton = page.getByRole('button', { name: 'Conectar Stripe' });
    await expect(connectStripeButton).toBeVisible();
    await expect(connectStripeButton).toBeDisabled();
    await expect(connectStripeButton).toHaveAttribute(
      'title',
      'Requer permissão de Gestor ou Administrador',
    );

    await page.getByRole('button', { name: 'Omie' }).click();
    const connectOmieButton = page.getByRole('button', { name: 'Conectar Omie' });
    await expect(connectOmieButton).toBeVisible();
    await expect(connectOmieButton).toBeDisabled();
  });
});
