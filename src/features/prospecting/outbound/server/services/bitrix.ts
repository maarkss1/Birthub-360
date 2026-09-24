import crypto from 'crypto';
import { isUrlSafeForOutboundWebhook } from '../validators';

export type BitrixCheckStatus = 'existing_client' | 'existing_lead' | 'new' | 'unchecked';

// Wave 11 (CPI) - Security Hardening: nenhuma requisição para um webhook
// configurável pelo usuário pode ficar pendurada indefinidamente.
const BITRIX_FETCH_TIMEOUT_MS = 10_000;

export interface BitrixDuplicateResult {
  status: BitrixCheckStatus;
  detail: string;
  matches: { leadIds: Array<string | number>; contactIds: Array<string | number>; companyIds: Array<string | number> };
}

// Qual webhook usar de acordo com a marca do vendedor/campanha — para não depender
// de um seletor manual que qualquer usuário pode trocar (ver Sidebar "Bitrix").
export function resolveBitrixWebhookForCompany(company?: string): string {
  const cleanCompany = (company || '').toLowerCase();
  if (cleanCompany === 'atlas') {
    return (process.env.BITRIX_ATLASGR_WEBHOOK || '').replace(/\/$/, '');
  }
  return (process.env.BITRIX_TOTALTRAC_WEBHOOK || '').replace(/\/$/, '');
}

// Consulta o Bitrix ANTES de criar um lead novo: existe como Empresa/Contato (cliente
// já relacionado) ou como Lead (já prospectado, ainda não convertido)? Usa o método
// padrão crm.duplicate.findbycomm (não depende de campo customizado no Bitrix) e nunca
// lança exceção — se o Bitrix não estiver configurado/disponível, retorna 'unchecked'
// para não travar o fluxo de prospecção.
export async function checkBitrixDuplicate(
  webhookUrl: string,
  params: { phone?: string; email?: string }
): Promise<BitrixDuplicateResult> {
  const empty = { leadIds: [] as Array<string | number>, contactIds: [] as Array<string | number>, companyIds: [] as Array<string | number> };

  if (!webhookUrl) {
    return { status: 'unchecked', detail: 'Nenhum webhook do Bitrix24 configurado para esta marca.', matches: empty };
  }

  const base = webhookUrl.replace(/\/$/, '');

  // SSRF: mesma checagem aplicada na rota de envio de leads — defesa em
  // profundidade caso um chamador futuro esqueça de validar antes de chegar aqui.
  const webhookSafety = isUrlSafeForOutboundWebhook(`${base}/crm.duplicate.findbycomm.json`);
  if (!webhookSafety.safe) {
    return { status: 'unchecked', detail: `Webhook do Bitrix24 rejeitado por segurança: ${webhookSafety.reason}`, matches: empty };
  }

  const leadIds = new Set<string | number>();
  const contactIds = new Set<string | number>();
  const companyIds = new Set<string | number>();
  let reachedBitrix = false;

  async function findByComm(type: 'EMAIL' | 'PHONE', value: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BITRIX_FETCH_TIMEOUT_MS);
    try {
      // 2 tentativas (não 3): esta checagem roda no caminho síncrono da
      // prospecção, então um retry curto já ajuda com blips de rede sem
      // atrasar demais o resultado da busca. AbortController (Wave 11) segue
      // aplicado via `signal` para não deixar a requisição pendurada.
      const res = await fetchWithRetry(
        `${base}/crm.duplicate.findbycomm.json`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, values: [value] }),
          signal: controller.signal as any
        },
        { attempts: 2, baseDelayMs: 250 }
      );
      if (!res.ok) return;
      const data: any = await res.json();
      if (data.error) return;
      reachedBitrix = true;
      const result = data.result || {};
      (result.LEAD || []).forEach((id: any) => leadIds.add(id));
      (result.CONTACT || []).forEach((id: any) => contactIds.add(id));
      (result.COMPANY || []).forEach((id: any) => companyIds.add(id));
    } catch (err) {
      // Bitrix indisponível/timeout — segue sem bloquear a prospecção.
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (params.email) await findByComm('EMAIL', params.email);
  if (params.phone) await findByComm('PHONE', params.phone);

  if (!reachedBitrix) {
    return { status: 'unchecked', detail: 'Não foi possível consultar o Bitrix24 no momento.', matches: empty };
  }

  if (contactIds.size > 0 || companyIds.size > 0) {
    return {
      status: 'existing_client',
      detail: `Já existe como Empresa/Contato no Bitrix24 (${companyIds.size} empresa(s), ${contactIds.size} contato(s)).`,
      matches: { leadIds: [...leadIds], contactIds: [...contactIds], companyIds: [...companyIds] }
    };
  }

  if (leadIds.size > 0) {
    return {
      status: 'existing_lead',
      detail: `Já existe como Lead no Bitrix24 (${leadIds.size} registro(s)) — ainda não convertido em cliente.`,
      matches: { leadIds: [...leadIds], contactIds: [], companyIds: [] }
    };
  }

  return { status: 'new', detail: 'Nenhum registro correspondente encontrado no Bitrix24.', matches: empty };
}

// syncLeadToBitrix foi removida por duplicar (com menos campos) a lógica de
// POST /api/integrations/bitrix24/send-lead em server/routes.ts, que é o caminho
// realmente usado pelo front-end. Use aquela rota para enviar leads ao Bitrix24.

// ---------------------------------------------------------------------------
// Wave 12 (CPI) — idempotência e retry para exportação ao Bitrix24
// ---------------------------------------------------------------------------

// Normaliza a URL do webhook (remove barra final e diferenças de maiúscula no
// host) para que dois envios do mesmo lead ao mesmo webhook sempre produzam a
// mesma chave, independente de como a URL chegou até aqui.
function normalizeWebhookForKey(webhookUrl: string): string {
  return (webhookUrl || '').trim().replace(/\/+$/, '').toLowerCase();
}

// Chave determinística: mesmo lead + mesmo webhook de destino => mesma chave,
// sempre. Usada para checar (antes de enviar) se já existe um export bem
// sucedido registrado em bitrix_export_log, e assim nunca criar um segundo
// Lead/Deal duplicado no Bitrix por reenvio acidental (duplo clique, retry do
// navegador, etc). Puramente uma função de hash — não faz I/O, não lança.
export function generateExportIdempotencyKey(leadId: string, webhookUrl: string): string {
  const normalizedLeadId = (leadId || '').trim();
  const normalizedWebhook = normalizeWebhookForKey(webhookUrl);
  const raw = `bitrix-export:v1:${normalizedLeadId}::${normalizedWebhook}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export interface RetryOptions {
  attempts?: number; // tentativas totais, incluindo a primeira (default 3)
  baseDelayMs?: number; // backoff exponencial curto a partir daqui (default 300ms)
}

// Retry local e independente (Wave 9 — Cost/Cache/Resiliência — roda em paralelo
// e pode não estar mesclada ainda): reenvia apenas em falha de rede/timeout ou
// erro 5xx/429 do lado do Bitrix, nunca em 4xx de validação (reenviar um payload
// inválido não vai virar válido). Nunca lança por causa do retry em si — quem
// chama trata o resultado (Response) ou a exceção da última tentativa normalmente.
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 300;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, init);
      const isRetryableStatus = response.status === 429 || response.status >= 500;
      if (!isRetryableStatus || attempt === attempts) {
        return response;
      }
      lastError = new Error(`Bitrix24 respondeu HTTP ${response.status} na tentativa ${attempt}/${attempts}.`);
    } catch (err) {
      lastError = err;
      if (attempt === attempts) {
        throw err;
      }
    }
    // Backoff curto e crescente entre tentativas (300ms, 600ms, 900ms...).
    await new Promise(resolve => setTimeout(resolve, baseDelayMs * attempt));
  }
  // Inalcançável na prática (o loop sempre retorna ou lança na última tentativa),
  // mas mantém o TypeScript feliz sobre o tipo de retorno.
  throw lastError instanceof Error ? lastError : new Error('Falha ao chamar o Bitrix24 após múltiplas tentativas.');
}
