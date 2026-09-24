import { animate, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  Compass,
  Database,
  DatabaseZap,
  Menu,
  Play,
  Rocket,
  Target,
  Workflow,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { BirthHubLogo, BirthHubWordmark } from './components/BirthHubLogo';
import { BRAND, LOGIN_URL } from './brand';
import { EASE_OUT_EXPO, staggerContainer, staggerItem } from './lib/motion';

/**
 * Landing institucional do Birth Hub 360º — projeto INDEPENDENTE da plataforma, refeito a partir do
 * export do Stitch ("SaaS landing page redesign"), pedido explícito do usuário (24/09/2026).
 *
 * O que veio do Stitch: arquitetura da página (hero com órbita 360° → indicadores → cockpit →
 * pilares → CTA final → rodapé) e o texto do slogan. O que foi ADAPTADO de propósito ao produto e
 * à constituição (`.claude/CLAUDE.md`):
 *  - gradiente em texto (`background-clip: text`) → cor sólida de marca (regra #3);
 *  - depoimento, "empresas líderes" e "SOC-2" eram inventados → removidos; a faixa de logos virou
 *    "integrações" com o que o produto de fato conecta;
 *  - formulário de e-mail que só disparava `alert()` → CTAs reais (`/login` e canais de `BRAND`);
 *  - pilares em 4 cards idênticos → sequência única Dados → Inteligência → Decisão → Execução
 *    (regra #4), que é o próprio argumento da marca;
 *  - cores hex/Tailwind cru → tokens (`bg-brand text-on-brand`, `text-ink-2`, `border-line`…).
 * O mockup do cockpit é ilustração (rotulada como tal), não dado real.
 */

const NAV_LINKS = [
  { href: '#cockpit', label: 'Recursos' },
  { href: '#pilares', label: 'Metodologia 360°' },
  { href: '#integracoes', label: 'Integrações' },
  { href: '#resultados', label: 'Resultados' },
];

const STATS = [
  { to: 50, suffix: '+', label: 'Sistemas integrados', Icon: DatabaseZap },
  { to: 100, suffix: '+', label: 'Empresas que confiam', Icon: BrainCircuit },
  { to: 3, suffix: 'x', label: 'Mais eficiência comercial', Icon: Rocket },
  { to: 360, suffix: '°', label: 'Visão da operação', Icon: Target },
];

const PILLARS = [
  {
    Icon: Database,
    tag: 'Dados',
    title: 'Conexão contínua',
    text: 'Leads, contatos, conversas e sistemas externos num só fluxo — sem planilha paralela e sem retrabalho de digitação.',
  },
  {
    Icon: BrainCircuit,
    tag: 'Inteligência',
    title: 'IA que entende a operação',
    text: 'Enriquecimento de leads, resumo de conversas e sinais de risco no pipeline, apontando onde agir primeiro.',
  },
  {
    Icon: Compass,
    tag: 'Decisão',
    title: 'Cockpit para gestão',
    text: 'Pipeline, metas e forecast na mesma tela. Gestor e time olham para o mesmo número, atualizado.',
  },
  {
    Icon: Workflow,
    tag: 'Execução',
    title: 'Automação de ponta a ponta',
    text: 'Cadências, alertas e handoff entre SDR e closer rodando sozinhos, com o time entrando onde faz diferença.',
  },
];

const INTEGRATIONS = [
  'Bitrix24',
  'Google Workspace',
  'WhatsApp',
  '3CX',
  'Apollo',
  'Hunter',
  'E-mail',
];

const ORBIT_NODES = [
  {
    Icon: DatabaseZap,
    label: 'Dados',
    hint: 'Integração sem limites',
    pos: 'left-1/2 top-0 -translate-x-1/2',
  },
  {
    Icon: BrainCircuit,
    label: 'Inteligência',
    hint: 'Insights em tempo real',
    pos: 'right-0 top-1/2 -translate-y-1/2',
  },
  {
    Icon: Target,
    label: 'Decisão',
    hint: 'Estratégia baseada em dados',
    pos: 'bottom-0 left-1/2 -translate-x-1/2',
  },
  {
    Icon: Rocket,
    label: 'Execução',
    hint: 'Resultados consistentes',
    pos: 'left-0 top-1/2 -translate-y-1/2',
  },
];

/** Número que conta de 0 até o valor final uma única vez; com movimento reduzido mostra direto. */
function CountUp({ to, suffix = '', delay = 0 }: { to: number; suffix?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? to : 0);
  useEffect(() => {
    if (reduceMotion) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, {
      duration: 1.4,
      delay,
      ease: EASE_OUT_EXPO,
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [to, delay, reduceMotion]);
  return (
    <span className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
}

/** Linha do slogan: sobe de uma máscara — entrada em cascata que guia a leitura das três frases. */
function RevealLine({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <span className="block overflow-hidden pb-1">
      <motion.span
        className="block"
        initial={{ y: '110%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, delay, ease: EASE_OUT_EXPO }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-ink dark:text-brand">
      {children}
    </p>
  );
}

const primaryCta =
  'inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-on-brand transition-transform hover:-translate-y-0.5 hover:bg-brand-active active:translate-y-0 motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
const secondaryCta =
  'inline-flex items-center justify-center gap-3 rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand-ink dark:hover:text-brand';

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#top" className="flex shrink-0 items-center gap-3" aria-label={BRAND.name}>
          <BirthHubLogo variant="icon" className="h-8 w-8" />
          <BirthHubWordmark className="hidden h-4 text-ink sm:block" />
        </a>

        <nav aria-label="Seções da página" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={LOGIN_URL}
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-ink-2 hover:text-ink sm:block"
          >
            Entrar
          </a>
          <a href={LOGIN_URL} className={`${primaryCta} !px-5 !py-2 text-xs`}>
            Acessar o Hub
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            className="rounded-lg p-2 text-ink-2 hover:text-ink md:hidden"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            aria-controls="landing-mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="landing-mobile-nav"
          aria-label="Seções da página"
          className="border-t border-line px-4 py-3 md:hidden"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-sm font-medium text-ink-2 hover:text-ink"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={LOGIN_URL}
                className="block rounded-lg px-3 py-3 text-sm font-semibold text-ink"
              >
                Entrar
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

/** Órbita 360°: as 4 etapas da marca ao redor do emblema. O anel gira devagar — sinaliza "ciclo
 *  contínuo", que é a tese do produto; desligado com `prefers-reduced-motion`. */
function OrbitHub() {
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[460px]"
      role="img"
      aria-label="Ciclo Dados, Inteligência, Decisão e Execução ao redor do emblema Birth Hub 360°"
    >
      <div className="absolute inset-6 rounded-full border border-dashed border-line motion-safe:animate-[spin_70s_linear_infinite]" />
      <div className="absolute inset-[18%] rounded-full border border-orbit-blue/30" />
      <div className="absolute inset-[30%] flex items-center justify-center rounded-full border border-brand/40 bg-surface shadow-card">
        <BirthHubLogo variant="symbol" className="h-[62%] w-[62%]" />
      </div>
      {ORBIT_NODES.map(({ Icon, label, hint, pos }) => (
        <div key={label} className={`absolute flex flex-col items-center text-center ${pos}`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface-elevated text-brand-ink shadow-card dark:text-brand">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-ink">
            {label}
          </span>
          <span className="hidden max-w-[110px] text-[10px] leading-tight text-ink-2 sm:block">
            {hint}
          </span>
        </div>
      ))}
    </div>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-brand/10 blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full bg-orbit-blue/10 blur-[120px]"
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-24">
        <motion.div
          className="lg:col-span-6"
          initial="hidden"
          animate="show"
          variants={staggerContainer(0.1)}
        >
          <motion.div variants={staggerItem}>
            <SectionLabel>Centro de comando inteligente</SectionLabel>
          </motion.div>
          <motion.h1
            id="hero-title"
            variants={staggerItem}
            className="mt-4 font-display text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl"
          >
            <RevealLine delay={0.15}>
              Dados que <span className="text-brand-ink dark:text-brand">conectam.</span>
            </RevealLine>
            <RevealLine delay={0.3}>
              Inteligência que <span className="text-brand-ink dark:text-brand">decide.</span>
            </RevealLine>
            <RevealLine delay={0.45}>Resultados que acontecem.</RevealLine>
          </motion.h1>
          <motion.p
            variants={staggerItem}
            className="mt-6 max-w-xl text-base leading-relaxed text-ink-2"
          >
            {BRAND.description}
          </motion.p>
          <motion.div variants={staggerItem} className="mt-8 flex flex-wrap items-center gap-3">
            <a href={LOGIN_URL} className={primaryCta}>
              Explorar o Birth Hub
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="#cockpit" className={secondaryCta}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Ver o cockpit
            </a>
          </motion.div>
        </motion.div>

        <div className="lg:col-span-6">
          <OrbitHub />
        </div>
      </div>
    </section>
  );
}

function StatsStrip() {
  return (
    <section aria-label="Indicadores" className="border-y border-line bg-surface">
      <motion.dl
        className="mx-auto grid max-w-7xl grid-cols-2 divide-line px-4 sm:px-6 lg:grid-cols-4 lg:divide-x lg:px-8"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-40px' }}
        variants={staggerContainer(0.09)}
      >
        {STATS.map(({ Icon, to, suffix, label }, i) => (
          <motion.div key={label} variants={staggerItem} className="px-2 py-6 lg:px-8">
            <Icon className="mb-2 h-5 w-5 text-brand-ink dark:text-brand" aria-hidden="true" />
            <dt className="order-2 text-[11px] uppercase tracking-wider text-ink-2">{label}</dt>
            <dd className="font-display text-3xl font-bold text-ink">
              <CountUp to={to} suffix={suffix} delay={0.1 + i * 0.09} />
            </dd>
          </motion.div>
        ))}
      </motion.dl>
    </section>
  );
}

const CHART_BARS = [35, 48, 42, 65, 58, 75, 82, 78, 89, 94];
const CHART_FORECAST = [97, 100];

/** Mockup do cockpit — ILUSTRAÇÃO com dados fictícios (rotulada), feita em DOM para escalar em
 *  qualquer viewport e respeitar o tema. Não há gráfico interativo aqui de propósito. */
function CockpitPreview() {
  return (
    <section
      id="cockpit"
      aria-labelledby="cockpit-title"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionLabel>Interface executiva</SectionLabel>
          <h2
            id="cockpit-title"
            className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          >
            O cockpit que transforma dados dispersos em decisão.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-2">
            Acompanhe pipeline, metas e integrações em tempo real, antecipe gargalos e acione
            automações a partir do próprio painel.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink">
            {[
              'KPIs comerciais consolidados',
              'Forecast com faixa de previsão',
              'Alertas com ação sugerida',
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <figure className="lg:col-span-8">
          <div className="overflow-hidden rounded-[var(--radius-card-lg)] border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2.5 text-xs">
              <span className="font-mono text-ink-2">cockpit / visão executiva</span>
              <span className="flex items-center gap-1.5 font-mono text-ok">
                <span className="h-2 w-2 rounded-full bg-ok" aria-hidden="true" />
                sincronizado
              </span>
            </div>

            <div className="grid gap-px bg-line sm:grid-cols-3">
              {[
                { l: 'Receita no pipeline', v: 'R$ 14,8 mi', d: '+28,4%', bar: 84 },
                { l: 'Integrações ativas', v: '54/54', d: '99,98%', bar: 99 },
                { l: 'Ações da IA (24h)', v: '4.120', d: '842 h poupadas', bar: 92 },
              ].map((k) => (
                <div key={k.l} className="bg-surface p-5">
                  <p className="text-xs text-ink-2">{k.l}</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-ink">{k.v}</p>
                  <p className="mt-1 font-mono text-[11px] text-ok">{k.d}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${k.bar}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-px border-t border-line bg-line lg:grid-cols-3">
              <div className="bg-surface p-5 lg:col-span-2">
                <p className="text-sm font-semibold text-ink">Previsão de fechamento</p>
                <div
                  className="mt-4 flex h-40 items-end gap-2 border-b border-line pb-px"
                  aria-hidden="true"
                >
                  {CHART_BARS.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-brand"
                      style={{ height: `${h}%`, opacity: 0.35 + i * 0.065 }}
                    />
                  ))}
                  {CHART_FORECAST.map((h) => (
                    <div
                      key={h}
                      className="flex-1 rounded-t border-2 border-dashed border-orbit-blue bg-orbit-blue/10"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <p className="mt-2 flex justify-between font-mono text-[10px] text-ink-2">
                  <span>Realizado</span>
                  <span className="text-orbit-blue">Previsto</span>
                </p>
              </div>

              <div className="space-y-3 bg-surface p-5">
                <p className="text-sm font-semibold text-ink">Alertas do motor decisório</p>
                <div className="rounded-lg border border-critical/30 bg-critical/10 p-3 text-xs">
                  <p className="font-semibold text-critical-active">Risco de churn · Crítico</p>
                  <p className="mt-1 text-ink-2">
                    Queda de 32% no uso. Playbook de retenção pronto.
                  </p>
                </div>
                <div className="rounded-lg border border-brand/30 bg-brand/10 p-3 text-xs">
                  <p className="font-semibold text-brand-ink dark:text-brand">
                    Oportunidade · Score 94
                  </p>
                  <p className="mt-1 text-ink-2">3 contas acima de 90% do volume contratado.</p>
                </div>
              </div>
            </div>
          </div>
          <figcaption className="mt-3 text-xs text-ink-2">
            Ilustração com dados fictícios, apenas para demonstrar a interface.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/** Os 4 pilares como uma sequência (Dados → Execução), não 4 cartões soltos: o ponto da marca é o
 *  encadeamento, então o desenho é uma linha do tempo com numeração e conector. */
function Pillars() {
  return (
    <section
      id="pilares"
      aria-labelledby="pilares-title"
      className="scroll-mt-20 border-y border-line bg-surface"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionLabel>Pilares fundamentais</SectionLabel>
        <h2
          id="pilares-title"
          className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl"
        >
          Da informação solta à ação executada, em um único fluxo.
        </h2>

        <ol className="mt-12 grid gap-10 lg:grid-cols-4 lg:gap-0">
          {PILLARS.map(({ Icon, tag, title, text }, i) => (
            <li key={tag} className="relative lg:pr-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand/40 bg-brand/10 text-brand-ink dark:text-brand">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {i < PILLARS.length - 1 && (
                  <span aria-hidden="true" className="hidden h-px flex-1 bg-line lg:block" />
                )}
              </div>
              <p className="mt-5 font-mono text-xs font-bold text-brand-ink dark:text-brand">
                {String(i + 1).padStart(2, '0')} / {tag.toUpperCase()}
              </p>
              <h3 className="mt-1 font-display text-xl font-bold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Integrations() {
  return (
    <section
      id="integracoes"
      aria-labelledby="integracoes-title"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <SectionLabel>Integrações</SectionLabel>
          <h2
            id="integracoes-title"
            className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
          >
            Conecta com o que sua operação já usa.
          </h2>
        </div>
        <ul className="flex flex-wrap gap-2">
          {INTEGRATIONS.map((name) => (
            <li
              key={name}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section
      id="resultados"
      aria-labelledby="cta-title"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-20 sm:px-6 lg:px-8"
    >
      <div className="relative overflow-hidden rounded-[var(--radius-card-lg)] border border-brand/40 bg-surface p-8 sm:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl"
        />
        <div className="relative max-w-2xl">
          <SectionLabel>Comece sua transformação 360°</SectionLabel>
          <h2
            id="cta-title"
            className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          >
            Pronto para colocar sua operação comercial no comando?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-2">
            Entre no Hub e conecte seus dados para ver a operação comercial em um só lugar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={LOGIN_URL} className={primaryCta}>
              Acessar o Hub
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-ink-2 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <BirthHubLogo variant="icon" className="h-7 w-7" />
          <p className="max-w-sm text-xs leading-relaxed">
            {BRAND.slogan}. {BRAND.ecosystemLabel}.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <li>
            <a className="hover:text-ink" href={LOGIN_URL}>
              Entrar
            </a>
          </li>
        </ul>
      </div>
      <p className="border-t border-line px-4 py-4 text-center text-[11px] text-ink-2">
        © {new Date().getFullYear()} {BRAND.name}. {BRAND.credit}.
      </p>
    </footer>
  );
}

export function App() {
  return (
    <div id="top" className="min-h-screen bg-bg font-sans text-ink">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        Ir para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <Hero />
        <StatsStrip />
        <CockpitPreview />
        <Pillars />
        <Integrations />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
