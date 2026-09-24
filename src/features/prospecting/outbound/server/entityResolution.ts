// Wave 5 (CPI) — Entity Resolution & Deduplicação: impedir duplicidades e
// reconhecer quando dois registros são a mesma empresa, usando chaves fortes
// primeiro (CNPJ, domínio canonicalizado) e chaves fracas só como sinal
// secundário (nome normalizado) — nunca fundindo empresas diferentes só
// porque o nome é parecido, e nunca escolhendo um valor conflitante "no
// chute" quando duas fontes divergem.

export type MatchStrength = 'cnpj' | 'domain' | 'name';

export interface CompanyKey {
  cnpj?: string;
  domain?: string;
  normalizedName: string;
}

/** Remove protocolo, www e barra final; sempre em minúsculas. */
export function canonicalizeDomain(input?: string): string | undefined {
  if (!input) return undefined;
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0];
  return cleaned.length > 0 ? cleaned : undefined;
}

// Sufixos societários que não distinguem uma empresa de outra para fins de
// deduplicação (ex: "Jamef Transportes Ltda" e "Jamef Transportes S/A" devem
// normalizar para o mesmo nome-base).
const CORPORATE_SUFFIXES = [
  'ltda', 'ltda\\.', 's[\\/\\.]?a', 'eireli', 'me', 'epp', 'cia', 'companhia',
  'sa', 's\\.a\\.'
];
const CORPORATE_SUFFIX_RE = new RegExp(`\\b(${CORPORATE_SUFFIXES.join('|')})\\b`, 'gi');

/** Minúsculas, sem acento, sem sufixo societário, espaços colapsados. */
export function normalizeCompanyName(input?: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(CORPORATE_SUFFIX_RE, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCnpjDigits(input?: string): string | undefined {
  if (!input) return undefined;
  const digits = input.replace(/\D/g, '');
  return digits.length === 14 ? digits : undefined;
}

export function buildCompanyKey(fields: { cnpj?: string; domain?: string; name?: string }): CompanyKey {
  return {
    cnpj: normalizeCnpjDigits(fields.cnpj),
    domain: canonicalizeDomain(fields.domain),
    normalizedName: normalizeCompanyName(fields.name)
  };
}

export interface DuplicateMatch<T> {
  entry: T;
  matchedBy: MatchStrength;
}

/**
 * Procura um registro existente que seja a mesma empresa do candidato.
 * CNPJ confirmado tem prioridade sobre domínio, que tem prioridade sobre
 * nome normalizado (a chave mais fraca - nunca usada sozinha para *fundir*
 * identidades, só para sinalizar "provavelmente já prospectado").
 */
export function findDuplicate<T>(candidate: CompanyKey, existing: Array<{ key: CompanyKey; entry: T }>): DuplicateMatch<T> | null {
  if (candidate.cnpj) {
    const byCnpj = existing.find(e => e.key.cnpj && e.key.cnpj === candidate.cnpj);
    if (byCnpj) return { entry: byCnpj.entry, matchedBy: 'cnpj' };
  }
  if (candidate.domain) {
    const byDomain = existing.find(e => e.key.domain && e.key.domain === candidate.domain);
    if (byDomain) return { entry: byDomain.entry, matchedBy: 'domain' };
  }
  if (candidate.normalizedName) {
    const byName = existing.find(e => e.key.normalizedName && e.key.normalizedName === candidate.normalizedName);
    if (byName) return { entry: byName.entry, matchedBy: 'name' };
  }
  return null;
}

export type FieldResolutionStatus = 'matched' | 'conflicted' | 'unknown';

export interface FieldObservation<T> {
  value: T | null | undefined;
  source: string;
}

export interface FieldResolution<T> {
  value: T | null;
  status: FieldResolutionStatus;
  sources: string[];
}

/**
 * Resolve um campo observado por múltiplas fontes. Se todas as fontes com
 * valor concordam, devolve esse valor com status "matched". Se duas fontes
 * divergem, o valor final é `null` com status "conflicted" - a regra do
 * pacote CPI é explícita: "Nunca escolher aleatoriamente."
 */
export function resolveFieldConflict<T>(observations: Array<FieldObservation<T>>): FieldResolution<T> {
  const withValue = observations.filter((o): o is FieldObservation<T> & { value: T } => o.value !== null && o.value !== undefined && o.value !== ('' as unknown as T));

  if (withValue.length === 0) {
    return { value: null, status: 'unknown', sources: [] };
  }

  const distinctValues = new Set(withValue.map(o => JSON.stringify(o.value)));
  if (distinctValues.size > 1) {
    return { value: null, status: 'conflicted', sources: withValue.map(o => o.source) };
  }

  return { value: withValue[0].value, status: 'matched', sources: withValue.map(o => o.source) };
}
