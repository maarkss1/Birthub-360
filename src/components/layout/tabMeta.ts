import {
  Home,
  Search,
  LayoutTemplate,
  Users,
  Building2,
  Activity,
  BookOpen,
  Layers,
  FileBarChart,
  Zap,
  MessageSquare,
  Globe,
  Bell,
  BarChart3,
  CalendarDays,
  Cpu,
  Wallet,
  FileText,
  Database,
  PhoneCall,
  Target,
  Shield,
  UserCog,
  Settings as SettingsIcon,
  LineChart,
  Gauge,
  Repeat,
  FileSignature,
  Headset,
  ClipboardCheck,
  ShieldCheck,
  Mic,
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
 */
export type TabType =
  | 'dashboard'
  | 'companies'
  | 'contacts'
  | 'crm'
  | 'crm360'
  | 'mesa-tratamento'
  | 'activities'
  | 'cadence'
  | 'prospect'
  | 'intelligence'
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
  | 'sdr-diagnostic-joao'
  | 'commercial_intelligence'
  | 'copiloto_ia'
  | 'module-access';

/** Metadados (rótulo + ícone) de cada módulo navegável — fonte única usada pelo topbar e pelo Command Palette. */
export const TAB_META: Record<TabType, { label: string; icon: typeof Home }> = {
  dashboard: { label: 'Painel Central', icon: Home },
  commercial_intelligence: { label: 'Comercial Inteligente', icon: LineChart },
  copiloto_ia: { label: 'Copiloto IA', icon: Mic },
  'sdr-diagnostic-joao': { label: 'Diagnóstico & Plano SDR', icon: ClipboardCheck },
  prospect: { label: 'Prospecção', icon: Search },
  crm: { label: 'Pipeline CRM', icon: LayoutTemplate },
  crm360: { label: 'Cockpit CRM', icon: Gauge },
  'mesa-tratamento': { label: 'Mesa de Tratamento', icon: Headset },
  propostas: { label: 'Propostas', icon: FileSignature },
  contacts: { label: 'Decisores', icon: Users },
  companies: { label: 'Empresas', icon: Building2 },
  activities: { label: 'Agenda', icon: Activity },
  cadence: { label: 'Cadência', icon: Repeat },
  roleplay: { label: 'Roleplay', icon: PhoneCall },
  qualification_matrix: { label: 'Matriz de Qualificação', icon: Target },
  objections_matrix: { label: 'Matriz de Objeções', icon: Shield },
  intelligence: { label: 'Hub de IA', icon: Zap },
  topic_training: { label: 'Academy', icon: BookOpen },
  bitrix: { label: '🎓 Guia Prático Bitrix24', icon: Layers },
  reports: { label: 'Relatórios IA', icon: FileBarChart },
  chatbook: { label: 'Chatbook', icon: MessageSquare },
  integrations: { label: '⚙️ Integrações', icon: Globe },
  knowledge: { label: 'Base de Conhecimento', icon: Database },
  analytics: { label: 'Analytics', icon: BarChart3 },
  winloss: { label: 'Win/Loss', icon: Target },
  calendar: { label: 'Calendário', icon: CalendarDays },
  notifications: { label: 'Notificações', icon: Bell },
  automations: { label: 'Automações', icon: Cpu },
  usage: { label: 'Consumo de IA', icon: Wallet },
  editor: { label: 'Editor de Documentos', icon: FileText },
  team: { label: 'Equipe', icon: UserCog },
  'module-access': { label: 'Acesso a Módulos', icon: ShieldCheck },
  settings: { label: 'Configurações', icon: SettingsIcon },
};
