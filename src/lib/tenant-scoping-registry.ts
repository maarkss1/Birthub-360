import { Prisma } from '@prisma/client';

/**
 * TENANT-007 (docs/audits/repository-debt-audit/agents/TENANT.md): duas camadas independentes de
 * tenant-scoping via extensão Prisma coexistem neste repositório — a extensão global
 * (`src/lib/prisma.ts`) e `getTenantPrisma()`/`req.db` (`src/lib/tenant-prisma.ts`) — cada uma
 * com sua própria lista de models e seu próprio propósito. Nenhuma delas dependia da outra, e
 * nenhum teste comparava as duas: um model novo com `organizationId` podia ficar de fora de
 * AMBAS sem que ninguém percebesse, sobrando só a RLS do Postgres como rede de segurança
 * (correto hoje, mas sem trava estrutural nenhuma impedindo o esquecimento).
 *
 * Este arquivo não unifica as duas listas (elas continuam com escopos diferentes de propósito —
 * ver comentário de cada export abaixo) — só as extrai para um módulo comum, leve o bastante
 * (depende só de `Prisma.dmmf`, metadado estático, sem instanciar `PrismaClient`/`pg.Pool`) para
 * ser importado por `tests/unit/lib/tenant-scoping-parity.test.ts` sem herdar os efeitos
 * colaterais pesados de `src/lib/prisma.ts` (pool de conexão real, métricas Prometheus) que hoje
 * nenhum teste unitário deste repositório importa sem mockar.
 */

// Modelos que realmente têm a coluna `organizationId` no schema — calculado a partir do DMMF em vez
// de mantido à mão, porque uma lista fixa ("skip estes 5, força nos outros") já quebrou antes: todo
// modelo novo sem organizationId (Prompt, AiEngineSetting, Note, etc.) explode com
// "Unknown argument organizationId" assim que é consultado via `req.db` (o client tenant-scoped),
// mesmo que o model nunca devesse ser filtrado por tenant.
export const MODELS_WITH_ORGANIZATION_ID = new Set(
  Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === 'organizationId'))
    .map((m) => m.name),
);

/**
 * Models "core" de CRM/Lead onde a extensão global (`src/lib/prisma.ts`) injeta
 * `organizationId` automaticamente em toda escrita (create/upsert/update) a partir do tenant da
 * request — a mesma garantia que `getTenantPrisma()`/`req.db` aplica a QUALQUER model com a
 * coluna `organizationId`, mas só quando um caller usa aquele client explicitamente. Mantida à
 * mão (ao contrário de `MODELS_WITH_ORGANIZATION_ID` acima) de propósito: é o conjunto de models
 * onde o app historicamente cria/atualiza registros direto pelo client `prisma` global (sem
 * passar por `req.db`) e depende deste injetor como rede de segurança — não "todo model
 * multi-tenant", que é uma responsabilidade diferente (ver `KNOWN_RLS_ONLY_MODELS` no teste de
 * paridade, que documenta explicitamente por que o restante fica de fora).
 */
export const TENANT_INJECTED_MODELS = [
  'Company',
  'Contact',
  'Lead',
  'Activity',
  'User',
  'CrmPipeline',
  'CrmProduct',
  'CrmDealItem',
  'CrmCommercialDocument',
  // Comercial Inteligente (ver prisma/schema.prisma) — mesmo tratamento: organizationId
  // é sempre injetado a partir do tenant da request, nunca aceito do corpo do payload.
  'CommercialGoal',
  'LeadStageHistory',
  'LeadFieldChange',
];
