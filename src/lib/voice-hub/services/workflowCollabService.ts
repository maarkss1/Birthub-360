import * as workflowRepository from '../repositories/workflowRepository.js';
import { NotFoundError } from './workflowService.js';

export class ConflictError extends Error {}

interface CollabMetadata {
  comments?: Comment[];
  locks?: Record<string, { userId: string; timestamp: number }>;
  [key: string]: unknown;
}

interface Comment {
  id: string;
  nodeId: string;
  userId: string;
  text: string;
  timestamp: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
}

const MAX_RETRIES = 5;

// Comments/locks live in the workflow's JSONB `metadata` column rather than dedicated tables
// (per project constraint: no Prisma schema changes for this collab feature). Concurrent
// mutations therefore need optimistic locking on `Workflow.version` — without it, two
// read-modify-write calls racing on the same workflow silently drop one caller's update.
async function mutateMetadata(tenantId: string, userId: string, mutate: (metadata: CollabMetadata) => void) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const existing = await workflowRepository.findWorkflowForTenant(tenantId);
    if (!existing) throw new NotFoundError('Workflow não encontrado.');

    const metadata = (existing.metadata as CollabMetadata) || {};
    mutate(metadata);

    const updatedCount = await workflowRepository.updateMetadataIfVersion(existing.id, existing.version, userId, metadata);
    if (updatedCount > 0) {
      return workflowRepository.findWorkflowById(existing.id);
    }
    // Someone else updated the workflow between our read and write — retry with fresh data.
  }
  throw new ConflictError('Não foi possível salvar: o fluxo foi modificado concorrentemente. Tente novamente.');
}

export function addComment(tenantId: string, userId: string, nodeId: string, text: string) {
  return mutateMetadata(tenantId, userId, (metadata) => {
    metadata.comments = metadata.comments || [];
    metadata.comments.push({
      id: `cmt_${crypto.randomUUID()}`,
      nodeId,
      userId,
      text,
      timestamp: Date.now(),
      resolved: false,
    });
  });
}

export function resolveComment(tenantId: string, userId: string, commentId: string) {
  return mutateMetadata(tenantId, userId, (metadata) => {
    const comment = (metadata.comments || []).find((c) => c.id === commentId);
    if (comment) {
      comment.resolved = true;
      comment.resolvedBy = userId;
      comment.resolvedAt = Date.now();
    }
  });
}

export function lockNode(tenantId: string, userId: string, nodeId: string) {
  return mutateMetadata(tenantId, userId, (metadata) => {
    metadata.locks = metadata.locks || {};
    const existingLock = metadata.locks[nodeId];
    if (existingLock && existingLock.userId !== userId && Date.now() - existingLock.timestamp < 300000) {
      throw new ConflictError('Nó atualmente bloqueado por outro usuário.');
    }
    metadata.locks[nodeId] = { userId, timestamp: Date.now() };
  });
}

export function unlockNode(tenantId: string, userId: string, nodeId: string) {
  return mutateMetadata(tenantId, userId, (metadata) => {
    metadata.locks = metadata.locks || {};
    if (metadata.locks[nodeId]?.userId === userId) {
      delete metadata.locks[nodeId];
    }
  });
}
