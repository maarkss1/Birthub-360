import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  Sun,
  Moon,
  LogOut,
  Loader2,
  Volume2,
  VolumeX,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useBrand } from '../../../contexts/BrandContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useModuleAccess } from '../../../hooks/useModuleAccess';
import { MODULE_CATALOG, EXTERNAL_LINKS } from '../../../config/module-catalog';
import { BirthHubLogo } from '../../../components/BirthHubLogo';
import { SoundFX } from '../../../lib/soundEffects';
import { HubBurstCanvas, type BurstHandle } from './HubBurstCanvas';
import { HubTaskWidget } from './HubTaskWidget';
import '../hub-orbit.css';

import { HubIcons } from './HubIcons';

interface OrbitItem {
  key: string;
  label: string;
  description: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  external?: boolean;
  primary?: boolean;
  ring: 'inner' | 'outer';
  colorRgb: string;
  onOpen: () => void;
}

function useIsDesktopOrbit(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 901px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(min-width: 901px)');
    const handleChange = () => setIsDesktop(query.matches);
    handleChange();
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);
  return isDesktop;
}

function greetingWord(hour: number): string {
  if (hour < 5) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return {
    time: now.toLocaleTimeString('pt-BR', { hour12: false }),
    dateLabel: now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' }),
    greeting: greetingWord(now.getHours()),
    monthLabel: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    year: now.getFullYear(),
    month: now.getMonth(),
    today: now.getDate(),
  };
}

const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// HubBurstCanvas desenha em <canvas>, que não entende var(--brand) — precisa do RGB já resolvido
// da marca ativa (BrandContext) para o burst de partículas não ficar laranja fixo com Total Trac.
function hexToRgbString(hex: string): string {
  const clean = hex.replace('#', '');
  const value = Number.parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `${r},${g},${b}`;
}

function buildCalendarCells(year: number, month: number, today: number, isCurrentMonth: boolean) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number; isToday: boolean } | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, isToday: isCurrentMonth && d === today });
  return cells;
}

export function HubScreen() {
  const navigate = useNavigate();
  const { currentUser, logout, canAccessCommercialIntelligence } = useAuth();
  const { brandInfo } = useBrand();
  const { theme, toggleTheme } = useTheme();
  const { grantedModules, isLoading } = useModuleAccess();
  const isDesktopOrbit = useIsDesktopOrbit();
  const clock = useLiveClock();
  const [soundOn, setSoundOn] = useState(() => SoundFX.isEnabled());
  const burstRef = useRef<BurstHandle>(null);

  const firstName = currentUser?.name?.trim().split(/\s+/)[0] ?? 'Usuário';
  const calendarCells = buildCalendarCells(clock.year, clock.month, clock.today, true);
  const brandRgb = useMemo(() => hexToRgbString(brandInfo.primaryColor), [brandInfo.primaryColor]);
  const brandAccentRgb = useMemo(
    () => hexToRgbString(brandInfo.accentColor),
    [brandInfo.accentColor],
  );

  // Quem decide quais módulos executivos cada pessoa vê é o painel 'module-access' (ADMIN), para
  // qualquer papel — inclusive SDR. O corte por papel que existia aqui escondia do SDR até os
  // módulos que o gestor tinha liberado explicitamente ("as ferramentas dele não aparecem").
  const grantedCatalog = useMemo(
    () => MODULE_CATALOG.filter((m) => grantedModules.includes(m.key)),
    [grantedModules],
  );

  const goTo = useCallback(
    (path: string) => {
      SoundFX.play('navigate');
      navigate(path);
    },
    [navigate],
  );

  const openExternal = useCallback((url: string) => {
    SoundFX.play('navigate');
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const items = useMemo<OrbitItem[]>(
    () => [
      {
        key: 'central',
        label: 'Central Comercial',
        description: 'CRM · Prospecção · IA',
        icon: HubIcons.central,
        primary: true,
        ring: 'inner',
        colorRgb: brandRgb,
        onOpen: () => goTo('/app'),
      },
      {
        key: 'sdr',
        label: 'Acompanhamento SDR',
        description: 'Mesa de Tratamento · Dashboard SDR',
        icon: HubIcons.sdr,
        ring: 'inner',
        colorRgb: brandAccentRgb,
        onOpen: () => goTo('/app/mesa-tratamento'),
      },
      {
        key: 'meeting-hub',
        label: 'Birth Meeting Hub',
        description: 'Cadência · Agendamento · Google Meet',
        icon: HubIcons['meeting-hub'],
        ring: 'inner',
        colorRgb: brandAccentRgb,
        onOpen: () => goTo('/app/cadence'),
      },
      // Mesmo gate de papel do backend (RequireRole em App.tsx, COMMERCIAL_INTELLIGENCE_ROLES em
      // authorization.ts) — quem não acessa a rota não vê o círculo, em vez de ver e levar um 403.
      ...(canAccessCommercialIntelligence
        ? [
            {
              key: 'revenue-intel',
              label: 'Revenue Intelligence',
              description: 'Comercial Inteligente · Métricas de receita',
              icon: HubIcons['revenue-intel'],
              ring: 'inner' as const,
              colorRgb: brandAccentRgb,
              onOpen: () => goTo('/app/commercial_intelligence'),
            },
          ]
        : []),
      ...grantedCatalog.map((mod) => ({
        key: mod.key,
        label: mod.label,
        description: mod.description,
        icon: HubIcons[mod.key] || HubIcons.central,
        ring: 'inner' as const,
        colorRgb: brandAccentRgb,
        onOpen: () => goTo(`/${mod.key}`),
      })),
      ...EXTERNAL_LINKS.map((link) => ({
        key: link.key,
        label: link.label,
        description: link.description,
        icon: HubIcons[link.iconKey] || HubIcons.central,
        external: true,
        ring: 'outer' as const,
        colorRgb: brandAccentRgb,
        onOpen: () => openExternal(link.url),
      })),
    ],
    [grantedCatalog, goTo, openExternal, canAccessCommercialIntelligence, brandRgb, brandAccentRgb],
  );

  const orbitContainerRef = useRef<HTMLDivElement>(null);

  // Cálculo matemático idêntico ao protótipo portalatlasprototype.html
  const [orbitLines, setOrbitLines] = useState<React.ReactNode>(null);

  // items.length é dependência real, não falso positivo do linter (ver biome-ignore abaixo): o
  // efeito lê os cards via DOM (querySelectorAll), não via `items` diretamente, então o linter
  // não enxerga que o layout precisa recalcular quando `grantedCatalog`/`items` muda (permissões
  // carregam de forma assíncrona após o mount, ou quando canAccessCommercialIntelligence resolve).
  // Removê-la deixaria os cards nas posições erradas até um resize.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentário acima
  useLayoutEffect(() => {
    const orbit = orbitContainerRef.current;
    if (!orbit || !isDesktopOrbit) return;

    function layout() {
      if (!orbit) return;

      const cards = Array.from(orbit.querySelectorAll('.hub-card')) as HTMLElement[];
      const primary = orbit.querySelector('.hub-card.primary') as HTMLElement;
      const outer = cards.filter((c) => c !== primary);

      const w = orbit.clientWidth;
      const h = orbit.clientHeight;
      if (!w || !h) return;

      const cx = w / 2;
      const cy = h / 2;

      if (primary) {
        primary.style.left = `${cx}px`;
        primary.style.top = `${cy}px`;
      }

      const n = outer.length;
      const orbSpan = 156;
      const byCount = n > 0 ? orbSpan / (2 * Math.sin(Math.PI / n)) + 24 : 0;
      const radius = Math.max(300, byCount, Math.min(w, h) / 2 - 60);

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const lines: React.ReactNode[] = [];

      outer.forEach((card, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);

        card.style.left = `${x}px`;
        card.style.top = `${y}px`;

        const pathId = `orbitPath${i}`;
        const gradId = `orbitBeam${i}`;

        lines.push(
          <g key={i}>
            <linearGradient
              id={gradId}
              gradientUnits="userSpaceOnUse"
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
            >
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity=".65" />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity=".12" />
            </linearGradient>
            <path id={pathId} d={`M ${cx} ${cy} L ${x} ${y}`} stroke={`url(#${gradId})`} />
            {!reduceMotion && (
              <circle className="pulse" r="3.4" fill="var(--color-brand)">
                <animateMotion
                  dur={`${2.4 + i * 0.35}s`}
                  repeatCount="indefinite"
                  begin={`${i * 0.4}s`}
                >
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            )}
          </g>,
        );
      });

      setOrbitLines(
        <svg
          className="orbit-lines"
          viewBox={`0 0 ${w} ${h}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <style>
            {
              'path { fill: none; stroke-width: 2.6; stroke-linecap: round; } circle.pulse { filter: drop-shadow(0 0 6px var(--color-brand)); }'
            }
          </style>
          {lines}
        </svg>,
      );
    }

    layout();
    window.addEventListener('resize', layout);
    return () => window.removeEventListener('resize', layout);
  }, [isDesktopOrbit, items.length]);

  const handleCardClick = (e: React.MouseEvent, item: OrbitItem) => {
    burstRef.current?.trigger(e.clientX, e.clientY, item.colorRgb);
    if (soundOn) SoundFX.play('focus');
    item.onOpen();
  };

  return (
    <div className="relative min-h-screen bg-bg overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute pointer-events-none h-96 w-96 rounded-full bg-brand/10 blur-3xl -top-20 -left-20 animate-[hub-bg-float-1_15s_infinite_ease-in-out]" />
      <div className="absolute pointer-events-none h-80 w-80 rounded-full bg-brand-2/10 blur-3xl top-1/2 -right-20 animate-[hub-bg-float-2_18s_infinite_ease-in-out]" />
      <div className="absolute pointer-events-none h-72 w-72 rounded-full bg-brand-active/5 blur-3xl -bottom-10 left-1/3 animate-[hub-bg-float-3_20s_infinite_ease-in-out]" />

      <HubBurstCanvas ref={burstRef} />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Topbar Birth Hub 360° */}
        <header className="flex items-center gap-3 px-8 pt-5 pb-3">
          <BirthHubLogo variant="full" className="h-8 text-ink" />

          <div className="ml-auto hidden items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1 text-xs font-bold text-ink-2 backdrop-blur-md sm:flex">
            <span className="hub-beacon h-2 w-2 rounded-full bg-brand" />
            {brandInfo.name} &middot; {brandInfo.operatingSystemName}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </div>

          <button
            type="button"
            onClick={() => {
              const next = SoundFX.toggleMute();
              setSoundOn(next);
              if (next) SoundFX.play('focus');
            }}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface/70 text-ink-2 backdrop-blur-md transition-colors hover:text-ink"
            aria-label={soundOn ? 'Desativar som de interação' : 'Ativar som de interação'}
            title={soundOn ? 'Desativar som de interação' : 'Ativar som de interação'}
          >
            {soundOn ? <Volume2 className="h-4.5 w-4.5" /> : <VolumeX className="h-4.5 w-4.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              SoundFX.play('focus');
              toggleTheme();
            }}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface/70 text-ink-2 backdrop-blur-md transition-colors hover:text-ink"
            aria-label="Alternar tema"
            title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
          >
            {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          {currentUser && (
            <div className="flex items-center gap-2.5 rounded-full border border-line bg-surface/70 py-1 pl-1 pr-3.5 backdrop-blur-md">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xs font-bold text-white">
                {currentUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden text-xs font-bold text-ink sm:inline">
                {currentUser.name}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={logout}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface/70 text-critical backdrop-blur-md transition-colors hover:bg-critical/10"
            aria-label="Encerrar sessão"
            title="Encerrar sessão e sair da conta"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </header>

        {/* Hero Section */}
        <div className="flex flex-wrap items-end justify-between gap-6 px-8 pt-4 pb-2">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-active dark:text-brand-2">
              Birth Hub 360°
            </div>
            <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl md:text-5xl">
              {clock.greeting},{' '}
              <span className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-transparent">
                {firstName}
              </span>
            </h1>
            <p className="mt-1 text-sm font-bold text-brand-active dark:text-brand-2">
              {brandInfo.slogan}
            </p>
          </div>

          {/* Widgets da Topbar */}
          <div className="hidden items-stretch gap-3 md:flex">
            <div className="hub-widget flex min-w-[128px] flex-col items-center justify-center px-4 py-3">
              <span className="font-mono text-2xl font-bold tabular-nums text-brand-active dark:text-brand-2">
                {clock.time}
              </span>
              <span className="mt-0.5 text-[10px] font-extrabold capitalize text-ink-2">
                {clock.dateLabel}
              </span>
            </div>

            <div className="hub-widget w-[178px] px-3 py-2.5">
              <p className="mb-1.5 text-center text-[10px] font-black uppercase tracking-wider text-brand-active dark:text-brand-2">
                {clock.monthLabel}
              </p>
              <div className="grid grid-cols-7 gap-0.5">
                {WEEKDAYS_SHORT.map((d, i) => (
                  <span
                    key={`wd-${i}`}
                    className="text-center text-[8.5px] font-extrabold text-ink-2 opacity-80"
                  >
                    {d}
                  </span>
                ))}
                {calendarCells.map((cell, i) =>
                  cell ? (
                    <span
                      key={cell.day}
                      className={
                        cell.isToday
                          ? 'grid place-items-center rounded-md bg-brand py-0.5 text-[10px] font-black text-white shadow-glow-brand-strong'
                          : 'grid place-items-center rounded-md py-0.5 text-[10px] font-semibold text-ink-2'
                      }
                    >
                      {cell.day}
                    </span>
                  ) : (
                    <span key={`empty-${i}`} />
                  ),
                )}
              </div>
            </div>

            <HubTaskWidget />
          </div>
        </div>

        {/* Rótulo da Seção */}
        <div className="mx-auto flex w-full max-w-[1250px] items-center gap-2.5 px-8 pt-6 pb-2">
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-ink-2">
            Da prospecção ao contrato — Ecossistema de Inteligência Comercial{' '}
            <span className="inline-flex items-center gap-1.5 font-black text-ink">
              <BirthHubLogo variant="symbol" className="h-4 w-auto text-brand" />
              BIRTH HUB 360°
            </span>
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
        </div>

        {!isLoading && grantedCatalog.length === 0 && (
          <p className="mx-auto max-w-[1250px] px-8 text-xs text-ink-2">
            Nenhum módulo executivo liberado para a sua conta ainda — a órbita exibe a Central
            Comercial e ferramentas da equipe.
          </p>
        )}
        {isLoading && (
          <div className="mx-auto flex max-w-[1250px] items-center gap-2 px-8 text-xs text-ink-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando módulos...
          </div>
        )}

        {/* Órbita Concêntrica Dupla */}
        {isDesktopOrbit ? (
          // Grupo de botões de navegação (não campos de formulário) — <fieldset> não traria ganho
          // real de acessibilidade aqui, só estilo.
          // biome-ignore lint/a11y/useSemanticElements: ver comentário acima
          <div
            ref={orbitContainerRef}
            className="hub-orbit"
            role="group"
            aria-label="Órbita do Birth Hub 360°"
          >
            {orbitLines}
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={(e) => handleCardClick(e, item)}
                  className={`hub-card ${item.primary ? 'primary' : ''}`}
                  title={item.description}
                >
                  <div className="hc-orb">
                    <div className="hc-icon-wrap">
                      <Icon className={item.primary ? 'h-12 w-12' : 'h-8 w-8'} />
                    </div>
                    <div className="hc-title">{item.label}</div>
                    {item.primary && <div className="hc-tag hc-tag-inside">{item.description}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <MobileDestinationList items={items} />
        )}
      </div>
    </div>
  );
}

function MobileDestinationList({ items }: { items: OrbitItem[] }) {
  const primary = items.find((i) => i.primary);
  const rest = items.filter((i) => !i.primary);
  return (
    <div className="space-y-4 px-6 py-4">
      {primary && (
        <button
          type="button"
          onClick={primary.onOpen}
          className="group relative flex w-full items-center gap-4 overflow-hidden rounded-card-lg border border-brand/25 bg-surface p-6 text-left shadow-glow-brand transition-transform duration-200 active:scale-[0.99]"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-brand/30 bg-brand/10 text-brand">
            <primary.icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-display text-lg font-bold text-ink">{primary.label}</span>
            <span className="mt-0.5 block text-sm text-ink-2">{primary.description}</span>
          </span>
        </button>
      )}
      <div className="grid grid-cols-2 gap-3">
        {rest.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onOpen}
            className="group flex flex-col items-start gap-2 rounded-card border border-line bg-surface p-4 text-left shadow-card transition-transform duration-200 active:scale-[0.98]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-brand-active dark:text-brand-2">
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="flex items-center gap-1 font-display text-xs font-bold text-ink">
              {item.label}
              {item.external && <ExternalLink className="h-3 w-3 text-ink-2" aria-hidden="true" />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
