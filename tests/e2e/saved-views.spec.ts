import { test, expect } from '@playwright/test';
import { signUp, uniqueTestEmail } from './helpers';

// Onda B2b (Agente 00, Commercial AI OS) — Saved Views do pipeline CRM: pessoais (SavedView.userId
// é o dono exclusivo, reforçado no backend em savedView.service.ts, não só no frontend).

async function createCompanyAndLead(
  page: import('@playwright/test').Page,
  opts: { tradeName: string; status: string },
) {
  const companyRes = await page.request.post('/api/companies', {
    data: { legalName: `${opts.tradeName} LTDA`, tradeName: opts.tradeName },
  });
  expect(companyRes.ok()).toBeTruthy();
  const company = (await companyRes.json()).data;

  const leadRes = await page.request.post('/api/leads', {
    data: { status: opts.status, companyId: company.id, source: 'e2e-saved-views' },
  });
  expect(leadRes.ok()).toBeTruthy();
  return { company };
}

test.describe('Saved Views do pipeline CRM', () => {
  test('salvar a view atual e aplicá-la restaura o filtro de busca na URL', async ({ page }) => {
    await signUp(page, { email: uniqueTestEmail('saved-views-apply') });
    const { company } = await createCompanyAndLead(page, {
      tradeName: `View Apply ${Date.now()}`,
      status: 'Lead Recebido',
    });
    await page.goto('/app/crm');

    await page.getByLabel('Buscar por empresa ou contato').fill(company.tradeName);
    await expect(page).toHaveURL(new RegExp(`[?&]q=`));

    await page.getByRole('button', { name: 'Views Salvas' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Salvar Filtro Atual como Nova View' }).click();
    const viewName = `Minha View ${Date.now()}`;
    await dialog.getByLabel('Nome da View').fill(viewName);
    const createResponse = page.waitForResponse(
      (res) => res.url().includes('/api/crm/saved-views') && res.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Salvar View' }).click();
    const createRes = await createResponse;
    expect(createRes.status()).toBe(201);

    // Fecha e limpa o filtro manualmente para confirmar que "Aplicar" de fato restaura o estado,
    // não é só a URL que nunca mudou. Dialog.tsx tem DOIS controles cujo nome acessível é
    // "Fechar" — o X do cabeçalho (aria-label) e o botão do rodapé (texto visível); getByText só
    // casa com o segundo, já que o primeiro não tem texto visível.
    await dialog.getByText('Fechar', { exact: true }).click();
    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(page).not.toHaveURL(/[?&]q=/);

    await page.getByRole('button', { name: 'Views Salvas' }).click();
    const dialogAgain = page.getByRole('dialog');
    await expect(dialogAgain.getByText(viewName)).toBeVisible();
    await dialogAgain.getByRole('button', { name: 'Aplicar' }).click();

    // URLSearchParams codifica espaço como "+", não "%20" — lê o parâmetro decodificado em vez de
    // casar a string bruta da URL contra um encoding específico.
    await expect(() => {
      const q = new URL(page.url()).searchParams.get('q');
      expect(q).toBe(company.tradeName);
    }).toPass({ timeout: 5_000 });
    await expect(
      page.getByRole('button', { name: new RegExp(`^${company.tradeName}`) }),
    ).toBeVisible();
  });

  test('views salvas são pessoais — outro usuário não vê a view de ninguém mais', async ({
    page,
  }) => {
    await signUp(page, { email: uniqueTestEmail('saved-views-owner') });
    const createRes = await page.request.post('/api/crm/saved-views', {
      data: { name: `View Privada ${Date.now()}`, funnel: 'Lead', filters: {} },
    });
    expect(createRes.ok()).toBeTruthy();

    // Segundo usuário (organização nova) — LoginScreen redireciona quem já está autenticado
    // direto pro Hub sem mostrar o formulário de cadastro, então a sessão do primeiro usuário
    // precisa ser encerrada antes de um segundo signUp() funcionar.
    await page.context().clearCookies();
    await signUp(page, { email: uniqueTestEmail('saved-views-other') });
    const listRes = await page.request.get('/api/crm/saved-views');
    expect(listRes.ok()).toBeTruthy();
    const views = (await listRes.json()).data;
    expect(Array.isArray(views)).toBe(true);
    expect(views).toHaveLength(0);
  });
});
