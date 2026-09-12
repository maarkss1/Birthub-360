- De: 11
- Para: 03
- Onda: c0
- Status: aberto
- Prioridade: normal

## Problema

Dois artefatos reais entregues ao usuário final ainda usam a cor laranja da marca anterior
(`#FF5618`) hardcoded em vez do token de marca atual (`--brand`, Antique Gold):

1. `src/lib/email/meetingInvite.ts:127` — botão "Acessar Google Meet" no HTML do e-mail
   transacional real de convite de reunião.
2. `src/features/commercial-intelligence/application/executiveExport.ts:206` — borda no CSS
   inline de exportação executiva.

## Arquivo(s) envolvido(s)

`src/lib/email/meetingInvite.ts`, `src/features/commercial-intelligence/application/executiveExport.ts`.

## Alteração necessária

Trocar `#FF5618`/`#ff5618` pelo hex atual de `BRAND.colors.brand` (`src/config/brand.ts`) nos dois
locais — estes são contextos sem CSS (e-mail HTML, export), então hex vindo de `BRAND.colors` é
aceitável (regra da Constituição: "Hex só é aceitável onde não existe CSS... vindo de
`BRAND.colors`, nunca digitado à mão").

## Teste esperado

Gerar um convite de reunião e uma exportação executiva de teste; confirmar visualmente que a cor
corresponde à marca atual.

## Contexto adicional

Diferente do comentário em `globals.css:493` (categoria B, só documenta a cor antiga como contexto
histórico de contraste) — estes dois casos efetivamente renderizam a cor errada em produção.
Detalhado em `docs/architecture/LEGACY_BRAND_CONTENT_MAP.md` §2.2.
