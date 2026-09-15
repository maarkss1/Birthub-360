import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Itens 9/12 (Inteligência de Dados & Enriquecimento): antes desta mudança, `scanCompanyNews`
 * criava exatamente UM `AccountSignal` por scan, sempre `type: 'news_mention'`, a partir só da
 * menção mais recente. Agora classifica CADA menção nova (`classifySignalType`,
 * `accountSignalTaxonomy.ts`) e cria um signal por menção — estes testes travam esse
 * comportamento novo, e confirmam que nenhuma menção é fabricada quando a busca não encontra nada
 * (mesma garantia que já existia antes).
 */
const companyFindUnique = vi.fn();
const companyUpdate = vi.fn();
const accountSignalCreate = vi.fn();
const searchCompanyNews = vi.fn();

vi.mock('../../prisma.js', () => ({
  prisma: {
    company: {
      findUnique: (...args: unknown[]) => companyFindUnique(...args),
      update: (...args: unknown[]) => companyUpdate(...args),
    },
    accountSignal: {
      create: (...args: unknown[]) => accountSignalCreate(...args),
    },
  },
}));
vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../../features/prospecting/services/news.service.js', () => ({
  searchCompanyNews: (...args: unknown[]) => searchCompanyNews(...args),
}));
vi.mock('bullmq', () => ({
  Queue: class {
    on() {}
  },
  Worker: class {
    on() {}
  },
}));
vi.mock('./deadLetter.js', () => ({ isFinalAttempt: vi.fn(), recordDeadLetter: vi.fn() }));
vi.mock('./redis.js', () => ({ connection: {} }));

const { requestContext } = await import('../../async-context.js');
const { scanCompanyNews } = await import('../newsMonitor.worker');

afterEach(() => {
  vi.clearAllMocks();
});

const baseCompany = {
  id: 'company-1',
  tradeName: 'Acme',
  legalName: 'Acme LTDA',
  newsMentions: [],
};

describe('scanCompanyNews', () => {
  it('não cria nenhum signal quando não há menção real (nunca fabrica notícia)', async () => {
    companyFindUnique.mockResolvedValue(baseCompany);
    searchCompanyNews.mockResolvedValue([]);

    await scanCompanyNews({
      companyId: 'company-1',
      organizationId: 'org-1',
    });

    expect(accountSignalCreate).not.toHaveBeenCalled();
    expect(companyUpdate).not.toHaveBeenCalled();
  });

  it('classifica cada menção nova e cria um AccountSignal por menção, com o rótulo certo no título', async () => {
    companyFindUnique.mockResolvedValue(baseCompany);
    searchCompanyNews.mockResolvedValue([
      { title: 'Acme capta R$ 30 milhões em rodada Série B', url: 'https://a/1', domain: 'a.com' },
      { title: 'Acme anuncia novo CEO', url: 'https://a/2', domain: 'a.com' },
      { title: 'Acme participa de feira do setor', url: 'https://a/3', domain: 'a.com' },
    ]);

    await scanCompanyNews({
      companyId: 'company-1',
      organizationId: 'org-1',
    });

    expect(accountSignalCreate).toHaveBeenCalledTimes(3);
    expect(accountSignalCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        type: 'funding_round',
        title: 'Rodada de investimento',
        taxonomyVersion: 'v2',
        dedupeKey: 'news:company-1:https://a/1',
      }),
    });
    expect(accountSignalCreate).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ type: 'executive_change', title: 'Troca de executivo' }),
    });
    expect(accountSignalCreate).toHaveBeenNthCalledWith(3, {
      data: expect.objectContaining({ type: 'news_mention', title: 'Menção em notícia' }),
    });
  });

  it('ignora menções já conhecidas (por URL) e só cria signal pras novas', async () => {
    companyFindUnique.mockResolvedValue({
      ...baseCompany,
      newsMentions: [{ url: 'https://a/1', title: 'já visto', domain: 'a.com', seenAt: '' }],
    });
    searchCompanyNews.mockResolvedValue([
      { title: 'já visto', url: 'https://a/1', domain: 'a.com' },
      { title: 'Acme abre vagas em processo seletivo', url: 'https://a/2', domain: 'a.com' },
    ]);

    await scanCompanyNews({
      companyId: 'company-1',
      organizationId: 'org-1',
    });

    expect(accountSignalCreate).toHaveBeenCalledTimes(1);
    expect(accountSignalCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'mass_hiring', dedupeKey: 'news:company-1:https://a/2' }),
    });
  });

  it('roda com o tenantId da organização no requestContext', async () => {
    let tenantIdDuranteBusca: string | undefined;
    companyFindUnique.mockImplementation(async () => {
      tenantIdDuranteBusca = requestContext.getStore()?.tenantId;
      return baseCompany;
    });
    searchCompanyNews.mockResolvedValue([]);

    await scanCompanyNews({
      companyId: 'company-1',
      organizationId: 'org-1',
    });

    expect(tenantIdDuranteBusca).toBe('org-1');
  });
});
