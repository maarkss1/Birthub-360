# INTEGRATION — Auditoria de Integrações Externas/Internas

## Agent

INTEGRATION (especialista em integrações externas/internas — Bitrix24, WhatsApp/Baileys, 3CX,
Birth Voice, Slack, Stripe, Omie, Chatwoot, Google Workspace, e-mail/assinatura de entrada) dentro
da auditoria multi-domínio do monorepo Birth Hub 360º.

## Mission

Auditar todas as integrações externas/internas reais do produto: autenticação/OAuth/refresh,
webhooks (assinatura, idempotência, ordem de montagem pré-auth), retry, timeout, rate limiting,
paginação, tratamento de erro, logging/correlationId, estado de sincronização/reconciliação e
isolamento de tenant. Classificar cada uma como REAL, PARTIAL, MOCKED, DOCUMENTED ONLY, BROKEN,
LEGACY ou UNUSED, com evidência `arquivo:linha`.

## Scope

`src/features/integrations/**` (bitrix, google, whatsapp, threecx, birth-voice, chatwoot, omie,
slack, stripe, signature, email), `src/bootstrap/webhooks.ts` + `src/bootstrap/routes.ts` (ordem
de montagem), `src/lib/crypto/{secretFields,piiFields}.ts` (criptografia de credenciais em
repouso), `src/lib/http.ts` (`fetchWithTimeout`), `prisma/schema.prisma` (models `*Connection`),
`src/hooks/use{Slack,Stripe,Omie}Integration.ts` e seus componentes de UI, `src/features/automations`
(para confirmar se as integrações estão de fato acionáveis por automação).

## Areas inspected

- Auditoria prévia do Bitrix24 (`BITRIX24-LEAD-FLOW-AUDIT.md`) — **removida do controle de versão**
  em 22/08/2026 (`docs/REMOVED-DOCS.md:29`); não existe substituto versionado. Reauditei Bitrix do
  zero, focando nos pontos que a skill `integration-audit/SKILL.md` registra como já corrigidos
  (circuit breaker, paginação do sync automático, status de sync visível) para confirmar se
  seguem verdadeiros no código atual — todos confirmados corrigidos (ver seção "Confirmado
  resolvido" abaixo).
- Bitrix24: `client.ts` (retry/backoff/circuit breaker), `syncRules.ts` (paginação do worker
  automático), `outboundSync.ts` (idempotência de criação, dedup por `crm.duplicate.findbycomm`),
  `bitrix.webhook.ts` (autenticação por `application_token` + replay guard).
- Slack, Stripe, Omie — os 3 conectores mais recentes do repositório (commit `72f0bd40`,
  "feat(integrations): adiciona conectores Slack, Stripe e Omie"): service + routes completos.
- Chatwoot, e-mail de entrada (CYC-003) e status de assinatura (CYC-006) — webhooks de entrada
  pré-`express.json()`.
- 3CX: webhook de chamada (assinatura HMAC) + resolução de tenant por ramal + supressão de
  chamada (`callSuppression.service.ts`, compartilhado com Birth Voice).
- WhatsApp (Baileys): sessão por tenant, lock distribuído multi-réplica, reconexão.
- Google Workspace: OAuth2, refresh token, timeout.
- Criptografia em repouso de todas as credenciais de conexão (`ENCRYPTED_MODEL_FIELDS`).
- Confirmação de que o pipeline órfão de Apollo citado na skill (`src/lib/enrichment/apollo.ts` +
  `src/lib/queue/enrich.worker.ts`) **não existe mais no repositório** — já removido.
- Cobertura de teste (`__tests__`) por integração.

## Files inspected

Aproximadamente 55 arquivos lidos ou inspecionados diretamente (código de serviço, rotas,
webhooks, schema, criptografia), mais ~30 arquivos varridos por grep para confirmar ausência de
padrões (retry, testes, referências de automação).

## Executive summary

O nível de maturidade das integrações "core" deste produto (Bitrix24, WhatsApp, 3CX, Birth Voice,
Google) é **sensivelmente mais alto do que o documento de contexto compartilhado sugeria** — várias
lacunas descritas na skill `integration-audit/SKILL.md` como abertas já foram corrigidas no código
atual: o worker de sync automático do Bitrix agora pagina de verdade (`syncRules.ts`), existe um
circuit breaker real por conexão (`client.ts:268-347`), a criação de lead no Bitrix é atômica e
deduplicada (`outboundSync.ts:52-66,171-216`), o webhook de entrada do Bitrix tem replay guard e
autenticação por `application_token` comparado em tempo constante, a sessão WhatsApp tem lock
distribuído com heartbeat para tolerar múltiplas réplicas (`whatsapp.service.ts:40-100`), e o
pipeline órfão de Apollo com fallback mockado citado na skill **não existe mais no repositório**.
Trato esses pontos como confirmados-resolvidos, não como achados novos.

A área de risco real está nos **3 conectores mais novos (Slack, Stripe, Omie, todos do mesmo
commit)**: tecnicamente corretos (validam credencial contra a API real antes de persistir, cifram
segredo em repouso, protegem contra SSRF onde a URL é de tenant), mas **sem nenhum retry/backoff**
(diferente do padrão já estabelecido em `bitrix/service/client.ts`), **sem nenhum teste automatizado**,
**sem idempotency key na criação de cobrança do Stripe** (risco real de cobrança duplicada), e
**completamente desconectados do motor de automações** — existem só como ferramentas manuais de
tela de Integrações, não como ações de workflow, o que é uma lacuna de produto notável para um CRM
que se posiciona em torno de automação comercial ponta a ponta.

Um segundo grupo de achados é a dívida **já autodocumentada no próprio código** (webhook de e-mail
de entrada, envio de assinatura gov.br, sincronização Chatwoot→CRM, ramal-como-chave-de-tenant do
3CX) — confirmo que essas notas continuam precisas hoje e as recito com a evidência atual, mas não
as trato como descobertas novas: são débito já rastreado e intencional.

## Critical

Nenhum achado CRITICAL confirmado nesta auditoria (nenhum vazamento cross-tenant, perda de dado ou
integração core quebrada foi encontrado com evidência direta).

## High

### INTEGRATION-001 — Criação de cobrança Stripe sem Idempotency-Key (risco de cobrança duplicada)

- **Evidência:** `src/features/integrations/stripe/stripe.service.ts:183-224` (`createStripeCharge`)
  monta o `POST /v1/payment_intents` só com `amount/currency/receipt_email/description/payment_method/confirm`
  — nenhum header `Idempotency-Key` é enviado. `stripeRequest` (linhas 39-59) também não aceita nem
  gera um.
- **Consequência real:** a Stripe recomenda idempotency key precisamente para este endpoint porque
  qualquer nova tentativa da MESMA intenção de cobrança (timeout do lado do Atlas, duplo clique no
  botão "Cobrar" na tela de Integrações, um retry futuro de automação) cria um **PaymentIntent novo
  e distinto** — cobrança duplicada de um cliente real, não um erro cosmético. Como não há retry
  automático hoje (achado INTEGRATION-002), o vetor mais provável é o duplo-clique humano ou um
  timeout de rede que leva o operador a tentar de novo manualmente, achando que a primeira falhou.
- **Severidade:** HIGH (dinheiro real). **Prioridade:** P1.
- **Correção mínima sugerida:** gerar uma idempotency key determinística por requisição (ex.: hash
  de `organizationId+connectionId+amount+customerEmail+timestamp arredondado`, ou aceitar uma key do
  chamador) e enviá-la no header `Idempotency-Key` do POST.
- **Taxonomia:** TD-BUG + TD-INTEGRATION + TD-BILLING. **Confiança:** HIGH. **Status:** CONFIRMED.

### INTEGRATION-002 — Slack/Stripe/Omie sem retry/backoff, diferente do padrão já estabelecido no projeto

- **Evidência:** `src/lib/http.ts:40-67` (`fetchWithTimeout`) faz **um único** `fetch` com timeout via
  `AbortController` — nenhum retry, nenhum backoff, nenhuma distinção de erro recuperável vs.
  definitivo. É a função usada por `slack.service.ts:155-167` (chat.postMessage),
  `stripe.service.ts:44-59` (`stripeRequest`) e `omie.service.ts:58-74` (`callOmieRpc`). Compare com
  `src/features/integrations/bitrix/service/client.ts:349-420`, que já implementa exatamente esse
  padrão (retry+backoff exponencial+jitter+classificação de erro recuperável) para o mesmo tipo de
  chamada HTTP a um provedor externo.
- **Consequência real:** uma falha transiente (timeout de rede, 5xx momentâneo do Slack/Stripe/Omie,
  ou 429 de rate limit da própria Stripe/Slack) vira erro definitivo imediato para o usuário — sem
  nenhuma segunda chance automática — em vez de se recuperar sozinha como o Bitrix já faz.
- **Severidade:** MEDIUM para Slack/Omie, HIGH para Stripe (combinado com a ausência de idempotency
  key do INTEGRATION-001 — sem retry automático, o UX empurra o operador para o retry MANUAL, que é
  exatamente o cenário perigoso sem idempotency key). **Prioridade:** P1 (Stripe) / P2 (Slack/Omie).
- **Correção mínima sugerida:** reutilizar a mesma lógica de `client.ts` (extraível como um helper
  genérico de retry) em vez de reinventar por integração.
- **Taxonomia:** TD-INTEGRATION + TD-TECH. **Confiança:** HIGH. **Status:** CONFIRMED.

### INTEGRATION-003 — Slack/Stripe/Omie shipped sem nenhum teste automatizado

- **Evidência:** não existe diretório `__tests__` nem arquivo `*.test.ts` sob
  `src/features/integrations/{slack,stripe,omie}/` (confirmado por busca de arquivo — zero
  resultados), enquanto o mesmo commit (`72f0bd40`) que introduziu os 3 conectores não trouxe teste
  algum para eles. Para comparação, `src/features/integrations/bitrix/__tests__` e
  `.../threecx/__tests__` têm cobertura real (dezenas de testes no total sob
  `src/features/integrations/**/__tests__`), e até o Chatwoot (adicionado antes) tem
  `chatwoot.helpers.test.ts`.
- **Consequência real:** nenhuma regressão em criptografia de credencial, validação de SSRF
  (`assertSafeExternalUrl` no webhook do Slack), criação de cobrança Stripe, ou parsing de
  telefone do Omie (ver INTEGRATION-010) é pega automaticamente — a validação depende hoje de teste
  manual.
- **Severidade:** HIGH para Stripe (movimenta dinheiro real sem nenhum teste de
  `createStripeCharge`/`getStripeCharge`), MEDIUM para Slack/Omie. **Prioridade:** P1 (Stripe) / P2.
- **Taxonomia:** TD-TEST. **Confiança:** HIGH. **Status:** CONFIRMED.

## Medium

### INTEGRATION-004 — Resolução de tenant do 3CX por ramal: scan O(n) de organizações + descarte silencioso em colisão

- **Evidência:** `src/features/integrations/threecx/threecx.service.ts:421-483`
  (`resolveConnectionByExtension`) varre TODAS as organizações a cada webhook recebido
  (`prisma.organization.findMany`, sem filtro) e, se dois tenants tiverem o MESMO número de ramal
  configurado (plausível — ramais como "100"/"101" são defaults comuns de PABX), retorna
  `'ambiguous'` e o evento é **descartado para os dois tenants**, sem alerta agregado (só um
  `logger.warn`, linhas 563-573 — não incrementa nenhuma métrica Prometheus como
  `bitrixSyncFailuresTotal` faz para o Bitrix).
- Este é um gap **já autodocumentado no próprio código** como "CUSTO CONHECIDO, NÃO RESOLVIDO NESTA
  TAREFA" (linhas 450-455), incluindo a correção arquitetural correta já identificada (um
  identificador de conexão no path da URL do webhook, mesmo padrão do Bitrix). Confirmo que a nota
  continua precisa e que o gap segue aberto no código atual — não é um achado novo, mas segue sem
  dono/prazo.
- **Severidade:** MEDIUM (não escala e tem um cenário de colisão plausível e silencioso).
  **Prioridade:** P2.
- **Taxonomia:** TD-ARCH + TD-TENANT. **Confiança:** HIGH. **Status:** CONFIRMED (débito
  pré-existente, revalidado).

### INTEGRATION-005 — Cache de `getStatusLabels` do Bitrix é um único slot, não por conexão

- **Evidência:** `src/features/integrations/bitrix/service/client.ts:422-435`. `statusLabelCache`
  é uma variável de módulo `{ webhookUrl, labels } | null` — não um `Map` por `webhookUrl`. Em
  produção multi-tenant (múltiplas organizações, cada uma com seu próprio `BitrixConnection`), cada
  chamada de uma organização diferente invalida e substitui inteiramente o cache da anterior — sob
  tráfego intercalado entre tenants, o cache nunca acerta (sempre uma chamada `crm.status.list` real
  ao Bitrix, no lugar do ganho de performance que o cache pretende dar).
- Não é um bug de correção/vazamento — o `if (statusLabelCache?.webhookUrl === webhookUrl)` impede
  devolver dado de outro portal — só um cache ineficaz sob a carga real do produto (multi-tenant).
- **Severidade:** LOW-MEDIUM. **Prioridade:** P3.
- **Correção mínima sugerida:** trocar por `Map<webhookUrl, {labels, expiresAt}>` com TTL.
- **Taxonomia:** TD-PERF. **Confiança:** HIGH. **Status:** CONFIRMED.

### INTEGRATION-006 — Slack/Stripe/Omie inacessíveis pelo motor de automações (ferramentas manuais, não ações de workflow)

- **Evidência:** busca por `slack|stripe|omie` (case-insensitive) em `src/features/automations/**`
  não retornou nenhum arquivo. `sendSlackMessage`, `createStripeCharge` e `upsertOmieCustomer` só
  são chamados a partir das próprias rotas manuais (`slack.routes.ts:67-85`,
  `stripe.routes.ts:68-84`, `omie.routes.ts:67-83`) — nenhum nó de automação, gatilho de mudança de
  estágio, ou evento de negócio ("Negócio Ganho" etc.) os aciona automaticamente.
- **Consequência de produto:** para um CRM que se posiciona como "central de comando... acelerando a
  execução" com automações, os 3 conectores mais recentes existem hoje só como botões manuais na
  tela de Integrações (enviar 1 mensagem de teste, criar 1 cobrança avulsa, cadastrar 1 cliente
  avulso) — não há caminho de "quando o negócio fecha, cadastra automaticamente no Omie e avisa no
  Slack", que é o caso de uso óbvio que justificaria essas 3 integrações existirem.
- **Severidade:** MEDIUM (lacuna de funcionalidade, não bug). **Prioridade:** P2.
- **Taxonomia:** TD-FEAT + TD-INTEGRATION. **Confiança:** HIGH. **Status:** CONFIRMED (ausência
  verificada por busca completa do diretório de automações).

## Low

### INTEGRATION-007 — Chatwoot: webhook de entrada autenticado, mas sem nenhuma sincronização com o CRM

- **Evidência:** `src/features/integrations/chatwoot/chatwoot.webhook.ts:10-16,64-74`. Comentário do
  próprio arquivo já declara: "hoje só valida a assinatura e registra o evento em log; não escreve
  nada no CRM... decisão de produto ainda não tomada". Autenticação HMAC (`chatwoot.helpers.ts`)
  e idempotência (`claimWebhookDelivery`) já são reais.
- **Severidade:** LOW (transporte real, decisão de produto pendente, já rastreada). **Prioridade:**
  P3. **Taxonomia:** TD-FEAT. **Confiança:** HIGH. **Status:** CONFIRMED, já autodocumentado — sem
  ação de código necessária além do que já está anotado.

### INTEGRATION-008 — Webhook de e-mail de entrada e assinatura gov.br continuam stubs de transporte (autodocumentado)

- **Evidência:** `src/features/integrations/email/emailReply.webhook.ts:16-32` (CYC-003) e
  `src/features/integrations/signature/signatureStatus.webhook.ts:9-15` (CYC-006). Ambos:
  assinatura HMAC real, idempotência real (`EmailMessage.organizationId_providerMessageId` unique;
  `applySignatureStatusUpdate` com guarda de transição), mas **nenhum provedor real** (SendGrid/
  Postmark/Mailgun para e-mail; nenhum integrador gov.br configurado para assinatura) está
  efetivamente plugado — o endpoint aceita o payload no formato que o provedor real entregaria,
  decisão de produto explícita já registrada no código ("construir com stub, plugar depois").
- **Severidade:** LOW/INFO — revalidação de débito já conhecido, não uma descoberta.
- **Taxonomia:** TD-INTEGRATION (DOCUMENTED ONLY). **Confiança:** HIGH. **Status:** CONFIRMED.

### INTEGRATION-009 — Parsing de telefone do Omie (heurística de DDD) não validado contra conta real

- **Evidência:** `src/features/integrations/omie/omie.service.ts:170-176,202-213`
  (`upsertOmieCustomer`) — o próprio comentário já assume o risco: "o formato exato esperado pelo
  Omie para números fora do padrão BR não foi validado contra uma conta real nesta implementação".
- **Severidade:** LOW. **Prioridade:** P3. **Taxonomia:** TD-IMPL. **Confiança:** MEDIUM (autor já
  assume incerteza; não testado nesta auditoria contra conta Omie real). **Status:**
  NEEDS_VERIFICATION.

### INTEGRATION-010 — WhatsApp via Baileys: risco estrutural de protocolo não-oficial (produto, não bug)

- **Evidência:** `src/features/integrations/whatsapp/whatsapp.service.ts` usa
  `@whiskeysockets/baileys`, uma implementação não-oficial do protocolo WhatsApp Web (QR code por
  tenant). Reconexão com backoff exponencial real (`MAX_RECONNECT_ATTEMPTS=5`,
  `RECONNECT_BASE_DELAY_MS=2000` até `RECONNECT_MAX_DELAY_MS=60000`, linhas 36-38) e lock
  distribuído multi-réplica (linhas 40-100) já mitigam boa parte do risco operacional — mas a
  dependência de um protocolo não-suportado oficialmente pelo WhatsApp continua um risco de produto
  (pode quebrar sem aviso numa atualização do WhatsApp, ou levar a banimento de número), não algo
  que uma correção de código resolve.
- **Severidade:** LOW como achado de código (a engenharia em cima do risco é sólida); o risco de
  produto em si é estrutural e deve ser tratado como decisão de negócio, não bug. **Status:**
  CONFIRMED, sem ação de código pendente identificada.

## Technical debt

Ver INTEGRATION-002 (retry ausente em 3 integrações), INTEGRATION-004 (scan O(n) de tenant no 3CX),
INTEGRATION-005 (cache de único slot no Bitrix).

## Implementation debt

Ver INTEGRATION-009 (parsing de telefone Omie não validado).

## Feature debt

Ver INTEGRATION-006 (Slack/Stripe/Omie fora do motor de automações) e INTEGRATION-007 (Chatwoot sem
sincronização com CRM).

## Bugs

Ver INTEGRATION-001 (Stripe sem idempotency key — o único achado desta auditoria com risco
financeiro direto e concreto).

## Architecture

Ver INTEGRATION-004 (resolução de tenant do 3CX por varredura completa de organizações a cada
webhook — não escala e já está documentado como tal pelo próprio time).

## Security

Nenhum achado novo de segurança nas integrações auditadas. Confirmado como correto: criptografia em
repouso (AES-256-GCM) para `BitrixConnection.webhookUrl`, `SlackConnection.{webhookUrl,botToken}`,
`StripeConnection.secretKey`, `OmieConnection.{appKey,appSecret}`,
`ThreeCXConnection.{apiKey,apiSecret}` — todos registrados em
`src/lib/crypto/piiFields.ts:34-50` e aplicados de forma transparente pela extensão Prisma
(`src/lib/prisma.ts`); todos os webhooks de entrada (Bitrix, 3CX, Chatwoot, e-mail, assinatura,
Birth Voice) são fail-closed quando o segredo não está configurado (503, nunca aceita sem
segredo) e usam `timingSafeEqual`/HMAC para comparação de assinatura; validação de SSRF
(`assertSafeExternalUrl`/`safeFetch`) é aplicada a toda URL de tenant (Slack Incoming Webhook,
Bitrix webhookUrl, 3CX pbxUrl) tanto no cadastro quanto revalidada a cada chamada real (fecha
janela de DNS rebinding). Nenhuma credencial de integração aparece em texto puro nas respostas de
API (`toSummary`/`hasWebhook`/`hasBotToken`/`secretKeyLast4`/`appKeyLast4` em vez do valor real).

## Tests

Ver INTEGRATION-003. Resumo por integração: Bitrix24 e 3CX têm suítes reais e substanciais
(a maior parte dos ~30 arquivos de teste sob `src/features/integrations/**/__tests__`); Birth Voice
e WhatsApp têm teste de serviço/webhook; Chatwoot tem 1 arquivo de teste
(`chatwoot.helpers.test.ts`); **Slack, Stripe e Omie têm zero testes**.

## Integration

Matriz completa por integração — ver "Complete findings list" e a tabela abaixo.

| Integração | Classificação | Credencial (onde/cifrada?) | Retry/Backoff | Timeout | Idempotência | Paginação | Testes |
|---|---|---|---|---|---|---|---|
| Bitrix24 | REAL | `BitrixConnection.webhookUrl`, AES-256-GCM (`piiFields.ts:47`) | Sim, real (`client.ts:349-420`, 4 tentativas, backoff+jitter, `Retry-After`) | 15s (`client.ts:24`) | Sim (`claimOutboundSync` atômico + `crm.duplicate.findbycomm` + replay guard no webhook de entrada) | Sim, corrigido (`syncRules.ts`, segue cursor `next` até teto de páginas) | Extensa (dezenas de testes) |
| Google Workspace | REAL | `GoogleWorkspaceConnection.{accessToken,refreshToken}`, AES-256-GCM | N/A (OAuth token endpoint, não chamado em loop) | 15s (`OAUTH_TOKEN_TIMEOUT_MS`) | N/A | N/A (Gmail/Calendar readonly, não varre lista completa nesta auditoria) | Não verificado nesta passada |
| WhatsApp (Baileys) | REAL, protocolo não-oficial | Sessão via Redis (`useRedisAuthState.ts`) + lock distribuído (`distributedLock.ts`) | Reconexão com backoff (5 tentativas, até 60s) | Timeout de chamada Baileys 15s | Lock distribuído evita sessão duplicada multi-réplica | N/A | Presente |
| 3CX | REAL | `ThreeCXConnection.{apiKey,apiSecret}`, AES-256-GCM | Não verificado a fundo (fora do escopo desta passada) | Sim | Sim (`(organizationId, callId, eventType)` unique) | N/A | Extensa |
| Birth Voice | REAL | `VoiceHubConnection.{apiKey,webhookSecret}`, AES-256-GCM | Não verificado a fundo | Sim | Supressão de chamada checada (`callSuppression.service.ts`) em 2 pontos de disparo (Birth Voice + 3CX) | N/A | Presente |
| Slack | REAL (transporte manual) | `SlackConnection.{webhookUrl,botToken}`, AES-256-GCM | **Não** (INTEGRATION-002) | 10s | N/A (mensagem, não há chave de negócio a deduplicar) | N/A | **Nenhum** (INTEGRATION-003) |
| Stripe | REAL (transporte manual) | `StripeConnection.secretKey`, AES-256-GCM | **Não** (INTEGRATION-002) | 10s | **Não** — sem Idempotency-Key (INTEGRATION-001) | N/A | **Nenhum** (INTEGRATION-003) |
| Omie | REAL (transporte manual) | `OmieConnection.{appKey,appSecret}`, AES-256-GCM | **Não** (INTEGRATION-002) | 15s | Não verificado (IncluirCliente pode duplicar cliente em reenvio — não testado) | N/A | **Nenhum** (INTEGRATION-003) |
| Chatwoot | PARTIAL (autenticação real, sem efeito no CRM) | N/A (só segredo de webhook via env) | N/A | N/A | Sim (replay guard) | N/A | 1 arquivo |
| E-mail de entrada | DOCUMENTED ONLY / stub de transporte | N/A | N/A | N/A | Sim (`providerMessageId` unique) | N/A | Não verificado |
| Assinatura (gov.br) | DOCUMENTED ONLY / stub de transporte | N/A | N/A | N/A | Sim (guarda de transição de estado) | N/A | Não verificado |
| Apollo/Hunter (enriquecimento) | REAL (pipeline ativo em `src/features/prospecting/services/apollo/*`) | Chave de API via env (`PROSPECTING_PROVIDER_MODE`) | Não auditado nesta passada | — | — | — | — |

## Product

Ver INTEGRATION-006 — a lacuna mais relevante de produto encontrada: 3 integrações novas
(Slack/Stripe/Omie) sem nenhum gatilho automático a partir de eventos reais do CRM (negócio ganho,
negócio em risco, etc.), o que deixa o valor de produto dessas integrações abaixo do que a proposta
de "central de comando... acelerando a execução" sugere.

## Mock/Fake/Placeholder

Nenhum dado fabricado/mockado foi encontrado nas integrações auditadas nesta passada. O pipeline
órfão de Apollo com fallback mockado citado na skill `integration-audit/SKILL.md`
(`src/lib/enrichment/apollo.ts` + `src/lib/queue/enrich.worker.ts`) **não existe mais no
repositório** — confirmado por busca de arquivo; trato como já removido/resolvido, não como achado
ativo.

## Dead/Orphan code

Nenhum código órfão de integração identificado nesta passada (o órfão previamente conhecido, Apollo,
já foi removido — ver acima).

## Quick wins

- Adicionar header `Idempotency-Key` em `createStripeCharge` (INTEGRATION-001) — mudança pequena e
  isolada, risco de regressão baixo, elimina um risco financeiro real.
- Extrair a lógica de retry+backoff já existente em `bitrix/service/client.ts` para um helper
  genérico e aplicá-la em `stripeRequest`/`callOmieRpc`/`sendSlackMessage` (INTEGRATION-002).
- Trocar `statusLabelCache` de slot único para `Map` por `webhookUrl` em `client.ts`
  (INTEGRATION-005) — 5 linhas, sem risco.

## Structural problems

- Resolução de tenant do 3CX por varredura completa de organizações a cada webhook
  (INTEGRATION-004) — já documentada no código como débito arquitetural conhecido; migrar para
  identificador de conexão no path da URL do webhook (mesmo padrão do Bitrix) exige mudança de rota
  e possivelmente de schema.
- Slack/Stripe/Omie vivem fora do motor de automações (INTEGRATION-006) — não é um bug isolado, é
  uma decisão de arquitetura de produto ainda não tomada sobre como essas integrações se conectam a
  eventos de negócio.

## Needs verification

- INTEGRATION-009 (parsing de telefone Omie) — o próprio autor já registra a incerteza; precisa de
  teste contra uma conta Omie real, não verificável nesta auditoria sem credencial real.
- Comportamento de duplicidade do `IncluirCliente` do Omie quando o mesmo CNPJ é reenviado (upsert
  real no lado do Omie, ou duplicata?) — não testado nesta auditoria; a API do Omie normalmente
  trata isso como upsert por CNPJ, mas isso não foi confirmado contra o comportamento real do
  provedor aqui.
- Retry/timeout do lado do 3CX/Birth Voice para chamadas de originação (`make3CXCall`) não foi
  auditado a fundo nesta passada (fora do foco principal, que foram os 3 conectores novos e a
  revalidação do Bitrix).

## Complete findings list

| ID | Título | Severidade | Prioridade | Confiança | Status |
|---|---|---|---|---|---|
| INTEGRATION-001 | Stripe: criação de cobrança sem Idempotency-Key | HIGH | P1 | HIGH | CONFIRMED |
| INTEGRATION-002 | Slack/Stripe/Omie sem retry/backoff | HIGH (Stripe) / MEDIUM (Slack, Omie) | P1/P2 | HIGH | CONFIRMED |
| INTEGRATION-003 | Slack/Stripe/Omie sem testes automatizados | HIGH (Stripe) / MEDIUM (Slack, Omie) | P1/P2 | HIGH | CONFIRMED |
| INTEGRATION-004 | 3CX: resolução de tenant por ramal não escala + colisão silenciosa | MEDIUM | P2 | HIGH | CONFIRMED |
| INTEGRATION-005 | Bitrix: cache de status labels de slot único | LOW-MEDIUM | P3 | HIGH | CONFIRMED |
| INTEGRATION-006 | Slack/Stripe/Omie fora do motor de automações | MEDIUM | P2 | HIGH | CONFIRMED |
| INTEGRATION-007 | Chatwoot: webhook autenticado sem sincronização com CRM | LOW | P3 | HIGH | CONFIRMED (autodocumentado) |
| INTEGRATION-008 | E-mail de entrada e assinatura gov.br continuam stubs de transporte | INFO/LOW | P3 | HIGH | CONFIRMED (autodocumentado) |
| INTEGRATION-009 | Omie: parsing de telefone (heurística DDD) não validado contra conta real | LOW | P3 | MEDIUM | NEEDS_VERIFICATION |
| INTEGRATION-010 | WhatsApp via Baileys: risco estrutural de protocolo não-oficial | LOW (código) | P4 | HIGH | CONFIRMED (risco de produto, não bug) |

### Confirmado resolvido nesta passada (não reportar como aberto em auditorias futuras)

- Paginação do worker de sync automático do Bitrix (`syncRules.ts`) — segue o cursor `next` até um
  teto de páginas, com o teto e o motivo de parada visíveis em `BitrixSyncLog.errorMessage`.
- Ausência de circuit breaker no cliente Bitrix — implementado em `client.ts:268-347` (por conexão,
  5 falhas consecutivas → 60s de cooldown).
- `Lead.bitrixSyncStatus` não refletia falha do push automático — corrigido, `pushLeadToBitrix`/
  `syncLeadToBitrix` gravam status e erro em toda tentativa (sucesso ou falha).
- Credenciais de integração em texto puro (`GoogleWorkspaceConnection`, `BitrixConnection`) —
  cifradas em repouso via `secretFields.ts`/`piiFields.ts` (AES-256-GCM), estendido também às 3
  integrações novas (Slack/Stripe/Omie) desde o primeiro commit delas.
- Sessão WhatsApp em `Map` local por processo, vulnerável a múltiplas réplicas abrindo a mesma
  sessão — mitigado por lock distribuído com heartbeat/TTL (`whatsapp.service.ts:40-100`,
  documentado como correção RUN-011/Onda 41).
- Pipeline órfão de Apollo com fallback mockado (`src/lib/enrichment/apollo.ts` +
  `src/lib/queue/enrich.worker.ts`) — removido do repositório.
