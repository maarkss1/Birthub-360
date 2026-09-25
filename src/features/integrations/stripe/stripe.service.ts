import { env } from '../../../config/env.js';
import { AuditService } from '../../../lib/audit/audit.service.js';
import { DisallowedHostError, fetchWithTimeout, HttpTimeoutError } from '../../../lib/http.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import {
  parseRetryAfterMs,
  retryWithBackoff,
  TransientHttpError,
} from '../../../shared/http/retryWithBackoff.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';

// api.stripe.com é destino FIXO do próprio código (não uma URL de tenant) — usa fetchWithTimeout
// com allowlist (src/lib/http.ts), não o guard de SSRF de URL de usuário/tenant
// (assertSafeExternalUrl/safeFetch), que existe para casos como o webhookUrl do Slack/Bitrix24.
const STRIPE_API_BASE = 'https://api.stripe.com';
const STRIPE_ALLOWED_HOSTS = ['api.stripe.com'];
const STRIPE_TIMEOUT_MS = 10_000;
// INTEGRATION-002 (auditoria de débito técnico): mesma estratégia de retry/backoff do Bitrix
// (callBitrix, extraída para src/shared/http/retryWithBackoff.ts) — falha de rede/timeout/429/5xx
// é recuperável e reintentada; qualquer outra resposta HTTP (2xx de sucesso, ou 4xx "de negócio"
// como 401 chave inválida/400 payload inválido) é definitiva e retorna imediatamente, sem
// consumir tentativas à toa.
const STRIPE_MAX_ATTEMPTS = 4;

export interface StripeConnectionInput {
  label?: string;
  secretKey: string;
}

export interface StripeConnectionSummary {
  id: string;
  label: string;
  secretKeyLast4: string;
  createdAt: Date;
  /** Endpoint que esta organização deve cadastrar como webhook no Dashboard da Stripe
   * (Developers > Webhooks > Add endpoint) — ver BILLING-007. */
  webhookReceiverUrl: string;
  /** Nunca o valor em si — só se um `webhookSecret` já foi colado (ver setStripeWebhookSecret). */
  hasWebhookSecret: boolean;
}

// Mesma variável já usada pela URL de webhook do Bitrix24 (ver connections.ts) — o servidor não
// sabe seu próprio domínio público (proxy reverso/Render), então sem isto a URL mostrada na tela
// seria sempre um caminho relativo/localhost, inútil pra colar no Dashboard da Stripe.
function buildWebhookReceiverUrl(connectionId: string): string {
  const base = (env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  return `${base}/api/integrations/stripe/webhook/${connectionId}`;
}

function toSummary(conn: {
  id: string;
  label: string;
  secretKey: string;
  webhookSecret: string | null;
  createdAt: Date;
}): StripeConnectionSummary {
  return {
    id: conn.id,
    label: conn.label,
    secretKeyLast4: conn.secretKey.slice(-4),
    createdAt: conn.createdAt,
    webhookReceiverUrl: buildWebhookReceiverUrl(conn.id),
    hasWebhookSecret: Boolean(conn.webhookSecret),
  };
}

async function stripeRequest(
  secretKey: string,
  path: string,
  init: { method?: string; body?: URLSearchParams; idempotencyKey?: string } = {},
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const res = await retryWithBackoff(
    async () => {
      let response: Response;
      try {
        response = await fetchWithTimeout(
          `${STRIPE_API_BASE}${path}`,
          {
            method: init.method ?? 'GET',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              ...(init.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
              // INTEGRATION-001 (auditoria de débito técnico, HIGH/P1 financeiro): sem este header
              // a Stripe trata cada requisição como uma cobrança nova — um retry de rede (timeout
              // esperando a resposta, mas a cobrança já foi processada do lado da Stripe) ou um
              // duplo clique no caller vira uma SEGUNDA cobrança real no cartão do cliente. Só é
              // enviado quando `idempotencyKey` é passado explicitamente (hoje só
              // createStripeCharge o faz) — ver ali a justificativa completa de como essa chave
              // precisa ser gerada e mantida estável entre tentativas (inclusive entre as
              // tentativas do retry abaixo — o mesmo header vai em toda tentativa desta mesma
              // chamada, nunca um valor novo por tentativa).
              ...(init.idempotencyKey ? { 'Idempotency-Key': init.idempotencyKey } : {}),
            },
            body: init.body,
          },
          STRIPE_TIMEOUT_MS,
          STRIPE_ALLOWED_HOSTS,
        );
      } catch (err: any) {
        // DisallowedHostError nunca é transiente (bug de configuração, não vai se resolver numa
        // próxima tentativa). HttpTimeoutError e qualquer outra falha de rede (DNS, conexão
        // recusada) são recuperáveis — mesma classificação de attemptBitrixCall.
        if (err instanceof DisallowedHostError) throw err;
        if (err instanceof HttpTimeoutError) {
          throw new TransientHttpError(
            `Tempo limite esgotado ao comunicar com o Stripe (timeout ${STRIPE_TIMEOUT_MS / 1000}s).`,
            undefined,
            undefined,
            err,
          );
        }
        throw new TransientHttpError(
          'Falha de rede ao comunicar com o Stripe.',
          undefined,
          undefined,
          err,
        );
      }
      if (response.status === 429) {
        throw new TransientHttpError(
          'Stripe aplicou limite de chamadas (HTTP 429).',
          429,
          parseRetryAfterMs(response) ?? undefined,
        );
      }
      if (response.status >= 500) {
        throw new TransientHttpError(
          `Stripe respondeu com erro de servidor (HTTP ${response.status}).`,
          response.status,
        );
      }
      // Qualquer outra resposta (2xx de sucesso, ou 4xx "de negócio" como 401/400) é definitiva —
      // retorna direto pro chamador interpretar, sem consumir mais tentativas.
      return response;
    },
    { label: 'stripe', maxAttempts: STRIPE_MAX_ATTEMPTS },
  );
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, json };
}

/** Lista as conexões Stripe desta organização (nunca expõe a secretKey em texto puro). */
export async function listStripeConnections(
  organizationId: string,
): Promise<StripeConnectionSummary[]> {
  const connections = await prisma.stripeConnection.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
  return connections.map(toSummary);
}

/**
 * Cadastra uma conexão Stripe — valida a secretKey de verdade contra a API do Stripe (GET
 * /v1/balance, endpoint que não consome nenhum recurso do plano) ANTES de persistir. Mesma
 * honestidade de connect3CX/testWebhook (Bitrix24): nunca aceita e grava uma credencial sem provar
 * que ela funciona.
 */
export async function connectStripe(
  organizationId: string,
  input: StripeConnectionInput,
): Promise<StripeConnectionSummary> {
  const secretKey = input.secretKey?.trim();
  if (!secretKey) {
    throw new AppError('Informe a chave secreta da API do Stripe.', 400);
  }

  const check = await stripeRequest(secretKey, '/v1/balance');
  if (!check.ok) {
    const message =
      (check.json.error as { message?: string } | undefined)?.message ??
      `Stripe respondeu HTTP ${check.status}`;
    throw new AppError(`Chave secreta do Stripe inválida ou sem permissão: ${message}`, 401);
  }

  const connection = await prisma.stripeConnection.create({
    data: {
      organizationId,
      label: input.label?.trim() || 'Stripe',
      secretKey,
    },
  });

  logger.info(
    { organizationId, connectionId: connection.id },
    '[stripe] Conexão Stripe cadastrada com sucesso',
  );

  return toSummary(connection);
}

/** Remove uma conexão Stripe (deleteMany já escopado por organizationId — nunca apaga de outro tenant). */
export async function disconnectStripe(
  organizationId: string,
  connectionId: string,
): Promise<void> {
  await prisma.stripeConnection.deleteMany({ where: { id: connectionId, organizationId } });
  logger.info({ organizationId, connectionId }, '[stripe] Conexão Stripe removida');
}

/**
 * Grava (ou substitui) o segredo de assinatura do webhook de ENTRADA (BILLING-007) — diferente de
 * regenerateWebhookSecret do Bitrix, este valor NÃO é gerado por nós: a pessoa cria o endpoint no
 * Dashboard da Stripe apontando para `webhookReceiverUrl` (ver toSummary/connectStripe acima) e
 * cola aqui o `whsec_...` que a própria Stripe gera na hora. Comparado contra o header
 * `Stripe-Signature` de cada entrega (ver stripe.webhook.ts) antes de aceitar qualquer payload.
 */
export async function setStripeWebhookSecret(
  organizationId: string,
  connectionId: string,
  rawWebhookSecret: unknown,
): Promise<StripeConnectionSummary> {
  const webhookSecret = typeof rawWebhookSecret === 'string' ? rawWebhookSecret.trim() : '';
  if (!webhookSecret.startsWith('whsec_')) {
    throw new AppError(
      'Segredo de assinatura inválido — cole o valor "whsec_..." mostrado pela Stripe ao criar o endpoint do webhook.',
      400,
    );
  }

  const connection = await prisma.stripeConnection.findFirst({
    where: { id: connectionId, organizationId },
  });
  if (!connection) throw new AppError('Conexão Stripe não encontrada.', 404);

  const updated = await prisma.stripeConnection.update({
    where: { id: connectionId },
    data: { webhookSecret },
  });

  await AuditService.log({
    action: 'UPDATE',
    entity: 'StripeConnection',
    entityId: connectionId,
    tenantId: organizationId,
    afterState: { webhookSecretConfigured: true },
  });
  logger.info(
    { organizationId, connectionId },
    '[stripe] Segredo do webhook de entrada configurado',
  );

  return toSummary(updated);
}

/** Testa a comunicação com a API do Stripe — resultado honesto (nunca sucesso fabricado), mesmo
 * espírito de test3CXConnection. */
export async function testStripeConnection(
  organizationId: string,
  connectionId: string,
): Promise<{ success: boolean; message: string }> {
  const connection = await prisma.stripeConnection.findFirst({
    where: { id: connectionId, organizationId },
  });
  if (!connection) throw new AppError('Conexão Stripe não encontrada.', 404);

  try {
    const check = await stripeRequest(connection.secretKey, '/v1/balance');
    logger.info(
      { organizationId, connectionId, ok: check.ok },
      '[stripe] Teste de comunicação realizado',
    );
    return {
      success: check.ok,
      message: check.ok
        ? 'Chave da API do Stripe válida e respondendo normalmente.'
        : `Stripe respondeu com erro (HTTP ${check.status}).`,
    };
  } catch (err: any) {
    logger.warn({ err, organizationId, connectionId }, '[stripe] Falha ao testar comunicação');
    return { success: false, message: 'Não foi possível comunicar com a API do Stripe.' };
  }
}

export interface StripeChargeInput {
  amountCents: number;
  currency: string;
  customerEmail: string;
  description?: string;
  /** Quando informado, confirma a cobrança de fato (payment_method já tokenizado no lado do
   * cliente/checkout) — sem isto, o PaymentIntent é criado mas fica `requires_payment_method`
   * (Stripe nunca cobra sem um método de pagamento anexado e confirmado; nunca fabricamos um
   * status "succeeded" que não veio de verdade da API — mesma honestidade de make3CXCall). */
  paymentMethodId?: string;
  /**
   * INTEGRATION-001 (auditoria de débito técnico, HIGH/P1 financeiro): identificador estável da
   * TENTATIVA lógica de cobrança — não da requisição HTTP individual. Obrigatório porque este
   * fluxo não tem hoje nenhum registro em banco criado ANTES da chamada à Stripe (não existe
   * Invoice/Order local para esta cobrança) de onde derivar um id interno estável; sem um valor
   * fornecido pelo chamador, cada retry geraria uma chave nova e a proteção de idempotência da
   * Stripe nunca entraria em ação.
   *
   * Quem gera e possui o ciclo de vida desta chave é o CHAMADOR (rota/cliente que inicia a
   * cobrança), não este serviço — um valor gerado aqui dentro de createStripeCharge não resolveria
   * nada, porque um retry real (timeout esperando a resposta desta função, ou o usuário clicando
   * "tentar novamente" depois de um erro de rede) é uma NOVA chamada a esta função, com um novo
   * valor a cada vez. Regra para quem chama: gere um valor (ex.: `crypto.randomUUID()`) UMA vez
   * por ação do usuário/tentativa de cobrança, guarde-o (estado do componente, coluna de um
   * pedido/fatura local etc.) e reenvie o MESMO valor em qualquer retry dessa mesma tentativa —
   * nunca gere um novo valor num retry, e nunca reutilize um valor antigo para uma cobrança
   * genuinamente nova (isso faria a Stripe devolver o resultado da cobrança antiga em vez de
   * criar uma nova).
   */
  idempotencyKey: string;
}

export interface StripeChargeResult {
  paymentId: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}

function parsePaymentIntent(json: Record<string, unknown>): StripeChargeResult {
  return {
    paymentId: String(json.id ?? ''),
    amountCents: Number(json.amount ?? 0),
    currency: String(json.currency ?? '').toUpperCase(),
    status: String(json.status ?? 'unknown'),
    createdAt: json.created
      ? new Date(Number(json.created) * 1000).toISOString()
      : new Date().toISOString(),
  };
}

/** Cria um PaymentIntent real no Stripe. Só fica `succeeded` quando a Stripe de fato confirma a
 * cobrança (paymentMethodId informado e válido) — nunca inventa um status. */
export async function createStripeCharge(
  organizationId: string,
  connectionId: string,
  input: StripeChargeInput,
): Promise<StripeChargeResult> {
  const connection = await prisma.stripeConnection.findFirst({
    where: { id: connectionId, organizationId },
  });
  if (!connection) throw new AppError('Conexão Stripe não encontrada.', 404);

  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    throw new AppError('Valor da cobrança deve ser maior que zero (em centavos).', 400);
  }

  // INTEGRATION-001: nunca deixar a chave de idempotência ser opcional na prática — sem ela, um
  // retry de rede ou duplo clique no chamador cria uma segunda cobrança real (ver justificativa em
  // StripeChargeInput.idempotencyKey). Limite de 255 caracteres é o próprio limite da Stripe para
  // o header Idempotency-Key.
  const idempotencyKey = input.idempotencyKey?.trim();
  if (!idempotencyKey) {
    throw new AppError(
      'idempotencyKey é obrigatório para criar uma cobrança — gere um valor estável por tentativa de cobrança (ex.: crypto.randomUUID()) e reenvie o mesmo valor em qualquer retry.',
      400,
    );
  }
  if (idempotencyKey.length > 255) {
    throw new AppError('idempotencyKey excede o limite de 255 caracteres aceito pela Stripe.', 400);
  }

  const body = new URLSearchParams();
  body.append('amount', String(Math.round(input.amountCents)));
  body.append('currency', input.currency.toLowerCase());
  body.append('receipt_email', input.customerEmail);
  if (input.description) body.append('description', input.description);
  if (input.paymentMethodId) {
    body.append('payment_method', input.paymentMethodId);
    body.append('confirm', 'true');
  }

  const res = await stripeRequest(connection.secretKey, '/v1/payment_intents', {
    method: 'POST',
    body,
    idempotencyKey,
  });

  if (!res.ok) {
    const message =
      (res.json.error as { message?: string } | undefined)?.message ?? 'erro desconhecido';
    logger.warn({ organizationId, connectionId, message }, '[stripe] Falha ao criar cobrança');
    throw new AppError(`Falha ao criar cobrança no Stripe: ${message}`, 502);
  }

  logger.info(
    { organizationId, connectionId, paymentId: res.json.id, status: res.json.status },
    '[stripe] PaymentIntent criado',
  );

  return parsePaymentIntent(res.json);
}

// CodeQL (achado real, PR #454): "server-side request forgery" — `paymentId` (route param de
// GET /connections/:connectionId/charges/:paymentId, texto livre do chamador) era interpolado
// direto no path da URL da API do Stripe. A concatenação sobre STRIPE_API_BASE fixo já impede
// trocar o HOST de destino, e `STRIPE_ALLOWED_HOSTS` em fetchWithTimeout confere isso em runtime
// — mas nenhum dos dois valida o FORMATO do id antes de compor a URL, então um paymentId malicioso
// ainda podia injetar segmentos de path extras na chamada real ao Stripe. IDs de PaymentIntent do
// Stripe são sempre "pi_" + alfanumérico; validar isso antes de montar a URL fecha a cadeia de
// taint na origem, sem depender só do allowlist de host.
const STRIPE_PAYMENT_INTENT_ID = /^pi_[A-Za-z0-9]+$/;

/** Consulta o status real de um PaymentIntent já criado. */
export async function getStripeCharge(
  organizationId: string,
  connectionId: string,
  paymentId: string,
): Promise<StripeChargeResult | null> {
  if (!STRIPE_PAYMENT_INTENT_ID.test(paymentId)) {
    throw new AppError('Id de cobrança inválido — esperado o formato "pi_..." do Stripe.', 400);
  }

  const connection = await prisma.stripeConnection.findFirst({
    where: { id: connectionId, organizationId },
  });
  if (!connection) throw new AppError('Conexão Stripe não encontrada.', 404);

  const res = await stripeRequest(connection.secretKey, `/v1/payment_intents/${paymentId}`);
  if (!res.ok) return null;
  return parsePaymentIntent(res.json);
}
