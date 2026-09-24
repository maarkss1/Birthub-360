import { test, expect } from '@playwright/test';
import { signUp, uniqueTestEmail } from './helpers';

test.describe('Elite Commercial Agent - Next Best Action', () => {
  test('deve renderizar o workspace do Agente de Elite e os botões do Motor Híbrido NBA', async ({ page }) => {
    // 1. Cadastra um novo usuário
    // name é derivado do email (padrão do helper) para garantir Organization.name único entre execuções
    const email = uniqueTestEmail('nba-agent');
    await signUp(page, { email });

    // 2. Navega até a rota recém exposta do Agente Comercial de Elite
    await page.goto('/app/intelligence/elite-agent');

    // 3. Aguarda o render principal (título e subtítulo real do componente)
    await expect(page.getByRole('heading', { name: 'Copiloto Comercial de Elite' })).toBeVisible();
    await expect(
      page.getByText(
        'Orquestração autônoma ponta a ponta: Inteligência, Estratégia, Histórico e Execução.',
      ),
    ).toBeVisible();

    // 4. Verifica a presença do Card do "Motor Híbrido" (Next Best Action)
    // O label real inclui o sufixo de prioridade: "O Que Fazer Agora • Prioridade Máxima"
    await expect(page.getByText('O Que Fazer Agora • Prioridade Máxima')).toBeVisible();

    // 5. Verifica os botões de ação e adaptabilidade (feedback loop do NBA)
    // Os labels reais incluem colchetes: "[ EXECUTAR AÇÃO ]", "[ ADIAR ]", "[ TROCAR ESTRATÉGIA ]"
    await expect(page.getByRole('button', { name: '[ EXECUTAR AÇÃO ]' })).toBeVisible();
    await expect(page.getByRole('button', { name: '[ ADIAR ]' })).toBeVisible();
    await expect(page.getByRole('button', { name: '[ TROCAR ESTRATÉGIA ]' })).toBeVisible();

    // O importante é garantir que a rota foi mapeada e a tela reativa do NBA renderiza os botões
    // sem dar crash — não clicamos pois sem missão ativa no DB o state de execução é incerto.
  });
});
