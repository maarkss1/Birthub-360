# Paridade de configuração entre ambientes

**Fonte de verdade única**: [`src/config/env.ts`](../../src/config/env.ts). Não duplicamos a
lista de variáveis obrigatórias aqui — um documento separado decai (alguém adiciona uma variável
no schema e esquece do doc). O schema Zod já é o "lugar único" que o critério de aceite pede, e é
mais forte que um doc: ele **recusa subir** (`process.exit(1)`, `env.ts:329`) se uma variável
obrigatória faltar ou tiver formato errado, em vez de deixar isso ser "descoberto só em produção".

## Como isso cobre o critério de aceite

1. `NODE_ENV` não tem default de propósito (comentário em `env.ts:8-10`) — evita que um deploy que
   esqueça de setá-lo suba silenciosamente como `development` (bypass de auth, CORS permissivo).
2. Toda variável sem `.optional()`/`.default()` no schema é obrigatória em **todo** ambiente onde o
   processo sobe — dev, teste, homologação e produção compartilham o mesmo `envSchema`, não schemas
   divergentes por ambiente. Isso é o que garante paridade: não existe uma variável que só é
   obrigatória "de fato" em produção sem estar no mesmo schema que dev usa.
3. Trava adicional específica de produção (`env.ts:335-342`): `ALLOW_DEV_AUTH_BYPASS=true` com
   `NODE_ENV=production` aborta a inicialização mesmo que alguém tenha configurado errado.
4. `.env.example` (raiz do repo) é o template de referência para preencher localmente, comentado
   variável a variável — mantenha-o em sincronia manual com `env.ts` ao adicionar uma variável nova
   (não há verificação automatizada disso ainda; ver "Lacuna conhecida" abaixo).

## Lacuna conhecida (não corrigida nesta onda — fora do escopo mínimo, registrada como backlog)

Não existe um teste/lint que falhe se `.env.example` ficar desatualizado em relação a `envSchema`
(uma variável nova no schema sem entrada correspondente no `.env.example`). Hoje isso depende de
disciplina manual do PR que adiciona a variável. Risco: baixo (o schema já falha fast-fail
independente do `.env.example` estar certo ou não — o pior caso é alguém preencher `.env.example`
localmente sem saber que uma variável nova existe, e descobrir isso ao rodar `npm run dev`, não em
produção). Backlog sugerido: um script `scripts/verify-env-example.ts` que compara as chaves do
`envSchema` com as chaves comentadas em `.env.example` e falha o CI se divergirem.
