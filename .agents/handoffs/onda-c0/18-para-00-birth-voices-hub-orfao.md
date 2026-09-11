- De: 18
- Para: 00
- Onda: c0
- Status: aberto
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
