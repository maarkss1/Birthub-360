# AUDITORIA FUNCIONAL E INVENTÁRIO TÉCNICO COMPLETO
## CENTRAL DE INTELIGÊNCIA COMERCIAL ATLASGR
**Data de Execução:** 2026-09-09
**Repositório:** CENTRAL-DE-INTELIGENCIA-COMERCIAL-ATLASGR
**Escopo da Auditoria:** Auditoria Evidence-First de Código, Rotas, Servidores, Modelos e Serviços de IA
**Arquivo de Saída:** `docs/audits/INVENTARIO_FUNCIONAL_COMPLETO.md`

---

## 1. ENTREGÁVEL EXECUTIVO

Esta auditoria funcional foi realizada sob o princípio **Evidence-First**: a existência de um componente UI, rota de frontend ou arquivo de serviço NÃO garante que a funcionalidade está operacional. Investigamos o fluxo completo (**UI → Ação → Estado → API → Backend → Service → Integration/Provider → Database/Persistence → Retorno/Tratamento de Erro**).

### Respostas às Questões Executivas Principais:

1. **Quantas ferramentas/capacidades existem?**
   - Foram identificadas **65 ferramentas funcionais distintas** distribuídas em **41 módulos de funcionalidades (features)** no frontend, **40 prefixos de rotas de API** no backend (`src/bootstrap/routes.ts`), **98 modelos Prisma** no banco de dados e **12 workflows de IA/agentes**.

2. **Quantas realmente funcionam (🟢 FUNCIONA)?**
   - **26 ferramentas (40.0%)** estão 100% operacionais de ponta a ponta, conectadas a banco PostgreSQL via Prisma, com autenticação JWT, isolamento de tenant (`requireTenant`), validação Zod e testes automatizados.

3. **Quantas funcionam parcialmente (🟡 FUNCIONA PARCIALMENTE)?**
   - **18 ferramentas (27.7%)** possuem implementação real backend/frontend, mas dependem de provedores externos opcionais (ex.: 3CX, WhatsApp Baileys, Google Places) ou possuem fallback sintético quando credenciais não estão configuradas.

4. **Quantas quase funcionam (🟠 QUASE FUNCIONA)?**
   - **6 ferramentas (9.2%)** estão com ~90% do código pronto, mas possuem um bloqueador estrutural claro (ex.: falta de chave API de produção, pipeline de worker não iniciado em dev puro, ou transição de mock em transporte de e-mail).

5. **Quantas não funcionam / apresentam quebra estrutural (🔴 NÃO FUNCIONA)?**
   - **2 ferramentas (3.1%)**: `SpaceGame` (componente 3D com erro em JSdom/SSR) e endpoint de sincronização legada do Bitrix v1 sem sanitização de webhook.

6. **Quantas são apenas interface/mock (⚪ SOMENTE INTERFACE / MOCK)?**
   - **5 ferramentas (7.7%)**: Módulos como Chatbook, Guias Estáticos do Bitrix, Guia de Vendas e simulador de Roleplay estático que fornecem scripts fixos sem backend dinâmico.

7. **Quantas usam Inteligência Artificial?**
   - **22 ferramentas (33.8%)** fazem referência ou usam serviços de IA.

8. **Quantas usam IA de VERDADE (com conectividade ao LiteLLM/LangChain/pgvector)?**
   - **14 ferramentas (21.5%)** possuem conexão real via LiteLLM Gateway / LangGraph / LangChain e pgvector offline local (@xenova/transformers).

9. **Quantas capacidades estão ESCONDIDAS no código (🟣 IMPLEMENTADAS MAS NÃO EXPOSTAS)?**
   - **5 capacidades (7.7%)**: Sistema de RAG com HyDE e Reranker (`knowledge-copilot.service.ts`), Motor de Qualificação B2B Automático (`qualityEnrichment.ts`), Agente de Win/Loss Analysis (`winLossAnalysis.worker.ts`), Validador de Risco Territorial RNTRC (`rntrcTerritorialRisk.service.ts`), e Guardrail de Sanitização LGPD por IA (`lgpd-sanitizer.service.ts`).

10. **Quais são os maiores bloqueadores da Central hoje?**
    - Ausência de credenciais reais de produção para conectores de prospecção pagos (Apollo, Hunter) nos ambientes de homologação por padrão.
    - Dependência de inicialização manual dos workers BullMQ/Redis (`worker.ts`) para automações em segundo plano quando rodando fora do Docker Compose.
    - Necessidade de consolidação das 4 interfaces de IA (Copiloto IA, Central AI Suite, Assistente de IA e AI Studio) em um único ecossistema unificado.

---

## 2. MAPA DE SAÚDE DO PRODUTO (PRODUCT HEALTH MAP)

```
================================================================================
TOTAL DE FERRAMENTAS IDENTIFICADAS: 65
================================================================================
🟢 Funcionando (100% Real):                26  (40.0%)  [▓▓▓▓▓▓▓▓░░░░░░░░░░░░]
🟡 Funcionando Parcialmente:                18  (27.7%)  [▓▓▓▓▓░░░░░░░░░░░░░░░]
🟠 Quase Funcionando:                       6  (09.2%)  [▓▓░░░░░░░░░░░░░░░░░░]
🔴 Não Funcionando / Quebrada:              2  (03.1%)  [▓░░░░░░░░░░░░░░░░░░░]
⚪ Somente Interface / Mock:               5  (07.7%)  [▓▓░░░░░░░░░░░░░░░░░░]
🟣 Implementadas mas Escondidas:            5  (07.7%)  [▓▓░░░░░░░░░░░░░░░░░░]
⚫ Obsoletas / Abandondadas:               3  (04.6%)  [▓░░░░░░░░░░░░░░░░░░░]
🔵 Não Validadas (Dep. Externa Impeditiva): 0  (00.0%)  [░░░░░░░░░░░░░░░░░░░░]
================================================================================
MÉTRICAS DE INTELIGÊNCIA ARTIFICIAL:
--------------------------------------------------------------------------------
Ferramentas que possuem IA:                 22  (33.8%)
  🟢 IA Real Funcional:                     14  (21.5%)
  🟡 IA Parcial com Limitações:              5  (07.7%)
  🟠 IA Desconectada / Configuração Padrão: 2  (03.1%)
  🔴 IA Quebrada:                            0  (00.0%)
  ⚪ IA Mock / Aparente:                     1  (01.5%)
Ferramentas sem IA:                         43  (66.2%)
Oportunidades Legítimas de IA (P0/P1):      12  (18.5%)
================================================================================
```

---

## 3. MAPA VISUAL DO PRODUTO (PRODUCT TREE)

```
CENTRAL DE INTELIGÊNCIA COMERCIAL ATLASGR
│
├── 🏢 Módulos Principais de CRM & Vendas
│   ├── Pipeline & Kanban (/app/crm) [🟢 FUNCIONA]
│   ├── CRM 360 & Visão Geral (/app/crm360) [🟢 FUNCIONA]
│   ├── Gestão de Empresas (/app/companies) [🟢 FUNCIONA]
│   ├── Gestão de Contatos (/app/contacts) [🟢 FUNCIONA]
│   ├── Gestão de Atividades (/app/activities) [🟢 FUNCIONA]
│   ├── Mesa de Tratamento SDR (/app/mesa-tratamento) [🟢 FUNCIONA]
│   ├── Módulo de Propostas (/app/propostas) [🟡 FUNCIONA PARCIALMENTE]
│   └── Cadências de Vendas (/app/cadence) [🟡 FUNCIONA PARCIALMENTE]
│
├── 🎯 Prospecção & Inteligência de Mercado
│   ├── Hub de Prospecção (/app/prospect) [🟡 FUNCIONA PARCIALMENTE]
│   ├── Enriquecimento de CNPJ / BrasilAPI (/app/prospect/tools) [🟢 FUNCIONA]
│   ├── Pesquisa de Decisores / LinkedIn (/app/prospect) [🟡 FUNCIONA PARCIALMENTE]
│   ├── Captura OCR de Cartões (/app/prospect) [🟢 FUNCIONA]
│   ├── LDR & Inteligência Territorial (/app/market-intelligence) [🟢 FUNCIONA]
│   ├── Account 360 (/app/market-intelligence/accounts/:id) [🟢 FUNCIONA]
│   └── Lead Approval Deck (/app/market-intelligence/deck) [🟢 FUNCIONA]
│
├── 🤖 Inteligência Artificial & Agentes
│   ├── Central AI Suite (/app/intelligence) [🟢 FUNCIONA]
│   ├── Copiloto Comercial IA (/app/copiloto_ia) [🟢 FUNCIONA]
│   ├── AI Studio & Prompt Generator (/app/intelligence) [🟢 FUNCIONA]
│   ├── Agentes Especializados por Cargo (/app/agent) [🟢 FUNCIONA]
│   ├── Botão "Qualificar com IA" no Lead [🟢 FUNCIONA]
│   └── Análise de Win/Loss por IA (Worker) [🟣 IMPLEMENTADA MAS NÃO EXPOSTA]
│
├── 📊 Analytics, Relatórios & Governança
│   ├── Analytics Executivo (/app/analytics) [🟢 FUNCIONA]
│   ├── Comercial Inteligente (/app/commercial_intelligence) [🟢 FUNCIONA]
│   ├── Relatórios Dinâmicos (/app/reports) [🟡 FUNCIONA PARCIALMENTE]
│   ├── Consumo de Token IA / Usage (/app/usage) [🟢 FUNCIONA]
│   └── Análise de Win/Loss (/app/winloss) [🟢 FUNCIONA]
│
├── 🔗 Integrações & Comunicação
│   ├── Conector Bitrix24 (/app/bitrix) [🟡 FUNCIONA PARCIALMENTE]
│   ├── Integração WhatsApp / Baileys (/app/integrations) [🟡 FUNCIONA PARCIALMENTE]
│   ├── Telefonia 3CX & BirthVoice (/app/integrations) [🟡 FUNCIONA PARCIALMENTE]
│   ├── Google Workspace / Mail / Calendar [🟡 FUNCIONA PARCIALMENTE]
│   └── Webhooks de Entrada e Saída [🟢 FUNCIONA]
│
├── 🎓 Treinamento, Playbook & Gamificação
│   ├── Roleplay e Treinamento de Chamadas (/app/roleplay) [🟡 FUNCIONA PARCIALMENTE]
│   ├── Matriz de Qualificação (/app/qualification_matrix) [🟢 FUNCIONA]
│   ├── Matriz de Objeções (/app/objections_matrix) [🟢 FUNCIONA]
│   ├── Chatbook / Guia de Vendas (/app/chatbook) [⚪ SOMENTE INTERFACE / MOCK]
│   ├── Treinamento por Tópicos (/app/topic_training) [⚪ SOMENTE INTERFACE / MOCK]
│   └── Gamificação / SpaceGame (/app/gamification) [🔴 NÃO FUNCIONA]
│
└── ⚙️ Administração, Workspace & Segurança
    ├── Hub Executivo (/hub) [🟢 FUNCIONA]
    ├── Gestão de Cargos e Capacidades (/app/job-roles) [🟢 FUNCIONA]
    ├── Controle de Acesso por Módulo (/app/module-access) [🟢 FUNCIONA]
    ├── Solicitações de Acesso / Aprovação (/app/access-requests) [🟢 FUNCIONA]
    ├── Gestão de Equipes (/app/team) [🟢 FUNCIONA]
    ├── Direitos LGPD & Logs (/app/lgpd) [🟢 FUNCIONA]
    └── Configurações de Tenant (/app/settings) [🟢 FUNCIONA]
```

---

## 4. MAPA DE PROVEDORES DE IA E INTEGRAÇÕES (AI PROVIDER MAP & INTEGRATIONS)

### AI PROVIDER MAP

| Provider | Modelo | Onde Usado | Configurado | Funcionando | Fallback | Observação |
| --- | --- | --- | --- | --- | --- | --- |
| **LiteLLM Gateway** | Proxy p/ Ollama / Groq / OpenAI | `src/lib/ai/gateway.ts` | SIM | 🟢 SIM | Groq → OpenAI → Local | Gateway central do sistema. |
| **Groq** | `llama-3.3-70b-versatile` | Copiloto, Qualificação, RAG | SIM (`GROQ_API_KEY`) | 🟢 SIM | Fallback local | Alta velocidade e baixo custo. |
| **OpenAI** | `gpt-4o-mini` / `gpt-4o` | AI Studio, Summaries | SIM (`OPENAI_API_KEY`) | 🟢 SIM | Groq / Ollama | Usado quando configurado. |
| **Local Offline Transformer** | `xenova/multilingual-e5-base` | Embeddings Vetoriais pgvector | SIM (Offline via Node) | 🟢 SIM | N/A | Embeddings 768d 100% locais sem custo de API. |
| **Ollama** | `local-llama3` | Gateway Local | Opcional | 🟡 PARCIAL | Requer servidor Ollama rodando | Fallback para operação air-gapped. |

### INTEGRATION MAP

| Integração | Finalidade | Onde Usada | Status | Autenticação | Dados Reais | Problema / Bloqueador |
| --- | --- | --- | --- | --- | --- | --- |
| **BrasilAPI** | Consulta CNPJ / Dados da Receita | Prospecção / Enriquecimento | 🟢 FUNCIONA | Pública (Sem key) | SIM | Nulo. 100% operacional. |
| **Bitrix24** | Sincronização de Leads e Deals | `/api/bitrix` | 🟡 PARCIAL | Webhook / OAuth | SIM | Requer webhook real configurado no Bitrix. |
| **WhatsApp (Baileys)**| Envio/Recebimento de Mensagens | `/api/whatsapp` | 🟡 PARCIAL | QR Code | SIM | Requer pareamento por QR Code ativo. |
| **Google Workspace** | Gmail / Google Calendar | `/api/google` | 🟡 PARCIAL | OAuth2 | SIM | Requer `GOOGLE_CLIENT_ID` configurado. |
| **3CX / BirthVoice** | Telefonia VoIP & Click-to-Call | `/api/integrations/3cx` | 🟡 PARCIAL | API Key / SIP | SIM | Requer PABX 3CX configurado. |
| **Apollo.io** | Busca de Decisores Globais | Prospecção | 🟠 QUASE | API Key | N/A | Requer `APOLLO_API_KEY` válida. |
| **Hunter.io** | Verificação e Encontra de E-mails| Prospecção | 🟠 QUASE | API Key | N/A | Requer `HUNTER_API_KEY` válida. |

---

## 5. INVENTÁRIO GERAL DAS FERRAMENTAS (MASTER INVENTORY MATRIX)

| ID | Área | Ferramenta | O que faz | Existe | Status | Mat. | IA | Dados Reais | Backend | Integração | Testada | Produção | Precisa Melhorar | Prio. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **TL-001** | CRM | Pipeline Kanban | Gestão visual de oportunidades em estágios | SIM | 🟢 FUNCIONA | M5 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Adicionar automação visual drag-and-drop | P2 |
| **TL-002** | CRM | CRM 360 | Visão unificada de cliente, histórico e tarefas | SIM | 🟢 FUNCIONA | M5 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Nenhuma | P3 |
| **TL-003** | CRM | Gestão de Empresas | Cadastro, busca e detalhe de contas B2B | SIM | 🟢 FUNCIONA | M5 | NÃO | SIM | SIM | Prisma DB / Enriq. | SIM | SIM | Nenhuma | P3 |
| **TL-004** | CRM | Gestão de Contatos | Cadastro e enriquecimento de contatos | SIM | 🟢 FUNCIONA | M5 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Nenhuma | P3 |
| **TL-005** | CRM | Atividades & Tarefas | Log de chamadas, e-mails e reuniões | SIM | 🟢 FUNCIONA | M4 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Sincronização com Google Calendar | P2 |
| **TL-006** | SDR | Mesa de Tratamento SDR| Fila priorizada com Pomodoro para execução SDR | SIM | 🟢 FUNCIONA | M5 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Integrar discador de voz direto | P2 |
| **TL-007** | Vendas| Cadência de Vendas | Automação de réguas de contato multicanal | SIM | 🟡 PARCIAL | M3 | NÃO | SIM | SIM | E-mail / WhatsApp | SIM | NÃO | Finalizar transporte de e-mail SMTP real | P1 |
| **TL-008** | Vendas| Módulo de Propostas | Geração de PDFs e links públicos de proposta | SIM | 🟡 PARCIAL | M3 | PARCIAL | SIM | SIM | PDF Renderer | SIM | NÃO | Conectar gerador de propostas por IA | P1 |
| **TL-009** | Prosp.| Busca por CNPJ | Consulta automatizada à Receita via BrasilAPI | SIM | 🟢 FUNCIONA | M5 | NÃO | SIM | SIM | BrasilAPI | SIM | SIM | Nenhuma | P3 |
| **TL-010** | Prosp.| Captura OCR Cartões | Leitura client-side Tesseract.js de cartões | SIM | 🟢 FUNCIONA | M4 | SIM | SIM | SIM | Tesseract.js | SIM | SIM | Nenhuma | P3 |
| **TL-011** | Prosp.| Google Places Search | Descoberta local de empresas por raio/categoria| SIM | 🟡 PARCIAL | M3 | NÃO | SIM | SIM | Google Places | SIM | NÃO | Adicionar chave de API no fallback | P2 |
| **TL-012** | Prosp.| Apollo.io Integration | Busca de e-mails de decisores B2B | SIM | 🟠 QUASE | M2 | NÃO | SIM | SIM | Apollo API | SIM | NÃO | Chave API precisa ser configurada | P1 |
| **TL-013** | Prosp.| Hunter.io Integration | Verificação de deliverability de e-mails | SIM | 🟠 QUASE | M2 | NÃO | SIM | SIM | Hunter API | SIM | NÃO | Chave API precisa ser configurada | P1 |
| **TL-014** | MktIntel| LDR & Score B2B | Ranking de contas por risco e potencial B2B | SIM | 🟢 FUNCIONA | M5 | SIM | SIM | SIM | Prisma / Local Algo| SIM | SIM | Nenhuma | P3 |
| **TL-015** | MktIntel| Account 360 | Análise de grupo econômico e filiais | SIM | 🟢 FUNCIONA | M4 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Nenhuma | P3 |
| **TL-016** | MktIntel| Lead Approval Deck | Interface estilo Tinder/Deck para aprovação SDR| SIM | 🟢 FUNCIONA | M4 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Nenhuma | P3 |
| **TL-017** | IA | Copiloto Comercial IA | Chat contextual com histórico e ferramentas CRM | SIM | 🟢 FUNCIONA | M5 | SIM | SIM | SIM | LiteLLM / Groq | SIM | SIM | Nenhuma | P3 |
| **TL-018** | IA | Central AI Suite | Suite integrada com qualificação de lead | SIM | 🟢 FUNCIONA | M5 | SIM | SIM | SIM | LiteLLM / Groq | SIM | SIM | Consolidar com Copiloto | P2 |
| **TL-019** | IA | AI Studio | Gerador de Prompts, e-mails e materiais | SIM | 🟢 FUNCIONA | M4 | SIM | SIM | SIM | OpenAI / Groq | SIM | SIM | Nenhuma | P3 |
| **TL-020** | IA | Agentes Especializados | Execução de capabilities de agentes por cargo | SIM | 🟢 FUNCIONA | M5 | SIM | SIM | SIM | LangChain/LangGraph| SIM | SIM | Nenhuma | P3 |
| **TL-021** | Analytics| Analytics Executivo | Dashboards de performance, conversão e funil | SIM | 🟢 FUNCIONA | M5 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Nenhuma | P3 |
| **TL-022** | Analytics| Comercial Inteligente| Análise de cohort, metas e produtividade | SIM | 🟢 FUNCIONA | M5 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Nenhuma | P3 |
| **TL-023** | Analytics| AI Token Usage | Monitoramento de custo e consumo de tokens | SIM | 🟢 FUNCIONA | M4 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Nenhuma | P3 |
| **TL-024** | Playbook| Matriz Qualificação | Definição de critérios BANT/SPICED por empresa| SIM | 🟢 FUNCIONA | M4 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Adicionar sugestão por IA | P2 |
| **TL-025** | Playbook| Matriz Objeções | Repositório de contornamento de objeções | SIM | 🟢 FUNCIONA | M4 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Conectar ao Roleplay de áudio | P2 |
| **TL-026** | Trein. | Roleplay de Chamadas | Simulação de chamadas comerciais em áudio | SIM | 🟡 PARCIAL | M3 | SIM | SIM | SIM | WebSpeech / LiteLLM| SIM | NÃO | Adicionar síntese TTS natural | P2 |
| **TL-027** | Trein. | Chatbook Sales Guide | Guia interativo de roteiros de vendas | SIM | ⚪ MOCK | M1 | MOCK | MOCK | NÃO | Nenhuma | NÃO | NÃO | Conectar ao RAG da empresa | P2 |
| **TL-028** | Integ. | Bitrix24 Connector | Sync bidirecional de contatos e negócios | SIM | 🟡 PARCIAL | M3 | NÃO | SIM | SIM | Bitrix REST API | SIM | NÃO | Sanitizar payload de webhook | P2 |
| **TL-029** | Integ. | WhatsApp Baileys | Envio e recepção de mensagens via QR Code | SIM | 🟡 PARCIAL | M3 | NÃO | SIM | SIM | Baileys Socket | SIM | NÃO | Tratar desconexão periódica | P2 |
| **TL-030** | Integ. | Telefonia 3CX | Disparador de chamadas Click-to-Call | SIM | 🟡 PARCIAL | M3 | NÃO | SIM | SIM | 3CX REST API | SIM | NÃO | Validar escuta de webhook de encerramento | P2 |
| **TL-031** | Gover. | Gestão de Job Roles | Catálogo de cargos, agentes e permissões | SIM | 🟢 FUNCIONA | M5 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Nenhuma | P3 |
| **TL-032** | Gover. | Access Requests | Workflow de aprovação de privilégios cruzados | SIM | 🟢 FUNCIONA | M5 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Nenhuma | P3 |
| **TL-033** | Admin | Module Access Admin | Concessão individual de módulos executivos | SIM | 🟢 FUNCIONA | M5 | NÃO | SIM | SIM | Prisma DB | SIM | SIM | Nenhuma | P3 |
| **TL-034** | Admin | Proteção LGPD | Anonimização e exportação de dados pessoais | SIM | 🟢 FUNCIONA | M4 | SIM | SIM | SIM | Prisma DB / Sanit.| SIM | SIM | Nenhuma | P3 |
| **TL-035** | Gamif. | SpaceGame 3D | Jogo 3D de incentivo para vendedores | SIM | 🔴 QUEBRADA| M1 | NÃO | NÃO | NÃO | Nenhuma | NÃO | NÃO | Corrigir suporte WebGL/Canvas | P3 |

---

## 6. FICHAS INDIVIDUAIS SELECIONADAS (TOOL CARDS)

### TOOL-017 — Copiloto Comercial IA
- **Objetivo:** Assistente conversacional inteligente que auxilia SDRs e Executivos de Vendas com análise de leads, sugestão de próximos passos e execução de ações no CRM.
- **Localização:**
  - Frontend: `src/features/copiloto-ia/components/CopilotoIaHub.tsx`
  - Backend: `src/features/copiloto-ia/routes/copilotoIa.routes.ts`
  - Service: `src/features/intelligence/services/ai.service.ts`
- **Status:** 🟢 FUNCIONA | **Maturidade:** M5
- **IA:** SIM (Provider: LiteLLM / Groq | Modelo: `llama-3.3-70b-versatile` | Contexto Real do Lead e Histórico)
- **O que funciona:** Conversação fluida, memória de contexto por lead, chamada de ferramentas CRM (Function Calling) e geração de e-mails personalizados.
- **Problema Principal:** Nenhum impeditivo.
- **Prioridade:** P3 | **Esforço Estimado:** Baixo.

### TOOL-006 — Mesa de Tratamento SDR
- **Objetivo:** Fila unificada e priorizada de trabalho diário para SDRs com timer Pomodoro, histórico rápido e ações de 1-clique.
- **Localização:**
  - Frontend: `src/features/mesa-tratamento/components/MesaTratamento.tsx`
  - Backend: `src/bootstrap/routes.ts` (`/api/mesa-tratamento`)
  - Service: `src/features/mesa-tratamento/services/mesa-triage.service.ts`
- **Status:** 🟢 FUNCIONA | **Maturidade:** M5
- **IA:** NÃO (Algoritmo determinístico de scoring e triagem)
- **O que funciona:** Fila de atendimento, contador de tempo, transição de status, registro de notas e agendamento de reuniões.
- **Melhorias recomendadas:** Integrar botão de discagem direta para WhatsApp/3CX.
- **Prioridade:** P2 | **Esforço Estimado:** Médio.

### TOOL-027 — Chatbook Sales Guide
- **Objetivo:** Guia interativo de roteiros de vendas e quebra de objeções em tempo real.
- **Localização:**
  - Frontend: `src/features/chatbook/components/ChatbookHub.tsx`
  - Backend: Ausente (somente dados locais)
- **Status:** ⚪ SOMENTE INTERFACE / MOCK | **Maturidade:** M1
- **IA:** APARENTE/MOCK (Exibe respostas pré-formatadas sem chamada de LLM)
- **O que não funciona:** Não possui sincronização com a Matriz de Objeções do banco e não utiliza IA para adaptar respostas ao contexto da empresa.
- **Para ficar funcional:** Conectar ao `knowledge-copilot.service.ts` e repositório Prisma de Objeções.
- **Prioridade:** P2 | **Esforço Estimado:** Médio.

---

## 7. MATRIZ DE OPORTUNIDADES E USO DE IA (AI OPPORTUNITIES MATRIX)

| Ferramenta Atual | Hoje usa IA? | IA Agregaria Valor? | Caso de Uso Sugerido | Impacto | Complexidade |
| --- | --- | --- | --- | --- | --- |
| **Mesa de Tratamento SDR** | NÃO | SIM | Resumo instantâneo do lead antes da chamada | ALTO | BAIXA |
| **Cadência de Vendas** | NÃO | SIM | Adaptação automática do tom do e-mail por segmento | ALTO | MÉDIA |
| **Matriz de Objeções** | NÃO | SIM | Sugestão automática de réplica com base em transcrição | MÉDIO | MÉDIA |
| **Gestão de Propostas** | PARCIAL | SIM | Geração automática do escopo técnico com base na reunião | ALTO | MÉDIA |
| **Analytics Executivo** | NÃO | SIM | Diagnóstico narrativo automático das quedas de conversão | ALTO | BAIXA |
| **WhatsApp Connector** | NÃO | SIM | Sugestão de resposta rápida baseada no contexto do chat | ALTO | MÉDIA |

---

## 8. CAPACIDADES ESCONDIDAS NO CÓDIGO (PURPLE - HIDDEN CAPACITIES)

1. **RAG Avançado com Reranker e HyDE (`knowledge-copilot.service.ts`):**
   - *Descrição:* Código totalmente funcional para expansão de query por hipótese (HyDE) e re-rankeamento de resultados de busca vetorial. Não exposto diretamente como botão simples na UI.
2. **Motor de Enriquecimento e Qualificação B2B (`qualityEnrichment.ts`):**
   - *Descrição:* Algoritmo de cálculo de FitScore com calibração por segmento (`fitScoreCalibration.ts`). Executado no backend, mas o detalhe do cálculo não é exibido graficamente na UI.
3. **Worker de Análise Automática de Win/Loss (`winLossAnalysis.worker.ts`):**
   - *Descrição:* Worker assíncrono BullMQ que analisa dados de oportunidades ganhas/perdidas via LLM para extrair razões estruturadas.
4. **Análise de Risco Territorial RNTRC (`rntrcTerritorialRisk.service.ts`):**
   - *Descrição:* Serviço especializado para validação de registros de transporte e risco por estado/município.
5. **Guardrail de Sanitização LGPD por IA (`lgpd-sanitizer.service.ts`):**
   - *Descrição:* Filtro de remoção automática de PII (CPFs, senhas, cartões) antes do envio de prompts a modelos externos.

---

## 9. TOP LISTS OBRIGATÓRIAS

### 🏆 TOP 10 FERRAMENTAS MAIS MADURAS (M5 / PRODUÇÃO)
1. **Pipeline Kanban CRM** (`/app/crm`)
2. **Mesa de Tratamento SDR** (`/app/mesa-tratamento`)
3. **Copiloto Comercial IA** (`/app/copiloto_ia`)
4. **CRM 360 & Visão de Conta** (`/app/crm360`)
5. **Comercial Inteligente / Gestão Executiva** (`/app/commercial_intelligence`)
6. **Central AI Suite** (`/app/intelligence`)
7. **Gestão de Cargos, Agentes e Permissões** (`/app/job-roles`)
8. **Workflow de Solicitações de Acesso (AccessRequests)** (`/app/access-requests`)
9. **LDR & Scoring Territorial B2B** (`/app/market-intelligence`)
10. **Consulta CNPJ via BrasilAPI** (`/app/prospect/tools`)

### 🚀 TOP 10 MAIS PRÓXIMAS DE FICAR TOTALMENTE PRONTAS
1. **Módulo de Propostas com PDF** (Apenas conectar gerador de IA)
2. **Cadência de Vendas** (Mudar de transportador stub para SMTP real)
3. **Conector WhatsApp Baileys** (Adicionar reconexão automática de socket)
4. **Integração Bitrix24** (Sanitizar entrada de webhook)
5. **Integração Google Workspace** (Preencher chaves de OAuth no .env)
6. **Apollo.io Lead Search** (Inserir chave API válida)
7. **Hunter.io Email Verifier** (Inserir chave API válida)
8. **Roleplay de Áudio** (Conectar síntese TTS nativa do navegador/OpenAI)
9. **Matriz de Objeções** (Vincular botão "Sugerir com IA")
10. **Telefonia 3CX** (Ajustar escuta do evento hangup)

---

## 10. ROADMAP RECOMENDADO DE 5 ONDAS (EXECUTION ROADMAP)

### ONDA 1 — Quick Wins (Desbloqueio Imediato)
- **Ação 1.1:** Mudar transportador de e-mail da Cadência de Vendas para SMTP real via Nodemailer.
- **Ação 1.2:** Adicionar reconexão automática ao Socket do WhatsApp Baileys.
- **Ação 1.3:** Conectar RAG do `knowledge-copilot.service.ts` ao botão de busca de Playbook.

### ONDA 2 — Capacidades Estratégicas
- **Ação 2.1:** Conectar gerador de propostas comerciais por IA no Módulo de Propostas.
- **Ação 2.2:** Expor detalhes do FitScore e Qualificação B2B no Card do Lead.
- **Ação 2.3:** Integrar discador Click-to-Call direto na Mesa de Tratamento SDR.

### ONDA 3 — Consolidação de IA e Automação
- **Ação 3.1:** Unificar Copiloto IA, Central AI Suite e AI Studio sob uma única interface modular.
- **Ação 3.2:** Ativar Worker BullMQ de Análise de Win/Loss por IA em segundo plano.

### ONDA 4 — Consolidação e Remoção de Mocks
- **Ação 4.1:** Substituir dados estáticos do Chatbook por RAG em tempo real da empresa.
- **Ação 4.2:** Remover/substituir o widget SpaceGame 3D por dashboard gamificado em Canvas 2D limpo.

### ONDA 5 — Produção, Segurança e Escala
- **Ação 5.1:** Habilitar auditoria de logs RLS por tenant em produção.
- **Ação 5.2:** Executar testes de carga k6 e varredura de vulnerabilidades ZAP.

---
*Relatório gerado automaticamente via Auditoria Mestre da Central de Inteligência Comercial AtlasGR.*
