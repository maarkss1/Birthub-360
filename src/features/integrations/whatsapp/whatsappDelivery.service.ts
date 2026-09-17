import { logger } from '../../../lib/logger.js';
import { isEvolutionConfigured, sendEvolutionTextMessage } from './evolutionApi.service.js';
import { type SendWhatsAppMessageContext, sendWhatsAppMessage } from './whatsapp.service.js';
import { persistWhatsAppMessage } from './whatsappMessage.service.js';

export interface DeliverWhatsAppOptions {
  organizationId: string;
  number: string;
  text: string;
  buttons?: string[];
  context?: SendWhatsAppMessageContext;
}

export interface DeliverWhatsAppResult {
  success: boolean;
  provider: 'evolution' | 'baileys';
  messageId?: string;
  error?: string;
}

/**
 * Ponto de entrega unificado para envio de mensagens WhatsApp.
 * Prioriza Evolution API (gateway multi-instância resiliente) se configurada,
 * com fallback para conexão direta via Baileys.
 */
export async function deliverWhatsAppMessage(
  options: DeliverWhatsAppOptions,
): Promise<DeliverWhatsAppResult> {
  const { organizationId, number, text, buttons, context } = options;

  // 1. Tenta Evolution API se estiver habilitada no ambiente
  if (isEvolutionConfigured()) {
    try {
      logger.info(
        { organizationId, number },
        'WhatsApp Delivery: roteando mensagem via Evolution API',
      );

      const evolutionResult = await sendEvolutionTextMessage({
        organizationId,
        to: number,
        text,
      });

      if (evolutionResult.success) {
        const waMessageId = evolutionResult.messageId || `evo_${Date.now()}`;

        // Persiste no banco de dados para timeline e auditoria
        await persistWhatsAppMessage({
          organizationId,
          waMessageId,
          direction: 'outbound',
          remoteJid: `${number.replace(/\D/g, '')}@s.whatsapp.net`,
          body: text,
        }).catch((err) => {
          logger.warn(
            { err, waMessageId },
            'WhatsApp Delivery: falha ao persistir outbound Evolution no banco',
          );
        });

        return {
          success: true,
          provider: 'evolution',
          messageId: waMessageId,
        };
      }

      logger.warn(
        { err: evolutionResult.error, organizationId },
        'WhatsApp Delivery: falha na Evolution API, tentando fallback para Baileys',
      );
    } catch (evoError) {
      logger.warn(
        { err: evoError, organizationId },
        'WhatsApp Delivery: exceção na Evolution API, tentando fallback para Baileys',
      );
    }
  }

  // 2. Fallback / Envio padrão via Baileys direto
  logger.info(
    { organizationId, number },
    'WhatsApp Delivery: roteando mensagem via Baileys direto',
  );

  await sendWhatsAppMessage(organizationId, number, text, buttons, context);

  return {
    success: true,
    provider: 'baileys',
  };
}
