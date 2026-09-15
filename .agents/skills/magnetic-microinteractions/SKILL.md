---
name: magnetic-microinteractions
description: Cria e revisa microinterações táteis e magnéticas para botões, links, cards e outros controles em React/Tailwind, com hover, active, focus-visible, transições e movimento acessível. Use ao criar ou melhorar elementos clicáveis, estados de interação, feedback ao toque/mouse, efeitos glow, ghost-to-solid, icon-slide, glassmorphism, elevação de cards ou magnetismo com Framer Motion.
---

# Microinterações Magnéticas — Birth Hub 360º

Fazer cada controle responder imediatamente sem sacrificar acessibilidade, desempenho ou a
consistência visual do produto.

## Fluxo obrigatório

1. Identificar se o elemento realmente é interativo. Não aplicar hover, elevação ou cursor de clique
   a cards meramente informativos.
2. Reutilizar primeiro os componentes e variantes existentes em `src/components/ui/`, os tokens de
   `src/styles/globals.css` e os hooks de `src/lib/motion.ts`.
3. Para qualquer componente tocado, carregar também as skills `design-system`, `accessibility` e
   `motion-design`. Carregar `performance` quando houver listas grandes, animação contínua ou lógica
   executada em muitos itens.
4. Preservar todos os estados: default, hover, active, `focus-visible`, disabled, loading e erro.
5. Validar teclado, ponteiro, toque e `prefers-reduced-motion`; não considerar a inspeção estática
   como prova de funcionamento.

## Base tátil

Aplicar a elementos clicáveis uma resposta equivalente a:

```tsx
className="transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:transform-none disabled:opacity-50"
```

- Usar `duration-200` para controles frequentes e `duration-300` para cards ou transformações mais
  amplas. Evitar durações superiores em feedback direto.
- Garantir mudança visual imediata no hover, escolhendo conforme o contexto cor/opacidade, escala ou
  sombra. Não empilhar todos os efeitos se isso gerar ruído.
- Manter `active:scale-95` em botões quando a redução não deslocar layout, conteúdo vizinho ou alvo
  de toque. Usar `active:scale-[0.98]` em controles grandes.
- Não remover o feedback de foco. Hover nunca substitui `focus-visible`.
- Não animar `width`, `height`, `top` ou `left` quando `transform` e `opacity` resolverem.
- Desabilitar transformação em controles disabled/loading para não sugerir uma ação indisponível.

## Escolher um efeito principal por contexto

### Glow

Usar em uma ação primária escura ou de alta ênfase. Fazer a sombra derivar de um token existente e
intensificá-la somente no hover; não criar glow pulsante ou infinito.

### Ghost to solid

Usar em ações secundárias: fundo transparente, borda sutil e preenchimento contrastante no hover.
Confirmar contraste AA tanto antes quanto depois da transição.

### Icon slide

Usar `group` no botão e mover o ícone discretamente:

```tsx
<ArrowRight
  aria-hidden="true"
  className="transition-transform duration-200 ease-in-out group-hover:translate-x-1"
/>
```

O ícone deve existir no layout antes do hover para não provocar reflow. Ícones decorativos recebem
`aria-hidden="true"`.

### Glassmorphism

Usar apenas sobre fundo que torne a transparência perceptível, com combinação semelhante a
`border border-white/20 bg-white/10 backdrop-blur-md`. Fornecer contraste legível e fallback visual;
não usar blur em massa em listas ou superfícies de baixo desempenho.

### Magnetismo

Reservar para CTAs singulares ou ações de destaque, não para cada linha de tabela. Reutilizar
`useMagnetic(strength)` de `src/lib/motion.ts`, que já contempla redução de movimento. Manter o
deslocamento curto, o alvo clicável estável e a ativação independente da posição visual.

## Cards e links

- Em cards clicáveis, usar elevação sutil como
  `transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl active:scale-[0.99]`.
- Tornar o card um `<a>` ou `<button>` real sempre que possível. Se houver ações aninhadas, não
  transformar o card inteiro em um controle que produza HTML interativo inválido.
- Em cards estáticos, não simular clicabilidade. Animar somente um controle real dentro deles.
- Em links, combinar mudança suave de cor/sublinhado com foco visível. Evitar escala em texto inline,
  pois ela pode perturbar a leitura e o fluxo da linha.

## Framer Motion e redução de movimento

Usar Tailwind para estados simples. Usar Framer Motion apenas quando houver magnetismo, gesto,
entrada/saída ou coordenação que CSS não expresse bem. Reutilizar variantes e springs de
`src/lib/motion.ts`; não criar outra biblioteca ou valores ad hoc.

Todo movimento deve preservar a informação com `prefers-reduced-motion: reduce`. A redução pode
remover deslocamento e escala, mas deve manter feedback não espacial por cor, borda ou sombra.

## Checklist de saída

- [ ] Todo controle tocado tem hover, active, `focus-visible`, disabled e transição coerentes.
- [ ] O efeito principal corresponde à hierarquia da ação e não compete com outros efeitos.
- [ ] Cards estáticos não parecem clicáveis; cards clicáveis funcionam por teclado e toque.
- [ ] Nenhuma transformação causa reflow, corte por `overflow` ou colisão com conteúdo adjacente.
- [ ] Alvos de toque mantêm pelo menos 44 × 44 CSS px quando aplicável.
- [ ] Contraste AA permanece válido em todos os estados.
- [ ] `prefers-reduced-motion` mantém feedback sem movimento significativo.
- [ ] Lint, typecheck e o teste de acessibilidade/fluxo afetado foram executados.
