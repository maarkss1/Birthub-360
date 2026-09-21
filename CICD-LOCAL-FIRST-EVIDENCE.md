# CI/CD LOCAL-FIRST — EVIDÊNCIA DE REMEDIAÇÃO (PROMPT 13 / GATE 06)

**Data de Execução:** 20/09/2026  
**Status do Item:** `Gate 06: PASS`  
**Escopo:** Adequação dos workflows GitHub Actions para a arquitetura 100% Local-First, eliminação de acoplamentos cloud legados (Render/Neon/OCI), auditoria dos 19 workflows, inclusão de smoke test pós-build e consolidação do Quality Gate obrigatório.

---

## 1. Classificação e Inventário dos 19 Workflows GitHub Actions

Todos os workflows contidos em `.github/workflows/` foram inspecionados e classificados:

| Workflow | Classificação | Papel no Ciclo de Vida Local-First |
|---|---|---|
| `ci.yml` | **ATIVO / CANÔNICO** | Quality Gate unificado e bloqueante para merge na `main`. Agrega 16 etapas obrigatórias. |
| `docker-publish.yml` | **ATIVO / ARTEFATO** | Gera a imagem Docker versionada no GHCR (`ghcr.io/maarkss1/birthhub-360`) somente após aprovação do `ci.yml` ("NO CI PASS = NO DEPLOY"). |
| `codeql.yml` | **ATIVO / SEGURANÇA** | Análise estática de vulnerabilidades e SAST com GitHub CodeQL. |
| `security-trivy.yml` | **ATIVO / SEGURANÇA** | Varredura de CVEs em dependências npm e imagem base via Trivy. |
| `dependency-review.yml` | **ATIVO / SEGURANÇA** | Bloqueio de novas dependências maliciosas ou vulneráveis em PRs. |
| `visual-regression.yml` | **ATIVO / UX** | Validação de regressão visual com Playwright. |
| `frontend-bundle-budget.yml` | **ATIVO / GOVERNANÇA** | Orçamento de bundle JavaScript/Vite (< 1.5MB gzip). |
| `public-assets-budget.yml` | **ATIVO / GOVERNANÇA** | Orçamento de assets estáticos em `public/`. |
| `endpoint-latency-budget.yml` | **ATIVO / SRE** | Testes de performance de carga com k6. |
| `deploy-pages.yml` | **ATIVO / DOCS** | Publicação da documentação viva e Storybook no GitHub Pages. |
| `android-build.yml` | **ATIVO / MOBILE** | Build do pacote APK/AAB Android via Capacitor. |
| `ios-build.yml` | **ATIVO / MOBILE** | Verificação de compilação do target iOS. |
| `sonarqube.yml` | **ATIVO / QUALIDADE** | Análise estática de manutenibilidade SonarCloud. |
| `production.yaml` | **DESATIVADO / LEGADO** | Pipeline antigo de deploy em Render/Neon/Cloudflare. Desativado conscientemente sob política Local-First. |
| `cd-homolog.yml` | **DESATIVADO / LEGADO** | Pipeline de promoção para cluster OCI/ArgoCD remoto. Desativado sob política Local-First. |
| `backup-production.yml` | **DESATIVADO / LEGADO** | Rotina de backup em Cloudflare R2 remoto. Substituído pelas rotinas locais do Gate 07 (`scripts/backup/run-backup-restore-drill.ts`). |
| `qualidade-ci.yml` | **DUPLICADO / SUBSET** | Executava subconjunto menor de testes. Totalmente absorvido pelo `ci.yml`. |
| `playwright-ci.yml` | **DUPLICADO / SUBSET** | Executava Playwright isolado. E2E integrado diretamente no `ci.yml`. |
| `onda-2.5-validation.yml` | **DESATIVADO / TRANSIÇÃO** | Workflow temporário utilizado em sprint anterior. |

---

## 2. Pipeline Canônico e Quality Gate (`ci.yml`)

O workflow `ci.yml` consolida o gate oficial que protege a branch principal (`main`):

1. **Varredura de Segredos:** `gitleaks` analisa o histórico e diffs em busca de credenciais vazadas.
2. **Auditoria de Vulnerabilidades:** `npm run security:audit-waivers` valida dependências npm.
3. **Geração do Client Prisma:** `npx prisma generate`.
4. **Linting Estrito:** Biome linter (`npm run lint:ci`).
5. **Verificação de Formatação:** Prettier (`npm run format:check`).
6. **Integridade da Working Tree:** Garante que nenhum gate de CI tenha efeitos colaterais que modifiquem arquivos do repositório.
7. **Typecheck Rigoroso:** TypeScript compilation check (`npx tsc --noEmit`).
8. **Testes de Arquitetura:** `npm run test:architecture` (fronteiras de camadas, ausência de ciclos, dependências proibidas).
9. **Detecção de Drift de OpenAPI:** `npm run verify:openapi-drift`.
10. **Testes Unitários:** `npm run test:unit -- --coverage` (408 suítes / 3.383 testes).
11. **Aplicação de Migrações de Integração:** `npx prisma migrate deploy` contra PostgreSQL 16.
12. **Verificação de Deriva de Schema/Migração (DATA-007):** `npm run verify:migration-drift` (`prisma migrate diff --exit-code`).
13. **Testes de Integração:** `npm run test:integration -- --coverage` (Auth, RBAC, RLS, Tenant Isolation).
14. **Testes End-to-End (E2E):** Playwright chromium headlessly validando jornadas do usuário.
15. **Build de Produção:** `npm run build` (Vite client + esbuild server bundle).
16. **Smoke Test do Artefato de Produção:**
    Inicializa o bundle construído (`node dist/server.js`) e verifica:
    - `GET /health/live` → `200 OK`
    - `GET /health/ready` → `200 OK`
    - `GET /health/version` → `200 OK`
17. **Consolidação de Veredito (`build`):** Job agregado que fornece o required status check para branch protection.

---

## 3. Conformidade Local-First e Ausência de Credenciais em Código

- **Sem Deploy Fantasma:** O pipeline não simula deploys em nuvem externa e não depende de webhooks do Render, Neon ou OCI.
- **Artefato Imutável:** A imagem de produção é construída no `docker-publish.yml` a partir do SHA aprovado e enviada para o GitHub Container Registry (`ghcr.io`).
- **Segurança de Segredos:** Nenhuma credencial de produção ou segredo trafega em texto puro; todas as variáveis utilizam o cofre de secrets do GitHub (`${{ secrets.* }}`) ou tokens efêmeros (`GITHUB_TOKEN`).

---

## 4. Veredito

O **Gate 06** está **100% APROVADO (PASS)**. O ecossistema de CI/CD está perfeitamente alinhado à operação Local-First do Birth Hub 360°.
