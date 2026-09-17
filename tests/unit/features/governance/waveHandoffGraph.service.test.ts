import { describe, expect, it } from 'vitest';
import { WaveHandoffGraphService } from '../../../../src/features/governance/services/waveHandoffGraph.service.js';

describe('WaveHandoffGraphService (Agente 00)', () => {
  it('detecta conflitos de sobreposição de propriedade de arquivos entre especialistas', () => {
    const service = new WaveHandoffGraphService();
    const map = {
      '01': ['prisma/schema.prisma', 'src/lib/prisma.ts'],
      '06': ['src/features/integrations/bitrix/service/extraction.ts', 'src/lib/prisma.ts'], // Conflito no prisma.ts
    };

    const conflicts = service.detectOwnershipConflicts(map);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].filePath).toBe('src/lib/prisma.ts');
    expect(conflicts[0].claimedByAgents).toEqual(['01', '06']);
  });

  it('bloqueia avanço da onda se houver handoff bloqueador aberto', () => {
    const service = new WaveHandoffGraphService();
    const handoffs = [
      {
        id: 'h1',
        fromAgent: '06',
        toAgent: '01',
        wave: 2,
        status: 'aberto' as const,
        priority: 'bloqueador' as const,
      },
    ];

    const result = service.hasBlockingHandoffs(handoffs, 2);
    expect(result.blocked).toBe(true);
    expect(result.blockingHandoffs).toHaveLength(1);
  });
});
