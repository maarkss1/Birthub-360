-- BILLING-007 (Onda 5): webhook de ENTRADA do Stripe — segredo de assinatura por conexão (vem DA
-- Stripe, colado por quem configura o endpoint no Dashboard dela). Nulo até ser configurado; a
-- ausência já é o estado "webhook não configurado", sem flag separado de enabled/disabled (ver
-- StripeConnection.webhookSecret em schema.prisma).

ALTER TABLE "StripeConnection" ADD COLUMN "webhookSecret" TEXT;
