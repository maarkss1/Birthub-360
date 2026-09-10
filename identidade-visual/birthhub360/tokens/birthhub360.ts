/**
 * Birth Hub 360º — tokens de marca em TypeScript.
 *
 * Espelho de `birthhub360.css` / `birthhub360.json` para consumo em código que
 * precisa do valor bruto (geração de SVG, e-mail transacional, canvas, PDF).
 * Em componentes React use os tokens de produto (`bg-brand`, `text-ink` …) de
 * `src/styles/globals.css` — não importe hex daqui para estilizar UI.
 */
export const BIRTHHUB_COLORS = {
  /** Profundidade. Base institucional escura. */
  obsidian: '#0B132B',
  /** Fundo de página do brand book, um degrau abaixo do Obsidian. */
  midnight: '#08090F',
  /** Inteligência em movimento. Cor de apoio da órbita. */
  iris: '#5B21B6',
  /** Valor, foco e assinatura. Cor primária de marca. */
  gold: '#D4AF37',
  /** Respiro. Texto sobre superfícies escuras. */
  snow: '#F8FAFC',
  /** Terceira cor da órbita (`oklch(52% 0.19 255)` convertida para sRGB). */
  blue: '#0065D2',
  goldLight: '#F7E9B8',
  goldDeep: '#8C6D1F',
  goldSoft: '#EBD689',
  /** Superfície clara institucional (páginas claras do brand book). */
  parchment: '#E9E4D9',
} as const;

export const BIRTHHUB_FONTS = {
  display: '"Bodoni Moda", Georgia, "Times New Roman", serif',
  sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
} as const;

export type BirthHubColor = keyof typeof BIRTHHUB_COLORS;
