// IA & Guardrails (CPI follow-up) — "SAÍDA ESTRUTURADA: Usar schema
// validation. Tratar JSON inválido." Todo provedor de IA usado em
// server/ai.ts é instruído a responder em JSON, mas nenhum deles garante a
// forma da resposta - um LLM pode devolver JSON sintaticamente inválido, ou
// um objeto com o formato errado (chave ausente, tipo errado, array onde
// esperávamos string). Este módulo garante que nenhuma dessas falhas vaze
// como dado real para o usuário: JSON inválido ou fora do formato esperado
// nunca é usado como está - ou é descartado campo a campo (com o texto
// determinístico de fallback no lugar), ou o motor inteiro é tratado como
// indisponível (mesma via de fallback que uma falha de rede já usa).

// Forma "achatada" (não uma union discriminada) de propósito: este tsconfig
// não liga `strict`/`strictNullChecks`, e sem eles o TypeScript não estreita
// (narrow) de forma confiável uma union discriminada por `ok: true/false`
// após um `if (!x.ok)` - `value`/`error` ficariam inacessíveis mesmo dentro
// do branch correto. Manter os dois campos sempre presentes (um deles `null`)
// evita depender desse narrowing.
export interface JsonParseResult {
  ok: boolean;
  value: unknown;
  error: string | null;
}

/**
 * `JSON.parse` que nunca lança - converte uma resposta de LLM sintaticamente
 * inválida em um resultado tipado que o chamador trata explicitamente, em vez
 * de deixar a exceção subir e potencialmente derrubar a rota.
 */
export function safeParseJson(text: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(text), error: null };
  } catch (err: any) {
    return { ok: false, value: null, error: err?.message || 'JSON inválido' };
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// Chaves de texto livre que os prompts de copy pedem ao LLM. Mantido em sync
// manual com OutreachCopies (src/types.ts) - um campo aqui que não exista lá
// simplesmente não é usado por formatParsedCopies, e um campo de
// OutreachCopies fora daqui nunca é populado por resposta de IA (só por
// fallback determinístico).
export const COPIES_STRING_FIELDS = [
  'cold_call',
  'cold_email',
  'whatsapp',
  'linkedin',
  'followup_strategy',
  'objection_matrix',
  'qualification_matrix',
  'ice_breaker',
  'approach_prompt'
] as const;

export type CopiesStringField = (typeof COPIES_STRING_FIELDS)[number];

export interface CopiesShapeValidation {
  // true só quando o valor é um objeto e TODO campo presente nele é uma
  // string não vazia - isto é, nada de errado foi encontrado (campos
  // simplesmente ausentes não contam como erro; a IA não é obrigada a
  // preencher todos os campos, o fallback determinístico cobre o resto).
  valid: boolean;
  // Só os campos que passaram na validação de tipo - nunca um valor bruto
  // não checado. É isto que o chamador deve usar.
  validFields: Partial<Record<CopiesStringField, string>>;
  // Nome dos campos presentes na resposta mas com tipo/forma errada
  // (ex: veio um objeto ou número em vez de string) - descartados, nunca
  // coagidos para string.
  invalidFields: string[];
}

/**
 * Valida a forma de uma resposta de "copies" (cold_call/cold_email/...) vinda
 * de um LLM. Nunca lança - uma resposta com root que não é objeto (ex: array,
 * string solta, null) devolve `valid: false` e `validFields: {}`, deixando o
 * chamador cair no fallback determinístico inteiro.
 */
export function validateCopiesShape(parsed: unknown): CopiesShapeValidation {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, validFields: {}, invalidFields: ['<root>'] };
  }

  const obj = parsed as Record<string, unknown>;
  const validFields: Partial<Record<CopiesStringField, string>> = {};
  const invalidFields: string[] = [];

  for (const field of COPIES_STRING_FIELDS) {
    if (!(field in obj)) continue;
    const value = obj[field];
    if (isNonEmptyString(value)) {
      validFields[field] = value;
    } else {
      invalidFields.push(field);
    }
  }

  return { valid: invalidFields.length === 0, validFields, invalidFields };
}

export interface NewsItemShapeResult {
  validItems: Array<{ title: string; source: string; date: string; snippet: string; url?: string; relevance: string }>;
  droppedCount: number;
}

/**
 * Cada item de `recent_news` precisa ter pelo menos title/source como string
 * não vazia para ser aceito como notícia real - um item malformado é
 * descartado individualmente (nunca derruba o dossiê inteiro por causa de um
 * item ruim, nem é passado adiante coagido).
 */
export function sanitizeNewsItems(value: unknown): NewsItemShapeResult {
  if (!Array.isArray(value)) {
    return { validItems: [], droppedCount: 0 };
  }
  const validItems: NewsItemShapeResult['validItems'] = [];
  let droppedCount = 0;
  for (const item of value) {
    if (
      typeof item === 'object' &&
      item !== null &&
      isNonEmptyString((item as any).title) &&
      isNonEmptyString((item as any).source)
    ) {
      validItems.push({
        title: (item as any).title,
        source: (item as any).source,
        date: isNonEmptyString((item as any).date) ? (item as any).date : '',
        snippet: isNonEmptyString((item as any).snippet) ? (item as any).snippet : '',
        url: isNonEmptyString((item as any).url) ? (item as any).url : undefined,
        relevance: isNonEmptyString((item as any).relevance) ? (item as any).relevance : ''
      });
    } else {
      droppedCount++;
    }
  }
  return { validItems, droppedCount };
}

export interface EnrichmentShapeValidation {
  valid: boolean;
  newsDossier: {
    company_overview: string;
    recent_news: NewsItemShapeResult['validItems'];
    decision_maker_insights: string;
    commercial_hooks: string[];
  } | null;
  copies: CopiesShapeValidation | null;
  errors: string[];
}

/**
 * Valida a forma completa da resposta de `enrichLeadWithPublicNewsAndScripts`
 * (news_dossier + copies). `valid: false` significa "esta resposta não tem a
 * estrutura mínima para ser usada" - o chamador trata isso como falha do
 * motor (mesmo caminho de fallback de uma falha de rede), nunca grava dado
 * parcialmente inválido como se fosse o dossiê real.
 */
export function validateEnrichmentShape(parsed: unknown): EnrichmentShapeValidation {
  const errors: string[] = [];

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, newsDossier: null, copies: null, errors: ['resposta não é um objeto JSON'] };
  }

  const obj = parsed as Record<string, unknown>;
  const rawDossier = obj.news_dossier;
  const rawCopies = obj.copies;

  if (typeof rawDossier !== 'object' || rawDossier === null || Array.isArray(rawDossier)) {
    errors.push('news_dossier ausente ou não é objeto');
  }
  if (typeof rawCopies !== 'object' || rawCopies === null || Array.isArray(rawCopies)) {
    errors.push('copies ausente ou não é objeto');
  }

  if (errors.length > 0) {
    return { valid: false, newsDossier: null, copies: null, errors };
  }

  const dossierObj = rawDossier as Record<string, unknown>;
  const { validItems, droppedCount } = sanitizeNewsItems(dossierObj.recent_news);
  if (droppedCount > 0) {
    errors.push(`news_dossier.recent_news continha ${droppedCount} item(ns) malformado(s), descartado(s)`);
  }

  const commercialHooks = Array.isArray(dossierObj.commercial_hooks)
    ? dossierObj.commercial_hooks.filter(isNonEmptyString)
    : [];
  if (Array.isArray(dossierObj.commercial_hooks) && commercialHooks.length !== dossierObj.commercial_hooks.length) {
    errors.push('news_dossier.commercial_hooks continha item(ns) não-string, descartado(s)');
  }

  const copiesValidation = validateCopiesShape(rawCopies);
  if (!copiesValidation.valid) {
    errors.push(`copies com campo(s) de forma inválida: ${copiesValidation.invalidFields.join(', ')}`);
  }

  return {
    valid: true,
    newsDossier: {
      company_overview: isNonEmptyString(dossierObj.company_overview) ? dossierObj.company_overview : '',
      recent_news: validItems,
      decision_maker_insights: isNonEmptyString(dossierObj.decision_maker_insights) ? dossierObj.decision_maker_insights : '',
      commercial_hooks: commercialHooks
    },
    copies: copiesValidation,
    errors
  };
}
