import { describe, it, expect, vi, beforeEach } from 'vitest';

const findFirstMock = vi.fn();
const updateMock = vi.fn();
const updateManyMock = vi.fn();
const leadFindManyMock = vi.fn();
const conversationSignalUpdateManyMock = vi.fn();
const timelineEventUpdateManyMock = vi.fn();
const voiceCallLogUpdateManyMock = vi.fn();
const copilotoConversationFindManyMock = vi.fn();
const copilotoTranscriptSegmentUpdateManyMock = vi.fn();
const copilotoInsightUpdateManyMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
    whatsAppMessage: {
      updateMany: (...args: unknown[]) => updateManyMock(...args),
    },
    lead: {
      findMany: (...args: unknown[]) => leadFindManyMock(...args),
    },
    conversationSignal: {
      updateMany: (...args: unknown[]) => conversationSignalUpdateManyMock(...args),
    },
    timelineEvent: {
      updateMany: (...args: unknown[]) => timelineEventUpdateManyMock(...args),
    },
    voiceCallLog: {
      updateMany: (...args: unknown[]) => voiceCallLogUpdateManyMock(...args),
    },
    copilotoConversation: {
      findMany: (...args: unknown[]) => copilotoConversationFindManyMock(...args),
    },
    copilotoTranscriptSegment: {
      updateMany: (...args: unknown[]) => copilotoTranscriptSegmentUpdateManyMock(...args),
    },
    copilotoInsight: {
      updateMany: (...args: unknown[]) => copilotoInsightUpdateManyMock(...args),
    },
  },
}));

import {
  eraseDataSubject,
  ANONYMIZED_CONTACT_NAME,
  ANONYMIZED_TRANSCRIPT_SEGMENT_TEXT,
} from '@/shared/services/dataSubjectErasure.service';

const ORG_ID = 'org-1';
const CONTACT_ID = 'contact-1';

beforeEach(() => {
  vi.clearAllMocks();
  updateManyMock.mockResolvedValue({ count: 3 });
  leadFindManyMock.mockResolvedValue([{ id: 'lead-1' }, { id: 'lead-2' }]);
  conversationSignalUpdateManyMock.mockResolvedValue({ count: 2 });
  timelineEventUpdateManyMock.mockResolvedValue({ count: 4 });
  voiceCallLogUpdateManyMock.mockResolvedValue({ count: 5 });
  copilotoConversationFindManyMock.mockResolvedValue([{ id: 'conv-1' }]);
  copilotoTranscriptSegmentUpdateManyMock.mockResolvedValue({ count: 6 });
  copilotoInsightUpdateManyMock.mockResolvedValue({ count: 7 });
});

describe('eraseDataSubject — mecanismo técnico de exclusão/anonimização LGPD (art. 18)', () => {
  it('lança erro quando o contato não existe nesta organização (nunca anonimiza sem confirmar posse)', async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(
      eraseDataSubject({ organizationId: ORG_ID, contactId: CONTACT_ID }),
    ).rejects.toThrow(/não encontrado/);

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: CONTACT_ID, organizationId: ORG_ID },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('anonimiza todos os campos identificadores do contato e mascara o WhatsApp ligado a ele', async () => {
    findFirstMock.mockResolvedValue({
      id: CONTACT_ID,
      name: 'Fulano de Tal',
      organizationId: ORG_ID,
    });

    const result = await eraseDataSubject({ organizationId: ORG_ID, contactId: CONTACT_ID });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: CONTACT_ID },
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
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { contactId: CONTACT_ID, body: { not: null } },
      data: { body: null },
    });
    expect(leadFindManyMock).toHaveBeenCalledWith({
      where: { contactId: CONTACT_ID, organizationId: ORG_ID },
      select: { id: true },
    });
    expect(conversationSignalUpdateManyMock).toHaveBeenCalledWith({
      where: { leadId: { in: ['lead-1', 'lead-2'] }, organizationId: ORG_ID },
      data: { summary: null, nextStep: null, objections: [], rawModelOutput: {} },
    });
    expect(timelineEventUpdateManyMock).toHaveBeenCalledWith({
      where: { leadId: { in: ['lead-1', 'lead-2'] } },
      data: { description: '[evento anonimizado — LGPD]' },
    });
    expect(voiceCallLogUpdateManyMock).toHaveBeenCalledWith({
      where: { leadId: { in: ['lead-1', 'lead-2'] }, organizationId: ORG_ID },
      data: { transcript: null, summary: null, recordingUrl: null },
    });
    // CopilotoConversation é buscada por `contactId` DIRETO OU `leadId` em qualquer Lead do
    // titular — cobre o caso ACH-VOICE-003 (a mesma ligação era redigida em VoiceCallLog, mas
    // continuava legível aqui).
    expect(copilotoConversationFindManyMock).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        OR: [{ contactId: CONTACT_ID }, { leadId: { in: ['lead-1', 'lead-2'] } }],
      },
      select: { id: true },
    });
    expect(copilotoTranscriptSegmentUpdateManyMock).toHaveBeenCalledWith({
      where: { conversationId: { in: ['conv-1'] }, organizationId: ORG_ID },
      data: { text: ANONYMIZED_TRANSCRIPT_SEGMENT_TEXT },
    });
    expect(copilotoInsightUpdateManyMock).toHaveBeenCalledWith({
      where: { conversationId: { in: ['conv-1'] }, organizationId: ORG_ID },
      data: { valueJson: {} },
    });
    expect(result).toEqual({
      contactId: CONTACT_ID,
      whatsAppMessagesMasked: 3,
      conversationSignalsRedacted: 2,
      timelineEventsRedacted: 4,
      voiceCallLogsRedacted: 5,
      copilotoTranscriptSegmentsRedacted: 6,
      copilotoInsightsRedacted: 7,
      alreadyAnonymized: false,
    });
  });

  it('sem Leads ligados ao titular, não chama updateMany de ConversationSignal/TimelineEvent/VoiceCallLog (evita where vazio), mas ainda busca CopilotoConversation por contactId direto', async () => {
    findFirstMock.mockResolvedValue({
      id: CONTACT_ID,
      name: 'Fulano de Tal',
      organizationId: ORG_ID,
    });
    leadFindManyMock.mockResolvedValue([]);
    copilotoConversationFindManyMock.mockResolvedValue([]);

    const result = await eraseDataSubject({ organizationId: ORG_ID, contactId: CONTACT_ID });

    expect(conversationSignalUpdateManyMock).not.toHaveBeenCalled();
    expect(timelineEventUpdateManyMock).not.toHaveBeenCalled();
    expect(voiceCallLogUpdateManyMock).not.toHaveBeenCalled();
    // Sem Lead nenhum, o `OR` da busca de CopilotoConversation só tem o braço `contactId` direto
    // (nenhum item de `leadId` é adicionado ao array).
    expect(copilotoConversationFindManyMock).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, OR: [{ contactId: CONTACT_ID }] },
      select: { id: true },
    });
    expect(copilotoTranscriptSegmentUpdateManyMock).not.toHaveBeenCalled();
    expect(copilotoInsightUpdateManyMock).not.toHaveBeenCalled();
    expect(result.conversationSignalsRedacted).toBe(0);
    expect(result.timelineEventsRedacted).toBe(0);
    expect(result.voiceCallLogsRedacted).toBe(0);
    expect(result.copilotoTranscriptSegmentsRedacted).toBe(0);
    expect(result.copilotoInsightsRedacted).toBe(0);
  });

  it('é idempotente: contato já anonimizado não é regravado, mas WhatsApp continua sendo verificado', async () => {
    findFirstMock.mockResolvedValue({
      id: CONTACT_ID,
      name: ANONYMIZED_CONTACT_NAME,
      organizationId: ORG_ID,
    });

    const result = await eraseDataSubject({ organizationId: ORG_ID, contactId: CONTACT_ID });

    expect(updateMock).not.toHaveBeenCalled();
    expect(updateManyMock).toHaveBeenCalled();
    expect(result.alreadyAnonymized).toBe(true);
  });
});
