import { z } from 'zod';

/**
 * Payload sent by the AtlasGR CRM to `POST /api/webhook/atlasgr/outbound` to request a
 * qualification call for a lead.
 *
 * `lead_id` is OPTIONAL and additive on purpose: the field did not exist in the payload this
 * endpoint originally accepted (`{ phone_number, name, company }`), and this route is a
 * production contract owned by the sibling AtlasGR repository — adding a required field would be
 * a breaking change. Making it optional lets AtlasGR start sending a stable identifier for
 * reliable idempotency without invalidating whatever it sends today.
 */
export const atlasGROutboundPayloadSchema = z
  .object({
    phone_number: z
      .string()
      .trim()
      .min(8, 'phone_number deve ter ao menos 8 caracteres')
      .max(20, 'phone_number deve ter no máximo 20 caracteres')
      .regex(/^\+?[0-9()\-\s]+$/, 'phone_number contém caracteres inválidos'),
    name: z.string().trim().min(1, 'name é obrigatório').max(200),
    company: z.string().trim().min(1, 'company é obrigatório').max(200),
    lead_id: z.string().trim().min(1).max(200).optional(),
    from: z
      .string()
      .trim()
      .min(8, 'from deve ter ao menos 8 caracteres')
      .max(20, 'from deve ter no máximo 20 caracteres')
      .regex(/^\+?[0-9()\-\s]+$/, 'from contém caracteres inválidos')
      .optional(),
  })
  .strict();

export type AtlasGROutboundPayload = z.infer<typeof atlasGROutboundPayloadSchema>;

/**
 * Result payload Bland AI posts back to `${WEBHOOK_BASE_URL}/api/webhooks/bland/:token` once a
 * dispatched call finishes. Bland AI's own webhook body includes many more fields than this — kept
 * loose (`.passthrough()`) on purpose so we don't reject a legitimate callback just because Bland
 * added/renamed a field we don't consume, while still requiring the identifiers we actually use.
 */
export const blandCallResultSchema = z
  .object({
    call_id: z.string().trim().min(1, 'call_id é obrigatório'),
    status: z.string().trim().min(1).optional(),
  })
  .passthrough();

export type BlandCallResult = z.infer<typeof blandCallResultSchema>;
