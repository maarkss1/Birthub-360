# CI/CD Production Gate — Birth Hub 360º

Fonte de verdade para "como um commit vira código em produção neste repositório", e as garantias
que existem (e não existem) entre o CI passar e um deploy real acontecer. Ver também
`docs/deploy/README.md` (inventário dos caminhos de infraestrutura) — este documento cobre
especificamente a cadeia CI → promoção, não a infraestrutura de cada ambiente.

## 1. Princípio central

> Produção não decide se um código é bom. O CI decide isso. Produção só promove um artefato cuja
> qualidade já foi comprovada.

A partir da Onda 10.2 (PROMPT 10.2 — CI/CD PRODUCTION GATE), a regra vale para todo workflow deste
repositório que publica uma imagem ou executa um deploy:

**NO CI PASS = NO DEPLOY.** Sem exceção para `workflow_dispatch` (disparo manual).

## 2. Arquitetura — antes e depois da Onda 10.2

### O que já existia de correto

- `ci.yml` ("Central Birth Hub 360 Release") é o Quality Gate canônico e único — ver seção 3.
- `docker-publish.yml` e `produção` já tinham `workflow_run: workflows: ['Central Birth Hub
  360 Release'], types: [completed]` para o caminho automático — a proteção existia, mas só nesse
  caminho.

### O que estava quebrado

| Workflow | Sintoma | Risco real |
| --- | --- | --- |
| `production.yaml` | `workflow_dispatch` sem checar CI nenhum; rodava sua própria suíte de testes, mais estreita que `ci.yml` (faltava Prettier, testes arquiteturais, deriva de OpenAPI, golden dataset) | Um disparo manual publicava em `ghcr.io` um commit que nunca passou (ou passou e falhou) pelo Quality Gate completo |
| `cd-homolog.yml` | Mesmo padrão de `production.yaml` | Mesmo risco, para homologação |
| `docker-publish.yml` | `workflow_dispatch` publicava sem checar CI (só o caminho automático `workflow_run` era protegido) | Publish manual driblava o gate |
| `produção` (**produção real, self-hosted produção**) | Mesmo gap de `workflow_dispatch`, **e um bug real no próprio caminho automático**: o passo de deploy fazia `git fetch origin main && git reset --hard origin/main` na instância — mesmo quando disparado por `workflow_run` já carregando o SHA exato validado (`head_sha`). Se um commit novo chegasse em `main` entre o CI terminar e o deploy rodar, a instância recebia HEAD atual (não validado), não o SHA que passou no CI | Race condition real: o commit efetivamente implantado em produção podia divergir do commit que o CI aprovou — exatamente o cenário da secao 12 do PROMPT 10.2 |
| `render.yaml` (Render, **produção real, fallback ativo durante a transição para Oracle**) | `autoDeployTrigger: commit` — Render observa push em `main` diretamente pela plataforma, sem nenhuma relação com GitHub Actions/CI | **Não corrigido nesta onda** — ver seção 8 |

### O que foi corrigido

Novo padrão, aplicado a `production.yaml`, `cd-homolog.yml`, `docker-publish.yml` e
`produção`:

```
workflow_dispatch (inputs.sha obrigatório)          workflow_run (ci.yml, head_sha)
                    \                                       /
                     v                                     v
                  job resolve-sha: resolve o SHA explícito
                                    ↓
        .github/actions/require-ci-green (Checks API, check "build")
                                    ↓
                 CI STATUS FOR SHA != SUCCESS?  →  DEPLOY BLOCKED (job falha, nada roda depois)
                                    ↓ (SUCCESS)
                          build/publish/deploy usa o SHA validado explicitamente
                          (checkout ref: <sha>, nunca github.sha/HEAD implícito)
```

`production.yaml` e `cd-homolog.yml` também pararam de rodar sua própria suíte de testes
duplicada — a validação agora é só "o SHA já tem `build` verde?", nunca uma segunda cópia
(mais fraca) da suíte real. Isso elimina o padrão "CI build A / Production build B" que a
seção 7 do PROMPT 10.2 pede para evitar.

## 3. Quality Gate oficial

`ci.yml` — nome do workflow: **"Central Birth Hub 360 Release"**. Dispara em `push` (main, master,
develop), `pull_request` (main, master) e `workflow_dispatch`.

O check obrigatório publicado para a branch protection é literalmente `build` — job agregador que
só fica verde se `secret-scan` **e** `build-and-test` passarem (`if: always()` + comparação
explícita dos dois resultados, para nunca deixar o required check "ausente" silenciosamente em vez
de vermelho).

Jobs que compõem o gate:

| Job | O que valida |
| --- | --- |
| `secret-scan` | Gitleaks — nenhum segredo novo versionado |
| `build-and-test` | `npm ci`, `security:audit-waivers`, `prisma generate`, **lint (`lint:ci`)**, **Prettier (`format:check`)**, verificação de que nenhum gate alterou arquivos versionados, **typecheck (`tsc --noEmit`)**, **testes arquiteturais (`test:architecture`)**, **deriva de OpenAPI (`verify:openapi-drift`)**, **testes unitários com cobertura**, **golden dataset** (condicional a `GROQ_API_KEY`/`OPENAI_API_KEY` estarem configuradas), migrations (`prisma migrate deploy`), **testes de integração**, **testes E2E (Playwright)**, **build** |
| `build` | Agregador — exige `secret-scan` e `build-and-test` = success |

`.github/actions/require-ci-green` (nova nesta onda) é a única forma que qualquer workflow de
promoção usa para consultar esse resultado — consulta `checks.listForRef` para o `check_name:
"build"` no SHA informado, exige `status: completed` e `conclusion: success`, e falha
(`DEPLOY BLOCKED`) em qualquer outro caso, incluindo nenhuma execução encontrada.

## 4. SHA como identidade da release

Todo workflow de promoção (`production.yaml`, `cd-homolog.yml`, `docker-publish.yml`,
`produção`) resolve um SHA explícito antes de qualquer outra coisa:

- Caminho automático (`workflow_run`): `github.event.workflow_run.head_sha` — o SHA exato que
  disparou e concluiu `ci.yml`.
- Caminho manual (`workflow_dispatch`): `inputs.sha`, campo obrigatório (`required: true`), sem
  valor default. A UI do GitHub Actions exige que o operador digite o SHA completo (40 caracteres)
  — não é possível disparar "sem preencher" e cair em HEAD de branch.

Esse SHA (nunca `main`/`develop`/`latest`/HEAD implícito) é o que:

- é validado pela action `require-ci-green`;
- é usado no `checkout@.../with: ref:` de cada job de build/publish;
- vira a tag da imagem Docker (`ghcr.io/.../<sha>`, além de `latest` como alias administrativo —
  nunca a única tag);
- é o que `produção` faz `git checkout --detach` na instância, em vez de
  `git reset --hard origin/main`.

## 5. Estratégia de artifact

`BUILD ONCE, PROMOTE MANY` só se aplica hoje ao caminho `ghcr.io`
(`production.yaml`/`cd-homolog.yml`/`docker-publish.yml`) — cada workflow ainda constrói sua
própria imagem a partir do SHA validado (não há hoje um job único em `ci.yml` que builda e as
promoções reaproveitam a mesma imagem). Isso é uma limitação conhecida, não corrigida nesta onda
por ser uma mudança de arquitetura maior (mover o build de imagem para dentro de `ci.yml` e fazer
os três workflows de promoção apenas fazer pull/retag) — ver seção 9 (riscos residuais).

`produção` (a produção real hoje) **não usa nenhuma dessas imagens ghcr.io** — a instância
produção faz `docker compose ... up -d --build`, ou seja, builda localmente na própria
instância a partir do código-fonte no SHA validado. Isso é consistente ("mesmo SHA, mesmo
conteúdo"), mas não é "promote", é "rebuild local a partir de um SHA aprovado" — funcionalmente
seguro (o conteúdo é idêntico ao que passou no CI), mas não elimina o tempo de build redundante que
a seção 7 do PROMPT 10.2 pede para evitar quando possível.

## 6. Homologação

`cd-homolog.yml` (workflow_dispatch, SHA obrigatório) builda e escaneia (Trivy, bloqueante para
HIGH/CRITICAL sem waiver) a imagem, publica em `ghcr.io/<repo>:<sha>`, e atualiza
`charts/prospector-atlas/values.yaml` em `develop` com essa tag. **Não há hoje nenhum cluster real
consumindo isso** (ver `docs/deploy/README.md` — "Pipeline existe, alvo não existe"), então o risco
prático de homologação sem CI verde era teórico até esta correção, não um caminho de tráfego real.

## 7. Produção

Dois caminhos com tráfego real hoje, tratados de forma muito diferente por esta correção:

### 7.1. produção (`produção`) — alvo definitivo (), corrigido nesta onda

- Automático: `workflow_run` em `ci.yml` (branch `main`) → `resolve-sha` valida o `head_sha` →
  `deploy` faz SSH na instância, `git fetch`/`checkout --detach` do SHA exato, roda
  `scripts/deploy-oci.sh` (rebuild local + `prisma migrate deploy` + seed idempotente + health
  checks `/health/live`/`/health/ready`).
- Manual: mesmo caminho, SHA obrigatório via `workflow_dispatch`, mesmo gate.
- Registra `PREVIOUS_SHA` (capturado antes do checkout) e publica um resumo (`GITHUB_STEP_SUMMARY`)
  com ambiente, SHA, resultado do gate, ator, timestamp e resultado do smoke test.
- **Ativação pendente**: os secrets SSH (`OCI_SSH_HOST`/`OCI_SSH_USER`/`OCI_SSH_PRIVATE_KEY`/
  `OCI_DEPLOY_PATH`) precisam existir em Settings → Secrets — sem eles o workflow falha de
  propósito no passo "Validar secrets obrigatórios", não silenciosamente.

### 7.2. Render (`render.yaml`) — fallback ativo, **não corrigido nesta onda**

`autoDeployTrigger: commit` — a Render observa push em `main` diretamente pela própria plataforma;
não há nenhum mecanismo do lado do GitHub Actions que consiga interceptar ou condicionar esse
deploy ao CI. Ver seção 8 para a análise completa e por que isso não foi alterado nesta sessão.

## 8. O gap não fechado: Render

Esta é a maior lacuna que permanece depois desta onda, e a razão pela qual o gate final desta onda
**não pode ser GO** enquanto ela não for resolvida — ver seção 10 (Regra de GO).

**O que acontece hoje:** todo push em `main` é observado diretamente pela plataforma Render
(webhook nativo do Render, fora do GitHub Actions) e deploya incondicionalmente — Render nunca
consulta o status do `ci.yml`. Não existe "clicar para pular o CI"; é pior: nem clique é necessário,
o push sozinho já é suficiente.

**Por que não foi corrigido nesta sessão:**

1. Render é um serviço com tráfego real hoje (`docs/deploy/README.md`: "Ativo, mas congelado para
   novo investimento — não desligar antes do Go-Live Oracle estar validado"). Mudar
   `autoDeployTrigger` é uma mudança de comportamento de um serviço vivo, não só um ajuste de
   workflow do GitHub Actions.
2. Há incerteza real sobre a mecânica exata do Render Blueprint: a documentação existente deste
   repositório (comentário em `render.yaml`) registra que uma mudança em `render.yaml` só passa a
   valer depois de um "sync do Blueprint" manual no dashboard do Render — mas isso não está
   confirmado com certeza suficiente para eu decidir, sem coordenação humana, que é seguro desligar
   `autoDeployTrigger` sem quebrar o único caminho de deploy que hoje está validado e funcionando.
3. Mesmo se corrigido via "Deploy Hook" (URL que um job do GitHub Actions chamaria só depois do CI
   passar), o Render, para um serviço `runtime: node` construído a partir do código-fonte (não
   Docker), **não aceita um SHA explícito no hook** — ele sempre builda o HEAD atual da branch
   configurada no momento em que o hook é chamado. Isso significa que mesmo a correção proposta
   reduziria a janela de risco (só dispara depois do CI passar), mas não a eliminaria por completo
   sob merges concorrentes — uma limitação arquitetural do próprio Render, não algo que este
   repositório consiga contornar com YAML.

**Recomendação registrada, não executada:**

```yaml
# render.yaml — mudança proposta, requer decisão humana + coordenação com o dashboard do Render
autoDeployTrigger: off  # mesmo padrão já usado no worker (linha 156)
```

mais um novo workflow `.github/workflows/deploy-render.yml`, no mesmo padrão de `produção`
(`workflow_run` em `ci.yml` + `workflow_dispatch` com SHA obrigatório, ambos passando por
`require-ci-green`), cujo passo final chama o Deploy Hook do Render
(`secrets.RENDER_DEPLOY_HOOK_URL`, a cadastrar).

**Ação manual necessária, do dono do repositório, antes de fechar este item:**

1. Confirmar no dashboard do Render se `autoDeployTrigger: off` no Blueprint de fato desliga o
   auto-deploy sem exigir nenhuma ação manual adicional (ou se precisa também desligar "Auto-Deploy"
   direto na tela do serviço).
2. Gerar um Deploy Hook para `prospector-atlas` e cadastrá-lo como secret.
3. Só então mergear a mudança de `render.yaml` + o novo workflow, coordenando a janela (o próximo
   push em `main` depois do merge já para de auto-deployar direto).

## 9. Riscos residuais (depois desta onda)

- **Render continua sem gate de CI** — ver seção 8. É o item que mais importa deste documento.
- **Branch protection e GitHub Environment protection não foram verificados nesta sessão** — sem
  ferramenta de leitura da API de branch protection/environments disponível neste ambiente. Ver
  seção 11 (MANUAL VERIFICATION REQUIRED).
- **Build duplicado** entre `ci.yml` (que não gera imagem) e cada workflow de promoção (que builda
  a própria imagem a partir do SHA já validado) — funcionalmente seguro (mesmo SHA, mesmo
  conteúdo), mas não é "build once" de verdade. Corrigir exigiria mover a geração de imagem para
  dentro de `ci.yml` e fazer os promotores reaproveitá-la — fora do escopo desta onda por ser uma
  mudança de arquitetura maior, não um gate.
- **`docker-publish.yml`/`production.yaml`/`cd-homolog.yml` publicam em `ghcr.io`, mas nenhum
  ambiente real consome essas imagens hoje** (produção real é Oracle via rebuild local; Render
  builda do código-fonte) — os registries ficam órfãos até o caminho Kubernetes/Helm virar real
  (`docs/deploy/README.md`, caminho 4).
- **`docker-publish.yml` não escaneia a imagem com Trivy antes do push** (diferente de
  `production.yaml`/`cd-homolog.yml`, que escaneiam) — não corrigido nesta onda por não ter sido
  identificado como parte do escopo de gate de CI (é uma lacuna de scan, não de "CI verde antes de
  promover"); registrado aqui para uma próxima rodada de hardening.
- **PR #509 concorrente**: outra sessão abriu, durante esta mesma janela, um PR menor
  (`fix(ci): impedir que deploy manual pule o gate do ci.yml`, branch
  `claude/platform-maturity-assessment-xu2zm0`) cobrindo só `production.yaml`/`cd-homolog.yml` com
  uma abordagem equivalente mas mais estreita (mantém a suíte de testes duplicada, não toca
  `produção`/`docker-publish.yml`, sem a action reutilizável). O dono do repositório precisa
  decidir qual PR mergear (recomendação: esta onda, por cobrir o bug real de `produção` e
  eliminar a duplicação de suíte de testes) — nenhum dos dois foi mergeado nem fechado
  unilateralmente por esta sessão.

## 10. Regra de GO

Copiada do PROMPT 10.2, seção 35: "GO" só é permitido se o mesmo SHA aprovado pelo CI for o SHA
efetivamente enviado ao ambiente, para **todo** caminho de deploy real. Enquanto Render continuar
deployando por push direto (seção 8), existe um caminho de produção real onde isso não é verdade —
logo:

```
CI/CD STATUS: NOT HARDENED
PRODUCTION PROMOTION GATE: NO-GO
```

Isso não desfaz o que foi corrigido — GitHub Actions (produção, ghcr.io, homologação) está
hardened. É uma classificação honesta do estado combinado dos dois caminhos de produção reais.

## 11. Branch protection e GitHub Environment protection — MANUAL VERIFICATION REQUIRED

Esta sessão não teve acesso a uma ferramenta de leitura da API de branch protection rules nem de
GitHub Environments (só ferramentas de PR/Actions/conteúdo de arquivo estavam disponíveis) — não é
possível confirmar programaticamente, e nenhum status foi presumido. Verificar manualmente:

- **Settings → Branches → main**: regra exigindo PR, o check `build` como obrigatório, branch
  atualizada antes do merge, force-push bloqueado, deleção bloqueada, approvals conforme a política
  da equipe.
- **Settings → Environments → production** (e `homologation`/`staging`, se existirem): required
  reviewers, deployment branches restritas a `main`, secrets corretos escopados ao ambiente.
- **Settings → Tags → Protected tags**: relevante para o incidente SEC-2026-001 (tag
  `v1.0.0-rc.1`) — confirmar se já existe uma regra cobrindo `v*`.

## 12. Permissions — princípio de menor privilégio

Já seguido consistentemente neste repositório antes desta onda (`cd-homolog.yml` já declarava
`permissions: {}` no nível do workflow com cada job declarando só o que precisa) — esta onda
manteve o padrão nos jobs novos (`resolve-sha` em cada workflow: só `contents: read` + `checks:
read`, nunca `write`). Nenhum workflow usa `write-all`. `packages: write` e `security-events:
write` ficam restritos aos jobs que de fato publicam imagem/SARIF.

## 13. OIDC

| Credencial | Uso | Classificação |
| --- | --- | --- |
| `secrets.GITHUB_TOKEN` (login em `ghcr.io`) | Publish de imagem | **CURRENTLY SAFE** — token de vida curta, escopado automaticamente por job |
| `secrets.OCI_SSH_PRIVATE_KEY` | SSH para a instância produção | **HARDENING RECOMMENDED** — chave estática de longa duração. OIDC não se aplica diretamente a SSH tradicional; alternativa real seria trocar o modelo de deploy (ex.: um agente rodando na instância que faz *pull* via API autenticada por OIDC em vez de a Action fazer *push* via SSH) — mudança de arquitetura maior, fora do escopo desta onda. Mitigação já em vigor: a documentação já recomenda uma chave dedicada a este workflow, não a chave pessoal do operador. |

## 14. Rollback

`produção` agora captura `PREVIOUS_SHA` (o `git rev-parse HEAD` da instância *antes* do
checkout do novo SHA) e publica no `GITHUB_STEP_SUMMARY` de cada execução. Não existe hoje um
comando de rollback de um clique — o procedimento manual (`infrastructure/observability/
RUNBOOK.md` §6 "Rollback via produção") é: disparar `produção` via `workflow_dispatch`
com `sha` = o `PREVIOUS_SHA` registrado no summary do deploy anterior. Como esse SHA precisa ter um
`build` verde para o gate aceitar — e via de regra já teve, por já ter sido implantado antes —
isso funciona sem exceção especial no gate.

Rollback **não desfaz uma migration já aplicada** — mesma ressalva já documentada em
`docs/deploy/README.md` §5, válida para todos os caminhos.

## 15. Procedimento de emergência

Não existe hoje um "bypass silencioso" — nenhum caminho deste repositório permite pular
`require-ci-green`. Se uma emergência legítima exigir implantar um SHA sem `build` verde (ex.: uma
correção crítica de segurança que precisa sair antes do CI completo terminar, ou um CI
quebrado por causa própria não relacionada ao código a implantar):

1. **Nunca edite `.github/actions/require-ci-green` nem remova o job `resolve-sha`** para
   contornar — isso é indistinguível de reintroduzir o bug que esta onda fechou.
2. O procedimento correto é **humano, explícito e registrado**: o dono do repositório (ou quem
   tiver a mesma permissão) executa o deploy manualmente fora do fluxo automático — hoje isso
   significa o [Dashboard do Render](https://dashboard.render.com) → serviço `prospector-atlas` →
   "Manual Deploy" apontando para o SHA desejado (ver `docs/deploy/producao.md`). (Nota: uma versão
   anterior deste passo descrevia SSH direto numa instância Oracle Cloud via `scripts/deploy-oci.sh`
   — esse caminho inteiro foi deletado do repositório pelo commit `783f8582`, 2026-09-18; Render é
   hoje o único caminho de deploy real.) Em qualquer caso, o procedimento exige:
   - justificativa por escrito (o que está quebrado, por que não pode esperar o CI);
   - responsável identificado;
   - SHA explícito usado;
   - registro do que foi feito (issue, incidente de segurança, ou entrada em
     `docs/security/incidents/` quando aplicável);
   - aprovação de outra pessoa quando possível;
   - post-mortem depois;
   - execução retroativa dos gates (abrir um PR/rodar `ci.yml` para esse SHA assim que possível,
     mesmo depois do fato, para que o histórico do CI reflita a realidade).
3. Isso é excepcional por definição — se um caminho de emergência vira rotina, o problema real é
   que o CI está lento/instável demais para o ritmo de deploy necessário, e isso deve ser
   endereçado na causa raiz (o próprio `ci.yml`), não contornado permanentemente.

## 16. Como testar o gate (evidência real desta onda)

Três cenários validados nesta sessão contra SHAs reais deste repositório, via um workflow
temporário (`push`-triggered, removido depois de coletar a evidência — não faz parte do CI/CD
permanente):

| Cenário | SHA usado | Resultado esperado | Resultado real |
| --- | --- | --- | --- |
| A — CI verde | `847fcb17…` (push em `main`, run 34930670005, conclusion `success`) | DEPLOY PERMITIDO | ✅ `require-ci-green` concluiu `success` ([run](https://github.com/maarkss1/Birthub-360/actions/runs/34962095688/job/104357828853)) |
| B — CI falho | `a52d1db0…` (PR #501, run 34933345072, conclusion `failure`) | DEPLOY BLOCKED | ✅ `"DEPLOY BLOCKED — o check \"build\" para a52d1db0… não passou (conclusion=failure). CI STATUS FOR SHA = failure."` ([run](https://github.com/maarkss1/Birthub-360/actions/runs/34962095688/job/104357828532)) |
| C — sem execução de CI | `76a768c8…` (commit só nesta branch de feature, nunca disparou `push`/`pull_request` em `ci.yml`) | DEPLOY BLOCKED | ✅ `"DEPLOY BLOCKED — nenhuma execução do check \"build\" encontrada... CI STATUS FOR SHA = NOT FOUND."` ([run](https://github.com/maarkss1/Birthub-360/actions/runs/34962095688/job/104357828744)) |
| D — SHA aprovado ≠ HEAD atual | Estrutural | Deploy usa o SHA aprovado, nunca HEAD | ✅ Garantido pela arquitetura: todo checkout de build/deploy usa `needs.resolve-sha.outputs.sha` explicitamente — nenhum workflow lê `github.sha`/`HEAD` para decidir o que implantar |
| E — artifact inexistente/divergente | N/A | Deploy bloqueado | Coberto indiretamente: o build da imagem/checkout do SHA falha naturalmente antes de qualquer push se o SHA não existir no remote (`git cat-file -e` explícito em `produção`) |
