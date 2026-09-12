import { expect, test } from '@playwright/test';
import { requestContext } from '../../src/lib/async-context';
import { prisma } from '../../src/lib/prisma';
import {
  assignJobRole,
  getJobRoleByCode,
} from '../../src/features/job-roles/services/jobRole.service';
import { runMultiCargoSeed } from '../../scripts/seed-multi-cargo';
import { runCapabilityEngineSeed } from '../../scripts/seed-capability-engine';
import { signUp, uniqueTestEmail, waitForAppReady } from './helpers';

// PROMPT 6 — 12 Workspaces por Login/Cargo. Cobertura E2E real (não só integração de serviço):
// o próprio fluxo de navegação, o estado sem cargo (o que qualquer usuário recém-cadastrado vê de
// verdade hoje) e o estado com cargo atribuído (o que a fundação multi-cargo, quando adotada,
// entrega). Cargo-a-cargo (as 12 combinações) já está coberto em
// tests/integration/workspace.test.ts — este spec cobre a tela real renderizada, não repete os 12.
//
// Seed via import direto das funções (mesmo padrão de tests/integration/workspace.test.ts), nunca
// via `npx tsx scripts/...` como processo CLI separado — rodar esses scripts como processo
// standalone trava neste sandbox por causa de Redis/Meilisearch reais indisponíveis (ver comentário
// em scripts/seed-multi-cargo.ts). `runAgentCatalogImport` (scripts/import-agent-catalog.ts) fica
// de fora de propósito: importa `agents.normalized.json` sem atributo `type: 'json'`, o que quebra
// o transform de módulo do Playwright (diferente do transform do vitest, mais tolerante) — e não é
// necessário aqui: `getWorkspaceForUser` só lê `RoleAgentGrant`/`RoleCapabilityGrant`, ambos já
// populados pelos outros dois seeds para os 12 agentes canônicos.

/** Atribui um JobRole ao usuário já cadastrado, direto no banco de teste — mesmo padrão de
 *  `setUserRole` em helpers.ts (bypass de RLS só em setup de teste, nunca em código de produto).
 *  `assignJobRole` abre sua própria transação interativa (`prisma.$transaction`) — o contexto
 *  precisa ser `tenantId` (não `bypassRls`) para o `SET LOCAL app.current_tenant_id` de dentro
 *  dessa transação bater com o `organizationId` real da linha, mesmo padrão que
 *  `tests/helpers/integration-setup.ts` já usa (`beforeEach` global com `tenantId`, nunca bypass,
 *  para escrita comum de teste dentro do próprio tenant). */
async function assignTestJobRole(email: string, jobRoleCode: string): Promise<void> {
  requestContext.enterWith({ bypassRls: true });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const jobRole = await getJobRoleByCode(jobRoleCode);
  requestContext.enterWith({ tenantId: user.organizationId! });
  await assignJobRole({
    organizationId: user.organizationId!,
    userId: user.id,
    jobRoleId: jobRole!.id,
    assignedBy: 'e2e-workspace-test',
  });
}

test.describe('Meu Workspace (PROMPT 6)', () => {
  test.beforeAll(async () => {
    requestContext.enterWith({ bypassRls: true });
    await runMultiCargoSeed();
    await runCapabilityEngineSeed();
  });

  test('sem JobRole atribuído: mostra o estado bloqueado, nunca uma tela vazia/quebrada', async ({
    page,
  }) => {
    await signUp(page, { email: uniqueTestEmail('workspace-empty') });
    await page.getByRole('button', { name: 'Meu Workspace', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/workspace$/);
    await waitForAppReady(page);

    await expect(page.getByText('Nenhum cargo atribuído')).toBeVisible();
  });

  test('com JobRole atribuído: mostra nome do cargo, KPIs e navegação real do cargo', async ({
    page,
  }) => {
    const email = uniqueTestEmail('workspace-ready');
    await signUp(page, { email });
    await assignTestJobRole(email, 'CLOSER');

    // Deep-link direto — mesma regra de segurança do prompt da onda ("deep link não bypassa
    // backend"): o workspace certo aparece só porque o backend resolveu o cargo real da sessão,
    // não porque a URL contém nada sobre ele.
    await page.goto('/app/workspace');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: 'Closer' })).toBeVisible();
    await expect(page.getByText('Indicadores do cargo')).toBeVisible();
    await expect(page.getByText('Navegação do cargo')).toBeVisible();
    // Módulo real da jornada do Closer (role-workspace-definitions.ts) — prova que a navegação
    // veio do backend, não foi hardcoded na tela.
    await expect(page.getByRole('button', { name: 'Pipeline', exact: true })).toBeVisible();
  });

  test('responsivo: viewport mobile mantém o cabeçalho do cargo visível sem overflow horizontal', async ({
    page,
  }) => {
    const email = uniqueTestEmail('workspace-mobile');
    await signUp(page, { email });
    await assignTestJobRole(email, 'SDR');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/app/workspace');
    await waitForAppReady(page);

    await expect(
      page.getByRole('heading', { name: 'SDR — Sales Development Representative' }),
    ).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
