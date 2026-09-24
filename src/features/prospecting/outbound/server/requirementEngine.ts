// Wave 2 (CPI) — Requirement Engine: classifica cada critério do SearchIntent
// (Wave 1) numa semântica operacional e avalia contra o que foi de fato
// OBSERVADO no lead — nunca contra o que o usuário apenas pediu.
//
// Por que isso existe: até aqui, um filtro de busca (ex: "funcionários: 201 a
// 500") era copiado direto para o campo correspondente do lead encontrado,
// como se a Places/CNPJ/Apollo tivessem confirmado aquele dado para aquela
// empresa específica. Isso transforma um filtro solicitado em um atributo
// observado - exatamente a fabricação sutil que a Wave 0 documentou como
// risco residual e que o pacote CPI proíbe explicitamente ("Nunca transformar
// filtro solicitado pelo usuário em atributo observado da empresa").

import type { SearchIntent } from './searchIntent';
import type { RequirementType, RequirementStatus, RequirementEvaluation, UnknownHardFilterPolicy } from '../src/types';

export type { RequirementType, RequirementStatus, UnknownHardFilterPolicy, RequirementEvaluation } from '../src/types';

// Política para quando um HARD_FILTER não pode ser confirmado nem negado
// (nenhum provider disponível informou o dado observado):
// - conservative: trata como reprovado (exclui o lead);
// - balanced (padrão): mantém o lead, mas com o requisito marcado como pendente;
// - broad: mantém o lead, sinalizando a incerteza sem penalizar a exclusão.

export interface Requirement {
  criterion: string;
  type: RequirementType;
  expected: string | number;
  weight: number;
}

/**
 * Constrói os requisitos a partir do SearchIntent (Wave 1). A classificação
 * segue os exemplos do próprio pacote CPI:
 * - segmento/localização são HARD_FILTER (definem a entidade e onde procurar,
 *   como "transportadora" e "estado = MG" nos exemplos do pacote);
 * - porte/faturamento são SOFT_FILTER: são faixas aproximadas que hoje nenhum
 *   provider confirma com precisão (análogo a "faturamento alto" no exemplo),
 *   então tratá-los como obrigatórios excluiria praticamente todo lead;
 * - cargo do decisor é ENRICHMENT (buscar, não filtrar a empresa por isso -
 *   é exatamente o exemplo "e-mail do diretor → ENRICHMENT" do pacote).
 */
export function buildRequirementsFromSearchIntent(intent: SearchIntent): Requirement[] {
  const requirements: Requirement[] = [];

  if (intent.segment) {
    requirements.push({ criterion: 'segment', type: 'HARD_FILTER', expected: intent.segment, weight: 3 });
  }
  if (intent.location.state) {
    requirements.push({ criterion: 'region', type: 'HARD_FILTER', expected: intent.location.state, weight: 3 });
  }
  if (intent.location.city) {
    requirements.push({ criterion: 'city', type: 'HARD_FILTER', expected: intent.location.city, weight: 2 });
  }
  if (intent.companyType) {
    requirements.push({ criterion: 'companyType', type: 'SOFT_FILTER', expected: intent.companyType, weight: 1 });
  }
  if (intent.employeeCount) {
    requirements.push({ criterion: 'employeeCount', type: 'SOFT_FILTER', expected: intent.employeeCount, weight: 1 });
  }
  if (intent.annualRevenue) {
    requirements.push({ criterion: 'annualRevenue', type: 'SOFT_FILTER', expected: intent.annualRevenue, weight: 1 });
  }
  if (intent.decisionMakerRole) {
    requirements.push({ criterion: 'decisionMakerRole', type: 'ENRICHMENT', expected: intent.decisionMakerRole, weight: 1 });
  }

  return requirements;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function textMatches(expected: string, observed: string): boolean {
  const e = normalize(expected);
  const o = normalize(observed);
  return o.includes(e) || e.includes(o);
}

/**
 * Avalia um requisito contra o valor observado (real, vindo de um provider) -
 * nunca contra o valor pedido. `observed` deve ser `undefined`/`null` quando
 * nenhuma fonte confirmou o dado para este lead específico.
 */
export function evaluateRequirement(
  req: Requirement,
  observed: string | number | null | undefined,
  source: string,
  opts?: { unknownHardFilterPolicy?: UnknownHardFilterPolicy }
): RequirementEvaluation {
  const policy = opts?.unknownHardFilterPolicy || 'balanced';

  if (observed === undefined || observed === null || observed === '') {
    const isHard = req.type === 'HARD_FILTER';
    const status: RequirementStatus = isHard && policy === 'conservative' ? 'unmatched' : 'unknown';
    return {
      criterion: req.criterion,
      type: req.type,
      expected: req.expected,
      observed: null,
      status,
      source: 'none',
      reason: isHard
        ? `Nenhum provider confirmou "${req.criterion}" para este lead (política: ${policy}).`
        : `Nenhum provider confirmou "${req.criterion}" para este lead.`,
      weight: req.weight
    };
  }

  const matches = typeof req.expected === 'string' && typeof observed === 'string'
    ? textMatches(req.expected, observed)
    : req.expected === observed;

  return {
    criterion: req.criterion,
    type: req.type,
    expected: req.expected,
    observed,
    status: matches ? 'matched' : 'unmatched',
    source,
    reason: matches
      ? `"${req.criterion}" observado (${source}) corresponde ao solicitado.`
      : `"${req.criterion}" observado (${source}) diverge do solicitado.`,
    weight: req.weight
  };
}

export function evaluateRequirements(
  requirements: Requirement[],
  observedByCriterion: Record<string, string | number | null | undefined>,
  observedSourceByCriterion: Record<string, string>,
  opts?: { unknownHardFilterPolicy?: UnknownHardFilterPolicy }
): RequirementEvaluation[] {
  return requirements.map(req =>
    evaluateRequirement(
      req,
      observedByCriterion[req.criterion],
      observedSourceByCriterion[req.criterion] || 'unknown_source',
      opts
    )
  );
}

/**
 * Um lead só é excluído automaticamente quando um HARD_FILTER foi observado e
 * NÃO corresponde (nunca por falta de dado, exceto sob a política 'conservative').
 * EXCLUSION nunca é gerado por este engine hoje (ver dedupe de leads já
 * prospectados no pipeline) - o tipo existe no schema para uso futuro.
 */
export function shouldExcludeLead(evaluations: RequirementEvaluation[]): boolean {
  return evaluations.some(e => e.type === 'HARD_FILTER' && e.status === 'unmatched');
}
