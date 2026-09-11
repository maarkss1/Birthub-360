/**
 * Cobre `requirementEngine.ts`: dado um `SearchIntent` (o que foi PEDIDO) e um `ProspectCandidate`
 * (o que foi OBSERVADO), prova que `evaluateCandidateRequirements` nunca trata um critério apenas
 * pedido como se fosse confirmado — a fabricação sutil que este motor existe para evitar.
 */
import { describe, it, expect } from 'vitest';
import {
  buildRequirementsFromSearchIntent,
  evaluateCandidateRequirements,
} from '../requirementEngine.js';
import type { SearchIntent } from '../searchIntent.js';
import type { ProspectCandidate } from '../prospectTypes.js';

function baseIntent(overrides: Partial<SearchIntent> = {}): SearchIntent {
  return {
    segment: 'Transportadora',
    freeTextTerms: [],
    location: { label: 'Rio de Janeiro e Região', excluded: [], isCitySpecific: false },
    firmographics: {
      technologiesInclude: [],
      technologiesExclude: [],
      publicCompanyOnly: false,
    },
    needsFirmographicFiltering: false,
    decisionMakerTitles: [],
    needsDecisionMakerContacts: false,
    quantityRequested: 20,
    excludeNames: [],
    ...overrides,
  };
}

function baseCandidate(overrides: Partial<ProspectCandidate> = {}): ProspectCandidate {
  return {
    tradeName: 'Transportadora Exemplo',
    legalNameGuess: null,
    cnpjGuess: null,
    segment: 'Transportadora',
    size: 'Não informado',
    location: 'Niterói, RJ',
    fitScoreEstimate: 70,
    suggestedContact: null,
    rationale: 'Encontrado via Google Places',
    ...overrides,
  };
}

function evalFor(evaluations: ReturnType<typeof evaluateCandidateRequirements>, criterion: string) {
  return evaluations.find((e) => e.criterion === criterion);
}

describe('buildRequirementsFromSearchIntent', () => {
  it('só gera requisito para critérios realmente pedidos', () => {
    const requirements = buildRequirementsFromSearchIntent(baseIntent());
    expect(requirements.map((r) => r.criterion)).toEqual(['segment']);
  });

  it('inclui estado quando informado', () => {
    const requirements = buildRequirementsFromSearchIntent(
      baseIntent({ location: { label: 'RJ', state: 'RJ', excluded: [], isCitySpecific: false } }),
    );
    expect(requirements.map((r) => r.criterion)).toEqual(['segment', 'state']);
  });

  it('inclui cidade só quando isCitySpecific é true', () => {
    const requirements = buildRequirementsFromSearchIntent(
      baseIntent({
        location: {
          label: 'Niterói, RJ',
          city: 'Niterói',
          state: 'RJ',
          excluded: [],
          isCitySpecific: true,
        },
      }),
    );
    expect(requirements.map((r) => r.criterion)).toContain('city');
  });

  it('classifica segmento/estado/cidade como HARD_FILTER e faturamento/tecnologia como SOFT_FILTER', () => {
    const requirements = buildRequirementsFromSearchIntent(
      baseIntent({
        firmographics: {
          annualRevenueMin: 100_000,
          technologiesInclude: ['sap'],
          technologiesExclude: [],
          publicCompanyOnly: false,
        },
      }),
    );
    expect(requirements.find((r) => r.criterion === 'segment')?.type).toBe('HARD_FILTER');
    expect(requirements.find((r) => r.criterion === 'annualRevenue')?.type).toBe('SOFT_FILTER');
    expect(requirements.find((r) => r.criterion === 'technologies')?.type).toBe('SOFT_FILTER');
  });

  it('classifica cargo do decisor como ENRICHMENT, só quando needsDecisionMakerContacts', () => {
    const requirements = buildRequirementsFromSearchIntent(
      baseIntent({
        decisionMakerTitles: ['Diretor de Logística'],
        needsDecisionMakerContacts: true,
      }),
    );
    expect(requirements.find((r) => r.criterion === 'decisionMakerTitles')?.type).toBe(
      'ENRICHMENT',
    );
  });
});

describe('evaluateCandidateRequirements — segmento (a própria fabricação que o motor evita)', () => {
  it('NUNCA marca segmento como confirmado quando o candidato só ecoou o segmento pedido (Google Places/Nominatim)', () => {
    const candidate = baseCandidate({
      segment: 'Transportadora',
      segmentObserved: false,
      source: 'googlePlaces',
    });
    const evaluation = evalFor(evaluateCandidateRequirements(baseIntent(), candidate), 'segment');
    expect(evaluation?.status).toBe('unknown');
    expect(evaluation?.observed).toBeNull();
  });

  it('marca segmento como confirmado quando a Apollo devolveu uma industry real que bate com o pedido', () => {
    const candidate = baseCandidate({
      segment: 'Transportation/Trucking/Railroad',
      segmentObserved: true,
      source: 'apollo',
    });
    const evaluation = evalFor(
      evaluateCandidateRequirements(baseIntent({ segment: 'Transportation' }), candidate),
      'segment',
    );
    expect(evaluation?.status).toBe('matched');
    expect(evaluation?.source).toBe('apollo');
  });

  it('marca segmento como divergente quando a Apollo confirma uma industry real que NÃO bate com o pedido', () => {
    const candidate = baseCandidate({
      segment: 'Software',
      segmentObserved: true,
      source: 'apollo',
    });
    const evaluation = evalFor(
      evaluateCandidateRequirements(baseIntent({ segment: 'Transportadora' }), candidate),
      'segment',
    );
    expect(evaluation?.status).toBe('unmatched');
  });
});

describe('evaluateCandidateRequirements — localização', () => {
  it('confirma estado quando bate com a localização observada do candidato', () => {
    const candidate = baseCandidate({ location: 'Niterói, RJ', source: 'googlePlaces' });
    const evaluation = evalFor(
      evaluateCandidateRequirements(
        baseIntent({ location: { label: 'RJ', state: 'RJ', excluded: [], isCitySpecific: false } }),
        candidate,
      ),
      'state',
    );
    expect(evaluation?.status).toBe('matched');
  });

  it('marca como divergente quando o estado observado não bate com o pedido', () => {
    const candidate = baseCandidate({ location: 'Curitiba, PR', source: 'googlePlaces' });
    const evaluation = evalFor(
      evaluateCandidateRequirements(
        baseIntent({ location: { label: 'RJ', state: 'RJ', excluded: [], isCitySpecific: false } }),
        candidate,
      ),
      'state',
    );
    expect(evaluation?.status).toBe('unmatched');
  });
});

describe('evaluateCandidateRequirements — faixas numéricas (faturamento/ano de fundação)', () => {
  it('SOFT_FILTER de faturamento fica unknown sem dado observado (candidato sem annualRevenue)', () => {
    const candidate = baseCandidate();
    const evaluation = evalFor(
      evaluateCandidateRequirements(
        baseIntent({
          firmographics: {
            annualRevenueMin: 1_000_000,
            technologiesInclude: [],
            technologiesExclude: [],
            publicCompanyOnly: false,
          },
        }),
        candidate,
      ),
      'annualRevenue',
    );
    expect(evaluation?.status).toBe('unknown');
  });

  it('marca como matched quando o faturamento observado está dentro da faixa pedida', () => {
    const candidate = baseCandidate({ annualRevenue: 2_000_000, source: 'apollo' });
    const evaluation = evalFor(
      evaluateCandidateRequirements(
        baseIntent({
          firmographics: {
            annualRevenueMin: 1_000_000,
            annualRevenueMax: 5_000_000,
            technologiesInclude: [],
            technologiesExclude: [],
            publicCompanyOnly: false,
          },
        }),
        candidate,
      ),
      'annualRevenue',
    );
    expect(evaluation?.status).toBe('matched');
  });

  it('marca como unmatched quando o faturamento observado está fora da faixa pedida', () => {
    const candidate = baseCandidate({ annualRevenue: 500_000, source: 'apollo' });
    const evaluation = evalFor(
      evaluateCandidateRequirements(
        baseIntent({
          firmographics: {
            annualRevenueMin: 1_000_000,
            technologiesInclude: [],
            technologiesExclude: [],
            publicCompanyOnly: false,
          },
        }),
        candidate,
      ),
      'annualRevenue',
    );
    expect(evaluation?.status).toBe('unmatched');
  });
});

describe('evaluateCandidateRequirements — cargo do decisor (ENRICHMENT)', () => {
  it('unknown quando nenhum decisor foi encontrado', () => {
    const candidate = baseCandidate();
    const evaluation = evalFor(
      evaluateCandidateRequirements(
        baseIntent({
          decisionMakerTitles: ['Diretor de Logística'],
          needsDecisionMakerContacts: true,
        }),
        candidate,
      ),
      'decisionMakerTitles',
    );
    expect(evaluation?.status).toBe('unknown');
  });

  it('matched quando um decisor encontrado tem cargo compatível com o pedido', () => {
    const candidate = baseCandidate({
      source: 'apollo',
      decisionMakers: [
        {
          name: 'Fulano',
          title: 'Diretor de Logística',
          email: null,
          phone: null,
          linkedinUrl: null,
        },
      ],
    });
    const evaluation = evalFor(
      evaluateCandidateRequirements(
        baseIntent({
          decisionMakerTitles: ['Diretor de Logística'],
          needsDecisionMakerContacts: true,
        }),
        candidate,
      ),
      'decisionMakerTitles',
    );
    expect(evaluation?.status).toBe('matched');
  });
});
