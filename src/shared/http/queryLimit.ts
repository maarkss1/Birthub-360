/**
 * CRM-010: `GET /api/leads`, `/api/contacts` e `/api/companies` aceitavam (e cada um limitava) o
 * `limit` de paginação de forma ad hoc e duplicada — mesmo tendo hoje convergido para o mesmo
 * valor (`Math.min(parseInt(...) || 50, 200)` repetido em `LeadController`, `ContactController` e
 * `CompanyController`), a duplicação por si só é a classe de bug: nada garante que os três
 * continuem em sincronia na próxima mudança. Este helper centraliza o cap para que os três
 * call sites fiquem literalmente idênticos.
 *
 * Evidência: docs/audits/repository-debt-audit/agents/CRM.md (CRM-010).
 */
export const MAX_QUERY_LIMIT = 200;
export const DEFAULT_QUERY_LIMIT = 50;

/**
 * Interpreta o `limit` de uma query string HTTP (`req.query.limit`, tipicamente
 * `string | string[] | undefined` no Express) e devolve sempre um inteiro positivo, nunca maior
 * que `MAX_QUERY_LIMIT` — protege contra custo de query irrestrito (ex.: `?limit=999999`) e
 * contra valores inválidos/ausentes, que caem no padrão `DEFAULT_QUERY_LIMIT`.
 */
export function clampQueryLimit(rawLimit: unknown): number {
  const value = typeof rawLimit === 'string' ? rawLimit : undefined;
  const parsed = value !== undefined ? parseInt(value, 10) : NaN;
  const withDefault = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_QUERY_LIMIT;
  return Math.min(withDefault, MAX_QUERY_LIMIT);
}
