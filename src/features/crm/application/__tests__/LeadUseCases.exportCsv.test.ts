import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Lead } from '../../domain/Lead';

/**
 * `exportLeadsCsv` é o formato que alimenta a importação/atualização manual no Bitrix24 — o
 * próprio código documenta duas correções reais de mapeamento de coluna (cols[85]/[88]/[89]/[90]/[91]
 * estavam duplicando o valor de outro campo). Estes testes travam essas correções e o
 * comportamento de escaping de CSV para não regredir silenciosamente.
 */
vi.mock('../../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { LeadUseCases } = await import('../LeadUseCases');

function makeLead(overrides: Record<string, unknown> = {}): Lead {
  return {
    id: 'lead-1',
    status: 'Custom_Status_Sem_Mapeamento',
    funnel: 'Lead',
    title: null,
    amount: null,
    currency: 'BRL',
    probability: null,
    expectedCloseAt: null,
    customFields: null,
    pipelineId: null,
    pipelineStageId: null,
    source: null,
    channel: null,
    temperature: null,
    score: null,
    owner: null,
    lastInteraction: null,
    nextAction: null,
    closedAt: null,
    companyId: null,
    contactId: null,
    organizationId: 'org-1',
    pic: null,
    qualification: null,
    resumeDate: null,
    cadenceStage: null,
    lossReason: null,
    dealPackage: null,
    dealStatus: null,
    relationshipLevel: null,
    commissionPercent: null,
    partnerBroker: null,
    qualificationValidatedByAM: null,
    bitrixLeadId: null,
    bitrixDealId: null,
    bitrixStageLabel: null,
    bitrixSyncStatus: null,
    bitrixSyncError: null,
    bitrixSyncedAt: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  } as unknown as Lead;
}

function makeUseCases(leads: Lead[]) {
  const repository = {
    findAllForExport: vi.fn().mockResolvedValue(leads),
  };
  return new LeadUseCases(repository as never);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('LeadUseCases.exportLeadsCsv', () => {
  it('emite só o cabeçalho quando não há leads', async () => {
    const useCases = makeUseCases([]);
    const csv = await useCases.exportLeadsCsv('org-1');
    const lines = csv.split('\n');

    expect(lines).toHaveLength(1);
    expect(lines[0].startsWith('ID;Nome;Saudação;')).toBe(true);
  });

  it('cada linha tem o mesmo número de colunas que o cabeçalho', async () => {
    const useCases = makeUseCases([makeLead()]);
    const csv = await useCases.exportLeadsCsv('org-1');
    const [header, row] = csv.split('\n');

    expect(row.split(';')).toHaveLength(header.split(';').length);
  });

  it('preenche o ID na coluna 0 para permitir update em vez de duplicar no Bitrix24', async () => {
    const useCases = makeUseCases([makeLead({ id: 'lead-abc-123' })]);
    const csv = await useCases.exportLeadsCsv('org-1');
    const row = csv.split('\n')[1].split(';');

    expect(row[0]).toBe('lead-abc-123');
  });

  it('separa nome do contato em primeiro/último nome corretamente', async () => {
    const useCases = makeUseCases([makeLead({ contact: { name: 'Maria Clara Souza Lima' } })]);
    const csv = await useCases.exportLeadsCsv('org-1');
    const row = csv.split('\n')[1].split(';');

    expect(row[3]).toBe('Maria'); // Primeiro nome
    expect(row[4]).toBe('Clara Souza Lima'); // Sobrenome
    expect(row[6]).toBe('Maria Clara Souza Lima'); // Nome completo
  });

  it('usa telefone/linkedin da empresa quando o contato não tem', async () => {
    const useCases = makeUseCases([
      makeLead({
        contact: { name: 'Ana', phone: null, linkedin: null },
        company: { phones: ['11999998888'], linkedin: 'linkedin.com/company/acme' },
      }),
    ]);
    const csv = await useCases.exportLeadsCsv('org-1');
    const row = csv.split('\n')[1].split(';');

    expect(row[16]).toBe('11999998888'); // Telefone de trabalho
    expect(row[95]).toBe('linkedin.com/company/acme'); // Linkedin
  });

  it('mapeia os campos de qualificação nas colunas corrigidas (CORREÇÃO documentada no código)', async () => {
    const useCases = makeUseCases([
      makeLead({
        qualification: {
          fornecedorGR: 'Seguradora XPTO',
          possuiGR: 'Sim',
          possuiSoftwareLogistico: 'Não',
          softwareLogisticoAtual: 'TMS Legado',
          possuiCadastroMotorista: 'Sim',
          cadastroAtual: 'Sistema Interno',
        },
      }),
    ]);
    const csv = await useCases.exportLeadsCsv('org-1');
    const row = csv.split('\n')[1].split(';');

    // cols[85] deve ser 'Fornecedor de GR Atual', não mais um duplicado de 'possuiGR'.
    expect(row[85]).toBe('Seguradora XPTO');
    expect(row[86]).toBe('Sim');
    expect(row[88]).toBe('Não');
    expect(row[89]).toBe('TMS Legado');
    expect(row[90]).toBe('Sim');
    expect(row[91]).toBe('Sistema Interno');
  });

  it('escapa valores com ponto-e-vírgula, aspas e quebra de linha (delimitador do CSV é ";")', async () => {
    const useCases = makeUseCases([
      makeLead({ company: { observations: 'Cliente "grande"; atenção\nfollow-up semanal' } }),
    ]);
    const csv = await useCases.exportLeadsCsv('org-1');
    const row = csv.split('\n');
    // A linha com quebra interna faz split('\n') gerar mais de 2 elementos — junte de volta a
    // partir da segunda linha pra obter a linha de dados completa.
    const dataLine = row.slice(1).join('\n');

    expect(dataLine).toContain('"Cliente ""grande""; atenção\nfollow-up semanal"');
  });

  it('não escapa valores simples sem caracteres especiais', async () => {
    const useCases = makeUseCases([makeLead({ source: 'Indicação' })]);
    const csv = await useCases.exportLeadsCsv('org-1');
    const row = csv.split('\n')[1].split(';');

    expect(row[54]).toBe('Indicação');
  });

  it('usa string vazia para campos ausentes em vez de "null"/"undefined" literal', async () => {
    const useCases = makeUseCases([makeLead()]);
    const csv = await useCases.exportLeadsCsv('org-1');
    const row = csv.split('\n')[1].split(';');

    expect(row[3]).toBe('');
    expect(row).not.toContain('null');
    expect(row).not.toContain('undefined');
  });
});
