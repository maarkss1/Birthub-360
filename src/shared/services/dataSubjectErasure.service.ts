import { prisma } from '../../lib/prisma.js';
import { requestContext } from '../../lib/async-context.js';
import { logger } from '../../lib/logger.js';

export interface ErasureTarget {
  organizationId: string;
  contactId: string;
  // Quem exerceu o direito de exclusão em nome do titular (ADMIN/GESTOR autenticado que chamou a
  // rota) — sem isto, o `requestContext` não carrega `userId`, e o UPDATE automático de auditoria
  // dessa extensão do Prisma (ver src/lib/prisma.ts, `auditableModels` inclui `Contact`) grava a
  // anonimização com `actorId` vazio, perdendo justamente o "quem" de uma ação irreversível de
  // LGPD. Opcional só para não quebrar chamadas indiretas (ex.: script/worker) sem ator humano.
  actorUserId?: string;
}

export interface ErasureResult {
  contactId: string;
  whatsAppMessagesMasked: number;
  conversationSignalsRedacted: number;
  timelineEventsRedacted: number;
  voiceCallLogsRedacted: number;
  copilotoTranscriptSegmentsRedacted: number;
  copilotoInsightsRedacted: number;
  alreadyAnonymized: boolean;
}

/** Marca o registro como anonimizado — não é PII, então é seguro deixar visível/pesquisável. */
export const ANONYMIZED_CONTACT_NAME = '[titular anonimizado — LGPD]';

/**
 * Substitui `CopilotoTranscriptSegment.text` (não-nulável no schema — mesmo motivo de
 * `TimelineEvent.description` usar um placeholder em vez de `null`).
 */
export const ANONYMIZED_TRANSCRIPT_SEGMENT_TEXT = '[segmento de transcrição anonimizado — LGPD]';

/**
 * Anonimiza irreversivelmente os dados pessoais de um Contact (titular), a pedido do exercício do
 * direito de exclusão/anonimização do LGPD (Lei 13.709/2018, art. 18). Ver /AGENTS.md → "LGPD e
 * dados pessoais": este é o mecanismo técnico exigido do Agente 01 — a decisão de QUANDO acioná-lo
 * (verificar identidade do titular, prazo legal, etc.) é de negócio/operação, fora deste código.
 *
 * Não apaga o Contact nem os registros ligados a ele (Lead, Activity, negócio comercial) — LGPD
 * art. 12 trata dado anonimizado como fora do escopo da lei justamente porque deixa de identificar
 * uma pessoa natural, preservando o histórico comercial/contábil legítimo da organização. O que é
 * destruído é todo campo que identifica a pessoa: nome, telefone, WhatsApp, e-mail, LinkedIn, data
 * de nascimento, observações livres e customFields — mais o corpo e o telefone das mensagens de
 * WhatsApp ligadas a este contato (que carregam PII própria, independente do registro Contact).
 *
 * Idempotente: rodar de novo sobre um contato já anonimizado não falha nem duplica efeito.
 *
 * Cobertura de tabelas derivadas (Onda 6, Agente 01A — ver
 * .agents/prompts/01A-dados-rls-retencao.md, item 4):
 * - `WhatsAppMessage` (já cobria antes desta onda) — `contactId` direto.
 * - `ConversationSignal`/`TimelineEvent` — sem `contactId` próprio, alcançados via `Lead.contactId`
 *   (um titular pode ter mais de um Lead ao longo do tempo). Campos de texto livre que podem citar
 *   o titular (`summary`, `nextStep`, `objections`, `rawModelOutput` em ConversationSignal;
 *   `description` em TimelineEvent) são redigidos; a linha em si não é apagada — mesmo raciocínio
 *   do Contact/Lead: preserva o histórico comercial "isto aconteceu", remove só o "quem".
 * - `VoiceCallLog` — mesmo padrão de ConversationSignal/TimelineEvent: sem `contactId` próprio
 *   (é `leadId` solto de propósito, sem FK — ver comentário da migration
 *   20260911150000_voice_hub_connection_and_call_log), alcançado via `Lead.contactId`.
 *   `transcript`/`summary` (texto livre da ligação, pode conter PII do titular) e `recordingUrl`
 *   (aponta para o áudio da ligação, PII por si só) são redigidos; `outcome`/`durationSeconds`/
 *   `createdAt` são preservados — mesmo raciocínio: fica "houve uma ligação com este resultado",
 *   não "o que foi dito nela".
 * - `CopilotoTranscriptSegment`/`CopilotoInsight` (Copiloto Comercial IA — ACH-VOICE-003) — a
 *   mesma classe de dado de `VoiceCallLog` (transcrição/insight derivado de uma ligação/reunião de
 *   voz), mas alcançável por um caminho MAIS direto: `CopilotoConversation` tem `contactId` próprio
 *   (além de `leadId`), então a busca de conversas do titular usa OS DOIS — `contactId` direto OU
 *   `leadId` em qualquer Lead já resolvido acima — para não depender só da indireção por Lead como
 *   VoiceCallLog precisa. `CopilotoTranscriptSegment.text` (não-nulável) recebe um placeholder
 *   (`ANONYMIZED_TRANSCRIPT_SEGMENT_TEXT`, mesmo padrão de `TimelineEvent.description`) em vez de
 *   `null`; `CopilotoInsight.valueJson` (Json, também não-nulável, pode carregar objeções/
 *   sentimento/menção a concorrente atribuídos ao titular) é zerado para `{}`, mesmo tratamento de
 *   `ConversationSignal.rawModelOutput`. `evidenceSegmentIds` (ids internos, não é PII por si só) e
 *   `type`/`confidence`/`startMs`/`endMs`/`speakerLabel` são preservados — mesmo raciocínio: fica
 *   "houve uma conversa com este tipo de insight", não o conteúdo dela. Sem isto, uma exclusão de
 *   titular deixava a MESMA ligação legível aqui mesmo depois de redigida em `VoiceCallLog`.
 * - `AgentMemory` — **não alcançável por este mecanismo**: o schema (`prisma/schema.prisma`) não
 *   tem `contactId`/`leadId`, só `sessionId`/`agentType`/`organizationId`; `messages` é um blob JSON
 *   de conversa que PODE conter PII do titular em texto livre, mas não há chave estruturada para
 *   localizar quais sessões pertencem a este contato sem varrer o conteúdo de todas as sessões da
 *   organização (falso-positivo/negativo alto, fora do escopo de uma correção segura nesta onda).
 *   Registrado como gap conhecido — ver handoff `.agents/handoffs/onda-6/01A-para-07-agentmemory-
 *   sem-vinculo-titular.md`.
 * - `AILog` — **não aplicável**: linha é telemetria de uso (tokens/custo/latência/model), sem
 *   `contactId`/`leadId` e sem o texto do prompt em si (só `promptId`, referência a um `Prompt` de
 *   sistema, não o conteúdo enviado por/sobre um titular específico) — não há PII de titular nesta
 *   tabela para apagar.
 * - `EnrichmentLog` — chave é `companyId`, não `contactId`/titular pessoa física (é enriquecimento
 *   de dado de empresa) — fora do escopo de exclusão de titular pessoa natural.
 */
export async function eraseDataSubject(target: ErasureTarget): Promise<ErasureResult> {
  return requestContext.run(
    { tenantId: target.organizationId, userId: target.actorUserId },
    async () => {
      const contact = await prisma.contact.findFirst({
        where: { id: target.contactId, organizationId: target.organizationId },
      });
      if (!contact) {
        throw new Error(
          `Contato ${target.contactId} não encontrado na organização ${target.organizationId}.`,
        );
      }

      const alreadyAnonymized = contact.name === ANONYMIZED_CONTACT_NAME;

      if (!alreadyAnonymized) {
        await prisma.contact.update({
          where: { id: target.contactId },
          data: {
            name: ANONYMIZED_CONTACT_NAME,
            phone: null,
            whatsapp: null,
            email: null,
            linkedin: null,
            birthDate: null,
            observations: null,
            customFields: {},
          },
        });
      }

      // Mensagens de WhatsApp guardam PII própria (telefone/conteúdo) — mascaradas mesmo se o
      // Contact já estava anonimizado antes, caso alguma mensagem nova tenha chegado depois.
      const { count: whatsAppMessagesMasked } = await prisma.whatsAppMessage.updateMany({
        where: { contactId: target.contactId, body: { not: null } },
        data: { body: null },
      });

      // Leads deste titular nesta organização (um contato pode ter tido mais de um Lead ao longo
      // do tempo) — organizationId explícito no where como defesa em profundidade além do RLS.
      const leads = await prisma.lead.findMany({
        where: { contactId: target.contactId, organizationId: target.organizationId },
        select: { id: true },
      });
      const leadIds = leads.map((l) => l.id);

      let conversationSignalsRedacted = 0;
      let timelineEventsRedacted = 0;
      let voiceCallLogsRedacted = 0;

      // Conversas do Copiloto Comercial IA ligadas a este titular — por `contactId` DIRETO
      // (CopilotoConversation tem o campo próprio, ao contrário de ConversationSignal/
      // TimelineEvent/VoiceCallLog) OU por qualquer Lead deste titular já resolvido acima. `OR`
      // com os dois braços cobre uma conversa que só tenha um dos dois preenchidos (ex.: capturada
      // antes de o Lead existir, ou vinculada a um Lead sem contactId ainda setado no momento da
      // captura).
      const copilotoConversations = await prisma.copilotoConversation.findMany({
        where: {
          organizationId: target.organizationId,
          OR: [
            { contactId: target.contactId },
            ...(leadIds.length > 0 ? [{ leadId: { in: leadIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const copilotoConversationIds = copilotoConversations.map((c) => c.id);

      let copilotoTranscriptSegmentsRedacted = 0;
      let copilotoInsightsRedacted = 0;

      if (copilotoConversationIds.length > 0) {
        const { count: segmentsCount } = await prisma.copilotoTranscriptSegment.updateMany({
          where: {
            conversationId: { in: copilotoConversationIds },
            organizationId: target.organizationId,
          },
          data: { text: ANONYMIZED_TRANSCRIPT_SEGMENT_TEXT },
        });
        copilotoTranscriptSegmentsRedacted = segmentsCount;

        const { count: insightsCount } = await prisma.copilotoInsight.updateMany({
          where: {
            conversationId: { in: copilotoConversationIds },
            organizationId: target.organizationId,
          },
          data: { valueJson: {} },
        });
        copilotoInsightsRedacted = insightsCount;
      }

      if (leadIds.length > 0) {
        const { count: signalsCount } = await prisma.conversationSignal.updateMany({
          where: { leadId: { in: leadIds }, organizationId: target.organizationId },
          data: {
            summary: null,
            nextStep: null,
            objections: [],
            rawModelOutput: {},
          },
        });
        conversationSignalsRedacted = signalsCount;

        const { count: timelineCount } = await prisma.timelineEvent.updateMany({
          where: { leadId: { in: leadIds } },
          data: { description: '[evento anonimizado — LGPD]' },
        });
        timelineEventsRedacted = timelineCount;

        const { count: voiceCallLogsCount } = await prisma.voiceCallLog.updateMany({
          where: { leadId: { in: leadIds }, organizationId: target.organizationId },
          data: {
            transcript: null,
            summary: null,
            recordingUrl: null,
          },
        });
        voiceCallLogsRedacted = voiceCallLogsCount;
      }

      logger.info(
        {
          organizationId: target.organizationId,
          contactId: target.contactId,
          whatsAppMessagesMasked,
          conversationSignalsRedacted,
          timelineEventsRedacted,
          voiceCallLogsRedacted,
          copilotoTranscriptSegmentsRedacted,
          copilotoInsightsRedacted,
          alreadyAnonymized,
        },
        '[lgpd] Titular anonimizado a pedido de exercício de direito (LGPD art. 18).',
      );

      return {
        contactId: target.contactId,
        whatsAppMessagesMasked,
        conversationSignalsRedacted,
        timelineEventsRedacted,
        voiceCallLogsRedacted,
        copilotoTranscriptSegmentsRedacted,
        copilotoInsightsRedacted,
        alreadyAnonymized,
      };
    },
  );
}
