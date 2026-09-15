import { useId } from 'react';

import { BRAND } from '../../config/brand';

/**
 * Selo de marca em camadas (anel externo → aro claro → anel interno → núcleo
 * cósmico com o "B") — a composição pedida explicitamente pelo usuário a
 * partir de um mockup HTML de referência (`LOGIN_BIRTH_HUB_FINAL.html`,
 * Desktop/Arquivos), usada no painel de marca da tela de login.
 *
 * Diferente de `BirthHubLogo` (o emblema vetorial oficial, com a coroa de
 * traços e proporções do brand book — não editar geometria lá): este é um
 * componente NOVO, construído em CSS/SVG a partir da mesma paleta e do mesmo
 * glifo "B" real (reaproveitado, não redesenhado à mão), só que na moldura de
 * anéis em camadas do mockup. Os dois convivem: `BirthHubLogo` continua sendo
 * o emblema institucional (sidebar, topbar, e-mail, PDF); este é uma variação
 * de composição para heroes/telas de entrada onde esse tratamento específico
 * foi pedido.
 *
 * As cores do mockup original (ciano/violeta/âmbar neon, fora da paleta) foram
 * substituídas pela órbita real de 5 cores (dourado→vermelho→rosa→íris→azul,
 * `.bg-gradient-orbit5`). O "B" é cor sólida, nunca gradiente recortado em
 * texto (regra #3 da constituição) — a sensação de metal vem de duas camadas
 * de sombra (offset+blur reais, não um glow de opacidade zero), não da
 * tipografia em si. Sem rotação contínua: um anel girando sem parar não
 * comunica nenhum estado (regra de motion, seção 8) — o mockup tinha um anel
 * tracejado com `animate-spin-slow` puramente decorativo, removido aqui.
 */
export function BrandEmblemBadge({ className, title }: { className?: string; title?: string }) {
  const uid = useId().replace(/:/g, '');
  const labelling = title
    ? { role: 'img' as const, 'aria-label': title }
    : { 'aria-hidden': true, focusable: false as const };

  return (
    <div className={`relative isolate ${className ?? ''}`}>
      {/* Anel externo — órbita de 5 cores, mesma sequência de .bg-gradient-orbit5. Espessura em
          % (não px) para escalar corretamente entre o selo grande (desktop) e o pequeno
          (mobile-only), onde um anel de largura fixa ficaria imperceptível ou desproporcional. */}
      <div
        className="h-full w-full rounded-full p-[6%]"
        style={{
          backgroundImage: `conic-gradient(from 0deg, ${BRAND.colors.brand}, ${BRAND.colors.red}, ${BRAND.colors.pink}, ${BRAND.colors.iris}, ${BRAND.colors.orbitBlue}, ${BRAND.colors.brand})`,
          boxShadow: `0 0 28px -4px ${BRAND.colors.brand}B3`,
        }}
      >
        {/* Aro claro — separa o anel externo do interno, efeito de borda metálica. */}
        <div
          className="grid h-full w-full place-items-center rounded-full p-[4%]"
          style={{ backgroundColor: BRAND.colors.blossom }}
        >
          {/* Anel interno — mesma órbita, ângulo inicial diferente para dar profundidade. */}
          <div
            className="h-full w-full rounded-full p-[5%]"
            style={{
              backgroundImage: `conic-gradient(from 200deg, ${BRAND.colors.iris}, ${BRAND.colors.orbitBlue}, ${BRAND.colors.brand}, ${BRAND.colors.red}, ${BRAND.colors.pink}, ${BRAND.colors.iris})`,
            }}
          >
            {/* Núcleo — fundo cósmico escuro, o "B" real da marca (mesmo glifo vetorial de
                BirthHubLogo, cor sólida) por cima. */}
            <div
              className="relative grid h-full w-full place-items-center overflow-hidden rounded-full border"
              style={{
                backgroundImage: `radial-gradient(circle at 35% 30%, ${BRAND.colors.orbitBlue}40 0%, ${BRAND.colors.iris}59 40%, ${BRAND.colors.obsidian} 80%)`,
                borderColor: `${BRAND.colors.blossom}33`,
              }}
            >
              <svg
                viewBox="0 0 256 256"
                className="h-[58%] w-[58%]"
                xmlns="http://www.w3.org/2000/svg"
                {...labelling}
              >
                {/* Sombra do glifo — offset + blur reais (não um glow de opacidade zero),
                    dá o relevo "metal gravado" sem recorrer a gradiente em texto. */}
                <path
                  fill="#000000"
                  opacity="0.45"
                  transform="matrix(0.0740 0 0 -0.0740 107.45 157.20)"
                  d={B_GLYPH_PATH}
                />
                <path
                  fill={`url(#beb-gold-${uid})`}
                  transform="matrix(0.0740 0 0 -0.0740 104.45 154.20)"
                  d={B_GLYPH_PATH}
                />
                <defs>
                  <linearGradient id={`beb-gold-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={BRAND.colors.brandAccent} />
                    <stop offset="1" stopColor={BRAND.colors.brand} />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Glifo "B" real da marca — mesmo path de BirthHubLogo (variant="symbol"), reaproveitado
// (não redesenhado à mão). Geometria vem do arquivo-mestre em identidade-visual/birthhub360/logos/.
const B_GLYPH_PATH =
  'M450.4 707Q574.2 707 627.9 670.8Q681.6 634.6 681.6 573.4Q681.6 520.8 646.8 476.7Q612 432.6 547 404.5Q482 376.4 391 370.8Q511 369.4 573.8 326.1Q636.6 282.8 636.6 218.2Q636.6 165.8 612.2 125.1Q587.8 84.4 543.2 56.4Q498.6 28.4 436 14.2Q373.4 0 297 0Q267.8 0 227.6 1.5Q187.4 3 121 3Q94.8 3 63.8 2.5Q32.8 2 3.7 1.5Q-25.4 1 -45 0L-41 20Q-7 22 12 28Q31 34 42 52Q53 70 62 106L194 602Q201.8 632.8 202.4 651.3Q203 669.8 188.5 678.5Q174 687.2 135 688L140 708Q159.6 707 188.2 706.5Q216.8 706 247.7 705.5Q278.6 705 303 705Q353.2 705 385.7 706Q418.2 707 450.4 707ZM266 359 270 376H339.2Q393.8 376 430.6 407.9Q467.4 439.8 486.2 490.8Q505 541.8 505 596.8Q505 636.6 491.5 662.3Q478 688 438.6 688Q413 688 401 674.1Q389 660.2 378 617L243 106Q238.2 86.4 235.7 67.1Q233.2 47.8 242.2 35.4Q251.2 23 278.8 23Q331.6 23 368.9 53.4Q406.2 83.8 426.6 132.9Q447 182 447 237.2Q447 270.4 437.2 297.9Q427.4 325.4 404.3 342.2Q381.2 359 341.6 359Z';
