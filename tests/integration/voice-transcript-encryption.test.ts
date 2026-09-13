import { describe, it, expect, afterAll } from 'vitest';
import { prisma, withRlsContext } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';

/**
 * ACH-VOICE-004: prova, contra Postgres real, que `VoiceCallLog.transcript/summary/recordingUrl`
 * e `CopilotoTranscriptSegment.text` — conteúdo de chamada de voz, mesma classe de sensibilidade
 * de `Contact.email/phone/whatsapp` — agora são cifrados em repouso (AES-256-GCM, mesma extensão
 * do Prisma em src/lib/prisma.ts, config em src/lib/crypto/piiFields.ts::ENCRYPTED_MODEL_FIELDS),
 * mesmo padrão já usado por `tests/integration/voice-hub-connection-persistence.test.ts` para
 * `VoiceHubConnection.apiKey`.
 *
 * `$queryRaw` (via `withRlsContext`) ignora a extensão de decrypt do client Prisma — é a única
 * forma de ver o byte cru gravado no Postgres, sem depender de a extensão "mentir" que já decifrou.
 */

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ORG = `test-voice-encryption-org-${RUN_ID}`;

const withBypass = <T>(fn: () => Promise<T>): Promise<T> =>
  requestContext.run({ bypassRls: true }, fn);
const asOrg = <T>(fn: () => Promise<T>): Promise<T> => requestContext.run({ tenantId: ORG }, fn);

afterAll(async () => {
  await asOrg(async () => {
    await prisma.copilotoTranscriptSegment.deleteMany({ where: { organizationId: ORG } });
    await prisma.copilotoConversation.deleteMany({ where: { organizationId: ORG } });
    await prisma.voiceCallLog.deleteMany({ where: { organizationId: ORG } });
  });
  await withBypass(() => prisma.organization.delete({ where: { id: ORG } }));
});

describe('Cifra em repouso de conteúdo de chamada de voz (VoiceCallLog, CopilotoTranscriptSegment)', () => {
  it('cria a organização de teste', async () => {
    await withBypass(() => prisma.organization.create({ data: { id: ORG, name: ORG } }));
  });

  it('VoiceCallLog.transcript/summary/recordingUrl: a linha crua no banco não contém o texto puro, mas a leitura via Prisma decifra normalmente', async () => {
    const created = await asOrg(() =>
      prisma.voiceCallLog.create({
        data: {
          organizationId: ORG,
          leadId: `fake-lead-${RUN_ID}`,
          providerCallId: `call-${RUN_ID}`,
          outcome: 'connected_positive',
          durationSeconds: 42,
          summary: 'Resumo em texto puro da ligação',
          transcript: 'Transcrição completa em texto puro da ligação',
          recordingUrl: 'https://cdn.example.com/recordings/plain.mp3',
        },
      }),
    );

    const raw = await asOrg(() =>
      withRlsContext(
        (tx) =>
          tx.$queryRaw<Array<{ transcript: string | null; summary: string | null; recordingUrl: string | null }>>`
                    SELECT transcript, summary, "recordingUrl" FROM "VoiceCallLog" WHERE id = ${created.id}
                `,
      ),
    );
    expect(raw).toHaveLength(1);
    expect(raw[0].transcript).not.toBe('Transcrição completa em texto puro da ligação');
    expect(raw[0].transcript).toMatch(/^enc:v1:/);
    expect(raw[0].summary).not.toBe('Resumo em texto puro da ligação');
    expect(raw[0].summary).toMatch(/^enc:v1:/);
    expect(raw[0].recordingUrl).not.toBe('https://cdn.example.com/recordings/plain.mp3');
    expect(raw[0].recordingUrl).toMatch(/^enc:v1:/);

    // Leitura normal via Prisma continua transparente — a extensão decifra na volta, nenhum
    // consumidor do resto do código precisa saber que o campo é cifrado.
    const reread = await asOrg(() =>
      prisma.voiceCallLog.findUniqueOrThrow({ where: { id: created.id } }),
    );
    expect(reread.transcript).toBe('Transcrição completa em texto puro da ligação');
    expect(reread.summary).toBe('Resumo em texto puro da ligação');
    expect(reread.recordingUrl).toBe('https://cdn.example.com/recordings/plain.mp3');
    // Não-PII permanece intocado.
    expect(reread.outcome).toBe('connected_positive');
    expect(reread.durationSeconds).toBe(42);
  });

  it('CopilotoTranscriptSegment.text: a linha crua no banco não contém o texto puro, mas a leitura via Prisma decifra normalmente', async () => {
    const conversation = await asOrg(() =>
      prisma.copilotoConversation.create({
        data: { organizationId: ORG, source: 'CALL' },
      }),
    );
    const created = await asOrg(() =>
      prisma.copilotoTranscriptSegment.create({
        data: {
          organizationId: ORG,
          conversationId: conversation.id,
          startMs: 0,
          endMs: 1000,
          text: 'Segmento de transcrição em texto puro',
        },
      }),
    );

    const raw = await asOrg(() =>
      withRlsContext(
        (tx) =>
          tx.$queryRaw<Array<{ text: string }>>`
                    SELECT text FROM "CopilotoTranscriptSegment" WHERE id = ${created.id}
                `,
      ),
    );
    expect(raw).toHaveLength(1);
    expect(raw[0].text).not.toBe('Segmento de transcrição em texto puro');
    expect(raw[0].text).toMatch(/^enc:v1:/);

    const reread = await asOrg(() =>
      prisma.copilotoTranscriptSegment.findUniqueOrThrow({ where: { id: created.id } }),
    );
    expect(reread.text).toBe('Segmento de transcrição em texto puro');
  });
});
