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

Confirmado no HEAD atual de `main` (item ACH-18-04 do relatório de auditoria, Agente 18/Fase 3): a
pasta `BIRTH-VOICES-HUB/` nunca chegou a ser commitada em nenhum branch.

- A pasta não existe mais neste worktree (criado a partir de `origin/main`): `ls BIRTH-VOICES-HUB`
  falha com "no such file or directory".
- `git log --all --oneline -- BIRTH-VOICES-HUB` não retorna nenhum commit em todo o histórico —
  confirma que era conteúdo local/untracked da sessão de catalogação original, não um artefato do
  repositório. Ao trocar de worktree/branch, o conteúdo untracked simplesmente não acompanhou.
- Não havia, portanto, decisão de produto pendente (opção (a) vs. (b) da "Alteração necessária")
  a tomar — o "problema" era o próprio arquivo untracked, que não existe mais para decidir sobre.

Achado residual, fora do escopo deste handoff: `docs/architecture/BRAIN_TRUTH_MAP.md` linha 117
ainda lista BT-048 com status `ORPHAN` referenciando essa pasta. Como o achado nunca foi
persistido no repositório, essa linha do BRAIN_TRUTH_MAP está desatualizada, mas atualizá-la é
edição de um documento de terceiros fora do escopo objetivo deste item — sinalizado aqui para quem
tocar esse arquivo em seguida.

Status: resolvido.
