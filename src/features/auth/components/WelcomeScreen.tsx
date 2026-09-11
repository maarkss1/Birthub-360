/* eslint-disable jsx-a11y/media-has-caption -- trilha instrumental sem fala */
import { useRef, useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MessageCircle, Phone, Volume2, VolumeX } from 'lucide-react';
import { clientLogger } from '../../../lib/clientLogger';
import { BRAND } from '../../../config/brand';
import { BirthHubLogo, BirthHubWordmark } from '../../../components/brand/BirthHubLogo';
import { staggerContainer, staggerItem } from '../../../lib/motion';
import { useAuth } from '../../../contexts/AuthContext';

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

/**
 * Tela de entrada (pré-login).
 *
 * Antes era o primeiro passo de um fluxo de duas etapas — boas-vindas com os
 * dois logos e depois `/select-brand` para escolher entre as duas marcas.
 * Com marca única não há o que escolher: a tela virou o portal institucional da
 * Birth Hub 360 e "Continuar" leva direto ao login.
 *
 * Composição centralizada: exceção justificada da regra #2 da Constituição
 * (`.claude/CLAUDE.md` §4/§5), pelos mesmos critérios do Piloto 001 — é um gate
 * institucional pré-marca, de estado único, com uma decisão só ("entrar"). Não
 * há informação real que sustente uma composição assimétrica, e o emblema
 * (que É a tese da marca: núcleo, anel e órbita) é o elemento dominante por
 * direito, não por decoração.
 *
 * Tratamento visual "cósmico" (obsidian + halo dourado/íris/azul, sempre escuro
 * independente do tema do resto do app): pedido explícito do usuário
 * (referência visual fornecida), segunda exceção justificada — mesmo critério
 * do parágrafo acima (gate de estado único, decisão única), aplicado ao MODO em
 * vez de à composição. O halo usa só `--brand`/`--iris`/`--orbit-blue` (a
 * órbita 360º do brand book), nunca cor solta fora de token.
 *
 * Escopo escuro fixo — força `.dark` em `<html>` enquanto a tela está montada e restaura o
 * tema anterior ao sair (efeito abaixo), em vez de um `className="dark"` na raiz local:
 * tentativa real, revertida — os aliases `--color-*` do `@theme` (o que a maioria das
 * utilities do Tailwind consome) são resolvidos UMA VEZ, relativos a `:root`; um `.dark` num
 * wrapper aninhado só re-escopa as variáveis CRUAS, não os aliases herdados — o wrapper local
 * ficava preso no tema claro na prática (achado real de QA visual, não teórico).
 */
export function WelcomeScreen() {
  const navigate = useNavigate();
  const { currentUser, isPending } = useAuth();
  const [isMuted, setIsMuted] = useState(true);
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

  const toggleMute = () => setIsMuted((prev) => !prev);

  // Quem já está autenticado e cai em "/" (ex.: bookmark, PWA instalado) pula direto pro Hub —
  // mesmo guard que já existe em LoginScreen.tsx, replicado aqui porque "/" passou a renderizar
  // este gate em vez do formulário diretamente.
  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }
  if (currentUser) {
    return <Navigate to="/hub" replace />;
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg font-sans text-ink">
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

      {/* Névoa de fundo — órbita 360º (ouro → íris → azul) como halo difuso, uso reservado a
          "halos, bordas, indicadores e hero sections" pelo brand book. Tamanho reduzido em telas
          estreitas: em ~390px de largura um blob grande tingia a tela toda e derrubava o
          contraste do texto por baixo dele (achado real do axe-core em mobile, herdado da versão
          clara desta tela). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 28%, color-mix(in srgb, var(--iris) 20%, transparent) 0%, color-mix(in srgb, var(--orbit-blue) 14%, transparent) 32%, transparent 68%), radial-gradient(circle at 85% 68%, color-mix(in srgb, var(--brand) 12%, transparent) 0%, transparent 50%)',
        }}
      />
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
        className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-iris/14 blur-[90px] sm:-bottom-32 sm:-right-32 sm:h-[420px] sm:w-[420px] sm:blur-[110px]"
      />

      <button
        type="button"
        onClick={toggleMute}
        className="absolute right-6 top-6 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink/5 text-ink-2 backdrop-blur-md transition-colors hover:bg-ink/10 hover:text-ink"
        aria-label={isMuted ? 'Ativar som ambiente' : 'Silenciar som ambiente'}
        aria-pressed={!isMuted}
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <motion.div
        variants={staggerContainer(0.12)}
        initial="hidden"
        animate="show"
        className="relative z-10 flex w-full max-w-3xl flex-col items-center px-6 text-center"
      >
        <motion.div variants={staggerItem} className="relative mb-8 flex items-center justify-center">
          {/* Anéis orbitais — mesma composição da órbita 360º do brand book (núcleo, anel,
              órbita), só que aqui como halo giratório em vez de estático: o emblema real
              (`BirthHubLogo`, gerado do SVG mestre — geometria nunca editada à mão) ganha peso
              visual sem virar decoração vazia, já que É a tese da marca. */}
          <motion.div
            aria-hidden="true"
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-6 rounded-full border sm:-inset-7"
            style={{ borderColor: 'color-mix(in srgb, var(--orbit-blue) 40%, transparent)' }}
          />
          <motion.div
            aria-hidden="true"
            animate={{ rotate: -360 }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-3 rounded-full border border-dashed sm:-inset-3.5"
            style={{ borderColor: 'color-mix(in srgb, var(--iris) 45%, transparent)' }}
          />
          <div
            className="absolute -inset-10 rounded-full blur-3xl sm:-inset-12"
            style={{
              background:
                'conic-gradient(from 45deg, var(--orbit-blue), var(--iris), var(--brand), var(--orbit-blue))',
              opacity: 0.25,
            }}
          />
          <BirthHubLogo
            variant="symbol"
            className="relative h-36 w-36 drop-shadow-[0_0_30px_color-mix(in_srgb,var(--brand)_55%,transparent)] sm:h-40 sm:w-40"
            title={BRAND.name}
          />
        </motion.div>

        <motion.h1 variants={staggerItem} className="mb-5">
          <BirthHubWordmark className="text-3xl sm:text-4xl md:text-5xl" />
        </motion.h1>

        <motion.p
          variants={staggerItem}
          className="mx-auto max-w-xl text-base leading-relaxed text-ink-2 md:text-lg"
        >
          {BRAND.tagline}
        </motion.p>

        <motion.ul
          variants={staggerItem}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {BRAND.pillars.map((pillar) => (
            <li
              key={pillar}
              className="rounded-full border border-brand/30 bg-ink/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand backdrop-blur-md"
            >
              {pillar}
            </li>
          ))}
        </motion.ul>

        <motion.div variants={staggerItem} className="mt-10">
          <button
            type="button"
            onClick={() => {
              if (audioRef.current) audioRef.current.play().catch(() => {});
              navigate('/login');
            }}
            className="group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-brand-2 via-brand to-brand-2 px-8 py-4 text-sm font-bold uppercase tracking-[0.12em] text-on-brand shadow-[0_0_30px_-6px_color-mix(in_srgb,var(--brand)_55%,transparent)] transition-[transform,box-shadow] hover:scale-[1.03] hover:shadow-[0_0_40px_-4px_color-mix(in_srgb,var(--brand)_70%,transparent)] active:scale-95"
          >
            Explorar Hub
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>

        <motion.p
          variants={staggerItem}
          className="mt-14 text-xs font-medium tracking-wide text-ink-2"
        >
          {BRAND.credit}
        </motion.p>
      </motion.div>

      <div className="absolute bottom-6 z-10 flex w-full flex-col items-center gap-4 px-8 text-sm text-ink-2 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          {BRAND.support.whatsapp.href && (
            <a
              href={BRAND.support.whatsapp.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 transition-colors hover:text-ink"
            >
              <MessageCircle size={16} aria-hidden="true" />
              <span>{BRAND.support.whatsapp.label}</span>
            </a>
          )}
          {BRAND.support.phone.href && (
            <a
              href={BRAND.support.phone.href}
              className="flex items-center gap-2 transition-colors hover:text-ink"
            >
              <Phone size={16} aria-hidden="true" />
              <span>{BRAND.support.phone.label}</span>
            </a>
          )}
        </div>
        {BRAND.social.length > 0 && (
          <ul className="flex gap-4">
            {BRAND.social.map(({ href, label }) => {
              const Icon = SOCIAL_GLYPHS[label];
              return (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="block transition-colors hover:text-ink"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
