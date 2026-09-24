import twilio from 'twilio';

type TwilioClient = ReturnType<typeof twilio>;

/**
 * Thrown when an outbound call is requested but the Twilio credentials / caller ID / public URL
 * needed to place it are not configured. Distinct from a Twilio API failure: this one is a
 * deployment problem, not a call problem, so callers surface it as 503 rather than 502.
 */
export class TwilioNotConfiguredError extends Error {}

export interface OutboundConfig {
  client: TwilioClient;
  fromNumber: string;
  /** PUBLIC_BASE_URL with any trailing slash stripped, so callers can append paths safely. */
  baseUrl: string;
}

// The Twilio SDK client is stateless but opens its own HTTP agent, so we reuse one per credential
// pair instead of constructing it per call. Keyed by the credentials themselves so a test (or a
// re-read of the environment) that changes them doesn't silently keep talking to the old account.
let cached: { key: string; client: TwilioClient } | null = null;

function clientFor(accountSid: string, authToken: string): TwilioClient {
  const key = `${accountSid}:${authToken}`;
  if (!cached || cached.key !== key) {
    cached = { key, client: twilio(accountSid, authToken) };
  }
  return cached.client;
}

/**
 * Resolves everything needed to place an outbound call, failing loudly and specifically when a
 * piece is missing — an outbound call silently not happening is far worse than a 503.
 */
export function getOutboundConfig(): OutboundConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const baseUrl = process.env.PUBLIC_BASE_URL;

  const missing = [
    !accountSid && 'TWILIO_ACCOUNT_SID',
    !authToken && 'TWILIO_AUTH_TOKEN',
    !fromNumber && 'TWILIO_FROM_NUMBER',
    !baseUrl && 'PUBLIC_BASE_URL',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new TwilioNotConfiguredError(
      `Chamadas de saída não estão configuradas. Variáveis ausentes: ${missing.join(', ')}.`,
    );
  }

  return {
    client: clientFor(accountSid!, authToken!),
    fromNumber: fromNumber!,
    baseUrl: baseUrl!.replace(/\/$/, ''),
  };
}

/** Test seam: drops the memoized client so a suite can swap credentials between cases. */
export function resetTwilioClientCache(): void {
  cached = null;
}
