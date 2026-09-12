# BIRTHUB-BRAIN-REORG — Plano Mestre

- **Agente responsável:** 00 — Coordenador.
- **Data de início:** 2026-09-10.
- **Branch de partida:** `main` @ `2e73fde82cbf085c9bb24b583a50771c9b902821`.
- **Branch de integração desta onda:** `integracao/brain-reorg-c0`.
- **Programa:** missão extraordinária complementar aos agentes oficiais já existentes em
  `.agents/prompts/` (ver pacote `Birthub360_Reorganizacao_Cerebro_Agentes_Existentes`, v2.0,
  2026-09-10). Este programa **não cria agentes novos** e **não substitui prompts oficiais**.

## 1. Origem e autoridade

Este plano segue, nesta ordem, sem contradizê-las:

1. `/AGENTS.md` (nota: este arquivo ainda se autodenomina "Projeto:
   CENTRAL-DE-INTELIGENCIA-COMECIAL-ATLASGR" no cabeçalho — achado de descontaminação de marca,
   ver `docs/architecture/LEGACY_BRAND_CONTENT_MAP.md` quando concluído pelo Agente 11).
2. `.agents/README.md`, `.agents/COMO-CHAMAR-OS-AGENTES.md`.
3. O pacote de missões extraordinárias C0-C4 (`00-LEIA-PRIMEIRO.md` e os 24 arquivos de missão).

Em qualquer conflito, `/AGENTS.md` e o prompt oficial de cada agente vencem sobre este plano.

## 2. Escopo autorizado nesta execução

**Somente Onda C0** ("Verdade e arquitetura"), por decisão explícita do dono do produto ao
autorizar este programa. **C1, C2, C3 e C4 não foram iniciadas** e não devem ser assumidas como
aprovadas por este documento. Este plano mestre cobre a estrutura das 5 ondas para referência
futura (§6), mas só reporta execução real da C0 (§3-5).

## 3. Especialistas acionados na C0

| Agente | Papel na C0                | Entregas                                                                                                                       |
| ------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 00     | Coordenador                | Este documento                                                                                                                 |
| 18     | Truth Map e Contratos      | `docs/architecture/BRAIN_TRUTH_MAP.md`, `docs/architecture/BRAIN_API_CONTRACT_MAP.md`                                          |
| 02     | Product Model e Workspaces | `docs/architecture/BIRTHUB_PRODUCT_MODEL.md`, `docs/architecture/WORKSPACE_MODEL.md`, `docs/architecture/NAVIGATION_TARGET.md` |
| 11     | Descontaminação de Marca   | `docs/architecture/LEGACY_BRAND_CONTENT_MAP.md` (em andamento — ver §5)                                                        |

Execução real: sessão única (esta), não paralela em worktrees separados — a C0 é
**documentação/análise, sem edição de `src/`**, então o risco que a regra de isolamento por
worktree existe para prevenir (dois agentes escrevendo o mesmo arquivo de código ao mesmo tempo)
não se aplica aqui. Os 4 documentos de saída não se sobrepõem entre si. Onda C1 em diante, se
autorizada, deve seguir isolamento por worktree normalmente (`AGENTS.md` → "Isolamento de
execução"), porque aí sim há edição de `src/`.

## 4. Matriz de propriedade da C0

| Arquivo/pasta tocado                                   | Dono                                    | Observação       |
| ------------------------------------------------------ | --------------------------------------- | ---------------- |
| `docs/architecture/BRAIN_TRUTH_MAP.md` (novo)          | 18                                      | —                |
| `docs/architecture/BRAIN_API_CONTRACT_MAP.md` (novo)   | 18                                      | —                |
| `docs/architecture/BIRTHUB_PRODUCT_MODEL.md` (novo)    | 02                                      | —                |
| `docs/architecture/WORKSPACE_MODEL.md` (novo)          | 02                                      | —                |
| `docs/architecture/NAVIGATION_TARGET.md` (novo)        | 02                                      | —                |
| `docs/architecture/LEGACY_BRAND_CONTENT_MAP.md` (novo) | 11                                      | pendente, ver §5 |
| `.agents/handoffs/onda-c0/**` (novos)                  | qualquer agente, cada um cria o próprio | ver lista em §5  |
| `.agents/runs/brain-reorg-master.md` (este arquivo)    | 00                                      | —                |

**Nenhum arquivo de `src/`, `prisma/`, `server.ts`, `package.json` ou CI foi tocado nesta onda.**
Confirmado por `git status` antes do commit final (ver §7).

## 5. Handoffs abertos ao final da C0

Consolidado dos 4 documentos de saída — arquivos reais em `.agents/handoffs/onda-c0/`:

| Handoff                                        | De → Para | Prioridade                  | Assunto                                           |
| ---------------------------------------------- | --------- | --------------------------- | ------------------------------------------------- |
| `18-para-11-atlaslogo-orfao.md`                | 18 → 11   | normal                      | `AtlasLogo.tsx` órfão                             |
| `18-para-00-agente-12-sem-prompt.md`           | 18 → 00   | **alto**                    | Voz/Telefonia sem dono de dev formal              |
| `18-para-00-birth-voices-hub-orfao.md`         | 18 → 00   | normal                      | testes sem implementação                          |
| `18-para-06-chatwoot-nao-catalogado.md`        | 18 → 06   | normal                      | conector não documentado                          |
| `18-para-00-agent-routes-fragmentadas.md`      | 18 → 00   | normal                      | 4 prefixos de rota candidatos a consolidação      |
| `02-para-00-workspace-fixo-vs-configuravel.md` | 02 → 00   | **alto/bloqueador para C2** | tensão North Star vs. arquitetura já implementada |
| `02-para-00-daily-plan-nao-auditado.md`        | 02 → 00   | normal                      | módulo sem auditoria prévia                       |
| `02-para-01-origem-domain-workspacekpi.md`     | 02 → 01   | normal                      | confirmar origem de campo `domain`                |
| `02-para-00-fronteira-enablement-comercial.md` | 02 → 00   | normal                      | fronteira Enablement/Comercial indefinida         |
| `02-para-00-module-catalog-nao-encontrado.md`  | 02 → 00   | normal                      | peça da missão original não localizada no código  |

**Nenhum handoff desta lista é `Prioridade: bloqueador`** no sentido estrito do protocolo (que
bloquearia a aprovação desta própria onda) — o único marcado "alto/bloqueador para C2" é
bloqueador da **próxima** onda, não desta. A C0 pode ser aprovada com esses handoffs abertos,
transicionando normalmente conforme a regra "handoffs não bloqueadores podem transitar para a onda
seguinte, desde que registrados no relatório da onda" (`AGENTS.md` → "Protocolo de handoff").

## 6. Sequência completa do programa (referência — não executada além de C0)

| Onda   | Especialistas       | Objetivo                                                                           | Status                        |
| ------ | ------------------- | ---------------------------------------------------------------------------------- | ----------------------------- |
| **C0** | 00, 02, 18, 11      | Truth Map, Product Model, mapa de legado, plano de migração — sem refactor massivo | **Concluída (esta execução)** |
| C1     | 01, 07, 13, 06, 10  | Capability Registry, Intelligence Layer, closed loop, connectors, telemetria       | Não iniciada                  |
| C2     | 04, 05, 17, 12, 02  | Comercial como workspace modular, preservando capacidades                          | Não iniciada                  |
| C3     | 01A, 14, 15, 16, 18 | Isolamento, contratos, execução, migrations, workers, políticas                    | Não iniciada                  |
| C4     | 03, 09, 08, 00      | Interface, mobile, regressão, acessibilidade, veredito final                       | Não iniciada                  |

## 7. Gate desta onda

Onda C0 é documentação pura — o gate obrigatório completo de `/AGENTS.md`
(`tsc`/`lint`/`test:architecture`/`test:unit`/`test:integration`/`test:e2e`/`build`) **não se
aplica** por não haver mudança de código executável (mesma lógica de "Scripts ausentes" aplicada
ao inverso: aqui o gate existe, mas não há artefato de código para ele avaliar). Validação real
aplicada:

- `git status` confirmando que só arquivos novos em `docs/architecture/`, `.agents/handoffs/` e
  `.agents/runs/` foram criados — nenhum arquivo de `src/`/`prisma/`/config foi modificado.
- Nenhum segredo/credencial incluído nos documentos (achados de segredo do
  `LEGACY_BRAND_CONTENT_MAP.md`, categoria H, citam local e tipo, nunca o valor).

## 8. Rollback

Toda a C0 vive em `integracao/brain-reorg-c0`, uma branch isolada de `main`. Rollback é trivial:
não fazer merge da branch (`main` permanece intocado até decisão humana explícita de merge/PR).
Nenhuma migration, nenhuma mudança de schema, nenhum dado foi alterado — não há estado a reverter
além de descartar a branch.

## 9. Definição de pronto desta onda

- [x] Truth Map com evidência real, classificação por capacidade, handoffs para achados.
- [x] Contract Map estrutural (webhooks, prefixos, achados de deriva pontuais).
- [x] Product Model + Workspace Model + Navigation Target, sem tocar `App.tsx`.
- [x] Legacy Brand Content Map — concluído, varredura completa (444+93 arquivos, 15 handoffs no total).
- [x] Nenhum refactor estrutural iniciado antes do Truth Map (regra do programa respeitada).
- [x] Nenhum arquivo fora da propriedade de `docs/architecture/`/`.agents/` foi tocado.

## 10. Veredito

**BRAIN REORG — ONDA C0 APROVADA** (2026-09-10), com as seguintes ressalvas explícitas:

1. **Dois handoffs de prioridade alta seguem abertos e precisam de decisão humana/do Coordenador
   antes da Onda C1/C2, não apenas registrados:**
   - `18-para-00-agente-12-sem-prompt.md` — Voz/Telefonia sem dono de dev formal, e a Onda C2 já
     presume que esse agente existe.
   - `02-para-00-workspace-fixo-vs-configuravel.md` — tensão real entre o North Star ("workspaces
     configuráveis") e a arquitetura já implementada (`RoleWorkspaceDefinition` como política fixa
     em código). Qualquer desenho de `WorkspaceDefinition` na C2 sem essa decisão arrisca duplicar
     arquitetura existente.
   - `11-para-10-argocd-ghcr-nome-antigo.md` — risco operacional real de deploy (não é sobre este
     programa de reorganização, é um achado colateral que não deve esperar a Onda C3 para ser
     verificado).
2. Nenhuma capacidade real foi perdida, movida ou alterada nesta onda — 100% documentação/análise.
3. A Onda C1 **pode ser autorizada** com base nestes documentos, mas só depois que o Coordenador
   (ou o dono do produto) resolver ao menos o handoff de workspace fixo-vs-configurável — ele
   condiciona o desenho de C2, e decisões de C1 (extração dos domínios `CORE`) já são mais seguras
   sabendo a resposta.
4. Não iniciar C1 automaticamente a partir deste veredito — este programa foi autorizado
   explicitamente só até a Onda C0 nesta rodada.
