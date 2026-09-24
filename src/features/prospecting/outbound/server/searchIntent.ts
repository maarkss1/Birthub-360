// Wave 1 (CPI) — Search Intent: representação estruturada e validada do pedido de
// busca do usuário, construída ANTES de chamar qualquer provider externo.
//
// Por que isso existe: a UI já expõe filtros estruturados (segmento, estado,
// cidade, raio, tipo de empresa, porte, faturamento, cargo do decisor), mas até
// aqui eles eram compactados em uma única string de texto livre antes de chegar
// ao backend — perdendo a distinção entre "o usuário pediu isso" e "isso é uma
// suposição embutida numa frase". SearchIntent devolve essa distinção.

export type QualityPreference = 'precision' | 'recall';

export interface SearchIntent {
  entity: 'company';
  // Texto usado para a busca por texto livre no Google Places. Sempre presente
  // (é obrigatório), mas pode ter sido montado a partir dos filtros estruturados
  // em vez de digitado pelo usuário — ver `freeTextQuerySource`.
  freeTextQuery: string;
  freeTextQuerySource: 'requested' | 'derived_from_filters';
  targetCount: number;
  location: {
    state?: string;
    city?: string;
    radiusKm?: number;
  };
  segment?: string;
  companyType?: string;
  employeeCount?: string;
  annualRevenue?: string;
  decisionMakerRole?: string;
  // Termos reais a enviar ao person_titles da busca de pessoas do Apollo (união
  // dos cargos marcados no combobox de múltipla escolha) - decisionMakerRole
  // acima é só o rótulo combinado para exibição/auditoria, não filtra a busca.
  decisionMakerTitles?: string[];
  tone?: string;
  // Quais campos estruturados o usuário de fato informou (via filtros da UI),
  // em vez de terem sido inferidos/derivados. Usado para auditoria e para não
  // tratar um filtro de busca como se fosse um atributo observado da empresa
  // (ver Wave 2 — Requirement Engine).
  requestedFields: string[];
}

interface RawSearchIntentInput {
  query?: unknown;
  limit?: unknown;
  segment?: unknown;
  region?: unknown;
  city?: unknown;
  radiusKm?: unknown;
  companyType?: unknown;
  employeeCount?: unknown;
  annualRevenue?: unknown;
  decisionMakerRole?: unknown;
  decisionMakerTitles?: unknown;
  tone?: unknown;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// Cargo mal formado no array não invalida a busca inteira - só é descartado.
function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = Array.from(new Set(
    value.map(v => asNonEmptyString(v)).filter((v): v is string => Boolean(v))
  )).slice(0, 30);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function parseSearchIntent(body: RawSearchIntentInput): SearchIntent {
  const query = asNonEmptyString(body.query);
  const segment = asNonEmptyString(body.segment);
  const region = asNonEmptyString(body.region);
  const city = asNonEmptyString(body.city);
  const companyType = asNonEmptyString(body.companyType);
  const employeeCount = asNonEmptyString(body.employeeCount);
  const annualRevenue = asNonEmptyString(body.annualRevenue);
  const decisionMakerRole = asNonEmptyString(body.decisionMakerRole);
  const decisionMakerTitles = asStringArray(body.decisionMakerTitles);
  const tone = asNonEmptyString(body.tone);

  // Preserva um radiusKm inválido (ex: negativo) em vez de descartá-lo em silêncio -
  // é o validator, não o parser, quem decide se o valor é aceitável.
  const radiusKmNum = Number(body.radiusKm);
  const radiusKm = body.radiusKm !== undefined && body.radiusKm !== null && Number.isFinite(radiusKmNum)
    ? radiusKmNum
    : undefined;

  const requestedFields: string[] = [];
  if (segment) requestedFields.push('segment');
  if (region) requestedFields.push('region');
  if (city) requestedFields.push('city');
  if (radiusKm) requestedFields.push('radiusKm');
  if (companyType) requestedFields.push('companyType');
  if (employeeCount) requestedFields.push('employeeCount');
  if (annualRevenue) requestedFields.push('annualRevenue');
  if (decisionMakerRole) requestedFields.push('decisionMakerRole');
  if (query) requestedFields.push('query');

  const derivedQuery = [segment, city, region, companyType].filter(Boolean).join(' ');

  const limitNum = Number(body.limit);
  const targetCount = Math.min(Math.max(1, Number.isFinite(limitNum) ? limitNum : 3), 10);

  return {
    entity: 'company',
    freeTextQuery: query || derivedQuery,
    freeTextQuerySource: query ? 'requested' : 'derived_from_filters',
    targetCount,
    location: { state: region, city, radiusKm },
    segment,
    companyType,
    employeeCount,
    annualRevenue,
    decisionMakerRole,
    decisionMakerTitles,
    tone,
    requestedFields
  };
}

export interface SearchIntentValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSearchIntent(intent: SearchIntent): SearchIntentValidationResult {
  const errors: string[] = [];

  if (!intent.freeTextQuery || intent.freeTextQuery.trim().length === 0) {
    errors.push('Informe ao menos um critério de busca: segmento, cidade/estado ou um texto de busca.');
  }

  if (!Number.isFinite(intent.targetCount) || intent.targetCount < 1) {
    errors.push('targetCount (limite de leads) precisa ser um número maior ou igual a 1.');
  }

  if (intent.location.radiusKm !== undefined && intent.location.radiusKm <= 0) {
    errors.push('O raio de busca (radiusKm), quando informado, precisa ser maior que zero.');
  }

  return { valid: errors.length === 0, errors };
}
