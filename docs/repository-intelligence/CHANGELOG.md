# CHANGELOG

## v5.0 — 2026-09-25

**Commit:** 1dec130b8ed77d05749aefca86a03401b2ab88fb  
**Branch:** main  
**Generator:** Repository Documentation Architect V5 (Pipeline Unified)

### FIXED

- **Unificação de Relatórios de Consistência:**
  - Removido `cross-check-report.json` (arquivo duplicado)
  - Cross-checks integrados em `consistency-report.json` como `check07`, `check08`, `check09`, `check10`
  - Agora existe uma única fonte de verdade para validações

- **Snapshot Semântico:**
  - Corrigido erro semântico em `models.prisma: "135+ migrations"`
  - Separado em `database.migrationCount: 135` e `models.count: 100`
  - Isso corrige a distinção entre quantidade de migrations e quantidade de modelos

- **Rastreabilidade de IDs:**
  - `consistency-report.json` agora referencia `snapshotId: 2026-09-25-repo-snapshot-v5` (correto)
  - Adicionados `crossCheckReportId` e `documentGenerationId` para rastreabilidade completa
  - Tudo amarrado ao mesmo snapshot

### ADDED

- **Screen Inventory (04-UI-UX-DESIGN.html):**
  - Nova seção `#screen-inventory` com inventário de telas por rota
  - Tabela com: Route, Screen Name, Source File, Primary Component, Auth, Role, API, States, Evidence
  - 14 telas documentadas com mapeamento para componentes e evidência
  - Isso resolve o check09 (Screen Parity) de PARTIAL para implementado

- **Brandbook V4.1 Tokens Aplicados (04-UI-UX-DESIGN.html):**
  - Atualizado para usar tokens Brandbook V4.1:
    - Midnight: #101D2F (antigo #0b132b)
    - Gold: #C69B52 (antigo #d4af37)
    - Ivory: #F5F2EA (antigo #f8fafc)
    - Blue: #315FD6
    - Pink: #BE326F
    - Red: #BE3B36
    - Muted: #58616C (antigo #a1a1aa)
  - Tipografia atualizada para Cabin (display/body) e IBM Plex Mono (data)
  - Cores de paleta visual atualizadas para refletir Brandbook V4.1

- **Novos Checks de Consistência:**
  - `check13_brandbookSync`: Verifica se documentos usam tokens Brandbook V4.1
  - `check14_screenInventory`: Verifica se UI/UX possui Screen Inventory

### CHANGED

- **04-UI-UX-DESIGN.html:**
  - 674 linhas → 867 linhas (+193 linhas do Screen Inventory)
  - Design System atualizado para Brandbook V4.1
  - Paleta de cores refeita com tokens oficiais
  - Tipografia alinhada com Brandbook V4.1

- **consistency-report.json:**
  - `check07-10`: PENDING → PASS/PARTIAL (com cross-check detalhado)
  - Adicionados `check13_brandbookSync`: PARTIAL
  - Adicionados `check14_screenInventory`: PARTIAL
  - Adicionado `brandbookIntegration` com status de sincronização
  - Adicionado `runtimeValidation.confidence`: CODE-VERIFIED, DOCUMENTATION-VERIFIED, RUNTIME-UNVERIFIED

### DETECTED

- **Brandbook Sync Status:**
  - Documentos HTML ainda usam tokens antigos em grande parte
  - Apenas 04-UI-UX-DESIGN.html foi atualizado para Brandbook V4.1
  - Outros 6 HTMLs ainda precisam de atualização de tokens

- **Runtime Validation:**
  - Continua NOT_AVAILABLE devido a memory error
  - Screenshots reais continuam pendentes
  - Melhorado runtime discovery em V5 para tentar build → static → dev → constraints

### PENDING

- Atualizar 00-INDEX.html, 01-PRD.html, 02-TRD.html, 03-APP-FLOW.html, 05-BACKEND-SCHEMA.html, 06-IMPLEMENTATION-PLAN.html, 07-REPOSITORY-EVIDENCE.html para usar tokens Brandbook V4.1
- Capturar screenshots reais (requer resolver runtime limitation)
- Validar paridade de rotas entre App Flow e src/App.tsx

### NOTES

- V5 é um passo intermediário: arquitetura de pipeline unificada, mas execução parcial
- Brandbook tokens parcialmente aplicados (1/7 documentos)
- Screen Inventory adicionado, mas screenshots ainda NOT_AVAILABLE
- Próximo passo seria V6: completar Brandbook sync e resolver runtime para screenshots

---

## v4.0 — 2026-09-25

**Commit:** 1dec130b8ed77d05749aefca86a03401b2ab88fb  
**Branch:** main  
**Generator:** Repository Documentation Architect V4 (Evidence & Runtime Validation)

### ADDED

- **07-REPOSITORY-EVIDENCE.html**
  - Livro-caixa de evidências linha-a-linha
  - Tabela de funcionalidades com status, tipo de evidência, arquivos e localização
  - Seções por domínio: CRM, Prospecção, Inteligência, Integrações
  - Runtime validation status (FAILED due to memory error)
  - Cross-check summary com status de cada validação
  - 592 linhas

- **data/cross-check-report.json**
  - Relatório detalhado de cross-checks entre documentos
  - Feature consistency analysis (PASS)
  - Endpoint parity analysis (PARTIAL - não aplicável)
  - Screen parity analysis (PARTIAL - não aplicável)
  - Module parity analysis (PASS)
  - Runtime validation details (FAILED)
  - Recomendações para próximos passos

### EXECUTED

- **Cross-Check Automatizado:**
  - Feature consistency: Todas as funcionalidades IMPLEMENTADO no PRD têm evidência de código
  - Module parity: Todos os módulos do PRD têm rotas no App Flow
  - Endpoint/Screen parity: Não aplicável devido ao escopo dos documentos

- **Runtime Validation Attempt:**
  - Tentativa de executar `npm run dev` para captura de screenshots
  - Resultado: FAILED - "Fatal process out of memory: Re-embedded builtins: set permissions"
  - Screenshots: NONE (não possível capturar devido ao erro)

### DETECTED

- **Runtime Limitation:**
  - Aplicação não pôde ser executada devido a memory error
  - tsx watch atingiu memory limit durante startup
  - Screenshots reais não capturados

- **Cross-Check Insights:**
  - UI/UX não documenta telas individuais, apenas design system
  - App Flow vs Backend Schema não têm paridade direta (frontend vs backend)
  - Isso é esperado, não um bug

### CHANGED

- **00-INDEX.html**
  - Adicionado card para 07-REPOSITORY-EVIDENCE.html
  - Atualizado contagem de documentos (6 → 7)

### FIXED

- Documentação agora inclui evidência linha-a-linha para cada funcionalidade
- Cross-checks automatizados executados e documentados
- Runtime validation status documentado (mesmo com falha)

### NOTES

- Screenshots reais continuam pendentes devido a limitação de runtime
- Recomenda-se investigar memory leak ou executar em ambiente com mais recursos
- Alternativa: usar build ao invés de watch para screenshots

---

## v3.0 — 2026-09-25

**Commit:** 1dec130b8ed77d05749aefca86a03401b2ab88fb  
**Branch:** main  
**Generator:** Repository Documentation Architect V3 (Evidence-Governed)

### CHANGED

- **06-IMPLEMENTATION-PLAN.html**
  - Atualizado de "AtlasGR" para "Birth Hub 360"
  - Expandido de formato simples (ID/Task/Priority/Status) para formato robusto (ID/TASK/PRIORITY/STATUS/EVIDENCE/FILES/VALIDATION)
  - Adicionadas 6 fases: Audit, Foundation, Backend, Frontend, Integrations, Security, Testing
  - Cada item agora possui evidência, arquivos envolvidos e comando de validação
  - Linhas: 447 → 707

- **00-INDEX.html**
  - Atualizado de "AtlasGR" para "Birth Hub 360"
  - Layout consistente com outros documentos (gradient, sidebar, metadata)
  - Adicionada seção de estatísticas (documentos, rotas, endpoints, migrations, workers, integrações)
  - Adicionada seção de consistência da documentação com checks
  - Adicionado changelog detalhado
  - Linhas: 350+ → 543

### DETECTED

- **Identity Inconsistency:**
  - 06-IMPLEMENTATION-PLAN.html referenciava "AtlasGR" no título e metadata
  - 00-INDEX.html referenciava "AtlasGR" no título e metadata
  - CHANGELOG.md referenciava "AtlasGR" na v1.0
  - **Action:** Todos atualizados para "Birth Hub 360"

- **Commit Inconsistency:**
  - 06-IMPLEMENTATION-PLAN.html tinha commit "7a71a56" (errado)
  - **Action:** Atualizado para "1dec130b"

- **UI/UX Evidence Gap:**
  - 04-UI-UX-DESIGN.html não possui screenshots reais das telas
  - **Action:** Marcado como PARCIAL no INDEX, requer execução de runtime para captura

- **Link Validation Gap:**
  - Links internos entre documentos não foram validados
  - **Action:** Marcado como PENDENTE na seção de consistência

- **Route Parity Gap:**
  - Paridade entre rotas documentadas em 03-APP-FLOW.html e src/App.tsx não validada
  - **Action:** Marcado como PENDENTE na seção de consistência

### ADDED

- **data/repository-snapshot.json**
  - Snapshot centralizado do repositório com metadata, identidade do projeto, snapshot técnico e snapshot de evidência
  - Contém detectedLegacyNames: ["AtlasGR", "Atlas"]
  - Servirá como fonte única de verdade para gerações futuras

- **data/consistency-report.json**
  - (Estrutura) Relatório de consistência para ser preenchido pelos gates

### FIXED

- Nome do projeto em todos os documentos agora é "Birth Hub 360"
- Commit consistente em todos os documentos: 1dec130b
- Links entre documentos atualizados para nomes reais de arquivos

---

## v2.0 — 2026-09-25

**Commit:** [Não registrado no CHANGELOG original]  
**Branch:** main  
**Generator:** Repository Documentation Architect V2

### CHANGED

- **01-PRD.html**
  - Regenerado com estrutura completa em pt-BR
  - Visão de produto, personas, JTBD, módulos, jornada, regras de negócio
  - 828 linhas (expansão significativa)

- **02-TRD.html**
  - Regenerado com arquitetura técnica detalhada
  - Stack, banco, API, segurança, infraestrutura, deploy
  - 758 linhas (expansão significativa)

- **03-APP-FLOW.html**
  - Regenerado com rotas, guards, autenticação e fluxos detalhados
  - 703 linhas (expansão significativa)

### DETECTED

- Documentos v2.0 evoluíram significativamente em profundidade
- Mas UI/UX e Implementation Plan continuaram no formato v1.0
- Isso causou inconsistência de profundidade entre documentos

---

## v1.0 — Data anterior

**Commit:** 7a71a56 (registrado no CHANGELOG original)  
**Branch:** [Não registrado]  
**Generator:** Repository Documentation Architect V1

### ADDED

- Documentação inicial para "AtlasGR" (nome legado)
- Estrutura básica de 6 documentos HTML + INDEX + CHANGELOG

### NOTES

- Nome do projeto era "AtlasGR" (legado)
- Commit 7a71a56 não corresponde ao commit atual do repositório
- Documentos tinham profundidade variável, sem governança de snapshot
