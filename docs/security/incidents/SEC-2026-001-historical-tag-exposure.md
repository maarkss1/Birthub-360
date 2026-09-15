# SEC-2026-001 — Exposição histórica via tag Git `v1.0.0-rc.1`

## Resumo

A tag anotada `v1.0.0-rc.1`, publicada no remote oficial
(`github.com/maarkss1/Birthub-360`), permanecia acessível a qualquer pessoa com acesso de
leitura ao repositório e apontava para um commit anterior à reescrita de histórico ("Caminho B",
`docs/security/runbooks/DECIDE_GIT_HISTORY_REWRITE.md`) executada em 2026-09-05 na branch `main`.
Por ser uma ref independente de branch, a tag não foi tocada por aquele rewrite — `git fetch
--tags && git checkout v1.0.0-rc.1` continuava recuperando um dump real de banco de dados com PII
de prospecção, chaves/credenciais de terceiros e scripts com dado pessoal hardcoded que `main` já
não alcança há mais de uma semana. Esta é a mesma classe de achado já fechada para a tag `v0.0.1`
em 12/09/2026 (ACH-15-01) — `v1.0.0-rc.1` ficou pendente na mesma janela por decisão explícita de
adiar para uma ação dedicada (ver `.agents/completion/01-bloqueadores.md`, linha 51-58).

Nenhuma credencial nova (além das já rotacionadas em sessões anteriores) foi encontrada nesta
investigação. O achado novo desta sessão é o **conteúdo do dump** em si (usuários reais, hashes de
senha, sessões, dados de 27 empresas e 41 contatos de prospecção) — o dump já era conhecido como
"contém PII real", mas seu conteúdo linha-a-linha nunca havia sido inventariado por tabela antes
desta sessão.

## Data de identificação

- Achado original da tag (`v1.0.0-rc.1` alcança os mesmos blobs sensíveis que o rewrite de `main`
  removeu): 2026-09-11 (ACH-15-01, registrado em `DECIDE_GIT_HISTORY_REWRITE.md`).
- Reconfirmação + inventário completo do conteúdo (esta sessão): 2026-09-15.

## Data de remediação

- Remoção da tag do remote: **pendente** — ver "Ações manuais pendentes" abaixo. O ambiente de
  execução desta sessão (Claude Code on the web) só tem credencial git com permissão de push
  restrita à branch de trabalho designada; a tentativa de `git push origin --delete v1.0.0-rc.1`
  foi rejeitada pelo GitHub com HTTP 403 (registrado nas evidências abaixo). Esta é a mesma
  fronteira de autorização que o runbook já documentava ("só o dono humano executa... ação
  destrutiva de ref publicada") — apenas confirmada aqui por um mecanismo técnico independente, não
  só por regra de processo.
- Remoção da tag do clone local desta sessão (ambiente efêmero, sem efeito sobre nenhum clone real
  do dono do repositório): 2026-09-15.

## Vetor de exposição

Tag Git anotada publicada no remote, alcançável por qualquer leitor do repositório via
`git fetch --tags && git checkout v1.0.0-rc.1` — sem necessidade de acesso a nenhum branch
específico, PR ou permissão além de leitura do repositório.

## Tag envolvida

- Nome: `v1.0.0-rc.1`
- Tipo: tag anotada (tag object, não lightweight)
- Tag object SHA: `69bc5d09c8c3ecff2aeefd3325cedfd8be7d6a2b`
- Tagger: `MaarksN` — mensagem "Release Candidate 1.0.0"

## Commit envolvido

- SHA: `e8fb1c1c8270accc7fae51821ea759a0e2e0933b`
- Autor/data: `MaarksN`, 2026-08-21 08:18:03 -0300
- Assunto: "feat(00): Fase Final 5 - Go-Live RC1, resolucao de handoffs bloqueadores e drifts"
- O commit em si (árvore de topo) **não contém** os arquivos sensíveis diretamente — eles estão em
  commits ancestrais desse commit, ainda alcançáveis porque a tag mantém toda a cadeia de
  ancestralidade viva no remote (mesmo mecanismo que a reescrita de `main` existe para cortar).

## Categorias de dados identificadas

Inventário verificado nesta sessão (blobs reachable a partir de `v1.0.0-rc.1` mas não a partir de
`main`/`HEAD` atual — `git rev-list --objects` comparado, `pg_restore --list`/`--data-only` contra
o dump):

| Arquivo                                                                             | Tipo                            | Categoria         | Severidade | Situação atual                                    | Ação necessária                                                    |
| ------------------------------------------------------------------------------------ | -------------------------------- | ------------------ | ---------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| `backups/prospector-20260806-152827.dump` (166075 bytes, pg_dump custom format)      | PII + SECRET + BUSINESS_DATA    | Dump completo de banco | CRITICAL   | Removido de `main` (rewrite 05/09); ainda alcançável via `v1.0.0-rc.1` | Remover a tag (ver abaixo); ver seção LGPD                        |
| ↳ tabela `user` (5 registros: nome, e-mail, hash de senha)                          | PII + SECRET                    | Credencial de usuário | CRITICAL   | Ver "Credenciais identificadas"                    | Confirmar reset de senha (ver Manuais Pendentes)                   |
| ↳ tabela `account` (5 registros: hash de senha do provedor "credential", tokens OAuth nulos) | SECRET                          | Credencial de usuário | HIGH       | Colunas `accessToken`/`refreshToken`/`idToken` = NULL em todos os registros; só `password` (hash) preenchido | Mesma ação da tabela `user`                                          |
| ↳ tabela `session` (7 registros: token de sessão, IP, user-agent)                   | SECRET (mitigado)               | Sessão ativa       | LOW (hoje) | **Todas expiradas em 2026-08-12** — verificável diretamente pela coluna `expiresAt`, hoje é 2026-09-15 (>1 mês vencidas) | Nenhuma — sessões vencidas não são reutilizáveis pelo protocolo de auth |
| ↳ tabela `Company` (27 registros: CNPJ, telefones, e-mails, endereço, dados de enriquecimento) | BUSINESS_DATA + PII (pessoa jurídica) | Dado de prospecção  | HIGH       | Dado real de empresas prospectadas                 | Ver seção LGPD                                                       |
| ↳ tabela `Contact` (41 registros: nome, telefone, WhatsApp, e-mail, cargo)          | PII                              | Dado de prospecção  | CRITICAL   | Dado pessoal real e identificável                  | Ver seção LGPD                                                       |
| ↳ tabela `BitrixConnection` (1 registro: webhook URL AtlasGR completo)              | SECRET                           | Credencial de integração | HIGH   | Rotacionado (SEC-003, ver abaixo)                  | Nenhuma (rotação já confirmada em sessão anterior)                  |
| ↳ tabela `AuditLog` (134 registros: IP, ator, ação)                                 | PII (IP)                         | Log interno         | MEDIUM     | IPs de ambiente local (`127.0.0.1`) — não expõe IP real de usuário final | Nenhuma                                                              |
| ↳ tabelas `Lead`/`TimelineEvent`/`EnrichmentLog`/`Organization`/`AILog`/`AgentMemory` | BUSINESS_DATA                   | Dado comercial interno | MEDIUM  | Dado real de operação comercial em estágio inicial | Ver seção LGPD                                                       |
| ↳ tabelas `WhatsAppMessage`, `GoogleWorkspaceConnection`, `Prospect`, `Note`, `Automation`, `Document`, `KnowledgeDocument`, etc. | —                                | —                  | —          | **0 registros** — tabelas vazias no momento do dump | Nenhuma                                                              |
| `dump.rdb` (821 bytes, Redis RDB v0010)                                             | FALSE_POSITIVE                  | Metadado de fila     | INFORMATIVE | Contém só bookkeeping de filas BullMQ vazias (`bull:*:stalled-check`, sem payload de job real) | Nenhuma — confirmado sem dado sensível                              |
| `scripts/call_bland_juliana.py`                                                    | SECRET + PII                    | Chave de API + telefone pessoal | CRITICAL | Chave Bland AI rotacionada (SEC-003); telefone pessoal de "Juliana" hardcoded | Nenhuma ação de credencial; PII já tratada como achado histórico conhecido |
| `scripts/call_juliana.{js,ts}`, `scripts/call_rodrigo.{js,ts}`                      | PII                              | Telefone pessoal      | HIGH       | Telefones reais de "Juliana"/"Rodrigo" hardcoded; chave de API nesses arquivos é `local-dev-key` (fake) | Nenhuma ação de credencial (não é segredo real nestes arquivos especificamente) |
| `public/tools/extrator-bitrix.html`, `extrator_bitrix (1).html` (múltiplas versões) | SECRET                          | Webhook Bitrix24 (AtlasGR) hardcoded | HIGH | Rotacionado (SEC-003)                              | Nenhuma                                                              |
| `src/features/integrations/bitrix/service/connections.ts` (versão histórica), `src/hooks/useBitrixIntegration.ts` (versão histórica) | SECRET                          | Fallback com webhook Bitrix24 (AtlasGR + TotalTrac) hardcoded | HIGH | Rotacionado (SEC-003); fallback removido do código atual (`.agents/completion/01-bloqueadores.md`, item 3) | Nenhuma                                                              |
| `test-gemini.ts` (×2 variantes), `test-gemini-quota.ts`                            | SECRET                          | Chave Google Gemini hardcoded | CRITICAL | Rotacionada, confirmada pelo dono do repositório em 2026-09-05 (`ROTATE_GEMINI_API_KEY.md`) | Nenhuma                                                              |
| `.env.example`, `.env.test.example`                                                | FALSE_POSITIVE                  | Placeholder           | —          | Só placeholders (`replace-with-a-long-random-secret` etc.), nenhum valor real | Nenhuma                                                              |
| `docker-compose.yml` (versão histórica e atual)                                    | FALSE_POSITIVE                  | Credencial de dev local | —        | `prospector_pass`/`prospector_redis_pass` — default de container local, não usado fora de `docker-compose up` local | Nenhuma                                                              |
| `.agents/runs/final-fase-0.md`, `tests/unit/features/bug-reports/bugReport.sanitize.test.ts`, `tests/mocks/setup.ts`, outros arquivos de teste/CI com string `postgresql://dummy:...@localhost` ou `sk-abcdefghijklmnopqrstuvwx` | FALSE_POSITIVE                  | Fixture de teste       | —          | Valores sintéticos/dummy, usados para testar sanitização/redação | Nenhuma                                                              |

Nenhum arquivo `.env`/`.env.local`/`.env.production` real (fora dos `.example`) foi encontrado em
nenhum ponto do histórico alcançável pela tag.

## Credenciais identificadas

| Credencial                                    | Onde apareceu no histórico                                | Classificação                | Evidência                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Chave Bland AI (`org_...`)                    | `scripts/call_bland_juliana.py` (fallback hardcoded)          | **ROTATED**                   | `.agents/completion/01-bloqueadores.md` (SEC-003, 2026-08-18) — confirmado diretamente pelo dono do repositório; runbook `ROTATE_BLAND_AI_KEY.md` |
| Webhook Bitrix24 AtlasGR (`.../rest/450/...`) | `connections.ts`, `useBitrixIntegration.ts`, `extrator-bitrix.html`, dump (`BitrixConnection`) | **ROTATED**                   | Idem acima (SEC-003); runbook `ROTATE_BITRIX24_WEBHOOKS.md`                                    |
| Webhook Bitrix24 TotalTrac (`.../rest/2486/...`) | `connections.ts` (uma versão histórica)                      | **ROTATED**                   | Idem acima (SEC-003)                                                                            |
| Chave Google Gemini (formato `AQ.*`, Google AI Studio) | `test-gemini.ts`, `test-gemini-quota.ts`                       | **ROTATED**                   | Confirmado pelo dono do repositório em 2026-09-05; `ROTATE_GEMINI_API_KEY.md`, fingerprints suprimidos em `.gitleaksignore` |
| `ATLASGR_WEBHOOK_SECRET` (valor antigo hardcoded `segredo_compartilhado_atlasgr_123`) | Código-fonte histórico de `LeadDetailDrawer.tsx` (commit `9236028b`) | **ROTATION NOT VERIFIED**     | Código atual já é fail-closed (não aceita mais o literal como fallback) — mas **não há confirmação de que o valor real configurado em produção (Render) não seja ainda o literal antigo**. Já registrado como pendência em `GITLEAKS_HISTORICAL_FINDINGS_2026-09-05.md`, item 2 — não fechado nesta sessão por falta de acesso ao dashboard do Render. |
| Hashes de senha de 5 usuários reais (`user.passwordHash`, `account.password`, formato scrypt `hash:salt` do Better Auth) | Dump `backups/prospector-20260806-152827.dump`                 | **MANUAL ACTION REQUIRED**    | Hash, não texto puro — mas coincide na janela de tempo (05-06/08/2026) com o bug já documentado em `.agents/completion/01-bloqueadores.md` item 5 (`reset-passwords.ts` sem alvo resetava TODAS as senhas para `00000000`). Não é possível confirmar ou descartar, sem acesso à base de produção atual, se essas 5 contas ainda usam a senha que estava vigente nesse dump. Ver ação recomendada abaixo. |
| Tokens de sessão (`session.token`, 7 registros)| Dump `backups/prospector-20260806-152827.dump`                 | **NO LONGER VALID**           | `expiresAt` de todos os 7 registros = 2026-08-12, mais de um mês antes da data desta investigação (2026-09-15) — verificável diretamente no dado, sem depender do provedor. |
| Tokens OAuth (`account.accessToken`/`refreshToken`/`idToken`) | Dump `backups/prospector-20260806-152827.dump`                 | **N/A**                       | Todos os 5 registros têm essas 3 colunas `NULL` — nenhum token OAuth real estava presente no dump (só o provedor `credential`, isto é, senha local). |

**Nenhuma credencial nesta lista teve sua rotação verificada diretamente contra o provedor nesta
sessão** (sem acesso de rede a Bland AI/Bitrix24/Google/Render a partir deste ambiente) — as
classificações "ROTATED" acima se apoiam em confirmações humanas já registradas e datadas em
sessões anteriores (ver coluna Evidência), não em uma nova verificação. Isso é consistente com a
instrução deste incidente ("não assuma que trocar o `.env` significa rotação") — a evidência citada
é confirmação humana explícita registrada em runbook, não uma suposição.

## PII identificada

**Categorias presentes no dump histórico** (mapeadas contra `docs/lgpd-base-legal.md`):

- **Identificação do Prospect** (Legítimo Interesse, Art. 7º IX): nome, e-mail profissional, cargo
  — tabela `Contact` (41 registros reais).
- **Contato Direto** (Legítimo Interesse, Art. 7º IX): telefone, WhatsApp — tabela `Contact` e
  campo `phones`/`emails` de `Company`.
- **Dados do Usuário do Sistema** (Execução de Contrato/Obrigação Legal): nome, e-mail corporativo,
  hash de senha — tabela `user` (5 registros reais, incluindo um provável titular da própria conta
  usada nesta sessão — "Comercial"/organização "Comercial's Organization").
- **Dado de pessoa jurídica identificável**: CNPJ, razão social, QSA (quadro societário, incluindo
  nome de sócio-administrador em texto claro) — tabela `Company` (27 registros).
- **Telefone pessoal fora do CRM**: "Juliana" e "Rodrigo" — hardcoded em scripts ad-hoc
  (`call_bland_juliana.py`, `call_juliana.*`, `call_rodrigo.*`), não em tabela do banco. Já
  registrado como achado conhecido (`.agents/completion/01-bloqueadores.md`, item 2).

**Os dados eram reais, fictícios ou anonimizados?** Reais — CNPJ válido verificável na Receita
Federal (`06.537.598/0001-39`, ATLAS GERENCIADORA DE RISCOS LTDA, mencionado no próprio conteúdo
enriquecido do registro), nomes de usuário e organizações correspondentes à operação real descrita
na seção 1 do `.claude/CLAUDE.md` (AtlasGR/TotalTrac). Nenhum indício de dado sintético/anonimizado
nas tabelas com registros.

**Possibilidade de identificação do titular:** Alta para `Contact` (nome completo + telefone/e-mail
direto) e para `user` (nome completo + e-mail + vínculo a uma organização nomeada). Média para os
decisores citados em texto livre no campo `observations`/enriquecimento de `Company` (só primeiro
nome + cargo, sem contato direto nessa tabela).

**Período aproximado de exposição:** O dump foi criado em 2026-08-06. Ficou reachable publicamente
sem gate adicional desde a publicação da tag `v1.0.0-rc.1` (2026-08-21) até a data deste registro
(2026-09-15) — aproximadamente **25 dias** nesta janela específica (a exposição via histórico de
`main` antes do rewrite de 05/09 é um período anterior e distinto, já coberto por
`DECIDE_GIT_HISTORY_REWRITE.md`).

**Forma de acesso possível:** Qualquer credencial com acesso de leitura ao repositório GitHub
(`git fetch --tags && git checkout v1.0.0-rc.1`, ou download do tarball da tag pela UI/API do
GitHub) — não exigia acesso a nenhuma branch específica nem a nenhum segredo adicional.

**Ações de mitigação executadas:** Inventário completo (esta sessão); remoção do clone local desta
sessão; preparação da remoção do remote (bloqueada por permissão da credencial desta sessão — ver
"Ações manuais pendentes").

**Itens que necessitam avaliação humana/jurídica:**

- Requer avaliação do responsável por privacidade/DPO: se a exposição de ~25 dias de PII real de
  prospecção (nome, telefone, e-mail de 41 contatos e QSA de 27 empresas) via uma tag pública
  configura hipótese de comunicação obrigatória à ANPD e/ou aos titulares sob o Art. 48 da LGPD, e
  se algum titular já exerceu direito de exclusão (Art. 18) que precisaria ser re-verificado contra
  esta cópia específica do dado.
- Requer avaliação do responsável por privacidade/DPO: tratamento a dar aos 5 usuários internos do
  sistema cujos hash de senha e e-mail corporativo constavam no dump (força de reset de senha,
  comunicação interna do incidente).

## Timeline

| Data       | Evento                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------ |
| 2026-08-05/06 | Dump `prospector-20260806-152827.dump` gerado (backup real, ambiente de desenvolvimento inicial), commitado em duas linhas de branch paralelas |
| 2026-08-21 | Tag `v1.0.0-rc.1` criada e publicada, apontando para um commit cuja ancestralidade inclui o dump e outros segredos históricos |
| 2026-08-18 | SEC-003/SEC-004 (Sprint 01/Onda 13): rotação de Bland AI + 2 webhooks Bitrix24 confirmada pelo dono do repositório; dump confirmado ainda recuperável no histórico (Caminho A mantido) |
| 2026-09-04/05 | Triagem dos 45 segredos históricos do gitleaks; chave Gemini identificada e rotacionada; decisão revista para Caminho B — `git filter-repo` remove dump + `test-gemini*.ts` de `main` via force-push |
| 2026-09-11/12 | ACH-15-01: achado de que tags publicadas (`v0.0.1`, `v1.0.0-rc.1`) não foram tocadas pelo rewrite e continuam expondo os mesmos blobs; `v0.0.1` removida do remote nesta janela |
| 2026-09-15 | Esta sessão (SEC-2026-001): reconfirmação completa, inventário linha-a-linha do conteúdo do dump, tentativa de remoção de `v1.0.0-rc.1` do remote (bloqueada por permissão da credencial da sessão), remoção do clone local da sessão, documentação deste incidente |

## Mitigação

- `main` já não alcança o dump nem os scripts `test-gemini*.ts` desde o rewrite de 2026-09-05
  (Caminho B, verificado nesta sessão via `git rev-list --objects origin/main` sem hits).
- `.gitignore` já cobre `dump.rdb`, `backups/*.dump`/`*.sql`/`*.backup`/`*.tar*`/`*.gz`,
  `whatsapp_auth/`, `/data/bitrix-extractions/` e `.env*` (com exceção explícita só para
  `.env.example`/`.env.test.example`) — nenhuma lacuna nova encontrada nesta sessão.
- `gitleaks` já roda como job obrigatório (`secret-scan`) em `.github/workflows/ci.yml` antes do
  job de build/test, com `.gitleaks.toml`/`.gitleaksignore` documentando cada falso-positivo
  conhecido com justificativa.
- Tag `v0.0.1` (mesmo problema) já removida do remote em 12/09/2026.

## Rotação de credenciais

Ver tabela "Credenciais identificadas" acima. Resumo: 4 credenciais de terceiro classificadas como
`ROTATED` (evidência de confirmação humana já registrada em sessões anteriores, não reverificada
contra o provedor nesta sessão por falta de acesso de rede); 1 `ROTATION NOT VERIFIED`
(`ATLASGR_WEBHOOK_SECRET` em produção); 1 `MANUAL ACTION REQUIRED` novo (hashes de senha de 5
usuários reais do dump); tokens de sessão do dump são `NO LONGER VALID` (expirados, verificável
diretamente).

## Evidências

- `git ls-remote --tags origin` (antes da ação): `69bc5d09c8c3ecff2aeefd3325cedfd8be7d6a2b
  refs/tags/v1.0.0-rc.1` — tag presente.
- `git rev-list --objects v1.0.0-rc.1 | grep -iE 'dump$|test-gemini'` (nesta sessão): retorna os 4
  blobs (dump 166075 bytes + 2 variantes de `test-gemini.ts` + `test-gemini-quota.ts`) — confirma
  que a tag ainda alcançava o mesmo conjunto de objetos sensíveis já documentado em
  `DECIDE_GIT_HISTORY_REWRITE.md`.
- `pg_restore --list`/`--data-only` contra o blob do dump: 40 tabelas, contagens de linha reais
  extraídas (ver tabela de categorias de dados acima) — mascarado antes de qualquer registro
  escrito neste documento ou reportado ao usuário (nenhum e-mail, telefone, hash de senha ou
  webhook completo foi impresso em texto claro em nenhum artefato entregável desta sessão).
- Scan de padrões de segredo conhecidos (`sk-`, `AIza`, `AQ.`, `ghp_`, `org_`, URLs Bitrix24,
  strings de conexão Postgres/Redis com credencial embutida, chave privada PEM, `tvly-`, `gsk_`)
  contra todos os 6287 blobs (<3MB) alcançáveis a partir da tag e ausentes de `origin/main`: 63
  hits, todos triados nesta sessão — nenhum segredo real adicional além dos já listados na tabela
  de categorias de dados.
- `bash scripts/security/scan-secrets.sh` (regressão contra o working tree atual, nesta sessão):
  todos os hits são fixtures de teste/valores de dev local já documentados como falso-positivo
  (`E2eTestPassword123!`, `prospector_test_pass`, `whsec_test_segredo`, `xoxb-test-token`,
  `sk-abcdefghijklmnopqrstuvwx` em teste de sanitização) — nenhum segredo real novo no repositório
  atual.
- Tentativa de remoção do remote: `git push origin --delete v1.0.0-rc.1` → `error: RPC failed; HTTP
  403` (repetido, não transitório) — a credencial git desta sessão está escopada à branch de
  trabalho designada, sem permissão para apagar refs de tag no remote.
- `git tag -d v1.0.0-rc.1` (clone local desta sessão): sucesso — `git tag -l` não lista mais a tag
  neste clone efêmero.

## Ações manuais pendentes

1. **Remover a tag do remote** (bloqueador do fechamento deste incidente — não pôde ser executado
   por esta sessão):
   ```bash
   git push origin --delete v1.0.0-rc.1
   git tag -d v1.0.0-rc.1   # no clone local do dono do repositório, se existir
   ```
   Verificação pós-remoção, num clone novo:
   ```bash
   git clone https://github.com/maarkss1/Birthub-360 verify-tag-removal
   cd verify-tag-removal && git fetch --prune --tags
   git ls-remote --tags origin   # v1.0.0-rc.1 não deve mais aparecer
   ```
2. **Confirmar a revogação de cada credencial `ROTATED`** diretamente no provedor (Bland AI,
   Bitrix24 ×2, Google AI Studio) — as classificações desta sessão se apoiam em confirmação humana
   já registrada, não em nova verificação técnica contra o provedor (sem acesso de rede a partir
   deste ambiente).
3. **Confirmar o valor real de `ATLASGR_WEBHOOK_SECRET` em produção (Render)** — garantir que não é
   ainda o literal antigo `segredo_compartilhado_atlasgr_123` (pendência já registrada em
   2026-09-05, não fechada).
4. **Decidir e executar, para os 5 usuários reais do dump** (`user`/`account`), se é necessário
   forçar reset de senha — especialmente à luz do bug já documentado
   (`.agents/completion/01-bloqueadores.md`, item 5) de que uma janela de tempo próxima teve TODAS
   as senhas resetadas para um valor default conhecido.
5. **Avaliação de DPO/jurídico** sobre a exposição de ~25 dias de PII real de prospecção (ver seção
   PII acima) — inclusive se comunicação à ANPD/titulares é aplicável.
6. Repetir a verificação de tags publicadas periodicamente — não há, hoje, um gate automatizado que
   impeça a criação de uma nova tag apontando para um commit antigo/sensível no futuro.

## Risco residual

- **Cópias já clonadas do repositório antes desta remediação** (incluindo qualquer fork feito
  enquanto a tag esteve publicada) continuam contendo o dado — remoção do remote é mitigação de
  acesso daqui pra frente, não uma garantia retroativa (mesma ressalva já registrada em
  `DECIDE_GIT_HISTORY_REWRITE.md` para o Caminho B de `main`).
- Enquanto o item 1 acima não for executado, a tag continua publicamente alcançável.
- Enquanto os itens 2-4 não forem confirmados, existe risco residual de credencial ou senha
  historicamente exposta ainda estar ativa.

## Status final

**PARTIALLY RESOLVED** — investigação, inventário e documentação completos; remoção do remote e
confirmação de rotação/reset de credencial pendentes de ação humana fora do alcance desta sessão
(ver "Ações manuais pendentes").
