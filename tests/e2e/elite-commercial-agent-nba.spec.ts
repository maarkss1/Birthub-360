import { test, expect } from '@playwright/test';
import { signUp, uniqueTestEmail, E2E_PASSWORD } from './helpers';

test.describe('Elite Commercial Agent - Next Best Action', () => {
  test('deve renderizar o workspace do Agente de Elite e os botões do Motor Híbrido NBA', async ({ page }) => {
    // 1. Cadastra um novo usuário
    const email = uniqueTestEmail('nba-agent');
    await signUp(page, { email, name: 'Comercial Elite' });

    // 2. Navega até a rota recém exposta do Agente Comercial de Elite
    await page.goto('/app/intelligence/elite-agent');

    // 3. Aguarda o render principal (título e overview)
    await expect(page.getByRole('heading', { name: 'Agente Comercial de Elite' })).toBeVisible();
    await expect(page.getByText('Mesa de execução autônoma multicanal e priorização comercial.')).toBeVisible();

    // 4. Verifica a presença do Card do "Motor Híbrido" (Next Best Action)
    await expect(page.getByText('O QUE FAZER AGORA')).toBeVisible();

    // 5. Verifica os botões de ação e adaptabilidade que inserimos para o feedback loop do NBA
    await expect(page.getByRole('button', { name: 'EXECUTAR AÇÃO' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ADIAR' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'TROCAR ESTRATÉGIA' })).toBeVisible();

    // Como é um teste apenas para provar a integração e o render, clicar 
    // neles sem o state (mission ativa carregada mockada) pode não ter 
    // um visual state claro de loading além de ser barrado por não ter missões no DB vazio de novos usuários.
    // O importante é garantir que a rota foi mapeada e a tela reativa do NBA renderiza os botões sem dar crash.
  });
});
