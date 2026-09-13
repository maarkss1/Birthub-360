// scripts/security/backfill-voice-transcript-pii.ts
//
// Cifra em repouso (AES-256-GCM, mesmo mecanismo de scripts/security/backfill-contact-pii.ts) as
// linhas de `VoiceCallLog` (`transcript`/`summary`/`recordingUrl`) e `CopilotoTranscriptSegment`
// (`text`) gravadas ANTES de essas colunas entrarem em `ENCRYPTED_MODEL_FIELDS`
// (src/lib/crypto/piiFields.ts) — ver ACH-VOICE-004 no audit de débito técnico
// (docs/audits/repository-debt-audit/agents/VOICE.md).
//
// Sem rodar isto, linhas antigas continuam LEGÍVEIS (decryptField trata texto sem o prefixo
// `enc:v1:` como passthrough — nenhuma leitura quebra), só ficam em texto puro no Postgres até a
// próxima escrita normal via API (que já passa pela extensão do Prisma e cifra sozinha). Diferente
// de scripts/security/backfill-contact-pii.ts, NÃO precisa de índice cego nem de loop por
// organização setando `app.current_tenant_id`: nenhum código deste repositório faz WHERE de
// igualdade/contains sobre `transcript`/`summary`/`recordingUrl`/`text` (só busca por id/
// organizationId/leadId/conversationId — ver comentário em piiFields.ts), e as duas tabelas aceitam
// `app.bypass_rls='on'` sem exigir também `app.current_tenant_id` (policy `tenant_isolation_policy`
// das migrations 20260911150000_voice_hub_connection_and_call_log e 20260902130000_copiloto_ia_rls:
// `USING (current_setting('app.current_tenant_id') = "organizationId" OR
// current_setting('app.bypass_rls') = 'on')` — o segundo braço do OR já basta), então um único
// `set_config` de sessão cobre as duas tabelas em todas as organizações de uma vez.
//
// Idempotente e seguro de rodar mais de uma vez: só toca linhas cujo campo ainda NÃO começa com o
// prefixo `enc:v1:` (ver secretFields.ts) — uma linha já migrada (por este script ou por uma edição
// normal via API) é pulada.
//
// `pg` direto (não o `prisma` exportado por src/lib/prisma.ts), mesmo padrão de
// backfill-contact-pii.ts — evita reentrar na extensão do Prisma (que cifraria de novo um valor já
// cifrado se o script usasse `prisma.voiceCallLog.update`, dado que o UPDATE leria o valor cru só se
// passasse pelo SELECT primeiro; ler/escrever via `pg` cru mantém o controle explícito de quando
// cifrar).
//
// Uso: DATABASE_URL=... CREDENTIALS_ENCRYPTION_KEY=... npx tsx scripts/security/backfill-voice-transcript-pii.ts [--dry-run]

import pg from 'pg';
import { encryptField } from '../../src/lib/crypto/secretFields.js';

const { Pool } = pg;

const BATCH_SIZE = 500;
const ENC_PREFIX = 'enc:v1:';
const dryRun = process.argv.includes('--dry-run');

function isPlaintext(value: string | null): value is string {
  return typeof value === 'string' && value.length > 0 && !value.startsWith(ENC_PREFIX);
}

type VoiceCallLogRow = {
  id: string;
  transcript: string | null;
  summary: string | null;
  recordingUrl: string | null;
};

type TranscriptSegmentRow = {
  id: string;
  text: string;
};

async function backfillVoiceCallLog(client: pg.PoolClient): Promise<{
  processed: number;
  migrated: number;
}> {
  let processed = 0;
  let migrated = 0;
  let lastId = '';

  for (;;) {
    // Keyset pagination por `id` (cuid, ordenável como string) — evita OFFSET numa tabela que pode
    // acumular milhões de linhas de histórico de chamada.
    const { rows } = await client.query<VoiceCallLogRow>(
      `SELECT id, transcript, summary, "recordingUrl" FROM "VoiceCallLog"
       WHERE id > $1
         AND (
           (transcript IS NOT NULL AND transcript NOT LIKE $2)
           OR (summary IS NOT NULL AND summary NOT LIKE $2)
           OR ("recordingUrl" IS NOT NULL AND "recordingUrl" NOT LIKE $2)
         )
       ORDER BY id ASC
       LIMIT $3`,
      [lastId, `${ENC_PREFIX}%`, BATCH_SIZE],
    );
    if (rows.length === 0) break;

    for (const row of rows) {
      processed++;
      const transcript = isPlaintext(row.transcript) ? row.transcript : null;
      const summary = isPlaintext(row.summary) ? row.summary : null;
      const recordingUrl = isPlaintext(row.recordingUrl) ? row.recordingUrl : null;
      if (!transcript && !summary && !recordingUrl) continue; // já migrado ou vazio

      migrated++;
      if (dryRun) continue;

      // Só entra no SET/params o campo que este lote está de fato tocando — mesmo cuidado de
      // backfill-contact-pii.ts: uma linha selecionada porque só `summary` ainda era texto puro
      // não pode reescrever `transcript`/`recordingUrl` com um valor por cima do que já foi
      // migrado numa passada anterior (aqui `null` de propósito no destructuring acima já garante
      // isso — só os três `if` abaixo tocam coluna).
      const sets: string[] = [];
      const params: unknown[] = [];
      const push = (column: string, value: unknown) => {
        params.push(value);
        sets.push(`"${column}" = $${params.length}`);
      };
      if (transcript) push('transcript', encryptField(transcript));
      if (summary) push('summary', encryptField(summary));
      if (recordingUrl) push('recordingUrl', encryptField(recordingUrl));
      params.push(row.id);
      await client.query(`UPDATE "VoiceCallLog" SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    }

    lastId = rows[rows.length - 1].id;
  }

  return { processed, migrated };
}

async function backfillCopilotoTranscriptSegment(client: pg.PoolClient): Promise<{
  processed: number;
  migrated: number;
}> {
  let processed = 0;
  let migrated = 0;
  let lastId = '';

  for (;;) {
    const { rows } = await client.query<TranscriptSegmentRow>(
      `SELECT id, text FROM "CopilotoTranscriptSegment"
       WHERE id > $1 AND text NOT LIKE $2
       ORDER BY id ASC
       LIMIT $3`,
      [lastId, `${ENC_PREFIX}%`, BATCH_SIZE],
    );
    if (rows.length === 0) break;

    for (const row of rows) {
      processed++;
      if (!isPlaintext(row.text)) continue; // linha vazia (não deveria existir — `text` não é
      // nulável — mas defensivo) ou já migrada
      migrated++;
      if (dryRun) continue;

      await client.query(`UPDATE "CopilotoTranscriptSegment" SET text = $1 WHERE id = $2`, [
        encryptField(row.text),
        row.id,
      ]);
    }

    lastId = rows[rows.length - 1].id;
  }

  return { processed, migrated };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL é obrigatória.');
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();

  try {
    // `is_local=false` (sessão inteira) de propósito — mesmo motivo documentado em
    // backfill-contact-pii.ts: este script roda fora de qualquer `BEGIN`, então cada `query()` é
    // sua própria transação implícita, e um `set_config(..., true)` seria descartado antes da
    // PRÓXIMA query. `max: 1` garante que a mesma conexão física é reusada, então o valor de
    // sessão persiste entre as duas fases abaixo.
    await client.query(`SELECT set_config('app.bypass_rls', 'on', false)`);

    const voiceCallLog = await backfillVoiceCallLog(client);
    console.log(
      `[backfill-voice-transcript-pii] VoiceCallLog concluído${dryRun ? ' (--dry-run, nenhuma escrita real)' : ''} — processados=${voiceCallLog.processed} migrados=${voiceCallLog.migrated}`,
    );

    const transcriptSegment = await backfillCopilotoTranscriptSegment(client);
    console.log(
      `[backfill-voice-transcript-pii] CopilotoTranscriptSegment concluído${dryRun ? ' (--dry-run, nenhuma escrita real)' : ''} — processados=${transcriptSegment.processed} migrados=${transcriptSegment.migrated}`,
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[backfill-voice-transcript-pii] falhou', error);
  process.exitCode = 1;
});
