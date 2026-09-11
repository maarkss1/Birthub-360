- De: 18
- Para: 00
- Onda: c0
- Status: resolvido
- Prioridade: normal

## Problema
Pasta `BIRTH-VOICES-HUB/` na raiz do repositório (untracked) contém apenas `__tests__/` (16
arquivos de teste: `settings.test.ts`, `telephony.controller.test.ts`, `workflowService.test.ts`
etc.), sem nenhum arquivo de código-fonte correspondente na mesma pasta. Encontrada durante
verificação de estado do repositório nesta sessão, ainda não commitada.

## Arquivo(s) envolvido(s)
`BIRTH-VOICES-HUB/**` (16 arquivos, todos em `__tests__/`).

## Alteração necessária
Decisão do dono (provavelmente 06 ou o futuro Agente 12, ver handoff
`18-para-00-agente-12-sem-prompt.md`): (a) a implementação correspondente vem em commit
separado e estes testes ficam órfãos temporariamente até lá — nesse caso documentar isso
explicitamente —, ou (b) os testes são resíduo de um experimento descontinuado e devem ser
removidos.

## Teste esperado
Se removidos: `npm run test:unit` continua verde (nada os executa hoje, então remoção é segura).
Se mantidos: confirmar que existe um plano concreto para a implementação faltante.

## Contexto adicional
Catalogado como achado BT-048 em `docs/architecture/BRAIN_TRUTH_MAP.md`. Não incluído no commit de
design system desta sessão justamente por esta razão.

## Resolução
Verificado em 2026-09-11 (auditoria ACH-12-03, agente 12) em cima de `origin/main` atual: a pasta
`BIRTH-VOICES-HUB/` nunca chegou a ser commitada — era conteúdo untracked local de uma sessão
anterior, já descartado. Confirmado:
- `git log --all --diff-filter=A --oneline -- "BIRTH-VOICES-HUB"` → nenhum resultado, em nenhuma
  branch local ou remota (nenhum commit jamais adicionou a pasta).
- `git log --all --oneline -- "*BIRTH-VOICES-HUB*"` (glob amplo) → também nenhum resultado.
- `git status --porcelain` → a pasta não aparece nem como untracked; não existe hoje no working
  tree desta worktree.

Ou seja, o cenário (b) do handoff se confirma: os 16 arquivos de teste em `BIRTH-VOICES-HUB/__tests__/`
eram resíduo local não commitado, não um trabalho órfão gravado em algum commit/branch. A pasta
descrita aqui **não é a mesma coisa** que a integração real de voz em produção
(`src/features/integrations/birth-voice/`, que continua ativa e não é afetada por esta resolução).
Nenhuma ação de remoção de código foi necessária — não há código para remover. Registrando isso
para que auditorias futuras não confundam este achado histórico (BT-048) com o trabalho real de
voz. Status alterado de `aberto` para `resolvido`.
