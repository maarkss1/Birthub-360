import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verificação de assinatura de webhook do Stripe — lógica pura, sem env/rede, mesmo raciocínio de
 * separação de chatwoot.helpers.ts/birthVoice.helpers.ts (a verificação é a parte crítica de
 * segurança e precisa ser testável isoladamente).
 *
 * Esquema documentado pela Stripe: cada entrega carrega o header `Stripe-Signature` no formato
 * `t=<timestamp>,v1=<hex>[,v1=<hex2>]` (mais de um `v1` aparece durante rotação do segredo de
 * assinatura — a Stripe recomenda aceitar qualquer um que bata) — a assinatura é HMAC-SHA256 sobre
 * `"{timestamp}.{corpo cru}"`, mesmo esquema de "timestamp + corpo" do Chatwoot, formato de header
 * diferente.
 */

const DEFAULT_MAX_SKEW_SECONDS = 5 * 60;

export interface StripeSignatureInput {
  rawBody: Buffer;
  signatureHeader: string | undefined;
  secret: string;
  /** Injetável só para teste determinístico — em produção é sempre `Date.now()`. */
  nowMs?: number;
  maxSkewSeconds?: number;
}

function parseSignatureHeader(header: string): {
  timestamp: string | null;
  v1Signatures: string[];
} {
  let timestamp: string | null = null;
  const v1Signatures: string[] = [];
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!value) continue;
    if (key === 't') timestamp = value;
    if (key === 'v1') v1Signatures.push(value);
  }
  return { timestamp, v1Signatures };
}

/**
 * Confere a assinatura HMAC da Stripe sobre `"{timestamp}.{corpo cru}"` e rejeita timestamps fora
 * da janela de tolerância — a Stripe realmente envia um timestamp assinado (igual ao Chatwoot),
 * então dá para checar frescor aqui em vez de confiar só no replay guard genérico (ver
 * webhookReplayGuard.ts).
 */
export function isValidStripeSignature({
  rawBody,
  signatureHeader,
  secret,
  nowMs = Date.now(),
  maxSkewSeconds = DEFAULT_MAX_SKEW_SECONDS,
}: StripeSignatureInput): boolean {
  if (!signatureHeader) return false;

  const { timestamp, v1Signatures } = parseSignatureHeader(signatureHeader);
  if (!timestamp || v1Signatures.length === 0) return false;

  const timestampNum = Number(timestamp);
  if (!Number.isFinite(timestampNum)) return false;
  const skewSeconds = Math.abs(nowMs / 1000 - timestampNum);
  if (skewSeconds > maxSkewSeconds) return false;

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expectedHex = createHmac('sha256', secret).update(signedPayload).digest('hex');
  const expected = Buffer.from(expectedHex, 'utf8');

  // Testa contra CADA v1 do header (rotação de segredo pode mandar mais de um) — basta um bater.
  return v1Signatures.some((sig) => {
    const received = Buffer.from(sig, 'utf8');
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

/** Subconjunto do payload de evento da Stripe que este webhook de fato usa hoje (autenticidade +
 * log estruturado — ver stripe.webhook.ts sobre por que decidir uma ação real de negócio a partir
 * de um evento é escopo de BILLING-003, não deste receiver). */
export interface StripeWebhookEvent {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
}
