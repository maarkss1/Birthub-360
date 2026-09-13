import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { assertSafeExternalUrl, safeFetch } from '../../../shared/security/urlGuard.js';
import { assertPiiExternalConsent } from '../../intelligence/services/guardrails.service.js';
import { buildVoicePromptForLead } from './atlasProductPlaybook.js';
import { pickCallablePhone } from './birthVoice.helpers.js';
import { isSuppressed } from './callSuppression.service.js';

/** Caminho do webhook que o Birth Voices Hub chama com o resultado da ligação. */
export const CALL_RESULT_WEBHOOK_PATH = '/api/integrations/birth-voice/webhook';

const REQUEST_TIMEOUT_MS = 10_000;

export class BirthVoiceNotConfiguredError extends Error {}
export class NoPhoneNumberError extends Error {}
/** O número está na lista interna de bloqueio (opt-out). Não é falha: é a regra funcionando. */
export class SuppressedNumberError extends Error {}

export interface OutboundCallResult {
  sessionId: string;
  callSid: string;
  status: string;
}

/**
 * Resolve a configuração de voz para esta organização — prioriza uma `VoiceHubConnection`
 * cadastrada pela tela de Integrações (`voiceHubConnection.service.ts`) e cai para as variáveis
 * de ambiente globais (`BIRTH_VOICES_URL`/`API_KEY`/`AGENT_ID`) quando não há nenhuma conexão
 * habilitada — mesmo espírito de compatibilidade retroativa de qualquer migração de config global
 * para por-tenant neste produto (ex.: `BitrixConnection`). `orderBy: createdAt asc` quando há mais
 * de uma conexão cadastrada: a primeira criada vence, sem roteamento por tipo de agente ainda (ver
 * comentário do model em `prisma/schema.prisma`).
 */
async function requireConfig(organizationId: string) {
  const connection = await prisma.voiceHubConnection.findFirst({
    where: { organizationId, enabled: true },
    orderBy: { createdAt: 'asc' },
  });

  const baseUrl = (connection?.baseUrl ?? env.BIRTH_VOICES_URL)?.replace(/\/$/, '');
  const apiKey = connection?.apiKey ?? env.BIRTH_VOICES_API_KEY;
  const agentId = connection?.agentId ?? env.BIRTH_VOICES_AGENT_ID;
  const publicBaseUrl = env.PUBLIC_BASE_URL?.replace(/\/$/, '');
  const missing = [
    !baseUrl && 'BIRTH_VOICES_URL (ou uma conexão cadastrada em Integrações)',
    !apiKey && 'BIRTH_VOICES_API_KEY (ou uma conexão cadastrada em Integrações)',
    !agentId && 'BIRTH_VOICES_AGENT_ID (ou uma conexão cadastrada em Integrações)',
    !publicBaseUrl && 'PUBLIC_BASE_URL',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new BirthVoiceNotConfiguredError(
      `SDR de voz não configurado. Faltando: ${missing.join(', ')}.`,
    );
  }

  if (!baseUrl || !apiKey || !agentId || !publicBaseUrl) {
    throw new BirthVoiceNotConfiguredError('SDR de voz não configurado.');
  }

  return {
    baseUrl,
    apiKey,
    agentId,
    callbackUrl: `${publicBaseUrl}${CALL_RESULT_WEBHOOK_PATH}`,
  };
}

interface LeadContactish {
  name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
}
interface LeadCompanyish {
  tradeName?: string | null;
  legalName?: string | null;
  phones?: string[] | null;
}

import { z } from 'zod';

const birthVoiceResponseSchema = z
  .object({
    call_id: z.string().optional(),
    sessionId: z.string().optional(),
    callSid: z.string().optional(),
    status: z.string().optional(),
  })
  .catchall(z.unknown());

/**
 * Pede ao Birth Voices Hub que ligue para o decisor deste lead.
 *
 * Retorna assim que a ligação é aceita — o resultado (atendeu, transcrição, duração) chega depois,
 * de forma assíncrona, no webhook em CALL_RESULT_WEBHOOK_PATH.
 */
export type VoiceAgentType = 'sdr' | 'nps' | 'reactivation';

export async function callLead(
  organizationId: string,
  leadId: string,
  agentType: VoiceAgentType = 'sdr',
): Promise<OutboundCallResult> {
  const config = await requireConfig(organizationId);

  // Mesmo gate fail-closed já em vigor para os agentes de texto (guardrails.service.ts,
  // AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS) — até esta correção, a ligação de voz enviava
  // nome/telefone/empresa do contato ao provedor externo (Birth Voices Hub/Bland AI) sem passar
  // por essa checagem, mesmo classe de dado pessoal que os outros caminhos já protegem.
  assertPiiExternalConsent(organizationId);

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: { contact: true, company: true },
  });
  if (!lead) throw new Error('Lead não encontrado.');

  const targetNumber = pickCallablePhone(
    lead.contact as LeadContactish | null,
    lead.company as LeadCompanyish | null,
  );
  if (!targetNumber) {
    throw new NoPhoneNumberError('Lead sem telefone em formato discável.');
  }

  // Checado aqui, e não só na tela, porque este é o último ponto por onde toda ligação passa:
  // rota manual, automação e (futuramente) o worker de prospecção fria. Um opt-out que só fosse
  // respeitado pela UI seria contornado pela primeira campanha automática.
  //
  // leadId/email do próprio lead entram como contexto para o opt-out unificado entre canais
  // (`isSuppressed` também consulta `OptOutRecord`, não só `CallSuppression`) — sem isso, um
  // opt-out registrado só por e-mail (05) ou WhatsApp (06), sem o mesmo telefone em comum, não
  // seria encontrado aqui.
  if (
    await isSuppressed(organizationId, targetNumber, {
      leadId: lead.id,
      email: (lead.contact as LeadContactish | null)?.email ?? null,
    })
  ) {
    throw new SuppressedNumberError(
      'Número na lista interna de bloqueio (opt-out): a ligação não foi disparada.',
    );
  }

  const company = lead.company as LeadCompanyish | null;
  const companyName = company?.tradeName ?? company?.legalName ?? null;
  const contactName = (lead.contact as LeadContactish | null)?.name ?? null;

  // BUG DE ROTEAMENTO (achado de auditoria, onda 12): a condição usava
  // `config.baseUrl.includes('bland.ai') || process.env.BLAND_API_KEY` — ou seja, bastava a env
  // BLAND_API_KEY existir no processo (documentada em `.env.example` como "usada quando o baseUrl
  // for bland.ai", nunca como um interruptor global) para TODA ligação passar a ser disparada
  // contra a Bland AI, mesmo com BIRTH_VOICES_URL configurado para o Hub real do cliente. Isso é
  // exatamente a classe de risco do bloqueador #7 (AGENTS.md): a organização configura um
  // provedor, o sistema silenciosamente usa outro, sem erro nem aviso — a ligação até acontece de
  // verdade, só que pelo provedor errado, com o agente/voz/prompt errados e sem o
  // `callbackUrl`/contexto que o Birth Voices Hub esperaria. A escolha de provedor agora depende
  // só do que foi configurado explicitamente em BIRTH_VOICES_URL, como o contrato documentado
  // sempre descreveu.
  const isBland = config.baseUrl.includes('bland.ai');
  const endpoint = isBland
    ? 'https://api.bland.ai/v1/calls'
    : `${config.baseUrl}/api/voice/outbound`;
  const apiKeyHeader = isBland
    ? process.env.BLAND_API_KEY || config.apiKey
    : `Bearer ${config.apiKey}`;

  const requestBody = isBland
    ? {
        phone_number: targetNumber,
        task: buildVoicePromptForLead(companyName, contactName),
        language: 'pt-BR',
        voice: 'nat',
        wait_for_greeting: true,
        record: true,
        max_duration: 15,
        request_data: {
          leadId: lead.id,
          organizationId,
          contact_name: contactName,
          company: companyName,
          agent_name: 'Gessica',
        },
      }
    : {
        agentId: config.agentId,
        targetNumber,
        callbackUrl: config.callbackUrl,
        agentType,
        interruption_threshold: 100,
        reduce_latency: true,
        voice: 'nat',
        task: buildVoicePromptForLead(companyName, contactName),
        context: {
          leadId: lead.id,
          organizationId,
          name: contactName,
          company: companyName,
        },
      };

  // SSRF/DNS rebinding (achado de auditoria ACH-06-02): `config.baseUrl` (Hub) vem de uma
  // `VoiceHubConnection` cadastrada por tenant ou da env global — validado uma única vez no
  // cadastro (`connectVoiceHub`), o que deixava aberta a janela clássica de DNS rebinding entre
  // aquela validação e cada chamada real subsequente (o host pode responder um IP público no
  // cadastro e um IP privado agora). Revalida com `assertSafeExternalUrl` a cada chamada e usa
  // `safeFetch`, que fixa a conexão real nos MESMOS endereços validados nesta mesma chamada — mesmo
  // padrão já usado em `threecx.service.ts::make3CXCall`/`test3CXConnection` e no client Bitrix24.
  //
  // O ramo Bland (`https://api.bland.ai/v1/calls`) é um endpoint fixo/hardcoded do provedor, não
  // uma URL de tenant/usuário — mesmo critério documentado em `urlGuard.ts` ("NÃO usar para URLs
  // de provedor fixas/hardcoded... o destino já é conhecido e confiável, não há SSRF ali"), por
  // isso segue usando o `fetch` global, sem o guard.
  let response: Response;
  if (isBland) {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKeyHeader,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } else {
    await assertSafeExternalUrl(endpoint);
    response = await safeFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKeyHeader,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Provedor de Voz recusou a chamada (HTTP ${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const rawData = await response.json();
  const parsed = birthVoiceResponseSchema.safeParse(rawData);
  if (!parsed.success) {
    logger.error(
      { leadId, error: parsed.error, rawData },
      'Resposta inesperada do provedor de Voz',
    );
    throw new Error('Provedor de Voz retornou payload inválido');
  }

  const data = parsed.data;
  const result: OutboundCallResult = {
    sessionId: data.call_id || data.sessionId || `sess-${lead.id}`,
    callSid: data.call_id || data.callSid || `CA_${lead.id}`,
    status: data.status || 'queued',
  };

  logger.info(
    { leadId, sessionId: result.sessionId, callSid: result.callSid },
    'Ligação de SDR enfileirada com sucesso',
  );
  return result;
}
