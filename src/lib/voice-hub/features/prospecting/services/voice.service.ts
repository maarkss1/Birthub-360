import { logger } from '../../../lib/logger.js';
import type { AtlasGROutboundPayload } from '../validators/atlasgr.schema.js';
import { buildAtlasGROutboundIdempotencyKey, claimIdempotencyKey } from '../lib/webhookIdempotency.js';
import { getAiConsent } from '../../../services/settingService.js';

export interface TriggerOutboundCallResult {
  success: boolean;
  duplicate: boolean;
  message: string;
  callId?: string;
  status?: string;
}

export class BlandConfigurationError extends Error {}
export class ExternalAiConsentRequiredError extends Error {}

interface BlandCallResponse {
  call_id?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

export class VoiceProspectingService {
  /**
   * Configures and triggers an outbound qualification call using Bland AI.
   *
   * Idempotent by design: a redelivered webhook for the same lead (`lead_id` when AtlasGR sends
   * one, otherwise a hash of phone/name/company) is detected via Redis and short-circuited before
   * any request reaches Bland AI.
   *
   * Privacy boundary: AtlasGR/Bland is mapped to one Birth Voices tenant through
   * `ATLASGR_TENANT_ID`. That tenant must have an explicit AI-provider consent record before any
   * lead data is sent to Bland. This avoids treating a server-to-server shared secret as consent.
   */
  async triggerOutboundCall(payload: AtlasGROutboundPayload): Promise<TriggerOutboundCallResult> {
    const apiKey = process.env.BLAND_API_KEY?.trim();
    if (!apiKey) {
      logger.warn('BLAND_API_KEY is not set in the environment');
      throw new BlandConfigurationError('BLAND_API_KEY missing');
    }

    const callbackToken = process.env.BLAND_WEBHOOK_TOKEN?.trim();
    if (!callbackToken) {
      logger.warn('BLAND_WEBHOOK_TOKEN is not set in the environment');
      throw new BlandConfigurationError('BLAND_WEBHOOK_TOKEN missing');
    }

    const webhookBaseUrl = process.env.WEBHOOK_BASE_URL?.trim();
    if (!webhookBaseUrl || !/^https:\/\//i.test(webhookBaseUrl)) {
      logger.warn('WEBHOOK_BASE_URL must be an explicit public HTTPS URL for Bland callbacks');
      throw new BlandConfigurationError('WEBHOOK_BASE_URL missing or insecure');
    }

    const tenantId = process.env.ATLASGR_TENANT_ID?.trim();
    if (!tenantId) {
      logger.warn('ATLASGR_TENANT_ID is required to enforce tenant-scoped AI consent');
      throw new BlandConfigurationError('ATLASGR_TENANT_ID missing');
    }

    const consent = await getAiConsent(tenantId);
    if (!consent.granted) {
      logger.warn('Bland outbound call blocked: tenant has not granted external AI consent', { tenantId });
      throw new ExternalAiConsentRequiredError('AI provider consent required');
    }

    const idempotencyKey = buildAtlasGROutboundIdempotencyKey({
      leadId: payload.lead_id,
      phoneNumber: payload.phone_number,
      name: payload.name,
      company: payload.company,
    });

    // If Redis is unavailable this throws and the route returns 503. Failing closed is safer than
    // risking a duplicate billed call to a real person.
    const claimed = await claimIdempotencyKey(idempotencyKey);
    if (!claimed) {
      logger.info('VoiceProspectingService: duplicate AtlasGR webhook delivery ignored', {
        tenantId,
        leadId: payload.lead_id,
        idempotencyKey,
      });
      return {
        success: true,
        duplicate: true,
        message: 'Esta chamada já havia sido disparada anteriormente para este lead (webhook duplicado ignorado).',
      };
    }

    // Phone number is intentionally omitted from logs. Name/company are sufficient to correlate
    // with the CRM while keeping direct contact data out of the operational log stream.
    logger.info('VoiceProspectingService: Triggering outbound call via Bland AI', {
      tenantId,
      name: payload.name,
      company: payload.company,
      leadId: payload.lead_id,
    });

    try {
      const fromNumber = payload.from || process.env.BLAND_FROM_NUMBER;

      const firstSentence = `Opa, ${payload.name}! Tudo bem com você? Aqui é a Gessica do time de inteligência comercial da Atlas GR, como você está?`;

      const task = `Você é a Gessica, IA de pré-vendas (SDR) da Atlas GR. Seu objetivo é engajar o lead, apresentar as soluções da Atlas GR e agendar uma reunião comercial de 10-15 minutos com um especialista.
Mantenha um tom profissional, amigável, consultivo e direto. Você não é um robô lendo um script, você conversa com naturalidade, faz pausas e escuta o cliente.
Fale OBRIGATORIAMENTE e EXCLUSIVAMENTE em Português do Brasil (pt-BR) com sotaque brasileiro natural. Use expressões naturais do português como 'Ah legal!', 'Entendi perfeitamente', 'Com certeza', 'Faz total sentido'. NUNCA pareça um robô de telemarketing.

# QUEM SOMOS
A Atlas GR nasceu em 2004 e tem mais de 20 anos de experiência protegendo operações de transporte e logística. Hoje atendemos mais de 390 clientes e monitoramos mais de 125 mil viagens por mês.
Temos tecnologia própria e somos homologados por todas as principais seguradoras do mercado.

# NOSSOS PRODUTOS (FOCO DA CONVERSA)
Nós possuímos um ecossistema completo (Gestão de Risco, Logística, Torre de Controle 24/7, Telemetria). Mas hoje nosso grande destaque é o **Atlas Profile**, nossa plataforma de seleção de motoristas:
1. **Atlas Profile (Background Check 100% digital)**:
   - A gente costuma dizer que "o que o currículo não mostra, o Atlas Profile revela".
   - Analisamos antecedentes criminais, cíveis, trabalhistas, situação na Receita Federal, ANTT e validamos a CNH usando **Inteligência Artificial**.
   - Temos a funcionalidade de **Face ID (Biometria Facial e Prova de Vida)** para evitar qualquer fraude de identidade.
   - Totalmente em conformidade com a LGPD. Resposta em até 5 minutos.
2. **CIA (Célula de Inteligência Atlas)**: Para gestão de risco, temos um time especializado em pronta resposta, acionamento policial e recuperação de carga com cases de sucesso gigantes na mídia.

# GATILHOS E ARGUMENTOS (USAR SE NECESSÁRIO)
- **Dor do custo de contratação**: "Contratar no escuro custa caro. Um processo trabalhista pode custar de 15 a 25 mil reais para a transportadora. O Atlas Profile é a barreira final contra a negligência, identificando riscos antes da contratação."
- **Teste Grátis do Atlas Profile**: Ofereça agressivamente! "Estamos com uma campanha onde liberamos um teste grátis: se você agendar a demonstração, nós te damos **duas consultas totalmente gratuitas** para você validar a velocidade e assertividade do Atlas Profile na prática."

# CONTORNO DE OBJEÇÕES
- **"Já uso outra ferramenta / Já tenho GR"**: "Entendo perfeitamente! Grande parte dos nossos clientes de hoje também já usavam outra ferramenta. O que nos diferencia é a nossa inteligência artificial que unifica todas as esferas (Detran, Receita, Tribunais) em um único painel e a biometria facial, reduzindo o turnover e passivo trabalhista. Faz sentido darmos só uma olhada juntos?"
- **"Estamos cortando custos"**: "Justamente por isso te liguei! Uma contratação errada ou um sinistro geram um rombo financeiro imenso. O Atlas Profile reduz drasticamente ações trabalhistas e roubos. E para te provar, eu te dou 2 consultas de graça na nossa call de demonstração."
- **"Não posso falar agora / Estou ocupado / Não tenho tempo"**: "Puxa, sem problemas! Peço desculpas pela interrupção. Posso te retornar mais tarde ou te mandar uma mensagem rápida no WhatsApp?"

# DIRETRIZES DA CHAMADA
- Comece de forma calorosa. Verifique se é um bom momento.
- **Respeito ao tempo**: Se o lead disser que não pode falar, está ocupado, dirigindo ou em reunião, **NÃO** tente forçar o agendamento de uma reunião comercial ou insistir. Diga imediatamente algo como: "Sem problemas, te retorno mais tarde" ou pergunte se pode enviar um WhatsApp. Seja extremamente natural e empática com o momento dele.
- Identifique se a pessoa sofre com alto turnover de motoristas, processos trabalhistas ou sinistros por falha humana.
- Colete as dores principais. Venda a **reunião de 10 minutos** somente se o lead estiver disponível e engajado. Mencione o "Teste Grátis com 2 consultas".
- Encerre confirmando dia e horário, e avise que o especialista enviará o link da sala.

DADOS DO LEAD ATUAL:
Empresa: ${payload.company}
Pessoa de Contato: ${payload.name}
`;

      const callPayload: Record<string, unknown> = {
        phone_number: payload.phone_number,
        first_sentence: firstSentence,
        task,
        language: 'pt-BR',
        voice: 'nat',
        model: 'enhanced',
        temperature: 0.7,
        interruption_threshold: 100,
        answered_by_enabled: true,
        reduce_latency: true,
        // Recording is a separate privacy decision. It is opt-in instead of silently enabled for
        // every prospect call; production operators must explicitly configure and document it.
        record: process.env.BLAND_RECORD_CALLS === 'true',
        retry: {
          max_attempts: 2,
        },
        webhook: `${webhookBaseUrl.replace(/\/$/, '')}/api/webhooks/bland/${callbackToken}`,
        analysis_schema: {
          solicitou_material: 'boolean - true se o lead pediu, concordou ou sugeriu receber apresentação, material ou contato pelo WhatsApp ou E-mail.',
          canal_preferido: "string - o canal que o lead preferiu ('whatsapp', 'email') ou 'nenhum' se ele não aceitou nada.",
        },
      };

      if (fromNumber) {
        callPayload.from = fromNumber;
      }

      const response = await fetch('https://api.bland.ai/v1/calls', {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(callPayload),
      });

      const responseText = await response.text();
      let data: BlandCallResponse = {};
      try {
        const parsed = JSON.parse(responseText) as unknown;
        data = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? parsed as BlandCallResponse
          : { message: responseText };
      } catch {
        data = { message: responseText };
      }

      if (!response.ok) {
        logger.error('Failed to trigger call via Bland AI', { status: response.status, body: data });
        throw new Error(data.message || `Bland AI call failed with status ${response.status}`);
      }

      logger.info('Call successfully dispatched via Bland AI', { tenantId, callId: data.call_id, status: data.status });

      return {
        success: true,
        duplicate: false,
        message: 'Outbound call triggered successfully via Bland AI',
        callId: data.call_id,
        status: data.status,
      };
    } catch (error) {
      logger.error('Error triggering voice call', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const voiceProspectingService = new VoiceProspectingService();
