/**
 * Vitrine de todas as variantes do NeonTokyoButton — referência visual e de copy-paste, não uma
 * rota de produto. Ver README.md nesta pasta para como abrir isto dentro do app.
 */
import type * as React from 'react';
import { NeonTokyoButton } from './NeonTokyoButton';

const VARIANTS: {
  variant: React.ComponentProps<typeof NeonTokyoButton>['variant'];
  label: string;
  hint: string;
  children: React.ReactNode;
}[] = [
  {
    variant: 'default',
    label: 'default',
    hint: 'ação primária (CTA), 1 por tela',
    children: 'Salvar',
  },
  {
    variant: 'destructive',
    label: 'destructive',
    hint: 'exclusão irreversível',
    children: 'Excluir',
  },
  { variant: 'outline', label: 'outline', hint: 'ação secundária neutra', children: 'Cancelar' },
  {
    variant: 'secondary',
    label: 'secondary',
    hint: 'menor ênfase que outline',
    children: 'Ver detalhes',
  },
  {
    variant: 'ghost',
    label: 'ghost',
    hint: 'terciária, invisível até o hover',
    children: 'Mais opções',
  },
  { variant: 'link', label: 'link', hint: 'navegação inline', children: 'Saiba mais' },
  {
    variant: 'iris',
    label: 'iris (proposta)',
    hint: 'ações de IA/inteligência',
    children: <>✨ Perguntar à IA</>,
  },
  {
    variant: 'cyan',
    label: 'cyan (proposta)',
    hint: 'dados/analytics ao vivo',
    children: <>📡 Ver ao vivo</>,
  },
  {
    variant: 'pulse',
    label: 'pulse (proposta)',
    hint: 'urgente, uso raro',
    children: <>● Responder agora</>,
  },
];

export function ButtonGallery() {
  return (
    <div style={{ padding: 32, background: 'var(--bg)', color: 'var(--ink)', minHeight: '100dvh' }}>
      <h1 className="font-display" style={{ fontSize: 24, marginBottom: 4 }}>
        NeonTokyoButton — vitrine de variantes
      </h1>
      <p style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 24, maxWidth: '70ch' }}>
        Protótipo isolado (não é <code>Button.tsx</code>). Passe o mouse em cada botão — todas as 9
        variantes têm animação de hover/press agora; iris/cyan/pulse também acendem um glow no modo
        escuro. Troque o tema do app (Sol/Lua na topbar) para comparar claro vs. escuro em tempo
        real.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {VARIANTS.map((v) => (
          <div
            key={v.label}
            style={{
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-card)',
              background: 'var(--surface)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <NeonTokyoButton variant={v.variant}>{v.children}</NeonTokyoButton>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{v.label}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>{v.hint}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-display" style={{ fontSize: 18, marginTop: 40, marginBottom: 12 }}>
        Estados
      </h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <NeonTokyoButton loading>Salvando...</NeonTokyoButton>
        <NeonTokyoButton disabled>Indisponível</NeonTokyoButton>
        <NeonTokyoButton size="sm">Pequeno</NeonTokyoButton>
        <NeonTokyoButton size="lg">Grande</NeonTokyoButton>
        <NeonTokyoButton size="icon" aria-label="Favoritar">
          ★
        </NeonTokyoButton>
      </div>
    </div>
  );
}
