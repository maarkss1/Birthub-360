> **Superado em 10/09/2026.** As mudanças descritas aqui (animação em todas as variantes,
> `destructive` via token, variantes `iris`/`cyan`/`pulse`) foram aplicadas diretamente em
> `src/components/ui/Button.tsx` e `src/styles/globals.css` — este componente isolado não é mais
> necessário como protótipo, mas fica como registro/vitrine de referência. Prefira `Button` real.

# NeonTokyoButton — proposta de animação + acentos "Neon Tokyo × Cosmic Gold"

Protótipo isolado gerado a partir do catálogo visual
(`catalogo-visual-birthhub360.html`) e dos mockups Neon Tokyo/Stitch discutidos com o usuário em
10/09/2026. **Não substitui `src/components/ui/Button.tsx`** — é um componente separado para
avaliação visual antes de decidir o que migra para produção.

## O que tem aqui

- `NeonTokyoButton.tsx` — mesma API do `Button` real (`variant`, `size`, `loading`, `asChild`),
  mais 3 variantes propostas: `iris`, `cyan`, `pulse`.
- `neon-tokyo-buttons.css` — tokens `--ntb-iris/cyan/pulse` (propostos, isolados por uma classe
  `.ntb-scope`) e utilitários de glow. Reage à classe `.dark` real do produto (`ThemeContext`) —
  os tokens `--brand`/`--danger` usados aqui **são** os tokens reais de `globals.css`, não cópias.
- `ButtonGallery.tsx` — vitrine com as 9 variantes + estados (loading/disabled/tamanhos), pronta
  pra importar em qualquer tela pra visualizar.

## O que muda em relação ao `Button.tsx` real

1. **Animação em todas as variantes.** Hoje só `default`/`destructive`/`secondary` têm
   `hover:scale`/`active:scale` — `outline`/`ghost`/`link` não têm nenhum feedback de hover. Este
   componente aplica a mesma física (`scale(1.02)` hover, `scale(0.97)` press) nas 9 variantes.
2. **`destructive` usa o token `--danger`** via `color-mix()`, não `bg-red-500`/`bg-red-600` cru —
   `red-500` com texto branco mede ~3.76:1, abaixo do mínimo AA de 4.5:1 (o mesmo tipo de achado
   que já motivou `bg-brand-active`/`text-on-brand` no componente real, ver comentários em
   `Button.tsx`).
3. **3 variantes novas** (`iris`/`cyan`/`pulse`) seguem a regra do brief "Neon Tokyo": nunca
   preenchimento sólido, só borda + glow de texto/sombra no hover/focus, e **só no modo escuro** —
   no claro ficam com borda e texto na cor sólida (AA), sem glow.

## Como ver isto rodando no app

Não criei uma rota nova — evitar mexer em `App.tsx`/roteamento sem isso ser pedido. Pra conferir
visualmente dentro do produto real (com o `ThemeContext` de verdade, então o toggle 🌙/☀️ da
topbar funciona de verdade):

```tsx
import { ButtonGallery } from '@/features/design-lab/neon-tokyo-buttons/ButtonGallery';
// renderize <ButtonGallery /> temporariamente em qualquer tela/rota já existente
```

## Status

Proposta, não produção. Antes de migrar algo daqui para `Button.tsx`:

- Decidir se `iris`/`cyan`/`pulse` entram como variantes reais (precisa de `--iris`/`--orbit-blue`
  neon e `--pulse` novo em `globals.css`, ver plano da Etapa 2).
- Confirmar com `tests/e2e/accessibility.spec.ts` (axe-core) que o `destructive` corrigido não
  quebra nenhuma baseline.
- Rodar `tests/e2e/visual.spec.ts` com `--update-snapshots` se `Button.tsx` for realmente alterado.
