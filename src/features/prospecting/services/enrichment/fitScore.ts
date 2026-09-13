import type { PlaybookKey } from '../../../../config/playbooks.js';

export interface ScoreBreakdownItem {
  label: string;
  points: number;
  detail: string;
}

export interface FitScoreResult {
  score: number;
  temperature: 'Quente' | 'Morno' | 'Frio';
  breakdown: ScoreBreakdownItem[];
}

export interface FitScoreInput {
  situacaoCadastral?: string | null;
  capitalSocial?: number | null;
  employeeCountEstimate?: number | null;
  size?: string | null;
  cnaeDescription?: string | null;
  segmentKeywords?: string[];
  /**
   * `segment`/`city`/`state`/`fleetSizeHint`/`technologies`/`activePlaybook` abaixo não entram
   * mais no cálculo do score. ACH-05-07 tentava usá-los para bonificar critérios específicos do
   * playbook de risco de carga/logística (frota, região de roubo, categoria de carga, ERP/TMS),
   * mas a unificação de playbook comercial em `'geral'` (decisão do usuário, ver CLAUDE.md seção
   * 1) removeu a única forma de saber se uma organização era desse vertical — manter esses pontos
   * numa avaliação universal contrariaria o próprio motivo do ACH-05-07: "CRM multi-tenant não
   * pode amarrar o produto a um vertical". Campos mantidos na interface (não removidos) só para
   * não quebrar os chamadores que ainda os preenchem (`enrichment.service.ts`,
   * `fitScoreCalibration.ts`) — se um score configurável por organização for implementado no
   * futuro, é aqui que ele entraria de novo.
   */
  segment?: string | null;
  city?: string | null;
  state?: string | null;
  fleetSizeHint?: string | null;
  technologies?: string[] | null;
  activePlaybook?: PlaybookKey;
}

/** Score de fit determinístico e auditável — cada critério é real (dado da Receita) e explicado. */
export function computeFitScore(input: FitScoreInput): FitScoreResult {
  const breakdown: ScoreBreakdownItem[] = [];
  let score = 0;

  if (input.situacaoCadastral) {
    if (input.situacaoCadastral.toUpperCase() === 'ATIVA') {
      score += 30;
      breakdown.push({
        label: 'Situação cadastral',
        points: 30,
        detail: 'CNPJ ativo na Receita Federal',
      });
    } else {
      score -= 40;
      breakdown.push({
        label: 'Situação cadastral',
        points: -40,
        detail: `CNPJ com situação "${input.situacaoCadastral}" — risco alto`,
      });
    }
  }

  if (input.capitalSocial != null) {
    if (input.capitalSocial >= 100000) {
      score += 20;
      breakdown.push({
        label: 'Capital social',
        points: 20,
        detail: 'Capital social >= R$ 100 mil',
      });
    } else if (input.capitalSocial >= 10000) {
      score += 10;
      breakdown.push({
        label: 'Capital social',
        points: 10,
        detail: 'Capital social entre R$ 10 mil e R$ 100 mil',
      });
    } else {
      breakdown.push({
        label: 'Capital social',
        points: 0,
        detail: 'Capital social baixo (< R$ 10 mil)',
      });
    }
  }

  if (input.employeeCountEstimate != null) {
    if (input.employeeCountEstimate >= 50) {
      score += 20;
      breakdown.push({
        label: 'Porte estimado',
        points: 20,
        detail: 'Estimativa de 50+ funcionários',
      });
    } else if (input.employeeCountEstimate >= 10) {
      score += 12;
      breakdown.push({
        label: 'Porte estimado',
        points: 12,
        detail: 'Estimativa de 10-49 funcionários',
      });
    } else {
      score += 5;
      breakdown.push({
        label: 'Porte estimado',
        points: 5,
        detail: 'Estimativa de 1-9 funcionários',
      });
    }
  }

  if (input.segmentKeywords?.length && input.cnaeDescription) {
    const desc = input.cnaeDescription.toLowerCase();
    const matched = input.segmentKeywords.some((k) => desc.includes(k.toLowerCase()));
    if (matched) {
      score += 25;
      breakdown.push({
        label: 'Aderência de CNAE ao ICP',
        points: 25,
        detail: `Atividade "${input.cnaeDescription}" combina com o segmento buscado`,
      });
    } else {
      breakdown.push({
        label: 'Aderência de CNAE ao ICP',
        points: 0,
        detail: `Atividade "${input.cnaeDescription}" não confirma o segmento buscado`,
      });
    }
  }

  score = Math.max(0, Math.min(100, score + 25)); // 25 pontos base de participação no funil

  const temperature: FitScoreResult['temperature'] =
    score >= 75 ? 'Quente' : score >= 45 ? 'Morno' : 'Frio';

  return { score, temperature, breakdown };
}
