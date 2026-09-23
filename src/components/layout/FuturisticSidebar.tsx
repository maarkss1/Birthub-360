import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasRequiredRole, MESA_TRATAMENTO_ROLES } from '../../lib/auth/authorization';
import { BirthHubLogo } from '../brand/BirthHubLogo';
import { SoundFX } from '../../lib/soundEffects';
import { TAB_META, type TabType } from './tabMeta';

const SIDEBAR_COLLAPSED_KEY = '@birthhub:futuristic-sidebar-collapsed';

interface FuturisticSidebarProps {
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

export function FuturisticSidebar({
  activeTab,
  mobileOpen = false,
  onCloseMobile,
  collapsed: externalCollapsed,
  onToggleCollapse,
}: FuturisticSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
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
  const isRestrictedSdrProfile = currentUser?.role === 'SDR';

  const selectTab = (tab: TabType) => {
    if (tab !== activeTab) SoundFX.play('navigate');
    navigate(`/app/${tab}`);
    onCloseMobile?.();
  };

  const administrationItems: TabType[] = [
    'notifications',
    'bitrix',
    ...(canManageOperations ? (['integrations', 'automations'] as TabType[]) : []),
    ...(isAdmin ? (['usage', 'team', 'module-access'] as TabType[]) : []),
    'settings',
  ];

  const navGroupsByJourney: NavGroupDefinition[] = isRestrictedSdrProfile
    ? [
        { title: 'COMMAND CENTER', items: ['daily-plan'] },
        { title: 'BUSINESS', items: ['prospect'] },
        {
          title: 'EXECUTION',
          items: [
            'companies',
            'contacts',
            ...(canAccessMesaTratamento ? (['mesa-tratamento'] as TabType[]) : []),
            'activities',
            'calendar',
            'cadence',
          ],
        },
        {
          title: 'CAPACITATION',
          items: ['roleplay', 'objections_matrix', 'chatbook', 'topic_training'],
        },
        { title: 'ADMINISTRATION', items: ['notifications', 'bitrix', 'settings'] },
      ]
    : [
        {
          title: 'COMMAND CENTER',
          items: ['dashboard', 'workspace', 'daily-plan'],
        },
        {
          title: 'INTELLIGENCE',
          items: [
            ...(canAccessCommercialIntelligence ? (['commercial_intelligence'] as TabType[]) : []),
            ...(canAccessCopilotoIa ? (['copiloto_ia'] as TabType[]) : []),
            'intelligence',
            'market-intelligence',
            'analytics',
            'winloss',
            'reports',
          ],
        },
        {
          title: 'BUSINESS',
          items: [
            'prospect',
            'crm',
            'crm360',
            'propostas',
            'companies',
            'contacts',
            ...(canAccessMesaTratamento ? (['mesa-tratamento'] as TabType[]) : []),
          ],
        },
        {
          title: 'EXECUTION',
          items: ['activities', 'calendar', 'cadence'],
        },
        {
          title: 'CAPACITATION',
          items: [
            'roleplay',
            'qualification_matrix',
            'objections_matrix',
            'topic_training',
            'chatbook',
            'knowledge',
            'editor',
          ],
        },
        { title: 'ADMINISTRATION', items: administrationItems },
      ];

  const GROUP_ORDER_BY_ROLE: Partial<Record<string, string[]>> = {
    CLOSER: [
      'COMMAND CENTER',
      'EXECUTION',
      'BUSINESS',
      'INTELLIGENCE',
      'CAPACITATION',
      'ADMINISTRATION',
    ],
    GESTOR: [
      'COMMAND CENTER',
      'INTELLIGENCE',
      'BUSINESS',
      'EXECUTION',
      'CAPACITATION',
      'ADMINISTRATION',
    ],
    ADMIN: [
      'COMMAND CENTER',
      'INTELLIGENCE',
      'BUSINESS',
      'EXECUTION',
      'CAPACITATION',
      'ADMINISTRATION',
    ],
    VISUALIZADOR: [
      'COMMAND CENTER',
      'INTELLIGENCE',
      'BUSINESS',
      'EXECUTION',
      'CAPACITATION',
      'ADMINISTRATION',
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
        className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated cursor-pointer hover:scale-[1.02] active:scale-95 ${
          isActive
            ? 'bg-gradient-to-r from-brand/20 via-brand/10 to-transparent text-brand shadow-lg shadow-brand/20 ring-1 ring-brand/30 border-l-2 border-brand'
            : 'text-ink-2 hover:bg-surface-interactive/60 hover:text-ink hover:shadow-sm hover:border-l-2 hover:border-brand/30'
        } ${isCollapsed ? 'lg:px-0 lg:justify-center' : ''}`}
      >
        <Icon
          size={16}
          aria-hidden="true"
          className={`shrink-0 transition-all duration-300 ${isActive ? 'scale-110 text-brand' : 'group-hover:scale-110 group-hover:text-brand/60'}`}
        />
        <span
          className={`truncate ${isCollapsed ? 'lg:hidden' : ''} ${isActive ? 'font-semibold tracking-tight' : ''}`}
        >
          {meta.label}
        </span>
        {isActive && (
          <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_8px_var(--color-brand)] animate-pulse" />
        )}
      </button>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col bg-surface-elevated/60 backdrop-blur-2xl border-r border-line/50 shadow-[4px_0_24px_rgba(0,0,0,0.04)] transition-[width,transform] duration-300 lg:static lg:translate-x-0 ${
        isCollapsed ? 'lg:w-[5rem]' : 'lg:w-[16rem]'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      aria-label="Navegação principal - Futuristic Command Center"
    >
      {/* Linha de luz superior */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

      <div className="flex flex-col shrink-0">
        <div
          className={`flex items-center justify-between border-b border-line/50 px-5 py-4 ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
        >
          {isCollapsed ? (
            <BirthHubLogo
              variant="symbol"
              className="h-8 w-8 text-brand shadow-[0_0_12px_rgba(212,175,55,0.3)]"
            />
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <BirthHubLogo
                  variant="symbol"
                  className="h-8 w-8 text-brand shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                />
                <div className="leading-tight">
                  <h1 className="flex items-center gap-1 text-sm font-bold tracking-tight text-ink">
                    Birth Hub 360°
                  </h1>
                  <span className="text-[10px] font-medium tracking-wide text-ink-2">
                    Futuristic Command Center
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleCollapse}
                className="hidden rounded-md p-1.5 text-ink-2 transition-all duration-200 hover:bg-surface-interactive hover:text-ink hover:scale-110 lg:block"
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
              className="rounded-md p-1.5 text-ink-2 transition-all duration-200 hover:bg-surface-interactive hover:text-ink hover:scale-110"
              title="Expandir menu lateral"
            >
              <PanelLeftOpen size={16} />
            </button>
          </div>
        )}
      </div>

      <nav
        aria-label="Navegação principal"
        className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-2.5 py-3"
      >
        {navGroups.map((group) => (
          <section key={group.title} className="space-y-1" aria-label={group.title}>
            <div className={`mb-2 flex items-center px-3 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-2/80">
                {group.title}
              </p>
            </div>
            {isCollapsed && (
              <div
                className="hidden lg:block my-2 mx-auto w-4 h-px bg-line/50"
                aria-hidden="true"
              />
            )}
            {group.items.map(renderNavItem)}
          </section>
        ))}
      </nav>

      <div className="p-4 pt-2">
        {currentUser && (
          <div
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-subtle/60 to-surface-elevated/40 backdrop-blur-md px-3 py-3 transition-all duration-300 ${
              isCollapsed ? 'lg:px-1.5 lg:py-2 lg:flex lg:justify-center' : ''
            }`}
            title={
              isCollapsed
                ? `${currentUser.name} (${currentUser.roleTitle || currentUser.role})`
                : undefined
            }
          >
            <div className="flex min-w-0 items-center gap-3 relative z-10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand/80 to-brand-2/90 text-sm font-bold text-on-brand shadow-lg shadow-brand/20 ring-2 ring-surface transition-transform duration-300 hover:scale-110">
                {currentUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className={`min-w-0 flex-1 ${isCollapsed ? 'lg:hidden' : ''}`}>
                <p className="truncate text-[13px] font-bold leading-tight text-ink transition-colors">
                  {currentUser.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-medium leading-tight text-ink-2">
                  {currentUser.roleTitle || currentUser.role}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-bold text-critical transition-all duration-200 hover:scale-[1.02] hover:border-critical/15 hover:bg-critical/10 hover:shadow-sm hover:shadow-critical/10 active:scale-95 ${
            isCollapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
          title="Encerrar sessão e sair da conta"
          aria-label="Encerrar sessão e sair da conta"
        >
          <LogOut
            size={20}
            className="shrink-0 opacity-80 transition-transform group-hover:-translate-x-1"
          />
          <span className={isCollapsed ? 'lg:hidden' : ''}>Sair da Conta</span>
        </button>
      </div>

      {/* Linha de luz inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-iris/30 to-transparent" />
    </aside>
  );
}
