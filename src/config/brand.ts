/**
 * Identidade da plataforma — fonte de verdade única em código.
 *
 * Espelha `identidade-visual/birthhub360/` (brand book "Birth Hub 360 Brand Book
 * Cinematic", V2.0). Qualquer texto institucional da aplicação (título da aba,
 * cabeçalho do login, assinatura de e-mail, prompt de IA, splash) sai daqui —
 * não escreva "Birth Hub 360" solto num componente.
 *
 * Antes deste arquivo a identidade vinha de `BRAND_CONFIGS` em
 * `src/contexts/BrandContext.tsx`, um mapa de DUAS marcas trocadas em runtime.
 * A plataforma tem uma marca só agora; o que era "marca ativa" e de fato
 * segmentava conteúdo comercial (playbook, personas, matriz de objeções) virou
 * dado da área comercial, configurável por empresa — ver
 * `src/features/playbook/`.
 *
 * Cores: use os tokens (`bg-brand`, `text-ink`…) em componentes. Os hex abaixo
 * existem para os contextos que não têm CSS — `<meta name="theme-color">`,
 * geração de imagem/PDF, canvas, e-mail transacional.
 */
export const BRAND = {
  id: 'birthhub360',
  /** Nome institucional completo, com o grau. Use em títulos e assinaturas. */
  name: 'Birth Hub 360º',
  /** Sem o grau — para espaços estreitos (sidebar recolhida, chip, breadcrumb). */
  shortName: 'Birth Hub',
  /** O que a plataforma é, em uma linha. */
  slogan: 'Sua central de comando inteligente',
  /** Assinatura completa do brand book (p. 01 e p. 10). */
  tagline:
    'Sua central de comando inteligente: integrando dados, potencializando decisões e acelerando a execução.',
  /** Subtítulo institucional sob o wordmark na tela de entrada (`WelcomeScreen`). */
  ecosystemLabel: 'Ecossistema de Alta Performance',
  description:
    'Ecossistema inteligente e unificado que atua como central de comando 360º para negócios — conectando dados, IA, automações e processos, e transformando o que está disperso em direção clara.',
  /** Os três movimentos da marca: dados → decisões → execução (brand book, p. 02). */
  pillars: ['Inteligência', 'Conexão', 'Execução'] as const,
  /** Valores (brand book, p. 10). Em inglês no original. */
  values: ['Innovation', 'Data Intelligence', 'Efficiency', 'Scalability'] as const,
  colors: {
    /** Antique Gold — cor primária: valor, foco e assinatura. Inalterada na rodada 09/2026. */
    brand: '#D4AF37',
    /** Gold Soft — segundo ponto da rampa metálica do logotipo; também o --ink do tema escuro. */
    brandAccent: '#F0D77B',
    /** Deep Navy — âncora do tema escuro (substitui Obsidian/Midnight; nunca preto puro, 09/2026). */
    obsidian: '#061A3A',
    /** Alias de `obsidian` para código legado que ainda lê `midnight` — mesmo valor. */
    midnight: '#061A3A',
    /** Deep Iris — "roxo" da paleta. Upgrade 09/2026, mais vívido. */
    iris: '#7C3AED',
    /** Orbit Blue — "azul" da paleta. Upgrade 09/2026, mais vívido. */
    orbitBlue: '#1677FF',
    /** "Vermelho" da paleta — novo em 09/2026. */
    red: '#FF3158',
    /** "Rosa" da paleta — novo em 09/2026, quinta cor. */
    pink: '#FF4FA3',
    /** Alias de `blossom` para código legado que ainda lê `snow` — âncora do tema claro agora é
     *  rosada, nunca branco puro (ver `blossom` abaixo). */
    snow: '#FFF4F9',
    /** Blossom White — âncora do tema claro (substitui Snow White, 09/2026). */
    blossom: '#FFF4F9',
  },
  /**
   * Canais de atendimento exibidos na tela de entrada (`WelcomeScreen`).
   *
   * ATENÇÃO — pendente de atualização: estes números vieram da operação
   * anterior e foram PRESERVADOS de propósito, não recriados. Suporte é
   * funcionalidade (é por onde o usuário pede ajuda), então apagá-los junto com
   * a marca antiga tiraria acesso a atendimento sem nada no lugar. Troque pelos
   * canais da Birth Hub 360 assim que existirem — é uma edição só, aqui.
   *
   * Um canal com string vazia simplesmente não é renderizado.
   */
  support: {
    whatsapp: { label: 'Suporte: (16) 98181-8458', href: 'https://wa.me/5516981818458' },
    phone: { label: 'Comercial: (16) 2132-3790', href: 'tel:+551621323790' },
  },
  /**
   * Perfis sociais da plataforma.
   *
   * Vazio de propósito: a lista renderiza sozinha assim que os perfis da Birth Hub 360 forem preenchidos.
   */
  social: [] as ReadonlyArray<{
    href: string;
    label: 'Facebook' | 'Instagram' | 'LinkedIn' | 'YouTube';
  }>,
  /** Crédito institucional exibido na tela de entrada. */
  credit: 'Desenvolvido pelo Coordenador Comercial Marcelo do Nascimento',
  logos: {
    /** Emblema completo. ≥ 96 px. */
    symbol: '/brand/birthhub360-simbolo.svg',
    /** Redução estrutural para ícone/favicon/avatar. 32–96 px. */
    icon: '/brand/birthhub360-icone.svg',
    /** Emblema + logotipo. Assinatura institucional. */
    horizontal: '/brand/birthhub360-logo-horizontal.svg',
  },
} as const;

export type BrandInfo = typeof BRAND;
