/**
 * Classes Tailwind de acento da marca.
 *
 * Existia para resolver um problema que não existe mais: as ferramentas do
 * IntelligenceHub tinham cores roxo/rosa fixas, herdadas de um nome de produto
 * antigo ("Nexus"), e este hook as trocava entre laranja e azul conforme a marca
 * ativa. Com marca única, o acento é sempre o da Birth Hub 360 — o hook
 * permanece como o lugar canônico dessas combinações (em vez de ~30 telas
 * repetindo `bg-brand/15 border-brand/30`) e para que qualquer ajuste de
 * contraste seja feito num arquivo só.
 *
 * Contraste (fórmula de luminância relativa do WCAG, calculado):
 * Antique Gold (#D4AF37) cru mede 8.74:1 contra a superfície escura, mas só
 * 2.10:1 contra a clara — por isso `text` usa `text-brand-ink` no claro e a cor
 * crua no escuro, mesmo idioma do resto do design system. Superfície de marca
 * sólida (`bg`/`solidBg`) sempre pede `text-on-brand` (Obsidian), nunca branco.
 */
export function useBrandAccent() {
  return {
    /** Texto de acento, não decorativo — reativo a tema. */
    text: 'text-brand-ink dark:text-brand',
    /** Texto de acento em superfície já escura (dentro de card escuro, hero). */
    textSoft: 'text-brand',
    /**
     * Superfície de marca sólida. Emparelhe SEMPRE com `text-on-brand`:
     * ouro é uma cor clara e texto branco em cima mede 2.10:1.
     */
    bg: 'bg-brand',
    /** Cor de texto/ícone obrigatória sobre `bg`/`solidBg`/`selectedBg`. */
    onBg: 'text-on-brand',
    bgSoft: 'bg-brand/15',
    bgSofter: 'bg-brand/10',
    border: 'border-brand',
    borderSoft: 'border-brand/30',
    hoverBorder: 'hover:border-brand/50',
    hoverBg: 'hover:bg-brand/30',
    selectedBg: 'bg-brand/30 border-brand',
    solidBg: 'bg-brand',
    /** Rampa metálica do logotipo — ouro → ouro claro, dentro da mesma família. */
    gradient: 'from-brand to-brand-2',
    gradientVia: 'from-brand via-brand-2 to-brand',
    /**
     * Halo/órbita: aqui — e só aqui — entram o Deep Iris e o Orbit Blue. O brand
     * book reserva o gradiente 360º para "halos, bordas, indicadores e hero
     * sections", nunca como fundo de superfície com texto em cima.
     */
    orbit: 'from-brand via-iris to-orbit-blue',
    glow: 'shadow-glow-brand hover:shadow-glow-brand-strong',
    blobA: 'bg-brand/15',
    blobB: 'bg-iris/15',
  };
}
