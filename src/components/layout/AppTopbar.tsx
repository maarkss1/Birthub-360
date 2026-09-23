import { ArrowLeft, Bell, LogOut, Menu, Moon, Search, Sun, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { notificationsApi } from '../../features/notifications/notifications.api';
import { useLiveClock } from '../../hooks/useLiveClock';
import { OPEN_COMMAND_PALETTE_EVENT } from '../../lib/paletteIntent';
import { SoundFX } from '../../lib/soundEffects';
import { TAB_META, type TabType } from './tabMeta';

interface AppTopbarProps {
  activeTab: TabType;
  /** Abre a Sidebar off-canvas em telas < md. */
  onOpenMobileNav?: () => void;
}

export function AppTopbar({ activeTab, onOpenMobileNav }: AppTopbarProps) {
  const now = useLiveClock();
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  // Home real do CRM — não faz sentido oferecer "Voltar" aqui. Qualquer outro módulo mostra o
  // botão: cobre as ~46 rotas de /app/* com uma única fonte (nenhuma tela precisa reimplementar
  // seu próprio botão de voltar, ver duplicação ad-hoc em CompanyDetail/ProspectingToolsHub/etc.).
  const isHome = location.pathname === '/app' || location.pathname === '/app/dashboard';
  const handleBack = () => {
    SoundFX.play('navigate');
    // `location.key === 'default'` = primeira entrada desta sessão do router (deep link direto,
    // sem histórico interno para voltar) — nesse caso `navigate(-1)` sairia do app para o que
    // veio antes no histórico do navegador. Cai pro dashboard, que é sempre um "voltar" seguro.
    if (location.key !== 'default') navigate(-1);
    else navigate('/app');
  };
  const meta = TAB_META[activeTab] ?? TAB_META.dashboard;
  const Icon = meta.icon;
  const [soundEnabled, setSoundEnabled] = useState(() => SoundFX.isEnabled());

  // Contagem real de não lidas — GET /api/notifications?unread=1 (mesmo endpoint usado pela
  // tela de Notificações). Sem isso o sino era cenográfico: nenhum clique navegava e o ponto
  // vermelho aparecia sempre, mesmo com a caixa zerada. Recarrega ao montar e ao focar a aba
  // (sem polling contínuo — este produto evita loop/timer sem necessidade comprovada, ver
  // CLAUDE.md seção 8/11) para refletir notificações lidas/criadas em outra aba ou sessão.
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const { unread } = await notificationsApi.list(true);
        if (!cancelled) setUnreadCount(unread);
      } catch {
        // Falha ao consultar não derruba o topbar — o sino continua navegando de verdade,
        // só fica sem o indicador até a próxima tentativa bem-sucedida.
        if (!cancelled) setUnreadCount(0);
      }
    };
    void loadUnread();
    window.addEventListener('focus', loadUnread);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', loadUnread);
    };
  }, []);

  const dateLabel = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
  const timeLabel = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const userInitial = currentUser?.name?.charAt(0).toUpperCase() || 'U';

  const toggleSound = () => {
    const next = !soundEnabled;
    SoundFX.setEnabled(next);
    setSoundEnabled(next);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2.5 border-b border-line bg-surface-elevated/96 px-3 shadow-xs backdrop-blur-xl sm:px-5">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-surface-interactive hover:text-ink lg:hidden"
        aria-label="Abrir menu de navegação"
      >
        <Menu className="h-4 w-4" />
      </button>

      {!isHome && (
        <button
          type="button"
          onClick={handleBack}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-surface-interactive hover:text-ink"
          aria-label="Voltar"
          title="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}

      <div className="flex min-w-0 items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-control border border-brand/15 bg-brand/8">
          <Icon className="h-4 w-4 shrink-0 text-brand-ink dark:text-brand" />
        </div>
        <h1 className="truncate font-display text-sm font-semibold text-ink">{meta.label}</h1>
      </div>

      <button
        type="button"
        onClick={() => {
          SoundFX.play('focus');
          window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));
        }}
        className="group ml-3 hidden max-w-md flex-1 items-center gap-2 rounded-control border border-line bg-surface-subtle/50 px-3 py-2 text-ink-2 transition-all hover:border-brand/40 hover:bg-surface-subtle hover:text-ink hover:shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] lg:flex"
      >
        <Search className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:text-brand" />
        <span className="text-xs">Buscar empresa, decisor ou comando…</span>
        <kbd className="ml-auto rounded-md border border-line bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-ink-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-colors group-hover:border-brand/30">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-[10px] font-medium uppercase tracking-wider text-ink-2">{dateLabel}</p>
          <p className="text-sm font-bold text-ink [font-variant-numeric:tabular-nums]">
            {timeLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            SoundFX.play('navigate');
            toggleTheme();
          }}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-transparent text-ink-2 transition-all duration-200 hover:scale-105 hover:border-line hover:bg-surface-2 hover:text-ink hover:shadow-sm active:scale-95"
          aria-label="Alternar tema"
          title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={toggleSound}
          className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-sm ${
            soundEnabled
              ? 'border-brand/15 bg-brand/8 text-brand-ink dark:text-brand hover:border-brand/30'
              : 'border-transparent text-ink-2 hover:border-line hover:bg-surface-2 hover:text-ink'
          }`}
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? 'Desativar sons da interface' : 'Ativar sons da interface'}
          title={soundEnabled ? 'Sons da interface ligados' : 'Sons da interface desligados'}
        >
          {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={() => {
            SoundFX.play('navigate');
            navigate('/app/notifications');
          }}
          className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-transparent text-ink-2 transition-all duration-200 hover:scale-105 hover:border-line hover:bg-surface-2 hover:text-brand hover:shadow-sm active:scale-95"
          aria-label={
            unreadCount > 0
              ? `Notificações — ${unreadCount} não lida${unreadCount === 1 ? '' : 's'}`
              : 'Notificações'
          }
        >
          <Bell className="h-5 w-5 transition-transform duration-300" />
          {unreadCount > 0 && (
            <span
              className="absolute right-[9px] top-[9px] h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_0_3px_var(--surface)] motion-safe:animate-pulse"
              aria-hidden="true"
            />
          )}
        </button>

        <div
          role="img"
          aria-label={`Avatar de ${currentUser?.name || 'Usuário'}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-sm font-bold text-on-brand shadow-sm ring-1 ring-white/10"
          title={`${currentUser?.name || 'Usuário'} (${currentUser?.roleTitle || currentUser?.role || ''})`}
        >
          {userInitial}
        </div>

        <button
          type="button"
          onClick={logout}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-transparent text-ink-2 transition-all duration-200 hover:scale-105 hover:border-critical/20 hover:bg-critical/10 hover:text-critical hover:shadow-sm active:scale-95"
          aria-label="Sair da conta"
          title="Sair da conta"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
