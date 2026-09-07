import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutTemplate,
  Share2,
  GraduationCap,
  FileSignature,
  PieChart,
  LogIn,
  Globe,
  ShieldCheck,
  Building2,
  Mail,
  Inbox,
  Grid3x3,
  ExternalLink,
  Sun,
  Moon,
  LogOut,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useBrand } from '../../../contexts/BrandContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useModuleAccess } from '../../../hooks/useModuleAccess';
import { MODULE_CATALOG, EXTERNAL_LINKS, type ModuleKey } from '../../../config/module-catalog';
import { Logo } from '../../../components/Logo';
import { TotalTrackLogo } from '../../../components/TotalTrackLogo';
import { SoundFX } from '../../../lib/soundEffects';
import { fadeInUp } from '../../../lib/motion';
import { CommercialAgentCellPanel } from './CommercialAgentCellPanel';

const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  'social-selling': Share2,
  'treinamento-atlasgr': GraduationCap,
  'proposta-comercial': FileSignature,
  'hub-inteligencia-marketing': PieChart,
};

const EXTERNAL_LINK_ICONS: Record<string, LucideIcon> = {
  connect: LogIn,
  newConnect: Globe,
  securitario: ShieldCheck,
  bitrix24: Building2,
  webmail: Mail,
  gmail: Inbox,
  workspace: Grid3x3,
};

interface OrbitItem {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  external?: boolean;
  primary?: boolean;
  onOpen: () => void;
}

// Dimensões dos círculos (px) — bem menores que o protótipo original (que era uma tela de
// showcase, não uma tela de uso repetido): este é o Hub real, usado várias vezes por dia, então
// prioriza densidade sobre espetáculo (Constituição §7.4), mantendo a mesma interação pedida.
const PRIMARY_SIZE = 148;
const OUTER_SIZE = 100;
const ORBIT_GAP = 22;

function computeOrbitRadius(width: number, height: number, outerCount: number): number {
  if (outerCount <= 0) return 0;
  const span = OUTER_SIZE + ORBIT_GAP;
  const byCount = span / (2 * Math.sin(Math.PI / outerCount)) + 14;
  return Math.max(140, byCount, Math.min(width, height) / 2 - 34);
}

function useIsDesktopOrbit(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 860px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(min-width: 860px)');
    const handleChange = () => setIsDesktop(query.matches);
    handleChange();
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);
  return isDesktop;
}

/**
 * Motor da órbita: posiciona os círculos via estilo inline direto no DOM (sem re-render por
 * frame) e anima a seleção — o círculo escolhido cresce e vai para o centro, os demais reorbitam
 * ao redor dele — antes de abrir o destino real. Mesmo modelo de interação do protótipo aprovado
 * pelo usuário, portado para o Hub de produção.
 */
function useOrbit(items: OrbitItem[], enabled: boolean, onCenterChange: (key: string) => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardEls = useRef<Map<string, HTMLButtonElement>>(new Map());
  const posByKey = useRef<Map<string, { angle: number; radius: number }>>(new Map());
  const centerKey = useRef<string | null>(null);
  const busy = useRef(false);
  const reduceMotion = useReducedMotion();

  const registerCard = useCallback(
    (key: string) => (el: HTMLButtonElement | null) => {
      if (el) cardEls.current.set(key, el);
      else cardEls.current.delete(key);
    },
    [],
  );

  const applyStyle = (key: string, left: number, top: number, size: number) => {
    const el = cardEls.current.get(key);
    if (!el) return;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
  };

  const layout = useCallback(
    (nextCenterKey: string) => {
      const container = containerRef.current;
      if (!container || !enabled) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;

      centerKey.current = nextCenterKey;
      const cx = width / 2;
      const cy = height / 2;
      const outerKeys = items.map((i) => i.key).filter((k) => k !== nextCenterKey);
      const radius = computeOrbitRadius(width, height, outerKeys.length);

      posByKey.current.set(nextCenterKey, { angle: 0, radius: 0 });
      applyStyle(nextCenterKey, cx, cy, PRIMARY_SIZE);

      outerKeys.forEach((key, i) => {
        const angle = (Math.PI * 2 * i) / outerKeys.length - Math.PI / 2;
        posByKey.current.set(key, { angle, radius });
        applyStyle(key, cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), OUTER_SIZE);
      });
    },
    [items, enabled],
  );

  useLayoutEffect(() => {
    if (!enabled || items.length === 0) return;
    const primaryKey = items.find((i) => i.primary)?.key ?? items[0].key;
    layout(centerKey.current ?? primaryKey);
    const onResize = () => layout(centerKey.current ?? primaryKey);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [items, enabled, layout]);

  const select = useCallback(
    (key: string, onOpen: () => void) => {
      const container = containerRef.current;
      if (busy.current) return;
      if (!container || reduceMotion || !enabled) {
        onOpen();
        return;
      }
      if (centerKey.current === key) {
        onOpen();
        return;
      }

      busy.current = true;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const cx = width / 2;
      const cy = height / 2;
      const others = items.map((i) => i.key).filter((k) => k !== key);
      const radius = computeOrbitRadius(width, height, others.length);

      const fromPos = posByKey.current.get(key) ?? { angle: 0, radius: 0 };
      const fromX = cx + fromPos.radius * Math.cos(fromPos.angle);
      const fromY = cy + fromPos.radius * Math.sin(fromPos.angle);
      const fromSize = key === centerKey.current ? PRIMARY_SIZE : OUTER_SIZE;

      const transitions = others.map((k, i) => {
        const from = posByKey.current.get(k) ?? { angle: 0, radius };
        const to = { angle: (Math.PI * 2 * i) / others.length - Math.PI / 2, radius };
        return { key: k, from, to };
      });

      // Troca o estilo "primário" (gradiente, ícone maior, descrição) para o círculo escolhido
      // já no início da animação, não só no final — sem isso o círculo que está saindo do centro
      // continua com o conteúdo/estilo de card grande enquanto encolhe (achado real: o texto da
      // descrição transbordava o círculo pequeno de "Central Comercial" depois de escolher outro
      // destino, porque o estilo vinha de uma flag estática, nunca do centro visual atual).
      onCenterChange(key);

      const duration = 900;
      const start = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const e = easeOutCubic(t);

        applyStyle(
          key,
          fromX + (cx - fromX) * e,
          fromY + (cy - fromY) * e,
          fromSize + (PRIMARY_SIZE - fromSize) * e,
        );

        transitions.forEach(({ key: k, from, to }) => {
          let delta = to.angle - from.angle;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          const angle = from.angle + delta * e;
          const rad = from.radius + (to.radius - from.radius) * e;
          applyStyle(k, cx + rad * Math.cos(angle), cy + rad * Math.sin(angle), OUTER_SIZE);
        });

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          posByKey.current.set(key, { angle: 0, radius: 0 });
          transitions.forEach(({ key: k, to }) => {
            posByKey.current.set(k, to);
          });
          centerKey.current = key;
          busy.current = false;
          onOpen();
        }
      };
      requestAnimationFrame(frame);
    },
    [items, enabled, reduceMotion, onCenterChange],
  );

  return { containerRef, registerCard, select };
}

interface OrbitCardProps {
  item: OrbitItem;
  isCenter: boolean;
  registerRef: (el: HTMLButtonElement | null) => void;
  onSelect: () => void;
}

function OrbitCard({ item, isCenter, registerRef, onSelect }: OrbitCardProps) {
  const Icon = item.icon;
  return (
    <motion.button
      type="button"
      ref={registerRef}
      onClick={onSelect}
      whileHover={{ scale: 1.045 }}
      whileTap={{ scale: 0.96 }}
      style={{
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        background: isCenter
          ? 'linear-gradient(145deg, var(--brand-2), var(--color-brand-active))'
          : undefined,
      }}
      className={
        isCenter
          ? 'grid place-items-center rounded-full text-white shadow-glow-brand-strong'
          : 'group grid place-items-center rounded-full border border-line bg-surface text-brand-active shadow-card transition-[border-color,box-shadow] duration-200 hover:border-brand/30 hover:shadow-card-hover dark:text-brand-2'
      }
    >
      {item.external && !isCenter && (
        <ExternalLink
          className="absolute right-2 top-2 h-3 w-3 text-ink-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden="true"
        />
      )}
      <span className="flex flex-col items-center gap-1 px-3 text-center">
        <Icon className={isCenter ? 'h-7 w-7' : 'h-5 w-5'} aria-hidden="true" />
        <span
          className={
            isCenter
              ? 'font-display text-xs font-black leading-tight'
              : 'font-display text-[10.5px] font-bold leading-tight text-ink'
          }
        >
          {item.label}
        </span>
        {isCenter && (
          <span className="text-[10px] font-semibold leading-tight text-white/85">
            {item.description}
          </span>
        )}
      </span>
      {!isCenter && <span className="sr-only"> — {item.description}</span>}
    </motion.button>
  );
}

/**
 * Hub Executivo — tela de destinos pós-login ("os círculos", pedido explícito do usuário: os
 * módulos executivos e as ferramentas externas não vivem dentro do CRM, vivem aqui). Central
 * Comercial (o CRM) é o destino primário; os módulos executivos só aparecem se o usuário logado
 * tiver concessão real (ModuleAccessGrant, via useModuleAccess — nunca por e-mail/papel); as
 * ferramentas externas (Bitrix24, webmail, portais) são atalhos sempre visíveis, sem gate, porque
 * são ferramentas de uso corriqueiro da equipe, não acervo executivo restrito. Todos os destinos
 * (módulo primário, módulos concedidos e ferramentas) vivem juntos numa única órbita, no mesmo
 * modelo visual — pedido explícito do usuário para não segmentar visualmente o que é, na prática,
 * a mesma coisa: "ferramentas do dia a dia". Clicar em qualquer círculo o leva ao centro, os
 * demais reorbitam, e só então o destino abre (navegação interna ou, para ferramentas externas,
 * a mesma aba nova já usada hoje — preservando essa decisão de UX existente).
 */
export function HubScreen() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { activeBrand } = useBrand();
  const { theme, toggleTheme } = useTheme();
  const { grantedModules, isLoading } = useModuleAccess();
  const isAtlas = activeBrand === 'atlasgr';
  const isDesktopOrbit = useIsDesktopOrbit();

  const grantedCatalog = MODULE_CATALOG.filter((m) => grantedModules.includes(m.key));

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
        icon: LayoutTemplate,
        primary: true,
        onOpen: () => goTo('/app'),
      },
      ...grantedCatalog.map((mod) => ({
        key: mod.key,
        label: mod.label,
        description: mod.description,
        icon: MODULE_ICONS[mod.key],
        onOpen: () => goTo(`/${mod.key}`),
      })),
      ...EXTERNAL_LINKS.map((link) => ({
        key: link.key,
        label: link.label,
        description: link.description,
        icon: EXTERNAL_LINK_ICONS[link.iconKey],
        external: true,
        onOpen: () => openExternal(link.url),
      })),
    ],
    [grantedCatalog, goTo, openExternal],
  );

  const [centerKey, setCenterKey] = useState(
    () => items.find((i) => i.primary)?.key ?? items[0]?.key,
  );
  const { containerRef, registerCard, select } = useOrbit(items, isDesktopOrbit, setCenterKey);

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          {isAtlas ? (
            <Logo className="h-7 text-ink" />
          ) : (
            <TotalTrackLogo className="h-7 text-ink" />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                SoundFX.play('focus');
                toggleTheme();
              }}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-transparent text-ink-2 transition-[transform,background-color,border-color,color] duration-200 hover:-translate-y-0.5 hover:border-line hover:bg-surface-2 hover:text-ink active:translate-y-0"
              aria-label="Alternar tema"
              title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {currentUser && (
              <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/70 py-1.5 pl-1.5 pr-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xs font-bold text-white">
                  {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden leading-tight sm:block">
                  <p className="text-xs font-bold text-ink">{currentUser.name}</p>
                  <p className="text-[10px] text-ink-2">{currentUser.roleTitle}</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-transparent text-critical transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:border-critical/15 hover:bg-critical/10 active:translate-y-0"
              aria-label="Encerrar sessão"
              title="Encerrar sessão e sair da conta"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <motion.div initial="hidden" animate="show" variants={fadeInUp} className="space-y-6">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-sm font-black uppercase tracking-[0.14em] text-ink-2">
              Da prospecção ao contrato
            </h1>
            <span
              className="h-px flex-1 bg-gradient-to-r from-line to-transparent"
              aria-hidden="true"
            />
          </div>

          {!isLoading && grantedCatalog.length === 0 && (
            <p className="text-xs text-ink-2">
              Nenhum módulo executivo liberado para a sua conta ainda — os círculos abaixo mostram a
              Central Comercial e as ferramentas de uso corriqueiro da equipe. Peça a um
              administrador para conceder acesso a um módulo no painel de Acesso a Módulos.
            </p>
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-ink-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando módulos concedidos…
            </div>
          )}

          {isDesktopOrbit ? (
            <div
              ref={containerRef}
              className="relative mx-auto h-[560px] w-full max-w-[820px]"
              role="group"
              aria-label="Destinos do Hub — clique em um círculo para abri-lo"
            >
              {items.map((item) => (
                <OrbitCard
                  key={item.key}
                  item={item}
                  isCenter={item.key === centerKey}
                  registerRef={registerCard(item.key)}
                  onSelect={() => {
                    SoundFX.play('focus');
                    select(item.key, item.onOpen);
                  }}
                />
              ))}
            </div>
          ) : (
            <MobileDestinationList items={items} />
          )}

          <CommercialAgentCellPanel />
        </motion.div>
      </main>
    </div>
  );
}

/** Em telas estreitas (celular/Android via Capacitor) a matemática da órbita não compensa — a
 * mesma lista de destinos vira uma grade vertical simples, sem a animação de reorbitar. */
function MobileDestinationList({ items }: { items: OrbitItem[] }) {
  const primary = items.find((i) => i.primary);
  const rest = items.filter((i) => !i.primary);
  return (
    <div className="space-y-4">
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
