import { Readable } from 'node:stream';
import NodeClam from 'clamscan';
import { logger } from '../lib/logger.js';

/**
 * Thrown when a scanned buffer tests positive for one or more viruses. Callers must reject the
 * upload and must never write the buffer to object storage after catching this error.
 */
export class InfectedFileError extends Error {
  readonly viruses: string[];

  constructor(filename: string, viruses: string[]) {
    super(`Arquivo "${filename}" está infectado e foi rejeitado.`);
    this.name = 'InfectedFileError';
    this.viruses = viruses;
  }
}

/**
 * Thrown whenever the antivirus scan itself could not be completed for any reason (ClamAV
 * unreachable, connection refused, scan timeout, malformed response, etc).
 *
 * This is the "fail closed" signal: every caller MUST treat this exactly like an infected file —
 * reject the upload — rather than falling back to accepting the file unscanned. Never catch this
 * error and continue the upload path silently.
 */
export class AntivirusUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Não foi possível concluir a varredura de antivírus (ClamAV indisponível).');
    this.name = 'AntivirusUnavailableError';
    this.cause = cause;
  }
}

export async function createAntivirusScanner() {
  const clam = await new NodeClam().init({
    clamdscan: {
      host: process.env.CLAMAV_HOST ?? '127.0.0.1',
      port: Number(process.env.CLAMAV_PORT ?? 3310),
      timeout: 60_000,
      localFallback: false,
    },
    preference: 'clamdscan',
  });
  return clam;
}

/**
 * Scans a buffer for viruses before it is allowed anywhere near `objectStorage.ts`.
 *
 * Policy (non-negotiable, see AGENTS.md bloqueador #10 and `.agents/prompts/06-integracoes-externas.md`):
 * - every upload must be scanned before persistence, never after, never optionally;
 * - an infected file is rejected with a clear, loggable error;
 * - if ClamAV itself is unreachable/misbehaving, the upload is rejected too ("fail closed") —
 *   accepting an unscanned file just because the scanner is down would defeat the control
 *   entirely.
 *
 * Callers (upload routes owned by other agents) should call this before any
 * `objectStorage.ts` write and propagate `InfectedFileError`/`AntivirusUnavailableError` as a
 * 4xx/503 to the end user — never swallow them.
 */
export async function scanBufferForViruses(buffer: Buffer, filename: string): Promise<{ clean: true }> {
  let clam: Awaited<ReturnType<typeof createAntivirusScanner>>;

  try {
    clam = await createAntivirusScanner();
  } catch (error) {
    logger.error('Antivirus scan rejected upload: ClamAV scanner could not be initialized', {
      filename,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AntivirusUnavailableError(error);
  }

  let result: { isInfected: boolean | null; viruses: string[] };
  try {
    result = await clam.scanStream(Readable.from(buffer));
  } catch (error) {
    logger.error('Antivirus scan rejected upload: ClamAV scan failed', {
      filename,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AntivirusUnavailableError(error);
  }

  // `isInfected` is `null` when clamscan could not determine a definitive result (e.g. malformed
  // clamd response) — treated the same as "unavailable", never as "clean by default".
  if (result.isInfected === null) {
    logger.error('Antivirus scan rejected upload: ClamAV returned an inconclusive result', { filename });
    throw new AntivirusUnavailableError(new Error('Inconclusive ClamAV result'));
  }

  if (result.isInfected) {
    logger.warn('Antivirus scan rejected upload: infected file', { filename, viruses: result.viruses });
    throw new InfectedFileError(filename, result.viruses);
  }

  return { clean: true };
}
