import { expect, type Page } from '@playwright/test';
import { prisma } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';

// Sempre @atlasgr.com.br: só domínios autorizados (ver src/config/access-policy.ts) passam pela
// checagem client-side E pelo databaseHooks.user.create.before do better-auth (src/lib/auth.ts).
export function uniqueTestEmail(prefix: string): string {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return `e2e-${prefix}-${unique}@atlasgr.com.br`;
}

export const E2E_PASSWORD = 'E2eTestPassword123!';

interface SignUpOptions {
  email: string;
  password?: string;
  name?: string;
  /** Onde a sessão de teste deve ficar ao final. Default `'app'` (compatível com todos os specs
   *  existentes, que assumem CRM logo após `signUp()`). Use `'hub'` só quando o próprio teste for
   *  sobre o destino real pós-login (ver auth.spec.ts) — nesse caso o helper não normaliza pra
   *  `/app` e deixa a asserção conferir o redirecionamento de verdade. */
  landOn?: 'app' | 'hub';
}

// Cria um usuário real via o formulário de cadastro do LoginScreen (mesmo caminho que um usuário
// real percorre — sem atalho de API/seed), espera a navegação pro destino pós-login real (o Hub
// Executivo, `/hub` — ver Pilot 031/032 em .claude/PILOTS.md) e então deixa a sessão de teste
// pronta em `/app` (CRM), porque é o que a imensa maioria dos specs que consomem este helper
// assume logo em seguida (clique direto num botão da Sidebar, sem `goto` explícito antes).
//
// Desde que o cadastro passou a exigir confirmação de posse do e-mail
// (requireEmailVerification em src/lib/auth.ts — corrige um achado real do piloto de
// threat-modeling do Mantis: antes, qualquer "algo@atlasgr.com.br" digitado, mesmo não sendo dono
// real, virava sessão + ADMIN na hora), o sign-up passa a ter DOIS desfechos possíveis, e este
// helper não pode assumir qual: com `ALLOW_DEV_AUTH_BYPASS=true` (é o caso deste job de CI — ver
// ci.yml — e também de qualquer ambiente local que o exporte), `requireEmailVerification` fica
// `false` e o comportamento é o de sempre (sessão aberta na hora, direto pro Hub); sem o
// bypass, o better-auth NÃO loga mais automaticamente — a resposta vem com `token: null` e um
// e-mail de verificação é "enviado" (sem SMTP configurado em teste, o link só é logado no
// servidor — ver sendVerificationEmail em src/lib/auth.ts). Assumir sempre o segundo caso foi um
// bug real: neste job (bypass ligado) o app já navega pro Hub na hora, o aviso de confirmação
// nunca aparece, e esperar por ele até estourar 30s por chamada de `signUp()` — multiplicado por
// dezenas de specs — foi o que fez o `application gate` do CI estourar o timeout do job inteiro
// (30min) duas vezes seguidas. Por isso o helper detecta qual dos dois desfechos realmente
// aconteceu em vez de presumir.
export async function signUp(
  page: Page,
  { email, password = E2E_PASSWORD, name, landOn = 'app' }: SignUpOptions,
) {
  // Organization.name é @unique (prisma/schema.prisma) e o hook de signup (src/lib/auth.ts) deriva
  // o nome da org a partir de `name` + marca — um default fixo tipo "E2E Test User" faz toda
  // segunda chamada de signUp() colidir na constraint única. Isso apareceu mascarado como uma
  // suposta violação de RLS, porque o catch de executeWithRls (src/lib/prisma.ts) reexecutava a
  // query sem contexto nenhum depois do erro real (P2002) — bug real corrigido separadamente.
  const resolvedName = name ?? `E2E Test User ${email}`;
  // OnboardingTour.tsx mostra um tour em overlay 1.5s depois do primeiro carregamento de /app pra
  // qualquer navegador sem essa chave no localStorage — em testes isso sempre é "sem", então o
  // overlay aparecia no meio do teste e bloqueava clique nos botões da sidebar (crm.spec.ts).
  // addInitScript roda antes de qualquer script da página em toda navegação futura.
  await page.addInitScript(() => {
    window.localStorage.setItem('@prospector:has_seen_tour', 'true');
  });
  // ?signup=1: o link visível "Registrar Novo Acesso" foi removido da tela (contas são
  // provisionadas pelo admin), mas o formulário de cadastro real continua existindo — ver
  // comentário em LoginScreen.tsx. Evita reintroduzir um atalho de API/seed que fugiria do
  // caminho real que um usuário (ou o próprio LoginScreen em modo de teste) percorre.
  await page.goto('/login?signup=1');
  await page.getByPlaceholder('Ex: Marcelo Nascimento').fill(resolvedName);
  await page.getByLabel('E-mail:').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /Criar Nova Conta/ }).click();

  // 15s bastava numa suíte E2E curta, mas com dezenas de specs rodando em série (workers: 1) contra
  // o mesmo servidor/Postgres de teste, o signup (POST /api/auth/sign-up/email + refetch de sessão,
  // ver LoginScreen.tsx) ocasionalmente passa de 15s sob a carga do runner do CI — sem indício de
  // travamento real. 30s dá folga sem mascarar um hang de verdade.
  //
  // Corrida entre os dois desfechos possíveis (ver comentário da função) em vez de assumir um dos
  // dois: `Promise.race` resolve assim que o PRIMEIRO virar verdadeiro — na prática isso acontece
  // em segundos (não nos 30s cheios), porque o desfecho que realmente vai ocorrer neste ambiente
  // sempre se resolve rápido; só o desfecho que NÃO vai acontecer fica pendurado até seu próprio
  // timeout (daí o `.catch(() => null)`, pra nunca virar unhandled rejection).
  const verificationPanel = page.getByText(/Enviamos um link de confirmação/);
  const outcome = await Promise.race([
    page
      .waitForURL('**/hub*', { timeout: 30_000 })
      .then(() => 'authenticated' as const)
      .catch(() => null),
    verificationPanel
      .waitFor({ state: 'visible', timeout: 30_000 })
      .then(() => 'pending-verification' as const)
      .catch(() => null),
  ]);

  if (outcome === 'authenticated') {
    // Destino real do login é o Hub (`/hub`), não o CRM — normaliza pra `/app` aqui dentro do
    // helper (a menos que o teste peça `landOn: 'hub'` pra conferir o redirecionamento de verdade)
    // pra não obrigar dezenas de specs a inserirem um `goto('/app')` próprio só porque o destino
    // padrão pós-login mudou (ver comentário do topo da função).
    if (landOn === 'app') {
      await page.goto('/app');
      await page.waitForURL('**/app*', { timeout: 30_000 });
    }
    return;
  }
  if (outcome !== 'pending-verification') {
    throw new Error(
      'signUp(): nem a navegação para /hub nem o aviso de confirmação de e-mail apareceram a tempo.',
    );
  }

  // Confirma a posse do e-mail direto no banco — o passo que, numa conta real, aconteceria ao
  // clicar no link recebido (ver comentário do helper acima).
  requestContext.enterWith({ bypassRls: true });
  await prisma.user.update({ where: { email }, data: { emailVerified: true } });

  // Login real via API (não pela UI de novo) — só o CADASTRO em si precisa passar pela tela (é o
  // caminho que exercita o hook real de criação/RLS); autenticar de novo depois de confirmado não
  // precisa recarregar/hidratar a tela de login inteira só para preencher os mesmos 2 campos.
  // `page.request` compartilha o cookie jar do browser context com `page`, então o cookie de
  // sessão que a API devolve aqui já vale para a navegação seguinte.
  //
  // `page.request` não copia automaticamente um header Origin igual ao da página — melhor não
  // depender de estar (ou não) isento da checagem por ainda não ter cookie de sessão (ver
  // validateOrigin em node_modules/better-auth/dist/api/middlewares/origin-check.mjs) e mandar
  // explícito. `page.url()` aqui ainda é a tela de login/signup, então a origem é a confiável.
  const signInRes = await page.request.post('/api/auth/sign-in/email', {
    headers: { Origin: new URL(page.url()).origin },
    data: { email, password },
  });
  if (!signInRes.ok()) {
    throw new Error(
      `Login pós-verificação falhou (status ${signInRes.status()}): ${await signInRes.text()}`,
    );
  }
  await page.goto(landOn === 'hub' ? '/hub' : '/app');
  await page.waitForURL(landOn === 'hub' ? '**/hub*' : '**/app*', { timeout: 30_000 });
}

/**
 * Rebaixa/eleva o papel de um usuário já cadastrado, direto no banco de teste — usado só por
 * specs de RBAC que precisam de um papel diferente de ADMIN (o público `signUp()` sempre cria um
 * ADMIN, porque é sempre o primeiro usuário de uma Organization nova; não existe fluxo de
 * signup público para GESTOR/CLOSER/SDR/VISUALIZADOR, esses papéis só existem via convite de um
 * ADMIN — ver `src/features/team`). Mesmo padrão de bypass de RLS usado em
 * `tests/helpers/rbac-e2e-helpers.ts` para os testes de integração equivalentes.
 */
export async function setUserRole(
  email: string,
  role: 'ADMIN' | 'GESTOR' | 'CLOSER' | 'SDR' | 'VISUALIZADOR',
): Promise<void> {
  // `enterWith` (não `.run()`) de propósito — mesmo racional de `tests/helpers/rbac-e2e-helpers.ts`:
  // `prisma.user.update(...)` devolve um `PrismaPromise` preguiçoso (só dispara a query real ao
  // ser `await`ado), e o hook `$allOperations` da extensão (src/lib/prisma.ts) que lê
  // `requestContext.getStore()` roda nesse momento posterior — depois que um `.run(store, cb)`
  // síncrono já teria retornado. `enterWith` muta o contexto ambiente do resto da execução em vez
  // de escopar a um callback, e por isso sobrevive até a query de fato disparar.
  requestContext.enterWith({ bypassRls: true });
  await prisma.user.update({ where: { email }, data: { role } });
}

/**
 * Espera a tela do módulo lazy terminar de renderizar.
 *
 * Substitui `page.waitForLoadState('networkidle')`, que era usado em 11 pontos dos specs e não
 * podia funcionar neste app: `src/components/CrmBoard.tsx` abre um `EventSource`
 * (`/api/notifications/stream`) ao montar, e uma conexão SSE fica aberta de propósito enquanto a
 * tela existir — a rede nunca fica ociosa em `/app/crm`, então `networkidle` só podia estourar o
 * timeout. Nas demais telas ele até resolvia, mas tarde o bastante para consumir quase todo o
 * orçamento de 45s do teste. A própria documentação do Playwright desaconselha `networkidle`
 * justamente por isso.
 *
 * O sinal usado aqui é determinístico: o fallback de `<Suspense>` (`data-testid="page-fallback"`
 * em `src/App.tsx`) some exatamente quando o chunk do módulo terminou de carregar e a tela real
 * montou.
 */
export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByTestId('page-fallback')).toHaveCount(0, { timeout: 30_000 });
}
