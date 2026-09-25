import { Prisma } from '@prisma/client';
import * as sessionRepository from '../repositories/sessionRepository.js';

export class NotFoundError extends Error {}

export function listSessions(organizationId: string, userId: string) {
  return sessionRepository.listSessionsForUser(organizationId, userId);
}

export function createSession(organizationId: string, userId: string, data: { agentId?: string; channel?: string; metadata?: unknown }) {
  return sessionRepository.createSession(organizationId, userId, data);
}

export async function updateSession(id: string, organizationId: string, userId: string, data: { status?: string; metadata?: Record<string, unknown> }) {
  const existing = await sessionRepository.findSessionForUser(id, organizationId, userId);
  if (!existing) throw new NotFoundError('Sessão não encontrada.');

  return sessionRepository.updateSession(id, {
    status: data.status ?? undefined,
    metadata: data.metadata
      ? ({ ...(existing.metadata as Record<string, unknown>), ...data.metadata } as Prisma.InputJsonValue)
      : undefined,
  });
}

export async function deleteSession(id: string, organizationId: string, userId: string) {
  const existing = await sessionRepository.findSessionForUser(id, organizationId, userId);
  if (!existing) throw new NotFoundError('Sessão não encontrada para finalização.');
  await sessionRepository.deleteSession(id);
}
