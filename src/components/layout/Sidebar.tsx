import { ChevronRight, LayoutGrid, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrand } from '../../contexts/BrandContext';
import { useAuth } from '../../contexts/AuthContext';
import { hasRequiredRole, MESA_TRATAMENTO_ROLES } from '../../lib/auth/authorization';
import { SoundFX } from '../../lib/soundEffects';
import { Logo } from '../Logo';
import { TotalTrackLogo } from '../TotalTrackLogo';
import { TAB_META, type TabType } from './tabMeta';

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
    return window.localStorage.getItem('@atlasgr:sidebar-collapsed') === 'true';
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
          window.localStorage.setItem('@atlasgr:sidebar-collapsed', String(next));
        }
        return next;
      });
    }
  };
  const { activeBrand, setActiveBrand } = useBrand();
  const { currentUser, isAdmin, canAccessCommercialIntelligence, canAccessCopilotoIa, logout } =
    useAuth();
  const isAtlas = activeBrand === 'atlasgr';
  const navigate = useNavigate();
  const canManageOperations =
    !!currentUser && hasRequiredRole(currentUser.role, ['ADMIN', 'GESTOR']);
  const canAccessMesaTratamento =
    !!currentUser && hasRequiredRole(currentUser.role, MESA_TRATAMENTO_ROLES);

  const isJoaoReisOrAdmin =
    !!currentUser &&
    (currentUser.email?.toLowerCase().includes('joao.reis') ||
      currentUser.name?.toLowerCase().includes('joão reis') ||
      canManageOperations);

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
  // Os módulos executivos (Social Selling, Treinamento AtlasGR, Proposta Comercial, Hub
  // Inteligência & Mkt) NÃO aparecem mais aqui — pedido explícito do usuário: "não quero que
  // apareça no CRM, só nos círculos" do Hub Executivo standalone (rotas top-level em App.tsx,
  // fora de /app/*). Quem administra quem vê cada módulo é 'module-access' acima, não a Sidebar.
  const navGroupsByJourney: NavGroupDefinition[] = [
    {
      title: 'Visão Geral',
      items: ['dashboard', ...(isJoaoReisOrAdmin ? (['sdr-diagnostic-joao'] as TabType[]) : [])],
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
        className={`group relative w-full overflow-hidden rounded-xl border px-2 py-1.5 text-left text-xs font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${
          isActive
            ? 'border-brand/20 bg-brand-active text-white shadow-[0_10px_20px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.16)]'
            : 'border-transparent text-ink-2 hover:border-line hover:bg-surface-2 hover:text-ink'
        } ${isCollapsed ? 'md:px-0 md:justify-center' : ''}`}
      >
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.6)]"
          />
        )}
        <span
          className={`relative z-10 flex items-center ${isCollapsed ? 'md:justify-center' : 'gap-2'}`}
        >
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-[transform,background-color,border-color] duration-200 group-hover:scale-105 ${
              isActive
                ? 'border-white/15 bg-white/10'
                : 'border-line/80 bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
            }`}
          >
            <Icon size={15} aria-hidden="true" />
          </span>
          <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>{meta.label}</span>
        </span>
      </button>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-full w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-line bg-surface/96 shadow-[18px_0_48px_-36px_rgba(0,0,0,0.9),inset_-1px_0_0_rgba(255,255,255,0.025)] backdrop-blur-xl transition-[width,transform] duration-200 md:static md:translate-x-0 ${
        isCollapsed ? 'md:w-16' : 'md:w-[248px]'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      aria-label="Navegação principal por jornada comercial"
    >
      <div className="relative border-b border-line p-3">
        <div
          className="pointer-events-none absolute -left-14 -top-20 h-40 w-40 rounded-full bg-brand/8 blur-[60px]"
          aria-hidden="true"
        />
        <div className="relative z-10 mb-2 flex items-center justify-between gap-2">
          {isCollapsed ? (
            <div className="mx-auto">
              {isAtlas ? (
                <Logo variant="symbol" className="h-7" />
              ) : (
                <TotalTrackLogo variant="symbol" className="h-7" />
              )}
            </div>
          ) : (
            <>
              {isAtlas ? (
                <Logo className="h-7 text-ink" />
              ) : (
                <TotalTrackLogo className="h-7 text-ink" />
              )}
              <button
                type="button"
                onClick={toggleCollapse}
                className="hidden md:grid h-6 w-6 place-items-center rounded-lg border border-line text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
                title="Recolher menu lateral"
                aria-label="Recolher menu lateral"
              >
                <PanelLeftClose size={13} />
              </button>
            </>
          )}
        </div>

        {isCollapsed && (
          <div className="hidden md:flex justify-center mb-2">
            <button
              type="button"
              onClick={toggleCollapse}
              className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
              title="Expandir menu lateral"
              aria-label="Expandir menu lateral"
            >
              <PanelLeftOpen size={15} />
            </button>
          </div>
        )}

        <button
          type="button"
          className="group relative w-full cursor-pointer text-left"
          onClick={() => {
            SoundFX.play('confirm');
            setActiveBrand(isAtlas ? 'totaltrac' : 'atlasgr');
          }}
          aria-label={`Alternar para a operação ${isAtlas ? 'Total Trac' : 'AtlasGR'}`}
          title={`Alternar para ${isAtlas ? 'Total Trac' : 'AtlasGR'}`}
        >
          <div
            className={`flex items-center justify-between rounded-[var(--radius-nav-item)] border border-line bg-surface-2/80 p-2 shadow-[0_10px_24px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.05)] transition-[transform,border-color,background-color,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:border-brand/25 group-hover:bg-brand/8 group-hover:shadow-card ${
              isCollapsed ? 'md:justify-center md:p-1.5' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              {isAtlas ? (
                <Logo variant="symbol" className="h-6 w-6 shrink-0" />
              ) : (
                <TotalTrackLogo variant="symbol" className="h-6 w-6 shrink-0" />
              )}
              <div className={`flex flex-col ${isCollapsed ? 'md:hidden' : ''}`}>
                <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-brand-active dark:text-brand-2">
                  Operação Atual
                </span>
                <span className="text-xs font-black text-ink">
                  {isAtlas ? 'AtlasGR' : 'Total Trac'}
                </span>
              </div>
            </div>
            <div
              className={`grid h-6 w-6 place-items-center rounded-lg border border-line bg-surface text-ink-2 shadow-sm ${
                isCollapsed ? 'md:hidden' : ''
              }`}
            >
              <ChevronRight
                size={12}
                className="transition-transform duration-200 group-hover:rotate-90"
                aria-hidden="true"
              />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            SoundFX.play('navigate');
            navigate('/hub');
            onCloseMobile?.();
          }}
          className={`group relative mt-2 flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius-nav-item)] border border-line bg-surface-2/60 px-3 py-2 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:bg-brand/8 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            isCollapsed ? 'md:justify-center md:px-1.5' : ''
          }`}
          title="Ir para o Hub Executivo"
          aria-label="Ir para o Hub Executivo"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink-2 transition-colors duration-200 group-hover:border-brand/30 group-hover:text-brand">
            <LayoutGrid size={13} aria-hidden="true" />
          </span>
          <span
            className={`text-xs font-bold text-ink-2 group-hover:text-ink ${isCollapsed ? 'md:hidden' : ''}`}
          >
            Hub Executivo
          </span>
        </button>
      </div>

      <nav
        aria-label="Navegação principal"
        className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-2.5 py-3"
      >
        {navGroups.map((group) => (
          <section key={group.title} className="space-y-1" aria-label={group.title}>
            <div className={`mb-2 flex items-center gap-2 px-3 ${isCollapsed ? 'md:hidden' : ''}`}>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-ink-2">
                {group.title}
              </p>
              <span
                className="h-px flex-1 bg-gradient-to-r from-line to-transparent"
                aria-hidden="true"
              />
            </div>
            {isCollapsed && (
              <div className="hidden md:block my-2 mx-auto w-6 h-px bg-line" aria-hidden="true" />
            )}
            {group.items.map(renderNavItem)}
          </section>
        ))}
      </nav>

      <div className="space-y-2 border-t border-line p-3">
        {currentUser && (
          <div
            className={`rounded-xl border border-line bg-surface-2/70 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
              isCollapsed ? 'md:px-1.5 md:py-2 md:flex md:justify-center' : ''
            }`}
            title={
              isCollapsed
                ? `${currentUser.name} (${currentUser.roleTitle || currentUser.role})`
                : undefined
            }
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xs font-bold text-white shadow-card ring-1 ring-white/10">
                {currentUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className={`min-w-0 flex-1 ${isCollapsed ? 'md:hidden' : ''}`}>
                <p className="truncate text-xs font-bold leading-tight text-ink">
                  {currentUser.name}
                </p>
                <p className="truncate text-[10px] font-medium leading-tight text-ink-2">
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
            isCollapsed ? 'md:justify-center md:px-0' : ''
          }`}
          title="Encerrar sessão e sair da conta"
          aria-label="Encerrar sessão e sair da conta"
        >
          <LogOut size={20} className="shrink-0 opacity-80" />
          <span className={isCollapsed ? 'md:hidden' : ''}>Sair da Conta</span>
        </button>
      </div>
    </aside>
  );
}
