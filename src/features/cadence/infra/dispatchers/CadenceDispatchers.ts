import { MailerNotConfiguredError, sendEmail } from '../../../../lib/email/mailer.js';
import { logger } from '../../../../lib/logger.js';
import { prisma } from '../../../../lib/prisma.js';
import { sendWhatsAppMessage } from '../../../integrations/whatsapp/whatsapp.service.js';
import type { CadenceDispatcher } from '../../application/cadenceService.js';
import type { CadenceRunState, CadenceTouch } from '../../domain/cadence.js';

/**
 * Dispatchers reais de canal (CYC-008, onda-19) — a peça que faltava para `advanceCadenceRun`
 * (dom\u00ednio puro, entregue na Onda 10) sair do papel: até aqui a única implementação de
 * `CadenceDispatcher` do repo era `ScriptedDispatcher`, só em teste.
 *
 * Limitação conhecida e ainda real: `CadenceTouch.templateRef` não tem nenhum sistema de
 * template por trás — é tratado aqui como o texto final da mensagem (corpo, ou
 * "assunto\n\ncorpo" para e-mail). Autoria de conteúdo de cadência é uma decisão de produto que
 * este runtime não toma sozinho.
 */

// ─── Contrato de porta para voz (CYC-004/ACH-17-03) ────────────────────────
// Espelha só o método que o dispatcher de cadência consome de `birthVoice.service.ts::callLead`.
// Seguindo o mesmo padrão de `booking.routes.ts` × `google.service.ts`: interface local resolvida
// via DI em `cadenceRun.worker.ts`, sem import direto de src/features/integrations/** (regra
// no-cross-feature-imports). O tipo agentType é fixo em 'sdr' para toques de cadência — futuros
// tipos (nps, reactivation) entram no CadenceTouch se o produto decidir.
export interface VoiceCallPort {
  callLead(
    organizationId: string,
    leadId: string,
    agentType?: 'sdr' | 'nps' | 'reactivation',
  ): Promise<{ sessionId: string; callSid: string; status: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────

async function resolveLeadPhone(organizationId: string, leadId: string): Promise<string | null> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: { contact: { select: { whatsapp: true, phone: true } } },
  });
  return lead?.contact?.whatsapp ?? lead?.contact?.phone ?? null;
}

async function resolveLeadEmail(organizationId: string, leadId: string): Promise<string | null> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: { contact: { select: { email: true } } },
  });
  return lead?.contact?.email ?? null;
}

/** Rotas para WhatsApp real. Opt-out já foi checado por `advanceCadenceRun` antes de chegar aqui, mas `sendWhatsAppMessage` checa de novo por padrão — redundante e seguro, não desativado (ver Sprint 06/CYC-001: já houve bug real de bypass desse flag). */
export const whatsAppCadenceDispatcher: Pick<CadenceDispatcher, 'dispatch'> = {
  async dispatch(touch: CadenceTouch, run: CadenceRunState) {
    const phone = await resolveLeadPhone(run.organizationId, run.leadId);
    if (!phone) {
      return {
        result: 'failed' as const,
        error: 'Lead sem telefone/WhatsApp cadastrado no contato.',
      };
    }
    try {
      await sendWhatsAppMessage(
        run.organizationId,
        phone,
        touch.templateRef ?? '(mensagem de cadência sem conteúdo configurado)',
        undefined,
        { leadId: run.leadId },
      );
      // sendWhatsAppMessage não devolve o id da mensagem do provedor (Baileys) hoje — ver
      // limitação documentada em docs/CADENCE-CYCLE-AUDIT.md.
      return { result: 'sent' as const, providerMessageId: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        { err, organizationId: run.organizationId, leadId: run.leadId, touchOrder: touch.order },
        'Falha ao despachar toque de cadência via WhatsApp.',
      );
      return { result: 'failed' as const, error: message };
    }
  },
};

function splitSubjectAndBody(
  templateRef: string | null | undefined,
  sequenceName: string,
): { subject: string; body: string } {
  if (!templateRef)
    return {
      subject: `Continuando nosso contato — ${sequenceName}`,
      body: '(mensagem de cadência sem conteúdo configurado)',
    };
  const [firstLine, ...rest] = templateRef.split('\n');
  if (rest.length === 0)
    return { subject: `Continuando nosso contato — ${sequenceName}`, body: firstLine };
  return { subject: firstLine, body: rest.join('\n').trimStart() };
}

/** Rotas para e-mail real via SMTP (`sendEmail`). Opt-out já foi checado por `advanceCadenceRun` — `sendEmail` não tem checagem própria (é transporte puro), diferente de `sendWhatsAppMessage`. */
export const emailCadenceDispatcher: Pick<CadenceDispatcher, 'dispatch'> = {
  async dispatch(touch: CadenceTouch, run: CadenceRunState) {
    const email = await resolveLeadEmail(run.organizationId, run.leadId);
    if (!email) {
      return { result: 'failed' as const, error: 'Lead sem e-mail cadastrado no contato.' };
    }
    const { subject, body } = splitSubjectAndBody(touch.templateRef, run.sequenceId);
    try {
      const { messageId } = await sendEmail({ to: email, subject, text: body });
      return { result: 'sent' as const, providerMessageId: messageId };
    } catch (err) {
      const message =
        err instanceof MailerNotConfiguredError
          ? 'Envio de e-mail não configurado (SMTP_HOST ausente).'
          : err instanceof Error
            ? err.message
            : String(err);
      logger.warn(
        { err, organizationId: run.organizationId, leadId: run.leadId, touchOrder: touch.order },
        'Falha ao despachar toque de cadência via e-mail.',
      );
      return { result: 'failed' as const, error: message };
    }
  },
};

/**
 * Dispatcher de voz (CYC-004/ACH-17-03). Recebe uma porta `VoiceCallPort` via injeção — o
 * worker passa a implementação real (`birthVoice.service.ts::callLead`) sem que este arquivo
 * precise importar diretamente `src/features/integrations/birth-voice/**`. Opt-out e PII
 * consent já são checados dentro de `callLead` — não duplicados aqui para evitar divergência.
 */
export function buildVoiceCadenceDispatcher(
  voicePort: VoiceCallPort,
): Pick<CadenceDispatcher, 'dispatch'> {
  return {
    async dispatch(touch: CadenceTouch, run: CadenceRunState) {
      try {
        const result = await voicePort.callLead(run.organizationId, run.leadId, 'sdr');
        return {
          result: 'sent' as const,
          providerMessageId: result.callSid ?? result.sessionId ?? null,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(
          { err, organizationId: run.organizationId, leadId: run.leadId, touchOrder: touch.order },
          'Falha ao despachar toque de cadência via voz (Birth Voices).',
        );
        return { result: 'failed' as const, error: message };
      }
    },
  };
}

/**
 * Roteia pelo canal do toque. `voicePort` é opcional: se não injetado (ambientes sem Birth
 * Voices configurado), voz continua falhando de forma honesta em vez de silenciosa.
 */
export function buildProductionCadenceDispatcher(voicePort?: VoiceCallPort): CadenceDispatcher {
  const voiceDispatcher = voicePort ? buildVoiceCadenceDispatcher(voicePort) : null;

  return {
    async dispatch(touch, run) {
      switch (touch.channel) {
        case 'whatsapp':
          return whatsAppCadenceDispatcher.dispatch(touch, run);
        case 'email':
          return emailCadenceDispatcher.dispatch(touch, run);
        case 'voice':
          if (voiceDispatcher) {
            return voiceDispatcher.dispatch(touch, run);
          }
          return {
            result: 'failed',
            error: 'Canal de voz não configurado neste ambiente (BIRTH_VOICES_API_KEY ausente).',
          };
      }
    },
  };
}

/**
 * @deprecated Use `buildProductionCadenceDispatcher(voicePort)` para ter voz real.
 * Mantido para retrocompatibilidade enquanto `cadenceRun.worker.ts` é migrado para injetar o voicePort.
 */
export const productionCadenceDispatcher: CadenceDispatcher = buildProductionCadenceDispatcher();

