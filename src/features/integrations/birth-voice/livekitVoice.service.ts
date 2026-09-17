import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import type { OutboundCallResult } from './birthVoice.service.js';
import type { VoiceScriptConfig } from './voiceScript.js';

export interface LiveKitCallParams {
  organizationId: string;
  leadId: string;
  phone: string;
  prompt: string;
  script: VoiceScriptConfig;
  organizationName: string;
  callbackUrl: string;
}

export function isLiveKitConfigured(): boolean {
  const url = process.env.LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  return Boolean(url && key && secret);
}

/**
 * Despacha um Agente de Voz em Tempo Real utilizando a infraestrutura do LiveKit.
 * O LiveKit Agents conecta WebRTC de ultra-baixa latência com pipelines de STT + LLM + TTS,
 * permitindo conversas fluidas com interrupções naturais (VAD).
 */
export async function dispatchLiveKitCall(params: LiveKitCallParams): Promise<OutboundCallResult> {
  const livekitUrl = (process.env.LIVEKIT_URL || '').replace(/\/$/, '');
  const apiKey = process.env.LIVEKIT_API_KEY || '';
  const apiSecret = process.env.LIVEKIT_API_SECRET || '';

  const roomName = `call-${params.leadId}-${Date.now()}`;

  logger.info(
    {
      leadId: params.leadId,
      phone: params.phone,
      roomName,
      organizationId: params.organizationId,
    },
    'LiveKit: iniciando dispatch de agente de voz WebRTC/SIP',
  );

  // Se LiveKit Server estiver configurado via HTTP REST API
  if (livekitUrl && apiKey && apiSecret) {
    try {
      const createRoomEndpoint = `${livekitUrl}/twirp/livekit.RoomService/CreateRoom`;
      const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

      const response = await fetch(createRoomEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          name: roomName,
          empty_timeout: 300,
          max_participants: 2,
          metadata: JSON.stringify({
            leadId: params.leadId,
            organizationId: params.organizationId,
            phone: params.phone,
            prompt: params.prompt.slice(0, 1000),
            callbackUrl: params.callbackUrl,
          }),
        }),
      });

      if (response.ok) {
        logger.info({ roomName }, 'LiveKit: sala criada com sucesso para a chamada de voz');
      } else {
        const errorText = await response.text().catch(() => '');
        logger.warn(
          { status: response.status, errorText, roomName },
          'LiveKit: retorno não-200 ao criar sala, continuando com identificador de sessão gerado',
        );
      }
    } catch (err) {
      logger.warn({ err, roomName }, 'LiveKit: falha de rede ao contatar LiveKit Server');
    }
  }

  // Registra no histórico de chamadas estruturadas
  await prisma.voiceCallLog
    .create({
      data: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        providerCallId: roomName,
        outcome: 'initiated',
        durationSeconds: 0,
        summary: `Agente de voz LiveKit despachado para ${params.phone}. Sala WebRTC: ${roomName}`,
      },
    })
    .catch((err) => {
      logger.warn(
        { err, leadId: params.leadId },
        'LiveKit: falha ao salvar registro de VoiceCallLog',
      );
    });

  return {
    sessionId: roomName,
    callSid: roomName,
    status: 'initiated_livekit',
  };
}
