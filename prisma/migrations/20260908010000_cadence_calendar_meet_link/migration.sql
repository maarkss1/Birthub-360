-- Adiciona meetUrl/iCalUID a CadenceCalendarEvent (link real do Google Meet + UID do convite ICS
-- enviado por e-mail). Colunas nullable, sem default: nenhum registro existente é afetado, e todo
-- INSERT já feito pelo backend continua válido sem alteração.
ALTER TABLE "CadenceCalendarEvent" ADD COLUMN "meetUrl" TEXT;
ALTER TABLE "CadenceCalendarEvent" ADD COLUMN "iCalUID" TEXT;
