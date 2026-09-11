import { test, expect } from '@playwright/test';
import { signUp, uniqueTestEmail, waitForAppReady } from './helpers';

// ACH-04-03 (auditoria de 2026-09): PropostaForm.tsx gera documento comercial com valor
// monetário real (crm360.routes.ts recalcula e persiste o total no Postgres), mas até este spec
// só tinha cobertura de integração (persistência via API) e unit (PropostasList renderizando uma
// lista mockada) — nenhum teste abria o formulário de verdade num navegador. Uma regressão de UI
// que travasse o formulário (ex.: useFieldArray quebrado, submit não disparando) sem nunca chamar
// a API não seria pega por nenhuma das duas suítes anteriores.
test.describe('Fluxo de Proposta comercial (PropostaForm.tsx) — e2e de navegador', () => {
  test('cria proposta vinculada a uma empresa com 2+ itens, total bate na lista e sobrevive a reload', async ({
    page,
  }) => {
    await signUp(page, { email: uniqueTestEmail('proposta-form') });

    // PropostaForm só oferece vínculo com empresa na criação (ver comentário no próprio
    // componente) e a busca é contra empresas já existentes — cria uma primeiro, mesmo caminho de
    // contact-company-forms.spec.ts.
    await page.getByRole('button', { name: 'Empresas' }).click();
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Nova Empresa|Adicionar/ }).first().click();
    const suffix = Date.now();
    const companyName = `Empresa Proposta ${suffix}`;
    await page.getByLabel('Razão Social *').fill(`${companyName} LTDA`);
    await page.getByLabel('Nome Fantasia *').fill(companyName);
    await page.getByRole('button', { name: 'Criar Empresa' }).click();
    await expect(page.getByText('Empresa criada.')).toBeVisible();

    await page.getByRole('button', { name: 'Propostas' }).click();
    await waitForAppReady(page);

    await page.getByRole('button', { name: 'Novo Documento' }).click();
    await expect(page.getByRole('heading', { name: 'Novo Documento Comercial' })).toBeVisible();

    const title = `Proposta Teste ${suffix}`;
    await page.getByLabel('Título *').fill(title);

    // Vincula à empresa criada acima — cobre o achado real documentado em PropostaForm.tsx
    // (companyId nunca era enviado antes da correção).
    await page.getByLabel('Vincular a uma empresa (opcional)').fill(companyName);
    await expect(page.getByRole('button', { name: companyName })).toBeVisible();
    await page.getByRole('button', { name: companyName }).click();

    // useFieldArray: primeiro item já vem no form por default; preenche e adiciona um segundo.
    const itemRows = page.locator('fieldset[aria-labelledby="proposta-itens-heading"] > div');
    await itemRows.nth(0).getByPlaceholder('Nome do item').fill('Item Um');
    await itemRows.nth(0).getByPlaceholder('Qtd').fill('2');
    await itemRows.nth(0).getByPlaceholder('Preço unit.').fill('100');

    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await expect(itemRows).toHaveCount(2);
    await itemRows.nth(1).getByPlaceholder('Nome do item').fill('Item Dois');
    await itemRows.nth(1).getByPlaceholder('Qtd').fill('3');
    await itemRows.nth(1).getByPlaceholder('Preço unit.').fill('50');

    // 2*100 + 3*50 = 350, sem desconto/imposto — mesma fórmula usada pelo backend
    // (PrismaCrm360Repository.calculateItem, citada no comentário de computeItemTotal).
    await expect(page.getByText('Total estimado:')).toBeVisible();
    await expect(page.getByText(/R\$\s*350,00/)).toBeVisible();

    await page.getByRole('button', { name: 'Criar Documento' }).click();
    await expect(page.getByText('Documento criado.')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Novo Documento Comercial' }),
    ).toBeHidden();

    // Total na lista — vem do backend (PropostasList recarrega via crm360Api.listDocuments()
    // logo após o save), não de um estado otimista local.
    const row = page.locator('tr', { hasText: title });
    await expect(row).toBeVisible();
    await expect(row.getByText(/R\$\s*350,00/)).toBeVisible();
    await expect(row.getByText(companyName)).toBeVisible();

    // Persistência real: reload completo (não SPA navigation) e o mesmo total continua lá — se o
    // valor fosse só otimismo de UI, ele sumiria/zeraria aqui.
    await page.reload();
    await waitForAppReady(page);
    const rowAfterReload = page.locator('tr', { hasText: title });
    await expect(rowAfterReload).toBeVisible();
    await expect(rowAfterReload.getByText(/R\$\s*350,00/)).toBeVisible();

    // Reabre o documento (detalhe) e confirma que os 2 itens realmente persistiram no backend,
    // não só o total agregado.
    await rowAfterReload.click();
    await expect(page.getByText('Item Um')).toBeVisible();
    await expect(page.getByText('Item Dois')).toBeVisible();
  });

  test('salvar com o item sem nome mostra erro de validação visível e não chama a API', async ({
    page,
  }) => {
    await signUp(page, { email: uniqueTestEmail('proposta-form-validation') });

    await page.getByRole('button', { name: 'Propostas' }).click();
    await waitForAppReady(page);

    let createRequestFired = false;
    await page.route('**/api/crm/documents', async (route) => {
      if (route.request().method() === 'POST') {
        createRequestFired = true;
      }
      await route.continue();
    });

    await page.getByRole('button', { name: 'Novo Documento' }).click();
    await expect(page.getByRole('heading', { name: 'Novo Documento Comercial' })).toBeVisible();

    const title = `Proposta Sem Item ${Date.now()}`;
    await page.getByLabel('Título *').fill(title);
    // O form já nasce com 1 item no array (useFieldArray não permite remover o último — botão de
    // remover fica disabled em fields.length <= 1), mas o nome desse item fica vazio: dispara a
    // validação zod de item ("Nome do item é obrigatório") em vez do root min(1) de lineItems.
    await page.getByRole('button', { name: 'Criar Documento' }).click();

    await expect(page.getByText('Nome do item é obrigatório')).toBeVisible();
    // Dialog continua aberto — erro de validação não fecha o form nem navega para longe dele.
    await expect(page.getByRole('heading', { name: 'Novo Documento Comercial' })).toBeVisible();

    expect(createRequestFired).toBe(false);
  });

  test('grupo de itens usa role="group" com aria-labelledby, não <label> solto', async ({
    page,
  }) => {
    await signUp(page, { email: uniqueTestEmail('proposta-form-a11y') });

    await page.getByRole('button', { name: 'Propostas' }).click();
    await waitForAppReady(page);
    await page.getByRole('button', { name: 'Novo Documento' }).click();
    await expect(page.getByRole('heading', { name: 'Novo Documento Comercial' })).toBeVisible();

    const heading = page.locator('#proposta-itens-heading');
    await expect(heading).toHaveText('Itens *');

    const fieldset = page.locator('fieldset[aria-labelledby="proposta-itens-heading"]');
    await expect(fieldset).toBeVisible();
    await expect(fieldset).toHaveAttribute('aria-labelledby', 'proposta-itens-heading');
  });
});
