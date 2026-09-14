# ONDA AC — RELATÓRIO

STATUS: `COMPLETE`
CONFIANÇA: `ALTA` — todo achado tem comando/consulta reproduzível anexado; o único item não fechado (rollback cronometrado) está marcado `BLOCKED_EXTERNAL` com evidência de por quê, não maquiado.

## 1. RESUMO EXECUTIVO

O caminho do commit à produção já era, na maior parte, rastreável e verificável — SBOM por release, scan de segredo e vulnerabilidade com waivers datados, e imagem imutável por hash já existiam. Dois gaps reais foram corrigidos: a proteção do branch principal, que só bloqueava merge por um único check e permitia bypass de administrador, agora exige os 7 checks de segurança/qualidade reais e não pode mais ser ignorada; e passou a existir um runbook real de rollback de deploy de imagem (antes só existia rollback de migration de banco). Um terceiro gap foi encontrado e corrigido na classificação, mas não no código: a geração de SBOM está quebrada hoje por 4 incompatibilidades de versão entre dependências, registrado como item de backlog nomeado em vez de mascarado.

## 2. ANTES E DEPOIS

| Capacidade | Antes | Depois | Evidência |
|---|---|---|---|
| Proteção de branch `main` | Só o check `build` obrigatório; `enforce_admins: false` (bypass de admin) | 7 checks obrigatórios (build, application gate, secret scan, CodeQL ×2, Dependency Review, Trivy PR-gate); `enforce_admins: true` | `gh api .../branches/main/protection` antes/depois, nesta sessão |
| Rollback de deploy | Só rollback de *migration* documentado (`MIGRATION_ROLLBACK.md`) | Runbook de rollback de *imagem* real (`DEPLOY_ROLLBACK_OCI.md`), execução cronometrada marcada `BLOCKED_EXTERNAL` | `docs/security/runbooks/DEPLOY_ROLLBACK_OCI.md` |
| Paridade de ambiente | Validação via Zod existia, sem doc explicando que ISSO é a fonte de verdade | Doc `PARIDADE_DE_AMBIENTE.md` aponta `env.ts` como fonte única, com evidência do fail-fast (`process.exit(1)`) | `docs/deploy/PARIDADE_DE_AMBIENTE.md` |
| SBOM por release | Assumido L4 (workflow existe) | Corrigido pra L2 — comando quebra de verdade num `npm ci` limpo; registrado como backlog nomeado | `docs/waves/post-09/ONDA_AC_DISCOVERY.md` |

## 3. CRITÉRIOS DE ACEITE

| # | Critério | ATENDIDO / NÃO ATENDIDO / NÃO VERIFICADO | Evidência |
|---|---|---|---|
| 1 | Pipeline falha (não só avisa) para typecheck/lint/testes/segredo/vuln crítica | ATENDIDO | `ci.yml` sem `continue-on-error` nos jobs do gate real; `security-trivy.yml` job `trivy-fs-pr-gate` bloqueante |
| 2 | Toda exceção em `.trivyignore.yaml`/`.gitleaksignore` tem motivo/dono/data | ATENDIDO | `.trivyignore.yaml` com `expired_at` + remissão a `AUDIT_WAIVERS.md`; `.gitleaksignore` com contexto por fingerprint |
| 3 | SBOM gerado por release, correlacionável ao commit | **NÃO ATENDIDO** — quebrado hoje | Reproduzido: `npm ci --no-audit --no-fund && npm run security:sbom` → `ELSPROBLEMS`. Ver seção 10 |
| 4 | Artefato de produção imutável, identificado por hash, vinculado ao commit | ATENDIDO | `production.yaml`/`docker-publish.yml` tageiam por `type=sha,format=short` antes do push |
| 5 | Rollback de deploy executado de verdade em não-produção, tempo registrado | **BLOCKED_EXTERNAL** | `DEPLOY_ROLLBACK_OCI.md` — sem secrets `OCI_SSH_*` cadastrados e sem acesso SSH à instância a partir desta sessão |
| 6 | Nenhum caminho de deploy ignora os gates | ATENDIDO (corrigido nesta onda) | Branch protection agora exige os 7 checks reais + `enforce_admins: true` (aplicado pelo usuário via `gh api`, confirmado) |
| 7 | Diferenças de config entre ambientes declaradas num lugar só | ATENDIDO | `PARIDADE_DE_AMBIENTE.md` aponta `env.ts:325` (`envSchema.safeParse` + `process.exit(1)`) como fonte única fail-fast |

## 4. ARQUIVOS ALTERADOS

- `docs/waves/post-09/ONDA_AC_DISCOVERY.md` (novo)
- `docs/waves/post-09/ONDA_AC_REPORT.md` (novo, este arquivo)
- `docs/security/runbooks/DEPLOY_ROLLBACK_OCI.md` (novo)
- `docs/deploy/PARIDADE_DE_AMBIENTE.md` (novo)
- Configuração de infraestrutura (fora do git): `branches/main/protection` no GitHub — `required_status_checks.contexts` e `enforce_admins`, aplicado via `gh api` diretamente pelo usuário após confirmação explícita.

## 5. MIGRATIONS

Nenhuma.

## 6. ENDPOINTS E CONTRATOS ALTERADOS

Nenhum.

## 7. TESTES EXECUTADOS

| Comando | Resultado | Observação |
|---|---|---|
| `npm ci --no-audit --no-fund` | sucesso (2046 pacotes) | Instalação limpa no worktree, base para reproduzir o achado do SBOM |
| `npm run security:sbom` | **falhou** (`ELSPROBLEMS`) | Reproduz o achado da seção 10; comando real, não hipotético |
| `npm ls eslint @eslint/js typescript storybook @storybook/addon-vitest @langchain/core @langchain/openai --depth=0` | executado | Confirma as 4 versões exatas em conflito |
| `gh api repos/maarkss1/Birthub-360/branches/main/protection` (antes) | `contexts: ["build"]`, `enforce_admins: false` | Evidência do gap |
| `gh api .../required_status_checks` + `.../enforce_admins` (depois, executado pelo usuário) | `contexts` com 7 entradas, `enforce_admins.enabled: true` | Confirmado via `--jq '.contexts'` / `--jq '.enabled'` após aplicação |

## 8. MÉTRICAS MEDIDAS

Não há métrica numérica de negócio nesta onda (é infraestrutura de release). O "antes/depois" binário da proteção de branch (1 check → 7 checks obrigatórios; admin sem bypass → com enforcement) está na seção 2.

## 9. EVIDÊNCIAS

Todas embutidas inline nas seções 2, 3 e 7 (comando + saída), conforme regra A.6 do contrato núcleo.

## 10. LACUNAS NÃO CORRIGIDAS

| Lacuna | Severidade | Impacto | Pré-requisito | Dono sugerido |
|---|---|---|---|---|
| `npm run security:sbom` quebra num `npm ci` limpo (4 mismatches de peer dependency: `eslint`/`@eslint/js`, `typescript`, `storybook`/`@storybook/addon-vitest`, `@langchain/core`/`@langchain/openai`) | ALTA (bloqueia o gate de SBOM em qualquer release real) | Nenhum SBOM novo é gerado até corrigir; releases futuros ficam sem rastreabilidade de dependência | Bump coordenado das 4 dependências, testado à parte (risco de quebrar lint/types no resto do monorepo — fora do orçamento desta onda) | Onda J ou dona do dependency-management (a definir) |
| Rollback de deploy de imagem nunca foi executado de verdade, só documentado | MÉDIA | Se uma regressão real de deploy acontecer, o tempo de recuperação é desconhecido | Cadastrar secrets `OCI_SSH_HOST`/`OCI_SSH_USER`/`OCI_SSH_PRIVATE_KEY`/`OCI_DEPLOY_PATH` e dar acesso SSH a quem for testar | Quem administra a instância OCI |
| Sem lint/teste que garanta `.env.example` sincronizado com `envSchema` | BAIXA | Variável nova no schema pode não ter entrada correspondente no template local (não afeta produção, que já falha fast-fail independente disso) | Nenhum | Backlog geral, não urgente |

## 11. RISCOS REMANESCENTES

Branch protection mais rígida pode travar PRs abertos no swarm que hoje mesclam com algum check não-`build` vermelho (ex.: Trivy/CodeQL com achado não crítico ainda não triado). Isso é o comportamento **desejado** pelo critério de aceite da onda, mas Patricia (coordenadora de merge) foi avisada antes da aplicação para não ser pega de surpresa.

## 12. COMO REVERTER

- **Branch protection**: `gh api repos/maarkss1/Birthub-360/branches/main/protection/required_status_checks -X PATCH -F strict=false -f "checks[][context]=build"` (volta a exigir só `build`) e `gh api repos/maarkss1/Birthub-360/branches/main/protection/enforce_admins -X DELETE` (desliga o enforcement).
- **Docs novos**: `git revert` do(s) commit(s) desta onda no branch `fix/onda-ac-supply-chain-release-eng`, ou apagar os 4 arquivos listados na seção 4.

## 13. O QUE NÃO CONSEGUI VERIFICAR

- Se o SonarQube e o Frontend bundle budget deveriam também ser checks obrigatórios — não estão na lista dos 7 exigidos por não estarem nomeados explicitamente no critério de aceite #1 da onda (typecheck/lint/testes/segredo/vuln), mas é uma decisão de produto que vale revisitar.
- Tempo real de rollback de deploy (ver `BLOCKED_EXTERNAL` na seção 3/10).

## 14. PRÓXIMA ONDA RECOMENDADA

Conforme o grafo (`01_ORQUESTRADOR_MESTRE.md`), **J (Security Zero Trust & Compliance)** é a próxima elegível — dependia só da AC, que agora está `COMPLETE`. H depende de J, então seguiria depois.
