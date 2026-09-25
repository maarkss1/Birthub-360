import * as agentRepository from '../repositories/agentRepository';
import { AgentConfiguration } from '../types/agent';

export function listAgents(organizationId: string) {
  return agentRepository.listAgentsForTenant(organizationId);
}

export function getAgent(id: string, organizationId: string) {
  return agentRepository.getAgent(id, organizationId);
}

export function createAgent(organizationId: string, userId: string, data: { name: string; model: string; configuration?: unknown }) {
  return agentRepository.createAgent(organizationId, userId, data);
}

export async function updateAgentConfig(id: string, organizationId: string, configData: Partial<AgentConfiguration>) {
  const existing = await agentRepository.getAgent(id, organizationId);
  if (!existing) throw new Error('Agente não encontrado.');

  const currentConfig = (existing.configuration as unknown as AgentConfiguration) || {};
  const mergedConfig: AgentConfiguration = { ...currentConfig, ...configData };

  await agentRepository.updateAgent(id, organizationId, { configuration: mergedConfig });
  return agentRepository.getAgent(id, organizationId);
}

export function deleteAgent(id: string, organizationId: string) {
  return agentRepository.deleteAgentForTenant(id, organizationId);
}
