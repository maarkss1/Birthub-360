// Wave 13 (CPI, doc 13_AGENTE_SIGNALS_INTENT.txt) — Signals & Intent.
//
// MISSÃO do pacote: "Detectar sinais reais de momento de compra." Regra
// central do pacote, citada literalmente: "IA pode classificar e resumir
// evidências já coletadas. Não pode inventar sinal." — a mesma regra
// anti-fabricação de todas as ondas anteriores (UNKNOWN > dado inventado),
// aplicada a sinais de compra.
//
// SINAIS POSSÍVEIS listados pelo pacote: nova filial, expansão geográfica,
// crescimento de headcount, vagas de logística, nova operação, aumento de
// frota, novo contrato, mudança executiva, incidente de segurança,
// aquisição, investimento, troca de sistema, expansão de CD, alta exposição
// operacional (ver SignalType em src/types.ts).
//
// FONTES do pacote: news/search provider, site oficial, vagas, bases
// públicas, provider empresarial. Nenhuma dessas está integrada neste
// repositório hoje (ver server/providerRegistry.ts — cada uma é declarada lá
// com status `not_implemented`, nunca escondida do catálogo).
//
// A ÚNICA fonte honesta que este módulo tem disponível sem nenhuma API paga
// nova é a que o pipeline já consulta desde a Wave 0: o cadastro oficial de
// CNPJ (Receita Federal via BrasilAPI/Minha Receita, server/cnpj.ts). Esse
// cadastro traz `data_inicio_atividade` (data real de abertura da empresa) —
// um fato público, verificável, já vindo da mesma fonte que a Wave 6 trata
// como `verified` para os demais campos cadastrais. Uma empresa aberta há
// poucos meses é a única aproximação de "nova operação" (item da lista do
// pacote) que podemos afirmar sem inventar nada: não é notícia, não é vaga,
// não é um provider de M&A — é uma leitura direta e datada de um registro
// público oficial.
//
// Todo o restante da lista (expansão geográfica, headcount, vagas, frota,
// contratos, mudança executiva, incidente, aquisição, investimento, troca de
// sistema, expansão de CD, alta exposição operacional) exige uma fonte que
// este código NÃO tem hoje (news/search, vagas, base de M&A, provider
// empresarial). Para esses, este módulo não gera nada — nunca um sinal
// "plausível" sem uma fonte real por trás.

import type { Signal, SignalType } from '../src/types';
import type { CnpjData } from './cnpj';

export type { Signal, SignalType };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Janela de "empresa recém-aberta" usada para o sinal `nova_operacao`. 18
// meses é um limiar operacional razoável (não uma verdade estatística
// única, documentado aqui como tal, no mesmo espírito do MIN_SAMPLE_SIZE da
// Wave 13/Feedback Loop): tempo o bastante para cobrir o ciclo típico de uma
// empresa de transporte/logística "recém-criada" ainda estruturando
// fornecedores/operação, sem alargar tanto a janela a ponto de qualquer
// empresa de alguns anos contar como "nova".
export const NEW_OPERATION_WINDOW_DAYS = 18 * 30;

function parseOfficialDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Sinal honesto derivado exclusivamente de `data_inicio_atividade` (Receita
 * Federal, via server/cnpj.ts). Retorna `undefined` — nunca um sinal fraco
 * disfarçado — quando:
 * - não há `cnpjData`, ou `data_inicio_atividade` está ausente/vazia (fonte
 *   não confirmou o campo);
 * - a data não é parseável (formato inesperado da API);
 * - a data está no futuro (dado da fonte inconsistente — não usamos);
 * - a empresa foi aberta há mais tempo que `NEW_OPERATION_WINDOW_DAYS`.
 */
export function detectNewOperationSignalFromCnpj(
  cnpjData: CnpjData | undefined,
  now: Date = new Date()
): Signal | undefined {
  if (!cnpjData?.data_inicio_atividade) return undefined;

  const founded = parseOfficialDate(cnpjData.data_inicio_atividade);
  if (!founded) return undefined;

  const ageDays = daysBetween(founded, now);
  if (ageDays < 0) return undefined; // data no futuro: fonte inconsistente, não usamos
  if (ageDays > NEW_OPERATION_WINDOW_DAYS) return undefined; // empresa não é mais "nova"

  const source = cnpjData.source === 'minhareceita' ? 'minhareceita' : 'cnpj_receita_federal';
  const evidence = [
    `Data de início de atividade registrada na Receita Federal: ${cnpjData.data_inicio_atividade} (${ageDays} dia(s) atrás).`
  ];

  // Corroboração: quando a situação cadastral está ATIVA e sua própria data
  // de mudança (data_situacao_cadastral) é próxima da data de abertura, isso
  // reforça que se trata de fato de uma operação nova (não uma reativação
  // recente de uma empresa antiga, o que exigiria interpretar melhor a
  // história de status — não temos histórico de status anterior, então essa
  // outra leitura fica deliberadamente FORA do escopo: seria uma inferência
  // sem lastro suficiente).
  let confidence = 0.75;
  const statusDate = parseOfficialDate(cnpjData.data_situacao_cadastral);
  const isAtiva = (cnpjData.situacao_cadastral || '').toUpperCase() === 'ATIVA';
  if (isAtiva && statusDate && Math.abs(daysBetween(founded, statusDate)) <= 30) {
    evidence.push(`Situação cadastral ATIVA desde ${cnpjData.data_situacao_cadastral}, próxima da data de abertura — reforça que a operação é de fato recente.`);
    confidence = 0.85;
  }

  return {
    type: 'nova_operacao',
    observedAt: now.toISOString(),
    source,
    evidence,
    // Confiança abaixo do 0.95 que server/evidence.ts#buildCnpjEvidence usa
    // para o dado cadastral cru: o FATO (data de abertura) é oficial e
    // confiável, mas a LEITURA "empresa recém-aberta = momento de compra" é
    // uma inferência sobre esse fato, não um evento de compra observado
    // diretamente — por isso este módulo nunca reivindica confiança de dado
    // "verified" (vocabulário de server/evidence.ts) para o sinal em si,
    // mesmo com um fato-base verified por trás (ver item 5 do backlog).
    confidence,
    // Relevância comercial moderada, não alta: uma empresa recém-aberta É um
    // momento plausível de estruturar fornecedores/logística, mas é bem mais
    // fraco como indício de compra do que os sinais que o pacote lista como
    // fortes (ex: vaga de logística aberta, novo contrato, expansão de CD) —
    // nenhum dos quais este código consegue detectar honestamente hoje.
    commercialRelevance: 0.5,
    expiresAt: new Date(founded.getTime() + NEW_OPERATION_WINDOW_DAYS * MS_PER_DAY).toISOString()
  };
}

export interface DetectSignalsOptions {
  /** CNPJ já resolvido para este lead nesta busca (server/cnpj.ts) — única fonte honesta disponível hoje. */
  cnpjData?: CnpjData;
  /** Injeção de tempo para teste determinístico; default `new Date()`. */
  now?: Date;
}

/**
 * Detecta sinais de compra reais para um lead a partir SOMENTE de dado que o
 * pipeline já coletou de fontes verificáveis — nunca infere um sinal a
 * partir de heurística sobre nome/segmento/etc. Hoje só há uma fonte
 * honesta plugada (CNPJ oficial); ver o topo deste arquivo para o porquê os
 * demais tipos de `SignalType` não são emitidos: news/search, vagas, base
 * de M&A e provider empresarial não estão integrados (registrados como
 * `not_implemented` em server/providerRegistry.ts).
 *
 * Quando um provider real desses for integrado, este é o lugar certo para
 * adicionar a chamada correspondente e concatenar o resultado ao array —
 * `computeIntentScore` (server/scoring.ts) já está pronto para consumir
 * qualquer volume de `Signal[]`.
 */
export function detectSignalsForLead(
  lead: { name: string },
  opts: DetectSignalsOptions = {}
): Signal[] {
  const signals: Signal[] = [];
  const now = opts.now ?? new Date();

  const newOperation = detectNewOperationSignalFromCnpj(opts.cnpjData, now);
  if (newOperation) signals.push(newOperation);

  return signals;
}

/** Um sinal é considerado ativo (conta para o Intent Score) quando não tem
 * `expiresAt`, ou `expiresAt` ainda não passou em relação a `now`. */
export function isSignalActive(signal: Signal, now: Date = new Date()): boolean {
  if (!signal.expiresAt) return true;
  const expires = new Date(signal.expiresAt);
  if (Number.isNaN(expires.getTime())) return true; // expiresAt malformado: não descarta por segurança
  return expires.getTime() > now.getTime();
}
