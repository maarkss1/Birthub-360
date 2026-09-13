import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { Pool } from 'pg';
import { prisma } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';

/**
 * Prova, contra Postgres real, `scripts/security/backfill-voice-transcript-pii.ts` — o script que
 * cifra retroativamente `VoiceCallLog.transcript/summary/recordingUrl` e
 * `CopilotoTranscriptSegment.text` gravados ANTES de essas colunas entrarem em
 * `ENCRYPTED_MODEL_FIELDS` (ACH-VOICE-004, ver src/lib/crypto/piiFields.ts).
 *
 * Diferente de `backfill-contact-pii.test.ts` (Contact exige `app.current_tenant_id` por
 * organização — sem cláusula de bypass na policy), aqui o script usa só `app.bypass_rls='on'`: a
 * policy de RLS de VoiceCallLog/CopilotoTranscriptSegment aceita esse braço do OR sozinho (ver
 * comentário no topo do script) — este teste também serve para pegar uma regressão caso essa
 * policy mude e o bypass sozinho pare de bastar (o script então migraria ZERO linhas
 * silenciosamente, o mesmo modo de falha que o teste irmão do Contact documenta).
 */

const ORG = `test-backfill-voice-pii-org-${Date.now()}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

function runBackfill(extraArgs: string[] = []): string {
  return execFileSync(
    'npx',
    ['tsx', 'scripts/security/backfill-voice-transcript-pii.ts', ...extraArgs],
    { cwd: process.cwd(), env: process.env, encoding: 'utf8' },
  );
}

beforeAll(async () => {
  await requestContext.run({ bypassRls: true }, () =>
    prisma.organization.create({ data: { id: ORG, name: ORG } }),
  );
});

afterAll(async () => {
  await requestContext.run({ bypassRls: true }, async () => {
    await prisma.copilotoTranscriptSegment.deleteMany({ where: { organizationId: ORG } });
    await prisma.copilotoConversation.deleteMany({ where: { organizationId: ORG } });
    await prisma.voiceCallLog.deleteMany({ where: { organizationId: ORG } });
    await prisma.organization.delete({ where: { id: ORG } });
  });
  await pool.end();
});

describe('backfill-voice-transcript-pii — migra VoiceCallLog/CopilotoTranscriptSegment legados (texto puro) para cifrado', () => {
  it('cifra ambas as tabelas de forma idempotente, sem tocar linhas já migradas', async () => {
    let voiceCallLogId = '';
    let segmentId = '';
    await requestContext.run({ tenantId: ORG }, async () => {
      // Cria normalmente (fica cifrado pela extensão do Prisma) e regrava como texto puro via SQL
      // cru por baixo dela — simula uma linha gravada ANTES desta correção existir.
      const call = await prisma.voiceCallLog.create({
        data: {
          organizationId: ORG,
          leadId: `fake-lead-${ORG}`,
          providerCallId: `call-${ORG}`,
          outcome: 'connected_positive',
          durationSeconds: 10,
          transcript: 'Transcrição legada em texto puro',
          summary: 'Resumo legado em texto puro',
        },
      });
      voiceCallLogId = call.id;

      const conversation = await prisma.copilotoConversation.create({
        data: { organizationId: ORG, source: 'CALL' },
      });
      const segment = await prisma.copilotoTranscriptSegment.create({
        data: {
          organizationId: ORG,
          conversationId: conversation.id,
          startMs: 0,
          endMs: 1000,
          text: 'Segmento legado em texto puro',
        },
      });
      segmentId = segment.id;
    });

    await pool.query(`SELECT set_config('app.bypass_rls', 'on', false)`);
    await pool.query(`UPDATE "VoiceCallLog" SET transcript = $1, summary = $2 WHERE id = $3`, [
      'Transcrição legada em texto puro',
      'Resumo legado em texto puro',
      voiceCallLogId,
    ]);
    await pool.query(`UPDATE "CopilotoTranscriptSegment" SET text = $1 WHERE id = $2`, [
      'Segmento legado em texto puro',
      segmentId,
    ]);

    const legacy = await pool.query(
      'SELECT transcript, summary FROM "VoiceCallLog" WHERE id = $1',
      [voiceCallLogId],
    );
    expect(legacy.rows[0].transcript).toBe('Transcrição legada em texto puro'); // confirma o setup

    const dryRunOutput = runBackfill(['--dry-run']);
    expect(dryRunOutput).toMatch(/dry-run/);
    const afterDryRun = await pool.query('SELECT transcript FROM "VoiceCallLog" WHERE id = $1', [
      voiceCallLogId,
    ]);
    expect(afterDryRun.rows[0].transcript).toBe('Transcrição legada em texto puro'); // --dry-run não escreve

    runBackfill();

    const migratedCall = await pool.query(
      'SELECT transcript, summary, "recordingUrl" FROM "VoiceCallLog" WHERE id = $1',
      [voiceCallLogId],
    );
    expect(String(migratedCall.rows[0].transcript)).toMatch(/^enc:v1:/);
    expect(String(migratedCall.rows[0].summary)).toMatch(/^enc:v1:/);
    expect(migratedCall.rows[0].recordingUrl).toBeNull(); // nunca foi setado — continua null

    const migratedSegment = await pool.query(
      'SELECT text FROM "CopilotoTranscriptSegment" WHERE id = $1',
      [segmentId],
    );
    expect(String(migratedSegment.rows[0].text)).toMatch(/^enc:v1:/);

    // Leitura normal via Prisma decifra de volta — prova que o valor migrado é utilizável pelo
    // resto do código exatamente como um valor cifrado pela extensão numa escrita normal seria.
    await requestContext.run({ tenantId: ORG }, async () => {
      const call = await prisma.voiceCallLog.findUniqueOrThrow({ where: { id: voiceCallLogId } });
      expect(call.transcript).toBe('Transcrição legada em texto puro');
      expect(call.summary).toBe('Resumo legado em texto puro');

      const segment = await prisma.copilotoTranscriptSegment.findUniqueOrThrow({
        where: { id: segmentId },
      });
      expect(segment.text).toBe('Segmento legado em texto puro');
    });

    // Idempotência: rodar de novo não re-cifra (ciphertext idêntico — nova cifragem teria IV
    // diferente e mudaria o valor).
    runBackfill();
    const afterSecondRun = await pool.query(
      'SELECT transcript FROM "VoiceCallLog" WHERE id = $1',
      [voiceCallLogId],
    );
    expect(afterSecondRun.rows[0].transcript).toBe(migratedCall.rows[0].transcript);
  }, 30_000);
});
