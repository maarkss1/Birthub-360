import express, { type Request, type Response, Router } from 'express';
import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { toE164BR } from '../../../lib/phone.js';
import { prisma } from '../../../lib/prisma.js';
import {
  claimWebhookDelivery,
  webhookDeliveryFingerprint,
} from '../../../shared/security/webhookReplayGuard.js';
import { persistWhatsAppMessage } from '../whatsapp/whatsappMessage.service.js';
import { type ChatwootWebhookEvent, isValidChatwootSignature } from './chatwoot.helpers.js';

/**
 * Webhook de ENTRADA do Chatwoot (OS-6, docker-compose.services.yml) — hoje só valida a
 * assinatura e registra o evento em log; não escreve nada no CRM. Decidir COMO uma conversa do
 * Chatwoot deveria virar lead/contato/atividade é uma decisão de produto (criar automaticamente?
 * só quando o inbox é X? qual contato bate com qual lead?) que ainda não foi tomada — ver plano
 * de rollout dos 50 open-sources. Isto só prova que a entrega é autêntica e chega até aqui.
 */
async function handleWebhook(req: Request, res: Response): Promise<void> {
  const secret = env.CHATWOOT_WEBHOOK_SECRET;
  if (!secret) {
    // Fail-closed: mesmo padrão de todo webhook de entrada deste projeto (ver birthVoice.webhook.ts)
    // — sem segredo não há como distinguir o Chatwoot de qualquer um que descubra esta URL.
    logger.error('Webhook do Chatwoot recebido, mas CHATWOOT_WEBHOOK_SECRET não está configurado.');
    res.status(503).json({ success: false, error: 'Webhook não configurado.' });
    return;
  }

  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    logger.error(
      'Webhook do Chatwoot sem corpo bruto — a rota precisa ser montada antes do express.json().',
    );
    res.status(500).json({ success: false, error: 'Configuração de rota inválida.' });
    return;
  }

  const signatureHeader = req.header('x-chatwoot-signature');
  const timestampHeader = req.header('x-chatwoot-timestamp');
  if (!isValidChatwootSignature({ rawBody, signatureHeader, timestampHeader, secret })) {
    logger.warn(
      'Webhook do Chatwoot com assinatura inválida ou timestamp fora da janela — descartado.',
    );
    res.status(401).json({ success: false, error: 'Assinatura inválida.' });
    return;
  }

  // A assinatura já é função do corpo + timestamp — reenvio idêntico produz o mesmo fingerprint.
  const replayCheck = await claimWebhookDelivery(
    'chatwoot',
    webhookDeliveryFingerprint(signatureHeader),
  );
  if (replayCheck === 'replay') {
    res.status(200).json({ success: true, outcome: 'duplicate-delivery' });
    return;
  }

  let event: ChatwootWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    res.status(400).json({ success: false, error: 'Corpo não é JSON válido.' });
    return;
  }

  logger.info(
    {
      event: event.event ?? null,
      conversationId: event.conversation?.id ?? null,
      inboxId: event.conversation?.inbox_id ?? null,
      accountId: event.account?.id ?? null,
    },
    'Webhook do Chatwoot recebido e autenticado.',
  );

  // Sincronização bidirecional: mensagens recebidas viram WhatsAppMessage e alimentam o Negociador de IA
  let outcome = 'logged';
  if (
    event.event === 'message_created' &&
    (event.message_type === 'incoming' || event.sender?.type === 'contact')
  ) {
    const rawPhone = event.sender?.phone_number || event.conversation?.meta?.sender?.phone_number;

    if (rawPhone) {
      const phoneE164 = toE164BR(rawPhone.replace(/\D/g, ''));
      if (phoneE164) {
        try {
          const org = await prisma.organization.findFirst({
            select: { id: true },
            orderBy: { createdAt: 'asc' },
          });

          if (org) {
            const waMessageId = `cw_${event.id || Date.now()}`;
            await persistWhatsAppMessage({
              organizationId: org.id,
              waMessageId,
              direction: 'inbound',
              remoteJid: `${phoneE164.replace(/\D/g, '')}@s.whatsapp.net`,
              body: event.content || '',
            });
            outcome = 'persisted_to_crm';
            logger.info(
              { conversationId: event.conversation?.id, phoneE164, waMessageId },
              'Mensagem do Chatwoot sincronizada com o CRM e encaminhada para IA',
            );
          }
        } catch (err) {
          logger.error({ err }, 'Falha ao sincronizar mensagem do Chatwoot no CRM');
        }
      }
    }
  }

  res.status(200).json({ success: true, outcome });
}

const router = Router();

// express.raw porque a assinatura HMAC é calculada sobre os bytes exatos do corpo (junto com o
// timestamp). Esta rota é montada antes do express.json() global em src/bootstrap/webhooks.ts.
router.post('/webhook', express.raw({ type: '*/*', limit: '1mb' }), handleWebhook);

export const chatwootWebhookRoutes = router;
