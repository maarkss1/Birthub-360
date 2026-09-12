-- ACH-06-01: adiciona a coluna real de webhookSecret por-organização em VoiceHubConnection.
-- A migration original (20260911150000_voice_hub_connection_and_call_log) deixou esse campo de
-- fora de propósito ("fora do escopo desta migration"); a auditoria (ACH-01-01) encontrou o
-- drift resultante (schema declarava o campo, banco não tinha a coluna) e cogitou remover o
-- campo. A mesma auditoria (ACH-06-01) mostrou que ele é necessário: sem segredo por-organização,
-- o webhook do Birth Voices Hub validava contra um segredo global compartilhado + organizationId
-- auto-declarado no payload, permitindo forjar webhook entre organizações. Esta migration cria a
-- coluna real; o valor é gerado e persistido por connectVoiceHub (voiceHubConnection.service.ts)
-- e cifrado em repouso pela extensão Prisma (ver ENCRYPTED_MODEL_FIELDS em
-- src/lib/crypto/piiFields.ts).

ALTER TABLE "VoiceHubConnection" ADD COLUMN "webhookSecret" TEXT;
