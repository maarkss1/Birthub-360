# Onda CRM/RevOps — Conclusão de CRM & Revenue Intelligence

- Data: 2026-09-13
- Fonte do pedido: `Onda-7-CRM-RevOps.txt` (arquivo solto no Desktop do usuário, fora do
  controle de versão) — **renomeado aqui para "Onda CRM/RevOps"** porque o número "Onda 7" já
  está em uso neste repositório para uma onda diferente e já mergeada
  (`.agents/runs/onda-7.md`, "Autonomia Comercial Real").
- Branch: `fix/onda-crm-revops`, worktree `.claude/worktrees/onda-crm-revops`, criada a partir de
  `origin/main` (`8ae48bd6`).
- Executor: sessão única (Patricia), execução direta — sem spawn de agentes 04/17 (decisão do
  usuário).
- **Protocolo desta onda**: NÃO FAZ MERGE NEM PUSH. Aguarda revisão do usuário antes de qualquer
  PR.

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

Isso bloqueia REVOPS-002 e parte de REVOPS-003 como estavam escritos — ver "Bloqueado" abaixo.

## Concluído nesta sessão

1. **CRM-001** — `title` e `tags` (agora coluna nativa, ver CRM-011) adicionados a
   `updateSearchableAttributes('leads')` em `src/lib/search/index.ts`. Confirmado por leitura do
   código: o documento indexado já é `{...result}` (todo o registro do Lead), então nenhum
   reindex de dado é necessário além de reemitir `updateSearchableAttributes` (Meilisearch
   reprocessa os documentos já armazenados quando os atributos pesquisáveis mudam).
   Commit `a0e691f9`.

2. **CRM-010** — `Math.min(parseInt(...) || 50, 200)` aplicado em `LeadController.getLeads`,
   `ContactController.getContacts`, `CompanyController.getCompanies`. Commit `b95be135`.

3. **CRM-011** — `Lead.tags String[] @default([])` adicionado ao schema (migration
   `20260913000000_lead_native_tags`, com backfill de `customFields.tags` já existente).
   `LeadUseCases.batchUpdateLeads` (tags/addTags/removeTags, usado pelo Kanban) reescrito para ler
   e escrever a coluna nativa em vez do JSON. `Lead.tags` adicionado ao tipo de domínio
   (`src/features/crm/domain/Lead.ts`). Nenhum outro ponto do código (frontend incluído) lia
   `customFields.tags` diretamente — migração autocontida. Commit `7cae73fb`.
   **Atenção**: a migration ainda não foi aplicada em nenhum banco (sem Postgres acessível neste
   ambiente) — precisa rodar via `prisma migrate deploy` no pipeline real antes do deploy.

   Nota operacional: `npx prisma generate` foi executado para validar os tipos — isso regenerou o
   client compartilhado em `node_modules/@prisma/client` na raiz do repositório (todas as
   worktrees resolvem para o mesmo `node_modules`, não há um por worktree). A mudança de schema é
   estritamente aditiva (só acrescenta um campo a `Lead`), então o risco de quebrar outra sessão
   concorrente é baixo, mas vale avisar quem estiver com uma sessão ativa em outra worktree nesta
   janela de tempo.

Typecheck (`tsc --noEmit`) limpo e as suítes unitárias de `crm`/`contacts`/`companies`
(13 arquivos, 54 testes) passando após as três mudanças acima.

## Já em andamento por outra sessão (não duplicado aqui)

- `fix/crm-002-lead-dedup-safe-delete` (worktree `agent-a10c4f19447baf820`, commit `87da8e91`,
  ainda não mergeado): já resolve a parte de segurança de CRM-002 — reescreve
  `LeadDeduplicationService` sobre o `prisma` singleton tenant-aware (em vez de
  `new PrismaClient()` cru) e passa a reatribuir `Note`/`Activity`/`TimelineEvent` para o lead
  sobrevivente antes de um soft-delete (em vez do hard cascade-delete anterior). Documenta no
  próprio código um TODO para um merge completo (`LeadStageHistory`, `LeadFieldChange`,
  `CrmDealItem`, `CadenceRun`, etc. ainda não são reatribuídos). **Continua sem nenhum
  caller/rota/UI** — permanece um serviço órfão, só que agora seguro de religar.

## Bloqueado / precisa de decisão antes de continuar

Ver mensagem separada ao usuário com as perguntas de decisão. Resumo:

- **CRM-002/003 (Dedup/Merge)**: decisão de produto pendente — religar de vez (UI + rota) vs.
  manter órfão e documentar isso na comunicação de produto vs. remover. O fix de segurança já
  existe em branch separada (acima); falta decidir o que fazer com o "produto" em si.
- **CRM-004/005 (Notes cross-entity / Attachments)**: `Note.leadId` é obrigatório (sem
  `companyId`/`contactId`) e não existe NENHUM modelo de arquivo/anexo no schema para nenhuma
  entidade de CRM. Implementar de verdade é um escopo de feature novo (schema + upload + storage
  backend), não um bugfix pontual — decisão de produto sobre escopo real necessária antes de
  codar.
- **CRM-008 (`Company.owner`)**: confirmado coluna morta (zero leitura/escrita/exibição no
  código). Recomendação: remover via migration. Não removida ainda nesta sessão — aguardando
  confirmação do usuário antes de um DROP COLUMN (irreversível para qualquer dado já lá, mesmo
  que hoje pareça sempre NULL).
- **REVOPS-002 (MRR/ARR real)**: bloqueado — ver reaudite acima. Não há fonte real de receita
  recorrente no repositório hoje (Stripe/Omie só fazem cobrança avulsa/push de cliente). Construir
  isso "de verdade" exige decidir primeiro o que conta como "recorrente" e instrumentar um
  webhook/ledger real do Stripe (ou equivalente), não uma tarefa de "ligar aos dados que a Onda 5
  já trouxe" como o .txt original assumia.
- **REVOPS-003 (Health Score com dado real)**: parcialmente bloqueado pelo mesmo motivo
  (`monthlyRecurringRevenue`, `paymentDelaysLast90Days` do input de `ChurnPredictionService`
  dependem de billing real, que não existe). `platformUsageDropPercentage` PODERIA ser ligado a
  dado real de uso de IA (`AILog`/`UsageUseCases`, que já existe) sem depender de billing — isso é
  viável isoladamente se o usuário quiser esse recorte menor. Não existe também nenhum sistema de
  chamados/reclamações no schema (`openSupportTickets`/`unresolvedComplaints` também ficam sem
  fonte real).
- **Pipeline Velocity**: não bloqueado por billing — é computável a partir de
  `LeadStageHistory`/`closedAt`/`amount`, seguindo a mesma disciplina de Forecast/Commit/Health
  Score (nunca fabricar um KPI). Não implementado ainda nesta sessão por escopo/tempo — fica para
  uma próxima rodada explícita.
