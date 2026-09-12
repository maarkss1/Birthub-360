# Copiloto Comercial IA — Extensão Chrome (Ondas 2, 3 e 7)

Extensão Manifest V3 real que fala com o backend do módulo Copiloto Comercial IA
(`src/features/copiloto-ia/`, ver `AGENTS.md` lá) via `/api/copiloto-ia/*`.

## O que já faz

- Detecta o Google Meet (URL + título + código da reunião).
- Tema claro/escuro — botão 🌙/☀️ no header do side panel, persistido em `chrome.storage.sync`.
  Escuro continua o padrão (era o único antes); a cor de marca (laranja) é fixa nos dois temas, só
  a superfície muda.
- Vincula a reunião a um Lead existente da Central Atlas GR — por nome (busca incremental com
  `GET /api/copiloto-ia/leads/search`, mostrando até 10 candidatos por título do Lead/nome do
  Contato/razão social ou nome fantasia da Company), por e-mail do contato, por link de
  lead/negócio do Bitrix24, ou colando o id cru da Central (`GET /api/copiloto-ia/leads/lookup`,
  resolve para no máximo um resultado exato).
- Captura e registra o consentimento (base legal da gravação, auditável em `AuditLog` via
  `COPILOTO_IA_CONSENT`).
- **Grava o áudio real da aba do Meet** (Onda 3) — só depois de "Iniciar sessão de captura", nunca
  antes, nunca sem o clique explícito do usuário. Usa `chrome.tabCapture` + um documento offscreen
  (`src/offscreen.js`, único contexto de extensão com `MediaRecorder`) e reencaminha o áudio pro
  alto-falante (`<audio autoplay>`) pra o usuário não perder o som da própria reunião enquanto grava.
- Ao parar a captura, sobe o áudio gravado direto pro storage S3-compatível do backend (URL
  assinada, `getUploadUrl`/`src/lib/storage`) e avisa o backend, que enfileira a transcrição
  (Whisper) e o resumo executivo em segundo plano — ver
  `src/features/copiloto-ia/jobs/transcribeConversation.worker.ts`.
- Indicador visual persistente na própria página do Meet enquanto a captura está ativa (content
  script) — o usuário não precisa manter o side panel aberto pra saber que está gravando.
- **Sugere automaticamente qual Lead vincular via Google Calendar** (Onda 7) — quando a organização
  tem uma conta Google Workspace conectada (`GET /api/google/calendar/upcoming`) com um evento cujo
  `hangoutLink` é o mesmo Meet aberto, a extensão tenta resolver um Lead pelo e-mail de algum
  convidado do evento (`leads/lookup`) e oferece um botão "Usar este Lead sugerido" — só preenche o
  campo, nunca vincula sozinha. **Limitação real**: `GoogleWorkspaceConnection` é ÚNICA por
  organização (não por vendedor), então isto só encontra o evento quando a conta conectada está de
  fato convidada nessa reunião específica — não é uma agenda por usuário. Falha (Google não
  conectado/configurado, sessão expirada) é sempre silenciosa: é um atalho a mais sobre o fluxo
  manual, nunca um requisito dele.
- **Exibe o resumo executivo e as sugestões de campo de CRM direto no side panel, com
  aprovar/rejeitar/enviar ao Bitrix24** (Onda 4/7, atendendo ao Agente 04 do pacote de spec) — assim
  que a conversa fica `READY` (a extensão faz polling do status a cada 8s enquanto `PROCESSING`,
  já que o worker de transcrição roda em background sem push nenhum pro cliente), aparece o card
  "Resumo e sugestões da IA" com o resumo executivo + sentimento (`GET .../handoff`) e a lista de
  `crmFieldSuggestions` pendentes/aprovadas com os mesmos botões da tela de Conversas na Central
  (`ConversationDetailDrawer.tsx`). O botão "Enviar ao Bitrix24" sempre aparece (a extensão não sabe
  o role de quem está logado) — o backend responde 403 explícito se a conta não for ADMIN/GESTOR
  (`COPILOTO_IA_MANAGEMENT_ROLES`), tratado como qualquer outro erro de API.

## O que ainda NÃO faz (de propósito)

- **Não fala com o Bitrix24.** Só chama o backend da Central — quem fala com o Bitrix é o backend
  (mapeamento de campo + writeback real para `entityType: LEAD`, com aprovação humana, já
  implementado na Onda 4 — ver `bitrix-field-mappings`/`crm-field-suggestions/:id/writeback` em
  `routes/copilotoIa.routes.ts` e `AGENT_08_BITRIX24.md`/`docs/BITRIX_FIELD_MAPPING.md` do pacote).
- **Não guarda segredo nenhum.** Autenticação é a sessão de navegador já aberta na Central Atlas GR
  (cookie do Better Auth, enviado via `credentials: 'include'`) — sem token/API key na extensão. A
  chave da OpenAI (Whisper) fica só no backend, nunca chega ao navegador.

## Como testar localmente

1. Suba o backend local (`npm run dev` na raiz do repo — porta padrão `3005`) e o worker de filas
   (`npm run worker`, ou `ENABLE_EMBEDDED_WORKERS=true` no `.env` do servidor) — sem um dos dois
   rodando, a transcrição fica enfileirada mas nunca processa.
2. Configure `OPENAI_API_KEY` e as variáveis `STORAGE_*` (`.env.example` documenta as duas) — sem
   elas, o upload de áudio ou a transcrição falham explicitamente (nunca silenciosamente).
3. Faça login na Central Atlas GR numa aba normal do MESMO perfil do Chrome (a extensão reaproveita
   essa sessão via cookie).
4. `chrome://extensions` → ative o "Modo do desenvolvedor" → "Carregar sem compactação" → selecione
   esta pasta (`chrome-extension/`).
5. Abra uma chamada em `meet.google.com`, clique no ícone da extensão para abrir o side panel.
6. Informe o id de um Lead existente da sua organização e clique em "Vincular reunião a este Lead".
7. Marque o consentimento, clique em "Registrar consentimento", depois em "Iniciar sessão de
   captura" — o Chrome pede confirmação de captura de aba (comportamento padrão do
   `chrome.tabCapture`), o pill de status muda para "Capturando" e aparece o indicador vermelho no
   topo da página do Meet.
8. Clique em "Parar sessão de captura" — o botão mostra "Enviando gravação..." até o upload
   terminar. A partir daí, a transcrição e o resumo rodam em background; a extensão faz polling do
   status a cada 8s e mostra o card "Resumo e sugestões da IA" sozinha assim que a conversa fica
   `READY` (ou clique em "Atualizar sugestões" pra forçar). Acompanhe também via
   `GET /api/copiloto-ia/conversations/:id` (`transcriptSegments`/`insights`) ou direto no banco.
9. Opcional — sugestão automática via Calendar: conecte uma conta Google Workspace pela tela
   Integrações da Central (`/api/google/auth-url`) com um evento que tenha ESTE Meet como
   videochamada e um convidado com e-mail já vinculado a um Lead. Abrindo o Meet, o side panel
   mostra o card "Sugestão via Google Calendar" antes mesmo de você digitar o Lead manualmente.

**Verificação real ainda pendente**: esta implementação segue a documentação oficial do Chrome
(`chrome.tabCapture` + `chrome.offscreen` + `MediaRecorder`), mas nunca foi exercitada numa chamada
real do Google Meet — precisa de um passo manual num Chrome de verdade antes de confiar em produção.

## Deploy em produção — passos pendentes (não automatizáveis por código)

1. **CORS — ainda pendente**: adicione a origem da extensão (`chrome-extension://<id>`, visível em
   `chrome://extensions` abaixo do nome da extensão depois de carregada) à variável de ambiente
   `ALLOWED_ORIGINS` do backend em produção (`src/bootstrap/security.ts` só libera qualquer origem
   fora de produção). O `<id>` só é estável entre reinstalações se a extensão for publicada com uma
   chave fixa (`key` no manifest) ou distribuída via política empresarial do Google Workspace — sem
   isso, cada "Carregar sem compactação" gera um id novo e o `ALLOWED_ORIGINS` precisa ser
   reatualizado. Sem esse passo no servidor, a extensão erra com CORS mesmo com a URL certa.
2. **URL do backend — já configurada como padrão**: `DEFAULT_API_BASE_URL` (`src/api.js`) e
   `host_permissions` (`manifest.json`) já apontam para a instância Oracle Cloud de produção
   (`http://168.138.147.145`, ADR-004 — ainda sem domínio/TLS, ver
   `docs/deploy/oracle-cloud.md` §7). Trocar para `https://<domínio>` assim que o cutover de
   domínio acontecer. A aba "Configurações" do side panel continua existindo para apontar pra
   outro ambiente (ex.: `localhost:3005` em desenvolvimento) sem precisar editar código — a
   extensão pede a permissão de host correspondente (`optional_host_permissions`) na hora, nunca de
   antemão.
3. **Storage e Whisper configurados** — sem `STORAGE_*`/`OPENAI_API_KEY` reais em produção, o botão
   de captura ainda funciona (grava localmente), mas o upload/transcrição falham com erro explícito.
4. **Distribuição**: para um time inteiro, prefira publicação privada na Chrome Web Store ou
   instalação forçada via política do Google Workspace ("Carregar sem compactação" é só para
   desenvolvimento/teste).

## Estrutura

```
chrome-extension/
├── manifest.json
└── src/
    ├── background.js         # service worker — orquestra offscreen/tabCapture, roteia mensagens
    ├── content.js             # detecta o Meet, mostra o indicador persistente de captura
    ├── offscreen.html/.js     # grava o áudio de verdade (MediaRecorder) e sobe pro storage
    ├── api.js                 # cliente HTTP do backend (sem segredos)
    ├── sidepanel.html/.css/.js  # UI principal
```
