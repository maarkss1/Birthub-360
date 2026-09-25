import type { LeadFunnel, LeadStatus as PrismaLeadStatus, Prisma } from '@prisma/client';
import { recordStageTransition } from '../../../shared/services/leadStageHistory.service';
import {
  fromPrismaActivityStatus,
  fromPrismaActivityType,
  fromPrismaCompanyStatus,
  fromPrismaLeadStatus,
  isLeadClosingStatus,
  toPrismaLeadStatus,
} from '../../../lib/enumMap';
import { prisma } from '../../../lib/prisma';
import { searchLeadIds } from '../../../lib/search/index';
import type { LeadStatus } from '../../../lib/zod';
import { recordLeadFieldChanges } from '../../../shared/services/leadFieldChangeHistory.service';
import type { Lead, LeadRepository } from '../domain/Lead';

/**
 * CRM-011 (`docs/audits/repository-debt-audit/agents/CRM.md`): `Lead.status` (o enum `LeadStatus`
 * fixo, mapeado 1:1 pro Kanban legado em `CrmBoard.tsx`) e `Lead.pipelineStageId` (a etapa de um
 * `CrmPipeline` configurável por organização, usada por CRM360 e pelos relatórios de
 * `commercial-intelligence`) são DUAS representações independentemente armazenadas do mesmo
 * conceito de "etapa atual do negócio". `PrismaCrm360Repository.updateLeadStage` já escreve as
 * duas juntas quando o movimento vem do board de pipeline; esta função fecha o mesmo caminho para
 * quem muda só `status` (Kanban de Leads legado, agentes de IA via `LeadUseCases.updateLeadStatus`,
 * edição completa via `PUT /api/leads/:id`) — sem isso, `pipelineStageId` ficava congelado na
 * etapa antiga enquanto `status` avançava, divergindo do que os relatórios de pipeline leem.
 * Prioriza uma etapa dentro do pipeline atual do lead (preserva pipelines customizados/reordenados
 * pela organização); cai para o pipeline padrão da organização quando não encontra uma etapa lá
 * (ex.: lead legado ainda sem `pipelineId`).
 */
async function findMatchingPipelineStage(
  organizationId: string,
  status: PrismaLeadStatus | undefined,
  preferredPipelineId?: string | null,
) {
  if (!status) return null;

  if (preferredPipelineId) {
    const inCurrentPipeline = await prisma.crmPipelineStage.findFirst({
      where: { leadStatus: status, pipelineId: preferredPipelineId, pipeline: { organizationId } },
    });
    if (inCurrentPipeline) return inCurrentPipeline;
  }

  return prisma.crmPipelineStage.findFirst({
    where: { leadStatus: status, pipeline: { organizationId, active: true, isDefault: true } },
  });
}

function serializeLead<
  T extends {
    status: string;
    company?: { status: string } | null;
    activities?: Array<{ type: string; status: string }>;
  },
>(lead: T, forecastProbabilityAi: number | null = null): unknown {
  return {
    ...lead,
    status: fromPrismaLeadStatus(lead.status),
    forecastProbabilityAi,
    ...(lead.company
      ? { company: { ...lead.company, status: fromPrismaCompanyStatus(lead.company.status) } }
      : {}),
    ...(lead.activities
      ? {
          activities: lead.activities.map((a) => ({
            ...a,
            type: fromPrismaActivityType(a.type),
            status: fromPrismaActivityStatus(a.status),
          })),
        }
      : {}),
  };
}

/** Junta o `forecastProbabilityAi` mais recente (CopilotoDealHealthSnapshot, append-only) para um
 * lote de leads numa única query — nunca N+1, e nunca fabrica valor para quem não tem snapshot
 * (fica `null`, tratado como "Não disponível" pela UI, nunca 0). */
async function loadLatestForecastProbabilityAi(
  organizationId: string,
  leadIds: string[],
): Promise<Map<string, number | null>> {
  if (leadIds.length === 0) return new Map();
  const snapshots = await prisma.copilotoDealHealthSnapshot.findMany({
    where: { organizationId, leadId: { in: leadIds } },
    orderBy: { createdAt: 'desc' },
    distinct: ['leadId'],
    select: { leadId: true, forecastProbabilityAi: true },
  });
  return new Map(snapshots.map((snapshot) => [snapshot.leadId, snapshot.forecastProbabilityAi]));
}

export class PrismaLeadRepository implements LeadRepository {
  async findAllWithFilters(
    organizationId: string,
    status?: string,
    page: number = 1,
    limit: number = 50,
    funnel?: LeadFunnel,
    query?: string,
  ): Promise<{ data: Lead[]; meta: unknown }> {
    const where: Prisma.LeadWhereInput = { organizationId };
    if (status) {
      where.status = toPrismaLeadStatus(
        status as LeadStatus,
      ) as unknown as Prisma.LeadWhereInput['status'];
    }
    if (funnel) where.funnel = funnel;

    if (query) {
      const matchedIds = await searchLeadIds(organizationId, query, 500);
      if (matchedIds !== null) {
        if (matchedIds.length === 0) {
          return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        }
        where.id = { in: matchedIds };
      } else {
        // Fallback to postgres basic search
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { contact: { name: { contains: query, mode: 'insensitive' } } },
          { company: { legalName: { contains: query, mode: 'insensitive' } } },
        ];
      }
    }

    const skip = (page - 1) * limit;

    // Priorização por probabilidade de fechamento (item 4 de "IA Agêntica de Vendas"), não por
    // última atividade: `probability` é a probabilidade OFICIAL do CRM (atualizada a cada troca
    // de estágio via LeadStageHistory), leads sem probabilidade ainda calculada vão para o fim
    // (nulls: 'last'), não para o topo — o default do Postgres em DESC é nulls FIRST, que
    // colocaria leads não qualificados acima de oportunidades reais. `lastInteraction` e
    // `createdAt` continuam como desempate, não como critério principal.
    const leads = await prisma.lead.findMany({
      where,
      skip,
      take: limit,
      include: { company: true, contact: true },
      orderBy: [
        { probability: { sort: 'desc', nulls: 'last' } },
        { lastInteraction: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
    });
    const total = await prisma.lead.count({ where });

    const forecastByLeadId = await loadLatestForecastProbabilityAi(
      organizationId,
      leads.map((lead) => lead.id),
    );

    return {
      data: leads.map((lead) =>
        serializeLead(lead, forecastByLeadId.get(lead.id) ?? null),
      ) as unknown as Lead[],
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(organizationId: string, id: string): Promise<Lead | null> {
    const lead = await prisma.lead.findFirst({
      where: { id, organizationId },
      include: {
        company: true,
        contact: true,
        activities: { orderBy: { date: 'desc' } },
        timeline: { orderBy: { createdAt: 'desc' } },
        internalNotes: { orderBy: { createdAt: 'desc' } },
      },
    });
    return lead ? (serializeLead(lead) as unknown as Lead) : null;
  }

  async create(organizationId: string, data: Partial<Lead> & { status: string }): Promise<Lead> {
    const expectedCloseAt = data.expectedCloseAt
      ? new Date(data.expectedCloseAt as unknown as string | Date)
      : data.expectedCloseAt;
    const lead = await prisma.lead.create({
      data: {
        ...data,
        expectedCloseAt,
        status: toPrismaLeadStatus(
          data.status as LeadStatus,
        ) as unknown as Prisma.LeadCreateInput['status'],
        organizationId,
        company: undefined,
        contact: undefined,
        activities: undefined,
        internalNotes: undefined,
        timeline: {
          create: {
            type: 'creation',
            description: 'Lead criado no sistema',
          },
        },
      } as Prisma.LeadUncheckedCreateInput,
      include: { company: true, contact: true },
    });
    return serializeLead(lead) as unknown as Lead;
  }

  async update(
    organizationId: string,
    id: string,
    // `status` aqui é o rótulo legível (ex.: "Proposta Enviada", tipo `LeadStatus` de
    // `lib/zod`), não o enum do Prisma (`Lead['status']`, ex.: "Proposta_Enviada") — por isso o
    // `Omit`: sem ele, a interseção com `Partial<Lead>` reduziria o tipo de `status` para só os
    // identificadores do Prisma, o que nunca refletiu o valor real que este método recebe (ver
    // `toPrismaLeadStatus` logo abaixo, que já assumia o rótulo).
    data: Omit<Partial<Lead>, 'status'> & { status?: string },
  ): Promise<Lead> {
    // Não fazemos findFirst prévio: se o lead não existir (ou não pertencer ao org),
    // o Prisma lança P2025 que o errorHandler mapeia para 404 — sem N+1 queries.
    // O `where` inclui organizationId para garantir isolamento de tenant.
    // Mesmo cast de conveniência da linha de baixo (toPrismaLeadStatus(data.status as LeadStatus)):
    // o tipo de domínio de Lead.status não bate 1:1 com o LeadStatus "rótulo legível" do zod.
    const statusLabel = data.status as LeadStatus | undefined;
    const isClosingNow = isLeadClosingStatus(statusLabel);
    const expectedCloseAt = data.expectedCloseAt
      ? new Date(data.expectedCloseAt as unknown as string | Date)
      : data.expectedCloseAt;
    const prismaStatus = data.status
      ? (toPrismaLeadStatus(
          data.status as LeadStatus,
        ) as unknown as Prisma.LeadUpdateInput['status'])
      : undefined;
    // CRM-011: só sincroniza pipelineId/pipelineStageId a partir de `status` quando o próprio
    // payload não está gerenciando o pipeline explicitamente (ver findMatchingPipelineStage acima)
    // — evita pisar num pipelineStageId que o caller já decidiu de propósito nesta mesma chamada.
    const syncsPipelineToStatus =
      data.status !== undefined &&
      data.pipelineId === undefined &&
      data.pipelineStageId === undefined;
    // CLOSEDATE Intelligence / Handoffs: só quando o payload toca um campo rastreado, lê o valor
    // anterior (uma query leve) para registrar a mudança real em LeadFieldChange. Reaproveitada
    // também pelo CRM-011 acima, quando precisamos saber o pipelineId/pipelineStageId atuais do
    // lead antes de decidir a nova etapa correspondente ao novo status.
    // Sem isso, nenhum adiamento de data prevista nem troca de responsável feito por esta rota
    // (PUT /api/leads/:id, único caminho da UI para os dois campos) deixaria histórico.
    const tracksField = data.expectedCloseAt !== undefined || data.owner !== undefined;
    const previousLead =
      tracksField || syncsPipelineToStatus
        ? await prisma.lead.findFirst({
            where: { id, organizationId },
            select: {
              expectedCloseAt: true,
              owner: true,
              pipelineId: true,
              pipelineStageId: true,
            },
          })
        : null;
    const previousTracked = tracksField ? previousLead : null;
    const matchedStage = syncsPipelineToStatus
      ? await findMatchingPipelineStage(
          organizationId,
          prismaStatus as unknown as PrismaLeadStatus | undefined,
          previousLead?.pipelineId,
        )
      : null;
    const lead = await prisma.lead.update({
      where: { id, organizationId },
      data: {
        ...data,
        expectedCloseAt,
        ...(data.status ? { status: prismaStatus } : {}),
        // Mesma lógica de closedAt de updateStatus (ver comentário lá) — este método também
        // aceita `status` no payload, então precisa manter a mesma garantia.
        ...(data.status ? { closedAt: isClosingNow ? new Date() : null } : {}),
        // CRM-011 (docs/audits/repository-debt-audit/agents/CRM.md): mantém pipelineId/
        // pipelineStageId/probability (a etapa de CrmPipeline) em sincronia com `status` (o
        // LeadStatus fixo) quando a mudança de etapa chega por esta rota em vez de
        // `/api/crm/records/:id/stage` — ver findMatchingPipelineStage no topo do arquivo.
        ...(matchedStage
          ? {
              pipelineId: matchedStage.pipelineId,
              pipelineStageId: matchedStage.id,
              probability: matchedStage.probability,
            }
          : {}),
        organizationId: undefined,
        company: undefined,
        contact: undefined,
        activities: undefined,
        internalNotes: undefined,
        timeline: {
          create: {
            type: 'edition',
            description: 'Dados do lead atualizados',
          },
        },
      } as Prisma.LeadUpdateInput,
    });
    if (previousTracked) {
      await recordLeadFieldChanges(
        organizationId,
        id,
        previousTracked,
        { expectedCloseAt: expectedCloseAt as Date | null | undefined, owner: data.owner },
        { source: 'crm' },
      );
    }
    if (matchedStage && previousLead && previousLead.pipelineStageId !== matchedStage.id) {
      await recordStageTransition(
        organizationId,
        id,
        {
          id: matchedStage.id,
          name: matchedStage.name,
          probability: matchedStage.probability,
          isWon: matchedStage.isWon,
          isLost: matchedStage.isLost,
        },
        matchedStage.pipelineId,
      );
    }
    return serializeLead(lead) as unknown as Lead;
  }

  async updateStatus(organizationId: string, id: string, newStatus: string): Promise<Lead> {
    // Busca o status atual para compor a mensagem de timeline, e valida a existência + tenant
    // numa única query. Se não encontrar, lança Error que o errorHandler converte em 404.
    const currentLead = await prisma.lead.findFirst({ where: { id, organizationId } });
    if (!currentLead) throw new Error('Lead not found');

    const previousStatusLabel = fromPrismaLeadStatus(currentLead.status);
    // closedAt: setado só nesta transição (não é @updatedAt) — analytics.service.ts depende
    // disso pra "ganho/perdido no mês" não contar como fechamento qualquer update posterior do
    // lead (sync do Bitrix, uma ligação tocando só lastInteraction, etc.). Volta a null se o
    // lead for reaberto pra uma etapa que não é final.
    // Os dois estágios "...Cancelado" dos pilotos comerciais entram aqui pelo mesmo motivo que
    // "Negócios Perdidos": crm360.service.ts (DEAL_STAGES) já os define como isLost:true — sem
    // fechar closedAt aqui, um piloto cancelado por este caminho (update legado de status, sem
    // passar por /api/crm/records/:id/stage) ficaria "aberto" para sempre nos relatórios.
    // Lista compartilhada com update() (acima) e PrismaCrm360Repository.updateLeadStage() —
    // ver isLeadClosingStatus em src/lib/enumMap.ts.
    const isClosingNow = isLeadClosingStatus(newStatus);
    const prismaStatus = toPrismaLeadStatus(
      newStatus as LeadStatus,
    ) as unknown as Prisma.LeadUpdateInput['status'];
    // CRM-011 (docs/audits/repository-debt-audit/agents/CRM.md): este é o caminho que o Kanban de
    // Leads legado (CrmBoard.tsx, via PUT /api/leads/:id {status}) e os agentes de IA
    // (LeadUseCases.updateLeadStatus) usam para mover a etapa de um lead. Antes desta correção,
    // ele só tocava `status`, deixando `pipelineId`/`pipelineStageId` (a etapa "real" do
    // CrmPipeline, lida por CRM360 e pelos relatórios de commercial-intelligence) congelados na
    // etapa anterior — as duas representações do "estágio atual" divergiam silenciosamente assim
    // que alguém usasse este caminho em vez de `/api/crm/records/:id/stage`
    // (PrismaCrm360Repository.updateLeadStage, que já fazia essa sincronia). Resolve buscando a
    // CrmPipelineStage cujo `leadStatus` corresponde ao novo status (preferindo o pipeline atual
    // do lead) e gravando as duas junto, mais o registro em LeadStageHistory.
    const matchedStage = await findMatchingPipelineStage(
      organizationId,
      prismaStatus as unknown as PrismaLeadStatus | undefined,
      currentLead.pipelineId,
    );
    // O `where` inclui organizationId para garantir isolamento de tenant no update.
    const lead = await prisma.lead.update({
      where: { id, organizationId },
      data: {
        status: prismaStatus,
        closedAt: isClosingNow ? new Date() : null,
        ...(matchedStage
          ? {
              pipelineId: matchedStage.pipelineId,
              pipelineStageId: matchedStage.id,
              probability: matchedStage.probability,
            }
          : {}),
        timeline: {
          create: {
            type: 'movement',
            description: `Lead movido de '${previousStatusLabel}' para '${newStatus}'`,
          },
        },
      },
      include: {
        company: true,
        contact: true,
        timeline: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (matchedStage && currentLead.pipelineStageId !== matchedStage.id) {
      await recordStageTransition(
        organizationId,
        id,
        {
          id: matchedStage.id,
          name: matchedStage.name,
          probability: matchedStage.probability,
          isWon: matchedStage.isWon,
          isLost: matchedStage.isLost,
        },
        matchedStage.pipelineId,
      );
    }
    return serializeLead(lead) as unknown as Lead;
  }

  async delete(organizationId: string, id: string): Promise<Lead> {
    // CORREÇÃO: Usar soft delete (update com deletedAt) em vez de hard delete.
    // A chamada direta a prisma.lead.delete() bypassava a extensão em prisma.ts que
    // intercepta deletes e os converte para update com deletedAt — o registro era
    // removido fisicamente do banco. Agora aplicamos o soft delete explicitamente,
    // garantindo consistência com o resto do sistema (filtros de findMany, cascade, etc.).
    // O `where` inclui organizationId para garantir isolamento de tenant.
    const lead = await prisma.lead
      .update({
        where: { id, organizationId },
        data: { deletedAt: new Date() },
      })
      .catch((err) => {
        // Prisma lança P2025 quando o registro não existe — propagamos como erro simples
        // para o errorHandler mapear para 404.
        if (err?.code === 'P2025') throw new Error('Lead not found');
        throw err;
      });
    return lead as unknown as Lead;
  }

  async findAllForExport(organizationId: string): Promise<Lead[]> {
    const leads = await prisma.lead.findMany({
      where: { organizationId },
      include: { company: true, contact: true },
      orderBy: { createdAt: 'desc' },
    });
    // CORREÇÃO: Aplicar serializeLead para converter enums internos do Prisma
    // (ex: 'Lead_Recebido') para os rótulos legíveis usados na UI e no CSV
    // (ex: 'Lead Recebido'). Sem isso, o Bitrix24 recebia valores ilegíveis.
    return leads.map(serializeLead) as unknown as Lead[];
  }
}
