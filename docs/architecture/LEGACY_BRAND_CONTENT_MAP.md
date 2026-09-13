# Legacy Brand Content Map — BIRTHUB-BRAIN-REORG / Onda C0

- **Agente responsável:** 11 — Marca e Ativos Institucionais.
- **Data:** 2026-09-10.
- **Método:** varredura completa (grep/glob case-insensitive) por "AtlasGR"/"Atlas GR"/"atlasgr",
  "Total Trac"/"TotalTrac"/"totaltrac", `atlasgroficial`, domínios antigos, cores hardcoded da
  paleta anterior (`#FF5618`/`#008FCE`/`#374898`) e nomes de arquivo/pasta com "atlas", em todo o
  repositório. **Nenhum arquivo de `src/`, infraestrutura ou configuração foi alterado** — só
  lido e classificado.
- **Escala encontrada:** 444 arquivos com "atlasgr" (1.042 ocorrências) e 93 arquivos com
  "totaltrac" (305 ocorrências). Dado o volume, agrupado por módulo/padrão em vez de listado
  linha a linha onde a repetição é óbvia (ex.: build estático do Next.js).

## 1. Achado mais importante desta rodada: nem toda ocorrência é resíduo

A maioria do volume bruto (>50 dos ~70 grupos catalogados) é **categoria B/C/F/G** —
histórico documentado corretamente, compatibilidade deliberada (app IDs móveis, deep links já
publicados), ou dado de negócio válido (`src/config/playbooks.ts` e toda a cadeia de consumidores
do enum `'atlasgr' | 'totaltrac'`, ~30 arquivos confirmados). **Não fazer search-and-replace cego**
— a missão original já alertava para isso e a varredura confirma que seria destrutivo.

O valor real deste documento está nos **achados concretos de categoria A/D/E** abaixo, que são
poucos, específicos, e acionáveis.

## 2. Achados que exigem ação (classes A, D, E — resumo priorizado)

### 2.1 Risco operacional — infraestrutura pode estar apontando para nome antigo (categoria C, risco alto)

| Local                                                                   | Achado                                                                             | Risco                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `charts/prospector-atlas/values.yaml`                                   | `repository: ghcr.io/maarksn/central-de-inteligencia-comecial-atlasgr`             | **Alto** — se o registro de containers (GHCR) já foi renomeado para acompanhar o rebranding, `pull` da imagem falha. Se não foi renomeado, é dependência real viva. **Não confirmado nesta rodada — requer verificação antes de qualquer decisão.** |
| `argocd/application-production.yaml`, `argocd/application-homolog.yaml` | `repoURL: https://github.com/MaarksN/CENTRAL-DE-INTELIGENCIA-COMECIAL-ATLASGR.git` | **Alto** — mesmo risco: o diretório local já se chama `Birthub-360`; se o remoto real também mudou de nome, o GitOps de produção/homologação pode estar rodando contra uma URL que só funciona por redirecionamento temporário do GitHub.           |

Estes dois **não são resíduo cosmético** — são possível causa-raiz de falha silenciosa de deploy.
Handoff aberto para 10 (Infraestrutura/SRE), prioridade alto (§4).

### 2.2 Cor da marca antiga em produto renderizado para o cliente final (categoria D, risco médio-alto)

| Local                                                                     | Achado                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/email/meetingInvite.ts:127`                                      | Botão inline no HTML do e-mail transacional real de convite de reunião ("Acessar Google Meet") usa `background:#FF5618` (laranja AtlasGR) em vez do token `--brand`/Antique Gold atual. **E-mail real enviado a clientes hoje.** |
| `src/features/commercial-intelligence/application/executiveExport.ts:206` | CSS inline de exportação executiva usa `border-bottom:2px solid #ff5618`.                                                                                                                                                        |

Diferente do comentário em `globals.css:493` (que só _documenta_ o contraste da cor antiga como
contexto histórico — categoria B, sem risco), estes dois **efetivamente renderizam** a cor errada
em artefatos reais entregues ao usuário. Handoff para 03/11 (§4).

### 2.3 Vazamento de dado de uma organização específica para todos os tenants (categoria D, risco médio)

`src/config/module-catalog.ts` — módulo `'treinamento-atlasgr'` (ativo, roteado em `App.tsx`) tem
URLs hardcoded para sistemas internos da operação AtlasGR original: `connect.atlasgr.com.br`,
`newconnect.atlasgr.com.br`, `perfil-securitario.atlasgr.com.br`, `atlasgr.bitrix24.com.br`,
`webmail.atlasgr.com.br`. Como o ICP declarado hoje (`src/config/brand.ts`) é "qualquer empresa com
área comercial", qualquer tenant novo da Birth Hub 360 vê atalhos para sistemas internos de uma
empresa terceira. Handoff para 01 (§4).

Correlato: `getTenantFromEmail()` em `src/config/access-policy.ts` ainda infere um rótulo
`'atlasgr'|'totaltrac'` por substring de domínio de e-mail para exibição de segmento — heurística
que deveria vir de configuração por organização, não de string matching. Mesmo handoff.

### 2.4 Política de autorização morta que pode ser confundida com controle de segurança ativo (categoria A, risco médio)

`infrastructure/opa/policies/tenancy.rego` (package `atlasgr.tenancy`, regras
`brand_allowed`/`cross_brand_violation`) — **confirmado via grep em todo `src/`: nenhum código
consulta este endpoint OPA** (só `rbac.rego` é consultado, por `src/middleware/opa.ts` e
`src/lib/auth/authorization.ts`). O comentário do próprio arquivo o descreve como "a prova técnica"
de isolamento de tenant — se alguém tratar esse arquivo como controle real numa auditoria de
segurança, a conclusão seria incorreta. Handoff para 15/01A (§4) — risco de governança, não de
dado vazado (a policy nunca rodou, então nunca bloqueou nem liberou nada de verdade).

`infrastructure/opa/policies/rbac.rego` (package `atlasgr.rbac`) é diferente: **esse sim é
consultado ao vivo** — não é resíduo, é nome técnico (namespace) carregando a marca antiga.
Categoria D, risco baixo-médio, mesmo handoff (renomear exige trocar o package e a URL chamada
juntos, ou a policy para de responder).

### 2.5 Portais estáticos legados ainda servindo a marca antiga ao usuário final (categoria E, risco médio)

Confirmado **ativos** (roteados em `App.tsx`, consumidos via iframe):

- `public/tools/treinamento-atlasgr/` — portal de treinamento comercial completo (Next.js export
  estático), incluindo kit de marca antigo (`brand/atlas-logo*.svg`) e paleta antiga. Maior
  concentração de arquivos do repositório (>200), majoritariamente metadado de build repetitivo.
- `public/tools/propostas/`, `public/tools/social-selling/`, `public/tools/hub-inteligencia-marketing/`
  — mesma situação em menor escala (`Atlas GR Pipeline.html`, `AtlasGR Kit Campanha LinkedIn
Completo.html`, `atlas-logo-positive.png`, scripts `etl_*_atlas.py`).

**Não são código morto** — são conteúdo de negócio real, ainda em rota ativa, com a marca errada
visível para quem usa a função hoje. Handoff para 11 (§4), não bloqueador (é inconsistência
visual/institucional, não falha funcional).

**Não confirmado — requer verificação antes de decidir:** `public/tools/portal-comercial/`
(arquivos `totaltrac-*.html` espelhando o padrão de duas-marcas antigo) não tem nenhuma referência
encontrada em `src/`, mas a ausência de link direto fora do roteador React não foi 100% descartada
(ex.: link em e-mail/documento externo). Tratar como candidato a remoção, não remover sem essa
confirmação — exatamente a cautela que `.agents/prompts/11-marca-institucional.md` já pede.

### 2.6 Prompt de agente desatualizado (achado sobre o próprio programa, não sobre o produto)

`.agents/prompts/11-marca-institucional.md` cita `identidade-visual/atlasgr/`,
`identidade-visual/totaltrac/`, `public/atlas-logo.svg`, `public/totaltrack-logo.png` como pastas
existentes — **nenhuma existe mais** (confirmado: só `identidade-visual/birthhub360/` e
`public/brand/` com os 3 SVGs oficiais). Um agente que seguir esse prompt ao pé da letra procura
pastas que não existem. Não é ação deste programa corrigir prompts oficiais (`AGENTS.md`: "nenhum
agente edita o próprio prompt... mudança de prompt é decisão humana"), mas fica registrado para
quem tiver essa autoridade.

## 3. Categorias sem ação necessária (referência, não exaustivo — ver relatório completo do

levantamento na íntegra em `.agents/handoffs/onda-c0/` se precisar do detalhe arquivo-a-arquivo)

- **F confirmada** (~30 arquivos): `src/config/playbooks.ts` e toda a cadeia real de consumo
  (`src/features/playbook/**`, `src/features/intelligence/**`, `chatbook`, `icp-options.ts`,
  `VoiceCommandWidget.tsx`, testes de enum) — dado de negócio válido, nada a fazer.
- **G confirmada** (5 itens): campos `brand` em `prisma/schema.prisma` e migrations já aplicadas —
  exigem migration se um dia forem renomeados, não bloqueador agora.
- **C confirmada, risco aceito e documentado** (~15 itens): `BrandContext.tsx` (limpeza de estado
  legado de clientes antigos, ainda necessário), `applicationId`/deep link scheme
  Android/iOS/Capacitor (`br.com.atlasgr.prospector`), domínio `app.atlasgr.com.br` (débito
  rastreado com handoff próprio já existente, `onda-8/09-para-08-10-...`) — compatibilidade real,
  já com plano ou já aceita.
- **B confirmada** (~25 grupos): toda a documentação histórica (`AGENTS.md`, `.claude/CLAUDE.md`,
  `.agents/runs/`, `.agents/handoffs/`, `docs/`, comentários explicativos em código) — precisão
  histórica correta, não resíduo.
- **H** (1 item): `.gitleaksignore` referencia um nome de variável de segredo antigo
  (`ATLASGR_WEBHOOK_SECRET`), já triado pelo processo de segurança do projeto como não-sensível.
  Nenhum valor reproduzido aqui nem no levantamento original.

## 4. Handoffs abertos por este documento

- `.agents/handoffs/onda-c0/11-para-10-argocd-ghcr-nome-antigo.md` (**alto**) — §2.1.
- `.agents/handoffs/onda-c0/11-para-03-cor-marca-antiga-em-producao.md` (normal) — §2.2.
- `.agents/handoffs/onda-c0/11-para-01-url-hardcoded-tenant-especifico.md` (normal) — §2.3.
- `.agents/handoffs/onda-c0/11-para-15-opa-tenancy-policy-morta.md` (normal) — §2.4.
- `.agents/handoffs/onda-c0/11-para-00-portais-estaticos-marca-antiga.md` (normal) — §2.5.

## 5. Contagem final por classificação

| Classe |                      Significado | Itens/grupos |
| ------ | -------------------------------: | ------------ |
| A      |                    Remover agora | 4            |
| B      |             Manter por histórico | ~25 grupos   |
| C      |       Manter por compatibilidade | ~15          |
| D      |         Mover para tenant/config | 7            |
| E      |             Mover para demo data | 6 grupos     |
| F      | Mover para playbook (já correto) | ~30 arquivos |
| G      |                  Exige migration | 5            |
| H      |            Segredo (já mitigado) | 1            |
