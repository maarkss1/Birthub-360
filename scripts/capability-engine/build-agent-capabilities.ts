import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. Carrega catálogo normalizado de agentes e catálogo de capabilities
const agentsJson = JSON.parse(
  readFileSync(resolve(__dirname, '../../src/features/job-roles/catalog/agents.normalized.json'), 'utf-8'),
);
const capsJson = JSON.parse(
  readFileSync(resolve(__dirname, '../../src/features/job-roles/catalog/capabilities.normalized.json'), 'utf-8'),
);

const validCapCodes = new Set(capsJson.capabilities.map((c: any) => c.code));

// 2. Mapeamento explícito para os 12 agentes da célula comercial
const CELL_AGENT_CAPABILITIES: Record<string, string[]> = {
  'ldr-intelligence': [
    'account.read',
    'account.search',
    'account.research',
    'account.score',
    'company.read',
    'lead.read',
    'lead.search',
    'lead.score',
    'icp.read',
    'icp.analyze',
    'market.read',
    'market.research',
    'decision_maker.search',
    'trigger_event.read',
    'news.read',
    'territory.read',
  ],
  'bdr-outbound': [
    'outbound.plan',
    'outbound.personalize',
    'outbound.generate_message',
    'outbound.generate_script',
    'cadence.read',
    'cadence.suggest',
    'cadence.execute',
    'meeting.request',
    'meeting.schedule',
    'lead.read',
    'company.read',
    'knowledge.search',
  ],
  'sdr-qualification': [
    'lead.read',
    'lead.qualify',
    'meeting.read',
    'meeting.prepare',
    'meeting.analyze',
    'meeting.schedule',
    'activity.read',
    'activity.create',
    'cadence.read',
    'cadence.execute',
    'qualification.read',
    'qualification.evaluate',
    'crm.read',
    'crm.suggest_update',
  ],
  'closer-sales': [
    'deal.read',
    'deal.analyze',
    'deal.update',
    'pipeline.read',
    'forecast.read',
    'proposal.read',
    'proposal.generate',
    'pricing.read',
    'pricing.suggest',
    'discount.suggest',
    'roi.calculate',
    'meeting.analyze',
    'contract.read',
    'contract.request',
    'crm.read',
    'crm.suggest_update',
  ],
  'coordinator-commercial': [
    'team.read',
    'activity.read',
    'activity.analyze',
    'sla.read',
    'sla.analyze',
    'pipeline.read',
    'pipeline.analyze',
    'crm.read',
    'crm.audit',
    'alert.read',
    'alert.manage',
    'coaching.read',
    'coaching.suggest',
  ],
  'manager-commercial': [
    'team.read',
    'team.performance',
    'pipeline.read',
    'pipeline.analyze',
    'forecast.read',
    'forecast.explain',
    'goal.read',
    'goal.manage',
    'performance.read',
    'performance.analyze',
    'coaching.manage',
    'pricing.approve',
    'discount.approve',
  ],
  'executive-director': [
    'revenue.read',
    'revenue.analyze',
    'forecast.read',
    'forecast.explain',
    'scenario.analyze',
    'goal.read',
    'pipeline.read',
    'churn.read',
    'billing.read',
    'executive.read',
  ],
  'billing-revenue': [
    'billing.read',
    'billing.reconcile',
    'billing.analyze',
    'invoice.read',
    'invoice.generate',
    'payment.read',
    'revenue.read',
    'revenue.reconcile',
  ],
  'churn-retention': [
    'customer.read',
    'customer.health',
    'customer.lifecycle',
    'churn.read',
    'churn.analyze',
    'retention.plan',
    'renewal.read',
    'revenue_at_risk.read',
  ],
  'contract-signature': [
    'contract.read',
    'contract.analyze',
    'contract.generate',
    'contract.validate',
    'signature.read',
    'signature.request',
    'signature.cancel',
  ],
  'bitrix-guardian': [
    'crm.read',
    'crm.audit',
    'bitrix.read',
    'bitrix.sync_status',
    'crm.duplicate_detect',
    'crm.stage_validate',
    'crm.field_validate',
    'bitrix.write',
    'bitrix.configure',
  ],
  'revenue-intelligence': [
    'revenue.read',
    'revenue.analyze',
    'forecast.read',
    'forecast.explain',
    'pipeline.read',
    'pipeline.analyze',
    'coverage.read',
    'performance.read',
    'conversion.read',
    'sales_cycle.read',
    'aging.read',
    'loss.read',
    'health_score.read',
    'scenario.analyze',
    'executive.read',
  ],
};

// 3. Regras de mapeamento por Cargo Primário para os 379 agentes normalizados
const ROLE_BASE_CAPABILITIES: Record<string, string[]> = {
  LDR: ['account.read', 'account.search', 'account.research', 'account.score', 'company.read', 'company.search', 'lead.read', 'lead.search', 'lead.score', 'icp.read', 'icp.analyze', 'market.read', 'decision_maker.search', 'trigger_event.read', 'news.read', 'territory.read'],
  BDR: ['outbound.plan', 'outbound.personalize', 'outbound.generate_message', 'outbound.generate_script', 'cadence.read', 'cadence.suggest', 'cadence.execute', 'meeting.request', 'meeting.schedule', 'lead.read', 'company.read', 'knowledge.search'],
  SDR: ['lead.read', 'lead.qualify', 'meeting.read', 'meeting.prepare', 'meeting.analyze', 'meeting.schedule', 'activity.read', 'activity.create', 'cadence.read', 'cadence.execute', 'qualification.read', 'qualification.evaluate', 'crm.read', 'crm.suggest_update'],
  CLOSER: ['deal.read', 'deal.analyze', 'deal.update', 'pipeline.read', 'forecast.read', 'proposal.read', 'proposal.generate', 'pricing.read', 'pricing.suggest', 'discount.suggest', 'roi.calculate', 'meeting.analyze', 'contract.read', 'contract.request', 'crm.read', 'crm.suggest_update'],
  COORDENADOR_COMERCIAL: ['team.read', 'activity.read', 'activity.analyze', 'sla.read', 'sla.analyze', 'pipeline.read', 'pipeline.analyze', 'crm.read', 'crm.audit', 'alert.read', 'alert.manage', 'coaching.read', 'coaching.suggest'],
  GERENTE_COMERCIAL: ['team.read', 'team.performance', 'pipeline.read', 'pipeline.analyze', 'forecast.read', 'forecast.explain', 'goal.read', 'goal.manage', 'performance.read', 'performance.analyze', 'coaching.manage', 'pricing.approve', 'discount.approve'],
  DIRETOR_COMERCIAL: ['revenue.read', 'revenue.analyze', 'forecast.read', 'forecast.explain', 'scenario.analyze', 'goal.read', 'pipeline.read', 'churn.read', 'billing.read', 'executive.read'],
  RECEITA_FATURAMENTO: ['billing.read', 'billing.reconcile', 'billing.analyze', 'invoice.read', 'invoice.generate', 'payment.read', 'revenue.read', 'revenue.reconcile'],
  CHURN_RETENCAO: ['customer.read', 'customer.health', 'customer.lifecycle', 'churn.read', 'churn.analyze', 'retention.plan', 'renewal.read', 'revenue_at_risk.read'],
  CONTRATOS_ASSINATURA: ['contract.read', 'contract.analyze', 'contract.generate', 'contract.validate', 'contract.request', 'signature.read', 'signature.request', 'signature.cancel'],
  BITRIX_GUARDIAN: ['crm.read', 'crm.audit', 'bitrix.read', 'bitrix.sync_status', 'crm.duplicate_detect', 'crm.stage_validate', 'crm.field_validate', 'bitrix.write', 'bitrix.configure'],
  REVENUE_INTELLIGENCE: ['revenue.read', 'revenue.analyze', 'forecast.read', 'forecast.explain', 'pipeline.read', 'pipeline.analyze', 'coverage.read', 'performance.read', 'conversion.read', 'sales_cycle.read', 'aging.read', 'loss.read', 'health_score.read', 'scenario.analyze', 'executive.read'],
};

// Refinamentos específicos por palavras no slug/nome do agente
function deriveAgentCapabilities(agent: any): string[] {
  // Se for agente da célula comercial:
  if (CELL_AGENT_CAPABILITIES[agent.code]) {
    return CELL_AGENT_CAPABILITIES[agent.code];
  }

  // Agentes sintéticos / comuns:
  if (agent.code === 'agent-builder') return ['agent.discover'];
  if (agent.code === 'handoff-agent') return ['agent.discover', 'agent.request_cross_role'];
  if (agent.code === 'knowledge' || agent.domain === 'knowledge') return ['knowledge.search'];

  const code = agent.code.toLowerCase();
  const caps = new Set<string>();

  // Sempre herda um subconjunto coerente do cargo primário se houver
  if (agent.primaryJobRole && ROLE_BASE_CAPABILITIES[agent.primaryJobRole]) {
    // Adiciona capabilities pertinentes ao papel
    const roleCaps = ROLE_BASE_CAPABILITIES[agent.primaryJobRole];
    for (const c of roleCaps) {
      caps.add(c);
    }
  }

  // Se o agente tiver binding com serviço existente da célula comercial:
  if (agent.binding?.type === 'EXISTING_SERVICE' && agent.binding.existingCode) {
    const existingCaps = CELL_AGENT_CAPABILITIES[agent.binding.existingCode];
    if (existingCaps) {
      for (const ec of existingCaps) caps.add(ec);
    }
  }

  // Se for da área financeira sem fonte confirmada:
  if (agent.binding?.type === 'SOURCE_REQUIRED') {
    caps.add('billing.read');
    if (code.includes('invoice')) caps.add('invoice.generate');
    if (code.includes('reconcil')) caps.add('billing.reconcile');
  }

  // Se o agente ainda não tiver nenhuma capability (ex: unmapped marketing/legal), concede as básicas do domínio:
  if (caps.size === 0) {
    if (agent.domain === 'Marketing') {
      caps.add('icp.read');
      caps.add('market.read');
      caps.add('lead.read');
    } else if (agent.domain === 'Compliance/Jurídico') {
      caps.add('contract.read');
      caps.add('contract.validate');
    } else if (agent.domain === 'Tecnologia' || agent.domain === 'Plataforma') {
      caps.add('knowledge.search');
      caps.add('agent.discover');
    } else {
      caps.add('agent.discover');
    }
  }

  return Array.from(caps).filter((c) => validCapCodes.has(c));
}

// 4. Monta o mapa de capabilities por agente
const agentCapabilitiesMap: Record<string, string[]> = {};
for (const ag of agentsJson.agents) {
  agentCapabilitiesMap[ag.code] = deriveAgentCapabilities(ag);
}
// Garante os 12 agentes da célula comercial
for (const [code, caps] of Object.entries(CELL_AGENT_CAPABILITIES)) {
  agentCapabilitiesMap[code] = caps;
}

const outputPath = resolve(__dirname, '../../src/features/job-roles/catalog/agentCapabilities.normalized.json');
writeFileSync(
  outputPath,
  JSON.stringify(
    {
      generatedAt: '2026-09-08',
      totalAgents: Object.keys(agentCapabilitiesMap).length,
      agentCapabilities: agentCapabilitiesMap,
    },
    null,
    2,
  ),
  'utf-8',
);

console.log(`Gerado mapeamento auditável de agentes: ${outputPath} (${Object.keys(agentCapabilitiesMap).length} agentes)`);
