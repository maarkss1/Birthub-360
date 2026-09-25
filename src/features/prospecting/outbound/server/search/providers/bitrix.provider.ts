// Wave 4 (CPI, follow-up) — Provider Adapter: Bitrix24 (CRM de saída). A
// lógica de resiliência (retry, SSRF, idempotência) já vive em
// server/services/bitrix.ts desde as Waves 9/11/12 — este adapter só
// normaliza os dois usos como capacidade ("crm_duplicate_check" e
// "crm_export") no formato ProviderResult comum, para que o Provider Registry
// e (futuramente) o Query Planner tratem o Bitrix como qualquer outro
// provider, por capacidade, sem duplicar a lógica que já existe.
//
// Decisão de design: formalizado aqui como um adapter dedicado em vez de
// reescrever server/services/bitrix.ts na interface SearchProvider — aquele
// arquivo tem responsabilidades além de "provider" (resolução de webhook por
// marca, idempotência local) que não fazem sentido dentro de um adapter
// genérico. O padrão segue o já usado por cnpjOficial.provider.ts: a lógica
// de negócio/resiliência fica no serviço, o adapter só empacota o resultado.

import { checkBitrixDuplicate, fetchWithRetry, type BitrixDuplicateResult } from '../../services/bitrix.js';
import { isUrlSafeForOutboundWebhook } from '../../validators.js';
import type { ProviderCapability, ProviderHealth, ProviderResult, SearchProvider } from './types.js';

const CAPABILITIES: ProviderCapability[] = ['crm_duplicate_check', 'crm_export'];

function isConfigured(): boolean {
  return Boolean((process.env.BITRIX_TOTALTRAC_WEBHOOK || '').trim() || (process.env.BITRIX_ATLASGR_WEBHOOK || '').trim());
}

/**
 * Capacidade "crm_duplicate_check": empresa/contato/lead já existe no Bitrix?
 * checkBitrixDuplicate (Wave 9/11) já nunca lança e já nunca fabrica um
 * "novo" quando não conseguiu falar com o Bitrix - aqui só normalizamos isso
 * como ProviderResult (status explícito + latência), sem mudar o
 * comportamento de checkBitrixDuplicate em si.
 */
export async function checkDuplicate(
  webhookUrl: string,
  params: { phone?: string; email?: string }
): Promise<ProviderResult<BitrixDuplicateResult>> {
  const startedAt = Date.now();
  const result = await checkBitrixDuplicate(webhookUrl, params);
  const latencyMs = Date.now() - startedAt;

  if (result.status === 'unchecked') {
    // 'unchecked' cobre dois casos distintos dentro de checkBitrixDuplicate:
    // nenhum webhook configurado, ou o Bitrix não respondeu/foi rejeitado por
    // segurança. Sem webhook -> not_configured; com webhook mas sem resposta
    // real -> error (nunca fabricamos um "novo" a partir disso).
    return {
      status: webhookUrl ? 'error' : 'not_configured',
      source: 'bitrix',
      latencyMs,
      errorMessage: result.detail
    };
  }

  return { status: 'ok', data: result, source: 'bitrix', latencyMs };
}

export interface BitrixExportResult {
  bitrixLeadId: string;
}

/**
 * Capacidade "crm_export": cria um Lead no Bitrix24 (crm.lead.add). Trata
 * timeout, 429/5xx e valida a URL de destino (SSRF) antes de qualquer fetch -
 * mesmo rigor dos demais adapters (Google Places/Apollo). Reusa
 * fetchWithRetry (Wave 12) para retry em falha de rede/5xx/429, nunca em 4xx
 * de validação.
 */
export async function exportLead(
  webhookUrl: string,
  fields: Record<string, unknown>,
  timeoutMs = 15_000
): Promise<ProviderResult<BitrixExportResult>> {
  const startedAt = Date.now();
  const base = (webhookUrl || '').trim().replace(/\/+$/, '');
  if (!base) {
    return { status: 'not_configured', source: 'bitrix', latencyMs: 0 };
  }

  const targetEndpoint = `${base}/crm.lead.add.json`;
  const safety = isUrlSafeForOutboundWebhook(targetEndpoint);
  if (!safety.safe) {
    return { status: 'error', source: 'bitrix', latencyMs: Date.now() - startedAt, errorMessage: `Webhook do Bitrix24 rejeitado por segurança: ${safety.reason}` };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response;
    try {
      response = await fetchWithRetry(
        targetEndpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields, params: { REGISTER_SONET_EVENT: 'Y' } }),
          signal: controller.signal as any
        },
        { attempts: 3, baseDelayMs: 400 }
      );
    } catch (err: any) {
      const latencyMs = Date.now() - startedAt;
      if (err?.name === 'AbortError') {
        return { status: 'timeout', source: 'bitrix', latencyMs, errorMessage: 'Timeout ao exportar lead para o Bitrix24.' };
      }
      return { status: 'error', source: 'bitrix', latencyMs, errorMessage: err?.message || String(err) };
    }

    const latencyMs = Date.now() - startedAt;
    if (response.status === 429) return { status: 'rate_limited', source: 'bitrix', latencyMs, httpStatus: 429 };
    if (!response.ok) return { status: 'error', source: 'bitrix', latencyMs, httpStatus: response.status, errorMessage: `Bitrix24 respondeu ${response.status}` };

    const data = await response.json() as any;
    if (data.result) {
      return { status: 'ok', data: { bitrixLeadId: String(data.result) }, source: 'bitrix', latencyMs, httpStatus: response.status };
    }
    // HTTP 200 mas sem `result`: Bitrix rejeitou o payload (validação de campo,
    // etc) - nunca tratamos isso como sucesso. errorMessage carrega a razão
    // real devolvida pela API, nunca uma mensagem genérica fabricada.
    const errMsg = data.error_description || data.error || 'Bitrix24 respondeu 200 sem "result" - lead não foi criado.';
    return { status: 'error', source: 'bitrix', latencyMs, httpStatus: response.status, errorMessage: errMsg };
  } finally {
    clearTimeout(timeoutId);
  }
}

export const bitrixProvider: SearchProvider = {
  name: 'bitrix',
  capabilities: CAPABILITIES,
  configured: isConfigured,
  async health(): Promise<ProviderHealth> {
    if (!isConfigured()) {
      return { status: 'not_configured', checkedAt: new Date().toISOString(), message: 'Nenhum webhook do Bitrix24 configurado (BITRIX_TOTALTRAC_WEBHOOK / BITRIX_ATLASGR_WEBHOOK).' };
    }
    // "online" aqui significa "configurado", não "testado agora" - checar de
    // fato exigiria uma chamada real ao Bitrix a cada health check, custando
    // uma requisição para uma integração de saída. Mesmo padrão de honestidade
    // do restante do registry: não fabricamos "online" quando não sabemos.
    return { status: 'online', checkedAt: new Date().toISOString(), message: 'Webhook configurado - saúde real só é confirmada na próxima chamada (crm_duplicate_check/crm_export).' };
  }
};
