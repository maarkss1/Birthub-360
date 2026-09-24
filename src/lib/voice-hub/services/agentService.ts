import * as agentRepository from '../repositories/agentRepository.js';
import { AgentConfiguration } from '../types/agent.js';

export function listAgents(tenantId: string) {
  return agentRepository.listAgentsForTenant(tenantId);
}

export function getAgent(id: string, tenantId: string) {
  return agentRepository.getAgent(id, tenantId);
}

export function createAgent(tenantId: string, userId: string, data: { name: string; model: string; configuration?: unknown }) {
  return agentRepository.createAgent(tenantId, userId, data);
}

export async function updateAgentConfig(id: string, tenantId: string, configData: Partial<AgentConfiguration>) {
  const existing = await agentRepository.getAgent(id, tenantId);
  if (!existing) throw new Error('Agente não encontrado.');

  const currentConfig = (existing.configuration as unknown as AgentConfiguration) || {};
  const mergedConfig: AgentConfiguration = { ...currentConfig, ...configData };

  await agentRepository.updateAgent(id, tenantId, { configuration: mergedConfig });
  return agentRepository.getAgent(id, tenantId);
}

export function deleteAgent(id: string, tenantId: string) {
  return agentRepository.deleteAgentForTenant(id, tenantId);
}
