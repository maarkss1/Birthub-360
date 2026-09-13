import { randomBytes } from 'node:crypto';
import type { VoiceHubConnection } from '@prisma/client';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';
import { assertSafeExternalUrl, safeFetch } from '../../../shared/security/urlGuard.js';

/**
 * CRUD da conexão com o Birth Voices Hub por organização — mesmo padrão de
 * `threecx.service.ts`/`BitrixConnection`. Persistência via Prisma (model `VoiceHubConnection`,
 * `prisma/schema.prisma`); `apiKey` cifrado em repouso de forma transparente pela extensão Prisma
 * em `src/lib/prisma.ts` (ver `ENCRYPTED_FIELDS`). Consumida por `birthVoice.service.ts::
 * requireConfig` — uma conexão cadastrada aqui tem prioridade sobre as env vars globais
 * (`BIRTH_VOICES_URL`/`API_KEY`/`AGENT_ID`), que continuam funcionando como fallback.
 */

export interface VoiceHubConnectionInput {
  label?: string;
  baseUrl: string;
  apiKey?: string;
  agentId?: string;
  enabled?: boolean;
  /** Segredo do webhook de resultado de chamada — opcional na entrada (gerado aleatoriamente em
   *  `connectVoiceHub` quando ausente). Ver comentário do campo no schema (`VoiceHubConnection
   *  .webhookSecret`) e `birthVoice.webhook.ts::handleWebhook` para onde ele é consumido. */
  webhookSecret?: string;
}

export interface VoiceHubConnectionSummary {
  id: string;
  label: string;
  baseUrl: string;
  agentId: string | null;
  enabled: boolean;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  createdAt: Date;
}

function toSummary(conn: VoiceHubConnection): VoiceHubConnectionSummary {
  return {
    id: conn.id,
    label: conn.label,
    baseUrl: conn.baseUrl,
    agentId: conn.agentId,
    enabled: conn.enabled,
    // A API key e o segredo do webhook nunca voltam em texto puro por aqui (mesmo princípio do
    // segredo de webhook do Bitrix, ver Integrations.tsx `revealedWebhookSecret`) — só flags de
    // presença. O segredo do webhook só é exposto uma vez, no retorno de `connectVoiceHub`.
    hasApiKey: !!conn.apiKey,
    hasWebhookSecret: !!conn.webhookSecret,
    createdAt: conn.createdAt,
  };
}

export async function listVoiceHubConnections(
  organizationId: string,
): Promise<VoiceHubConnectionSummary[]> {
  const connections = await prisma.voiceHubConnection.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
  return connections.map(toSummary);
}

/**
 * Conecta um novo Birth Voices Hub e devolve o segredo do webhook em texto puro UMA vez (mesmo
 * padrão de `regenerateWebhookSecret` do Bitrix, `bitrix/service/connections.ts`) — chamadas
 * seguintes (`listVoiceHubConnections`) só confirmam presença via `hasWebhookSecret`, nunca o
 * valor. Isolamento de tenant do webhook (`birthVoice.webhook.ts::handleWebhook`) depende deste
 * segredo ser por conexão em vez de um único segredo global compartilhado entre organizações.
 */
export async function connectVoiceHub(
  organizationId: string,
  input: VoiceHubConnectionInput,
): Promise<VoiceHubConnectionSummary & { webhookSecret: string }> {
  if (!input.baseUrl?.trim()) throw new AppError('Informe a URL do Birth Voices Hub.', 400);
  await assertSafeExternalUrl(input.baseUrl);

  // Gera um segredo aleatório quando nenhum é informado — nunca cria conexão sem segredo próprio,
  // senão o webhook desta organização continuaria dependendo só do segredo global.
  const webhookSecret = input.webhookSecret?.trim() || randomBytes(32).toString('hex');

  const created = await prisma.voiceHubConnection.create({
    data: {
      organizationId,
      label: input.label?.trim() || 'Birth Voices Hub',
      baseUrl: input.baseUrl.trim().replace(/\/$/, ''),
      apiKey: input.apiKey?.trim() || undefined,
      agentId: input.agentId?.trim() || undefined,
      enabled: input.enabled ?? true,
      webhookSecret,
    },
  });
  return { ...toSummary(created), webhookSecret };
}

export async function disconnectVoiceHub(
  organizationId: string,
  connectionId: string,
): Promise<void> {
  // deleteMany (não delete) porque o filtro já inclui organizationId — nunca apaga uma conexão
  // de outra organização mesmo que connectionId seja adivinhado/manipulado.
  await prisma.voiceHubConnection.deleteMany({ where: { id: connectionId, organizationId } });
}

export async function testVoiceHubConnection(
  organizationId: string,
  connectionId: string,
): Promise<{ success: boolean; message: string; baseUrl: string }> {
  const conn = await prisma.voiceHubConnection.findFirst({
    where: { id: connectionId, organizationId },
  });
  if (!conn) throw new AppError('Conexão com o Birth Voices Hub não encontrada.', 404);

  await assertSafeExternalUrl(conn.baseUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    // `/health` (liveness, ver DEPLOYMENT.md do Birth Voices Hub) — sem autenticação, então este
    // teste confirma só que a URL responde, NUNCA que a API key/agentId cadastrados são válidos
    // (mesmo cuidado do bug corrigido em test3CXConnection: nunca afirmar mais do que foi
    // verificado de verdade).
    const res = await safeFetch(`${conn.baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    logger.info(
      { organizationId, connectionId, baseUrl: conn.baseUrl, ok: res.ok },
      '[birth-voice] Teste de comunicação com o Hub realizado',
    );
    return {
      success: res.ok,
      message: res.ok
        ? 'Birth Voices Hub respondendo normalmente (apenas conectividade — não confirma API key/agentId).'
        : `Birth Voices Hub respondeu com erro (HTTP ${res.status}).`,
      baseUrl: conn.baseUrl,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.warn(
      { err, organizationId, connectionId, baseUrl: conn.baseUrl },
      '[birth-voice] Falha ao testar comunicação com o Hub',
    );
    return {
      success: false,
      message:
        err instanceof Error && err.name === 'AbortError'
          ? 'Tempo limite esgotado ao tentar contatar o Birth Voices Hub.'
          : 'Não foi possível contatar o Birth Voices Hub.',
      baseUrl: conn.baseUrl,
    };
  } finally {
    clearTimeout(timeout);
  }
}
