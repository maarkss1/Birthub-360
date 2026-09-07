import { api } from '../../lib/api';

/**
 * Tipos espelhados de `src/features/intelligence/agents/commercialAgentRegistry.ts` (backend) —
 * não importados diretamente: este arquivo roda no bundle do frontend (Vite), e aquele módulo
 * backend não deveria ser puxado para o browser. Se o shape do registro mudar, atualize os dois
 * lados (mesmo padrão já usado em `contractSignature.agent.ts`/`churnRetention.agent.ts` para
 * evitar import cross-feature no backend).
 */
export type CommercialAgentStatus =
  | 'REAL_EM_PRODUCAO'
  | 'NOVO_SOBRE_SERVICO_REAL'
  | 'NOVO_FONTE_PARCIAL'
  | 'MAPEADO_NAO_IMPLEMENTADO';

export type CommercialAgentRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CommercialAgentDefinition {
  id: string;
  name: string;
  role: string;
  layer: 'sales' | 'management' | 'executive' | 'control';
  status: CommercialAgentStatus;
  risk: CommercialAgentRisk;
  requiresApproval: boolean;
  mission: string;
  capabilities: string[];
  handoffs: string[];
  bindings: string[];
  agentModule: string | null;
}

export const commercialAgentCellApi = {
  list: () => api.get<CommercialAgentDefinition[]>('/api/agent/commercial-cell'),
};
