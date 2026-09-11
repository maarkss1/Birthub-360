# Mesa de Tratamento SDR

Mesa de trabalho lead-a-lead para o SDR (papel `VENDEDOR`): busca a fila de
leads do Bitrix24 atribuídos ao usuário logado, importa pro Prisma quando
necessário, prioriza, e permite registrar o resultado do contato — que é
propagado de volta ao Bitrix24 (comentário na timeline + atualização de
etapa/motivo de desqualificação) usando a integração já existente em
`src/features/integrations/bitrix/`.

## Escopo desta entrega (MVP)

- `GET /api/mesa-tratamento/queue` — fila priorizada do usuário logado
  (ou, para ADMIN/GESTOR, a fila do time todo), com o score de prioridade
  detalhado por fator (`priorityScore`, ver `mesaTratamento.priority.ts`).
- `POST /api/mesa-tratamento/lead/:id/register` — atualiza o Lead local,
  comenta na timeline do Bitrix e exporta a etapa/motivo.
- `POST /api/mesa-tratamento/lead/:id/reassign` — ADMIN/GESTOR reatribui o
  responsável (Bitrix `ASSIGNED_BY_ID` + `Lead.owner` local).
- `POST /api/mesa-tratamento/lead/:id/comment` — ADMIN/GESTOR comenta na
  timeline do Bitrix sem registrar um resultado completo.
- `POST /api/mesa-tratamento/lead/:id/decide` — ADMIN/GESTOR marca um lead
  como revisado/decidido (histórico local + comentário Bitrix quando vinculado).
- Frontend: fila lateral + card do lead atual (com sugestão de abordagem e
  score de prioridade detalhado) + formulário de registro + painel de
  gestão (`ManagementPanel.tsx`, só ADMIN/GESTOR) + comando de voz
  mãos-livres ("iniciar foco", "pausar", "retomar", "sincronizar" — via
  `src/lib/voiceCommandBus.ts`, o mesmo assistente de voz global do app).

## Deliberadamente fora desta entrega (ver histórico do protótipo HTML)

- Criação de negócio no funil Comercial com anexos dinâmicos por campo real
  do Bitrix (`crm.deal.fields`).
- Login próprio — reusa inteiramente `AuthContext`/`ProtectedRoute` do Atlas.

## Decisões de reuso (não duplicar)

- Import/listagem Bitrix: `src/features/integrations/bitrix/service/leads.ts`
  (`listBitrixLeads`, `findUnimportedBitrixLeadIds`, `importSelectedBitrixLeads`).
- Escrita de volta ao Bitrix: `src/features/integrations/bitrix/service/outboundSync.ts`
  (`postCommentToBitrix`, `exportLeadToBitrixNow`) via o barrel
  `bitrix.service.ts` — ambas operam sobre o `Lead` local (precisa estar
  importado, com `bitrixLeadId` preenchido).
- Motivo de desqualificação: `Lead.lossReason` já é mapeado para
  `UF_CRM_1770065854148` em `bitrixFieldMap.ts` — só setar o campo local,
  `exportLeadToBitrixNow` propaga sozinho. Lista de opções em
  `constants/lossReasons.ts`, extraída de `bitrix_fields.json` (raiz do
  repo) — se o Bitrix mudar essas opções, atualizar ali.
- Escopo "só meus leads" para VENDEDOR: mesmo princípio de
  `resolveScopedAssignedById` em `bitrix.routes.ts` (função não exportada,
  reimplementada aqui com as mesmas peças exportadas —
  `getBitrixUsers`/`resolveOwnBitrixUserId`).
- Lista de usuários do Bitrix para o dropdown de reatribuição do painel de
  gestão: `bitrixApi.listUsers` (`integrations/bitrix/bitrix.api.ts`, método
  novo no client já existente) — não uma chamada HTTP própria. Registrado
  como exceção de arquitetura em `docs/architecture/KNOWN_VIOLATIONS.md`
  (2026-09-11).
- Comando de voz mãos-livres: reusa o assistente de voz global já existente
  (`VoiceCommandWidget.tsx`) via `src/lib/voiceCommandBus.ts`, não um
  segundo microfone desta tela — ver comentário completo em
  `hooks/useVoiceDictation.ts` e `components/PomodoroWidget.tsx`.
- `Lead.owner` sempre grava `User.id` (nunca nome/e-mail) — ver
  `integrations/bitrix/service/userMapping.ts::resolveAtlasUserIdByEmail`.
  Qualquer código novo nesta pasta que leia/filtre/exiba `owner` precisa
  respeitar essa convenção (dois bugs reais dessa confusão — fila de
  CLOSER/SDR sempre vazia e "Este Lead não é seu" incondicional — foram
  corrigidos em `resolveScope`/`register` nesta mesma rodada).
