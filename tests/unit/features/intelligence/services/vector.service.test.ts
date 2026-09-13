import { beforeEach, describe, expect, it, vi } from 'vitest';

// AIAGENT-009 (onda 6): `VectorService.ingestDocument` era código morto — `@deprecated`, lançava
// exceção incondicional desde RAG-001 e nunca teve chamador. Foi REMOVIDO nesta onda.
//
// A classe NÃO foi apagada (ao contrário do que a auditoria sugeriu): `searchSimilar` tem chamador
// real em produção (`sdrOutboundDraft.agent.ts`, que redige e-mails de SDR), e delega para o
// pipeline real da Base de Conhecimento. Este arquivo trava as duas metades dessa decisão: o método
// morto não volta, e o caminho vivo continua delegando.

const hybridSearch = vi.fn();

vi.mock('../../../../../src/features/knowledge/search.service.js', () => ({
  searchService: { hybridSearch: (...args: unknown[]) => hybridSearch(...args) },
}));

import { VectorService, vectorService } from '@/features/intelligence/services/vector.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VectorService (AIAGENT-009)', () => {
  it('não expõe mais ingestDocument — o método morto não pode voltar sem quebrar este teste', () => {
    expect('ingestDocument' in vectorService).toBe(false);
    expect(
      (vectorService as unknown as Record<string, unknown>).ingestDocument,
    ).toBeUndefined();
    expect(
      (VectorService.prototype as unknown as Record<string, unknown>).ingestDocument,
    ).toBeUndefined();
  });

  it('searchSimilar continua vivo e delega para o pipeline real da Base de Conhecimento', async () => {
    hybridSearch.mockResolvedValue({
      hits: [
        {
          chunkId: 'c1',
          content: 'trecho semântico',
          documentId: 'd1',
          documentTitle: 'Playbook',
          chunkIndex: 0,
          matchedBy: 'embedding',
          similarity: 0.9,
        },
      ],
    });

    const result = await vectorService.searchSimilar('objeção de preço', 'org-1', 3, 0.5);

    expect(hybridSearch).toHaveBeenCalledWith('org-1', 'objeção de preço', 6);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
    // distance = 1 - similarity, semântica original de "distância máxima aceitável".
    expect(result[0].distance).toBeCloseTo(0.1);
  });

  it('sem organizationId não consulta nada — nunca busca sem escopo de tenant', async () => {
    const result = await vectorService.searchSimilar('qualquer coisa', '');

    expect(result).toEqual([]);
    expect(hybridSearch).not.toHaveBeenCalled();
  });
});
