import { randomUUID } from 'node:crypto';
import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';
import { env } from '../../../config/env.js';
import type {
  CalendarEventDraft,
  CalendarSchedulerPort,
  ConfirmationEvidenceType,
} from '../domain/scheduling.js';
import { createCalendarEvent } from '../../integrations/google/google.service.js';
import { sendEmail, MailerNotConfiguredError } from '../../../lib/email/mailer.js';
import { buildMeetingInviteEmail } from '../../../lib/email/meetingInvite.js';

/**
 * CYC-004 (onda 27) — implementação real de `CalendarSchedulerPort` (`scheduling.ts`).
 * O escopo OAuth foi alterado para `calendar.events` e a escrita agora é feita de verdade
 * via `createCalendarEvent` (que também tenta criar o Google Meet). Se a integração falhar, loga
 * o erro e segue com o registro local (best-effort sync, o Google não é a fonte da verdade do
 * agendamento comercial).
 *
 * Achado real (Meeting Hub): até esta mudança, `attendeeEmails` (lead + vendedor) era passado ao
 * Google, mas com `sendUpdates` não definido o Google não notifica ninguém por padrão — a "reunião
 * confirmada" que o vendedor via na tela (CadenceHub.tsx) nunca chegava de fato ao lead nem ao
 * vendedor por e-mail. Agora o convite (HTML + .ics, com o link do Meet) é enviado de verdade pelo
 * SMTP já configurado (`mailer.ts`) para cada destinatário — best-effort: falha no envio não desfaz
 * o evento do Google nem o registro local, só fica no log para investigação.
 */
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

const EVIDENCE_TYPE_TO_DB: Record<
  ConfirmationEvidenceType,
  'LeadCalendarReply' | 'LeadSchedulingLinkClick' | 'ManualVerified'
> = {
  'lead-calendar-reply': 'LeadCalendarReply',
  'lead-scheduling-link-click': 'LeadSchedulingLinkClick',
  'manual-verified': 'ManualVerified',
};

/** Envia o convite (HTML + .ics) a um destinatário — nunca lança: falha de e-mail não deveria
 * desfazer um evento de calendário que já existe de verdade no Google. */
async function sendInviteBestEffort(
  to: string,
  input: Parameters<typeof buildMeetingInviteEmail>[0],
  context: { organizationId: string; leadId: string },
) {
  try {
    const invite = buildMeetingInviteEmail(input);
    await sendEmail({
      to,
      subject: invite.subject,
      text: invite.text,
      html: invite.html,
      icalEvent: invite.icalEvent,
    });
  } catch (error) {
    if (error instanceof MailerNotConfiguredError) {
      // Achado real (auditoria de release-readiness, integration-audit): este era o único
      // call site de MailerNotConfiguredError (de 7 no projeto) que engolia o erro sem log
      // algum — diferente de booking.routes.ts/auth.ts/CadenceDispatchers.ts etc., que já
      // avisam. O evento no Google Calendar já foi criado (não é perda do dado de negócio),
      // mas sem este log ninguém no time percebe que o convite por e-mail nunca saiu.
      logger.warn(
        { to, ...context },
        '[CYC-004] Convite de reunião não enviado: SMTP não configurado.',
      );
      return;
    }
    logger.error(
      { err: error, to, ...context },
      '[CYC-004] Falha ao enviar convite de reunião por e-mail.',
    );
  }
}

export const prismaCalendarSchedulerPort: CalendarSchedulerPort = {
  async createEvent(draft: CalendarEventDraft) {
    let googleEventId = `fallback-event-${randomUUID()}`;
    let meetUrl: string | null = null;
    let iCalUID: string | null = null;

    try {
      const result = await createCalendarEvent(draft.organizationId, {
        summary: draft.title,
        start: draft.start,
        end: draft.end,
        attendees: draft.attendeeEmails,
      });
      googleEventId = result.googleEventId;
      meetUrl = result.meetUrl;
      iCalUID = result.iCalUID;
      logger.info(
        { organizationId: draft.organizationId, leadId: draft.leadId, googleEventId, meetUrl },
        '[CYC-004] Evento criado no Google Calendar com sucesso.',
      );
    } catch (error) {
      logger.error(
        { err: error, organizationId: draft.organizationId, leadId: draft.leadId },
        '[CYC-004] Falha ao criar evento no Google Calendar, usando fallback ID para o banco.',
      );
    }

    const activeCadenceRun = await prisma.cadenceRun.findFirst({
      where: { organizationId: draft.organizationId, leadId: draft.leadId, status: 'Active' },
      select: { id: true },
    });

    await prisma.cadenceCalendarEvent.create({
      data: {
        organizationId: draft.organizationId,
        leadId: draft.leadId,
        cadenceRunId: activeCadenceRun?.id ?? null,
        googleEventId,
        meetUrl,
        iCalUID,
        confirmationEvidenceType: EVIDENCE_TYPE_TO_DB[draft.confirmationEvidenceType],
        confirmationEvidenceRef: draft.confirmationEvidenceRef,
        scheduledStart: draft.start,
        scheduledEnd: draft.end,
        ownerUserId: draft.ownerUserId,
      },
    });

    const organizerEmail = env.SMTP_FROM || env.SMTP_USER;
    if (organizerEmail) {
      const inviteContext = { organizationId: draft.organizationId, leadId: draft.leadId };
      await Promise.all(
        draft.attendeeEmails.map((to) =>
          sendInviteBestEffort(
            to,
            {
              uid: iCalUID || googleEventId,
              title: draft.title,
              notes: '',
              start: draft.start,
              end: draft.end,
              timeZone: DEFAULT_TIMEZONE,
              organizerEmail,
              attendeeEmails: [to],
              meetUrl,
            },
            inviteContext,
          ),
        ),
      );
    }

    return { googleEventId, meetUrl, iCalUID };
  },
};
