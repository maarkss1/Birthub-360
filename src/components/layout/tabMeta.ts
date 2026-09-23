import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarDays,
  Cpu,
  Database,
  FileBarChart,
  FileSignature,
  FileText,
  Gauge,
  Globe,
  Headset,
  Home,
  Layers,
  LayoutTemplate,
  LineChart,
  MessageSquare,
  Mic,
  PhoneCall,
  Repeat,
  Search,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Stethoscope,
  Target,
  UserCog,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

/**
 * Identificador de cada módulo navegável — fonte única usada pela Sidebar, Topbar e Command
 * Palette.
 *
 * Nota: `enrich` e `prompts` existiram aqui até a Onda 10 sem nenhuma `<Route>` correspondente em
 * `App.tsx`, nem entrada na Sidebar (`Sidebar.tsx`) nem no Command Palette (`MODULE_ORDER` em
 * `CommandPalette.tsx`) — eram destinos "fantasma", alcançáveis só via `navigationBus` (comando de
 * voz/deep link), que caíam silenciosamente no catch-all `/app`. Removidos por não corresponderem
 * a nenhuma tela real hoje: enriquecimento de empresa já vive dentro de `prospect`
 * (`ProspectingHub`), e não há uma tela "Commercial OS"/Prompt Studio real e navegável — só um
 * componente órfão (`PromptStudio.tsx`) sem rota. Ver
 * `.agents/handoffs/onda-8/09-para-02-navigationbus-rotas-ausentes.md`.
 *
 * `social-selling`, `treinamento-birthhub360`, `proposta-comercial` e `hub-inteligencia-marketing`
 * existiram aqui como TabType/rotas `/app/:tab` até este piloto de acesso — foram REMOVIDOS
 * porque essas telas não vivem mais dentro do CRM (pedido explícito do usuário: "não quero que
 * apareça no CRM, só nos círculos" do Hub Executivo standalone). Suas rotas reais agora são
 * top-level em App.tsx (fora de `/app/*`, sem MainLayout/Sidebar), guardadas por
 * `RequireModuleAccess` em vez de `RequireUserAllowed` — ver ModuleAccessGrant em
 * prisma/schema.prisma e src/features/module-access/.
 *
 * Atualização (09/2026, pedido explícito do usuário: "Birth Hub 360 não é ninguém, não é nem mais pra
 * existir"): de `treinamento-birthhub360`, `proposta-comercial` e `hub-inteligencia-marketing` acima,
 * só resta a menção histórica neste comentário — os módulos em si (catálogo, rotas top-level,
 * componentes, conteúdo estático) foram removidos por completo, não só do CRM. `social-selling`
 * continua existindo como rota top-level (ver App.tsx), rerotulado para a marca Birth Hub 360.
 */
export type TabType =
  | 'dashboard'
  | 'workspace'
  | 'companies'
  | 'contacts'
  | 'crm'
  | 'crm360'
  | 'mesa-tratamento'
  | 'activities'
  | 'cadence'
  | 'prospect'
  | 'intelligence'
  | 'market-intelligence'
  | 'propostas'
  | 'chatbook'
  | 'roleplay'
  | 'qualification_matrix'
  | 'objections_matrix'
  | 'topic_training'
  | 'bitrix'
  | 'reports'
  | 'integrations'
  | 'knowledge'
  | 'analytics'
  | 'winloss'
  | 'calendar'
  | 'notifications'
  | 'automations'
  | 'usage'
  | 'editor'
  | 'team'
  | 'settings'
  | 'daily-plan'
  | 'sdr-diagnostic'
  | 'commercial_intelligence'
  | 'copiloto_ia'
  | 'module-access';

/** Metadados (rótulo + ícone) de cada módulo navegável — fonte única usada pelo topbar e pelo Command Palette.
 * Atualizado para paradigma Command Center: seções estratégicas agrupadas por função de comando. */
export const TAB_META: Record<TabType, { label: string; icon: typeof Home }> = {
  // COMMAND CENTER - Visão estratégica geral
  dashboard: { label: 'Command Center', icon: Home },
  workspace: { label: 'Meu Espaço', icon: Briefcase },
  'daily-plan': { label: 'Plano Diário', icon: CalendarCheck },

  // INTELLIGENCE - Camada de inteligência e sinais
  commercial_intelligence: { label: 'Inteligência de Vendas', icon: LineChart },
  copiloto_ia: { label: 'Copiloto IA', icon: Mic },
  intelligence: { label: 'Assistente de Vendas', icon: Zap },
  'market-intelligence': { label: 'Pesquisa de Mercado', icon: Bot },
  analytics: { label: 'Analytics', icon: BarChart3 },
  winloss: { label: 'Win/Loss', icon: Target },
  reports: { label: 'Relatórios Avançados', icon: FileBarChart },

  // BUSINESS - Operações comerciais
  prospect: { label: 'Prospecção', icon: Search },
  crm: { label: 'Pipeline CRM', icon: LayoutTemplate },
  crm360: { label: 'Gestão de Negócios', icon: Gauge },
  propostas: { label: 'Propostas', icon: FileSignature },
  companies: { label: 'Empresas', icon: Building2 },
  contacts: { label: 'Decisores', icon: Users },
  'mesa-tratamento': { label: 'Mesa de Tratamento', icon: Headset },

  // EXECUTION - Execução e automação
  activities: { label: 'Agenda', icon: Activity },
  calendar: { label: 'Calendário', icon: CalendarDays },
  cadence: { label: 'Cadência', icon: Repeat },
  automations: { label: 'Automações', icon: Cpu },

  // CAPACITATION - Treinamento e capacitação
  roleplay: { label: 'Roleplay', icon: PhoneCall },
  qualification_matrix: { label: 'Matriz de Qualificação', icon: Target },
  objections_matrix: { label: 'Matriz de Objeções', icon: Shield },
  topic_training: { label: 'Academy', icon: BookOpen },
  chatbook: { label: 'Chatbook', icon: MessageSquare },
  knowledge: { label: 'Base de Conhecimento', icon: Database },
  editor: { label: 'Editor de Documentos', icon: FileText },

  // DATA - Integrações e dados
  integrations: { label: 'Integrações', icon: Globe },
  bitrix: { label: 'Guia Prático Bitrix24', icon: Layers },

  // ADMINISTRATION - Administração e configurações
  notifications: { label: 'Notificações', icon: Bell },
  usage: { label: 'Consumo de IA', icon: Wallet },
  team: { label: 'Equipe', icon: UserCog },
  'module-access': { label: 'Acesso a Módulos', icon: ShieldCheck },
  settings: { label: 'Configurações', icon: SettingsIcon },

  // DIAGNOSTICS - Ferramentas de diagnóstico
  'sdr-diagnostic': { label: 'Diagnóstico SDR', icon: Stethoscope },
};
