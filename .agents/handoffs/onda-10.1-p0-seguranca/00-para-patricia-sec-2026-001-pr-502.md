- De: Onda 10.1 — P0 Security Closure (sessão Claude Code on the web, tag `v1.0.0-rc.1`)
- Para: Patricia (revisão de PR/merge/push)
- Onda: 10.1 (`PROMPT 10.1 — P0 SECURITY CLOSURE`, `.agents/completion/01-bloqueadores.md`,
  linhas 51-58)
- Status: **pronto para revisão** — PR aberto como draft, NÃO mergeado
- Branch: `claude/p0-security-tag-exposure-4txa6g`, baseada em `main`
- PR: https://github.com/maarkss1/Birthub-360/pull/502

## O que este PR faz

Fecha (parcialmente) a investigação da tag Git `v1.0.0-rc.1`, que continuava publicada no remote e
alcançava os mesmos blobs sensíveis que a reescrita de histórico de `main` de 2026-09-05 (Caminho B)
removeu — mesmo achado já registrado para `v0.0.1` (ACH-15-01, removida em 12/09/2026).

Só documentação foi alterada — nenhum código de aplicação, teste, design ou arquivo não relacionado
foi tocado:

- **Novo:** `docs/security/incidents/SEC-2026-001-historical-tag-exposure.md` — inventário completo
  (mascarado) do conteúdo do dump histórico, classificação de cada credencial/PII, timeline,
  evidências, ações manuais pendentes.
- **Atualizado:** `.agents/completion/01-bloqueadores.md` — item da tag marcado `PARTIALLY
  RESOLVED` (não `RESOLVED`).
- **Atualizado:** `docs/security/runbooks/DECIDE_GIT_HISTORY_REWRITE.md` — registro da tentativa
  desta sessão.

## Por que está PARTIALLY RESOLVED, não RESOLVED

A sessão que abriu este PR tentou `git push origin --delete v1.0.0-rc.1` duas vezes — falhou com
`HTTP 403` (não transitório). A credencial git dessa sessão está escopada só à branch de trabalho,
sem permissão para apagar refs de tag publicadas no remote. A tag foi removida só do clone local
efêmero daquela sessão (`git tag -d`), sem efeito sobre o remote real.

**Ação que só quem tem permissão de merge/push neste repositório consegue executar** (comando já
registrado em `DECIDE_GIT_HISTORY_REWRITE.md` e no incidente):

```bash
git push origin --delete v1.0.0-rc.1
git tag -d v1.0.0-rc.1   # no seu clone local, se existir
```

Verificação pós-remoção:

```bash
git ls-remote --tags origin | grep v1.0.0-rc.1   # não deve retornar nada
```

## Pedido para esta revisão

1. Revisar o PR #502 (só documentação, ver diff).
2. Se aprovado, mergear (squash ou o padrão já usado neste repo).
3. Executar a remoção da tag do remote acima — esse é o item que efetivamente fecha o P0, não o
   merge do PR em si (o PR só documenta o achado e as pendências).
4. Depois de mergeado e a tag removida, considerar se vale reabrir `.agents/completion/01-bloqueadores.md`
   para marcar o item como `RESOLVED` (ainda ficam pendências separadas registradas no incidente:
   reverificação de rotação de credencial contra os provedores, confirmação de
   `ATLASGR_WEBHOOK_SECRET` em produção, decisão sobre reset de senha dos 5 usuários reais achados
   no dump, avaliação de DPO/jurídico sobre a janela de exposição de PII).

Nenhuma credencial em texto claro foi impressa em nenhum artefato deste PR — tudo mascarado, ver
`docs/security/incidents/SEC-2026-001-historical-tag-exposure.md`.
