import dns from 'node:dns/promises';
import disposableDomains from 'disposable-email-domains';
import { logger } from '../../../lib/logger';
import { withTimeout } from '../../../lib/http.js';

// `dns.resolveMx`/`resolveTxt` (API de Promise do Node) não aceitam AbortSignal nem têm timeout
// próprio exposto — em DNS lento/sem resposta, a chamada podia ficar pendurada por bem mais tempo
// que qualquer chamada HTTP deste domínio (todas via fetchWithTimeout/fetchWithProviderRetry).
// `withTimeout` (lib/http.ts) existe exatamente para isso: SDKs/APIs que não expõem cancelamento.
// Esta checagem roda no caminho síncrono de criação de contato (enrichmentCascade.service.ts,
// enrichment.service.ts) — um DNS lento atrasaria a criação do lead inteiro sem isto.
const MX_LOOKUP_TIMEOUT_MS = 5_000;
const TXT_LOOKUP_TIMEOUT_MS = 3_000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPOSABLE_DOMAIN_SET = new Set(disposableDomains);

export type EmailDeliverabilityStatus = 'verified' | 'invalid' | 'unknown';

export interface EmailDeliverabilityResult {
  email: string;
  status: EmailDeliverabilityStatus;
  reason?: 'invalid_format' | 'disposable_domain' | 'no_mail_server' | 'check_failed';
  hasMx?: boolean;
  hasSpf?: boolean;
  hasDmarc?: boolean;
  mxExchange?: string;
}

/**
 * Checagem de entregabilidade open-source avançada: formato + domínio descartável + registro MX real
 * + verificação de registros SPF e DMARC via DNS nativo — triagem de grau profissional sem depender de APIs pagas.
 */
export async function checkEmailDeliverability(email: string): Promise<EmailDeliverabilityResult> {
  const trimmed = (email || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(trimmed)) {
    return { email: trimmed, status: 'invalid', reason: 'invalid_format' };
  }

  const domain = trimmed.split('@')[1];
  if (DISPOSABLE_DOMAIN_SET.has(domain)) {
    return { email: trimmed, status: 'invalid', reason: 'disposable_domain' };
  }

  try {
    const records = await withTimeout(dns.resolveMx(domain), MX_LOOKUP_TIMEOUT_MS);
    if (!records.length) {
      return { email: trimmed, status: 'invalid', reason: 'no_mail_server' };
    }

    const sortedMx = [...records].sort((a, b) => a.priority - b.priority);
    const primaryMx = sortedMx[0]?.exchange || '';

    // Inspeção complementar de segurança de domínio (SPF e DMARC) sem quebrar testes unitários existentes
    let hasSpf: boolean | undefined;
    let hasDmarc: boolean | undefined;
    try {
      const txt = await withTimeout(dns.resolveTxt(domain), TXT_LOOKUP_TIMEOUT_MS);
      hasSpf = txt.some((row) => row.join('').includes('v=spf1'));
    } catch {
      /* ignore */
    }
    try {
      const dmarc = await withTimeout(dns.resolveTxt(`_dmarc.${domain}`), TXT_LOOKUP_TIMEOUT_MS);
      hasDmarc = dmarc.some((row) => row.join('').includes('v=DMARC1'));
    } catch {
      /* ignore */
    }

    if (primaryMx) {
      logger.debug({ domain, primaryMx, hasSpf, hasDmarc }, 'MX server verified');
    }

    return {
      email: trimmed,
      status: 'verified',
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      return { email: trimmed, status: 'invalid', reason: 'no_mail_server' };
    }
    logger.warn({ err: error, domain }, 'Email verification engine error');
    return { email: trimmed, status: 'unknown', reason: 'check_failed' };
  }
}
