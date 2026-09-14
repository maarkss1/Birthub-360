# Runbook — Rollback de deploy de imagem (Oracle Cloud)

Complementa `MIGRATION_ROLLBACK.md` (que cobre só rollback de schema/migration). Este runbook
cobre reverter a **imagem da aplicação** publicada, quando o deploy em si (não o banco) introduziu
uma regressão.

## Contexto real (evidência)

- Deploy de produção (`.github/workflows/deploy-oci.yml`) dispara após o workflow de release
  passar em `main`, conecta via SSH na instância e roda `git pull` + `docker compose up -d --build`
  (`docker-compose.oci.yml`) no caminho `OCI_DEPLOY_PATH`.
- Imagens também são publicadas com tag por `sha` curto (`docker-publish.yml`/`production.yaml`,
  `type=sha,format=short`), então qualquer commit passado tem uma imagem identificável e íntegra
  pra voltar.
- **BLOCKED_EXTERNAL**: os secrets `OCI_SSH_HOST`/`OCI_SSH_USER`/`OCI_SSH_PRIVATE_KEY`/
  `OCI_DEPLOY_PATH` ainda não existem no repositório (ver comentário no topo de
  `deploy-oci.yml` — "ativação pendente", proposital) e esta sessão não tem acesso SSH a nenhuma
  instância OCI real. **Não é possível executar e cronometrar um rollback de verdade contra
  produção ou um ambiente homólogo a partir daqui.** Instrução exata de desbloqueio: cadastrar os
  4 secrets em Settings → Secrets and variables → Actions, e me dar (ou dar a quem for validar)
  acesso SSH à instância — ou rodar o procedimento abaixo manualmente uma vez e registrar o tempo
  aqui.

## Procedimento (a executar por quem tiver acesso SSH à instância)

1. Identificar o commit/sha do último deploy bom (`git log --oneline -5` no `OCI_DEPLOY_PATH`, ou
   consultar a tag da imagem publicada em `ghcr.io` correspondente ao release anterior).
2. Cronometrar a partir daqui (`date +%s`).
3. Na instância: `cd "$OCI_DEPLOY_PATH" && git fetch origin && git checkout <sha-bom>`.
4. `docker compose -f docker-compose.oci.yml up -d --build` (mesmo comando do workflow de deploy).
5. Confirmar saúde: `docker compose -f docker-compose.oci.yml ps` (todos `healthy`/`running`) e um
   `curl` no endpoint de health check da aplicação.
6. Cronometrar o fim (`date +%s`) e registrar a diferença aqui nesta seção como evidência:

   > **Execução registrada**: (preencher) — data, sha revertido, tempo total em segundos, quem
   > executou.

7. Se o rollback precisar reverter uma migration também (não só a imagem), seguir
   `MIGRATION_ROLLBACK.md` **antes** do passo 3 acima — reverter a imagem sem reverter a migration
   pode deixar a aplicação antiga rodando contra um schema novo incompatível.

## Por que não simulei localmente como substituto

Rodar `docker compose up -d --build` localmente contra `docker-compose.oci.yml` não prova nada
sobre o runbook real — o gargalo do rollback de produção é a conexão SSH, o `git pull` remoto e o
rebuild na instância real, não o comando em si. Uma simulação local mediria só o tempo de build
local, que já é conhecido e não é a pergunta que o critério de aceite faz.
