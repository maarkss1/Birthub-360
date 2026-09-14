/**
 * Verificação de assinatura de webhook do Stripe (BILLING-007) — lógica pura, sem rede/DB. Mesma
 * classe de garantia dos outros esquemas HMAC deste projeto (chatwoot.helpers.ts/
 * birthVoice.helpers.ts): uma entrega sem assinatura válida, ou fora da janela de tolerância do
 * timestamp, nunca deve ser aceita como autêntica.
 */
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { isValidStripeSignature } from '@/features/integrations/stripe/stripe.helpers';

const SECRET = 'whsec_test_segredo';

function signedHeader(payload: string, secret: string, timestampSeconds: number): string {
  const signedPayload = `${timestampSeconds}.${payload}`;
  const v1 = createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestampSeconds},v1=${v1}`;
}

describe('isValidStripeSignature', () => {
  const payload = JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded' });
  const nowMs = 1_700_000_000_000;
  const nowSeconds = nowMs / 1000;

  it('aceita uma assinatura válida dentro da janela de tolerância', () => {
    const header = signedHeader(payload, SECRET, nowSeconds);
    expect(
      isValidStripeSignature({
        rawBody: Buffer.from(payload),
        signatureHeader: header,
        secret: SECRET,
        nowMs,
      }),
    ).toBe(true);
  });

  it('rejeita quando o header de assinatura está ausente', () => {
    expect(
      isValidStripeSignature({
        rawBody: Buffer.from(payload),
        signatureHeader: undefined,
        secret: SECRET,
        nowMs,
      }),
    ).toBe(false);
  });

  it('rejeita quando o corpo foi alterado após a assinatura ser calculada', () => {
    const header = signedHeader(payload, SECRET, nowSeconds);
    const tamperedPayload = JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded', amount: 999999 });
    expect(
      isValidStripeSignature({
        rawBody: Buffer.from(tamperedPayload),
        signatureHeader: header,
        secret: SECRET,
        nowMs,
      }),
    ).toBe(false);
  });

  it('rejeita quando o segredo usado para assinar não é o mesmo configurado na conexão', () => {
    const header = signedHeader(payload, 'whsec_outro_segredo', nowSeconds);
    expect(
      isValidStripeSignature({
        rawBody: Buffer.from(payload),
        signatureHeader: header,
        secret: SECRET,
        nowMs,
      }),
    ).toBe(false);
  });

  it('rejeita um timestamp fora da janela de tolerância (replay tardio)', () => {
    const staleTimestamp = nowSeconds - 10 * 60; // 10 min atrás, acima do default de 5 min.
    const header = signedHeader(payload, SECRET, staleTimestamp);
    expect(
      isValidStripeSignature({
        rawBody: Buffer.from(payload),
        signatureHeader: header,
        secret: SECRET,
        nowMs,
      }),
    ).toBe(false);
  });

  it('aceita quando UM dos múltiplos v1 do header bate (cenário de rotação de segredo)', () => {
    const goodV1 = signedHeader(payload, SECRET, nowSeconds).split(',')[1];
    const header = `t=${nowSeconds},v1=assinatura-de-segredo-antigo-nao-bate,${goodV1}`;
    expect(
      isValidStripeSignature({
        rawBody: Buffer.from(payload),
        signatureHeader: header,
        secret: SECRET,
        nowMs,
      }),
    ).toBe(true);
  });
});
