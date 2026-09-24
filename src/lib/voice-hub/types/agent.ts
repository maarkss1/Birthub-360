import { KnowledgeDocument } from '../../lib/voice-runtime/intelligence/KnowledgeConfidenceEngine.js';

/**
 * Shape of the Agent.configuration Prisma `Json` field.
 * This blob is a free-form, per-agent settings bag (template, persona, provider
 * settings, etc.) merged incrementally via agentService.updateAgentConfig, so it
 * intentionally keeps an index signature for arbitrary keys — but fields we
 * actually read/write elsewhere (like `knowledge`) get a real type.
 */
export interface AgentConfiguration {
  knowledge?: KnowledgeDocument[];
  [key: string]: unknown;
}
