# Onda CRM/RevOps — Conclusão de CRM & Revenue Intelligence

- Data: 2026-09-13
- Fonte do pedido: `Onda-7-CRM-RevOps.txt` (arquivo solto no Desktop do usuário, fora do
  controle de versão) — **renomeado aqui para "Onda CRM/RevOps"** porque o número "Onda 7" já
  está em uso neste repositório para uma onda diferente e já mergeada
  (`.agents/runs/onda-7.md`, "Autonomia Comercial Real").
- Branch: `fix/onda-crm-revops`, worktree `.claude/worktrees/onda-crm-revops`, criada a partir de
  `origin/main` (`8ae48bd6`), depois rebaseada em `origin/main` de novo (18 commits à frente,
  incluindo PR #460/CRM-002 e #459/#462, ambos de segurança) antes de continuar.
- Executor: sessão única (Patricia), execução direta — sem spawn de agentes 04/17 (decisão do
  usuário).
- **Protocolo desta onda**: NÃO FAZ MERGE NEM PUSH. Aguarda revisão do usuário antes de qualquer
  PR.
- Coordenação: Gisele (outra sessão do enxame) avisou por cross-session-message que CRM-002 já
  tinha PR aberto (#460, depois confirmado MERGED) — este trabalho foi rebaseado em cima dele em
  vez de duplicar a correção de segurança.

## Reaudite (protocolo obrigatório, passo 1) — o que mudou desde que o .txt foi escrito

O arquivo original assume "Onda 5 mergeada (billing real necessário para MRR/ARR verdadeiro)"
como pré-requisito já satisfeito. **Isso não procede hoje**: não existe no repositório nenhum
modelo de Invoice/Payment/Subscription, nem um job que puxe fatura/assinatura real do Stripe ou
da Omie para dentro do banco. O que existe (`StripeConnection`/`OmieConnection`,
`20260912130000_slack_stripe_omie_connections`) é:
- Stripe: guarda a secret key da organização, cria PaymentIntents avulsos sob demanda
  (`createStripeCharge`) e consulta status — nenhum registro local de cobrança, nenhuma noção de
  assinatura/recorrência, nenhum webhook de `invoice.paid`/`customer.subscription.*`.
- Omie: guarda credenciais e faz upsert de clientes (empurra dado PARA a Omie) — nenhuma leitura
  de fatura/nota fiscal de volta.

Isso continua bloqueando REVOPS-002 e parte de REVOPS-003 — ver "Bloqueado" abaixo.

## Concluído nesta sessão

Todos os itens de CRM (CRM-001, 002, 003, 004, 005, 008, 010, 011) foram fechados. Branch
`fix/onda-crm-revops`, typecheck/lint/`lint:architecture` limpos, suíte unitária afetada
(crm/contacts/companies/intelligence + LeadDeduplicationService, ~19 arquivos) passando a cada
commit.

1. **CRM-001** — `title` e `tags` adicionados a `updateSearchableAttributes('leads')`
   (`src/lib/search/index.ts`). O documento indexado já é `{...result}` (todo o registro do
   Lead), então reemitir `updateSearchableAttributes` basta — Meilisearch reprocessa os
   documentos já armazenados.

2. **CRM-010** — `Math.min(parseInt(...) || 50, 200)` em `LeadController.getLeads`,
   `ContactController.getContacts`, `CompanyController.getCompanies`.

3. **CRM-011** — `Lead.tags String[] @default([])` no schema (migration
   `20260913000000_lead_native_tags`, backfill de `customFields.tags` na própria migration).
   `LeadUseCases.batchUpdateLeads` (usado pelo Kanban) reescrito para a coluna nativa.

4. **CRM-008** — `Company.owner` (confirmado coluna morta: zero leitura/escrita/exibição em todo
   o código) removida via `DROP COLUMN` (migration `20260913000100_...`), junto com o campo no
   domínio, zod schema e tipo do frontend.

5. **CRM-004** — `Note` deixou de ser exclusiva de Lead: `leadId` opcional, `companyId`/
   `contactId` novos (opcionais), CHECK constraint garantindo exatamente um preenchido, policy de
   RLS atualizada para cobrir os três pais. Mesmo router montado em três prefixos
   (`/api/leads/:leadId/notes`, `/api/companies/:companyId/notes`,
   `/api/contacts/:contactId/notes`). UI nova: `EntityNotes.tsx` (compartilhado), usado em
   `CompanyDetail.tsx`/`ContactDetail.tsx` (que não tinham nenhuma nota antes);
   `LeadDetailDrawer.tsx` manteve seu próprio código inline (já coberto por e2e, não mexido).

6. **CRM-005** — primeiro modelo de anexo/arquivo do CRM (`Attachment`, mesmo padrão de FK
   opcional + CHECK de Note, RLS por `organizationId` direto). Reaproveita o storage
   S3-compatível já usado por `CopilotoIaController` (`src/lib/storage/index.ts`, URL assinada de
   upload/download) — mesmo fluxo de 3 passos. Feature completa
   (`src/features/attachments/**`), montada nos mesmos três prefixos de Note + `/leads/:id/
  attachments`. UI nova: `EntityAttachments.tsx`, usado em Lead/Company/Contact (Lead ganhou
   anexos pela primeira vez também). Limite de 25MB por arquivo.

7. **CRM-002/003** — `LeadDeduplicationService` (segurança já corrigida no PR #460/main) ganhou
   o merge completo: as ~19 relações restantes que referenciam `leadId` (LeadStageHistory,
   LeadFieldChange, CrmDealItem, CrmCommercialDocument, CallSuppression, WhatsAppMessage,
   ConversationSignal, CopilotoConversation, CopilotoDealHealthSnapshot, BitrixSyncLog,
   VoiceCallLog, OptOutRecord, Prospect, MesaTratamentoTreatment, CadenceRun, EmailMessage,
   CadenceCalendarEvent, DealClosureEvent, Attachment) são reatribuídas ao sobrevivente antes do
   soft-delete — nenhuma tem `@@unique` envolvendo `leadId`, então `updateMany` em lote nunca
   colide. De propósito não usa `$transaction` externo (ver comentário grande no próprio arquivo
   sobre o achado real da Onda 9 — cada chamada já abre sua própria transação interativa via
   `executeWithRls`, combinar isso num `$transaction` array-form é o bug já documentado).
   Novo método `previewDuplicates` (só leitura). Caller real pela primeira vez:
   `GET /api/leads/dedup/preview` + `POST /api/leads/dedup/merge`
   (`LeadDedupController`, ADMIN/GESTOR, auditado), consumidos pela aba "Deduplicação" em
   Configurações (`LeadDedupPanel.tsx` — vive em `settings/components/`, consome só a rota HTTP,
   mesmo padrão de `MemoryGovernancePanel.tsx`, para não violar `no-cross-feature-imports`).

## Notas operacionais

- **Migrations não aplicadas em nenhum banco** (sem Postgres acessível neste ambiente) — as duas
  (`20260913000000_lead_native_tags`, `20260913000100_notes_cross_entity_and_attachments`)
  precisam rodar via `prisma migrate deploy` no pipeline real antes do deploy.
- **`node_modules/@prisma/client` é compartilhado entre todas as worktrees** (nenhuma tem
  `node_modules` própria) — `npx prisma generate` de qualquer sessão sobrescreve o client de
  todas as outras. Isso causou dessincronia real algumas vezes durante esta sessão (typecheck
  falhando por um client gerado a partir de outro schema.prisma); resolvido sempre regerando
  antes de cada rodada final de verificação. Vale avisar quem for revisar/mesclar isso enquanto
  o enxame ainda estiver ativo.
- Gisele (outra sessão) avisou de um drift aparente no banco de teste compartilhado
  (`localhost:5434/prospectordb_test`); confirmado depois que era colisão de containers Docker,
  não drift real — nenhuma ação necessária aqui.

## Bloqueado / precisa de decisão do usuário antes de continuar

- **REVOPS-002 (MRR/ARR real)**: bloqueado — ver reaudite acima. Não há fonte real de receita
  recorrente no repositório hoje (Stripe/Omie só fazem cobrança avulsa/push de cliente). Construir
  isso "de verdade" exige decidir primeiro o que conta como "recorrente" e instrumentar um
  webhook/ledger real do Stripe (ou equivalente) — um projeto de infraestrutura de billing, não
  uma tarefa de "ligar aos dados que a Onda 5 já trouxe" como o .txt original assumia.
- **REVOPS-003 (Health Score com dado real)**: parcialmente bloqueado pelo mesmo motivo
  (`monthlyRecurringRevenue`, `paymentDelaysLast90Days` do input de `ChurnPredictionService`
  dependem de billing real, que não existe). `platformUsageDropPercentage` PODERIA ser ligado a
  dado real de uso de IA (`AILog`/`UsageUseCases`, que já existe) sem depender de billing — viável
  isoladamente se o usuário quiser esse recorte menor. Não existe também nenhum sistema de
  chamados/reclamações no schema (`openSupportTickets`/`unresolvedComplaints` também ficam sem
  fonte real).
- **Pipeline Velocity**: não bloqueado por billing — é computável a partir de
  `LeadStageHistory`/`closedAt`/`amount`, seguindo a mesma disciplina de Forecast/Commit/Health
  Score (nunca fabricar um KPI). Não implementado ainda nesta sessão por escopo/tempo — fica para
  o usuário decidir se entra numa próxima rodada.
