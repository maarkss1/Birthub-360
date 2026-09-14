import type {
  StripeChargePort,
  StripeChargeResult,
} from '../../../../shared/contracts/stripeCharge.contract.js';
import { getStripeCharge } from '../stripe.service.js';

/** Implementação real de `StripeChargePort` — repassa direto para `getStripeCharge` (o próprio
 *  feature `integrations/stripe` continua dono da lógica de validação de id, resolução de conexão
 *  e chamada HTTP à API da Stripe; este adapter só existe para satisfazer a porta de composição
 *  usada por `crm360`, ver `stripeCharge.contract.ts`). */
export class StripeChargeAdapter implements StripeChargePort {
  async getStripeCharge(
    organizationId: string,
    connectionId: string,
    paymentId: string,
  ): Promise<StripeChargeResult | null> {
    return getStripeCharge(organizationId, connectionId, paymentId);
  }
}
