export interface HandoffNode {
  id: string;
  fromAgent: string;
  toAgent: string;
  wave: number;
  status: 'aberto' | 'em-andamento' | 'resolvido';
  priority: 'bloqueador' | 'alto' | 'normal';
}

export interface OwnershipConflict {
  filePath: string;
  claimedByAgents: string[];
}

export class WaveHandoffGraphService {
  /**
   * Valida se existem sobreposições de propriedade de arquivos entre especialistas.
   */
  detectOwnershipConflicts(agentFileMap: Record<string, string[]>): OwnershipConflict[] {
    const fileOwnersMap = new Map<string, string[]>();

    for (const [agent, files] of Object.entries(agentFileMap)) {
      for (const file of files) {
        const existing = fileOwnersMap.get(file) || [];
        fileOwnersMap.set(file, [...existing, agent]);
      }
    }

    const conflicts: OwnershipConflict[] = [];
    for (const [filePath, agents] of fileOwnersMap.entries()) {
      if (agents.length > 1) {
        conflicts.push({
          filePath,
          claimedByAgents: agents,
        });
      }
    }

    return conflicts;
  }

  /**
   * Verifica se a onda possui handoffs bloqueadores pendentes.
   */
  hasBlockingHandoffs(handoffs: HandoffNode[], waveNumber: number): { blocked: boolean; blockingHandoffs: HandoffNode[] } {
    const blocking = handoffs.filter(
      (h) => h.wave === waveNumber && h.priority === 'bloqueador' && h.status !== 'resolvido'
    );

    return {
      blocked: blocking.length > 0,
      blockingHandoffs: blocking,
    };
  }
}

export const waveHandoffGraphService = new WaveHandoffGraphService();
