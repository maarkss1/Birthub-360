export type AIProvider = 'ollama' | 'groq' | 'gemini';

export interface AIConfig {
  provider: AIProvider;
  ollamaUrl: string;
  ollamaModel: string;
  groqApiKey: string;
  groqModel: string;
  geminiModel: string;
  temperature: number;
  maxTokens: number;
}

export interface ProspectorConfig {
  query: string;
  limit: number;
  pitch: string;
  googleApiKey: string;
  apolloApiKey: string;
  targetTitles: string[];
  tone: 'consultivo' | 'direto' | 'storytelling' | 'provocador';
}

export interface DecisionMaker {
  name: string;
  title: string;
  email: string;
  emails?: string[];
  phone?: string;
  phones?: string[];
  linkedin: string;
  seniority?: string;
}

export interface NewsItem {
  title: string;
  source: string;
  date: string;
  snippet: string;
  url?: string;
  relevance: string; // Como usar essa notícia na abordagem comercial
}

export interface NewsDossier {
  company_overview: string;
  // Só populado quando há notícias públicas reais e verificáveis, com fonte real.
  // Um array vazio significa "nenhuma notícia real conhecida", não que a busca falhou.
  recent_news: NewsItem[];
  decision_maker_insights: string;
  commercial_hooks: string[];
}

export interface OutreachCopies {
  cold_call: string;
  cold_email: string;
  whatsapp: string;
  linkedin: string;
  approach_prompt?: string;
  followup_strategy?: string;
  objection_matrix?: string;
  qualification_matrix?: string;
  ice_breaker?: string;
}

export type LeadStage = 'prospecto' | 'qualificado' | 'contatado' | 'negociacao' | 'ganho' | 'perdido';

export interface LeadQualityMetric {
  score: number; // 0 to 100
  tier: 'green' | 'yellow' | 'red';
  tierLabel: string;
  hasDecisionMaker: boolean;
  hasTitle: boolean;
  hasEmail: boolean;
  hasLinkedin: boolean;
  hasPhone: boolean;
  hasWebsite: boolean;
  hasCnpj?: boolean;
  completionCount: number;
  totalFields: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'gestor';
  company?: 'atlas' | 'totaltrac';
  created_at?: string;
}

export type BitrixCheckStatus = 'existing_client' | 'existing_lead' | 'new' | 'unchecked';

export interface Lead {
  id: string;
  campaign_id?: string;
  // Wave 10 (CPI) - Observabilidade: liga este lead à busca (SearchRun) que o
  // encontrou - "por que esta empresa apareceu?" via GET /api/search-runs/:searchId.
  // Aditivo: leads gravados antes desta wave simplesmente não têm o campo.
  search_id?: string;
  company?: 'atlas' | 'totaltrac';
  name: string;
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  situacao_cadastral?: string;
  cnae_fiscal?: string;
  cnae_fiscal_descricao?: string;
  capital_social?: string;
  natureza_juridica?: string;
  porte?: string;
  qsa?: Array<{ nome_socio: string; qualificacao_socio?: string }>;
  cnpj_consultado?: boolean;
  address: string;
  phone: string;
  corporate_email?: string;
  website: string;
  domain: string;
  company_linkedin?: string;
  rating: number | string;
  total_ratings: number;
  segment?: string;
  company_type?: string;
  employee_count?: string;
  annual_revenue?: string;

  // Decisor(es)
  decision_makers: DecisionMaker[];
  decision_maker_name?: string;
  decision_maker_title?: string;
  decision_maker_email?: string;
  decision_maker_emails?: string[];
  decision_maker_phone?: string;
  decision_maker_phones?: string[];
  decision_maker_linkedin?: string;

  // Estágio e Tags
  stage?: LeadStage;
  tags?: string[];
  loss_reason?: string;
  // Wave 13 (CPI) - Feedback Loop: contraparte simétrica de loss_reason,
  // gravada quando o lead vai para o estágio "ganho".
  win_reason?: string;

  // Ordem de prioridade dentro da fila do vendedor (maior = trabalhar primeiro).
  // Default 0 — usado para furar a fila (ex: leads de uma cidade/campanha prioritária).
  priority?: number;

  // Wave 2 (CPI) - Requirement Engine: por critério pedido na busca, o que foi
  // observado para este lead específico e se corresponde. Não persistido no
  // banco (ver docs/CPI_BACKLOG.md) - calculado a cada resposta de /prospect.
  requirement_evaluations?: RequirementEvaluation[];

  // Wave 8 (CPI) - Scoring: fit/intent/dataQuality + final, sempre com os 3
  // scores individuais visíveis (nunca só o final) e "reasons" explicando o
  // valor. Não persistido no banco - recalculado a cada resposta de
  // /prospect a partir de requirement_evaluations e das evidências do lead.
  scores?: LeadScores;

  // Segunda Etapa: Enriquecimento de Notícias & Fontes Públicas
  is_enriched?: boolean;
  news_dossier?: NewsDossier;

  // Atribuição de Usuários
  assigned_to?: string;
  activity_notes?: string;
  activity_context?: string;

  // Copys & Scripts (Gerados sob demanda na 2ª etapa)
  copies?: OutreachCopies;
  copies_generated?: boolean;
  engine_used?: string;
  created_at?: string;

  // Bitrix24: já é cliente/já está na base? (checado antes de criar o lead)
  bitrix_check_status?: BitrixCheckStatus;
  bitrix_check_detail?: string;

  // true quando a consulta oficial de CNPJ falhou e os campos financeiros/cadastrais
  // vieram de um valor fixo de preenchimento, não de dado real da empresa
  is_estimated?: boolean;

  // Wave 12 (CPI) - CRM/Operação: status real da última tentativa de exportar
  // este lead para o Bitrix24 - persistido (não é fire-and-forget). 'blocked'
  // = reprovado pela checagem de elegibilidade (ver server/exportEligibility.ts)
  // antes de qualquer chamada de rede; 'error' = a chamada foi feita mas falhou
  // (rede, validação do Bitrix, timeout); 'exported' = sucesso confirmado.
  // Leads salvos antes desta wave simplesmente não têm o campo (equivalente a
  // 'not_exported').
  bitrix_export_status?: 'not_exported' | 'exported' | 'error' | 'blocked';
  bitrix_export_error?: string;
  bitrix_exported_at?: string;

  // Tarefa recomendada (calculada em cada leitura, não gerada por IA — sempre
  // a mesma resposta para o mesmo estado do lead)
  next_action?: string;
  next_action_reason?: string;
  next_action_urgency?: 'alta' | 'media' | 'baixa';
}

// Tarefa criada manualmente pelo vendedor para um lead (ex: "ligar de volta
// dia 28", "enviar proposta") — diferente de next_action (que é a recomendação
// automática do sistema, nunca gravada como registro próprio).
export interface LeadTask {
  id: number;
  lead_id: string;
  user_id?: string | null;
  description: string;
  due_date?: string | null;
  status: 'pending' | 'done' | 'cancelled';
  completed_at?: string | null;
  created_at: string;
  // Presentes só nas listagens consolidadas (por usuário / todas), via JOIN.
  lead_name?: string;
  lead_company?: 'atlas' | 'totaltrac';
  user_name?: string;
}

export interface Campaign {
  id: string;
  title: string;
  company?: 'atlas' | 'totaltrac';
  segment: string;
  pitch: string;
  provider: string;
  model: string;
  leads_count: number;
  created_at: string;
  leads?: Lead[];
  messages?: MessageRecord[];
}

export interface MessageRecord {
  id: string;
  campaign_id?: string;
  lead_id?: string;
  lead_name?: string;
  channel: 'cold_call' | 'cold_email' | 'whatsapp' | 'linkedin' | 'chat';
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: 'draft' | 'reviewed' | 'sent' | 'archived';
  engine_used?: string;
  // Wave 13 (CPI) - Feedback Loop: se o vendedor usou o roteiro como veio,
  // editou antes de usar, ou nem usou (ver VALID_COPY_FEEDBACK em server/routes.ts).
  feedback?: 'used_as_is' | 'edited' | 'not_used';
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  tokens?: number;
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  created_at: string;
  messages?: ChatMessage[];
}

export interface DatabaseStats {
  campaignsCount: number;
  leadsCount: number;
  messagesCount: number;
  chatMessagesCount: number;
  dbSizeBytes: number;
  tables: {
    name: string;
    rowCount: number;
  }[];
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  executionTimeMs: number;
  rowCount: number;
  error?: string;
}

export type ThemeMode = 'dark' | 'light';

// Wave 2 (CPI) - Requirement Engine: semântica operacional de cada critério de
// busca, e o resultado de avaliá-lo contra o que foi de fato OBSERVADO no lead
// (nunca contra o que foi apenas pedido - ver server/requirementEngine.ts).
export type RequirementType = 'HARD_FILTER' | 'SOFT_FILTER' | 'SIGNAL' | 'EXCLUSION' | 'ENRICHMENT';
export type RequirementStatus = 'matched' | 'unmatched' | 'unknown' | 'excluded';
export type UnknownHardFilterPolicy = 'conservative' | 'balanced' | 'broad';

export interface RequirementEvaluation {
  criterion: string;
  type: RequirementType;
  expected: string | number;
  observed: string | number | null;
  status: RequirementStatus;
  source: string;
  reason: string;
  weight: number;
}

// Wave 8 (CPI) - Scoring: separa completude de dado (Data Quality) de
// adequação comercial (Fit) e de propensão temporal (Intent) - ver
// server/scoring.ts. Os três nunca ficam escondidos atrás de um "Final Score"
// único; cada um carrega `reasons` (explicabilidade) e `confidence` (quanto
// dado de fato sustenta aquele número). `score: null` significa "sem base
// para calcular ainda" - nunca é o mesmo que 0.
export interface ScoringWeights {
  fit: number;
  intent: number;
  dataQuality: number;
}

export interface FitScore {
  score: number | null; // 0-100; null quando nenhum critério pedido foi confirmado ou refutado ainda
  confidence: number; // 0-1
  reasons: string[];
  matchedWeight: number;
  consideredWeight: number;
  unknownCount: number;
  hardFilterFailed: boolean;
}

// Signals & Intent (pacote CPI, doc 13_AGENTE_SIGNALS_INTENT.txt) - sinais
// reais de momento de compra. A lista de tipos é literalmente a lista do
// pacote ("SINAIS POSSÍVEIS"), traduzida para identificadores estáveis - ver
// server/signals.ts para quem de fato detecta cada um (hoje, só
// 'nova_operacao', a partir de data de início de atividade oficial via
// CNPJ - os demais exigem um provider externo não integrado e nunca são
// emitidos por inferência/chute).
export type SignalType =
  | 'nova_filial'
  | 'expansao_geografica'
  | 'crescimento_headcount'
  | 'vagas_logistica'
  | 'nova_operacao'
  | 'aumento_frota'
  | 'novo_contrato'
  | 'mudanca_executiva'
  | 'incidente_seguranca'
  | 'aquisicao'
  | 'investimento'
  | 'troca_sistema'
  | 'expansao_cd'
  | 'alta_exposicao_operacional';

// Campos exatamente como especificados pelo pacote CPI ("CADA SIGNAL"): type,
// observedAt, source, evidence, confidence, commercialRelevance, expiresAt.
// "IA pode classificar/resumir evidências já coletadas. NÃO pode inventar
// sinal." - por isso `evidence` é sempre uma lista de trechos/fatos concretos
// que sustentam o sinal, nunca um resumo sem lastro; e nenhum sinal aqui é
// emitido sem uma fonte real por trás (ver server/signals.ts).
export interface Signal {
  type: SignalType;
  observedAt: string; // ISO 8601 - quando o sinal foi confirmado por uma fonte
  source: string; // provider/fonte que confirmou (ex: 'cnpj_receita_federal')
  evidence: string[]; // trechos/fatos concretos que sustentam o sinal
  confidence: number; // 0-1 - confiança de que o sinal é real
  commercialRelevance: number; // 0-1 - o quão relevante este sinal é para propensão de compra
  expiresAt?: string; // ISO 8601 - a partir de quando o sinal deixa de contar como "recente"
}

export interface IntentScore {
  score: number | null;
  confidence: number;
  reasons: string[];
  signalsUsed: Signal[];
  signalsAvailable: boolean;
}

export interface DataQualityScore {
  score: number | null;
  confidence: number;
  reasons: string[];
  verifiedCount: number;
  conflictedCount: number;
  unverifiedCount: number;
  inferredCount: number;
  consideredCount: number;
  relevantFieldCount: number;
}

export interface LeadScores {
  fit: FitScore;
  intent: IntentScore;
  dataQuality: DataQualityScore;
  final: number | null;
  weights: ScoringWeights;
  reasons: string[];
  scoringModelVersion: string;
}

// Wave 1 (CPI) - Search Intent: filtros estruturados que a UI já coleta via
// dropdowns e envia individualmente ao backend, em vez de compactá-los numa
// única string de busca (o backend monta o SearchIntent a partir destes campos).
export interface ProspectFilters {
  segment?: string;
  region?: string;
  city?: string;
  radiusKm?: number;
  companyType?: string;
  employeeCount?: string;
  annualRevenue?: string;
  decisionMakerRole?: string;
  // Termos reais enviados à busca de pessoas do Apollo (union dos cargos marcados
  // no combobox de múltipla escolha) — decisionMakerRole acima é só o rótulo exibido.
  decisionMakerTitles?: string[];
}

export interface RecentSearchParams {
  segment?: string;
  state?: string;
  region?: string;
  city?: string;
  companyType?: string;
  employeeCount?: string;
  annualRevenue?: string;
  decisionMakerRole?: string;
  tone?: 'consultivo' | 'direto' | 'storytelling' | 'provocador';
}

export interface RecentSearch {
  id: string;
  query: string;
  limit: number;
  timestamp: string;
  leadsCount?: number;
  params?: RecentSearchParams;
}

export interface SelectOptionItem {
  id: string;
  label: string;
  description?: string;
  badge?: string;
  queryFragment: string;
}

export interface SearchSchemaConfig {
  segments: SelectOptionItem[];
  regions: {
    stateUf: string;
    stateName: string;
    polos: SelectOptionItem[];
  }[];
  companyTypes: SelectOptionItem[];
  employeeCounts: SelectOptionItem[];
  annualRevenues: SelectOptionItem[];
  decisionMakerRoles: SelectOptionItem[];
  tones: {
    id: 'consultivo' | 'direto' | 'storytelling' | 'provocador';
    label: string;
    description: string;
  }[];
}

export interface IntegrationsConfig {
  apolloApiKey: string;
  googlePlacesApiKey: string;
  groqApiKey: string;
  hunterApiKey: string;
  blandAiApiKey: string;
  bitrixTotalTracWebhook: string;
  bitrixAtlasGrWebhook: string;
  // 'auto' (padrão recomendado) escolhe o webhook pela marca do usuário logado;
  // as demais opções seguem disponíveis como substituição manual explícita.
  activeBitrixTarget: 'auto' | 'totaltrac' | 'atlasgr' | 'custom';
  customBitrixWebhook: string;
}

export interface SearchFilters {
  segment: string;
  customSegment?: string;
  state: string;
  region: string;
  customLocation?: string;
  fleetSize: string;
  decisionMakerRole: string;
  focusChannel: string;
  tone: 'consultivo' | 'direto' | 'storytelling' | 'provocador';
  qualificationFilter: string;
}

export interface HunterVerificationResult {
  email: string;
  status: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown';
  score: number;
  domain: string;
  sources_count?: number;
  message?: string;
}

export interface BlandCallResult {
  status: 'success' | 'queued' | 'error';
  call_id?: string;
  message?: string;
  phone_number?: string;
}

// Wave 6 (CPI) - Evidence & Provenance: espelha `StoredEvidence`/`VerificationStatus`
// de server/evidence.ts - de onde cada campo relevante do lead veio, quando foi
// obtido e com que confiança/status de verificação. Consumido pela UI via
// GET /api/leads/:id/evidence ("por que este resultado apareceu / por que confiar
// neste campo?").
export type VerificationStatus = 'verified' | 'unverified' | 'inferred' | 'unknown' | 'conflicted';

export interface FieldEvidence {
  id: number;
  field: string;
  value: unknown;
  provider: string;
  sourceReference?: string;
  retrievedAt: string;
  expiresAt?: string;
  confidence: number;
  verificationStatus: VerificationStatus;
}

// Wave 7 (CPI) - Progressive Search: espelha os tipos de server/progressiveSearch.ts.
// Funil explícito por etapa + motivo de parada - nunca "os primeiros N como se
// fossem os melhores N" (ver rankingApplied/rankingNote abaixo).
export type SearchFunnelStage =
  | 'discovery'
  | 'company_validation'
  | 'enrichment'
  | 'decision_makers'
  | 'final';

export type StopReason =
  | 'target_reached'
  | 'provider_exhausted'
  | 'all_duplicates'
  | 'no_provider_configured';

export interface FunnelDroppedReason {
  reason: string;
  count: number;
}

export interface FunnelStageCount {
  stage: SearchFunnelStage;
  candidatesIn: number;
  candidatesOut: number;
  droppedReasons: FunnelDroppedReason[];
  note?: string;
}

export interface SearchFunnelSummary {
  stages: FunnelStageCount[];
  targetCount: number;
  finalCount: number;
  stopReason: StopReason;
}

// Wave 7 + Wave 10 (CPI): campos adicionais (fora de `leads[]`) que
// POST /api/prospect devolve na mesma resposta - a UI precisa deles para não
// esconder "por que a busca parou" e "esta lista não está ranqueada por
// adequação ainda" atrás de uma lista simples de leads.
export interface ProspectRunMeta {
  searchId?: string;
  funnelSummary?: SearchFunnelSummary;
  stopReason?: StopReason;
  rankingApplied?: boolean;
  rankingNote?: string;
}

export interface BitrixExportResult {
  success: boolean;
  leadId?: string | number;
  dealId?: string | number;
  contactId?: string | number;
  target?: string;
  message?: string;
  error?: string;
}
