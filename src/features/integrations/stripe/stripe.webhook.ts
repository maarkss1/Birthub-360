import express, { type Request, type Response, Router } from 'express';
import { requestContext } from '../../../lib/async-context.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { routeParam } from '../../../shared/http/routeParams.js';
import {
  claimWebhookDelivery,
  webhookDeliveryFingerprint,
} from '../../../shared/security/webhookReplayGuard.js';
import { isValidStripeSignature, type StripeWebhookEvent } from './stripe.helpers.js';

// ── Webhook de ENTRADA da Stripe (BILLING-007) ──────────────────────────────────────────────────
//
// Eventos assíncronos de pagamento (confirmação, estorno, falha) não tinham receiver nenhum antes
// desta rota — createStripeCharge/getStripeCharge só cobrem o caminho síncrono (criar/consultar),
// nunca sabem quando um PaymentIntent muda de estado depois. Mesmo espírito de chatwoot.webhook.ts:
// esta rota prova autenticidade (assinatura HMAC da Stripe) e loga estruturado; decidir COMO um
// evento vira uma atualização real de Fatura/CrmCommercialDocument é a reconciliação de
// BILLING-003 (ainda não construída, próximo item desta onda) — inventar esse vínculo aqui, sem o
// relacionamento Fatura↔cobrança que BILLING-003 é quem vai criar, seria um contrato de negócio
// fabricado.
//
// Autenticidade por CONEXÃO, não por env global: cada organização tem sua própria conta Stripe,
// então o segredo de assinatura é por StripeConnection (`webhookSecret`) — mesmo raciocínio de
// BitrixConnection.webhookSecret (bitrix.webhook.ts), só que aqui o segredo vem DA Stripe (colado
// por quem cria o endpoint no Dashboard dela), não gerado por nós.

const EVENTS_OF_INTEREST = new Set([
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
]);

async function handleWebhook(req: Request, res: Response): Promise<void> {
  const connectionId = routeParam(req.params.connectionId, 'connectionId');
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    logger.error(
      'Webhook do Stripe sem corpo bruto — a rota precisa ser montada antes do express.json().',
    );
    res.status(500).json({ success: false, error: 'Configuração de rota inválida.' });
    return;
  }

  // bypassRls só cobre ESTE lookup por id (ver allowlist em src/lib/prisma.ts) — não há tenant
  // conhecido ainda nesta linha, só o connectionId da URL. Mesmo padrão de bitrix.webhook.ts.
  const connection = await requestContext.run({ bypassRls: true }, () =>
    prisma.stripeConnection.findUnique({ where: { id: connectionId } }),
  );

  if (!connection?.webhookSecret) {
    // 404 genérico — não confirma nem nega se o connectionId existe, para não dar pista a quem
    // estiver testando URLs às cegas (mesmo raciocínio de bitrix.webhook.ts).
    res.status(404).json({ success: false, error: 'Não encontrado.' });
    return;
  }

  const signatureHeader = req.header('stripe-signature');
  if (!isValidStripeSignature({ rawBody, signatureHeader, secret: connection.webhookSecret })) {
    logger.warn(
      { connectionId },
      '[stripe] Webhook de entrada com assinatura inválida ou timestamp fora da janela — descartado',
    );
    res.status(401).json({ success: false, error: 'Assinatura inválida.' });
    return;
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    res.status(400).json({ success: false, error: 'Corpo não é JSON válido.' });
    return;
  }

  if (!event.id || !event.type) {
    res.status(200).json({ success: true, ignored: 'evento sem id/type' });
    return;
  }

  // A assinatura já prova autenticidade; o id do evento (estável mesmo em reentrega, garantido
  // pela própria Stripe) já basta como fingerprint — mesmo raciocínio de webhookDeliveryFingerprint
  // nos outros webhooks deste projeto.
  const replayCheck = await claimWebhookDelivery(
    'stripe',
    webhookDeliveryFingerprint(connectionId, event.id),
  );
  if (replayCheck === 'replay') {
    res.status(200).json({ success: true, outcome: 'duplicate-delivery' });
    return;
  }

  if (!EVENTS_OF_INTEREST.has(event.type)) {
    // Eventos que não tratamos ainda (ex.: customer.created) são aceitos de propósito — devolver
    // erro faria o Dashboard da Stripe mostrar o endpoint como "falhando" por eventos que nunca
    // vamos processar. Mesmo padrão de bitrix.webhook.ts/birthVoice.webhook.ts.
    res.status(200).json({ success: true, ignored: event.type });
    return;
  }

  const object = (event.data?.object ?? {}) as Record<string, unknown>;
  logger.info(
    {
      organizationId: connection.organizationId,
      connectionId,
      eventId: event.id,
      eventType: event.type,
      paymentIntentId: object.id ?? null,
    },
    '[stripe] Webhook de pagamento recebido e autenticado (sem reconciliação com Fatura ainda — BILLING-003)',
  );

  res.status(200).json({ success: true, outcome: 'logged' });
}

const router = Router();

// express.raw porque a assinatura HMAC da Stripe é calculada sobre os bytes exatos do corpo, que o
// parser JSON global consumiria — esta rota é montada antes do express.json() em
// src/bootstrap/webhooks.ts, mesmo padrão do Chatwoot/Bitrix/Birth Voices.
router.post('/webhook/:connectionId', express.raw({ type: '*/*', limit: '1mb' }), handleWebhook);

export const stripeWebhookRoutes = router;
