import { requestContext } from '../../../lib/async-context.js';
import { logger } from '../../../lib/logger';
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
 *    TODO(merge real completo — fora do escopo desta correção de segurança): esta função só
 *    reatribui Note/Activity/TimelineEvent. Um "merge" completo de domínio também reatribuiria
 *    `LeadStageHistory`, `LeadFieldChange`, `CrmDealItem`, `CrmCommercialDocument`, `CadenceRun`,
 *    `WhatsAppMessage`/`EmailMessage`, `ConversationSignal`, `OptOutRecord`, `Prospect` e outras
 *    relações com `leadId` (ver `prisma/schema.prisma`) para o lead sobrevivente antes de
 *    soft-deletar os duplicados. Como esses registros não têm `deletedAt` (não são "auditable" na
 *    extensão do Prisma) e o soft-delete de Lead nunca aciona o `onDelete: Cascade` do banco (só
 *    dispara em um DELETE físico, que nunca chega a acontecer aqui), eles não são destruídos —
 *    ficam preservados no banco, só temporariamente órfãos de um lead marcado como deletado, até
 *    um merge real futuro decidir para onde reatribuí-los.
 *
 * Esta classe segue sem nenhum caller (rota/job/cron) nesta rodada — permanece "unreachable" até
 * alguém decidir religá-la. Este fix garante que, no dia em que for religada, ela não cause perda
 * de dado irreversível nem vazamento cross-tenant.
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
            // de soft-deletar — ver TODO na doc da classe sobre o que fica de fora deste merge
            // parcial.
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
      } catch (error) {
        logger.error({ err: error, organizationId }, 'Falha na deduplicação de leads');
        throw error;
      }
    });
  }
}
