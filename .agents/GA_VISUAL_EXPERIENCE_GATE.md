# BIRTH HUB 360° — GA VISUAL & EXPERIENCE RELEASE GATE

Este documento define as regras, critérios e processos obrigatórios para a promoção de qualquer versão do Birth Hub 360° para produção (GA), com foco em Qualidade Visual, Experiência, Acessibilidade e Integridade ponta a ponta.

**REGRA FUNDAMENTAL:**
`NO EXPERIENCE PASS = NO PRODUCTION`

Nenhum deploy de produção deve ignorar este gate.

---

## 1. Pipeline de Qualidade e Promoção

O fluxo canônico de aprovação e deploy obedece estritamente a seguinte cadeia de rastreabilidade (Source-to-Production):

`SOURCE` → `CI` → `QUALITY` → `VISUAL` → `ACCESSIBILITY` → `PERFORMANCE` → `E2E` → `HOMOLOG` → `APPROVAL` → `PRODUCTION`

### Inventário de Workflows Existentes

| GATE | WORKFLOW | JOB / STEP | TRIGGER | BLOCKING? | STATUS |
| --- | --- | --- | --- | --- | --- |
| CI General | `ci.yml` | `build-and-test` | `push`, `pull_request` | SIM | Ativo |
| Lint | `ci.yml` | `Run Lint` (`npm run lint:ci`) | CI trigger | SIM | Ativo |
| Typecheck | `ci.yml` | `Run Type Check` (`npx tsc --noEmit`) | CI trigger | SIM | Ativo |
| Architecture | `ci.yml` | `Architecture tests` | CI trigger | SIM | Ativo |
| Unit Tests | `ci.yml` | `Run Unit Tests` | CI trigger | SIM | Ativo |
| Integration Tests | `ci.yml` | `Run Integration Tests` | CI trigger | SIM | Ativo |
| E2E Tests | `ci.yml` | `Run E2E Tests` | CI trigger | SIM | Ativo |
| Visual Regression | `ci.yml` | `visual-baselines` | `workflow_dispatch` | NÃO (Manual) | Precisa integrar como SIM |
| Build | `ci.yml` | `Run Build` | CI trigger | SIM | Ativo |
| Security (SBOM/Trivy) | `production.yaml` | `publish` | `workflow_dispatch` | SIM | Ativo |
| Homologation | `cd-homolog.yml` | `build-and-push` | `workflow_dispatch` | SIM | Ativo |
| Production | `production.yaml` | `publish` | `workflow_dispatch` | SIM | Ativo |

---

## 2. Gate Obrigatório

A promoção para produção (GA) **exige obrigatoriamente evidência de aprovação (PASS) do mesmo SHA** em todos os seguintes checks:

- **LINT**
- **TYPECHECK**
- **ARCHITECTURE**
- **UNIT**
- **BUILD**
- **INTEGRATION** (Quando aplicável e afetado)
- **E2E** (Obrigatório para GA)
- **VISUAL REGRESSION**
- **ACCESSIBILITY**
- **RESPONSIVE QA**
- **LIGHT MODE**
- **DARK MODE**
- **PERFORMANCE**
- **SECURITY** (Varredura de segredos, dependências e Trivy SBOM)
- **MIGRATION VALIDATION** (Se aplicável no pacote)

---

## 3. Critérios de Severidade e Bloqueio

Classificação de severidades para bugs e regressões (Visual/UX/Acessibilidade/Comportamento):

- **P0 CRITICAL:** Regressão catastrófica. Funcionalidade central indisponível, quebra fatal de UI/UX, vazamento de dados, impossibilidade total de uso, erro sistêmico de frontend.
- **P1 HIGH:** Funcionalidade importante severamente prejudicada sem alternativa (workaround) viável. Falha de validação grave, contraste inacessível crítico.
- **P2 MEDIUM:** Funcionalidade prejudicada mas com workaround aceitável; quebra visual que não impede uso direto mas afeta credibilidade.
- **P3 LOW:** Inconveniente menor; texto com typo; falha visual isolada; erro de estado não-bloqueante.
- **P4 POLISH:** Dívida cosmética; alinhamento pixel-perfect ausente sem afetar leitura.

**Regra de Bloqueio para GA:**
- Deploy é **BLOQUEADO AUTOMATICAMENTE** se `P0 > 0` ou `P1 > 0`.
- Definição de P2 como release blocker (Bloqueia GA):
  - Inconsistência de Tema Light/Dark que oculta botões de ação ou inputs.
  - Regressões de layout responsivo onde rolagem lateral inesperada (overflow) oculta conteúdo de negócio importante.
  - Erros de estado de UI (Loading sem fim ou Error silencioso sem feedback no DOM).

---

## 4. Visual Gate

**Exigência:** `VISUAL REGRESSION = PASS` em rotas críticas.

- Mudança visual **intencional** deve possuir:
  - Revisão humana por Design/UX/Produto.
  - Aprovação formal via Pull Request.
  - Baseline visual (`golden screenshot`) atualizada **conscientemente**.
- **PROIBIDO:** Auto-aprovação de visual diff no CI. Toda divergência falha até ser aprovada ou corrigida.

---

## 5. Accessibility Gate

O release deve ser abortado (bloqueado) diante das seguintes falhas críticas de acessibilidade (P1/P0):
- Ausência de foco visível em fluxos críticos.
- Impossibilidade de realizar navegação puramente via teclado.
- Modais inacessíveis ou focus trap quebrado (foco "vazando" para trás do modal).
- Campos de formulário em fluxo crítico sem label programática legível por Screen Readers.
- Falha grave de contraste que inviabilize leitura.
- Erro de validação de formulário sem feedback associado ao campo correspondente.
- Elemento bloqueador de Screen Reader em telas principais.

*Nota:* Falhas tipo `P4` (Cosméticas de a11y que não limitam severamente a usabilidade) não bloqueiam o GA.

---

## 6. Responsive Gate

Rotas críticas da aplicação DEVEM ser validadas minimamente nas seguintes viewports:
- `1440x900` (Desktop)
- `1366x768` (Desktop menor/Laptops)
- `768x1024` (Tablet Portrait)
- `390x844` (Mobile)

**Bloqueadores:**
- Overflow lateral que impeça uso do app ou force scroll duplo problemático.
- Botão de Call to Action (CTA) ou fluxo crítico invisível ou inalcançável.
- Conteúdo essencial cortado.
- Modal explodindo para fora da viewport impedindo ação/fechamento.
- Sidebar bloqueada em estado aberto (impossível de fechar na versão mobile/tablet).
- Tabela de dados (ex: CRM) inutilizável sem nenhuma alternativa de visualização/card.

---

## 7. Light / Dark Gate

O comportamento visual não pode degradar dependendo do tema escolhido.

**LIGHT MODE:** Deve exibir cores realmente configuradas no sub-theme Light.
- *Bloqueadores:* Fundo remanescente dark que destrua o contraste; Overlay incompatível (muito escuro sobre branco ou sem alpha adequado); Modal ilegível; Herança incorreta de design tokens de cor.

**DARK MODE:**
- *Bloqueadores:* Contraste crítico (texto escuro sobre fundo escuro); Conteúdo ilegível; Surfaces em elevações iguais impossíveis de distinguir; Overlay de escurecimento quebrado; Gráficos de dados (charts) inutilizáveis.

---

## 8. Performance Gate

Para a transição GA, é obrigatório seguir o pipeline de métricas: `MEASURE BASELINE` → `DEFINE BUDGET` → `ENFORCE`.

- **Métricas:** Bundle size, chunks number, requests size, LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift), INP (Interaction to Next Paint), route loading state, hydration errors/time, long tasks.
- Nenhum threshold arbitrário. Utilizar baselines realistas levantadas previamente.
- **Bloqueador:** Regressões significativas comparadas ao baseline estabelecido.

---

## 9. E2E Gate

O ambiente de release DEVE possuir a infraestrutura necessária e os dados mock/semeados adequados para não manter bloqueios por indisponibilidade ambiental (`BLOCKED_BY_ENVIRONMENT`).

Fluxos mínimos e2e obrigatórios:
1. `LOGIN` → `DASHBOARD`
2. `CRM` → `ABRIR REGISTRO` → `EDITAR` → `SALVAR`
3. `PROSPECÇÃO` → `PESQUISAR` → `RESULTADO`
4. `INTELIGÊNCIA` → `AÇÃO PRINCIPAL`
5. `AUTOMAÇÃO` → `FLUXO PRINCIPAL`
6. `ADMIN` → `AÇÃO CRÍTICA`

---

## 10. Homologação

O código testado em Homologação deve ser estritamente o mesmo que chegará em Produção.
- O artefato e a versão (`image digest`, `commit SHA`) a entrar em GA deve **bater integralmente** com a versão validadada em HOMOLOG.
- **PROIBIDO:** Rebuild silencioso gerando um código binário ou hash diferente entre Homolog e Prod.
- **Registros obrigatórios por release:** `COMMIT SHA`, `IMAGE DIGEST`, `BUILD ID`, `RELEASE ID`.

---

## 11. Approval Humano

Para deploys de produção em fase de GA:
- Exigir **Aprovação Humana Formal** no fluxo de Release.
- A pessoa aprovadora deverá obrigatoriamente ter acesso à visibilidade de: Commit, checks de CI, diffs visuais (se houver), Artefatos/SBOMs gerados, QA Report e Lista de Known Issues.

---

## 12. Fail Closed & Bypass Policy

**FAIL CLOSED:** Se qualquer gate ou validação obrigatória não puder ser executada (ex: ferramenta inativa, timeout longo não planejado):
- **NÃO PROMOVER.** O default é FECHAR a promoção de release.
- A justificativa "Tool indisponível" nunca pode ser mapeada para `PASS`.

**Bypass Policy (Exceções):** Devem ser explícitas, auditáveis e autorizadas exclusivamente por Coordenadores/Lead Engs com registro formal em issue tracker/incident post-mortem.

---

## 13. Manual Dispatch & Rollback

**Manual Dispatch:**
- Disparos manuais de workflow (ex: `workflow_dispatch`) só podem promover um `SHA` que já possua evidência comprovada no CI.
- **PROIBIDO:** Ignorar CI, bypass de Visual/E2E, reconstrução de branch arbitrária, promoção de código não validado pela master/main.

**Rollback:**
- Devem apontar para uma release/imagem já previamente aprovada e estável.
- Preferir re-deployment por `image digest/version` sobre rebuild desnecessário de código fonte antigo.

---

## 14. Observabilidade Pós-Deploy

O processo de deploy finaliza quando validado em produção. Smoke test após o Deploy inclui:
- Ausência de crashes ou console errors na raiz (white screen of death).
- Monitoramento de Erros de Frontend.
- Failed API Requests em taxa aceitável.
- Web Vitals estabilizados.
- Fluxo de Login funcional.
- Rotas Críticas acessíveis.
- Nenhuma regressão visual grosseira óbvia.

---

## 15. Canary / Staged Rollout

A ser avaliado (quando a infraestrutura e cluster K8s/ingress permitirem):
- Possibilidade de Blue/Green deployments.
- Rollout progressivo/Canary para mitigar o impacto de regressões P0/P1 que escapem do QA Gate.

---

## 16. Branch Protection & Artifact Trust

- Regras aplicadas ao `main`/`master` via **Required Status Checks**.
- Merge bloqueado caso `application-gate` falhe.
- Rastrebilidade contínua:
  `SOURCE SHA` → `BUILD` → `ARTIFACT` (hash id) → `HOMOLOG` → `PRODUCTION`
- Rebuild em cada ambiente é desencorajado. O artefato construído e escaneado inicialmente deve ser "promovido" pelos ambientes de forma imutável.

---

## Proibições Categóricas

1. Mascarar testes falhos.
2. Remover ou desativar temporariamente um teste ou checagem vital para forçar uma liberação de release.
3. Alterar thresholds apenas para esconder uma regressão.
4. Atualizar baseline visual ou screenshots golden sem revisão crítica e intencional.
5. Marcar um teste como "PASS" quando o estado real foi "BLOCKED" ou erro na inicialização.
6. Ignorar ou manipular o histórico do SHA promovido.
7. Reconstruir artefatos perdendo rastreabilidade original.
8. Promover qualquer branch que não seja uma branch validada e protegida de trunk/release.
9. Bypass manual silencioso sem registro de aprovação de exceção (Emergency Break Glass).
10. O uso da flag `--force` de `git push` para forçar luz verde no CI ou corromper histórico remoto.
11. Desabilitar linters, ignorar typechecking (`tsc`), ou desligar checagens de acessibilidade (`axe`) para reduzir atrito na pressa.
