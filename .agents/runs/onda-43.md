# Onda 43 — Instalação da Célula Comercial de Agentes (Agente 13)

Data: 2026-09-07

## Escopo
Pedido direto do usuário: instalar o pacote externo `ATLASGR_COMMERCIAL_AGENT_CELL_v1.1.0`
(`C:\Users\Marks\Desktop\ATLASGR_COMMERCIAL_AGENT_CELL_v1.1.0`, 12 agentes comerciais) no
repositório, seguindo o próprio `PROMPT_MESTRE_INSERCAO.md`/`REPO_REALITY_CHECK.md` do pacote
(dono: Agente 13 — Enxame Autônomo e Governança de Agentes de Runtime).

## O que o pacote assumia x o que o código real mostrou
O `REPO_REALITY_CHECK.md` do próprio pacote já avisava que suas premissas (montadas sem leitura de
código) precisavam ser confirmadas. Confirmei lendo o código real e corrigi 5 classificações
erradas — sempre na direção "existe mais infraestrutura real do que o pacote sabia", nunca menos:
`contract-signature` (assinatura eletrônica gov.br já implementada, não `BLOCKED`),
`revenue-intelligence` (já coberto em grande parte por `CommercialIntelligenceAiService`),
`churn-retention` (`ChurnPredictionService` já é o motor real), `ldr-intelligence`
(`AccountIntelligenceService`/`LdrAccountIntelligence.tsx` já é o "LDR" do produto) e
`billing-revenue` (confirmado: não existe fonte real de faturamento — mantido em
`SOURCE_REQUIRED`). Detalhe completo em `commercialAgentRegistry.ts` (comentário de topo) e no
handoff desta onda.

## Resultado
- Registrado o catálogo dos 12 agentes (`commercialAgentRegistry.ts`) e o envelope de saída
  compartilhado (`commercialAgentTypes.ts`), fiéis a `prompts/shared/base-agent.md`/`reflection.md`
  do pacote, mas com status/risco/bindings corrigidos contra o código real.
- Implementados 8 agentes novos como personas `BaseAgent` (mesmo padrão de `BDRAgent`/`CRMAgent`):
  LDR, Coordenador, Gerente, Diretoria, Revenue Intelligence, Bitrix Guardian, Contratos &
  Assinatura, Receita & Faturamento, Churn & Retenção.
- **Zero arquivo existente alterado** — BDR/SDR/Closer/CRM/Ops/Supervisor (enxame em produção)
  intocados; nenhuma rota, UI ou roteamento do Supervisor foi ligada aos agentes novos (código
  dormente, não exposto a usuário final).
- Corrigido em tempo real: 3 agentes (`revenue-intelligence`, `churn-retention`,
  `contract-signature`) tentaram importar diretamente serviços de outros domínios
  (`commercial-intelligence`, `analytics`, `cadence`) e foram barrados pelo gate de arquitetura real
  (`no-cross-feature-imports`, dependency-cruiser) — redesenhados para o mesmo padrão de "persona
  recebe texto pré-formatado pelo chamador" dos demais, sem violar a fronteira.
- Adicionado 1 teste unitário novo (`churnRetention.agent.consent.test.ts`) cobrindo a trava de
  consentimento LGPD, mesmo padrão de `base.agent.consent.test.ts`.
- Handoff aberto para o Coordenador (`.agents/handoffs/onda-43/13-para-00-instalacao-celula-
  comercial.md`) com 4 pendências que exigem decisão fora do meu escopo: classificação de freeze
  para os 3 papéis de gestão, dono do wiring cross-domínio para os 3 agentes bloqueados pelo gate
  de arquitetura, refinamento (não implementado) dos prompts de BDR/SDR/Closer, e seção de UI
  "Equipe IA Comercial" (propriedade do Agente 02).

## Validação
```
npx tsc --noEmit          → sem erro novo (mesmos 5 erros pré-existentes, não relacionados)
npm run lint (biome)      → 12 arquivos novos, sem apontamento
npm run test:architecture → 0 violações novas (6 violações de cross-feature import corrigidas
                             antes de fechar a onda, não ignoradas)
vitest src/features/intelligence/agents/__tests__/ → 13 arquivos, 73 testes, 0 falha
```
Não executados nesta onda (código ainda dormente, não exercitado por rota real):
`test:integration`, `test:e2e`, `build`. Registrado como pendência explícita no handoff, não como
sucesso assumido.

Branch: `agente/13-celula-comercial` (a partir de `main`). Sem merge, sem deploy.
