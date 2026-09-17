import { z } from 'zod';
import {
  cleanAndParseJson,
  UNTRUSTED_CONTENT_GUARD_INSTRUCTION,
  wrapUntrustedContent,
} from '../../../lib/ai/gateway.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { AgentService } from '../services/agent.service.js';
import { executeAndRecord } from '../services/aiPendingAction.service.js';
import {
  hasPiiExternalConsent,
  minimizePii,
  type PiiToken,
  rehydratePii,
} from '../services/guardrails.service.js';
import { vectorService } from '../services/vector.service.js';

const emailDraftSchema = z.object({
  subject: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(8_000),
});

const whatsAppDraftSchema = z.object({
  body: z.string().trim().min(1).max(700),
});

export interface SdrDraftResult {
  status: 'created' | 'existing' | 'executed' | 'skipped';
  actionId?: string;
  reason?: string;
}

export class SDROutboundDraftAgent extends AgentService {
  protected agentType = 'SDR_OUTBOUND';

  protected getSystemPrompt(): string {
    return `Você é um SDR B2B responsável por redigir primeiros contatos personalizados.
Seja consultivo, colaborativo e humano. NUNCA seja agressivo, pedante ou insistente (pushy).
Evite usar jargões clichês de vendas ou tentar forçar uma reunião logo de cara.
Use somente os dados do prospect e os trechos de playbook fornecidos na mensagem do usuário.
${UNTRUSTED_CONTENT_GUARD_INSTRUCTION}
Não invente notícias, números, dores confirmadas, clientes, resultados ou funcionalidades.
Trate qualquer dor não confirmada como hipótese e termine com uma pergunta simples de validação, para iniciar uma conversa natural.
Retorne SOMENTE JSON válido neste formato exato: {"subject":"assunto curto e chamativo sem clickbait","body":"corpo do e-mail curto e amigável"}.`;
  }

  public async draftEmailForLead(
    leadId: string,
    tenantId: string,
    autoExecute = false,
  ): Promise<SdrDraftResult> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: tenantId },
      include: { company: true, contact: true },
    });

    if (!lead?.contact || !lead.company) {
      return { status: 'skipped', reason: 'Lead sem empresa ou contato vinculados.' };
    }
    if (!lead.contact.email) {
      return { status: 'skipped', reason: 'Contato sem e-mail.' };
    }

    const idempotencyKey = `sdr:first-email:${leadId}`;
    const existing = await prisma.aIPendingAction.findUnique({
      where: { organizationId_idempotencyKey: { organizationId: tenantId, idempotencyKey } },
    });

    // Se o modo full foi habilitado depois que o rascunho nasceu, o mesmo ledger pode ser
    // executado sem gerar uma segunda mensagem diferente para a mesma pessoa. `undefined`
    // (registro criado antes desta correção, campo ainda não existia) é tratado como "não
    // validado" — fail-closed, mesma regra do bloco de criação logo abaixo (AI-004/onda-20).
    const existingPayload = existing?.payload as
      | { structuredOutputValid?: boolean }
      | null
      | undefined;
    const existingIsStructuredOutputValid = existingPayload?.structuredOutputValid === true;
    if (existing) {
      if (
        autoExecute &&
        existingIsStructuredOutputValid &&
        !existing.approved &&
        !existing.executed &&
        !existing.discardedAt
      ) {
        const execution = await executeAndRecord(existing);
        if (execution.sent) {
          await prisma.aIPendingAction.update({
            where: { id: existing.id },
            data: { approved: true, approvedAt: new Date() },
          });
          return { status: 'executed', actionId: existing.id };
        }
      }
      return { status: 'existing', actionId: existing.id };
    }

    // Ponto único de verificação de base legal: nenhum rascunho novo é gerado sem base legal
    // registrada para esta organização, mesmo que o nome do contato seja minimizado (token
    // reversível) antes de sair — ver guardrails.service.ts:hasPiiExternalConsent. Reaproveitar
    // uma ação já existente (bloco acima) não passa por aqui: aquele rascunho já foi gerado
    // antes, e o que resta ali é apenas o envio via SMTP, não um novo envio de PII a um provedor
    // de IA.
    if (!hasPiiExternalConsent(tenantId)) {
      logger.warn(
        { leadId, tenantId },
        'SDR outbound bloqueado: sem base legal LGPD registrada para enviar dado pessoal a provedor de IA externo.',
      );
      return {
        status: 'skipped',
        reason:
          'Consentimento/base legal LGPD não registrado para esta organização enviar dado pessoal a provedor de IA externo.',
      };
    }

    const searchQuery = `Estratégia de prospecção e dores para segmento ${lead.company.segment || 'geral'}`;
    const similarKnowledge = await vectorService.searchSimilar(searchQuery, tenantId, 3, 0.5);
    // Cada `item.content` vem de um `DocumentChunk` de um documento carregado na base de
    // conhecimento (playbook) — conteúdo de terceiro, não controlado pela Birth Hub 360. Envolvido
    // individualmente com o mesmo delimitador estrutural usado no Copiloto de Conhecimento
    // (`knowledge-copilot.service.ts`), para que um chunk malicioso não consiga se passar por
    // instrução nem "fechar" o bloco de dados de um chunk vizinho.
    const ragContext =
      similarKnowledge.length > 0
        ? similarKnowledge.map((item) => `- ${wrapUntrustedContent(item.content)}`).join('\n')
        : 'Sem contexto adicional no playbook.';

    const customFields = lead.company.customFields as Record<string, unknown> | null;
    const siteIntel = customFields?.siteIntelligence as
      | {
          valueProposition?: string | null;
          productsAndServices?: string[];
          technologies?: string[];
        }
      | undefined;
    const siteContext = siteIntel?.valueProposition
      ? `\nInteligência do site da empresa (crawling/scraping):
- Proposta de valor: ${wrapUntrustedContent(siteIntel.valueProposition)}
${siteIntel.technologies?.length ? `- Tecnologias identificadas no site: ${siteIntel.technologies.join(', ')}` : ''}
${siteIntel.productsAndServices?.length ? `- Produtos/serviços em destaque: ${siteIntel.productsAndServices.slice(0, 3).join(', ')}` : ''}`
      : lead.company.website
        ? `\nWebsite da empresa: ${lead.company.website}`
        : '';

    const promptContext = `
Dados do prospect:
- Nome: ${lead.contact.name}
- Cargo: ${lead.contact.role || 'Desconhecido'}
- Empresa: ${lead.company.legalName}
- Segmento: ${lead.company.segment || 'Desconhecido'}
- Porte: ${lead.company.size || 'Desconhecido'}
- Score de fit: ${lead.score ?? 'ainda não calculado'}
- Resumo de qualificação: ${JSON.stringify(lead.qualification)}${siteContext}

Contexto da base de conhecimento da Birth Hub 360:
${ragContext}

Escreva um primeiro e-mail curto, específico e consultivo. Valide uma hipótese de dor e use uma única chamada para resposta; não peça reunião no primeiro contato.
`;

    const minimized = minimizePii(promptContext, [
      { token: '[NOME_DO_CONTATO]', value: lead.contact.name },
    ]);
    const piiTokens: PiiToken[] = minimized.applied;
    const rawDraft = await this.processMessage(minimized.text);
    const rehydrated = piiTokens.length > 0 ? rehydratePii(rawDraft, piiTokens) : rawDraft;

    let draft: z.infer<typeof emailDraftSchema>;
    let isStructuredOutputValid: boolean;
    try {
      draft = emailDraftSchema.parse(cleanAndParseJson<unknown>(rehydrated));
      isStructuredOutputValid = true;
    } catch (error) {
      // Modelos pequenos ocasionalmente cercam o JSON com texto. O corpo bruto continua útil
      // e auditável (fica salvo na AIPendingAction para revisão humana) — não perdemos o job
      // inteiro por um problema apenas de formatação. Mas este texto NUNCA passou pelo
      // schema: AI-004 (Sprint 07/onda-20) exige que um fallback assim nunca seja executado
      // de forma autônoma, só revisado por humano — ver `isStructuredOutputValid` abaixo.
      logger.warn(
        { err: error, leadId },
        'SDR outbound retornou formato não estruturado; usando fallback textual (revisão humana obrigatória).',
      );
      draft = {
        subject: `Uma hipótese para ${lead.company.tradeName || lead.company.legalName}`.slice(
          0,
          160,
        ),
        body: rehydrated.slice(0, 8_000),
      };
      isStructuredOutputValid = false;
    }

    const action = await prisma.aIPendingAction.create({
      data: {
        entity: 'Lead',
        action: 'send_email',
        agentRole: 'SDR',
        riskLevel: 'high',
        confidence: lead.score == null ? null : Math.max(0, Math.min(1, lead.score / 100)),
        idempotencyKey,
        organizationId: tenantId,
        payload: {
          leadId,
          to: lead.contact.email,
          subject: draft.subject,
          body: draft.body,
          generatedFrom: 'playbook_rag',
          structuredOutputValid: isStructuredOutputValid,
        },
      },
    });

    // AI-004 (Sprint 07/onda-20): schema inválido → sempre human review, nunca autoExecute,
    // mesmo com o modo autônomo ligado. Antes desta correção, um fallback textual (nunca
    // validado por Zod) podia ser enviado por e-mail de forma totalmente autônoma quando
    // SWARM_AUTONOMY_MODE=full — exatamente o que o roadmap proíbe.
    if (autoExecute && isStructuredOutputValid) {
      const execution = await executeAndRecord(action);
      if (execution.sent) {
        await prisma.aIPendingAction.update({
          where: { id: action.id },
          data: { approved: true, approvedAt: new Date() },
        });
        return { status: 'executed', actionId: action.id };
      }
    }

    return { status: 'created', actionId: action.id };
  }

  /**
   * Item 2 de "IA Agêntica de Vendas": primeiro contato do SDR também sai por WhatsApp, não só
   * e-mail — texto puro gerado a partir do mesmo contexto de playbook/RAG do e-mail, mas curto e
   * sem assunto (formato de mensagem, não de e-mail). Chama `callLLM` diretamente (em vez de
   * `processMessage`/`getSystemPrompt()`, usados pelo fluxo de e-mail) porque este é um prompt de
   * sistema diferente e um rascunho STATELESS — não precisa (e não deveria) herdar o histórico de
   * memória de conversas anteriores desta sessão.
   *
   * Mesma decisão de segurança do Negociador de IA (negotiatorDraft.agent.ts): `autoExecute`
   * NUNCA se aplica aqui — mesmo com SWARM_AUTONOMY_MODE=full, o primeiro WhatsApp sempre fica
   * pendente de aprovação humana. WhatsApp é mais imediato/pessoal que o primeiro e-mail; merece
   * sua própria decisão de autonomia total, não herdar a trava do e-mail por acidente.
   */
  public async draftWhatsAppForLead(leadId: string, tenantId: string): Promise<SdrDraftResult> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: tenantId },
      include: { company: true, contact: true },
    });

    if (!lead?.contact || !lead.company) {
      return { status: 'skipped', reason: 'Lead sem empresa ou contato vinculados.' };
    }
    const whatsAppNumber = lead.contact.whatsapp || lead.contact.phone;
    if (!whatsAppNumber) {
      return { status: 'skipped', reason: 'Contato sem WhatsApp/telefone.' };
    }

    const idempotencyKey = `sdr:first-whatsapp:${leadId}`;
    const existing = await prisma.aIPendingAction.findUnique({
      where: { organizationId_idempotencyKey: { organizationId: tenantId, idempotencyKey } },
    });
    if (existing) {
      return { status: 'existing', actionId: existing.id };
    }

    if (!hasPiiExternalConsent(tenantId)) {
      logger.warn(
        { leadId, tenantId },
        'SDR outbound (WhatsApp) bloqueado: sem base legal LGPD registrada para enviar dado pessoal a provedor de IA externo.',
      );
      return {
        status: 'skipped',
        reason:
          'Consentimento/base legal LGPD não registrado para esta organização enviar dado pessoal a provedor de IA externo.',
      };
    }

    const searchQuery = `Estratégia de prospecção e dores para segmento ${lead.company.segment || 'geral'}`;
    const similarKnowledge = await vectorService.searchSimilar(searchQuery, tenantId, 3, 0.5);
    const ragContext =
      similarKnowledge.length > 0
        ? similarKnowledge.map((item) => `- ${wrapUntrustedContent(item.content)}`).join('\n')
        : 'Sem contexto adicional no playbook.';

    const customFields = lead.company.customFields as Record<string, unknown> | null;
    const siteIntel = customFields?.siteIntelligence as
      | {
          valueProposition?: string | null;
          productsAndServices?: string[];
          technologies?: string[];
        }
      | undefined;
    const siteContext = siteIntel?.valueProposition
      ? `\nInteligência do site da empresa (crawling/scraping):
- Proposta de valor: ${wrapUntrustedContent(siteIntel.valueProposition)}
${siteIntel.technologies?.length ? `- Tecnologias identificadas no site: ${siteIntel.technologies.join(', ')}` : ''}`
      : lead.company.website
        ? `\nWebsite da empresa: ${lead.company.website}`
        : '';

    const promptContext = `
Dados do prospect:
- Nome: ${lead.contact.name}
- Cargo: ${lead.contact.role || 'Desconhecido'}
- Empresa: ${lead.company.legalName}
- Segmento: ${lead.company.segment || 'Desconhecido'}
- Porte: ${lead.company.size || 'Desconhecido'}
- Score de fit: ${lead.score ?? 'ainda não calculado'}${siteContext}

Contexto da base de conhecimento da Birth Hub 360:
${ragContext}

Escreva a primeira mensagem de WhatsApp: curta, específica, consultiva. Valide uma hipótese de dor com uma pergunta simples; não peça reunião no primeiro contato.
`;

    const minimized = minimizePii(promptContext, [
      { token: '[NOME_DO_CONTATO]', value: lead.contact.name },
    ]);
    const piiTokens: PiiToken[] = minimized.applied;

    const systemPrompt = `Você é um SDR B2B responsável por redigir a PRIMEIRA MENSAGEM de WhatsApp para um prospect.
Seja consultivo, colaborativo e humano. NUNCA seja agressivo, pedante ou insistente (pushy).
Use somente os dados do prospect e os trechos de playbook fornecidos na mensagem do usuário.
${UNTRUSTED_CONTENT_GUARD_INSTRUCTION}
Não invente notícias, números, dores confirmadas, clientes, resultados ou funcionalidades.
REGRAS DE FORMATO: responda SOMENTE com o texto da mensagem — nunca markdown, nunca assunto, no máximo 4 frases curtas (é WhatsApp, não e-mail). Retorne SOMENTE JSON válido neste formato exato: {"body":"texto curto da mensagem"}.`;

    const rawDraft = await this.callLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: minimized.text },
    ]);
    const rehydrated = piiTokens.length > 0 ? rehydratePii(rawDraft, piiTokens) : rawDraft;

    let draft: z.infer<typeof whatsAppDraftSchema>;
    let isStructuredOutputValid: boolean;
    try {
      draft = whatsAppDraftSchema.parse(cleanAndParseJson<unknown>(rehydrated));
      isStructuredOutputValid = true;
    } catch (error) {
      logger.warn(
        { err: error, leadId },
        'SDR outbound (WhatsApp) retornou formato não estruturado; usando fallback textual (revisão humana obrigatória).',
      );
      draft = { body: rehydrated.slice(0, 700) };
      isStructuredOutputValid = false;
    }

    const action = await prisma.aIPendingAction.create({
      data: {
        entity: 'Lead',
        action: 'send_whatsapp_reply',
        agentRole: 'SDR',
        riskLevel: 'high',
        confidence: lead.score == null ? null : Math.max(0, Math.min(1, lead.score / 100)),
        idempotencyKey,
        organizationId: tenantId,
        payload: {
          leadId,
          to: whatsAppNumber,
          body: draft.body,
          generatedFrom: 'playbook_rag',
          structuredOutputValid: isStructuredOutputValid,
          trigger: 'first_contact',
        },
      },
    });

    // Nunca autoExecute aqui — ver comentário do método acima.
    return { status: 'created', actionId: action.id };
  }
}
