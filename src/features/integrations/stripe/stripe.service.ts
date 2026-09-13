import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';
import { fetchWithTimeout } from '../../../lib/http.js';

// api.stripe.com é destino FIXO do próprio código (não uma URL de tenant) — usa fetchWithTimeout
// com allowlist (src/lib/http.ts), não o guard de SSRF de URL de usuário/tenant
// (assertSafeExternalUrl/safeFetch), que existe para casos como o webhookUrl do Slack/Bitrix24.
const STRIPE_API_BASE = 'https://api.stripe.com';
const STRIPE_ALLOWED_HOSTS = ['api.stripe.com'];
const STRIPE_TIMEOUT_MS = 10_000;

export interface StripeConnectionInput {
  label?: string;
  secretKey: string;
}

export interface StripeConnectionSummary {
  id: string;
  label: string;
  secretKeyLast4: string;
  createdAt: Date;
}

function toSummary(conn: {
  id: string;
  label: string;
  secretKey: string;
  createdAt: Date;
}): StripeConnectionSummary {
  return {
    id: conn.id,
    label: conn.label,
    secretKeyLast4: conn.secretKey.slice(-4),
    createdAt: conn.createdAt,
  };
}

async function stripeRequest(
  secretKey: string,
  path: string,
  init: { method?: string; body?: URLSearchParams } = {},
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const res = await fetchWithTimeout(
    `${STRIPE_API_BASE}${path}`,
    {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        ...(init.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: init.body,
    },
    STRIPE_TIMEOUT_MS,
    STRIPE_ALLOWED_HOSTS,
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
  } catch (err) {
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
