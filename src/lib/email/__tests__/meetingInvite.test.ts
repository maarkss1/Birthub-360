import { describe, expect, it } from 'vitest';
import { buildMeetingInviteEmail } from '../meetingInvite.js';

const baseInput = {
  uid: 'evt-1@google.com',
  title: 'Reunião comercial — Empresa Exemplo',
  notes: 'Discutir proposta comercial',
  start: new Date('2026-09-10T14:00:00Z'),
  end: new Date('2026-09-10T15:00:00Z'),
  timeZone: 'America/Sao_Paulo',
  organizerEmail: 'sdr@atlasgr.com.br',
  attendeeEmails: ['lead@empresa.com'],
  meetUrl: 'https://meet.google.com/abc-defg-hij',
};

describe('buildMeetingInviteEmail', () => {
  it('monta um ICS válido com METHOD:REQUEST, UID estável e o link do Meet', () => {
    const invite = buildMeetingInviteEmail(baseInput);

    expect(invite.icalEvent.method).toBe('REQUEST');
    expect(invite.icalEvent.filename).toBe('convite.ics');
    expect(invite.icalEvent.content).toContain('BEGIN:VCALENDAR');
    expect(invite.icalEvent.content).toContain('METHOD:REQUEST');
    expect(invite.icalEvent.content).toContain('UID:evt-1@google.com');
    expect(invite.icalEvent.content).toContain('ORGANIZER:mailto:sdr@atlasgr.com.br');
    expect(invite.icalEvent.content).toContain(
      'ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:lead@empresa.com',
    );
    expect(invite.icalEvent.content).toContain('STATUS:CONFIRMED');
    // Quebra de linha CRLF exigida pela RFC 5545
    expect(invite.icalEvent.content).toContain('\r\n');
  });

  it('escapa vírgula/ponto-e-vírgula/quebra de linha no ICS (RFC 5545)', () => {
    const invite = buildMeetingInviteEmail({
      ...baseInput,
      title: 'Reunião: Empresa, Filial; Matriz',
      notes: 'Linha 1\nLinha 2',
    });

    expect(invite.icalEvent.content).toContain('SUMMARY:Reunião: Empresa\\, Filial\\; Matriz');
    expect(invite.icalEvent.content).toContain('Linha 1\\nLinha 2');
  });

  it('inclui o link do Meet no texto simples e no HTML, escapado', () => {
    const invite = buildMeetingInviteEmail({
      ...baseInput,
      title: '<script>alert(1)</script>',
    });

    expect(invite.text).toContain('Google Meet: https://meet.google.com/abc-defg-hij');
    expect(invite.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(invite.html).not.toContain('<script>alert(1)</script>');
    expect(invite.html).toContain('https://meet.google.com/abc-defg-hij');
  });

  it('sem meetUrl: avisa que o link ainda será enviado, sem quebrar o convite', () => {
    const invite = buildMeetingInviteEmail({ ...baseInput, meetUrl: null });

    expect(invite.text).toContain('Link do Google Meet será enviado em breve.');
    expect(invite.icalEvent.content).not.toContain('undefined');
    expect(invite.icalEvent.content).toContain('LOCATION:Google Meet');
  });

  it('assunto sempre no formato "Convite: <título>"', () => {
    const invite = buildMeetingInviteEmail(baseInput);

    expect(invite.subject).toBe('Convite: Reunião comercial — Empresa Exemplo');
  });
});
