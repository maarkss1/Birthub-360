import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
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
  Radar,
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
  | 'module-access'
  | 'voice-hub'
  | 'outbound'
  | 'dialer';

/**
 * Matiz do ícone de cada módulo na navegação lateral — chave para uma das variáveis
 * `--nav-c-*` de `src/styles/globals.css` (todas derivadas dos tokens de marca, calibradas nos dois
 * temas). Um matiz por "tipo" de módulo, como o painel de navegação do Explorer do Windows.
 */
export type NavAccent = 'gold' | 'iris' | 'blue' | 'red' | 'green' | 'violet' | 'teal' | 'slate';

export const NAV_ACCENT_VAR: Record<NavAccent, string> = {
  gold: 'var(--nav-c-gold)',
  iris: 'var(--nav-c-iris)',
  blue: 'var(--nav-c-blue)',
  red: 'var(--nav-c-red)',
  green: 'var(--nav-c-green)',
  violet: 'var(--nav-c-violet)',
  teal: 'var(--nav-c-teal)',
  slate: 'var(--nav-c-slate)',
};

/** Metadados (rótulo + ícone + matiz) de cada módulo navegável — fonte única usada pela Sidebar, pelo
 * topbar e pelo Command Palette. Cada módulo tem um ícone SVG próprio (nenhum repetido).
 * Atualizado para paradigma Command Center: seções estratégicas agrupadas por função de comando. */
export const TAB_META: Record<TabType, { label: string; icon: typeof Home; accent: NavAccent }> = {
  // COMMAND CENTER - Visão estratégica geral
  dashboard: { label: 'Command Center', icon: Home, accent: 'gold' },
  workspace: { label: 'Meu Espaço', icon: Briefcase, accent: 'blue' },
  'daily-plan': { label: 'Plano Diário', icon: CalendarCheck, accent: 'green' },

  // INTELLIGENCE - Camada de inteligência e sinais
  commercial_intelligence: { label: 'Inteligência de Vendas', icon: LineChart, accent: 'violet' },
  copiloto_ia: { label: 'Copiloto IA', icon: Mic, accent: 'iris' },
  intelligence: { label: 'Assistente de Vendas', icon: Zap, accent: 'gold' },
  'market-intelligence': { label: 'Pesquisa de Mercado', icon: Radar, accent: 'teal' },
  analytics: { label: 'Analytics', icon: BarChart3, accent: 'blue' },
  winloss: { label: 'Win/Loss', icon: Target, accent: 'red' },
  reports: { label: 'Relatórios Avançados', icon: FileBarChart, accent: 'slate' },

  // BUSINESS - Operações comerciais
  prospect: { label: 'Prospecção', icon: Search, accent: 'teal' },
  crm: { label: 'Pipeline CRM', icon: LayoutTemplate, accent: 'blue' },
  crm360: { label: 'Gestão de Negócios', icon: Gauge, accent: 'violet' },
  propostas: { label: 'Propostas', icon: FileSignature, accent: 'gold' },
  companies: { label: 'Empresas', icon: Building2, accent: 'green' },
  contacts: { label: 'Decisores', icon: Users, accent: 'iris' },
  'mesa-tratamento': { label: 'Mesa de Tratamento', icon: Headset, accent: 'red' },

  // EXECUTION - Execução e automação
  activities: { label: 'Agenda', icon: Activity, accent: 'iris' },
  calendar: { label: 'Calendário', icon: CalendarDays, accent: 'blue' },
  cadence: { label: 'Cadência', icon: Repeat, accent: 'green' },
  automations: { label: 'Automações', icon: Cpu, accent: 'gold' },

  // CAPACITATION - Treinamento e capacitação
  roleplay: { label: 'Roleplay', icon: PhoneCall, accent: 'red' },
  qualification_matrix: { label: 'Matriz de Qualificação', icon: ClipboardCheck, accent: 'teal' },
  objections_matrix: { label: 'Matriz de Objeções', icon: Shield, accent: 'violet' },
  topic_training: { label: 'Academy', icon: BookOpen, accent: 'gold' },
  chatbook: { label: 'Chatbook', icon: MessageSquare, accent: 'blue' },
  knowledge: { label: 'Base de Conhecimento', icon: Database, accent: 'green' },
  editor: { label: 'Editor de Documentos', icon: FileText, accent: 'slate' },

    // TELEPHONY & OUTBOUND - Comunicação de Voz e Prospecção
  'voice-hub': { label: 'Voice Hub', icon: Mic, accent: 'iris' },
  outbound: { label: 'Outbound AI', icon: PhoneCall, accent: 'red' },
  dialer: { label: 'Discador 3CX', icon: PhoneCall, accent: 'teal' },

  // DATA - Integrações e dados
  integrations: { label: 'Integrações', icon: Globe, accent: 'blue' },
  bitrix: { label: 'Guia Prático Bitrix24', icon: Layers, accent: 'teal' },

  // ADMINISTRATION - Administração e configurações
  notifications: { label: 'Notificações', icon: Bell, accent: 'gold' },
  usage: { label: 'Consumo de IA', icon: Wallet, accent: 'violet' },
  team: { label: 'Equipe', icon: UserCog, accent: 'blue' },
  'module-access': { label: 'Acesso a Módulos', icon: ShieldCheck, accent: 'green' },
  settings: { label: 'Configurações', icon: SettingsIcon, accent: 'slate' },

  // DIAGNOSTICS - Ferramentas de diagnóstico
  'sdr-diagnostic': { label: 'Diagnóstico SDR', icon: Stethoscope, accent: 'green' },
};


