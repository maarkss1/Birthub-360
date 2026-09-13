import { fetchWithTimeout } from '../../../lib/http.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';
import { assertSafeExternalUrl, safeFetch } from '../../../shared/security/urlGuard.js';

export interface SlackConnectionInput {
  label?: string;
  webhookUrl?: string;
  botToken?: string;
  defaultChannel?: string;
}

export interface SlackConnectionSummary {
  id: string;
  label: string;
  hasWebhook: boolean;
  hasBotToken: boolean;
  defaultChannel: string | null;
  createdAt: Date;
}

function toSummary(conn: {
  id: string;
  label: string;
  webhookUrl: string | null;
  botToken: string | null;
  defaultChannel: string | null;
  createdAt: Date;
}): SlackConnectionSummary {
  return {
    id: conn.id,
    label: conn.label,
    hasWebhook: !!conn.webhookUrl,
    hasBotToken: !!conn.botToken,
    defaultChannel: conn.defaultChannel,
    createdAt: conn.createdAt,
  };
}

/** Lista as conexões Slack desta organização (nunca expõe webhookUrl/botToken em texto puro). */
export async function listSlackConnections(
  organizationId: string,
): Promise<SlackConnectionSummary[]> {
  const connections = await prisma.slackConnection.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
  return connections.map(toSummary);
}

/**
 * Cadastra uma conexão Slack — Incoming Webhook OU Bot Token (chat.postMessage), pelo menos um dos
 * dois é obrigatório. `webhookUrl` é uma URL de tenant (colada pelo próprio usuário a partir do
 * Slack dele), por isso validada contra SSRF antes de persistir — mesmo padrão de
 * BitrixConnection.webhookUrl/ThreeCXConnection.pbxUrl.
 */
export async function connectSlack(
  organizationId: string,
  input: SlackConnectionInput,
): Promise<SlackConnectionSummary> {
  const webhookUrl = input.webhookUrl?.trim() || undefined;
  const botToken = input.botToken?.trim() || undefined;

  if (!webhookUrl && !botToken) {
    throw new AppError(
      'Informe a URL do Incoming Webhook do Slack ou um Bot Token (chat.postMessage).',
      400,
    );
  }

  if (webhookUrl) {
    await assertSafeExternalUrl(webhookUrl);
  }

  const connection = await prisma.slackConnection.create({
    data: {
      organizationId,
      label: input.label?.trim() || 'Slack',
      webhookUrl,
      botToken,
      defaultChannel: input.defaultChannel?.trim() || null,
    },
  });

  logger.info(
    { organizationId, connectionId: connection.id },
    '[slack] Conexão Slack cadastrada com sucesso',
  );

  return toSummary(connection);
}

/** Remove uma conexão Slack (deleteMany já escopado por organizationId — nunca apaga de outro tenant). */
export async function disconnectSlack(organizationId: string, connectionId: string): Promise<void> {
  await prisma.slackConnection.deleteMany({ where: { id: connectionId, organizationId } });
  logger.info({ organizationId, connectionId }, '[slack] Conexão Slack removida');
}

export interface SlackMessageResult {
  success: boolean;
  messageId: string;
  channel: string | null;
  timestamp: string;
}

/**
 * Envia uma mensagem real ao Slack — via Incoming Webhook (URL de tenant, revalidada contra SSRF
 * imediatamente antes do fetch, mesmo padrão de test3CXConnection/make3CXCall: fecha a janela de
 * DNS rebinding entre o cadastro e o uso real) ou via Bot Token (chat.postMessage, destino FIXO
 * slack.com — usa fetchWithTimeout com allowlist, não o guard de SSRF de URL de tenant).
 *
 * Nunca reporta sucesso sem uma resposta HTTP real ok do Slack — mesma honestidade de
 * make3CXCall (threecx.service.ts): erro do Slack propaga como AppError com o motivo real.
 */
export async function sendSlackMessage(
  organizationId: string,
  connectionId: string,
  text: string,
  channel?: string,
): Promise<SlackMessageResult> {
  const connection = await prisma.slackConnection.findFirst({
    where: { id: connectionId, organizationId },
  });
  if (!connection) throw new AppError('Conexão Slack não encontrada.', 404);
  if (!text.trim()) throw new AppError('Mensagem vazia.', 400);

  const timestamp = new Date().toISOString();

  if (connection.webhookUrl) {
    await assertSafeExternalUrl(connection.webhookUrl);
    const res = await safeFetch(connection.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn(
        { organizationId, connectionId, status: res.status },
        '[slack] Incoming Webhook respondeu erro',
      );
      throw new AppError(
        `Slack respondeu com erro (HTTP ${res.status}): ${body.slice(0, 200)}`,
        502,
      );
    }
    logger.info({ organizationId, connectionId }, '[slack] Mensagem enviada via Incoming Webhook');
    return {
      success: true,
      messageId: `slack-wh-${Date.now()}`,
      channel: channel ?? null,
      timestamp,
    };
  }

  if (connection.botToken) {
    const targetChannel = channel?.trim() || connection.defaultChannel;
    if (!targetChannel) {
      throw new AppError('Informe um canal — esta conexão não tem canal padrão configurado.', 400);
    }

    const res = await fetchWithTimeout(
      'https://slack.com/api/chat.postMessage',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel: targetChannel, text }),
      },
      10_000,
      ['slack.com'],
    );

    const data = (await res.json()) as { ok: boolean; ts?: string; error?: string };
    if (!res.ok || !data.ok) {
      logger.warn(
        { organizationId, connectionId, error: data.error },
        '[slack] chat.postMessage respondeu erro',
      );
      throw new AppError(`Slack respondeu com erro: ${data.error ?? `HTTP ${res.status}`}`, 502);
    }

    logger.info({ organizationId, connectionId }, '[slack] Mensagem enviada via Bot Token');
    return {
      success: true,
      messageId: data.ts ?? `slack-${Date.now()}`,
      channel: targetChannel,
      timestamp,
    };
  }

  throw new AppError('Conexão Slack sem webhookUrl nem botToken configurados.', 400);
}

/** Testa a conexão enviando uma mensagem de teste real — mesmo espírito de test3CXConnection: o
 * resultado reflete a resposta real do Slack, nunca um sucesso fabricado. */
export async function testSlackConnection(
  organizationId: string,
  connectionId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await sendSlackMessage(
      organizationId,
      connectionId,
      '✅ Teste de conexão do Birth Hub 360 — se você está vendo isto, a integração está funcionando.',
    );
    return { success: true, message: 'Mensagem de teste enviada com sucesso.' };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: 'Falha ao enviar mensagem de teste ao Slack.' };
  }
}
