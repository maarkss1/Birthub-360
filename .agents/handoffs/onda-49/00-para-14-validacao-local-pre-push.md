- De: 00 — Coordenador
- Para: 14 — Ambiente de Execução e Test Harness
- Onda: 49
- Status: resolvido
- Prioridade: alto

## Problema

Revisão pré-push em 2026-09-15 do código `17e0e36b`, sem alterações de fonte nesta tarefa. O CI canônico desse SHA passou (run 35016642613), mas a execução local Windows/Node 24.19.0 revelou limitações que impedem declarar aprovação integral local ou GA.

1. `npm run test:architecture` termina com exit 0, embora dependency-cruiser avise que não suporta TypeScript 7 e percorra apenas 61 módulos. O gate de hotspots passou (955 arquivos; 31 avisos).
2. `npm run build` termina com exit 0, mas o PWA reporta `brace_expansion_1.expand is not a function` e precache com 1 entrada / 0 KiB.
3. Unit: timeout de 15 s em `src/features/intelligence/agents/__tests__/base.agent.budget.test.ts`.
4. Integração: falhas observadas em capability-engine (1/37), import-agent-catalog (1/12), backfill-contact-pii (1/1) e backfill-voice-transcript-pii (1/1).
5. E2E: falha no helper de signup nas telas Uso/Faturamento e Equipe. A configuração local permite reaproveitar servidor já existente; havia servidor anterior à revisão na porta 3000, sem comprovação de seu ambiente efetivo.

Unit, integração e E2E locais foram interrompidos, sem resumo final. Integração e E2E foram iniciados em paralelo nesta revisão; os resultados precisam ser reproduzidos sequencialmente em ambiente isolado antes de inferir regressão. Nenhum PASS foi atribuído às execuções interrompidas.

## Arquivo(s) envolvido(s)

- `package.json`, `package-lock.json`, `.dependency-cruiser.cjs`.
- `vite.config.ts`, `playwright.config.ts`, `vitest.unit.config.ts`, `vitest.integration.config.ts`.
- Testes citados acima e `tests/e2e/helpers.ts`.
- `.github/workflows/visual-regression.yml` (dono 08), cujo passo visual adicional usa `continue-on-error: true`.

## Alteração necessária

- Reproduzir com Node 22, como o CI, sem concorrência de suítes que compartilhem banco/servidor.
- Garantir suporte real do parser de arquitetura ao compilador instalado e falhar quando arquivos TypeScript forem omitidos. O Coordenador autoriza a elaboração da correção de dependências; nenhuma versão foi alterada nesta tarefa.
- Corrigir a resolução de dependências do glob/PWA e comprovar precache dos assets esperados.
- Usar porta/servidor próprios para E2E e conferir banco isolado antes do signup; evitar reaproveitar silenciosamente um servidor de outra atividade.
- Reproduzir as falhas locais identificadas antes de alterar código de domínio. Encaminhar aos donos 01/07/08 se uma falha de produto for confirmada.
- Acionar 08 para alinhar o critério visual de release à suíte adicional não bloqueante. A suíte visual dentro de `tests/e2e` já contém asserções bloqueantes; não confundir com geração manual de baselines.

## Teste esperado

Typecheck, lint, arquitetura cobrindo fontes TypeScript, unit, integração, E2E e build, sequencialmente em ambiente isolado; nenhum aviso de parser incompatível; precache contendo os assets esperados. Registrar saídas e contagens reais, sem herdar PASS por suposição.

## Contexto adicional

CI do mesmo código: https://github.com/maarkss1/Birthub-360/actions/runs/35016642613 (success). Relatório consolidado: `.agents/GA_RELEASE_READINESS_REPORT.md`. Esta tarefa apenas resolve um conflito documental e publica o histórico pendente; não promove produção nem modifica dependências.
