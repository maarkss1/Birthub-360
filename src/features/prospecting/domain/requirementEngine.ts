import type { SearchIntent } from './searchIntent.js';
import type { ProspectCandidate, RequirementEvaluation } from './prospectTypes.js';

/**
 * Requirement Engine — avalia, por critério pedido numa busca (`SearchIntent`), se o que foi
 * OBSERVADO de verdade num candidato (por um provider real: Apollo/Google Places/Nominatim)
 * confirma, contradiz, ou não confirma nem contradiz aquele critério.
 *
 * Por que isso existe: sem esta camada, um filtro de busca (ex: "segmento: Transportadora",
 * "estado: MG") corre o risco de ser tratado, na tela de resultado, como se já fosse um FATO
 * confirmado sobre a empresa encontrada — quando na verdade só foi o que o vendedor PEDIU. Essa é
 * a mesma classe de risco (filtro solicitado virando atributo observado) documentada nos
 * comentários de `services/enrichment/fitScoreCalibration.ts` e no dossiê CPI deste módulo. Este
 * motor não decide inclusão/exclusão de candidato — `prospecting/discovery.ts` continua trazendo
 * todos os candidatos que os providers devolverem — só anota, por critério, o que é observado e o
 * que é apenas o pedido, para a UI (`CandidateCard.tsx`) mostrar com honestidade "por que este lead
 * apareceu".
 */

export type RequirementType = 'HARD_FILTER' | 'SOFT_FILTER' | 'ENRICHMENT';
export type RequirementStatus = 'matched' | 'unmatched' | 'unknown';

interface Requirement {
  criterion: string;
  label: string;
  type: RequirementType;
  expected: string;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function textMatches(expected: string, observed: string): boolean {
  const e = normalize(expected);
  const o = normalize(observed);
  if (!e || !o) return false;
  return o.includes(e) || e.includes(o);
}

function evaluateText(
  req: Requirement,
  observed: string | null,
  source: RequirementEvaluation['source'],
): RequirementEvaluation {
  if (!observed) {
    return {
      criterion: req.criterion,
      label: req.label,
      type: req.type,
      expected: req.expected,
      observed: null,
      status: 'unknown',
      source: 'none',
      reason: `Nenhum provider confirmou "${req.label.toLowerCase()}" para este candidato.`,
    };
  }

  const matches = textMatches(req.expected, observed);
  return {
    criterion: req.criterion,
    label: req.label,
    type: req.type,
    expected: req.expected,
    observed,
    status: matches ? 'matched' : 'unmatched',
    source,
    reason: matches
      ? `"${req.label}" observado (${source}) corresponde ao solicitado.`
      : `"${req.label}" observado (${source}) diverge do solicitado.`,
  };
}

/** Igual a `evaluateText`, mas o "match" é "algum dos observados aparece em algum dos pedidos" —
 * usado para tecnologias e cargos de decisor, onde tanto o pedido quanto o observado são listas. */
function evaluateListOverlap(
  req: Requirement,
  expectedList: string[],
  observedList: string[],
  source: RequirementEvaluation['source'],
): RequirementEvaluation {
  if (observedList.length === 0) {
    return {
      criterion: req.criterion,
      label: req.label,
      type: req.type,
      expected: req.expected,
      observed: null,
      status: 'unknown',
      source: 'none',
      reason: `Nenhum provider confirmou "${req.label.toLowerCase()}" para este candidato.`,
    };
  }

  const matches = expectedList.some((exp) => observedList.some((obs) => textMatches(exp, obs)));
  const observed = observedList.join(', ');
  return {
    criterion: req.criterion,
    label: req.label,
    type: req.type,
    expected: req.expected,
    observed,
    status: matches ? 'matched' : 'unmatched',
    source,
    reason: matches
      ? `"${req.label}" observado (${source}) corresponde ao solicitado.`
      : `"${req.label}" observado (${source}) não bate com o pedido, mas o candidato tem dado real para este critério.`,
  };
}

/** Avalia uma faixa numérica (faturamento, ano de fundação) contra um valor observado real —
 * `matched` quando dentro da faixa pedida, `unmatched` quando fora dela, `unknown` sem dado
 * observado. Nunca usa `textMatches` aqui: comparar string livre contra faixa não faz sentido. */
function evaluateNumericRange(
  req: Requirement,
  min: number | undefined,
  max: number | undefined,
  observedValue: number | null | undefined,
  source: RequirementEvaluation['source'],
): RequirementEvaluation {
  if (observedValue == null) {
    return {
      criterion: req.criterion,
      label: req.label,
      type: req.type,
      expected: req.expected,
      observed: null,
      status: 'unknown',
      source: 'none',
      reason: `Nenhum provider confirmou "${req.label.toLowerCase()}" para este candidato.`,
    };
  }

  const withinMin = min == null || observedValue >= min;
  const withinMax = max == null || observedValue <= max;
  const matches = withinMin && withinMax;
  return {
    criterion: req.criterion,
    label: req.label,
    type: req.type,
    expected: req.expected,
    observed: String(observedValue),
    status: matches ? 'matched' : 'unmatched',
    source,
    reason: matches
      ? `"${req.label}" observado (${source}, ${observedValue}) está dentro da faixa pedida.`
      : `"${req.label}" observado (${source}, ${observedValue}) está fora da faixa pedida.`,
  };
}

/**
 * Constrói os requisitos a partir do `SearchIntent` — só os critérios que a busca realmente pediu
 * (campos vazios/undefined não viram requisito, não há sentido em avaliar "o que não foi pedido").
 *
 * Classificação (mesmo raciocínio do pacote CPI original):
 * - segmento/estado/cidade são HARD_FILTER: definem a entidade e onde procurar;
 * - faturamento/ano de fundação/tecnologias são SOFT_FILTER: faixas aproximadas que hoje só a
 *   Apollo confirma com algum grau de precisão — tratá-los como obrigatórios excluiria
 *   candidatos vindos de Google Places/Nominatim, que nunca trazem esse dado;
 * - cargo do decisor é ENRICHMENT: buscar, não filtrar a empresa por isso.
 */
export function buildRequirementsFromSearchIntent(intent: SearchIntent): Requirement[] {
  const requirements: Requirement[] = [];

  if (intent.segment) {
    requirements.push({
      criterion: 'segment',
      label: 'Segmento',
      type: 'HARD_FILTER',
      expected: intent.segment,
    });
  }
  if (intent.location.state) {
    requirements.push({
      criterion: 'state',
      label: 'Estado',
      type: 'HARD_FILTER',
      expected: intent.location.state,
    });
  }
  if (intent.location.isCitySpecific && intent.location.city) {
    requirements.push({
      criterion: 'city',
      label: 'Cidade',
      type: 'HARD_FILTER',
      expected: intent.location.city,
    });
  }
  const { annualRevenueMin, annualRevenueMax, foundedYearMin, foundedYearMax, technologiesInclude } =
    intent.firmographics;
  if (annualRevenueMin != null || annualRevenueMax != null) {
    requirements.push({
      criterion: 'annualRevenue',
      label: 'Faturamento anual',
      type: 'SOFT_FILTER',
      expected: [
        annualRevenueMin != null ? `mín. US$ ${annualRevenueMin.toLocaleString('en-US')}` : null,
        annualRevenueMax != null ? `máx. US$ ${annualRevenueMax.toLocaleString('en-US')}` : null,
      ]
        .filter(Boolean)
        .join(' / '),
    });
  }
  if (foundedYearMin != null || foundedYearMax != null) {
    requirements.push({
      criterion: 'foundedYear',
      label: 'Ano de fundação',
      type: 'SOFT_FILTER',
      expected: [
        foundedYearMin != null ? `a partir de ${foundedYearMin}` : null,
        foundedYearMax != null ? `até ${foundedYearMax}` : null,
      ]
        .filter(Boolean)
        .join(' / '),
    });
  }
  if (technologiesInclude.length > 0) {
    requirements.push({
      criterion: 'technologies',
      label: 'Tecnologias',
      type: 'SOFT_FILTER',
      expected: technologiesInclude.join(', '),
    });
  }
  if (intent.needsDecisionMakerContacts && intent.decisionMakerTitles.length > 0) {
    requirements.push({
      criterion: 'decisionMakerTitles',
      label: 'Cargo do decisor',
      type: 'ENRICHMENT',
      expected: intent.decisionMakerTitles.join(', '),
    });
  }

  return requirements;
}

/**
 * Ponto de entrada usado por `discoverCandidates` — combina `buildRequirementsFromSearchIntent`
 * com a extração dos valores realmente OBSERVADOS em `candidate` (nunca o valor pedido) e devolve
 * a avaliação pronta para a UI. Chamado depois de `enrichCandidatesWithQualityData`, quando o
 * candidato já tem o máximo de dado real que a busca vai trazer.
 */
export function evaluateCandidateRequirements(
  intent: SearchIntent,
  candidate: ProspectCandidate,
): RequirementEvaluation[] {
  const requirements = buildRequirementsFromSearchIntent(intent);
  const source = candidate.source ?? 'none';

  return requirements.map((req) => {
    switch (req.criterion) {
      case 'segment':
        // Só trata `candidate.segment` como observado quando `segmentObserved` confirma que veio
        // de uma classificação de indústria real do provider — não do critério pedido ecoado (ver
        // comentário de `segmentObserved` em prospectTypes.ts).
        return evaluateText(req, candidate.segmentObserved ? candidate.segment : null, source);
      case 'state':
      case 'city':
        // `candidate.location` é a geografia real devolvida pelo provider (com fallback à
        // localização pedida só quando o provider não informa nada) — aceito aqui como aproximação
        // honesta o bastante, mesma limitação documentada para `location` em `discovery.ts`.
        return evaluateText(req, candidate.location || null, source);
      case 'annualRevenue':
        return evaluateNumericRange(
          req,
          intent.firmographics.annualRevenueMin,
          intent.firmographics.annualRevenueMax,
          candidate.annualRevenue,
          source,
        );
      case 'foundedYear':
        return evaluateNumericRange(
          req,
          intent.firmographics.foundedYearMin,
          intent.firmographics.foundedYearMax,
          candidate.foundedYear,
          source,
        );
      case 'technologies':
        return evaluateListOverlap(
          req,
          intent.firmographics.technologiesInclude,
          candidate.technologies ?? [],
          source,
        );
      case 'decisionMakerTitles':
        return evaluateListOverlap(
          req,
          intent.decisionMakerTitles,
          (candidate.decisionMakers ?? []).map((dm) => dm.title).filter((t): t is string => !!t),
          source,
        );
      default:
        // Exaustividade: TypeScript aponta aqui se um novo `criterion` for adicionado em
        // `buildRequirementsFromSearchIntent` sem um `case` correspondente.
        return evaluateText(req, null, 'none');
    }
  });
}
