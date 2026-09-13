import type { Company } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  buildCachedEnrichmentResult,
  isEnrichmentFresh,
} from '@/features/prospecting/services/enrichment.service';

// ACH-05-04 (auditoria 2026-09-11, agente 05): enrichment.service.ts (846L, o orquestrador mais
// complexo do domínio de prospecção) não tinha nenhum teste dedicado. Este arquivo cobre as duas
// partes explicitamente puras/testáveis sem Prisma real: isEnrichmentFresh (decide se pula um novo
// enriquecimento pago) e buildCachedEnrichmentResult (monta o resultado do caminho de cache),
// deixando runEnrichment (o pipeline com I/O real) fora do escopo deste item.

function buildCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'comp-1',
    organizationId: 'org-1',
    tradeName: 'Transportadora Exemplo',
    legalName: 'Transportadora Exemplo LTDA',
    cnpj: null,
    status: 'Ativo',
    situacaoCadastral: null,
    naturezaJuridica: null,
    capitalSocial: null,
    dataAbertura: null,
    cnae: null,
    segment: null,
    size: null,
    employeeCount: null,
    address: null,
    city: null,
    state: null,
    zipCode: null,
    phones: [],
    emails: [],
    qsa: null,
    website: null,
    googleRating: null,
    googleReviewsCount: null,
    businessHours: null,
    observations: null,
    linkedin: null,
    twitter: null,
    facebook: null,
    technologies: [],
    keywords: [],
    logoUrl: null,
    apolloOrgId: null,
    newsMentions: null,
    lookalikeScore: null,
    lookalikeTopMatches: null,
    enrichmentStatus: 'Não enriquecido',
    enrichedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  } as unknown as Company;
}

describe('isEnrichmentFresh', () => {
  const now = new Date('2026-09-11T12:00:00Z');
  const ttlMs = 24 * 60 * 60 * 1000; // 24h, igual ao default documentado

  it('não é fresca quando enrichmentStatus não é "Enriquecido"', () => {
    const company = { enrichmentStatus: 'Enriquecendo', enrichedAt: now };
    expect(isEnrichmentFresh(company, now, ttlMs)).toBe(false);
  });

  it('não é fresca quando enrichedAt é null, mesmo com status "Enriquecido"', () => {
    const company = { enrichmentStatus: 'Enriquecido', enrichedAt: null };
    expect(isEnrichmentFresh(company, now, ttlMs)).toBe(false);
  });

  it('é fresca quando enriquecida dentro do TTL', () => {
    const enrichedAt = new Date(now.getTime() - ttlMs / 2); // 12h atrás
    const company = { enrichmentStatus: 'Enriquecido', enrichedAt };
    expect(isEnrichmentFresh(company, now, ttlMs)).toBe(true);
  });

  it('não é mais fresca depois que o TTL expira', () => {
    const enrichedAt = new Date(now.getTime() - ttlMs - 1); // 1ms além do TTL
    const company = { enrichmentStatus: 'Enriquecido', enrichedAt };
    expect(isEnrichmentFresh(company, now, ttlMs)).toBe(false);
  });

  it('no limite exato do TTL, já não é mais fresca (comparação estrita)', () => {
    const enrichedAt = new Date(now.getTime() - ttlMs);
    const company = { enrichmentStatus: 'Enriquecido', enrichedAt };
    expect(isEnrichmentFresh(company, now, ttlMs)).toBe(false);
  });
});

describe('buildCachedEnrichmentResult', () => {
  it('monta o resultado a partir só do que já está persistido, sem domainGuess/apolloContacts novos', () => {
    const company = buildCompany({
      status: 'Em_analise',
      situacaoCadastral: 'ATIVA',
      capitalSocial: 200_000,
      employeeCount: 60,
      segment: 'Transporte',
      city: 'São Paulo',
      state: 'SP',
      technologies: ['SAP Business One'],
      lookalikeScore: null,
      lookalikeTopMatches: null,
    });

    const result = buildCachedEnrichmentResult(company, {});

    expect(result.cached).toBe(true);
    expect(result.domainGuess).toBeNull();
    expect(result.apolloContacts).toEqual([]);
    // status Prisma "Em_analise" -> label de domínio "Em análise" (fromPrismaCompanyStatus)
    expect(result.company.status).toBe('Em análise');
    expect(result.company.id).toBe('comp-1');
  });

  it('recalcula o fit score determinístico a partir dos campos persistidos + options do chamador', () => {
    const company = buildCompany({
      situacaoCadastral: 'ATIVA',
      capitalSocial: 200_000,
      employeeCount: 60,
      state: 'SP',
      technologies: ['SAP Business One'],
    });

    const result = buildCachedEnrichmentResult(company, {
      segmentKeywords: ['Transporte'],
      fleetSizeHint: 'Acima de 50 veículos',
    });

    // ATIVA(+30) + capital>=100k(+20) + funcionários>=50(+20) + base(25) = 95. fleetSizeHint/state/
    // technologies não somam mais pontos — ACH-05-07 (bônus de frota/região/ERP-TMS logístico) foi
    // removido depois que a unificação de playbook comercial em 'geral' tirou a única forma de
    // saber se a organização era do vertical de logística (ver fitScore.ts).
    expect(result.fit.score).toBe(95);
    expect(result.fit.temperature).toBe('Quente');
  });

  it('lookalike vem null quando a empresa nunca teve um lookalikeScore gravado', () => {
    const company = buildCompany({ lookalikeScore: null, lookalikeTopMatches: null });

    const result = buildCachedEnrichmentResult(company, {});

    expect(result.lookalike).toBeNull();
  });

  it('lookalike reaproveita score/matches já persistidos sem recalcular embedding', () => {
    const matches = [{ companyId: 'comp-2', score: 0.9, tradeName: 'Similar LTDA' }];
    const company = buildCompany({
      lookalikeScore: 0.87,
      lookalikeTopMatches: matches as unknown as Company['lookalikeTopMatches'],
    });

    const result = buildCachedEnrichmentResult(company, {});

    expect(result.lookalike).toEqual({ score: 0.87, matches });
  });
});
