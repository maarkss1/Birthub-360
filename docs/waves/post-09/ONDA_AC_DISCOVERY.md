# Onda AC — Supply Chain Security & Release Engineering — Discovery

## Mapa técnico (evidência por arquivo)

- **Pipeline de PR**: `.github/workflows/ci.yml` — secret-scan, build-and-test (typecheck/lint/testes/build), visual-baselines. Sem `continue-on-error`/`--no-verify` nos jobs que compõem o gate real.
- **Segurança de dependências/imagem**: `.github/workflows/security-trivy.yml` — job `trivy-fs-pr-gate` bloqueante no PR; job `trivy-fs-scan` (linha 96, `continue-on-error: true`) é o scan semanal de monitoramento, explicitamente desacoplado do gate real (comentário na linha 22 confirma a intenção) — não é uma fraqueza do gate.
- **Segredo versionado**: `.gitleaksignore` (fingerprints com justificativa datada) + `.gitleaks.toml` — sem exceção silenciosa encontrada.
- **Waivers de vulnerabilidade**: `.trivyignore.yaml`, cada entrada com `expired_at` e remissão a `docs/security/AUDIT_WAIVERS.md` (dono/motivo/data de revisão declarados na fonte de verdade). Ex.: `GHSA-ggr8-5vv4-36mx`/`CVE-2026-40345`, expira 2026-10-11.
- **SBOM — ACHADO REAL (quebrado hoje)**: `.github/workflows/cd-homolog.yml:160-179` gera CycloneDX (`npm run security:sbom` → `cyclonedx-npm`) por release. Minha classificação inicial (L4) estava errada — eu não tinha rodado o comando de verdade. Reproduzido com `npm ci --no-audit --no-fund && npm run security:sbom`: falha com `ELSPROBLEMS`, porque `cyclonedx-npm` chama `npm ls --json --long --all` internamente e o lockfile atual tem 4 mismatches reais de peer dependency:
  - `eslint@9.39.5` (instalado) vs `@eslint/js@10.0.1` exigindo `eslint ^10.0.0`
  - `typescript@7.0.2` vs faixa aceita pelo conjunto `@typescript-eslint`
  - `storybook@10.5.10` vs `@storybook/addon-vitest@10.6.0` exigindo `storybook ^10.6.0`
  - `@langchain/core@1.2.8` vs `@langchain/openai@1.5.11` exigindo `@langchain/core ^1.2.9`
  Existe `cyclonedx-npm --ignore-npm-errors`, mas usar essa flag mascararia o problema real em vez de corrigi-lo (viola a regra 17 do contrato núcleo — não enfraquecer verificação pra passar). A correção certa é resolver os 4 mismatches de versão, mas isso é uma mudança de dependência ampla o bastante pra arriscar quebrar lint/types em outras partes do monorepo — não é um ajuste pequeno e direto (regra 14/23). **Registrado como backlog nomeado abaixo, não corrigido nesta onda.**
- **Imutabilidade/rastreabilidade de artefato**: `production.yaml` tageia imagem por `type=sha,format=short` antes do scan Trivy e do push — artefato é identificado por hash e vinculado ao commit.
- **Rollback**: existe `docs/security/runbooks/MIGRATION_ROLLBACK.md` (rollback de **migration de banco**). NÃO ENCONTRADO um runbook de rollback de **deploy de aplicação** (reverter a imagem publicada) nem evidência de execução medida em ambiente não-produtivo — **L1 nesse sub-item específico**.
- **Paridade de ambiente**: `src/config/env.ts` valida env vars via Zod. Não localizei um documento único listando toda variável obrigatória por ambiente (dev/homolog/produção) para responder "nenhuma é descoberta só em produção" com evidência — precisa de checagem mais profunda antes de classificar.
- **Proteção de branch — ACHADO REAL (gap)**: `gh api repos/maarkss1/Birthub-360/branches/main/protection` retorna:
  - `required_status_checks.contexts: ["build"]` — **só o job `build` é obrigatório**; secret-scan, application gate (typecheck/lint/testes), CodeQL, Trivy PR gate e SonarQube **não são checks obrigatórios** para mesclar em `main`, mesmo rodando em todo PR.
  - `enforce_admins.enabled: false` — administradores (inclui o dono do repo) podem mesclar/pushar ignorando até o check obrigatório.
  - `required_pull_request_reviews.required_approving_review_count: 1`, mas não se aplica a admins por causa do ponto acima.
  - Isso é um caminho real de bypass do gate (viola diretamente o critério de aceite 6 da onda). **Não alterei a configuração ainda** — é uma mudança de alto impacto em infraestrutura compartilhada usada agora mesmo pelo swarm (Patricia mesclando PRs ao vivo); pede confirmação explícita do usuário antes (regra 22 do contrato núcleo) para não travar merges em andamento com checks que hoje nem sempre fecham 100% verdes.

## Classificação de maturidade (Fase 2)

| Capacidade | Nível | Evidência |
|---|---|---|
| Pipeline com gates (typecheck/lint/testes/build) | L4 | `ci.yml` sem bypass; roda em todo PR |
| Secret scanning sem exceção silenciosa | L4 | `.gitleaksignore` com justificativa+data por fingerprint |
| SBOM por release | **L2 — quebrado hoje** | `cd-homolog.yml:160-179` existe e roda no caminho feliz, mas `npm run security:sbom` falha de verdade num `npm ci` limpo do lockfile atual (`ELSPROBLEMS`, 4 peer deps: eslint/@eslint/js, typescript, storybook/@storybook/addon-vitest, @langchain/core/@langchain/openai) |
| Scan de vulnerabilidade com waiver datado | L4 | `.trivyignore.yaml` + `AUDIT_WAIVERS.md`, `expired_at` fail-closed |
| Artefato imutável rastreável a commit | L3 | tag por sha antes do push; falta evidência de verificação de hash pós-deploy |
| Rollback de deploy medido | L1 | só existe rollback de *migration*; sem runbook/execução de rollback de *imagem* |
| Paridade de ambiente documentada | L1 (não verificado) | validação de env via Zod existe; falta doc único consolidado por ambiente |
| Proteção de branch sem bypass | **L1 — gap real** | só "build" obrigatório; `enforce_admins: false` |

## Decisão sobre escopo restante

Vou seguir para Fase 3 (implementação) nos itens com evidência clara de lacuna e baixo risco de colisão com o swarm ativo:
1. Runbook + teste real de rollback de deploy de imagem em ambiente não-produtivo (critério 5).
2. Documento único de paridade de variáveis de ambiente por ambiente (critério 7).

Vou **parar e perguntar** antes de mexer em proteção de branch (critério 6) — é infraestrutura compartilhada em uso ao vivo pelo swarm agora.
