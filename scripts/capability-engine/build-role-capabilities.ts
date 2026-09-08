import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const capsJson = JSON.parse(
  readFileSync(resolve(__dirname, '../../src/features/job-roles/catalog/capabilities.normalized.json'), 'utf-8'),
);
const validCaps = new Set(capsJson.capabilities.map((c: any) => c.code));

export interface RoleCapabilityConfig {
  code: string;
  accessLevel: 'DISCOVER' | 'READ' | 'EXECUTE' | 'REQUEST';
  requiresApproval?: boolean;
}

export const ROLE_CAPABILITIES_MAP: Record<string, RoleCapabilityConfig[]> = {
  // 1. LDR
  LDR: [
    { code: 'account.read', accessLevel: 'EXECUTE' },
    { code: 'account.search', accessLevel: 'EXECUTE' },
    { code: 'account.research', accessLevel: 'EXECUTE' },
    { code: 'account.score', accessLevel: 'EXECUTE' },
    { code: 'company.read', accessLevel: 'EXECUTE' },
    { code: 'company.search', accessLevel: 'EXECUTE' },
    { code: 'company.enrich', accessLevel: 'EXECUTE' },
    { code: 'lead.read', accessLevel: 'EXECUTE' },
    { code: 'lead.search', accessLevel: 'EXECUTE' },
    { code: 'lead.enrich', accessLevel: 'EXECUTE' },
    { code: 'lead.score', accessLevel: 'EXECUTE' },
    { code: 'icp.read', accessLevel: 'EXECUTE' },
    { code: 'icp.analyze', accessLevel: 'EXECUTE' },
    { code: 'market.read', accessLevel: 'EXECUTE' },
    { code: 'market.research', accessLevel: 'EXECUTE' },
    { code: 'decision_maker.search', accessLevel: 'EXECUTE' },
    { code: 'trigger_event.read', accessLevel: 'EXECUTE' },
    { code: 'news.read', accessLevel: 'EXECUTE' },
    { code: 'territory.read', accessLevel: 'EXECUTE' },
    { code: 'knowledge.search', accessLevel: 'READ' },
    { code: 'outbound.plan', accessLevel: 'READ' },
    { code: 'deal.read', accessLevel: 'REQUEST' },
    { code: 'contract.read', accessLevel: 'REQUEST' },
    { code: 'agent.discover', accessLevel: 'READ' },
  ],

  // 2. BDR
  BDR: [
    { code: 'outbound.plan', accessLevel: 'EXECUTE' },
    { code: 'outbound.personalize', accessLevel: 'EXECUTE' },
    { code: 'outbound.generate_message', accessLevel: 'EXECUTE' },
    { code: 'outbound.generate_script', accessLevel: 'EXECUTE' },
    { code: 'cadence.read', accessLevel: 'EXECUTE' },
    { code: 'cadence.suggest', accessLevel: 'EXECUTE' },
    { code: 'cadence.execute', accessLevel: 'EXECUTE' },
    { code: 'meeting.request', accessLevel: 'EXECUTE' },
    { code: 'meeting.schedule', accessLevel: 'EXECUTE' },
    { code: 'lead.read', accessLevel: 'EXECUTE' },
    { code: 'lead.search', accessLevel: 'EXECUTE' },
    { code: 'company.read', accessLevel: 'EXECUTE' },
    { code: 'account.read', accessLevel: 'READ' },
    { code: 'knowledge.search', accessLevel: 'EXECUTE' },
    { code: 'activity.read', accessLevel: 'EXECUTE' },
    { code: 'activity.create', accessLevel: 'EXECUTE' },
    { code: 'deal.read', accessLevel: 'READ' },
    { code: 'contract.read', accessLevel: 'REQUEST' },
    { code: 'agent.discover', accessLevel: 'READ' },
  ],

  // 3. SDR
  SDR: [
    { code: 'lead.read', accessLevel: 'EXECUTE' },
    { code: 'lead.search', accessLevel: 'EXECUTE' },
    { code: 'lead.qualify', accessLevel: 'EXECUTE' },
    { code: 'lead.update', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'meeting.read', accessLevel: 'EXECUTE' },
    { code: 'meeting.prepare', accessLevel: 'EXECUTE' },
    { code: 'meeting.analyze', accessLevel: 'EXECUTE' },
    { code: 'meeting.schedule', accessLevel: 'EXECUTE' },
    { code: 'activity.read', accessLevel: 'EXECUTE' },
    { code: 'activity.create', accessLevel: 'EXECUTE' },
    { code: 'activity.update', accessLevel: 'EXECUTE' },
    { code: 'cadence.read', accessLevel: 'EXECUTE' },
    { code: 'cadence.execute', accessLevel: 'EXECUTE' },
    { code: 'qualification.read', accessLevel: 'EXECUTE' },
    { code: 'qualification.evaluate', accessLevel: 'EXECUTE' },
    { code: 'crm.read', accessLevel: 'EXECUTE' },
    { code: 'crm.suggest_update', accessLevel: 'EXECUTE' },
    { code: 'forecast.read', accessLevel: 'READ' },
    { code: 'deal.read', accessLevel: 'READ' },
    { code: 'contract.read', accessLevel: 'REQUEST' },
    { code: 'contract.generate', accessLevel: 'REQUEST', requiresApproval: true },
    { code: 'knowledge.search', accessLevel: 'EXECUTE' },
    { code: 'agent.discover', accessLevel: 'READ' },
  ],

  // 4. CLOSER
  CLOSER: [
    { code: 'deal.read', accessLevel: 'EXECUTE' },
    { code: 'deal.analyze', accessLevel: 'EXECUTE' },
    { code: 'deal.update', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'deal.move_stage', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'pipeline.read', accessLevel: 'EXECUTE' },
    { code: 'pipeline.analyze', accessLevel: 'READ' },
    { code: 'forecast.read', accessLevel: 'READ' },
    { code: 'proposal.read', accessLevel: 'EXECUTE' },
    { code: 'proposal.generate', accessLevel: 'EXECUTE' },
    { code: 'pricing.read', accessLevel: 'EXECUTE' },
    { code: 'pricing.suggest', accessLevel: 'EXECUTE' },
    { code: 'discount.suggest', accessLevel: 'EXECUTE' },
    { code: 'roi.calculate', accessLevel: 'EXECUTE' },
    { code: 'meeting.read', accessLevel: 'EXECUTE' },
    { code: 'meeting.analyze', accessLevel: 'EXECUTE' },
    { code: 'contract.read', accessLevel: 'EXECUTE' },
    { code: 'contract.request', accessLevel: 'EXECUTE' },
    { code: 'contract.generate', accessLevel: 'REQUEST', requiresApproval: true },
    { code: 'signature.read', accessLevel: 'READ' },
    { code: 'signature.request', accessLevel: 'REQUEST', requiresApproval: true },
    { code: 'crm.read', accessLevel: 'EXECUTE' },
    { code: 'crm.suggest_update', accessLevel: 'EXECUTE' },
    { code: 'knowledge.search', accessLevel: 'EXECUTE' },
    { code: 'agent.discover', accessLevel: 'READ' },
  ],

  // 5. COORDENADOR_COMERCIAL
  COORDENADOR_COMERCIAL: [
    { code: 'team.read', accessLevel: 'EXECUTE' },
    { code: 'activity.read', accessLevel: 'EXECUTE' },
    { code: 'activity.analyze', accessLevel: 'EXECUTE' },
    { code: 'sla.read', accessLevel: 'EXECUTE' },
    { code: 'sla.analyze', accessLevel: 'EXECUTE' },
    { code: 'pipeline.read', accessLevel: 'EXECUTE' },
    { code: 'pipeline.analyze', accessLevel: 'EXECUTE' },
    { code: 'crm.read', accessLevel: 'EXECUTE' },
    { code: 'crm.audit', accessLevel: 'EXECUTE' },
    { code: 'alert.read', accessLevel: 'EXECUTE' },
    { code: 'alert.manage', accessLevel: 'EXECUTE' },
    { code: 'coaching.read', accessLevel: 'EXECUTE' },
    { code: 'coaching.suggest', accessLevel: 'EXECUTE' },
    { code: 'lead.read', accessLevel: 'EXECUTE' },
    { code: 'deal.read', accessLevel: 'EXECUTE' },
    { code: 'forecast.read', accessLevel: 'READ' },
    { code: 'pricing.approve', accessLevel: 'REQUEST', requiresApproval: true },
    { code: 'discount.approve', accessLevel: 'REQUEST', requiresApproval: true },
    { code: 'agent.discover', accessLevel: 'READ' },
  ],

  // 6. GERENTE_COMERCIAL
  GERENTE_COMERCIAL: [
    { code: 'team.read', accessLevel: 'EXECUTE' },
    { code: 'team.performance', accessLevel: 'EXECUTE' },
    { code: 'team.manage', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'pipeline.read', accessLevel: 'EXECUTE' },
    { code: 'pipeline.analyze', accessLevel: 'EXECUTE' },
    { code: 'forecast.read', accessLevel: 'EXECUTE' },
    { code: 'forecast.explain', accessLevel: 'EXECUTE' },
    { code: 'goal.read', accessLevel: 'EXECUTE' },
    { code: 'goal.manage', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'performance.read', accessLevel: 'EXECUTE' },
    { code: 'performance.analyze', accessLevel: 'EXECUTE' },
    { code: 'coaching.manage', accessLevel: 'EXECUTE' },
    { code: 'pricing.approve', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'discount.approve', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'deal.read', accessLevel: 'EXECUTE' },
    { code: 'contract.read', accessLevel: 'READ' },
    { code: 'revenue.read', accessLevel: 'READ' },
    { code: 'agent.discover', accessLevel: 'READ' },
  ],

  // 7. DIRETOR_COMERCIAL
  DIRETOR_COMERCIAL: [
    { code: 'revenue.read', accessLevel: 'EXECUTE' },
    { code: 'revenue.analyze', accessLevel: 'EXECUTE' },
    { code: 'forecast.read', accessLevel: 'EXECUTE' },
    { code: 'forecast.explain', accessLevel: 'EXECUTE' },
    { code: 'scenario.analyze', accessLevel: 'EXECUTE' },
    { code: 'goal.read', accessLevel: 'EXECUTE' },
    { code: 'goal.manage', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'pipeline.read', accessLevel: 'EXECUTE' },
    { code: 'pipeline.analyze', accessLevel: 'EXECUTE' },
    { code: 'churn.read', accessLevel: 'EXECUTE' },
    { code: 'billing.read', accessLevel: 'READ' },
    { code: 'executive.read', accessLevel: 'EXECUTE' },
    { code: 'pricing.approve', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'discount.approve', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'team.manage', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'contract.read', accessLevel: 'READ' },
    { code: 'agent.discover', accessLevel: 'READ' },
  ],

  // 8. RECEITA_FATURAMENTO
  RECEITA_FATURAMENTO: [
    { code: 'billing.read', accessLevel: 'EXECUTE' },
    { code: 'billing.reconcile', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'billing.analyze', accessLevel: 'EXECUTE' },
    { code: 'invoice.read', accessLevel: 'EXECUTE' },
    { code: 'invoice.generate', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'payment.read', accessLevel: 'EXECUTE' },
    { code: 'revenue.read', accessLevel: 'EXECUTE' },
    { code: 'revenue.reconcile', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'deal.read', accessLevel: 'READ' },
    { code: 'contract.read', accessLevel: 'READ' },
    { code: 'agent.discover', accessLevel: 'READ' },
  ],

  // 9. CHURN_RETENCAO
  CHURN_RETENCAO: [
    { code: 'customer.read', accessLevel: 'EXECUTE' },
    { code: 'customer.health', accessLevel: 'EXECUTE' },
    { code: 'customer.lifecycle', accessLevel: 'EXECUTE' },
    { code: 'churn.read', accessLevel: 'EXECUTE' },
    { code: 'churn.analyze', accessLevel: 'EXECUTE' },
    { code: 'retention.plan', accessLevel: 'EXECUTE' },
    { code: 'renewal.read', accessLevel: 'EXECUTE' },
    { code: 'revenue_at_risk.read', accessLevel: 'EXECUTE' },
    { code: 'activity.read', accessLevel: 'READ' },
    { code: 'contract.read', accessLevel: 'READ' },
    { code: 'crm.read', accessLevel: 'READ' },
    { code: 'agent.discover', accessLevel: 'READ' },
  ],

  // 10. CONTRATOS_ASSINATURA
  CONTRATOS_ASSINATURA: [
    { code: 'contract.read', accessLevel: 'EXECUTE' },
    { code: 'contract.analyze', accessLevel: 'EXECUTE' },
    { code: 'contract.generate', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'contract.validate', accessLevel: 'EXECUTE' },
    { code: 'contract.request', accessLevel: 'EXECUTE' },
    { code: 'contract.request_signature', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'signature.read', accessLevel: 'EXECUTE' },
    { code: 'signature.request', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'signature.cancel', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'deal.read', accessLevel: 'READ' },
    { code: 'company.read', accessLevel: 'READ' },
    { code: 'agent.discover', accessLevel: 'READ' },
  ],

  // 11. BITRIX_GUARDIAN
  BITRIX_GUARDIAN: [
    { code: 'crm.read', accessLevel: 'EXECUTE' },
    { code: 'crm.audit', accessLevel: 'EXECUTE' },
    { code: 'crm.duplicate_detect', accessLevel: 'EXECUTE' },
    { code: 'crm.stage_validate', accessLevel: 'EXECUTE' },
    { code: 'crm.field_validate', accessLevel: 'EXECUTE' },
    { code: 'bitrix.read', accessLevel: 'EXECUTE' },
    { code: 'bitrix.sync_status', accessLevel: 'EXECUTE' },
    { code: 'bitrix.write', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'bitrix.configure', accessLevel: 'EXECUTE', requiresApproval: true },
    { code: 'agent.discover', accessLevel: 'READ' },
  ],

  // 12. REVENUE_INTELLIGENCE
  REVENUE_INTELLIGENCE: [
    { code: 'revenue.read', accessLevel: 'EXECUTE' },
    { code: 'revenue.analyze', accessLevel: 'EXECUTE' },
    { code: 'forecast.read', accessLevel: 'EXECUTE' },
    { code: 'forecast.explain', accessLevel: 'EXECUTE' },
    { code: 'pipeline.read', accessLevel: 'EXECUTE' },
    { code: 'pipeline.analyze', accessLevel: 'EXECUTE' },
    { code: 'coverage.read', accessLevel: 'EXECUTE' },
    { code: 'performance.read', accessLevel: 'EXECUTE' },
    { code: 'conversion.read', accessLevel: 'EXECUTE' },
    { code: 'sales_cycle.read', accessLevel: 'EXECUTE' },
    { code: 'aging.read', accessLevel: 'EXECUTE' },
    { code: 'loss.read', accessLevel: 'EXECUTE' },
    { code: 'health_score.read', accessLevel: 'EXECUTE' },
    { code: 'scenario.analyze', accessLevel: 'EXECUTE' },
    { code: 'executive.read', accessLevel: 'EXECUTE' },
    { code: 'crm.read', accessLevel: 'READ' },
    { code: 'agent.discover', accessLevel: 'READ' },
  ],
};

// Validação estrita
for (const [role, items] of Object.entries(ROLE_CAPABILITIES_MAP)) {
  for (const item of items) {
    if (!validCaps.has(item.code)) {
      throw new Error(`Capability inválida ${item.code} no cargo ${role}`);
    }
  }
}

const outputPath = resolve(__dirname, '../../src/features/job-roles/catalog/roleCapabilities.normalized.json');
writeFileSync(
  outputPath,
  JSON.stringify(
    {
      generatedAt: '2026-09-08',
      totalRoles: Object.keys(ROLE_CAPABILITIES_MAP).length,
      roleCapabilities: ROLE_CAPABILITIES_MAP,
    },
    null,
    2,
  ),
  'utf-8',
);

console.log(`Gerado matriz cargo x capability com sucesso: ${outputPath}`);
