import { LayoutGrid, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasRequiredRole, MESA_TRATAMENTO_ROLES } from '../../lib/auth/authorization';
import { SoundFX } from '../../lib/soundEffects';
import { TAB_META, type TabType } from './tabMeta';

/** Preferência de menu recolhido. A chave anterior era prefixada com o nome da
 *  marca antiga; a leitura do valor legado existe só para não zerar a
 *  preferência de quem já usava o produto — pode sair numa limpeza futura. */
const SIDEBAR_COLLAPSED_KEY = '@birthhub:sidebar-collapsed';
const LEGACY_SIDEBAR_COLLAPSED_KEY = '@atlasgr:sidebar-collapsed';

interface SidebarProps {
  activeTab: TabType;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavGroupDefinition {
  title: string;
  items: TabType[];
}

export function Sidebar({
  activeTab,
  mobileOpen = false,
  onCloseMobile,
  collapsed: externalCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      (window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) ??
        window.localStorage.getItem(LEGACY_SIDEBAR_COLLAPSED_KEY)) === 'true'
    );
  });

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    SoundFX.play('focus');
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
        }
        return next;
      });
    }
  };
  const { currentUser, isAdmin, canAccessCommercialIntelligence, canAccessCopilotoIa, logout } =
    useAuth();
  const navigate = useNavigate();
  const canManageOperations =
    !!currentUser && hasRequiredRole(currentUser.role, ['ADMIN', 'GESTOR']);
  const canAccessMesaTratamento =
    !!currentUser && hasRequiredRole(currentUser.role, MESA_TRATAMENTO_ROLES);
  // Perfil SDR focado: pedido explícito do usuário — dentro da Central Comercial (CRM), o papel
  // SDR vê um menu enxuto centrado no Plano Diário e nas ferramentas de trabalho do dia
  // (prospecção, qualificação, cadência, treino), não os ~30 itens do menu completo. Aplica-se ao
  // papel como um todo (não a uma conta específica), então vale para qualquer futuro SDR contratado.
  const isRestrictedSdrProfile = currentUser?.role === 'SDR';

  const selectTab = (tab: TabType) => {
    if (tab !== activeTab) SoundFX.play('navigate');
    navigate(`/app/${tab}`);
    onCloseMobile?.();
  };

  const analyzeItems: TabType[] = [
    ...(canAccessCommercialIntelligence ? (['commercial_intelligence'] as TabType[]) : []),
    'analytics',
    'winloss',
    'reports',
  ];

  const administrationItems: TabType[] = [
    'notifications',
    'bitrix',
    ...(canManageOperations ? (['integrations', 'automations'] as TabType[]) : []),
    ...(isAdmin ? (['usage', 'team', 'module-access'] as TabType[]) : []),
    'settings',
  ];

  // Navegação orientada pela jornada comercial, não pela árvore técnica do projeto.
  // TAB_META é a fonte única de rótulo/ícone e TabType impede destinos fantasma.
  //
  // Os módulos executivos (Social Selling, Treinamento Comercial, Proposta Comercial, Hub
  // Inteligência & Mkt) NÃO aparecem mais aqui — pedido explícito do usuário: "não quero que
  // apareça no CRM, só nos círculos" do Hub Executivo standalone (rotas top-level em App.tsx,
  // fora de /app/*). Quem administra quem vê cada módulo é 'module-access' acima, não a Sidebar.
  //
  // Perfil SDR focado (role SDR, ver isRestrictedSdrProfile acima): Plano Diário em primeiro e só
  // as ferramentas que o SDR usa no dia a dia — sem dashboards/analytics/administração de
  // integrações. A primeira versão deixava um único item ("Plano Diário") e o SDR ficava sem
  // acesso pelo menu às próprias ferramentas de trabalho. ADMIN/GESTOR/CLOSER continuam vendo o
  // menu completo do CRM.
  const navGroupsByJourney: NavGroupDefinition[] = isRestrictedSdrProfile
    ? [
        { title: 'Visão Geral', items: ['daily-plan'] },
        { title: 'Captar', items: ['prospect'] },
        {
          title: 'Qualificar',
          items: [
            'companies',
            'contacts',
            ...(canAccessMesaTratamento ? (['mesa-tratamento'] as TabType[]) : []),
          ],
        },
        { title: 'Relacionar', items: ['activities', 'calendar', 'cadence'] },
        {
          title: 'IA & Capacitação',
          items: ['roleplay', 'objections_matrix', 'chatbook', 'topic_training'],
        },
        { title: 'Administração', items: ['notifications', 'bitrix', 'settings'] },
      ]
    : [
        {
          title: 'Visão Geral',
          items: ['dashboard', 'workspace', 'daily-plan'],
        },
        { title: 'Captar', items: ['prospect', 'market-intelligence'] },
        {
          title: 'Qualificar',
          items: [
            'companies',
            'contacts',
            ...(canAccessMesaTratamento ? (['mesa-tratamento'] as TabType[]) : []),
            'qualification_matrix',
          ],
        },
        { title: 'Relacionar', items: ['activities', 'calendar', 'cadence'] },
        { title: 'Fechar', items: ['crm', 'crm360', 'propostas'] },
        { title: 'Analisar', items: analyzeItems },
        {
          title: 'IA & Capacitação',
          items: [
            ...(canAccessCopilotoIa ? (['copiloto_ia'] as TabType[]) : []),
            'intelligence',
            'chatbook',
            'roleplay',
            'objections_matrix',
            'topic_training',
            'knowledge',
            'editor',
          ],
        },
        { title: 'Administração', items: administrationItems },
      ];

  const GROUP_ORDER_BY_ROLE: Partial<Record<string, string[]>> = {
    CLOSER: [
      'Visão Geral',
      'Relacionar',
      'Fechar',
      'Qualificar',
      'Captar',
      'Analisar',
      'IA & Capacitação',
      'Administração',
    ],
    GESTOR: [
      'Visão Geral',
      'Analisar',
      'Fechar',
      'Relacionar',
      'Qualificar',
      'Captar',
      'Administração',
      'IA & Capacitação',
    ],
    ADMIN: [
      'Visão Geral',
      'Analisar',
      'Fechar',
      'Relacionar',
      'Qualificar',
      'Captar',
      'Administração',
      'IA & Capacitação',
    ],
    VISUALIZADOR: [
      'Visão Geral',
      'Analisar',
      'Relacionar',
      'Fechar',
      'Qualificar',
      'Captar',
      'IA & Capacitação',
      'Administração',
    ],
  };

  const roleOrder = GROUP_ORDER_BY_ROLE[currentUser?.role ?? ''];
  const navGroups = roleOrder
    ? [...navGroupsByJourney].sort(
        (a, b) => roleOrder.indexOf(a.title) - roleOrder.indexOf(b.title),
      )
    : navGroupsByJourney;

  const renderNavItem = (tab: TabType) => {
    const meta = TAB_META[tab];
    if (!meta) return null;
    const Icon = meta.icon;
    const isActive = activeTab === tab;

    return (
      <button
        key={tab}
        type="button"
        onClick={() => selectTab(tab)}
        title={meta.label}
        aria-label={meta.label}
        aria-current={isActive ? 'page' : undefined}
        className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${
          isActive
            ? 'bg-gradient-to-r from-brand/10 to-transparent text-brand shadow-sm shadow-brand/5 ring-1 ring-brand/10'
            : 'text-ink-2 hover:bg-surface-interactive hover:text-ink'
        } ${isCollapsed ? 'lg:px-0 lg:justify-center' : ''}`}
      >
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-brand shadow-[0_0_12px_var(--color-brand)]"
          />
        )}
        <Icon size={16} aria-hidden="true" className={`shrink-0 transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110 group-hover:text-brand/70'}`} />
        <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''} ${isActive ? 'font-bold tracking-tight' : ''}`}>{meta.label}</span>
      </button>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col bg-white border-r border-slate-200 transition-[width,transform] duration-300 lg:static lg:translate-x-0 ${
        isCollapsed ? 'lg:w-[5rem]' : 'lg:w-[16rem]'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      aria-label="Navegação principal por jornada comercial"
    >
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className={`px-5 py-4 flex items-center justify-between border-b border-slate-100 ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}`}>
          {isCollapsed ? (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-midnight via-[#1E293B] to-sunset flex items-center justify-center shadow-sm">
              <span className="text-gold font-black text-base italic tracking-tighter">B</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-midnight via-[#1E293B] to-sunset flex items-center justify-center shadow-sm">
                  <span className="text-gold font-black text-base italic tracking-tighter">B</span>
                </div>
                <div className="leading-none">
                  <h1 className="text-sm font-bold text-midnight tracking-tight flex items-center gap-1">
                    Birth Hub 360°
                  </h1>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide">Comando Comercial Executivo</span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleCollapse}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-midnight transition-colors hidden lg:block"
                title="Recolher menu"
              >
                <PanelLeftClose size={16} />
              </button>
            </>
          )}
        </div>

        {isCollapsed && (
          <div className="mt-2 hidden justify-center lg:flex">
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-midnight transition-colors"
              title="Expandir menu lateral"
            >
              <PanelLeftOpen size={16} />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            SoundFX.play('navigate');
            navigate('/hub');
            onCloseMobile?.();
          }}
          className={`group relative mt-2 flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-nav-item)] bg-surface-subtle px-3 py-2.5 text-left transition-all duration-300 hover:bg-surface-2 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            isCollapsed ? 'lg:justify-center lg:px-1.5' : ''
          }`}
          title="Ir para o Hub Executivo"
          aria-label="Ir para o Hub Executivo"
        >
          <LayoutGrid size={16} aria-hidden="true" className="shrink-0 text-ink-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-ink" />
          <span
            className={`text-[13px] font-bold text-ink transition-colors duration-300 ${isCollapsed ? 'lg:hidden' : ''}`}
          >
            Painel Inicial
          </span>
        </button>
      </div>

      <nav
        aria-label="Navegação principal"
        className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-2.5 py-3"
      >
        {navGroups.map((group) => (
          <section key={group.title} className="space-y-1" aria-label={group.title}>
            <div className={`mb-1.5 flex items-center px-3 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-2/70">
                {group.title}
              </p>
            </div>
            {isCollapsed && (
              <div className="hidden lg:block my-2 mx-auto w-4 h-px bg-line/50" aria-hidden="true" />
            )}
            {group.items.map(renderNavItem)}
          </section>
        ))}
      </nav>

      <div className="p-4 pt-2">
        {currentUser && (
          <div
            className={`group relative overflow-hidden rounded-2xl bg-surface-subtle/50 px-3 py-3 transition-colors hover:bg-surface-subtle ${
              isCollapsed ? 'lg:px-1.5 lg:py-2 lg:flex lg:justify-center' : ''
            }`}
            title={
              isCollapsed
                ? `${currentUser.name} (${currentUser.roleTitle || currentUser.role})`
                : undefined
            }
          >
            <div className="flex min-w-0 items-center gap-3 relative z-10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand/80 to-brand-2/90 text-sm font-bold text-on-brand shadow-sm ring-2 ring-surface transition-transform duration-300 group-hover:scale-105">
                {currentUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className={`min-w-0 flex-1 ${isCollapsed ? 'lg:hidden' : ''}`}>
                <p className="truncate text-[13px] font-bold leading-tight text-ink transition-colors group-hover:text-brand">
                  {currentUser.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-medium leading-tight text-ink-2/70">
                  {currentUser.roleTitle || currentUser.role}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-bold text-critical transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:border-critical/15 hover:bg-critical/10 active:translate-y-0 ${
            isCollapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
          title="Encerrar sessão e sair da conta"
          aria-label="Encerrar sessão e sair da conta"
        >
          <LogOut size={20} className="shrink-0 opacity-80" />
          <span className={isCollapsed ? 'lg:hidden' : ''}>Sair da Conta</span>
        </button>
      </div>
    </aside>
  );
}
