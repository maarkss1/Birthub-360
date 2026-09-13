import { afterEach, describe, expect, it, vi } from 'vitest';

const cadenceRunFindFirst = vi.fn().mockResolvedValue(null);
const cadenceCalendarEventCreate = vi.fn().mockResolvedValue({});
const sendEmailMock = vi.fn().mockResolvedValue({ messageId: null });

vi.mock('../../../../../src/lib/prisma.js', () => ({
  prisma: {
    cadenceRun: { findFirst: (...args: unknown[]) => cadenceRunFindFirst(...args) },
    cadenceCalendarEvent: { create: (...args: unknown[]) => cadenceCalendarEventCreate(...args) },
  },
}));

vi.mock('../../../../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../../src/features/integrations/google/google.service.js', () => ({
  createCalendarEvent: vi.fn().mockResolvedValue({
    googleEventId: 'real-google-event-id',
    meetUrl: 'https://meet.google.com/abc-defg-hij',
    iCalUID: 'ical-uid-1',
  }),
}));

vi.mock('../../../../../src/config/env.js', () => ({
  env: { SMTP_FROM: 'sdr@atlasgr.com.br' },
}));

vi.mock('../../../../../src/lib/email/mailer.js', () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
  MailerNotConfiguredError: class MailerNotConfiguredError extends Error {},
}));

const { prismaCalendarSchedulerPort } =
  await import('../../../../../src/features/cadence/infra/PrismaCalendarSchedulerPort');

const draft = {
  organizationId: 'org-1',
  leadId: 'lead-1',
  start: new Date('2026-08-20T14:00:00Z'),
  end: new Date('2026-08-20T15:00:00Z'),
  attendeeEmails: ['contato@exemplo.com', 'vendedor@atlasgr.com.br'],
  ownerUserId: 'user-1',
  title: 'Reunião comercial — Empresa Exemplo',
  confirmationEvidenceType: 'manual-verified' as const,
  confirmationEvidenceRef: 'note-1',
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('prismaCalendarSchedulerPort', () => {
  it('devolve um googleEventId sintético (stub de transporte — nenhuma chamada real ao Google)', async () => {
    const result = await prismaCalendarSchedulerPort.createEvent(draft);

    expect(result.googleEventId).toBe('real-google-event-id');
  });

  it('grava o CadenceCalendarEvent com os campos do draft mapeados para o enum do banco', async () => {
    await prismaCalendarSchedulerPort.createEvent(draft);

    expect(cadenceCalendarEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        leadId: 'lead-1',
        confirmationEvidenceType: 'ManualVerified',
        confirmationEvidenceRef: 'note-1',
        scheduledStart: draft.start,
        scheduledEnd: draft.end,
        ownerUserId: 'user-1',
        googleEventId: 'real-google-event-id',
        meetUrl: 'https://meet.google.com/abc-defg-hij',
        iCalUID: 'ical-uid-1',
      }),
    });
  });

  it('devolve o meetUrl e o iCalUID reais junto com o googleEventId', async () => {
    const result = await prismaCalendarSchedulerPort.createEvent(draft);

    expect(result).toEqual({
      googleEventId: 'real-google-event-id',
      meetUrl: 'https://meet.google.com/abc-defg-hij',
      iCalUID: 'ical-uid-1',
    });
  });

  it('sem CadenceRun ativo para o lead: cadenceRunId gravado como null', async () => {
    cadenceRunFindFirst.mockResolvedValueOnce(null);

    await prismaCalendarSchedulerPort.createEvent(draft);

    expect(cadenceCalendarEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ cadenceRunId: null }),
    });
  });

  it('com CadenceRun ativo para o lead: vincula o cadenceRunId encontrado', async () => {
    cadenceRunFindFirst.mockResolvedValueOnce({ id: 'run-1' });

    await prismaCalendarSchedulerPort.createEvent(draft);

    expect(cadenceRunFindFirst).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', leadId: 'lead-1', status: 'Active' },
      select: { id: true },
    });
    expect(cadenceCalendarEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ cadenceRunId: 'run-1' }),
    });
  });

  it('envia o convite (HTML + .ics) para cada destinatário do draft, com o link do Meet', async () => {
    await prismaCalendarSchedulerPort.createEvent(draft);

    expect(sendEmailMock).toHaveBeenCalledTimes(draft.attendeeEmails.length);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'contato@exemplo.com',
        icalEvent: expect.objectContaining({ method: 'REQUEST' }),
      }),
    );
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'vendedor@atlasgr.com.br' }),
    );
  });

  it('falha ao enviar o convite não impede o registro do evento no banco (best-effort)', async () => {
    sendEmailMock.mockRejectedValueOnce(new Error('SMTP indisponível'));

    const result = await prismaCalendarSchedulerPort.createEvent(draft);

    expect(result.googleEventId).toBe('real-google-event-id');
    expect(cadenceCalendarEventCreate).toHaveBeenCalledTimes(1);
  });
});
