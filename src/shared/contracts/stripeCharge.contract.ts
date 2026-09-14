/**
 * Contrato de composição entre `src/features/crm360/` e `src/features/integrations/stripe/`
 * — não é um DTO compartilhado (como os demais arquivos desta pasta), é uma PORTA de dependência
 * (padrão hexagonal): `crm360` depende só desta interface, nunca de `integrations/stripe/*`
 * diretamente. Import direto de internals de outra feature é proibido por `.dependency-cruiser.cjs`
 * (regra `no-cross-feature-imports`) — "composição entre features acontece via src/shared/
 * (contratos) ou via chamada HTTP à rota da outra feature, nunca via import direto de
 * application/infra/domain de um módulo vizinho".
 *
 * A implementação real (`StripeChargeAdapter`, dono: feature `integrations/stripe`) é registrada
 * no container de DI em `src/shared/di/setup.ts` — o único lugar do repositório que tem licença
 * para importar de ambas as features ao mesmo tempo (raiz de composição).
 */
export interface StripeChargeResult {
  paymentId: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface StripeChargePort {
  /**
   * Consulta AO VIVO uma cobrança (PaymentIntent) existente via a conexão Stripe — usado por
   * BILLING-003 (reconciliação Fatura x Stripe) para confirmar que o pagamento é real antes de
   * marcar um documento comercial como Pago. Nunca confia num status/valor só informado pelo
   * chamador.
   *
   * @returns `null` se a cobrança não existir para essa conexão.
   */
  getStripeCharge(
    organizationId: string,
    connectionId: string,
    paymentId: string,
  ): Promise<StripeChargeResult | null>;
}
