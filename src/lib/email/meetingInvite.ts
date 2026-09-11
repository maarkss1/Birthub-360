import { BRAND } from '../../config/brand';

/**
 * Convite de reunião (ICS + e-mail HTML) — só o caminho de CRIAÇÃO existe hoje porque nenhum dos
 * dois pontos reais que chamam isto (`schedule-meeting` da Cadência e o agendamento público em
 * `booking.routes.ts`) tem fluxo de reagendamento/cancelamento; adicionar `kind: 'reschedule' |
 * 'cancel'` aqui seria construir para um caller que ainda não existe.
 *
 * Achado real (porta pro app principal do protótipo standalone `ATLAS_MEETING_HUB`, que já resolveu
 * isso): sem `METHOD:REQUEST` e um `UID` estável, a maioria dos clientes de e-mail mostra o `.ics`
 * como anexo solto em vez de oferecer "Adicionar ao calendário" — por isso o ICS é montado à mão
 * (RFC 5545: `fold` quebra linhas em 75 octets, `esc` escapa vírgula/ponto-e-vírgula/quebra de
 * linha), não só um texto livre passado pro nodemailer.
 */

function htmlEscape(value: string): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

function icsEscape(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function icsStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z/, 'Z');
}

/** Quebra uma linha ICS em continuações de até 75 octets, como exige a RFC 5545. */
function foldLine(line: string): string {
  let result = '';
  let part = '';
  for (const char of line) {
    if (Buffer.byteLength(part + char) > 73) {
      result += `${part}\r\n`;
      part = ' ';
    }
    part += char;
  }
  return result + part;
}

export interface MeetingInviteInput {
  /** UID estável do evento — usa o `iCalUID` real do Google quando disponível (garante que o
   * cliente de e-mail reconhece o mesmo evento que já está no Google Calendar do organizador). */
  uid: string;
  title: string;
  /** Texto livre (observações/contexto da reunião) — aparece no corpo do e-mail e na DESCRIPTION do ICS. */
  notes: string;
  start: Date;
  end: Date;
  /** Fuso IANA para a data legível no e-mail (ex.: `America/Sao_Paulo`). O ICS em si usa UTC. */
  timeZone: string;
  organizerEmail: string;
  /** Destinatários do convite (participantes) — nunca inclui o organizador. */
  attendeeEmails: string[];
  /** Link do Google Meet, quando a videochamada foi criada com sucesso. */
  meetUrl: string | null;
}

function buildIcs(input: MeetingInviteInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Birth Hub 360//Central de Inteligencia Comercial//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${icsEscape(input.uid)}`,
    'SEQUENCE:0',
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(input.start)}`,
    `DTEND:${icsStamp(input.end)}`,
    `SUMMARY:${icsEscape(input.title)}`,
    `DESCRIPTION:${icsEscape(`${input.notes}\n${input.meetUrl || ''}`.trim())}`,
    `LOCATION:${icsEscape(input.meetUrl || 'Google Meet')}`,
    `ORGANIZER:mailto:${input.organizerEmail}`,
    ...input.attendeeEmails
      .filter((email) => email?.trim())
      .map((email) => `ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:${email}`),
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

export interface MeetingInviteEmail {
  subject: string;
  text: string;
  html: string;
  icalEvent: { filename: string; method: 'REQUEST'; content: string };
}

/** Monta o convite completo (assunto, texto, HTML com logo/paleta Birth Hub 360, e o anexo .ics) para um
 * destinatário do agendamento — chame uma vez por destinatário (organizador nunca é destinatário). */
export function buildMeetingInviteEmail(input: MeetingInviteInput): MeetingInviteEmail {
  const formattedTime = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: input.timeZone,
  }).format(input.start);

  const meetLine = input.meetUrl
    ? `Google Meet: ${input.meetUrl}`
    : 'Link do Google Meet será enviado em breve.';

  return {
    subject: `Convite: ${input.title}`,
    text: [
      `Convite de reunião: ${input.title}`,
      `${formattedTime} (${input.timeZone})`,
      input.notes,
      meetLine,
    ]
      .filter(Boolean)
      .join('\n'),
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f1ea;font-family:Inter,Arial,sans-serif;color:#333333"><div style="max-width:560px;margin:0 auto;padding:32px 24px"><div style="border-top:4px solid ${BRAND.colors.brand};background:#ffffff;border-radius:8px;padding:28px"><p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${BRAND.colors.brand}">Convite de reunião</p><h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${htmlEscape(input.title)}</h1><p style="margin:0 0 4px;font-weight:700">${htmlEscape(formattedTime)}</p><p style="margin:0 0 20px;color:#666666">${htmlEscape(input.timeZone)}</p>${input.notes ? `<p style="margin:0 0 20px;white-space:pre-line">${htmlEscape(input.notes)}</p>` : ''}${
      input.meetUrl
        ? `<p style="margin:0"><a href="${htmlEscape(input.meetUrl)}" style="display:inline-block;background:${BRAND.colors.brand};color:${BRAND.colors.obsidian};font-weight:700;text-decoration:none;padding:12px 20px;border-radius:6px">Acessar Google Meet</a></p>`
        : `<p style="margin:0;color:#666666">${htmlEscape(meetLine)}</p>`
    }<hr style="margin:28px 0 16px;border:none;border-top:1px solid #eeeeee"><p style="margin:0;font-size:12px;color:#999999">Birth Hub 360º · Central de Comando Inteligente</p></div></div></body></html>`,
    icalEvent: {
      filename: 'convite.ics',
      method: 'REQUEST',
      content: buildIcs(input),
    },
  };
}
