import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRM-001: garante que o índice `leads` do Meilisearch mantém `title` e `tags` como atributos
// pesquisáveis. Sem isso, a busca full-text de Lead ignora esses campos silenciosamente mesmo com
// o Meilisearch saudável (o fallback Postgres nunca é alcançado nesse caminho).
// Evidência: docs/audits/repository-debt-audit/agents/CRM.md (CRM-001).

const indexHandles = new Map<string, { updateFilterableAttributes: ReturnType<typeof vi.fn>; updateSearchableAttributes: ReturnType<typeof vi.fn> }>();

function getOrCreateIndexHandle(name: string) {
  let handle = indexHandles.get(name);
  if (!handle) {
    handle = {
      updateFilterableAttributes: vi.fn(async () => undefined),
      updateSearchableAttributes: vi.fn(async () => undefined),
    };
    indexHandles.set(name, handle);
  }
  return handle;
}

vi.mock('meilisearch', () => ({
  Meilisearch: class {
    createIndex = vi.fn(async () => undefined);
    index(name: string) {
      return getOrCreateIndexHandle(name);
    }
  },
}));

vi.mock('../../../src/config/env.js', () => ({
  env: { MEILI_MASTER_KEY: 'test-key', MEILI_HOST: 'http://localhost:7700', NODE_ENV: 'test' },
}));

vi.mock('../../../src/lib/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), fatal: vi.fn() },
}));

describe('Meilisearch leads index configuration (CRM-001)', () => {
  beforeEach(() => {
    indexHandles.clear();
    vi.clearAllMocks();
  });

  it('inclui title e tags nos searchableAttributes do índice leads', async () => {
    const { initMeiliIndexes } = await import('../../../src/lib/search/index.js');
    await initMeiliIndexes();

    const leadsHandle = getOrCreateIndexHandle('leads');
    expect(leadsHandle.updateSearchableAttributes).toHaveBeenCalledTimes(1);
    const searchableAttributes = leadsHandle.updateSearchableAttributes.mock.calls[0][0];

    expect(searchableAttributes).toContain('title');
    expect(searchableAttributes).toContain('tags');
    expect(searchableAttributes).toEqual(
      expect.arrayContaining(['title', 'company.tradeName', 'contact.name', 'contact.email', 'tags']),
    );
  });
});
