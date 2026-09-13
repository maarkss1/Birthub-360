import { describe, expect, it } from 'vitest';
import {
  MODELS_WITH_ORGANIZATION_ID,
  TENANT_INJECTED_MODELS,
} from '@/lib/tenant-scoping-registry';

/**
 * TENANT-007 (docs/audits/repository-debt-audit/agents/TENANT.md) e Onda 1 — Segurança & Tenancy,
 * item 5 ("propagação do padrão de tenant-scoping provado para módulos irmãos"): este repositório
 * tem DUAS camadas independentes de tenant-scoping via extensão Prisma —
 * `TENANT_INJECTED_MODELS` (`src/lib/prisma.ts`, injeta `organizationId` em toda escrita feita
 * pelo client global) e `getTenantPrisma()`/`req.db` (`src/lib/tenant-prisma.ts`, aplica a
 * QUALQUER model com a coluna via `MODELS_WITH_ORGANIZATION_ID`) — e, até este teste, nenhum
 * código comparava as duas. Um model novo com `organizationId` podia ficar de fora de ambas sem
 * que ninguém percebesse, sobrando só a RLS do Postgres como rede de segurança: correto quando é
 * uma decisão deliberada (a maioria dos models hoje está nesta situação, ver
 * `KNOWN_RLS_ONLY_MODELS` abaixo), mas perigoso quando é um esquecimento — é exatamente assim que
 * TENANT-002 (`AiEngineSetting`) e outros gaps documentados em TENANT.md aconteceram: um módulo
 * novo reconstruiu sua própria fronteira de tenant em vez de reusar o padrão já provado.
 *
 * Este teste não exige que todo model com `organizationId` entre em `TENANT_INJECTED_MODELS` (a
 * maioria não precisa — RLS sozinha já é a garantia real de isolamento; a injeção automática é só
 * uma rede de segurança adicional para os models "core" que o app grava direto pelo client
 * global). Em vez disso, funciona como trava estrutural de DRIFT: a lista abaixo
 * (`KNOWN_RLS_ONLY_MODELS`) é um snapshot revisado do que hoje é "RLS-only por decisão". Se o
 * schema ganhar um model novo com `organizationId` que não está em `TENANT_INJECTED_MODELS` NEM
 * nesta lista, o teste falha — forçando quem adicionar o model a decidir explicitamente (e
 * documentar aqui) se RLS sozinha basta, em vez de deixar a omissão passar batida como acontecia
 * antes.
 */

// Snapshot revisado (Onda 1, item 5) dos models com `organizationId` que dependem só da RLS do
// Postgres para isolamento multi-tenant — nenhum tem o injetor de `TENANT_INJECTED_MODELS`, e
// isso é uma decisão aceita hoje, não um gap desconhecido. Ao adicionar um model novo com
// `organizationId`: se ele precisar da mesma rede de segurança de escrita que os models core têm,
// adicione-o a `TENANT_INJECTED_MODELS` em vez de a esta lista; caso contrário, adicione-o aqui
// com uma linha explicando por que RLS sozinha é suficiente para o caso dele — mesmo padrão de
// justificativa já usado em `BYPASS_RLS_ALLOWED_MODELS` (src/lib/prisma.ts).
const KNOWN_RLS_ONLY_MODELS = [
  'AccessRequest',
  'AccountIntelligenceSnapshot',
  'AccountRecommendation',
  'AccountScore',
  'AccountSignal',
  'AgentBuildProposal',
  'AgentExecution',
  'AgentHandoffMessage',
  'AgentMemory',
  'AgentMemoryRecord',
  'AIGuardrailEvent',
  'AILog',
  'AIPendingAction',
  'ApprovalDecision',
  'AssistantMessage',
  'Automation',
  'AutomationVersion',
  'BitrixConnection',
  'BitrixExtractionRun',
  'BitrixSyncLog',
  'BitrixSyncRule',
  'BugReport',
  'CadenceCalendarEvent',
  'CadenceRun',
  'CadenceSequence',
  'CadenceTouchAttempt',
  'CallSuppression',
  'ColdCallRun',
  'ConversationSignal',
  'CopilotoBitrixFieldMapping',
  'CopilotoCoachingEvaluation',
  'CopilotoConsentRecord',
  'CopilotoConversation',
  'CopilotoCrmFieldSuggestion',
  'CopilotoDealHealthSnapshot',
  'CopilotoInsight',
  'CopilotoTranscriptSegment',
  'CrmCommercialDocumentVersion',
  'CrmDocumentSignatureRequest',
  'DailyPlanClosing',
  'DealClosureEvent',
  'DecisionMaker',
  'Document',
  'EconomicRelationship',
  'EmailMessage',
  'ForecastSnapshot',
  'GoogleWorkspaceConnection',
  'IntelligenceEvidence',
  'LearningCandidate',
  'MesaTratamentoTreatment',
  'ModuleAccessGrant',
  'Notification',
  'ObjectionMatrixItem',
  'OmieConnection',
  'OptOutRecord',
  'OrganizationFeatureFlag',
  'OrganizationMemoryRecord',
  'PomodoroSession',
  'Prompt',
  'Prospect',
  'ProspectRejection',
  'ProspectingSearchExecution',
  'PublicBookingLink',
  'QualificationMatrixItem',
  'Report',
  'RoleMemoryRecord',
  'RoleplaySession',
  'SavedSearch',
  'SavedView',
  'SlackConnection',
  'StripeConnection',
  'TemporaryCapabilityGrant',
  'ThreeCXCallEvent',
  'ThreeCXConnection',
  'UserJobRole',
  'VoiceCallLog',
  'VoiceHubConnection',
  'WhatsAppMessage',
].sort();

describe('paridade de tenant-scoping entre os dois pontos de acesso Prisma (TENANT-007)', () => {
  it('todo model em TENANT_INJECTED_MODELS realmente tem a coluna organizationId', () => {
    // Sanidade na direção oposta: se um model fosse removido de `TENANT_INJECTED_MODELS`... na
    // verdade o risco real é o inverso — um model SEM a coluna entrar nessa lista por engano
    // quebraria em runtime com "Unknown argument organizationId" na primeira escrita. Este teste
    // pega isso em CI, não em produção.
    const missingColumn = TENANT_INJECTED_MODELS.filter((m) => !MODELS_WITH_ORGANIZATION_ID.has(m));
    expect(missingColumn).toEqual([]);
  });

  it('nenhum model novo com organizationId aparece fora de TENANT_INJECTED_MODELS e da allowlist RLS-only revisada', () => {
    const gap = [...MODELS_WITH_ORGANIZATION_ID]
      .filter((m) => !TENANT_INJECTED_MODELS.includes(m))
      .sort();

    const unexpected = gap.filter((m) => !KNOWN_RLS_ONLY_MODELS.includes(m));
    const noLongerPresent = KNOWN_RLS_ONLY_MODELS.filter((m) => !gap.includes(m));

    // Mensagem de diagnóstico explícita: um model novo (`unexpected` não-vazio) exige decisão —
    // ver o comentário no topo do arquivo. Um model que SAIU do gap (`noLongerPresent`) não é um
    // problema de segurança (provavelmente foi migrado para `TENANT_INJECTED_MODELS` ou removido
    // do schema), mas a lista aqui precisa ser atualizada para não ficar obsoleta.
    expect(
      { unexpected, noLongerPresent },
      unexpected.length > 0
        ? `Model(s) novo(s) com organizationId fora de TENANT_INJECTED_MODELS e de KNOWN_RLS_ONLY_MODELS: ${unexpected.join(', ')}. ` +
            'Decida explicitamente: se precisa da mesma rede de segurança de escrita que os models core, adicione a TENANT_INJECTED_MODELS ' +
            '(src/lib/tenant-scoping-registry.ts); senão, adicione a KNOWN_RLS_ONLY_MODELS neste arquivo documentando por que RLS sozinha basta.'
        : noLongerPresent.length > 0
          ? `Model(s) que saíram do gap RLS-only mas continuam em KNOWN_RLS_ONLY_MODELS: ${noLongerPresent.join(', ')}. Atualize a lista.`
          : undefined,
    ).toEqual({ unexpected: [], noLongerPresent: [] });
  });
});
