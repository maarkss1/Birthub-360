-- Backfill de dado, não mudança de schema: as colunas `brand` de AssistantMessage,
-- RoleplaySession, QualificationMatrixItem e ObjectionMatrixItem podiam conter os valores
-- legados 'atlasgr'/'totaltrac' (playbooks nomeados por empresa, removidos de
-- src/config/playbooks.ts em 09/2026 — hoje só 'geral' é gravável por escrita nova). Pedido
-- explícito do usuário (2026-09-22): não há mais vínculo com essas duas operações, então as
-- linhas antigas devem ser migradas para 'geral' de verdade, não só permanecer legíveis por
-- compatibilidade.
--
-- Todo código de leitura já trata qualquer chave desconhecida como 'geral' via fallback
-- (playbookInfo() em src/config/playbooks.ts), então este UPDATE não muda nenhum comportamento
-- visível da aplicação — só remove o valor legado do dado em si.
UPDATE "AssistantMessage" SET "brand" = 'geral' WHERE "brand" IN ('atlasgr', 'totaltrac');
UPDATE "RoleplaySession" SET "brand" = 'geral' WHERE "brand" IN ('atlasgr', 'totaltrac');
UPDATE "QualificationMatrixItem" SET "brand" = 'geral' WHERE "brand" IN ('atlasgr', 'totaltrac');
UPDATE "ObjectionMatrixItem" SET "brand" = 'geral' WHERE "brand" IN ('atlasgr', 'totaltrac');
