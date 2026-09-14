# Handoff — VOICE-001 (ressalva da Onda 0, corrigida)

**De:** sessão birthub-360-47 (auditoria "quantas ondas" + verificação de ressalvas)
**Para:** Patricia (revisão + PR/merge/push, com confirmação do usuário)
**Branch:** `fix/onda0-voice-001-tenant-script` (worktree isolado, base = `origin/main` em 1665f5d0,
já inclui todo o programa post-09)

## Contexto

Ao responder "todas as ondas 0-9 foram finalizadas?", a re-verificação encontrou que o bloqueador
**VOICE-001** (Onda 0, CRITICAL/P0 — `docs/audits/repository-debt-audit/agents/VOICE.md`) nunca
tinha sido corrigido, diferente dos outros 15 bloqueadores da onda. Reauditei o código atual antes
de corrigir (protocolo da onda): confirmado que `atlasProductPlaybook.ts` ainda hardcodava
identidade completa da Atlas GR ("Gessica", histórico "nasceu em 2004... 390 clientes", produtos
"Atlas Profile"/"CIA") no roteiro que a IA de voz usa em **toda** ligação de **qualquer**
organização — exatamente o achado original, ainda não corrigido.

## O que foi feito

- Novo model fields em `VoiceHubConnection` (migração
  `20260914120000_voice_hub_connection_script_fields`): `scriptPersonaName`,
  `scriptCompanyDescription`, `scriptOfferText`, `scriptClosingLine`. Migração faz backfill de
  **todas** as conexões já cadastradas hoje com o texto exato da Atlas GR — zero mudança de
  comportamento no deploy para quem já está configurado (presumivelmente só a Atlas GR, per a
  ressalva do próprio achado). O roteiro genérico só passa a valer para conexões novas, ou se uma
  organização já existente limpar os campos.
- `atlasProductPlaybook.ts` removido, substituído por `voiceScript.ts`: roteiro genérico que
  interpola os 4 campos acima, com fallback honesto (nunca inventa nome/produto/histórico de
  outra empresa) quando não configurados. As duas frases obrigatórias de abertura (transparência
  IA + consentimento de gravação) permanecem literalmente as mesmas — `birthVoice.helpers.ts`
  detecta consentimento casando texto exato contra elas.
- `birthVoice.service.ts::requireConfig` agora resolve o nome da organização e os 4 campos de
  script junto da conexão, e passa isso para `buildVoicePromptForLead` nos dois pontos de disparo
  (Bland e Hub próprio). `agent_name` no payload da Bland também deixou de ser hardcoded
  ("Gessica").
- Teste ajustado (`birthVoice.service.test.ts`) para mockar `prisma.organization.findUnique`.

## Verificação feita nesta sessão (gate técnico 08+14, aproximado — sem os agentes formais)

- `npx prisma validate` + `npx prisma generate`: OK.
- `npx tsc --noEmit`: 0 erros.
- `npx biome check` nos arquivos alterados: 0 erros, 0 warnings.
- `npx vitest run -c vitest.unit.config.ts src/features/integrations/birth-voice`: **108/108
  passando** (7 arquivos de teste, incluindo `birthVoice.helpers.test.ts` que valida a detecção
  de consentimento/opt-out contra o texto literal das duas frases obrigatórias — não foi
  necessário alterar essas asserções, confirma que a abertura obrigatória ficou intacta).
- Não rodei `test:integration`/`test:e2e` (fora do escopo tocado; nenhum teste e2e referencia
  conteúdo de voz).

## Pendências que ficam para depois desta correção mínima

- Não existe hoje tela em Integrações para a organização preencher os 4 campos novos — é um
  trabalho de UI separado (fora do escopo desta correção backend; precisa passar pela Constituição
  de Design Engineering deste repo se for pedido).
- VOICE-002 (agentType NPS/reactivation ignorado) e VOICE-005 (contrato 3CX nunca validado contra
  PABX real) continuam como estavam — não fazem parte de VOICE-001, não foram tocados aqui.

## Protocolo

Sem merge/push feito por aqui — commit local no worktree isolado
(`C:\GitHub\Birthub-360\.claude\worktrees\fix+voice-001-tenant-scoped-script`), branch
`fix/onda0-voice-001-tenant-script`, pronto para você revisar e conduzir PR/merge/push com
confirmação do usuário antes.
