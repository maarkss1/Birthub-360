- De: 13 (Enxame Autônomo e Governança de Agentes de Runtime)
- Para: 00 (Coordenador)
- Onda: 9
- Status: resolvido
- Prioridade: normal

## Problema

Tarefa 5 da Onda 9 (`Onda-9-Escala.txt`): confirmar se as skills duplicadas entre
`.agents/skills/` e `.claude/skills/` já divergiram, e decidir se uma árvore deveria virar
referência (symlink) para a outra.

O documento da onda listava 13 skills duplicadas. Reaudite (protocolo obrigatório, passo 1) antes de
corrigir: a lista real hoje é **33 skills duplicadas** (as 13 originais + `database-integrity` +
19 skills `mantis-*` do kit de auditoria de segurança instalado no PR #369). O escopo cresceu desde
que o documento da onda foi escrito — não é mais o que o texto original descreve.

## Arquivo(s) envolvido(s)

- `.agents/skills/*` e `.claude/skills/*` (33 pares duplicados)
- Precedente já existente: as 19 skills `mantis-*` (kit instalado no PR #369) já usam o padrão de
  symlink git (`.agents/skills/mantis-X` real, `.claude/skills/mantis-X` é um symlink git modo
  `120000` apontando para `../../.agents/skills/mantis-X` — aparece como arquivo de texto comum
  neste checkout porque `core.symlinks=false` no Windows, mas é um symlink real no objeto git).

## Alteração necessária

Reaudite completo dos 14 pares restantes (33 duplicados − 19 mantis-\* já resolvidos):

**Grupo A — sem divergência de conteúdo real (6 skills)**: `ui-ux`, `visual-qa`,
`error-resilience`, `design-system`, `release-readiness`, `api-contracts`. A única diferença entre
as duas cópias era formatação de markdown (alinhamento de tabela, `*itálico*` vs `_itálico_`,
espaço em branco) — resultado do commit `9357fa86` ("chore: fix prettier formatting for all
files"), que rodou só sobre `.claude/skills/` e não sobre `.agents/skills/`, deixando esse lado
desatualizado em formatação (nunca em conteúdo).

→ **Ação tomada neste lote**: convertidos para o mesmo padrão symlink do kit mantis. Mantive
`.claude/skills/<skill>` como diretório real (é a cópia com a formatação mais recente/correta) e
troquei `.agents/skills/<skill>` por um symlink git modo `120000` apontando para
`../../.claude/skills/<skill>` — direção oposta à do kit mantis (lá `.agents/` é o real), escolhida
porque neste grupo `.claude/` é comprovadamente o lado mais atualizado, não por regra fixa de que um
lado deva sempre ser o canônico. Zero perda de conteúdo: as duas cópias eram idênticas em substância.

**Grupo B — divergência real e intencional (8 skills)**: `accessibility`, `database-integrity`,
`end-to-end-flow-validator`, `frontend-design`, `functional-completeness`, `integration-audit`,
`motion-design`, `performance`. A diferença aqui não é acidental: este repo suporta dois
ecossistemas de agente de IA em paralelo — Codex (`AGENTS.md`, `.Codex/`) e Claude Code
(`CLAUDE.md`, `.claude/`). A cópia em `.agents/skills/` foi adaptada para referenciar
`AGENTS.md`/`.Codex/PILOTS.md`; a cópia em `.claude/skills/` foi adaptada para referenciar
`CLAUDE.md`/`.claude/PILOTS.md` (mesmo achado de piloto, mesma lição, só a citação do arquivo de
convenção muda). Exemplo em `integration-audit`: uma diz "não assuma Anthropic/**Codex** como
provedor de IA", a outra "não assuma Anthropic/**Claude**".

→ **Decisão**: NÃO converter em symlink. Virar uma referência para a outra apagaria a adaptação
válida de um dos dois lados (o agente Codex leria `CLAUDE.md`/`.claude/` sem sentido para o próprio
contexto, ou vice-versa). Estas 8 skills continuam como duas cópias mantidas separadamente **de
propósito** — mas isso também confirma o risco real que o documento da onda aponta: se o corpo
substantivo de uma dessas 8 skills for editado só de um lado no futuro (não a linha de convenção,
mas o conteúdo real da skill), as duas árvores divergem de verdade sem ninguém perceber, porque hoje
não existe nenhum lint/CI que compare as duas cópias. Ver seção "Contexto adicional" para a
recomendação de mitigação (fora do escopo deste lote específico).

## Teste esperado

- `git ls-files -s .agents/skills/<skill>` para os 6 do Grupo A retorna modo `120000` apontando
  para o blob do respectivo `.claude/skills/<skill>/SKILL.md` (verificado neste lote).
- `.claude/skills/<skill>` continua intacto e sem alteração para os 6 do Grupo A (verificado —
  nenhuma mudança de conteúdo, só o lado `.agents/` virou referência).
- Nenhum arquivo de código-fonte (`src/`, `scripts/`) referencia `.agents/skills` ou
  `.claude/skills` diretamente — busca no repositório não encontrou nenhuma ocorrência —, então a
  troca por symlink não tem impacto funcional na aplicação, só na forma como ferramentas de agente
  de IA descobrem a skill.

## Contexto adicional

Recomendação para uma onda futura (fora do escopo deste lote, que é só reaudite + decisão, não
reengenharia de conteúdo): para as 8 skills do Grupo B, extrair o corpo substantivo compartilhado
para um único arquivo-fonte e manter só a linha de convenção (`AGENTS.md` vs `CLAUDE.md`,
`.Codex/PILOTS.md` vs `.claude/PILOTS.md`) como a parte de fato duplicada entre as duas cópias —
isso reduziria a superfície de divergência silenciosa de "arquivo inteiro" para "uma linha", sem
quebrar a adaptação por ferramenta. Não implementei isso agora porque é uma mudança de conteúdo
substantiva em 8 skills, não uma correção mecânica de estrutura — prefiro que isso seja uma decisão
explícita do usuário/Coordenador antes de reescrever o corpo de skills usadas por outros agentes em
produção agora.

## Resolução

Lote `fix/onda9-skills-dedup-batch1` (worktree
`.claude/worktrees/onda9-skills-dedup-batch1`): 6 skills convertidas em symlink (Grupo A), 8 skills
mantidas como cópias adaptadas por tool com a divergência documentada e o risco residual sinalizado
acima (Grupo B). Sem merge/push — encaminhado para a Patricia revisar, com confirmação do usuário
antes de qualquer PR/merge/push, conforme protocolo da onda.
