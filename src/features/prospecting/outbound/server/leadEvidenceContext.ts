// IA & Guardrails (CPI follow-up, pós Wave 0) — 18_AGENTE_IA_GUARDRAILS.txt:
// "Use exclusivamente fatos presentes no LeadEvidenceContext. Se uma
// informação não estiver presente, não mencione. Nunca crie estatísticas,
// notícias, nomes, cargos ou eventos. Quando não houver personalização
// factual suficiente, produza abordagem genérica e marque
// `personalization_level = low`."
//
// Este módulo é o `LeadEvidenceContext` citado pela especificação (não existia
// como tipo literal no código antes desta wave). Ele NUNCA lê o resultado de
// um provedor de IA - só monta, a partir de dados já confirmados no próprio
// backend, o subconjunto de fatos que é seguro entregar a um prompt como se
// fossem verdade. Qualquer coisa fora daqui (campo ausente, avaliação
// 'unmatched'/'unknown', evidência 'unverified'/'inferred'/'conflicted') fica
// de fora por construção - o prompt não tem como "ver" o que não está aqui.

import type { DecisionMaker, Lead, NewsItem } from '../src/types';
import type { EvidenceRecord } from './evidence';

export type PersonalizationLevel = 'low' | 'medium' | 'high';

export interface LeadEvidenceContext {
  leadId: string;
  // Nome e endereço são o próprio registro do lead (dado observado
  // diretamente na fonte de descoberta, ex: Google Places), não uma inferência
  // de IA - por isso ficam num "tier" à parte de confirmedFacts, sempre
  // presentes quando existem, nunca sujeitos ao filtro matched/verified abaixo.
  companyName: string;
  companyAddress?: string;
  // Só chegam aqui: (a) critérios da Wave 2 (`requirement_evaluations`) com
  // status === 'matched' (o que foi de fato OBSERVADO bater com o pedido -
  // ver server/requirementEngine.ts), ou (b) evidência da Wave 6
  // (`EvidenceRecord[]`, ver server/evidence.ts) com
  // verificationStatus === 'verified'. 'unmatched'/'unknown'/'excluded' e
  // 'unverified'/'inferred'/'conflicted'/'unknown' NUNCA entram aqui.
  confirmedFacts: Record<string, string>;
  // Presente só quando a Apollo de fato retornou um decisor real para este
  // lead (Wave 0 já garante que decision_makers nunca é preenchido com
  // fallback fabricado - ver docs/CPI_BACKLOG.md Wave 0, item 4). O dado é
  // reportado por uma fonte real, mesmo que e-mail/telefone dessa pessoa
  // ainda não tenham sido verificados de forma independente
  // (verificationStatus 'unverified' em evidence.ts) - "reportado por fonte
  // real" não é a mesma coisa que "inventado pela IA", que é o que a regra
  // anti-fabricação proíbe.
  decisionMaker?: { name: string; title?: string };
  // Só notícias reais já obtidas e gravadas em lead.news_dossier.recent_news.
  // A Wave 0 já garante que este array só é populado com notícia real e
  // verificável (nunca simulada) - ver server/ai.ts.
  newsItems: NewsItem[];
}

function isUsableValue(value: unknown): value is string | number {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

/**
 * Monta o LeadEvidenceContext de um lead: só o que é seguro afirmar como fato
 * confirmado a um prompt de geração de copy. `storedEvidence` é opcional -
 * quando o chamador não tiver ido buscar `getFieldEvidence` no banco, o
 * contexto ainda funciona (só fica sem os campos que dependeriam dela),
 * nunca lança erro por falta desse parâmetro.
 */
export function buildLeadEvidenceContext(
  lead: Lead,
  decisionMaker?: DecisionMaker,
  storedEvidence: EvidenceRecord[] = []
): LeadEvidenceContext {
  const confirmedFacts: Record<string, string> = {};

  for (const evaluation of lead.requirement_evaluations || []) {
    if (evaluation.status === 'matched' && isUsableValue(evaluation.observed)) {
      confirmedFacts[evaluation.criterion] = String(evaluation.observed);
    }
  }

  for (const evidence of storedEvidence) {
    if (evidence.verificationStatus === 'verified' && isUsableValue(evidence.value as string | number)) {
      // Não sobrescreve um fato já confirmado via requirement_evaluations -
      // essa fonte é mais específica ao pedido de busca deste lead.
      if (!(evidence.field in confirmedFacts)) {
        confirmedFacts[evidence.field] = String(evidence.value);
      }
    }
  }

  const dm = decisionMaker || lead.decision_makers?.[0];
  const resolvedDecisionMaker = dm && dm.name && dm.name.trim() !== ''
    ? { name: dm.name, title: dm.title && dm.title.trim() !== '' ? dm.title : undefined }
    : undefined;

  return {
    leadId: lead.id,
    companyName: lead.name,
    companyAddress: lead.address && lead.address.trim() !== '' ? lead.address : undefined,
    confirmedFacts,
    decisionMaker: resolvedDecisionMaker,
    newsItems: lead.news_dossier?.recent_news || []
  };
}

/**
 * `personalization_level` é calculado a partir do contexto de evidências, NUNCA
 * a partir da autoavaliação do próprio modelo (o modelo não é confiável para
 * dizer o quão personalizada foi a própria resposta - ver
 * 18_AGENTE_IA_GUARDRAILS.txt). Limiares conservadores e documentados aqui,
 * não uma fórmula estatística: 0 fatos reais = 'low' (abordagem genérica
 * obrigatória); 1-2 = 'medium'; 3+ = 'high'.
 */
export function computePersonalizationLevel(context: LeadEvidenceContext): PersonalizationLevel {
  const factCount =
    Object.keys(context.confirmedFacts).length +
    (context.decisionMaker ? 1 : 0) +
    context.newsItems.length;

  if (factCount === 0) return 'low';
  if (factCount <= 2) return 'medium';
  return 'high';
}

/**
 * Serializa o contexto em texto para entrar no prompt do LLM. Contém APENAS
 * o que está no LeadEvidenceContext - a instrução anti-fabricação do system
 * prompt (ver ANTI_FABRICATION_GUARDRAIL em server/ai.ts) diz explicitamente
 * ao modelo para não mencionar nada fora deste bloco.
 */
export function formatEvidenceContextForPrompt(context: LeadEvidenceContext): string {
  const lines: string[] = [`- Empresa: ${context.companyName}`];

  if (context.companyAddress) {
    lines.push(`- Endereço / Região: ${context.companyAddress}`);
  }

  for (const [field, value] of Object.entries(context.confirmedFacts)) {
    lines.push(`- ${field}: ${value}`);
  }

  if (context.decisionMaker) {
    const titlePart = context.decisionMaker.title ? ` (${context.decisionMaker.title})` : '';
    lines.push(`- Decisor confirmado: ${context.decisionMaker.name}${titlePart}`);
  }

  if (context.newsItems.length > 0) {
    lines.push('- Notícias públicas reais já confirmadas:');
    for (const item of context.newsItems) {
      lines.push(`  - "${item.title}" (${item.source}, ${item.date})`);
    }
  }

  if (lines.length === 1 && !context.companyAddress) {
    lines.push('- (Nenhum outro fato confirmado disponível. Não presuma nada além do nome da empresa.)');
  }

  return lines.join('\n');
}
