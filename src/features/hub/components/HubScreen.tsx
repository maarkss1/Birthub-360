import {
  ArrowUpRight,
  ChevronDown,
  CircleDot,
  ExternalLink,
  LayoutGrid,
  Loader2,
  LogOut,
  Moon,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BirthHubLogo } from '../../../components/brand/BirthHubLogo';
import { EXTERNAL_LINKS, MODULE_CATALOG } from '../../../config/module-catalog';
import { useAuth } from '../../../contexts/AuthContext';
import { useBrand } from '../../../contexts/BrandContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useModuleAccess } from '../../../hooks/useModuleAccess';
import { SoundFX } from '../../../lib/soundEffects';
import { CommercialAgentCellPanel } from './CommercialAgentCellPanel';
import { type BurstHandle, HubBurstCanvas } from './HubBurstCanvas';
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
  /** Token CSS (sem "--") usado pelo halo/aro/linha deste nó — ver ORBIT_PALETTE abaixo. */
  colorVar: string;
  onOpen: () => void;
}

// Paleta oficial: Midnight Blue, Sunset Orange, Red-Violet, Gold
const ORBIT_PALETTE = ['sunset', 'red-violet', 'gold', 'midnight'] as const;

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
  const [viewMode, setViewMode] = useState<'orbit' | 'cockpit'>('orbit');
  const burstRef = useRef<BurstHandle>(null);

  const firstName = currentUser?.name?.trim().split(/\s+/)[0] ?? 'Usuário';
  const calendarCells = buildCalendarCells(clock.year, clock.month, clock.today, true);
  const brandRgb = useMemo(() => hexToRgbString(brandInfo.colors.brand), [brandInfo.colors.brand]);
  // RGB de cada cor da órbita de 5 cores, pro burst de partículas do canvas (que não entende
  // var(--token)) poder reproduzir a mesma cor atribuída ao card clicado (ver ORBIT_PALETTE).
  const orbitRgb = useMemo(
    () => ({
      sunset: hexToRgbString(brandInfo.colors.sunsetOrange),
      'red-violet': hexToRgbString(brandInfo.colors.redViolet),
      gold: hexToRgbString(brandInfo.colors.brand),
      midnight: hexToRgbString(brandInfo.colors.midnight),
      'orbit-blue': hexToRgbString(brandInfo.colors.midnight),
      iris: hexToRgbString(brandInfo.colors.redViolet),
      pink: hexToRgbString(brandInfo.colors.redViolet),
      red: hexToRgbString(brandInfo.colors.sunsetOrange),
      'brand-2': hexToRgbString(brandInfo.colors.brandAccent),
    }),
    [brandInfo.colors],
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

  const items = useMemo<OrbitItem[]>(() => {
    // Índice de ciclo pela paleta — incrementado a cada nó não-primário, na ordem em que
    // aparecem, pra cada destino real (não só os fixos) ganhar uma cor própria e consistente
    // entre renders (mesma ordem de entrada = mesma cor).
    let paletteIndex = 0;
    const nextColorVar = () => ORBIT_PALETTE[paletteIndex++ % ORBIT_PALETTE.length];

    const outer: OrbitItem[] = [
      {
        key: 'sdr',
        label: 'Acompanhamento SDR',
        description: 'Mesa de Tratamento · Dashboard SDR',
        icon: HubIcons.sdr,
        ring: 'inner',
        colorVar: nextColorVar(),
        colorRgb: '',
        onOpen: () => goTo('/app/mesa-tratamento'),
      },
      {
        key: 'meeting-hub',
        label: 'Birth Meeting Hub',
        description: 'Cadência · Agendamento · Google Meet',
        icon: HubIcons['meeting-hub'],
        ring: 'inner',
        colorVar: nextColorVar(),
        colorRgb: '',
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
              colorVar: nextColorVar(),
              colorRgb: '',
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
        colorVar: nextColorVar(),
        colorRgb: '',
        onOpen: () => goTo(`/${mod.key}`),
      })),
      ...EXTERNAL_LINKS.map((link) => ({
        key: link.key,
        label: link.label,
        description: link.description,
        icon: HubIcons[link.iconKey] || HubIcons.central,
        external: true,
        ring: 'outer' as const,
        colorVar: nextColorVar(),
        colorRgb: '',
        onOpen: () => openExternal(link.url),
      })),
    ];

    return [
      {
        key: 'central',
        label: 'Central Comercial',
        description: 'CRM · Prospecção · IA',
        icon: HubIcons.central,
        primary: true,
        ring: 'inner',
        colorVar: 'brand',
        colorRgb: brandRgb,
        onOpen: () => goTo('/app'),
      },
      ...outer.map((item) => ({
        ...item,
        colorRgb: orbitRgb[item.colorVar as keyof typeof orbitRgb],
      })),
    ];
  }, [grantedCatalog, goTo, openExternal, canAccessCommercialIntelligence, brandRgb, orbitRgb]);

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
    if (!orbit || !isDesktopOrbit || viewMode !== 'orbit') return;

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

      const n = outer.length;
      // Diâmetro do satélite é ~110px. Precisamos de pelo menos 68px de margem das bordas do container.
      const maxPossibleRadius = Math.min(w / 2 - 68, h / 2 - 68);
      // Raio adaptativo entre 125px e 215px para caber 100% no viewport sem overflow
      const radius = Math.max(125, Math.min(maxPossibleRadius, 215));
      // Escala suave caso o container seja compacto
      const scale = Math.max(0.82, Math.min(1.0, radius / 180));

      if (primary) {
        primary.style.left = `${cx}px`;
        primary.style.top = `${cy}px`;
        primary.style.setProperty('--orb-scale', (scale * 0.98).toFixed(3));
      }

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const lines: React.ReactNode[] = [];

      outer.forEach((card, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);

        card.style.left = `${x}px`;
        card.style.top = `${y}px`;
        card.style.setProperty('--orb-scale', scale.toFixed(3));

        const pathId = `orbitPath${i}`;
        const gradId = `orbitBeam${i}`;
        const accent = `var(--${card.dataset.orbitAccent || 'brand'})`;

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
              <stop offset="0%" stopColor="var(--brand)" stopOpacity=".75" />
              <stop offset="100%" stopColor={accent} stopOpacity=".65" />
            </linearGradient>
            <path
              id={pathId}
              d={`M ${cx} ${cy} L ${x} ${y}`}
              stroke={`url(#${gradId})`}
              strokeWidth="2.4"
            />
            {!reduceMotion && (
              <circle
                className="pulse"
                r="3.5"
                fill={accent}
                style={{ filter: `drop-shadow(0 0 8px ${accent})` }}
              >
                <animateMotion
                  dur={`${2.2 + i * 0.3}s`}
                  repeatCount="indefinite"
                  begin={`${i * 0.35}s`}
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
              'path { fill: none; stroke-linecap: round; } circle.pulse { filter: drop-shadow(0 0 6px var(--color-brand)); }'
            }
          </style>
          {lines}
        </svg>,
      );
    }

    layout();
    window.addEventListener('resize', layout);
    const observer = new ResizeObserver(() => layout());
    observer.observe(orbit);
    return () => {
      window.removeEventListener('resize', layout);
      observer.disconnect();
    };
  }, [isDesktopOrbit, items.length, viewMode]);

  const handleCardClick = (e: React.MouseEvent, item: OrbitItem) => {
    burstRef.current?.trigger(e.clientX, e.clientY, item.colorRgb);
    if (soundOn) SoundFX.play('focus');
    item.onOpen();
  };

  return (
    <div className="relative h-screen max-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#0B132B] dark:via-[#111D3F] dark:to-[#080E21] text-ink overflow-hidden flex flex-col justify-between select-none">
      {/* Background Ambient Glows */}
      <div className="absolute pointer-events-none h-96 w-96 rounded-full bg-gold/15 blur-3xl -top-20 -left-20 animate-[hub-bg-float-1_15s_infinite_ease-in-out]" />
      <div className="absolute pointer-events-none h-80 w-80 rounded-full bg-sunset/15 blur-3xl top-1/2 -right-20 animate-[hub-bg-float-2_18s_infinite_ease-in-out]" />
      <div className="absolute pointer-events-none h-72 w-72 rounded-full bg-red-violet/15 blur-3xl -bottom-10 left-1/3 animate-[hub-bg-float-3_20s_infinite_ease-in-out]" />

      <HubBurstCanvas ref={burstRef} />

      <div className="relative z-10 flex flex-col h-full w-full justify-between overflow-hidden">
        {/* Topbar Birth Hub 360° */}
        <header className="flex items-center gap-3 px-6 pt-3 pb-1.5 shrink-0">
          <BirthHubLogo variant="horizontal" className="h-7 text-ink" />

          <div className="ml-auto hidden items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs font-bold text-ink-2 backdrop-blur-md sm:flex shadow-xs">
            <span className="hub-beacon h-2 w-2 rounded-full bg-brand" />
            {brandInfo.name} &middot; {brandInfo.ecosystemLabel}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </div>

          <button
            type="button"
            onClick={() => {
              const next = SoundFX.toggleMute();
              setSoundOn(next);
              if (next) SoundFX.play('focus');
            }}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface/80 text-ink-2 backdrop-blur-md transition-colors hover:text-ink shadow-xs"
            aria-label={soundOn ? 'Desativar som de interação' : 'Ativar som de interação'}
            title={soundOn ? 'Desativar som de interação' : 'Ativar som de interação'}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              SoundFX.play('focus');
              toggleTheme();
            }}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface/80 text-ink-2 backdrop-blur-md transition-colors hover:text-ink shadow-xs"
            aria-label="Alternar tema"
            title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {currentUser && (
            <div className="flex items-center gap-2 rounded-full border border-line bg-surface/80 py-0.5 pl-1 pr-3 backdrop-blur-md shadow-xs">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-[11px] font-bold text-on-brand">
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
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface/80 text-critical backdrop-blur-md transition-colors hover:bg-critical/10 shadow-xs"
            aria-label="Encerrar sessão"
            title="Encerrar sessão e sair da conta"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        {/* Hero Section & Widgets */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-1 shrink-0">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand dark:text-brand-2">
              Birth Hub 360° &middot; Central Executiva
            </div>
            <h1 className="mt-0.5 font-serif text-xl sm:text-2xl md:text-3xl font-medium leading-tight tracking-tight text-slate-900 dark:text-white">
              {clock.greeting},{' '}
              <span className="text-brand dark:text-brand-2 font-semibold">{firstName}</span>
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              {brandInfo.slogan}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center rounded-full bg-surface/90 p-0.5 border border-line backdrop-blur-md shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('orbit')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  viewMode === 'orbit'
                    ? 'bg-brand text-on-brand shadow-xs'
                    : 'text-ink-2 hover:text-ink'
                }`}
                title="Visualização em Órbita 360°"
              >
                <CircleDot className="h-3.5 w-3.5" />
                Órbita 360°
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cockpit')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  viewMode === 'cockpit'
                    ? 'bg-brand text-on-brand shadow-xs'
                    : 'text-ink-2 hover:text-ink'
                }`}
                title="Visualização em Cockpit Executivo"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cockpit
              </button>
            </div>

            {/* Widgets da Topbar */}
            <div className="hidden items-stretch gap-2 lg:flex">
              <div className="hub-widget flex min-w-[105px] flex-col items-center justify-center px-3 py-1">
                <span className="font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-brand-2 leading-none">
                  {clock.time}
                </span>
                <span className="text-[9px] font-extrabold capitalize text-ink-2 mt-0.5">
                  {clock.dateLabel}
                </span>
              </div>

              <div className="hub-widget w-[150px] px-2 py-1">
                <p className="mb-0.5 text-center text-[8.5px] font-black uppercase tracking-wider text-brand-ink dark:text-brand-2">
                  {clock.monthLabel}
                </p>
                <div className="grid grid-cols-7 gap-0.5">
                  {WEEKDAYS_SHORT.map((d, i) => (
                    <span
                      key={`wd-${i}`}
                      className="text-center text-[7.5px] font-extrabold text-ink-2 opacity-80"
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
                            ? 'grid place-items-center rounded bg-brand py-0.2 text-[8.5px] font-black text-on-brand shadow-glow-brand'
                            : 'grid place-items-center rounded py-0.2 text-[8.5px] font-semibold text-ink-2'
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
        </div>

        {/* Rótulo da Seção */}
        <div className="mx-auto flex w-full max-w-[1250px] items-center gap-2.5 px-6 py-0.5 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-2">
            Da prospecção ao contrato — Ecossistema de Inteligência Comercial{' '}
            <span className="inline-flex items-center gap-1 font-black text-ink">
              <BirthHubLogo variant="symbol" className="h-3.5 w-auto text-brand" />
              BIRTH HUB 360°
            </span>
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
        </div>

        <main className="flex-1 min-h-0 w-full relative flex items-center justify-center overflow-hidden px-4">
          {!isLoading && grantedCatalog.length === 0 && (
            <p className="absolute top-1 left-6 text-[11px] text-ink-2 z-20 pointer-events-none">
              Nenhum módulo executivo liberado para a sua conta ainda — a central exibe as
              ferramentas base.
            </p>
          )}
          {isLoading && (
            <div className="absolute top-1 left-6 flex items-center gap-1.5 text-[11px] text-ink-2 z-20 pointer-events-none">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando módulos...
            </div>
          )}

          {isDesktopOrbit && viewMode === 'orbit' ? (
            // biome-ignore lint/a11y/useSemanticElements: grupo de navegação orbital, fieldset é para formulários
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
                    data-orbit-accent={item.colorVar}
                    style={{ '--orbit-accent': `var(--${item.colorVar})` } as React.CSSProperties}
                  >
                    <div className="hc-orb">
                      <div className="hc-icon-wrap">
                        <Icon className={item.primary ? 'h-8 w-8' : 'h-5 w-5'} />
                      </div>
                      <div className="hc-title">{item.label}</div>
                      {item.primary && (
                        <div className="hc-tag hc-tag-inside">{item.description}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : isDesktopOrbit && viewMode === 'cockpit' ? (
            <ExecutiveCockpitView items={items} onCardClick={handleCardClick} />
          ) : (
            <div className="h-full overflow-y-auto w-full py-2">
              <MobileDestinationList items={items} />
            </div>
          )}

          {/* Equipe IA Comercial — catálogo somente leitura dos 12 agentes da Célula Comercial
              (onda 43), seção separada abaixo da órbita, ver CommercialAgentCellPanel.tsx */}
          <div className="mx-auto w-full max-w-[1250px] px-8 pb-10 pt-6">
            <CommercialAgentCellPanel />
          </div>
        </main>
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
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface-2"
              style={{ color: `var(--${item.colorVar})` }}
            >
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

function ExecutiveCockpitView({
  items,
  onCardClick,
}: {
  items: OrbitItem[];
  onCardClick: (e: React.MouseEvent, item: OrbitItem) => void;
}) {
  const primary = items.find((i) => i.primary);
  const satellites = items.filter((i) => !i.primary);

  return (
    <div className="w-full max-w-4xl h-full flex flex-col justify-center gap-3 py-2 px-4 animate-in fade-in zoom-in-95 duration-200">
      {primary && (
        <button
          type="button"
          onClick={(e) => onCardClick(e, primary)}
          className="group relative flex items-center justify-between w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-brand/15 to-amber-600/10 border-2 border-brand/40 shadow-glow-brand hover:border-brand hover:shadow-glow-brand-strong transition-all cursor-pointer text-left backdrop-blur-md"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#FFEAA7] via-[#D4AF37] to-[#B8860B] flex items-center justify-center text-[#0B132B] shadow-md group-hover:scale-105 transition-transform shrink-0">
              <primary.icon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand text-on-brand">
                  Principal
                </span>
                <span className="text-[11px] font-semibold text-ink-2">
                  Central Comercial Integrada
                </span>
              </div>
              <h2 className="font-display text-lg font-black text-ink mt-0.5 group-hover:text-brand transition-colors">
                {primary.label}
              </h2>
              <p className="text-xs font-medium text-ink-2">{primary.description}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand text-on-brand font-bold text-xs shadow-xs group-hover:scale-105 transition-transform shrink-0">
            <span>Acessar</span>
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </button>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {satellites.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={(e) => onCardClick(e, item)}
              className="group relative flex items-center gap-3 p-3 rounded-xl bg-surface/90 border border-line shadow-card hover:shadow-card-hover hover:border-[var(--card-accent)] transition-all cursor-pointer text-left backdrop-blur-md overflow-hidden"
              style={{ '--card-accent': `var(--${item.colorVar})` } as React.CSSProperties}
            >
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                style={{
                  background: `color-mix(in srgb, var(--${item.colorVar}) 15%, transparent)`,
                  color: `var(--${item.colorVar})`,
                  border: `1px solid color-mix(in srgb, var(--${item.colorVar}) 30%, transparent)`,
                }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-display text-xs font-bold text-ink truncate group-hover:text-[var(--card-accent)] transition-colors">
                    {item.label}
                  </span>
                  {item.external && <ExternalLink className="h-3 w-3 text-ink-2 shrink-0" />}
                </div>
                <p className="text-[10px] text-ink-2 truncate mt-0.5">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
