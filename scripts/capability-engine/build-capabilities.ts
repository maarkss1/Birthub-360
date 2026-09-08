import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface CapabilityItem {
  code: string;
  name: string;
  domain: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionType: 'READ' | 'WRITE' | 'EXECUTE' | 'ADMIN';
  isReadOnly: boolean;
  requiresApprovalByDefault: boolean;
  description: string;
}

export const CAPABILITIES: CapabilityItem[] = [
  // 1. Account & Company
  { code: 'account.read', name: 'Leitura de Conta', domain: 'account', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta dados cadastrais e perfil de contas.' },
  { code: 'account.search', name: 'Busca de Contas', domain: 'account', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Pesquisa e listagem estruturada de contas por critérios.' },
  { code: 'account.research', name: 'Pesquisa Profunda de Conta', domain: 'account', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Levantamento de contexto público, sinais e inteligência sobre a conta.' },
  { code: 'account.score', name: 'Score de Conta', domain: 'account', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Avaliação de adequação e score de prioridade da conta.' },
  { code: 'company.read', name: 'Leitura de Empresa', domain: 'company', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Visualização de dados cadastrais e firmográficos de empresas.' },
  { code: 'company.search', name: 'Busca de Empresa', domain: 'company', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Busca de empresas no banco e bases de enriquecimento.' },
  { code: 'company.enrich', name: 'Enriquecimento de Empresa', domain: 'company', riskLevel: 'MEDIUM', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Enriquecimento de dados cadastrais de empresas via fontes externas.' },

  // 2. Lead & ICP
  { code: 'lead.read', name: 'Leitura de Lead', domain: 'lead', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Visualização de dados e histórico de leads.' },
  { code: 'lead.search', name: 'Busca de Leads', domain: 'lead', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Pesquisa de leads por filtros operacionais.' },
  { code: 'lead.enrich', name: 'Enriquecimento de Lead', domain: 'lead', riskLevel: 'MEDIUM', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Enriquecimento de dados de contato e contexto de leads.' },
  { code: 'lead.score', name: 'Score de Lead', domain: 'lead', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Cálculo e leitura de propensão/fit de leads.' },
  { code: 'lead.qualify', name: 'Qualificação de Lead', domain: 'lead', riskLevel: 'MEDIUM', actionType: 'EXECUTE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Execução de roteiro e matriz de qualificação de lead.' },
  { code: 'lead.update', name: 'Atualização de Lead', domain: 'lead', riskLevel: 'HIGH', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: true, description: 'Alteração cadastral ou de status operacional de lead.' },
  { code: 'icp.read', name: 'Leitura de ICP', domain: 'market', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta aos parâmetros e taxonomia de Ideal Customer Profile.' },
  { code: 'icp.analyze', name: 'Análise de ICP Fit', domain: 'market', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Avaliação de aderência de contas e leads ao ICP.' },

  // 3. Market & Intelligence
  { code: 'market.read', name: 'Leitura de Mercado', domain: 'market', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a indicadores de mercado, CNAEs e territórios.' },
  { code: 'market.research', name: 'Pesquisa de Mercado', domain: 'market', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Pesquisa e inteligência sobre setores, competidores e geografia.' },
  { code: 'decision_maker.search', name: 'Busca de Decisores', domain: 'market', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Mapeamento de decisores e contatos-chave em contas alvo.' },
  { code: 'trigger_event.read', name: 'Eventos de Disparo', domain: 'market', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Monitoramento de eventos de disparo comercial e notícias.' },
  { code: 'news.read', name: 'Leitura de Notícias', domain: 'market', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a menções públicas e clipping de empresas.' },
  { code: 'territory.read', name: 'Mapeamento Territorial', domain: 'market', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a divisões de território, cobertura e rotas.' },

  // 4. Outbound & Cadence
  { code: 'outbound.plan', name: 'Planejamento Outbound', domain: 'outbound', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Estratégia de abordagem e definição de público-alvo outbound.' },
  { code: 'outbound.personalize', name: 'Personalização de Abordagem', domain: 'outbound', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Geração de ganchos e contexto personalizado para contatos.' },
  { code: 'outbound.generate_message', name: 'Geração de Mensagem Outbound', domain: 'outbound', riskLevel: 'MEDIUM', actionType: 'EXECUTE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Redação de copy, e-mails e mensagens de prospecção.' },
  { code: 'outbound.generate_script', name: 'Geração de Roteiro de Ligação', domain: 'outbound', riskLevel: 'MEDIUM', actionType: 'EXECUTE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Criação de scripts e frameworks para ligações e cold calling.' },
  { code: 'cadence.read', name: 'Leitura de Cadência', domain: 'cadence', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Visualização de fluxos e passos de cadência comercial.' },
  { code: 'cadence.suggest', name: 'Sugestão de Próximo Passo de Cadência', domain: 'cadence', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Recomendação do melhor canal e horário para próximo toque.' },
  { code: 'cadence.execute', name: 'Execução de Passo de Cadência', domain: 'cadence', riskLevel: 'MEDIUM', actionType: 'EXECUTE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Avanço e conclusão de passos em cadências ativas.' },

  // 5. Meetings & Calendar
  { code: 'meeting.read', name: 'Leitura de Reuniões', domain: 'meeting', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta à agenda de reuniões e histórico de chamadas.' },
  { code: 'meeting.prepare', name: 'Preparação de Reunião', domain: 'meeting', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Dossiê pré-reunião com histórico, perfil e objetivos.' },
  { code: 'meeting.analyze', name: 'Análise de Reunião', domain: 'meeting', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Processamento de transcrição, resumo e próximos passos da reunião.' },
  { code: 'meeting.request', name: 'Solicitação de Reunião', domain: 'meeting', riskLevel: 'LOW', actionType: 'EXECUTE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Proposta e geração de convite ou link público de agendamento.' },
  { code: 'meeting.schedule', name: 'Agendamento Real de Reunião', domain: 'meeting', riskLevel: 'MEDIUM', actionType: 'EXECUTE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Criação de evento no Google Calendar e envio de convites.' },

  // 6. Activities & Qualification
  { code: 'activity.read', name: 'Leitura de Atividades', domain: 'activity', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta ao histórico de ligações, e-mails e tarefas.' },
  { code: 'activity.create', name: 'Criação de Atividade', domain: 'activity', riskLevel: 'MEDIUM', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Registro de nova tarefa, ligação ou anotação de atividade.' },
  { code: 'activity.update', name: 'Atualização de Atividade', domain: 'activity', riskLevel: 'MEDIUM', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Conclusão ou remarcação de atividade comercial.' },
  { code: 'activity.analyze', name: 'Análise de Atividades', domain: 'activity', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Métricas de esforço, ritmo de contato e SLA de resposta.' },
  { code: 'qualification.read', name: 'Leitura de Critérios de Qualificação', domain: 'qualification', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta à matriz de qualificação (BANT/MEDDIC/SPIN).' },
  { code: 'qualification.evaluate', name: 'Avaliação de Qualificação', domain: 'qualification', riskLevel: 'MEDIUM', actionType: 'EXECUTE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Classificação do nível de prontidão da oportunidade.' },

  // 7. Deals & Pipeline
  { code: 'deal.read', name: 'Leitura de Oportunidades', domain: 'deal', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Visualização de negócios, valores e estágios.' },
  { code: 'deal.analyze', name: 'Análise de Negócio', domain: 'deal', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Diagnóstico de risco, objeções e probabilidade de fechamento.' },
  { code: 'deal.update', name: 'Atualização de Negócio', domain: 'deal', riskLevel: 'HIGH', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: true, description: 'Alteração de dados de negócio, contatos e previsão de fechamento.' },
  { code: 'deal.move_stage', name: 'Mudança de Estágio do Negócio', domain: 'deal', riskLevel: 'HIGH', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: true, description: 'Avanço ou perda de estágio no pipeline comercial.' },
  { code: 'pipeline.read', name: 'Leitura de Pipeline', domain: 'pipeline', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Visão de funil de vendas, volumes e taxas de passagem.' },
  { code: 'pipeline.analyze', name: 'Análise de Pipeline', domain: 'pipeline', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Detecção de gargalos, velocidade e cobertura de funil.' },

  // 8. Forecast & Revenue Intelligence
  { code: 'forecast.read', name: 'Leitura de Forecast', domain: 'revenue', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Projeções de receita, commit, best-case e attainment.' },
  { code: 'forecast.explain', name: 'Explicação e Narrativa de Forecast', domain: 'revenue', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Decomposição qualitativa e explicação das variações de forecast.' },
  { code: 'revenue.read', name: 'Leitura de Métricas de Receita', domain: 'revenue', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a MRR, ARR, ticket médio e concentração de receita.' },
  { code: 'revenue.analyze', name: 'Análise Executiva de Receita', domain: 'revenue', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Análise de tendências, gaps e eficiência de capital.' },
  { code: 'revenue.reconcile', name: 'Reconciliação de Receita', domain: 'revenue', riskLevel: 'HIGH', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: true, description: 'Reconciliação entre vendas fechadas e receita reconhecida.' },
  { code: 'coverage.read', name: 'Leitura de Cobertura de Meta', domain: 'revenue', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Múltiplo de cobertura de pipeline sobre a cota.' },
  { code: 'conversion.read', name: 'Leitura de Conversão', domain: 'revenue', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Taxas históricas de conversão entre etapas do funil.' },
  { code: 'sales_cycle.read', name: 'Leitura de Ciclo de Vendas', domain: 'revenue', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Duração média e tempo em estágio dos negócios.' },
  { code: 'aging.read', name: 'Leitura de Aging', domain: 'revenue', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Tempo de inatividade e estagnação de leads e negócios.' },
  { code: 'loss.read', name: 'Análise de Motivos de Perda', domain: 'revenue', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Diagnóstico de perda de oportunidades por motivo e concorrente.' },
  { code: 'health_score.read', name: 'Leitura de Health Score', domain: 'revenue', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Índice de saúde das contas e probabilidade de expansão.' },
  { code: 'scenario.analyze', name: 'Análise de Cenários', domain: 'revenue', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Modelagem de cenários otimista, realista e conservador de vendas.' },
  { code: 'executive.read', name: 'Visão Executiva Comercial', domain: 'revenue', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Cockpit executivo consolidado para gerência e diretoria.' },

  // 9. Proposal, Pricing & ROI
  { code: 'proposal.read', name: 'Leitura de Propostas', domain: 'proposal', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a propostas comerciais enviadas e modelos.' },
  { code: 'proposal.generate', name: 'Geração de Proposta Comercial', domain: 'proposal', riskLevel: 'MEDIUM', actionType: 'EXECUTE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Montagem de proposta de valor e escopo personalizada.' },
  { code: 'pricing.read', name: 'Leitura de Tabela de Preços', domain: 'pricing', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a planos, pacotes e tabelas de preços oficiais.' },
  { code: 'pricing.suggest', name: 'Sugestão de Precificação', domain: 'pricing', riskLevel: 'MEDIUM', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Recomendação de faixa de preço e pacote baseada no valor.' },
  { code: 'pricing.approve', name: 'Aprovação de Preço Customizado', domain: 'pricing', riskLevel: 'HIGH', actionType: 'ADMIN', isReadOnly: false, requiresApprovalByDefault: true, description: 'Autorização de condição comercial ou precificação fora de tabela.' },
  { code: 'discount.suggest', name: 'Sugestão de Desconto', domain: 'pricing', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Cálculo de impacto de desconto em margem e ROI.' },
  { code: 'discount.approve', name: 'Aprovação de Desconto', domain: 'pricing', riskLevel: 'HIGH', actionType: 'ADMIN', isReadOnly: false, requiresApprovalByDefault: true, description: 'Aprovação de alçada de desconto sobre valor do contrato.' },
  { code: 'roi.calculate', name: 'Cálculo de ROI Comercial', domain: 'proposal', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Modelagem matemática de retorno sobre investimento para o cliente.' },

  // 10. Contracts & Signatures
  { code: 'contract.read', name: 'Leitura de Contratos', domain: 'contract', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta ao status e termos contratuais de clientes.' },
  { code: 'contract.analyze', name: 'Análise de Minuta Contratual', domain: 'contract', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Revisão de conformidade jurídica, riscos e cláusulas.' },
  { code: 'contract.generate', name: 'Geração de Minuta Contratual', domain: 'contract', riskLevel: 'HIGH', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: true, description: 'Criação de minuta de contrato para envio a cliente.' },
  { code: 'contract.validate', name: 'Validação de Dados Contratuais', domain: 'contract', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Checagem de consistência cadastral antes da emissão.' },
  { code: 'contract.request', name: 'Solicitação de Emissão de Contrato', domain: 'contract', riskLevel: 'MEDIUM', actionType: 'EXECUTE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Pedido de elaboração de contrato direcionado ao time de contratos.' },
  { code: 'contract.request_signature', name: 'Disparo de Assinatura de Contrato', domain: 'contract', riskLevel: 'CRITICAL', actionType: 'ADMIN', isReadOnly: false, requiresApprovalByDefault: true, description: 'Envio formal de documento para assinatura digital via integrador.' },
  { code: 'signature.read', name: 'Consulta de Status de Assinatura', domain: 'contract', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Verificação do andamento da coleta de assinaturas eletrônicas.' },
  { code: 'signature.request', name: 'Solicitação de Assinatura', domain: 'contract', riskLevel: 'CRITICAL', actionType: 'ADMIN', isReadOnly: false, requiresApprovalByDefault: true, description: 'Disparo de envelope de assinatura digital às partes.' },
  { code: 'signature.cancel', name: 'Cancelamento de Assinatura', domain: 'contract', riskLevel: 'HIGH', actionType: 'ADMIN', isReadOnly: false, requiresApprovalByDefault: true, description: 'Revogação de envelope de assinatura em andamento.' },

  // 11. Customer Success & Churn
  { code: 'customer.read', name: 'Leitura de Cliente', domain: 'customer', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta ao perfil, uso e histórico de clientes ativos.' },
  { code: 'customer.health', name: 'Saúde do Cliente', domain: 'customer', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Indicadores de engajamento, adoção e risco de cliente.' },
  { code: 'customer.lifecycle', name: 'Ciclo de Vida do Cliente', domain: 'customer', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Acompanhamento das fases de onboarding, adoção e renovação.' },
  { code: 'churn.read', name: 'Leitura de Risco de Churn', domain: 'customer', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Relatório de probabilidade e alertas de cancelamento.' },
  { code: 'churn.analyze', name: 'Análise Preditiva de Churn', domain: 'customer', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Diagnóstico causal de propensão a cancelamento por IA.' },
  { code: 'retention.plan', name: 'Plano de Retenção', domain: 'customer', riskLevel: 'MEDIUM', actionType: 'EXECUTE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Proposta de playbook e ações corretivas para contas em risco.' },
  { code: 'renewal.read', name: 'Gestão de Renovações', domain: 'customer', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Painel de contratos próximos da data de expiração/renovação.' },
  { code: 'revenue_at_risk.read', name: 'Receita em Risco', domain: 'customer', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Total de MRR sob alto risco de perda ou downgrade.' },

  // 12. CRM & Bitrix Integration
  { code: 'crm.read', name: 'Leitura de Dados de CRM', domain: 'crm', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a entidades sincronizadas do CRM.' },
  { code: 'crm.audit', name: 'Auditoria de Higiene de CRM', domain: 'crm', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Identificação de campos vazios, dados defasados e inconsistências.' },
  { code: 'crm.suggest_update', name: 'Sugestão de Atualização de CRM', domain: 'crm', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Recomendação de preenchimento ou avanço de dados de CRM.' },
  { code: 'crm.duplicate_detect', name: 'Detecção de Duplicidades no CRM', domain: 'crm', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Busca de registros duplicados de contatos, empresas ou leads.' },
  { code: 'crm.stage_validate', name: 'Validação de Estágio do CRM', domain: 'crm', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Checagem de critérios obrigatórios para avanço de estágio.' },
  { code: 'crm.field_validate', name: 'Validação de Campos do CRM', domain: 'crm', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Verificação de conformidade de formatos de CNPJ, telefone e e-mail.' },
  { code: 'bitrix.read', name: 'Leitura de Status Bitrix', domain: 'integrations', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a logs e status da integração com Bitrix24.' },
  { code: 'bitrix.sync_status', name: 'Status de Sincronização Bitrix', domain: 'integrations', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Monitoramento da saúde e atraso da fila de sincronização Bitrix.' },
  { code: 'bitrix.write', name: 'Escrita no Bitrix24', domain: 'integrations', riskLevel: 'HIGH', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: true, description: 'Writeback de entidades ou atualizações de dados no Bitrix24.' },
  { code: 'bitrix.configure', name: 'Configuração da Integração Bitrix', domain: 'integrations', riskLevel: 'CRITICAL', actionType: 'ADMIN', isReadOnly: false, requiresApprovalByDefault: true, description: 'Alteração de credenciais, webhooks ou mapeamento de campos do Bitrix.' },

  // 13. Finance, Billing & Invoicing (SOURCE_REQUIRED)
  { code: 'billing.read', name: 'Leitura de Faturamento', domain: 'billing', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a dados de faturamento e extrato.' },
  { code: 'billing.reconcile', name: 'Reconciliação de Faturamento', domain: 'billing', riskLevel: 'HIGH', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: true, description: 'Reconciliação contábil entre vendas e faturamento.' },
  { code: 'billing.analyze', name: 'Análise de Faturamento e Inadimplência', domain: 'billing', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Análise de aging financeiro, dunning e perdas de crédito.' },
  { code: 'invoice.read', name: 'Leitura de Notas Fiscais e Boletos', domain: 'billing', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a faturas e documentos fiscais emitidos.' },
  { code: 'invoice.generate', name: 'Geração de Fatura e Nota Fiscal', domain: 'billing', riskLevel: 'HIGH', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: true, description: 'Emissão de documento de cobrança ou nota fiscal.' },
  { code: 'payment.read', name: 'Consulta de Pagamentos', domain: 'billing', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a status de liquidação de pagamentos.' },

  // 14. Team & Management
  { code: 'team.read', name: 'Leitura de Equipe Comercial', domain: 'team', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta à composição do time comercial e atribuições.' },
  { code: 'team.manage', name: 'Gestão de Time Comercial', domain: 'team', riskLevel: 'HIGH', actionType: 'ADMIN', isReadOnly: false, requiresApprovalByDefault: true, description: 'Alteração de cargos, territórios e vínculos de equipe.' },
  { code: 'team.performance', name: 'Performance de Time', domain: 'team', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Relatório comparativo de produtividade e resultados por membro.' },
  { code: 'sla.read', name: 'Leitura de SLA Comercial', domain: 'team', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Monitoramento de tempos de primeiro contato e atendimento.' },
  { code: 'sla.analyze', name: 'Análise de Aderência a SLA', domain: 'team', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Diagnóstico de violações e desvios de SLA de atendimento.' },
  { code: 'alert.read', name: 'Leitura de Alertas Operacionais', domain: 'team', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a notificações e avisos de anomalias operacionais.' },
  { code: 'alert.manage', name: 'Gestão de Alertas Operacionais', domain: 'team', riskLevel: 'MEDIUM', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Configuração de regras e limites de alertas da operação.' },
  { code: 'coaching.read', name: 'Leitura de Orientações de Coaching', domain: 'team', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a feedbacks e recomendações de desenvolvimento de vendedores.' },
  { code: 'coaching.suggest', name: 'Sugestão de Coaching Comercial', domain: 'team', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Identificação de gaps de pitch e sugestão de treinamentos.' },
  { code: 'coaching.manage', name: 'Gestão de Planos de Coaching', domain: 'team', riskLevel: 'MEDIUM', actionType: 'WRITE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Acompanhamento de metas de desenvolvimento de representantes.' },
  { code: 'goal.read', name: 'Leitura de Metas Comerciais', domain: 'team', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a cotas e metas de vendas individuais e de time.' },
  { code: 'goal.manage', name: 'Gestão de Metas Comerciais', domain: 'team', riskLevel: 'HIGH', actionType: 'ADMIN', isReadOnly: false, requiresApprovalByDefault: true, description: 'Definição e ajuste de cotas de vendas da equipe.' },
  { code: 'performance.read', name: 'Leitura de Indicadores de Performance', domain: 'team', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Consulta a métricas de produtividade comercial individual.' },
  { code: 'performance.analyze', name: 'Análise de Performance Comercial', domain: 'team', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Diagnóstico aprofundado de forças e fraquezas de execução.' },

  // 15. Knowledge & Platform
  { code: 'knowledge.search', name: 'Busca na Base de Conhecimento', domain: 'knowledge', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Pesquisa semântica em playbooks, materiais de apoio e documentos.' },
  { code: 'agent.discover', name: 'Descoberta de Agentes', domain: 'platform', riskLevel: 'LOW', actionType: 'READ', isReadOnly: true, requiresApprovalByDefault: false, description: 'Listagem e visualização de agentes disponíveis no catálogo.' },
  { code: 'agent.execute', name: 'Execução de Agente', domain: 'platform', riskLevel: 'MEDIUM', actionType: 'EXECUTE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Disparo de execução de agentes com capabilities autorizadas.' },
  { code: 'agent.request_cross_role', name: 'Solicitação de Acesso a Agente Cross-Role', domain: 'platform', riskLevel: 'LOW', actionType: 'EXECUTE', isReadOnly: false, requiresApprovalByDefault: false, description: 'Abertura de pedido de autorização para agentes de outros cargos.' }
];

export function buildCapabilitiesJson() {
  const jsonPath = resolve(__dirname, '../../src/features/job-roles/catalog/capabilities.normalized.json');
  const payload = {
    generatedAt: '2026-09-08',
    totalCapabilities: CAPABILITIES.length,
    byRisk: {
      LOW: CAPABILITIES.filter((c) => c.riskLevel === 'LOW').length,
      MEDIUM: CAPABILITIES.filter((c) => c.riskLevel === 'MEDIUM').length,
      HIGH: CAPABILITIES.filter((c) => c.riskLevel === 'HIGH').length,
      CRITICAL: CAPABILITIES.filter((c) => c.riskLevel === 'CRITICAL').length,
    },
    byActionType: {
      READ: CAPABILITIES.filter((c) => c.actionType === 'READ').length,
      WRITE: CAPABILITIES.filter((c) => c.actionType === 'WRITE').length,
      EXECUTE: CAPABILITIES.filter((c) => c.actionType === 'EXECUTE').length,
      ADMIN: CAPABILITIES.filter((c) => c.actionType === 'ADMIN').length,
    },
    capabilities: CAPABILITIES,
  };

  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`Gerado com sucesso: ${jsonPath} (${CAPABILITIES.length} capabilities)`);
}

buildCapabilitiesJson();
