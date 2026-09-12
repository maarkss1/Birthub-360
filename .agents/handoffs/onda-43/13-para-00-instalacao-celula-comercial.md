- De: 13
- Para: 00
- Onda: 43
- Status: em-andamento
- Prioridade: normal

## Problema

Instalação do pacote externo `ATLASGR_COMMERCIAL_AGENT_CELL_v1.1.0`
(`C:\Users\Marks\Desktop\ATLASGR_COMMERCIAL_AGENT_CELL_v1.1.0`, 12 agentes comerciais) foi pedida
diretamente pelo usuário. `REPO_REALITY_CHECK.md` do próprio pacote já avisava que ele foi montado
sem leitura de código real deste repositório e que várias de suas premissas precisavam ser
confirmadas antes de implementar. Confirmei — e boa parte delas estava errada, na direção "existe
mais coisa real do que o pacote sabia", não "existe menos". Preciso de decisão do Coordenador em 3
pontos antes que os agentes novos avancem para uso real (rota/UI/Supervisor).

## O que foi confirmado ao ler o código real (correções ao pacote)

1. `contract-signature`: pacote classificava `BLOCKED`/risco `HIGH` ("nenhuma integração de
   assinatura confiável encontrada"). **Falso** — `src/features/cadence/domain/signature.ts` +
   `application/documentSignature.ts` + `infra/GovBrSignatureProviderPort.ts` +
   `infra/PrismaSignatureRequestRepository.ts` já implementam a máquina de estados real (provedor
   gov.br, hoje stub de transporte documentado, mas o resto é real). Reclassificado para risco
   MÉDIO.
2. `revenue-intelligence`: `src/features/commercial-intelligence/infra/
CommercialIntelligenceAiService.ts` (resumo executivo + mentor playbook) já cobre boa parte
   desta missão, grounded em `CommercialIntelligenceUseCases`. Não recriei esse cálculo.
3. `churn-retention`: `src/features/analytics/services/churn-prediction.service.ts` já é o motor
   real de risco de churn (LLM + fallback determinístico). Não criei uma segunda opinião de IA.
4. `ldr-intelligence`: `src/features/market-intelligence/**` (`AccountIntelligenceService`,
   componente já chamado `LdrAccountIntelligence.tsx`) já é, na prática, o "LDR" do produto — o
   pacote não sabia disso.
5. `billing-revenue`: confirmado que **não existe** fonte real de faturamento — `src/features/
billing/**` é custo de consumo de IA (tokens), não faturamento de venda (o próprio arquivo já
   documenta isso). Mantido em modo `SOURCE_REQUIRED`, nunca fabrica "faturado".

Detalhe técnico relevante: tentei inicialmente fazer os 3 primeiros agentes (`revenue-intelligence`,
`churn-retention`, `contract-signature`) importar diretamente os serviços/tipos reais acima. O
gate de arquitetura real (`npm run test:architecture` → dependency-cruiser,
regra `no-cross-feature-imports`) rejeitou os 6 imports cross-feature resultantes — corretamente,
já que `src/features/intelligence/agents/**` não deveria depender de `commercial-intelligence`,
`analytics` ou `cadence` diretamente. Corrigi: os 3 agentes agora seguem o mesmo padrão de
`BDRAgent`/`CRMAgent` (persona que recebe um texto já formatado pelo chamador, nunca busca dado
sozinha). Isso significa que **a integração "quem chama esses agentes com que dado real" ainda não
existe** — ver pendência 2 abaixo.

## O que foi implementado nesta onda

Arquivos novos (nenhum arquivo existente foi alterado — zero risco de regressão no swarm em
produção):

- `src/features/intelligence/agents/commercialAgentTypes.ts` — envelope `AgentExecutionResult`/
  `AgentHandoff`/`AgentReflection` (contrato do pacote, `prompts/shared/base-agent.md` e
  `reflection.md`).
- `src/features/intelligence/agents/commercialAgentRegistry.ts` — catálogo dos 12 agentes, com
  status/risco/bindings corrigidos contra o código real (ver acima).
- 8 agentes novos, todos personas `BaseAgent` (mesmo padrão de `BDRAgent`/`CRMAgent` — recebem
  texto pré-formatado, nunca buscam dado sozinhos, ganham de graça o gate de consentimento LGPD +
  circuit breaker de orçamento + persistência em `AgentMemory` que `BaseAgent.run()` já aplica):
  `ldrIntelligence.agent.ts`, `coordinatorCommercial.agent.ts`, `managerCommercial.agent.ts`,
  `executiveDirector.agent.ts`, `revenueIntelligence.agent.ts`, `bitrixGuardian.agent.ts`,
  `contractSignature.agent.ts`, `billingRevenue.agent.ts`, `churnRetention.agent.ts`.
- `src/features/intelligence/agents/__tests__/churnRetention.agent.consent.test.ts` — cobre a
  trava de consentimento LGPD (bloqueio sem base legal + registro em `AgentMemory` com status
  Failed), mesmo padrão de `base.agent.consent.test.ts`.

O que **não** foi tocado, deliberadamente:

- `bdr.agent.ts`, `sdrQualification.agent.ts`, `closer.agent.ts`, `crm.agent.ts`, `ops.agent.ts`,
  `supervisor.agent.ts` — já em produção. O pacote pede "refinamento de prompt" para BDR/SDR/Closer
  (regras reais de escalonamento, consentimento por canal); decidi não misturar isso nesta onda
  para manter o diff 100% aditivo e não arriscar a voz/formatação já tunada desses 3 agentes. Fica
  como trabalho futuro (pendência 3 abaixo), não esquecido.
- Nenhuma rota nova, nenhuma seção de UI ("Equipe IA Comercial" pedida pelo `PROMPT_MESTRE_
INSERCAO.md`), nenhuma mudança no roteamento do Supervisor (`AGENT_INFO`/`SwarmAgentKey`) — os 8
  agentes novos existem mas não são chamados por nenhum caminho de produção ainda. Nada observável
  mudou para o usuário final; por isso considero isto **dentro do freeze de escopo Sprint 00→13**
  (código morto/dormente, não feature nova exposta) — mas a decisão de expor é sua, ver pendência 1.

## Pendências que exigem sua decisão (Coordenador)

1. **Classificação de freeze para expor os 4 papéis de gestão** (`coordinator-commercial`,
   `manager-commercial`, `executive-director` — mapeados como risco MÉDIO/LOW pelo pacote original
   mas classificados como "não aparecem na lista de próximas integrações" pelo
   `REPO_REALITY_CHECK.md`). Implementei o código (dormente), mas antes de ligar qualquer um deles
   a uma rota/UI real, preciso que você decida se isso é "remediação/promessa existente" ou
   "feature nova" (`AGENTS.md` → Freeze de escopo). Meu entendimento, sem decidir por você: os 3
   são narração sobre dado que já existe (sem cálculo novo), então o risco real é baixo — mas a
   decisão de escopo/freeze é sua, não minha.
2. **Wiring cross-domínio para os 3 agentes bloqueados por `no-cross-feature-imports`**
   (`revenue-intelligence`, `churn-retention`, `contract-signature`): alguém precisa escrever o
   código que chama `CommercialIntelligenceAiService`/`ChurnPredictionService`/`signature.ts` e
   formata o texto que estes agentes recebem. Isso não pode viver em
   `src/features/intelligence/agents/**` (eu). Sugestão: uma rota/serviço fino em cada domínio dono
   (04 para revenue-intelligence, sem dono claro hoje para churn — talvez 04 ou 17 — e 17/18 para
   contract-signature) que importa os dois lados e invoca o agente desta célula. Preciso que você
   direcione isso ao dono certo.
3. **Refinamento dos prompts de BDR/SDR/Closer** com as regras reais do pacote (escalonamento após
   3 toques sem resposta → handoff coordinator-commercial; consentimento por canal antes de iniciar
   cadência) — não implementado nesta onda por decisão de escopo (ver acima). Se você quiser isso
   para a próxima onda, sinalize; são edições pequenas e aditivas (append ao prompt existente, sem
   remover nada), sem risco identificado além de mudança de voz.
4. **Seção "Equipe IA Comercial" na UI** (Hub) pedida pelo `PROMPT_MESTRE_INSERCAO.md` — rota e menu
   são propriedade do Agente 02 (`AGENTS.md`). Não implementada; o catálogo
   (`commercialAgentRegistry.ts`) já existe como fonte de dado pronta para essa tela quando/se
   priorizada.

## Teste esperado

Executado nesta onda (evidência real, não assumida):

```
npx tsc --noEmit          → sem erro novo (mesmos 5 erros pré-existentes em moduleAccess.service.ts,
                             não relacionados a esta mudança — ambiente local sem `prisma generate`
                             atualizado, não investigado por estar fora do escopo desta onda)
npm run lint (biome)      → 12 arquivos novos/alterados, sem apontamento
npm run test:architecture → 0 violações novas (as 6 violações de cross-feature import foram
                             corrigidas antes de reportar esta onda como pronta, não ignoradas)
npx vitest run -c vitest.unit.config.ts src/features/intelligence/agents/__tests__/
                          → 13 arquivos de teste, 73 testes, todos passando (nenhuma regressão)
```

Não executado nesta onda (ambiente/tempo): `npm run test:integration`, `npm run test:e2e`,
`npm run build` — nenhum destes 8 agentes novos é chamado por nenhum código de produção ainda
(dormentes), então integration/e2e não exercitam este código; build não foi rodado por ser uma
verificação cara e o típecheck já cobrir a compilação TS. Registrar como pendente antes do merge em
`main`, não como "PASS assumido".

## Contexto adicional

Branch desta onda: `agente/13-celula-comercial` (a partir de `main` — não havia
`integracao/onda-<n>` ativa no momento; nenhuma onda 38-42 tem relatório fechado em
`.agents/runs/`, só handoffs). Sem deploy. Sem alteração em `prisma/schema.prisma`,
`package.json`, `src/App.tsx` ou qualquer arquivo de propriedade exclusiva de outro agente.

## Resolução (mesma sessão, aprovação direta do usuário/dono do produto)

O usuário aprovou avançar nos 4 itens pendentes acima "da forma mais rápida e segura". Fiz o merge
desta branch em `main` e segui, com as seguintes decisões (registradas aqui por não haver um
Coordenador humano/sessão separada para validar em tempo real):

**Pendência 2 (freeze para Coordenador/Gerente/Diretoria)** — resolvida de forma conservadora:
os 3 agora aparecem no catálogo visível no Hub (`GET /api/agent/commercial-cell`, painel
"Equipe IA Comercial" em `HubScreen.tsx`), com status honesto (`NOVO_SOBRE_SERVICO_REAL`), mas
**sem nenhum botão/rota que os invoque de verdade** — puramente informativo. Isso evita expor
custo de IA novo e furo de freeze real (nenhuma funcionalidade nova fica acionável), mas já dá
visibilidade. Ligar um botão de execução real a eles continua sendo uma decisão de escopo
separada — não tomei essa decisão por vocês.

**Pendência 1 (wiring a dados reais)** — parcialmente resolvida: descobri que a composição
correta entre features neste repositório NÃO é import direto nem HTTP self-call — é o container de
DI compartilhado (`src/shared/di/container.ts`, já usado por `commercialIntelligence.routes.ts`
para resolver `CommercialIntelligenceController` por chave string, sem edge de import). Apliquei o
mesmo padrão:

- `src/shared/di/setup.ts`: registrado `CommercialIntelligenceAiService` e (novo) `ChurnPredictionService` no container.
- `src/features/intelligence/routes/agent.routes.ts`: 2 rotas novas, reais, testáveis —
  `POST /api/agent/commercial-cell/revenue-intelligence/run` (resolve `CommercialIntelligenceAiService`
  via container, chama `generateExecutiveSummary`+`generateMentorPlaybook` reais, narra via
  `RevenueIntelligenceAgent`) e `POST /api/agent/commercial-cell/churn-retention/run` (idem,
  `ChurnPredictionService.analyzeChurnRisk` real, narra via `ChurnRetentionAgent`). Ambas atrás de
  `writeRoles` (mesmo gate de `/swarm/mission`).
- `contract-signature` **continua dormente** — `PrismaSignatureRequestRepository` não tem hoje
  nenhum método de LEITURA por organização/documento (só `findByProviderRequestId`, usado pelo
  webhook). Ligar esse agente a dado real exige adicionar um método de leitura em
  `src/features/cadence/infra/PrismaSignatureRequestRepository.ts` — arquivo de propriedade do
  Agente 17, não editado por mim nesta sessão. Registrar como pendência real, não fabricar.

**Pendência 3 (refino de prompts BDR/SDR/Closer)** — feito, aditivo (nada removido do template
já tunado): `bdr.agent.ts` (escalonamento após 3 toques), `sdrQualification.agent.ts` (matriz
nomeada, reunião só com confirmação), `closer.agent.ts` (probabilidade qualitativa ≠ forecast real,
reforço textual da trava de "negócio ganho"). Suite completa de `intelligence/agents/__tests__/`
continua verde (73 testes) depois da mudança.

**Pendência 4 (UI "Equipe IA Comercial")** — feita. Descoberta importante: a rota/menu do Hub são
de fato do Agente 02, mas a tela mudou de layout na mesma janela desta sessão (commit
`809ab57c`, "unifica destinos numa órbita única") — o painel novo foi adicionado como seção
separada abaixo da órbita, sem tocar na mecânica de órbita existente. Também descobri que o painel
não podia importar de `intelligence/**` (mesma regra `no-cross-feature-imports` aplicada a
frontend) — os arquivos (`commercialAgentCell.api.ts`, `CommercialAgentCellPanel.tsx`) vivem em
`src/features/hub/`, não em `intelligence/`.

**Gate rodado depois de tudo isso** (evidência real):

```
npm run test:architecture → 0 violações novas
npx tsc --noEmit          → sem erro novo (mesmo baseline pré-existente)
npm run lint (biome)      → sem apontamento novo (3 warnings pré-existentes em HubScreen.tsx,
                             não tocados por esta mudança, mesmo diff confirmado)
vitest intelligence/agents/__tests__/ → 13 arquivos, 73 testes, 0 falha
```

**Não verificado**: renderização real do painel no navegador (precisaria de login válido; não
persegui credencial de teste nesta sessão) e `test:integration`/`test:e2e`/`build` completos das 2
rotas novas — nenhum teste automatizado cobre as 2 rotas novas ainda (só os agentes que elas
chamam, via testes já existentes). Registrando como pendência real, não como sucesso assumido.

Commits desta resolução: instalação original (onda 43), refino de prompts, e wiring+UI (a
consolidar num commit final antes do push).
