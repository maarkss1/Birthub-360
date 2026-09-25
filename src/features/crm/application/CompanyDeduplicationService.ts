import { requestContext } from '../../../lib/async-context.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * Item 13 (Inteligência de Dados & Enriquecimento) — de-duplicação de `Company`, mesmo padrão de
 * `LeadDeduplicationService.ts` (ver o comentário grande lá para o raciocínio de RLS/soft-delete
 * já compartilhado). Duas fontes reais de duplicata aqui, não fuzzy matching por nome:
 *
 * 1. CNPJ igual (normalizado, dígitos puros — `@@unique([organizationId, cnpj])` no schema já
 *    impede duplicata NOVA por este campo desde a Onda 43, mas não corrige dado legado gravado
 *    antes dessa constraint existir).
 * 2. `tradeName` idêntico (trim + lowercase) quando AMBAS as linhas têm `cnpj` nulo — o caso real
 *    mais comum na prática: importação do Bitrix24 (`leads.ts`/`deals.ts`) nunca traz CNPJ, então
 *    o mesmo cliente entrando duas vezes (uma vez manual, outra via import, ou duas importações
 *    do mesmo Negócio) não cai na constraint de CNPJ. Comparação por igualdade exata, não fuzzy —
 *    mesmo rigor do agrupamento por `contactId` do LeadDeduplicationService.
 *
 * Sobrevivente: a empresa com enriquecimento mais completo (`enrichmentStatus === 'Enriquecido'`)
 * ganha; empate resolvido pela mais antiga (`createdAt` menor — mais histórico de relações reais
 * acumulado). Isso é diferente do critério de Lead (maior `amount`) porque aqui o que importa é
 * qual registro tem mais dado de enriquecimento carregado, não valor comercial.
 *
 * Relações mescladas (reatribuídas para o sobrevivente ANTES do soft-delete): `Contact`, `Lead`,
 * `Note`, `Attachment`, `EnrichmentLog`, `CrmCommercialDocument`, `CopilotoConversation`. `Prospect`
 * fica de fora de propósito — comentário no schema (`prisma/schema.prisma`, model `Prospect`)
 * documenta que esse model não tem nenhum write path real hoje (fora do allowlist `tenantModels`,
 * sem `organizationId` garantido) — mexer nele seria risco sem benefício real.
 *
 * A cadeia de Account Intelligence da empresa duplicada (`AccountIntelligenceSnapshot`,
 * `AccountSignal`, `DecisionMaker`, `IntelligenceEvidence`, `AccountScore`,
 * `AccountRecommendation`, `EconomicRelationship`) NÃO é reatribuída — é dado derivado/calculado
 * pro id específico da empresa (várias FKs compostas amarram `companyId` ao mesmo tempo em que uma
 * `snapshot` também é referenciada por esse `companyId`; re-chavear isso peça por peça arrisca
 * violar a própria FK composta). Em vez de re-chavear, essas linhas são apagadas (delete real —
 * nenhum desses models está em `auditableModels`, então não há soft-delete pra eles; é dado
 * recalculável, não conteúdo autoral) antes do merge — o scheduler existente
 * (`accountIntelligenceScheduler.worker.ts`) gera um snapshot novo pro sobrevivente no próximo
 * ciclo. `DecisionMaker` precisa ser apagado ANTES de mover `Contact.companyId`: ele referencia
 * `Contact.[id, companyId, organizationId]` numa FK composta — mover o `companyId` do Contact sem
 * limpar o `DecisionMaker` da empresa antiga quebraria essa constraint (o valor de
 * `DecisionMaker.companyId` teria que casar com o novo `Contact.companyId`, mas
 * `DecisionMaker.snapshotId` ainda apontaria pro snapshot da empresa antiga).
 *
 * Ordem de delete respeita as FKs `Restrict` que apontam para `AccountIntelligenceSnapshot`
 * (filhos antes do pai).
 */
export class CompanyDeduplicationService {
  private async clearAccountIntelligence(
    organizationId: string,
    companyIds: string[],
  ): Promise<void> {
    if (companyIds.length === 0) return;
    const where = { organizationId, companyId: { in: companyIds } };
    await prisma.accountRecommendation.deleteMany({ where });
    await prisma.accountScore.deleteMany({ where });
    await prisma.intelligenceEvidence.deleteMany({ where });
    await prisma.accountSignal.deleteMany({ where });
    await prisma.decisionMaker.deleteMany({ where });
    await prisma.economicRelationship.deleteMany({
      where: {
        organizationId,
        OR: [{ sourceCompanyId: { in: companyIds } }, { targetCompanyId: { in: companyIds } }],
      },
    });
    await prisma.accountIntelligenceSnapshot.deleteMany({ where });
  }

  private async mergeGroup(
    organizationId: string,
    companies: Array<{ id: string; enrichmentStatus: string; createdAt: Date }>,
  ): Promise<number> {
    if (companies.length <= 1) return 0;

    const [survivor, ...duplicates] = [...companies].sort((a, b) => {
      const aEnriched = a.enrichmentStatus === 'Enriquecido' ? 1 : 0;
      const bEnriched = b.enrichmentStatus === 'Enriquecido' ? 1 : 0;
      if (aEnriched !== bEnriched) return bEnriched - aEnriched;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    const duplicateIds = duplicates.map((c) => c.id);

    // Limpa a cadeia de Account Intelligence ANTES de mover Contact — ver doc da classe.
    await this.clearAccountIntelligence(organizationId, duplicateIds);

    await prisma.contact.updateMany({
      where: { companyId: { in: duplicateIds }, organizationId },
      data: { companyId: survivor.id },
    });
    await prisma.lead.updateMany({
      where: { companyId: { in: duplicateIds }, organizationId },
      data: { companyId: survivor.id },
    });
    // Note e EnrichmentLog não têm coluna organizationId própria (escopadas pelo pai) — mesmo
    // padrão que LeadDeduplicationService já usa pra Note/TimelineEvent.
    await prisma.note.updateMany({
      where: { companyId: { in: duplicateIds } },
      data: { companyId: survivor.id },
    });
    await prisma.enrichmentLog.updateMany({
      where: { companyId: { in: duplicateIds } },
      data: { companyId: survivor.id },
    });
    await prisma.attachment.updateMany({
      where: { companyId: { in: duplicateIds }, organizationId },
      data: { companyId: survivor.id },
    });
    await prisma.crmCommercialDocument.updateMany({
      where: { companyId: { in: duplicateIds }, organizationId },
      data: { companyId: survivor.id },
    });
    await prisma.copilotoConversation.updateMany({
      where: { companyId: { in: duplicateIds }, organizationId },
      data: { companyId: survivor.id },
    });

    // Soft-delete (Company está em auditableModels — deleteMany vira updateMany com
    // deletedAt/deletedBy/deleteReason + trilha em AuditLog, nunca remoção física).
    await prisma.company.deleteMany({
      where: { id: { in: duplicateIds }, organizationId },
    });

    logger.info(
      `Deduplicated ${duplicateIds.length} companies into survivor ${survivor.id} (org ${organizationId})`,
    );
    return duplicateIds.length;
  }

  private async findGroups(organizationId: string): Promise<
    Array<{
      key: string;
      matchedBy: 'cnpj' | 'tradeName';
      companies: Array<{
        id: string;
        legalName: string;
        tradeName: string;
        cnpj: string | null;
        enrichmentStatus: string;
        createdAt: Date;
      }>;
    }>
  > {
    return requestContext.run({ tenantId: organizationId }, async () => {
      const companies = await prisma.company.findMany({
        where: { organizationId },
        select: {
          id: true,
          legalName: true,
          tradeName: true,
          cnpj: true,
          enrichmentStatus: true,
          createdAt: true,
        },
      });

      const byCnpj = new Map<string, typeof companies>();
      const byTradeName = new Map<string, typeof companies>();

      for (const company of companies) {
        if (company.cnpj) {
          const key = company.cnpj.trim();
          if (key) byCnpj.set(key, [...(byCnpj.get(key) ?? []), company]);
        } else {
          const key = company.tradeName.trim().toLowerCase();
          if (key) byTradeName.set(key, [...(byTradeName.get(key) ?? []), company]);
        }
      }

      const groups: Array<{
        key: string;
        matchedBy: 'cnpj' | 'tradeName';
        companies: typeof companies;
      }> = [];
      for (const [key, group] of byCnpj) {
        if (group.length > 1) groups.push({ key, matchedBy: 'cnpj', companies: group });
      }
      for (const [key, group] of byTradeName) {
        if (group.length > 1) groups.push({ key, matchedBy: 'tradeName', companies: group });
      }
      return groups;
    });
  }

  /** Mesmo agrupamento do merge, só leitura — usado pela UI antes da confirmação. */
  async previewDuplicates(organizationId: string): Promise<{
    groups: Array<{
      key: string;
      matchedBy: 'cnpj' | 'tradeName';
      survivorId: string;
      duplicateIds: string[];
      companies: Array<{
        id: string;
        legalName: string;
        tradeName: string;
        cnpj: string | null;
        enrichmentStatus: string;
        createdAt: Date;
      }>;
    }>;
  }> {
    const rawGroups = await this.findGroups(organizationId);
    const groups = rawGroups.map((g) => {
      const [survivor] = [...g.companies].sort((a, b) => {
        const aEnriched = a.enrichmentStatus === 'Enriquecido' ? 1 : 0;
        const bEnriched = b.enrichmentStatus === 'Enriquecido' ? 1 : 0;
        if (aEnriched !== bEnriched) return bEnriched - aEnriched;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
      return {
        key: g.key,
        matchedBy: g.matchedBy,
        survivorId: survivor.id,
        duplicateIds: g.companies.filter((c) => c.id !== survivor.id).map((c) => c.id),
        companies: g.companies,
      };
    });
    return { groups };
  }

  /** Executa o merge de todos os grupos encontrados. Destrutivo (soft-delete) — chame depois de preview. */
  async deduplicate(organizationId: string): Promise<{ merged: number; groups: number }> {
    return requestContext.run({ tenantId: organizationId }, async () => {
      try {
        const groups = await this.findGroups(organizationId);
        let merged = 0;
        for (const group of groups) {
          merged += await this.mergeGroup(organizationId, group.companies);
        }
        return { merged, groups: groups.length };
      } catch (error: any) {
        logger.error({ err: error, organizationId }, 'Falha na deduplicação de empresas');
        throw error;
      }
    });
  }
}
