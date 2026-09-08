// Catálogo estático dos 12 cargos canônicos da fundação Multi-Cargo (ver PROMPT 1 — Fundação
// Multi-Cargo e Governança de Agentes, e a seção "Multi-Cargo e Governança de Agentes" no fim de
// prisma/schema.prisma). Mesmo papel que `module-catalog.ts` já cumpre para `ModuleKey`: fonte
// única de `code` válido, consumida pelo seed (scripts/seed-multi-cargo.ts), pelo serviço
// (jobRole.service.ts) e por qualquer tela futura que precise do rótulo/departamento de um cargo.
//
// Isto é só o CATÁLOGO — a persistência real fica na tabela `JobRole` (Prisma). Este arquivo nunca
// é a fonte de verdade em runtime (o banco é), só o valor inicial/idempotente do seed e a validação
// de "cargo conhecido" sem precisar de round-trip ao banco.
export type JobRoleCode =
  | 'LDR'
  | 'BDR'
  | 'SDR'
  | 'CLOSER'
  | 'COORDENADOR_COMERCIAL'
  | 'GERENTE_COMERCIAL'
  | 'DIRETOR_COMERCIAL'
  | 'RECEITA_FATURAMENTO'
  | 'CHURN_RETENCAO'
  | 'CONTRATOS_ASSINATURA'
  | 'BITRIX_GUARDIAN'
  | 'REVENUE_INTELLIGENCE';

export interface JobRoleCatalogEntry {
  code: JobRoleCode;
  name: string;
  department: string;
  description: string;
  /** Ordenação funcional para exibição — não é nível de segurança (isso é só `UserRole`). */
  level: number;
}

export const JOB_ROLE_CATALOG: JobRoleCatalogEntry[] = [
  {
    code: 'LDR',
    name: 'LDR — Lead Development Representative',
    department: 'Prospecção',
    description: 'Contextualiza e prioriza contas antes da abordagem, usando sinais reais de mercado já coletados.',
    level: 10,
  },
  {
    code: 'BDR',
    name: 'BDR — Business Development Representative',
    department: 'Prospecção',
    description: 'Transforma contas priorizadas em abordagens outbound e cria o primeiro movimento comercial.',
    level: 20,
  },
  {
    code: 'SDR',
    name: 'SDR — Sales Development Representative',
    department: 'Vendas',
    description: 'Qualifica leads com evidência e converte interesse em oportunidade trabalhável.',
    level: 30,
  },
  {
    code: 'CLOSER',
    name: 'Closer',
    department: 'Vendas',
    description: 'Conduz negociação e fechamento protegendo margem e probabilidade real de venda.',
    level: 40,
  },
  {
    code: 'COORDENADOR_COMERCIAL',
    name: 'Coordenador Comercial',
    department: 'Gestão Comercial',
    description: 'Acompanha o ritmo diário do time a partir de alertas, aging e indicadores operacionais.',
    level: 50,
  },
  {
    code: 'GERENTE_COMERCIAL',
    name: 'Gerente Comercial',
    department: 'Gestão Comercial',
    description: 'Revisa forecast, pipeline e performance do time, separando fato, tendência e risco.',
    level: 60,
  },
  {
    code: 'DIRETOR_COMERCIAL',
    name: 'Diretor Comercial',
    department: 'Executivo',
    description: 'Responde se a máquina comercial sustenta a meta, traduzindo operação em decisão executiva.',
    level: 70,
  },
  {
    code: 'RECEITA_FATURAMENTO',
    name: 'Receita & Faturamento',
    department: 'Financeiro/Receita',
    description: 'Reconcilia vendido x faturado e acompanha tendência/alertas de receita.',
    level: 45,
  },
  {
    code: 'CHURN_RETENCAO',
    name: 'Churn & Retenção',
    department: 'Customer Success',
    description: 'Identifica risco de cancelamento e propõe plano de retenção com evidência.',
    level: 45,
  },
  {
    code: 'CONTRATOS_ASSINATURA',
    name: 'Contratos & Assinatura',
    department: 'Operações/Jurídico',
    description: 'Avalia prontidão de contrato e narra o status real de assinatura.',
    level: 45,
  },
  {
    code: 'BITRIX_GUARDIAN',
    name: 'Bitrix Guardian',
    department: 'RevOps',
    description: 'Diagnostica a saúde da sincronização Bitrix x Central a partir de dados reais.',
    level: 45,
  },
  {
    code: 'REVENUE_INTELLIGENCE',
    name: 'Revenue Intelligence',
    department: 'Revenue Intelligence',
    description: 'Traduz métricas do cockpit comercial em previsibilidade de forecast e pipeline.',
    level: 45,
  },
];

export const JOB_ROLE_CODES: JobRoleCode[] = JOB_ROLE_CATALOG.map((r) => r.code);

export function isJobRoleCode(value: string): value is JobRoleCode {
  return (JOB_ROLE_CODES as string[]).includes(value);
}
