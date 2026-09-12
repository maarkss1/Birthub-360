-- Migration para unificar as chaves 'atlasgr' e 'totaltrac' para 'birthub360'.

UPDATE "AssistantMessage" SET "brand" = 'birthub360' WHERE "brand" IN ('atlasgr', 'totaltrac');
UPDATE "RoleplaySession" SET "brand" = 'birthub360' WHERE "brand" IN ('atlasgr', 'totaltrac');
UPDATE "QualificationMatrixItem" SET "brand" = 'birthub360' WHERE "brand" IN ('atlasgr', 'totaltrac');
UPDATE "ObjectionMatrixItem" SET "brand" = 'birthub360' WHERE "brand" IN ('atlasgr', 'totaltrac');
UPDATE "ModuleAccessGrant" SET "moduleKey" = 'treinamento-birthub360' WHERE "moduleKey" = 'treinamento-atlasgr';
