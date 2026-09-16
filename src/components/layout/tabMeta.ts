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
 * `social-selling`, `treinamento-atlasgr`, `proposta-comercial` e `hub-inteligencia-marketing`
 * existiram aqui como TabType/rotas `/app/:tab` até este piloto de acesso — foram REMOVIDOS
 * porque essas telas não vivem mais dentro do CRM (pedido explícito do usuário: "não quero que
 * apareça no CRM, só nos círculos" do Hub Executivo standalone). Suas rotas reais agora são
 * top-level em App.tsx (fora de `/app/*`, sem MainLayout/Sidebar), guardadas por
 * `RequireModuleAccess` em vez de `RequireUserAllowed` — ver ModuleAccessGrant em
 * prisma/schema.prisma e src/features/module-access/.
 *
 * Atualização (09/2026, pedido explícito do usuário: "Atlas GR não é ninguém, não é nem mais pra
 * existir"): de `treinamento-atlasgr`, `proposta-comercial` e `hub-inteligencia-marketing` acima,
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
  | 'sdr-diagnostic-joao'
  | 'commercial_intelligence'
  | 'copiloto_ia'
  | 'module-access';

/** Metadados (rótulo + ícone) de cada módulo navegável — fonte única usada pelo topbar e pelo Command Palette. */
export const TAB_META: Record<TabType, { label: string; icon: typeof Home }> = {
  dashboard: { label: '📊 Visão Geral', icon: Home },
  workspace: { label: '💼 Meu Espaço', icon: Briefcase },
  'daily-plan': { label: '📋 Rotina do Dia', icon: CalendarCheck },
  commercial_intelligence: { label: '📈 Insights Comerciais', icon: LineChart },
  copiloto_ia: { label: '🎙️ Assistente Copiloto', icon: Mic },
  'sdr-diagnostic-joao': { label: '🩺 Diagnóstico SDR', icon: Stethoscope },
  prospect: { label: '🔍 Motor de Busca', icon: Search },
  crm: { label: '📊 Funil de Vendas', icon: LayoutTemplate },
  crm360: { label: '🎛️ Cockpit de Oportunidades', icon: Gauge },
  'mesa-tratamento': { label: '🎧 Triagem & Higienização', icon: Headset },
  propostas: { label: '📝 Gerador de Propostas', icon: FileSignature },
  contacts: { label: '👥 Contatos & Decisores', icon: Users },
  companies: { label: '🏢 Contas & Empresas', icon: Building2 },
  activities: { label: '⚡ Tarefas & Atividades', icon: Activity },
  cadence: { label: '🔄 Fluxos de Cadência', icon: Repeat },
  roleplay: { label: '📞 Simulador de Vendas', icon: PhoneCall },
  qualification_matrix: { label: '🎯 Critérios de ICP', icon: Target },
  objections_matrix: { label: '🛡️ Guia de Objeções', icon: Shield },
  intelligence: { label: '⚡ Estúdio de Modelos', icon: Zap },
  'market-intelligence': { label: '🤖 Inteligência de Mercado', icon: Bot },
  topic_training: { label: '🎓 Academia de Treinamento', icon: BookOpen },
  bitrix: { label: '📖 Guia de Integração CRM', icon: Layers },
  reports: { label: '📑 Diagnósticos de IA', icon: FileBarChart },
  chatbook: { label: '💬 Base de Prompts', icon: MessageSquare },
  integrations: { label: '🔌 Conexões & APIs', icon: Globe },
  knowledge: { label: '📚 Repositório de Saber', icon: Database },
  analytics: { label: '📉 Métricas & KPIs', icon: BarChart3 },
  winloss: { label: '🎯 Análise Ganho / Perda', icon: Target },
  calendar: { label: '📅 Agenda Comercial', icon: CalendarDays },
  notifications: { label: '🔔 Notificações', icon: Bell },
  automations: { label: '⚙️ Regras & Automações', icon: Cpu },
  usage: { label: '💳 Custos & Créditos de IA', icon: Wallet },
  editor: { label: '📄 Central de Documentos', icon: FileText },
  team: { label: '👥 Usuários & Permissões', icon: UserCog },
  'module-access': { label: '🛡️ Acesso a Módulos', icon: ShieldCheck },
  settings: { label: '🛠️ Preferências Gerais', icon: SettingsIcon },
};
