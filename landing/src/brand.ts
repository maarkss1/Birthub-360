/** Subconjunto da identidade (espelha `src/config/brand.ts` da plataforma). */
export const BRAND = {
  name: 'Birth Hub 360º',
  slogan: 'Sua central de comando inteligente',
  ecosystemLabel: 'Ecossistema de Alta Performance',
  description:
    'Ecossistema inteligente e unificado que atua como central de comando 360º para negócios — conectando dados, IA, automações e processos, e transformando o que está disperso em direção clara.',
  credit: 'Desenvolvido pelo Coordenador Comercial Marcelo do Nascimento',
} as const;

/** URL da plataforma; sem a env, cai no caminho relativo (landing servida junto do app). */
export const APP_URL = (import.meta.env.VITE_APP_URL ?? '').replace(/\/$/, '');
export const LOGIN_URL = `${APP_URL}/login`;
