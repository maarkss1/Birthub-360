import { requestContext } from '../../../lib/async-context.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * CRM-002 (auditoria de débito técnico, `docs/audits/repository-debt-audit/agents/CRM.md`) —
 * bug crítico corrigido aqui. Antes desta correção, `deduplicateByEmail` tinha dois problemas
 * graves, ambos resolvidos abaixo:
 *
 * 1. Instanciava seu PRÓPRIO `new PrismaClient()` em vez de importar o singleton compartilhado
 *    (`src/lib/prisma.ts`). Esse client cru não seta `app.current_tenant_id`, exigido pela
 *    policy `FORCE ROW LEVEL SECURITY` de `Lead`/`Activity`/`Note`/`TimelineEvent` (migration
 *    `20260722020322_enable_rls`) — em Postgres real, com RLS de fato aplicado, a query via esse
 *    client via/afetava ZERO linhas (no-op silencioso), exatamente o mesmo bug já documentado e
 *    corrigido em `deduplication.worker.ts` para `Contact.groupBy` (ver o comentário grande nesse
 *    arquivo). Em qualquer ambiente onde a RLS não estivesse de fato ativa, o efeito seria o
 *    oposto e pior: um hard-delete cru, sem escopo de tenant nem trilha de auditoria. Corrigido
 *    usando o `prisma` estendido de `src/lib/prisma.ts` dentro de
 *    `requestContext.run({ tenantId: organizationId }, ...)` — o mesmo padrão usado por todo
 *    outro job/worker deste módulo que mexe em Lead (ver `deduplication.worker.ts`,
 *    `followUp.worker.ts`, `autoAnonymizeDisqualified.worker.ts`).
 * 2. Fazia `prisma.lead.deleteMany` — um hard cascade delete (schema: `Activity`/`Note`/
 *    `TimelineEvent` têm `onDelete: Cascade` para `Lead`), sem preservar nem mesclar dado
 *    dependente, e sem nenhuma trilha de auditoria — bypassando o mesmo mecanismo de
 *    soft-delete/auditoria que toda outra operação destrutiva de Lead deste código usa (ver
 *    `$allOperations` em `src/lib/prisma.ts`, seções "Soft Delete" e "Audit Log"). Ao rodar
 *    através do `prisma` estendido (em vez do client cru), `deleteMany` sobre `Lead` — um model
 *    "auditable" — já é automaticamente interceptado e convertido num `updateMany` que marca
 *    `deletedAt`/`deletedBy`/`deleteReason`, nunca uma remoção física de linha, e gera uma
 *    entrada em `AuditLog`. Antes desse soft-delete, esta função agora reatribui
 *    Note/Activity/TimelineEvent (os itens citados no CRM-002 — "notes/activities/timeline") do
 *    lead duplicado para o lead sobrevivente, para que esse conteúdo real não desapareça do
 *    histórico do contato.
 *
 * CRM-002/003 (Onda CRM/RevOps, decisão do usuário: religar de vez): o TODO acima documentava um
 * merge parcial (só Note/Activity/TimelineEvent). Completo agora — reatribui TODAS as ~19 relações
 * restantes que referenciam `leadId` no schema (`prisma/schema.prisma`) para o lead sobrevivente,
 * na mesma transação, antes do soft-delete: `LeadStageHistory`, `LeadFieldChange`, `CrmDealItem`,
 * `CrmCommercialDocument`, `CallSuppression`, `WhatsAppMessage`, `ConversationSignal`,
 * `CopilotoConversation`, `CopilotoDealHealthSnapshot`, `BitrixSyncLog`, `VoiceCallLog`,
 * `OptOutRecord`, `Prospect`, `MesaTratamentoTreatment`, `CadenceRun`, `EmailMessage`,
 * `CadenceCalendarEvent`, `DealClosureEvent` e `Attachment`. Nenhuma dessas 19 tem `@@unique`
 * envolvendo `leadId` (conferido em todo o schema), então um `updateMany` em lote nunca colide com
 * uma linha já existente do lead sobrevivente.
 *
 * De propósito, esta sequência NÃO usa um `prisma.$transaction([...])` envolvendo as chamadas —
 * cada operação sobre o client estendido já abre sua PRÓPRIA transação interativa internamente
 * (`executeWithRls` em `src/lib/prisma.ts`, necessária pra setar `app.current_tenant_id` via
 * `SET LOCAL` antes da query real). O comentário grande em `executeWithRls` documenta um achado
 * real do Prisma 7 (Onda 9): combinar `$executeRawUnsafe` com uma promise que atravessa a cadeia
 * de extensão dentro de um `$transaction` array-form não garante que a segunda operação realmente
 * chegue ao Postgres dentro da mesma transação — foi corrigido migrando para transação interativa
 * POR CHAMADA, não combinando chamadas numa transação externa. Se uma reatribuição falhar no meio
 * da sequência, o erro sobe (sem catch mascarando) e o Lead nunca chega a ser soft-deletado — as
 * reatribuições já aplicadas ficam de pé (idempotentes: rodar de novo só reatribui o que ainda
 * aponta pro duplicado), nunca um estado pior que o inicial.
 *
 * Agora tem caller real: `POST /api/leads/dedup/preview` (dry-run, mostra os grupos antes de
 * mesclar) e `POST /api/leads/dedup/merge` (executa), ambos em
 * `src/features/crm/routes/leadDedup.routes.ts` — ver UI em `LeadDedupPanel.tsx`.
 */
export class LeadDeduplicationService {
  /**
   * Busca leads duplicados com o mesmo contato dentro de uma organização e os mescla,
   * preservando o lead de maior valor comercial.
   */
  async deduplicateByEmail(organizationId: string): Promise<{ merged: number }> {
    return requestContext.run({ tenantId: organizationId }, async () => {
      try {
        // Conta agrupamentos de contactId com mais de 1 lead
        const duplicates = await prisma.lead.groupBy({
          by: ['contactId'],
          where: {
            organizationId,
            contactId: { not: null },
          },
          having: {
            contactId: {
              _count: {
                gt: 1,
              },
            },
          },
        });

        if (duplicates.length === 0) {
          return { merged: 0 };
        }

        let mergedCount = 0;

        for (const dup of duplicates) {
          if (!dup.contactId) continue;

          const leads = await prisma.lead.findMany({
            where: { organizationId, contactId: dup.contactId },
            orderBy: { amount: 'desc' }, // Mantém o lead com maior valor comercial
          });

          if (leads.length > 1) {
            const [survivor, ...duplicateLeads] = leads;
            const duplicateIds = duplicateLeads.map((l) => l.id);

            // Preserva o conteúdo real dos leads duplicados reatribuindo pro sobrevivente ANTES
            // de soft-deletar — merge completo, ver doc da classe pra lista completa e por que
            // cada chamada roda sequencial (não dentro de um $transaction externo).
            await prisma.note.updateMany({
              where: { leadId: { in: duplicateIds } },
              data: { leadId: survivor.id },
            });
            await prisma.timelineEvent.updateMany({
              where: { leadId: { in: duplicateIds } },
              data: { leadId: survivor.id },
            });
            await prisma.activity.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.attachment.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.leadStageHistory.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.leadFieldChange.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.crmDealItem.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.crmCommercialDocument.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.callSuppression.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.whatsAppMessage.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.conversationSignal.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.copilotoConversation.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.copilotoDealHealthSnapshot.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.bitrixSyncLog.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.voiceCallLog.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.optOutRecord.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.prospect.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.mesaTratamentoTreatment.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.cadenceRun.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.emailMessage.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.cadenceCalendarEvent.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });
            await prisma.dealClosureEvent.updateMany({
              where: { leadId: { in: duplicateIds }, organizationId },
              data: { leadId: survivor.id },
            });

            // Soft-delete (não hard-delete): sobre o `prisma` estendido, `deleteMany` em `Lead`
            // é interceptado por `$allOperations` (src/lib/prisma.ts) e vira um `updateMany`
            // marcando deletedAt/deletedBy/deleteReason, com trilha em AuditLog — nunca uma
            // remoção física de linha.
            await prisma.lead.deleteMany({
              where: {
                id: { in: duplicateIds },
                organizationId,
              },
            });

            mergedCount += duplicateIds.length;
            logger.info(
              `Deduplicated ${duplicateIds.length} leads for contact ${dup.contactId} (survivor: ${survivor.id})`,
            );
          }
        }

        return { merged: mergedCount };
      } catch (error: any) {
        logger.error({ err: error, organizationId }, 'Falha na deduplicação de leads');
        throw error;
      }
    });
  }

  /**
   * Mesmo agrupamento de `deduplicateByEmail`, só leitura — nenhum dado é alterado. Usado pela UI
   * (`LeadDedupPanel.tsx`) para mostrar os grupos e o sobrevivente calculado ANTES de o usuário
   * confirmar o merge de verdade (`POST /api/leads/dedup/merge`).
   */
  async previewDuplicates(organizationId: string): Promise<{
    groups: Array<{
      contactId: string;
      survivorId: string;
      duplicateIds: string[];
      leads: Array<{
        id: string;
        title: string | null;
        amount: number | null;
        currency: string;
        status: string;
        createdAt: Date;
      }>;
    }>;
  }> {
    return requestContext.run({ tenantId: organizationId }, async () => {
      const duplicates = await prisma.lead.groupBy({
        by: ['contactId'],
        where: { organizationId, contactId: { not: null } },
        having: { contactId: { _count: { gt: 1 } } },
      });

      const groups = [];
      for (const dup of duplicates) {
        if (!dup.contactId) continue;
        const leads = await prisma.lead.findMany({
          where: { organizationId, contactId: dup.contactId },
          orderBy: { amount: 'desc' },
          select: {
            id: true,
            title: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true,
          },
        });
        if (leads.length <= 1) continue;
        const [survivor, ...duplicateLeads] = leads;
        groups.push({
          contactId: dup.contactId,
          survivorId: survivor.id,
          duplicateIds: duplicateLeads.map((l) => l.id),
          leads,
        });
      }
      return { groups };
    });
  }
}
