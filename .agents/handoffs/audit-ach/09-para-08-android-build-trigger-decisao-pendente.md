- De: 09 (auditoria ACH-09-05)
- Para: 08 (dono exclusivo de `.github/workflows/**`) e Coordenador (00) — decisão de processo
- Onda: audit-ach
- Status: aberto
- Prioridade: baixa (P3)

## Problema

O item ACH-09-05 do relatório de auditoria (`report-atualizado.html`) afirma: "Build Android não
roda automaticamente em push/PR — decisão de processo já documentada. Só `workflow_dispatch` —
quebra de config/dependência nativa só é descoberta manualmente. Decisão intencional, não
configuração esquecida."

O `prompt` do item é explicitamente condicional e dirigido a outro agente: "Se o
Coordenador/Agente 08 quiser reavaliar: considerar gatilho `pull_request` com paths restritos
(`android/**`, `capacitor.config.ts`) só no job `gate`, mais barato que o build Gradle completo."

## Investigação (HEAD atual de `origin/main`, confirmado nesta worktree)

1. **`.github/workflows/android-build.yml` continua só com `workflow_dispatch`** (linha 5), sem
   `push`/`pull_request`. O comentário no próprio arquivo (linha 4) já documenta a intenção:
   "Mobile é artefato sob demanda. O gate automático canônico vive em `ci.yml`."
2. **`ci.yml` não referencia Android/Capacitor** (`grep -n "android\|paths" .github/workflows/ci.yml`
   não retornou nenhuma linha) — ou seja, quebra de config nativa (`android/**`,
   `capacitor.config.ts`) hoje só é descoberta rodando `android-build.yml` manualmente via
   `workflow_dispatch`, exatamente como o item descreve.
3. **A premissa factual do item ACH-09-05 permanece verdadeira**: nada mudou nesse arquivo desde
   que o relatório foi gerado. Não é um item "já resolvido".
4. **`AGENTS.md` (linha 254)** — "Pipelines de CI (`.github/workflows/**`), `Dockerfile` e
   `docker-compose.yml` da raiz: somente Agente 08." `.github/workflows/android-build.yml` é
   propriedade exclusiva do Agente 08; não foi editado nesta execução.

## Por que isto não foi implementado unilateralmente

Três motivos, cada um suficiente sozinho:

1. **Propriedade de arquivo.** `AGENTS.md` reserva `.github/workflows/**` só para o Agente 08.
   Editar `android-build.yml` fora desse papel quebraria a regra de dono único para arquivo
   compartilhado.
2. **O próprio prompt do item é condicional, não uma instrução direta.** "Se o Coordenador/Agente
   08 quiser reavaliar" é uma sugestão de reavaliação futura, não uma correção técnica objetiva a
   aplicar agora — o item já está classificado no relatório como decisão de processo intencional
   ("Decisão intencional, não configuração esquecida"), não como bug.
3. **É uma troca de trade-off, não uma correção.** Adicionar `pull_request` com `paths` restritos
   traria detecção mais cedo de quebra em `android/**`/`capacitor.config.ts`, mas também custo de
   CI adicional a cada PR que toque esses paths (mesmo que só o job `gate`, sem o build Gradle
   completo) — decisão que cabe ao dono do pipeline (Agente 08) e/ou ao usuário, não a uma
   auditoria de higiene de baixo risco.

## Ação tomada nesta execução

Nenhuma mudança de código. `.github/workflows/android-build.yml` não foi editado.

## Pergunta para o Agente 08 / usuário

Vale adicionar um gatilho `pull_request` com `paths: [android/**, capacitor.config.ts]` restrito
só ao job `gate` (type check + lint + unit, sem o build Gradle completo) em
`.github/workflows/android-build.yml`, para detectar quebra de config nativa automaticamente em
PR, mantendo o build Gradle completo (`android-build`) só sob demanda via `workflow_dispatch`? Ou
a decisão de manter 100% manual (custo de CI zero, descoberta manual) continua sendo a preferida?

## Teste esperado

Não aplicável nesta execução — nenhuma alteração de comportamento foi feita. Se a decisão futura
for adicionar o gatilho `pull_request`: confirmar que o job `gate` roda em PRs que tocam
`android/**`/`capacitor.config.ts`, que PRs que não tocam esses paths continuam sem disparar o
workflow, e que o job `android-build` (build Gradle completo) continua restrito a
`workflow_dispatch`.

## Contexto adicional

Item de auditoria ACH-09-05 (P3, "decisão") do relatório `report-atualizado.html`, Fase 3
(higiene/baixo risco) da auditoria. Levantado numa worktree isolada (`fix/ach-09-05`), sem
alteração em `.github/workflows/android-build.yml` ou qualquer outro arquivo de código/config.
