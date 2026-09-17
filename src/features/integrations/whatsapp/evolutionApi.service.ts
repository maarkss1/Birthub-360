import { logger } from '../../../lib/logger.js';
import { toE164BR } from '../../../lib/phone.js';

export interface EvolutionSendMessageOptions {
  to: string;
  text: string;
  instanceName?: string;
  organizationId?: string;
}

export interface EvolutionSendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EvolutionInstanceStatus {
  instance: string;
  state: 'open' | 'close' | 'connecting' | 'unknown';
}

function getEvolutionConfig() {
  const baseUrl = (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY || '';
  const defaultInstance = process.env.EVOLUTION_INSTANCE_NAME || 'birthub';

  return {
    baseUrl,
    apiKey,
    defaultInstance,
    isConfigured: Boolean(baseUrl && apiKey),
  };
}

export function isEvolutionConfigured(): boolean {
  return getEvolutionConfig().isConfigured;
}

/**
 * Envia uma mensagem de texto pelo WhatsApp utilizando a Evolution API v1/v2.
 */
export async function sendEvolutionTextMessage(
  options: EvolutionSendMessageOptions,
): Promise<EvolutionSendMessageResult> {
  const config = getEvolutionConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      error: 'Evolution API não configurada (EVOLUTION_API_URL ou EVOLUTION_API_KEY ausente).',
    };
  }

  const instance = options.instanceName || config.defaultInstance;
  const rawPhone = options.to.replace(/\D/g, '');
  const phone = toE164BR(rawPhone) || rawPhone;

  const url = `${config.baseUrl}/message/sendText/${encodeURIComponent(instance)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.apiKey,
      },
      body: JSON.stringify({
        number: phone,
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: false,
        },
        textMessage: {
          text: options.text,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      logger.error(
        { status: response.status, instance, errorText },
        'Evolution API: erro ao enviar mensagem',
      );
      return {
        success: false,
        error: `Evolution API retornou status ${response.status}: ${errorText.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as {
      key?: { id?: string };
      message?: { conversation?: string };
    };

    const messageId = data?.key?.id;

    logger.info(
      { instance, phone, messageId, organizationId: options.organizationId },
      'Evolution API: mensagem enviada com sucesso',
    );

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      { err: error, instance, phone },
      'Evolution API: exceção de rede ao enviar mensagem',
    );
    return {
      success: false,
      error: `Exceção de rede: ${errMessage}`,
    };
  }
}

/**
 * Consulta o estado de conexão de uma instância na Evolution API.
 */
export async function checkEvolutionInstanceStatus(
  instanceName?: string,
): Promise<EvolutionInstanceStatus> {
  const config = getEvolutionConfig();
  const instance = instanceName || config.defaultInstance;

  if (!config.isConfigured) {
    return { instance, state: 'unknown' };
  }

  const url = `${config.baseUrl}/instance/connectionState/${encodeURIComponent(instance)}`;

  try {
    const response = await fetch(url, {
      headers: {
        apikey: config.apiKey,
      },
    });

    if (!response.ok) {
      return { instance, state: 'unknown' };
    }

    const data = (await response.json()) as {
      instance?: { state?: string };
      state?: string;
    };

    const rawState = data?.instance?.state || data?.state || 'unknown';
    const state = ['open', 'close', 'connecting'].includes(rawState)
      ? (rawState as 'open' | 'close' | 'connecting')
      : 'unknown';

    return { instance, state };
  } catch {
    return { instance, state: 'unknown' };
  }
}
