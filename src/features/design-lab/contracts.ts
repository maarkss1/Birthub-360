/** Contratos propostos. Sem dependência de UI, persistência ou autorização do cliente. */
export type Confidence = {
  value: number;
  model: string;
  method: string;
  limitations: string[];
  calibratedAt?: string;
};
export type Evidence = {
  id: string;
  source: string;
  observedAt: string;
  summary: string;
  entityIds: string[];
  url?: string;
  verified: boolean;
};
export type Context = {
  tenantId: string;
  workspaceId: string;
  entityIds: string[];
  period: { from: string; to: string };
  metricId?: string;
};
export type SurfaceState = 'loading' | 'ready' | 'empty' | 'error' | 'stale' | 'partial';
export type Metric = {
  id: string;
  label: string;
  value: number;
  unit: 'BRL' | 'percent' | 'ratio' | 'count' | 'days';
  previous?: number;
  target?: number;
  source: string;
  updatedAt: string;
};
export type Signal = {
  id: string;
  type: string;
  severity: 'info' | 'attention' | 'critical';
  origin: string;
  event: string;
  delta?: number;
  impact: { description: string; value?: number };
  confidence: Confidence;
  timestamp: string;
  entityIds: string[];
  evidenceIds: string[];
  nextActionId?: string;
  context: Context;
};
export type Decision = {
  id: string;
  signalId: string;
  options: { id: string; label: string; consequences: string[]; dependencies: string[] }[];
  selectedOptionId?: string;
  rationale: string;
  decidedBy?: string;
  decidedAt?: string;
};
export type ExecutionAction = {
  id: string;
  decisionId: string;
  signalId: string;
  title: string;
  reason: string;
  expectedImpact: string;
  priority: 'low' | 'medium' | 'high';
  assigneeId: string;
  dueAt: string;
  status: 'proposed' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  dependencyIds: string[];
  recommendationOrigin: string;
  automationId?: string;
  idempotencyKey: string;
  failure?: { message: string; retryable: boolean };
};
export type ActionOutcome = {
  actionId: string;
  executionCompletedAt?: string;
  commercialStatus: 'pending' | 'measured' | 'inconclusive';
  measuredAt?: string;
  metricBefore?: number;
  metricAfter?: number;
  evidenceIds: string[];
};
export type Entity = {
  id: string;
  kind:
    | 'company'
    | 'contact'
    | 'deal'
    | 'person'
    | 'project'
    | 'automation'
    | 'document'
    | 'process';
  name: string;
  stage?: string;
  state: string;
  metrics: Metric[];
  signals: Signal[];
  relations: { entityId: string; relation: string }[];
  actionIds: string[];
};
export type IntelligenceExplanation = {
  context: Context;
  happened: string;
  changed: string;
  because: string;
  evidenceIds: string[];
  confidence: Confidence;
  impact: string;
  risk: string;
  opportunity: string;
  nextActionId?: string;
  generatedAt: string;
};
export type Command = {
  id: string;
  label: string;
  intent: 'read' | 'navigate' | 'prepare' | 'execute' | 'create';
  requiredPermission: string;
  context: Context;
  effectDescription: string;
};
export type Activity = {
  id: string;
  actorId: string;
  entityId: string;
  source: string;
  timestamp: string;
  event: string;
  executionId?: string;
  outcomeId?: string;
};
/** Dados enviados ao servidor nunca devem confiar no tenantId/permissões informados pelo cliente. */
export type ExecuteRequest = { actionId: string; idempotencyKey: string };
