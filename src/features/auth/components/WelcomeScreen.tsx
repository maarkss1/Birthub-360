/* eslint-disable jsx-a11y/media-has-caption -- trilha instrumental sem fala */
import { useRef, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  MessageCircle,
  Phone,
  Share2,
  Volume2,
  VolumeX,
  X,
  Zap,
  Users,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { clientLogger } from '../../../lib/clientLogger';
import { BRAND } from '../../../config/brand';
import { BirthHubLogo, BirthHubWordmark } from '../../../components/brand/BirthHubLogo';
import { staggerContainer, staggerItem } from '../../../lib/motion';

// Marcas de redes sociais não existem no lucide-react (biblioteca de ícones genéricos do
// projeto) — ícones de marca de terceiros vivem como SVG inline em vez de puxar uma segunda lib
// de ícones para 4 glifos. Ficam aqui, prontos, porque `BRAND.social` volta a ser preenchido
// assim que os perfis da plataforma existirem (hoje a lista está vazia de propósito).
function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M15 21v-7.5h2.5l.4-3H15V8.6c0-.87.24-1.46 1.49-1.46H18V4.4A20.6 20.6 0 0 0 15.98 4.3c-2.19 0-3.68 1.34-3.68 3.79v2.42H9.8v3h2.5V21Z" />
    </svg>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedinGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="8" cy="8.7" r="1.15" />
      <rect x="7.1" y="10.8" width="1.8" height="6.5" />
      <path d="M11.4 10.8h1.75v1.05c.5-.78 1.35-1.25 2.35-1.25 1.9 0 2.9 1.28 2.9 3.42v3.68h-1.8v-3.28c0-1.1-.4-1.83-1.4-1.83-1 0-1.6.72-1.6 1.83v3.28h-1.8Z" />
    </svg>
  );
}

function YoutubeGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="3" y="6" width="18" height="12" rx="4" />
      <path d="M10.3 9.4v5.2l4.7-2.6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

const SOCIAL_GLYPHS = {
  Facebook: FacebookGlyph,
  Instagram: InstagramGlyph,
  LinkedIn: LinkedinGlyph,
  YouTube: YoutubeGlyph,
} as const;

// Ícone por pilar (BRAND.pillars, `src/config/brand.ts`) — mapeamento presentational, não
// institucional (por isso vive aqui, não em brand.ts): Inteligência = insight acionável (Zap),
// Conexão = dados/times conectados (Users), Execução = entrega concluída (CheckCircle2).
const PILLAR_ICONS: Record<(typeof BRAND.pillars)[number], LucideIcon> = {
  Inteligência: Zap,
  Conexão: Users,
  Execução: CheckCircle2,
};

/** Separa "Rótulo: valor" (convenção fixa de `BRAND.support`, não input de usuário). */
function splitChannelLabel(label: string): [string, string] {
  const idx = label.indexOf(': ');
  return idx === -1 ? [label, ''] : [label.slice(0, idx), label.slice(idx + 2)];
}

interface ContactChipProps {
  href: string;
  icon: ReactNode;
  iconClassName: string;
  label: string;
  value: string;
}

function ContactChip({ href, icon, iconClassName, label, value }: ContactChipProps) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
      className="group inline-flex items-center gap-2.5 rounded-xl border border-line bg-surface/40 px-3 py-2 text-xs text-ink-2 backdrop-blur-md transition-colors hover:border-brand/40 hover:text-ink"
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${iconClassName}`}
      >
        {icon}
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="text-[9px] uppercase tracking-wider text-ink-2">{label}</span>
        <span className="font-mono font-medium text-ink">{value}</span>
      </span>
    </a>
  );
}

/**
 * Tela de entrada (pré-login) — porta institucional da Birth Hub 360.
 *
 * Composição centralizada: exceção justificada da regra #2 da Constituição
 * (`.claude/CLAUDE.md` §4/§5), pelos mesmos critérios do Piloto 001 — é um gate
 * institucional pré-login, de estado único, com uma decisão só ("entrar"). Não
 * há informação real que sustente uma composição assimétrica, e o emblema
 * (que É a tese da marca: núcleo, anel e órbita) é o elemento dominante por
 * direito, não por decoração.
 *
 * Escopo escuro fixo — força `.dark` em `<html>` enquanto a tela está montada e restaura o
 * tema anterior ao sair (efeito abaixo), em vez de só um `className="dark"` na raiz local:
 * tentativa real, revertida — os aliases `--color-*` do `@theme` (o que `bg-brand`/`text-ink`/
 * `bg-accent-violet` etc. de fato consomem) são resolvidos UMA VEZ, relativos a `:root`; um
 * `.dark` num wrapper aninhado só re-escopa as variáveis CRUAS (`--bg`, `--accent-violet`...),
 * não os aliases herdados que a maioria das utilities do Tailwind usa — o wrapper local ficava
 * preso no tema claro na prática (achado real em QA visual, não teórico). Exceção justificada
 * pela seção 5 (contexto — gate institucional pré-marca, estado único): o brand book reserva o
 * gradiente 360º completo (ouro→íris→ciano) e o acabamento metálico do wordmark a "halos,
 * bordas, indicadores e hero sections", e os próprios tokens `--accent-violet/--accent-cyan` só
 * ficam vívidos no escuro por design (ver comentário em `globals.css`, ":root"/".dark") — um
 * gate que é, em si, a peça-hero da marca não tem uma versão clara que sirva ao mesmo propósito.
 * Pedido explícito do usuário em 2026-09-11 (ver Piloto 001, addendum) para bater com a
 * referência visual fornecida.
 */
export function WelcomeScreen() {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(true);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && !isMuted) {
      audioRef.current.play().catch(() => {
        // Autoplay bloqueado pelo navegador — apenas registramos, sem interromper a UI.
        clientLogger.info('Autoplay blocked');
      });
    } else if (audioRef.current && isMuted) {
      audioRef.current.pause();
    }
  }, [isMuted]);

  // Ver docstring acima: `.dark` precisa estar em `<html>`, não num wrapper local, pros tokens
  // `--color-*` (o que a maioria das utilities Tailwind consome) resolverem escuro de verdade.
  // Restaura exatamente o par de classes que o ThemeContext tinha aplicado ao entrar, então
  // sair desta tela devolve o usuário ao tema que ele escolheu antes (claro ou escuro).
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    const hadLight = root.classList.contains('light');
    root.classList.add('dark');
    root.classList.remove('light');
    return () => {
      root.classList.toggle('dark', hadDark);
      root.classList.toggle('light', hadLight);
    };
  }, []);

  useEffect(() => {
    if (shareState !== 'copied') return;
    const timer = setTimeout(() => setShareState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [shareState]);

  const toggleMute = () => setIsMuted((prev) => !prev);

  const handleExplore = () => {
    if (audioRef.current) audioRef.current.play().catch(() => {});
    navigate('/login');
  };

  // Botão "Fechar" do mockup não tem modal nenhum pra fechar aqui (este gate não tem estado
  // pai) — em vez de um controle decorativo sem função real (proibido pela regra #8, "UX nunca
  // é sacrificado por estética"), reaproveita o mesmo destino do CTA principal: pular a
  // apresentação e ir direto pro login.
  const handleSkip = () => navigate('/login');

  const handleShare = async () => {
    const shareData = {
      title: BRAND.name,
      text: BRAND.tagline,
      url: window.location.origin,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Usuário cancelou o share sheet nativo — não é erro, não precisa de feedback.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setShareState('copied');
    } catch {
      clientLogger.info('Clipboard write blocked');
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-bg font-sans text-ink transition-colors">
      {/* Trilha ambiente decorativa (piano/cordas instrumental, sem fala) — não transmite
          informação que precise de legenda (WCAG 1.2.2 é sobre conteúdo falado/significativo);
          sem `controls` nativo de propósito (o botão de mudo próprio da tela já dá controle ao
          usuário, ver toggleMute acima). Recurso externo herdado, mantido com o mesmo
          comportamento (mudo por padrão, nunca toca sozinho) — ver CLAUDE.md §9. */}
      {/* biome-ignore lint/a11y/useMediaCaption: trilha instrumental sem fala, ver comentário acima */}
      <audio
        ref={audioRef}
        loop
        src="https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-and-strings-10711.mp3"
      />

      {/* Ambiente de fundo — os três pontos da órbita do emblema (ouro, íris/violeta e ciano) como
          halo, exatamente o uso que o brand book reserva ao gradiente 360º ("halos, bordas,
          indicadores e hero sections"). Escopo escuro fixo (ver docstring acima) mantém os tons
          vívidos por design (--accent-violet/--accent-cyan só ficam saturados em .dark). */}
      <motion.div
        aria-hidden="true"
        animate={{ rotate: [0, 90, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
        className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-brand/10 blur-[90px] sm:-left-32 sm:-top-32 sm:h-[420px] sm:w-[420px] sm:blur-[110px]"
      />
      <motion.div
        aria-hidden="true"
        animate={{ rotate: [0, -90, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-accent-violet/15 blur-[90px] sm:-bottom-32 sm:-right-32 sm:h-[420px] sm:w-[420px] sm:blur-[110px]"
      />
      <motion.div
        aria-hidden="true"
        animate={{ rotate: [0, 90, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
        className="pointer-events-none absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-accent-cyan/12 blur-[100px] sm:h-[360px] sm:w-[360px] sm:blur-[120px]"
      />

      {/* Cabeçalho — grid de 3 colunas pra centralizar o indicador de status de verdade,
          independente da largura assimétrica dos grupos de botões nas pontas. */}
      <header className="relative z-20 grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-5 pt-5 sm:px-6">
        <button
          type="button"
          onClick={handleSkip}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-ink/5 text-ink-2 backdrop-blur-md transition-colors hover:bg-ink/10 hover:text-ink"
          aria-label="Pular apresentação e ir para o login"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {/* Indicador de status — comunica que a plataforma está operante, não decorativo puro;
            o ponto usa animate-pulse (já existente no core do Tailwind, sem keyframe novo). */}
        <div className="mx-auto flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
          </span>
          <span className="whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-wider text-brand sm:text-[11px]">
            Hub 360 Ativo
          </span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-ink/5 text-ink-2 backdrop-blur-md transition-colors hover:bg-ink/10 hover:text-ink"
            aria-label={isMuted ? 'Ativar som ambiente' : 'Silenciar som ambiente'}
            aria-pressed={!isMuted}
          >
            {isMuted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-ink/5 text-ink-2 backdrop-blur-md transition-colors hover:bg-ink/10 hover:text-ink"
            aria-label="Compartilhar"
            aria-live="polite"
          >
            {shareState === 'copied' ? (
              <Check size={18} className="text-success" aria-hidden="true" />
            ) : (
              <Share2 size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      <motion.div
        variants={staggerContainer(0.12)}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-8 text-center"
      >
        {/* Anel prismático — o gradiente 360º completo (ouro → íris → ciano) reservado pelo brand
            book a "halos, bordas, indicadores e hero sections" (CLAUDE.md §4 regra 3): esta é,
            literalmente, a hero section da plataforma. Padding-ring técnica (mesma do brand book
            preview.html): o conic-gradient vira anel, não disco, porque o miolo é preenchido por
            bg-bg sólido por cima. Estático (sem rotação própria) — os 3 halos de fundo já cobrem o
            movimento; girar o anel também seria redundante com o próprio emblema, que já desenha a
            órbita internamente. */}
        <motion.div
          variants={staggerItem}
          className="relative mb-7 flex h-40 w-40 items-center justify-center rounded-full p-[2px] sm:h-44 sm:w-44"
          style={{
            background:
              'conic-gradient(from 45deg, var(--brand), var(--accent-violet), var(--accent-cyan), var(--brand))',
            boxShadow:
              '0 0 45px -6px color-mix(in srgb, var(--accent-violet) 45%, transparent), 0 0 30px -8px color-mix(in srgb, var(--accent-cyan) 40%, transparent), 0 0 25px -6px color-mix(in srgb, var(--brand) 45%, transparent)',
          }}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-bg">
            <BirthHubLogo
              variant="symbol"
              className="h-32 w-32 sm:h-36 sm:w-36"
              title={BRAND.name}
            />
          </div>
          {/* Pontos de órbita — ecoam os 3 acentos que o próprio anel usa (ouro/íris/ciano),
              estáticos, sem estado novo pra comunicar além do que o anel já comunica. */}
          <span
            aria-hidden="true"
            className="absolute -right-1 top-2 h-2 w-2 rounded-full bg-accent-cyan"
            style={{ boxShadow: '0 0 10px var(--accent-cyan)' }}
          />
          <span
            aria-hidden="true"
            className="absolute bottom-3 -left-1 h-1.5 w-1.5 rounded-full bg-accent-violet"
            style={{ boxShadow: '0 0 10px var(--accent-violet)' }}
          />
        </motion.div>

        <motion.div variants={staggerItem} className="mb-5 space-y-1.5">
          <h1>
            <BirthHubWordmark className="text-3xl sm:text-4xl md:text-5xl" />
          </h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand sm:text-xs">
            {BRAND.ecosystemLabel}
          </p>
        </motion.div>

        <motion.p
          variants={staggerItem}
          className="mx-auto max-w-xl text-base leading-relaxed text-ink-2 md:text-lg"
        >
          {BRAND.tagline}
        </motion.p>

        <motion.ul
          variants={staggerItem}
          className="mt-7 flex flex-wrap items-center justify-center gap-2.5"
        >
          {BRAND.pillars.map((pillar) => {
            const Icon = PILLAR_ICONS[pillar];
            return (
              <li
                key={pillar}
                className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-surface/30 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand backdrop-blur-md transition-colors duration-300 hover:border-brand hover:shadow-glow-brand"
              >
                <Icon size={14} aria-hidden="true" />
                {pillar}
              </li>
            );
          })}
        </motion.ul>

        <motion.div variants={staggerItem} className="mt-9 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleExplore}
            className="group inline-flex items-center gap-2.5 rounded-full bg-brand px-8 py-4 text-sm font-bold uppercase tracking-[0.12em] text-on-brand transition-[transform,background-color,box-shadow] hover:scale-[1.03] hover:bg-brand-active hover:shadow-glow-brand active:scale-95"
          >
            Explorar Hub
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
          <p className="text-[11px] text-ink-2">Acesso rápido à plataforma gerencial</p>
        </motion.div>
      </motion.div>

      <footer className="relative z-10 w-full border-t border-line bg-surface/60 px-6 pb-6 pt-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3.5 text-center">
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-ink-2">
              Liderança Estratégica
            </p>
            <p className="text-xs font-semibold text-ink sm:text-sm">{BRAND.credit}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {BRAND.support.whatsapp.href &&
              (() => {
                const [label, value] = splitChannelLabel(BRAND.support.whatsapp.label);
                return (
                  <ContactChip
                    href={BRAND.support.whatsapp.href}
                    label={label}
                    value={value}
                    iconClassName="bg-success/15 text-success"
                    icon={<MessageCircle size={14} aria-hidden="true" />}
                  />
                );
              })()}
            {BRAND.support.phone.href &&
              (() => {
                const [label, value] = splitChannelLabel(BRAND.support.phone.label);
                return (
                  <ContactChip
                    href={BRAND.support.phone.href}
                    label={label}
                    value={value}
                    iconClassName="bg-brand/15 text-brand"
                    icon={<Phone size={14} aria-hidden="true" />}
                  />
                );
              })()}
          </div>

          {BRAND.social.length > 0 && (
            <ul className="flex gap-4 pt-1">
              {BRAND.social.map(({ href, label }) => {
                const Icon = SOCIAL_GLYPHS[label];
                return (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      className="block text-ink-2 transition-colors hover:text-ink"
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </footer>
    </main>
  );
}
