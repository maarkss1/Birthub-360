import { motion, useAnimationControls } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { EASE_OUT_EXPO, EASE_PREMIUM } from '../../lib/motion';
import { BrandEmblemBadge } from '../brand/BrandEmblemBadge';

/** Módulo que o usuário acabou de escolher na barra lateral e de onde o "selo" decola. */
export interface NavLaunch {
  label: string;
  Icon: LucideIcon;
  /** Valor CSS do matiz do módulo (ex.: `var(--nav-c-blue)`). */
  accent: string;
  /** Centro do ícone clicado, em coordenadas da viewport — ponto de partida do voo. */
  from: { x: number; y: number };
}

const TOKEN_SIZE = 120;
const ICON_TILE_SIZE = 28;
// Duração de cada fase (s). Total ≈ 1s: é uma ferramenta de uso repetido, não uma vitrine.
const FLY_S = 0.32;
const SPIN_S = 0.55;
const HOLD_MS = 150;
// Meio-giro a mais que voltas completas: termina com a face do logo virada para o usuário.
const SPIN_END_DEG = 900;

/**
 * Transição de abertura de módulo: o ícone clicado voa até o centro da tela com zoom, gira rápido
 * (moeda: uma face é o ícone do módulo, a outra o logo da marca) e, ao pousar no logo, dispara
 * `onFinish` — quem chama navega para o módulo escolhido.
 *
 * Comunica estado real (a ferramenta está carregando/abrindo) e mantém a marca visível. Só anima
 * `transform`/`opacity`. Quem monta este componente decide quando NÃO usá-lo (movimento reduzido,
 * navegador automatizado, tecla modificadora) — ver `Sidebar.tsx`. Clique no fundo ou Escape pulam
 * o resto da animação e abrem o módulo na hora.
 */
export function NavLaunchTransition({
  launch,
  onFinish,
}: {
  launch: NavLaunch;
  onFinish: () => void;
}) {
  const token = useAnimationControls();
  const finished = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onFinishRef.current();
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: roda uma vez por montagem — `finish` só lê refs e `token` é estável por contrato do hook
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await token.start({
        x: 0,
        y: 0,
        scale: 1,
        transition: { duration: FLY_S, ease: EASE_OUT_EXPO },
      });
      if (cancelled) return;
      await token.start({
        rotateY: SPIN_END_DEG,
        scale: [1, 1.14, 1],
        transition: {
          rotateY: { duration: SPIN_S, ease: EASE_PREMIUM },
          scale: { duration: SPIN_S, times: [0, 0.5, 1] },
        },
      });
      if (cancelled) return;
      await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
      if (!cancelled) finish();
    })();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const { Icon, accent, label, from } = launch;
  const dx = from.x - window.innerWidth / 2;
  const dy = from.y - window.innerHeight / 2;

  return createPortal(
    <>
      {/* Anúncio para leitor de tela: a camada visual abaixo é aria-hidden (é só decoração de
          transição), mas "abrindo X" é estado real e precisa ser anunciado. */}
      <span role="status" className="sr-only">
        Abrindo {label}
      </span>
      <motion.div
        className="fixed inset-0 z-[200] grid cursor-pointer place-items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={finish}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-bg/80 backdrop-blur-md" />

        <div style={{ perspective: 900 }}>
          <motion.div
            className="relative"
            style={{ width: TOKEN_SIZE, height: TOKEN_SIZE, transformStyle: 'preserve-3d' }}
            initial={{ x: dx, y: dy, scale: ICON_TILE_SIZE / TOKEN_SIZE, rotateY: 0 }}
            animate={token}
          >
            {/* Face A — ícone do módulo, no matiz dele */}
            <div
              className="absolute inset-0 grid place-items-center rounded-[28px] border border-line bg-surface-elevated shadow-glow-brand"
              style={{ backfaceVisibility: 'hidden', color: accent }}
            >
              <Icon size={56} strokeWidth={1.75} />
            </div>
            {/* Face B — logo da marca */}
            <div
              className="absolute inset-0 grid place-items-center rounded-[28px] border border-line bg-surface-elevated shadow-glow-brand"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <BrandEmblemBadge className="h-[88px] w-[88px]" />
            </div>
          </motion.div>

          {/* Onda de choque única no início do giro: marca o momento em que a moeda "acende" */}
          <motion.span
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-[28px] border-2 border-brand/50"
            style={{
              width: TOKEN_SIZE,
              height: TOKEN_SIZE,
              marginLeft: -TOKEN_SIZE / 2,
              marginTop: -TOKEN_SIZE / 2,
            }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: 2.2, opacity: [0, 0.55, 0] }}
            transition={{ delay: FLY_S, duration: SPIN_S + 0.1, ease: 'easeOut' }}
          />

          <motion.p
            className="absolute left-1/2 top-full mt-6 -translate-x-1/2 whitespace-nowrap font-display text-lg font-semibold text-ink"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: FLY_S + SPIN_S * 0.5, duration: 0.2 }}
          >
            Abrindo {label}
          </motion.p>
        </div>
      </motion.div>
    </>,
    document.body,
  );
}
