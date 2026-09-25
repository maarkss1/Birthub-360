import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';

const VALID_FUNNELS = new Set(['Lead', 'Negocio']);

export interface SavedViewFilters {
  owner?: string;
  q?: string;
}

/**
 * Views salvas do pipeline (Onda B2b, Commercial AI OS) — pessoais: toda leitura/escrita é
 * escopada por `userId` além de `organizationId`. RLS (SavedView, migration
 * 20260909131444_saved_view) já isola por tenant; o isolamento por dono é reforçado aqui, na
 * camada de aplicação, não confiado ao frontend.
 */
export function listSavedViews(organizationId: string, userId: string) {
  return prisma.savedView.findMany({
    where: { organizationId, userId },
    orderBy: { createdAt: 'desc' },
  });
}

export function createSavedView(
  organizationId: string,
  userId: string,
  input: { name?: string; funnel?: string; filters?: SavedViewFilters },
) {
  const name = input.name?.trim();
  if (!name) {
    throw new AppError('Nome da view é obrigatório.', 400);
  }
  if (!input.funnel || !VALID_FUNNELS.has(input.funnel)) {
    throw new AppError('Funil inválido — use "Lead" ou "Negocio".', 400);
  }
  // Conflito de nome duplicado (mesmo usuário) vira 409 automaticamente via P2002 no
  // errorHandler.ts global — não precisa de checagem manual aqui.
  return prisma.savedView.create({
    data: {
      organizationId,
      userId,
      name,
      funnel: input.funnel,
      filters: (input.filters ?? {}) as object,
    },
  });
}

export async function deleteSavedView(organizationId: string, userId: string, id: string) {
  // deleteMany (não delete) porque o filtro já inclui userId: um id de outro usuário nunca é
  // encontrado, então count fica 0 — 404 real de "não existe" ou "não é seu", sem distinguir os
  // dois (evita vazar pra um usuário que uma view de outro existe).
  const result = await prisma.savedView.deleteMany({ where: { id, organizationId, userId } });
  if (result.count === 0) {
    throw new AppError('View não encontrada.', 404);
  }
}
