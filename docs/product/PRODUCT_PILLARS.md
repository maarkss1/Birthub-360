# Product Pillars (Birth Hub 360º)

De acordo com o **P1 — PRODUCT CONVERGENCE**, este documento atua como a taxonomia oficial do repositório, mapeando cada módulo da pasta `src/features` para o seu respectivo pilar de experiência ou para a base de infraestrutura técnica.

Esta divisão garante que o produto foque em **Casos de Uso Comerciais** e minimize o vazamento de termos puramente arquiteturais ou de inteligência artificial bruta (RAG, Agents) para o usuário final.

---

## Pillar 01 — CRM Comercial
*Centro de execução de receita.*

- `crm`: Funil de vendas, oportunidades, pipelines.
- `crm360`: Visões agregadas e unificadas de clientes.
- `contacts`: Entidades canônicas (pessoas).
- `companies`: Entidades canônicas (organizações).
- `team`: Gestão de equipe e hierarquia.
- `job-roles`: Definições de cargos e permissões associadas.
- `activities`: Histórico de execução e ações.
- `notes`: Anotações manuais.
- `attachments`: Arquivos vinculados.
- `dashboard`: Visões agregadas e análise.
- `analytics`: Análise de métricas, forecast e pipeline.
- `commercial-intelligence`: Central de inteligência do gestor.
- `mesa-tratamento`: Mesa de execução SDR/BDR.
- `calendar`: Agendamento de reuniões.
- `social-selling`: Integração com LinkedIn/Redes.

## Pillar 02 — Prospecção Inteligente
*Centro de geração e priorização de pipeline.*

- `prospecting`: Pesquisa, listas e definição de ICP.
- `cadence`: Orquestração de touchpoints e réguas de relacionamento.
- `market-intelligence`: Dados externos e mercado.

## Pillar 03 — Copiloto Comercial IA
*Centro de inteligência, decisão e assistência.*

- `copiloto-ia`: Interface e orquestração do Copiloto (Substitui "Agents").
- `intelligence`: Abstrações puras do motor de inteligência e conectores.
- `roleplay`: Treinamento e simulação com IA ("Faça comigo").
- `automations`: Interface de regras e gatilhos automatizados (Substitui "Automation Engine").
- `playbook`: Diretrizes de IA embutidas no processo.
- `knowledge`: Base de conhecimento para o RAG, abstraída como "Configurações do Copiloto".
- `hub`: Centralizador de ferramentas do hub de inteligência.
- `chatbook`: Modelos de prompt prontos.

## Engine / Infrastructure
*Camada técnica (invisível na navegação primária).*

- `auth`: Sistema de login, sessão e biometria.
- `billing`: Assinaturas e gateways de pagamento.
- `integrations`: Bitrix, Birth Voices, Apollo, WhatsApp, Email, etc.
- `notifications`: Websockets e Novu (a consolidar).
- `workspace`: Personalização e scaffolding de interface.
- `feature-flags`: Toggles de sistema.
- `lgpd`: Controles de dados, portabilidade e ofuscação.
- `bug-reports`: Coleta de telemetria e feedback de usuários.
- `design-lab`: Componentes genéricos de design e estilo puro.
- `document-editor`: Módulo técnico de rich text e templates.
- `module-access`: Controle interno de módulos ativos.
- `onboarding`: Passos de introdução ao sistema.
- `settings`: Configurações globais e de tenant.
- `gamification`: Motor de regras de pontuação (se habilitado).
