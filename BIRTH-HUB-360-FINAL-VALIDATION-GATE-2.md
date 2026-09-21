# BIRTH HUB 360° — FINAL VALIDATION GATE 2
**Auditoria Forense do Validador, Revalidação Técnica contra o Repositório Canônico e Parecer Definitivo de Gate**
*Documento de Auditoria e Arbitragem Arquitetural — Versão Canônica 2.0 (Setembro de 2026)*

---

# 1. EXECUTIVE VERDICT (VEREDITO EXECUTIVO)

```text
========================================================================================
                      BIRTH HUB 360° — FINAL VALIDATION GATE 2: DECISION
========================================================================================

  DECISÃO FINAL DO GATE:     🔴 BLOCKED (NO-GO PARA IMPLEMENTAÇÃO)
  STATUS DE CANONICIDADE:   NÃO CANÔNICO (CANONICAL DESIGN SYSTEM: REJEITADO)
  ESTADO DE IMPLEMENTAÇÃO:  IMPLEMENTATION READY: NO (WAVE 1 BLOQUEADA)
  NÍVEL DE CERTEZA TÉCNICA:  100% (Evidência Empírica, Matemática e Forense sem Sintéticos)

  SUMÁRIO DA DECISÃO:
  O Design System do Birth Hub 360° NÃO pode ser considerado canônico e NENHUM agente de
  implementação está autorizado a alterar o código-fonte da aplicação neste momento.

  MOTIVOS DETERMINANTES DO BLOQUEIO:
  1. A Master Specification contém 4 Bloqueadores Críticos (VAL-001 a VAL-004) não sanados
     em seu próprio texto, incluindo ordem de deleção de componente ativo em produção
     (Sidebar.tsx) e violação de acessibilidade WCAG 2.1 AA em hover/active de botões.
  2. O Validation Report anterior cometeu erro matemático no finding VAL-010 (afirmando que
     #065F46 sobre fundo verde #10B981 atinge 5.82:1, quando o ratio real calculado é 3.03:1,
     reprovando em texto normal WCAG AA).
  3. O Validation Report anterior emitiu status ambíguo e prematuro de "PASS WITH CONDITIONS",
     violando a regra de governança estrita que exige zero bloqueadores para aprovação.
  4. O repositório canônico local encontra-se em estado 'dirty' (M src/components/layout/Sidebar.tsx)
     e 7 commits atrás de origin/main, exigindo sincronização prévia de branch.

  AÇÃO IMEDIATA EXIGIDA:
  Sanear cirurgicamente os arquivos de especificação (Markdown e HTML) conforme o Blueprint
  da Seção 21 antes de submeter a novo Gate. Nenhuma linha de código deve ser alterada agora.

========================================================================================
```

---

# 2. CANONICAL REPOSITORY IDENTITY (IDENTIDADE DO REPOSITÓRIO CANÔNICO)

Conforme a Regra 27 do protocolo de auditoria:
> *"A Validation Report is not authoritative unless the exact repository, branch and commit analyzed are explicitly identified and correspond to the current Birth Hub 360° canonical codebase."*

Abaixo constam os parâmetros físicos e imutáveis coletados diretamente no terminal de execução:

| Parâmetro de Auditoria | Valor Verificado no Repositório | Status Forense |
|---|---|---|
| **Caminho Físico Canônico** | `C:\GitHub\Birthub-360` | **VERIFICADO** (`Test-Path: True`) |
| **Remote Origin URL** | `https://github.com/maarkss1/Birthub-360.git` | **VERIFICADO** (Repositório Oficial) |
| **Branch Ativa Atual** | `main` | **VERIFICADO** |
| **Commit SHA Auditado (HEAD)** | `8ebd31f1e04c70339e4e7e42326f339a3fb996c3` | **CANÔNICO** |
| **Mensagem do Último Commit** | `8ebd31f1 docs(release): conclui prompt 17 - release gate evidence e decisao final de go-live (RELEASE APPROVED)` | **VERIFICADO** |
| **Estado da Working Tree** | `DIRTY` (`M src/components/layout/Sidebar.tsx` pendente) | **ALERTA DE HIGIENE** |
| **Existência da Branch `main`** | Presente (`main` local e `origin/main` remota) | **VERIFICADO** |
| **Existência da Branch `develop`** | Ausente (Não existe local nem remotamente) | **CONSTATADO** |
| **Sincronização com Remoto** | `Behind origin/main by 7 commits` (Fast-forward pendente) | **DIVERGÊNCIA DETECTADA** |

### Auditoria da Origem Citada no Validation Report Anterior
- O Validation Report anterior citou na linha 12: *"Base de código real do repositório CENTRAL-DE-INTELIGENCIA-COMECIAL-ATLASGR (1.168 arquivos...)"*.
- **Análise Forense**: Embora o nome `CENTRAL-DE-INTELIGENCIA-COMECIAL-ATLASGR` conste no cabeçalho do arquivo `/AGENTS.md` (linha 3), o nome e diretório canônico da aplicação é `Birthub-360` (`C:\GitHub\Birthub-360`). Os 1.168 arquivos auditados residem fisicamente em `C:\GitHub\Birthub-360`. Não houve utilização de repositório externo ou snapshot desvinculado, mas sim herança de nomenclatura legada do `AGENTS.md`.

---

# 3. SOURCE VALIDATION (VALIDAÇÃO DAS FONTES OBRIGATÓRIAS)

| Fonte Designada | Caminho / Artefato | Presença no Repositório | Presença Externa (Desktop) | Status da Fonte |
|---|---|---|---|---|
| **Fonte A** | `C:\GitHub\Birthub-360` | **SIM** (Raiz canônica) | N/A | **VALID SOURCE** |
| **Fonte B (HTML)** | `BIRTH_HUB_360_DESIGN_SYSTEM_MASTER_SPECIFICATION.html` | NÃO (Apenas no Desktop) | **SIM** (`C:\Users\Marks\Desktop\`) | **VALID ARTIFACT (EXTERNAL)** |
| **Fonte B (MD)** | `BIRTH-HUB-360-DESIGN-SYSTEM-MASTER-SPECIFICATION.md` | **SIM** (Raiz do repositório) | NÃO | **VALID SOURCE (REPO)** |
| **Fonte C (MD)** | `BIRTH_HUB_360_DESIGN_SYSTEM_VALIDATION_REPORT.md` | **SIM** (Raiz do repositório) | **SIM** (`C:\Users\Marks\Desktop\`) | **VALID SOURCE** |
| **Fonte D (HTML)** | `AUDITORIA_FORENSE_DESIGN_SYSTEM.html` | **NÃO** (Inexistente na raiz) | **SIM** (`C:\Users\Marks\Desktop\`) | **MISSING IN REPO (EXTERNAL ONLY)** |

---

# 4. VALIDATION REPORT AUDIT (AUDITORIA DO PRÓPRIO VALIDADOR)

Avaliamos a integridade técnica, factual e matemática dos findings declarados no relatório anterior:

| ID Finding | Objeto Auditado | Severidade Declarada | Verificação em Código Real | Precisão Matemática | Status Final do Finding |
|---|---|---|---|---|---|
| **VAL-001** | Deleção de `Sidebar.tsx` / Falso `AppSidebar.tsx` | `CRITICAL` | Arquivo citado existe; substituto não existe | N/A | **VERIFIED BLOCKER** |
| **VAL-002** | Contraste Hover/Active de Botões (< 4.5:1) | `CRITICAL` | Classes e tokens existem na spec | Ratio recalculado: 4.41:1 e 3.25:1 | **VERIFIED BLOCKER** |
| **VAL-003** | Divergência Dimensional HTML vs Spec (320/260, 64/56) | `HIGH` | Linhas 41-45 e 262 do HTML verificadas | Deltas de 60px, 8px e 40px comprovados | **VERIFIED BLOCKER** |
| **VAL-004** | Inversão de Z-Index (`dropdown: 100` < `sticky: 200`) | `HIGH` | Seção 19 da Spec vs componentes | Falha de empilhamento reproduzível | **VERIFIED BLOCKER** |
| **VAL-005** | Tokens Órfãos na Matriz de Estados (`border.danger`, etc.) | `HIGH` | Tokens citados na Seção 23 e ausentes em 6.1 | Ocorrências textuais comprovadas | **PARTIALLY VERIFIED** |
| **VAL-006** | Draft Auto-Save em `sessionStorage` sem Tenant ID / LGPD | `MEDIUM` | Seção 24.1 item 4 comprovada | Análise jurídica e técnica de LGPD | **VERIFIED NON-BLOCKING** |
| **VAL-007** | Tags `<li>` órfãs no documento HTML | `MEDIUM` | 15 ocorrências comprovadas no HTML | Violação de parser W3C comprovada | **VERIFIED NON-BLOCKING** |
| **VAL-008** | Altura 36px vs Line-Height 21px ($7.5\text{px}$ resíduo) | `MEDIUM` | Equação de renderização comprovada | $36 - 21 = 15 \implies 7.5\text{px}$ | **VERIFIED NON-BLOCKING** |
| **VAL-009** | Erro na Evidência E6 (`Voice` com `z-900` vs `ClickSpark` `z-9999`) | `LOW` | `Voice` usa `z-[900]`, `ClickSpark` usa `z-[9999]` | Linhas 146 e 28 auditadas | **VERIFIED NON-BLOCKING** |
| **VAL-010** | Contraste de Badge de Sucesso na Seção 5.3 da Spec | `INFO` | Spec Seção 5.3 alega 6.10:1 (real é 3.83:1) | **Relatório errou**: alegou 5.82:1 em fundo sólido verde (real é 3.03:1) | **PARTIALLY VERIFIED / REPORT DEFECT** |

---

# 5. VAL-001 REVALIDATION (AUDITORIA EXAUSTIVA DA SIDEBAR)

O finding `VAL-001` apontou que a Master Specification ordenou a deprecação e remoção física de `Sidebar.tsx` sob a suposição de que o arquivo `AppSidebar.tsx` existia como substituto moderno.

### Questionário Obrigatório do Gate:
- **A. `Sidebar.tsx` existe?** **SIM**. Localizado fisicamente em `src/components/layout/Sidebar.tsx` (360 linhas).
- **B. `AppSidebar.tsx` existe?** **NÃO**. Executado `git grep "AppSidebar"` e busca de arquivos no disco: **ZERO ocorrências**. Não existe no histórico recente nem em branches locais.
- **C. Qual componente realmente controla a Sidebar atual?** `src/components/layout/Sidebar.tsx`.
- **D. Qual componente realmente é utilizado em runtime?** `src/components/layout/Sidebar.tsx`.
- **E. Existe importação/reexportação?** Não há reexportação. `src/components/layout/MainLayout.tsx` importa diretamente na linha 14: `import { Sidebar } from './Sidebar';` e o instancia na linha 59. `MainLayout` envolve todas as rotas em `src/App.tsx`.
- **F. Existe mais de uma implementação?** NÃO. Não há duplicidade em `src/`. O arquivo em `tests/unit/components/layout/Sidebar.test.tsx` é sua suite de testes unitários.
- **G. O Validation Report confundiu arquitetura atual com arquitetura desejada?** O Validation Report identificou corretamente o erro da Master Specification: foi a Master Spec que confundiu uma proposta teórica com a realidade do repositório.
- **H. A recomendação de remoção continua válida?** **ABSOLUTAMENTE NÃO**. Deletar `Sidebar.tsx` geraria quebra imediata de compilação no Vite e tela branca total no app.

```text
----------------------------------------------------------------------------------------
VAL-001: REVALIDATION CERTIFICATE
----------------------------------------------------------------------------------------
SOURCE VERIFIED:         YES (src/components/layout/Sidebar.tsx)
RUNTIME COMPONENT:       Sidebar (export function Sidebar em Sidebar.tsx)
FILES AUDITED:           src/components/layout/Sidebar.tsx
                         tests/unit/components/layout/Sidebar.test.tsx
IMPORT CHAIN:            src/App.tsx -> src/components/layout/MainLayout.tsx:14,59
FINDING VALIDITY:        VERIFIED BLOCKER (100% Confirmado)
RECOMMENDATION VALIDITY: VALID (Refatorar Sidebar.tsx in-place; revogar ordem de deleção)
STATUS:                  BLOCKER
----------------------------------------------------------------------------------------
```

---

# 6. VAL-002 REVALIDATION (CONTRASTE HOVER E ACTIVE DE BOTÕES)

O finding `VAL-002` afirmou que a estratégia de escurecer os fundos dos botões em estados interativos (`hover` e `active`), mantendo o texto fixo em Deep Navy (`#0B132B`), degrada a razão de contraste para níveis abaixo do patamar mínimo de 4.5:1 exigido pela WCAG 2.1 AA para texto normal (< 18px / < 14pt bold).

### Reavaliação Matemática Independente:
Fórmula padrão WCAG 2.1:
$$L = 0.2126 	imes R + 0.7152 	imes G + 0.0722 	imes B$$
$$	ext{Contrast Ratio} = rac{max(L_1, L_2) + 0.05}{min(L_1, L_2) + 0.05}$$

Luminâncias relativas calculadas:
- Deep Navy (`#0B132B`): $L = 0.0071$
- Pure White (`#FFFFFF`): $L = 1.0000$
- Sunset Orange Default (`#FF5841`): $L = 0.2862$
- Sunset Orange Hover (`#E0442E`): $L = 0.2018$
- Sunset Orange Active (`#C0321F`): $L = 0.1359$
- Fix Candidate Hover (`#E64A32`): $L = 0.2195$
- Destructive Rose Default (`#F43F5E`): $L = 0.2360$
- Destructive Rose Hover (`#E11D48`): $L = 0.1735$
- Destructive Rose Active (`#BE123C`): $L = 0.1171$
- Intelligence Red-Violet (`#C53678`): $L = 0.1586$

### Tabela Forense de Contraste em Botões de Ação:

| Componente / Estado | Cor Texto (FG) | Cor Fundo (BG) | $L_1$ | $L_2$ | Ratio Calculado | Veredito WCAG 2.1 AA |
|---|---|---|---|---|---|---|
| **Botão Primário Default** | `#0B132B` | `#FF5841` | 0.0071 | 0.2862 | **5.89:1** | **PASS** (Normal e Large) |
| **Botão Primário Hover (Spec)** | `#0B132B` | `#E0442E` | 0.0071 | 0.2018 | **4.41:1** | **FAIL** (Normal < 18px) |
| **Botão Primário Active (Spec)** | `#0B132B` | `#C0321F` | 0.0071 | 0.1359 | **3.25:1** | **FAIL GRAVE** (Normal < 18px) |
| **Botão Primário Hover (Fix)** | `#0B132B` | `#E64A32` | 0.0071 | 0.2195 | **4.72:1** | **PASS** (Normal e Large) |
| **Sunset Primário + Texto Branco** | `#FFFFFF` | `#FF5841` | 1.0000 | 0.2862 | **3.12:1** | **FAIL** (Confirma ADR-002) |
| **Sunset Active + Texto Branco** | `#FFFFFF` | `#C0321F` | 1.0000 | 0.1359 | **5.65:1** | **PASS** (Alternativa Válida) |
| **Botão Destrutivo Default** | `#0B132B` | `#F43F5E` | 0.0071 | 0.2360 | **5.01:1** | **PASS** (Normal e Large) |
| **Botão Destrutivo Hover (Spec)** | `#0B132B` | `#E11D48` | 0.0071 | 0.1735 | **3.91:1** | **FAIL** (Normal < 18px) |
| **Botão Destrutivo Active (Spec)** | `#0B132B` | `#BE123C` | 0.0071 | 0.1171 | **2.93:1** | **FAIL GRAVE** (< 3.0:1) |
| **Destrutivo Hover + Branco** | `#FFFFFF` | `#E11D48` | 1.0000 | 0.1735 | **4.70:1** | **PASS** (Texto Branco) |
| **Destrutivo Active + Branco** | `#FFFFFF` | `#BE123C` | 1.0000 | 0.1171 | **6.29:1** | **PASS** (Texto Branco) |
| **Botão IA (Intelligence) Default** | `#FFFFFF` | `#C53678` | 1.0000 | 0.1586 | **5.03:1** | **PASS** (Texto Branco) |
| **Botão IA c/ Deep Navy (Teste)** | `#0B132B` | `#C53678` | 0.0071 | 0.1586 | **3.65:1** | **FAIL** (Texto Navy Proibido aqui) |

**Conclusão Forense do VAL-002**:
- O finding do Validation Report está **100% CORRETO e CONFIRMADO como BLOCKER**.
- O número 4.76:1 citado no relatório para `#E64A32` sobre `#0B132B` apresentava uma imprecisão decimal mínima (+0.04), pois o valor matematicamente exato é **4.72:1** ($0.2695 / 0.0571$). Contudo, a conclusão de que `#E64A32` atinge aprovação WCAG AA ($ge 4.50:1$) permanece matematicamente inquestionável.

---

# 7. VAL-003 REVALIDATION (DIVERGÊNCIAS DIMENSIONAIS)

Confrontamos os valores declarados no cabeçalho CSS do arquivo HTML com as tabelas normativas da Master Spec e com o código-fonte real:

| Dimensão Crítica | Valor no HTML (`style`) | Valor na Spec (Tokens) | Valor no Código Real (`src/`) | Diagnóstico Forense |
|---|---|---|---|---|
| **Largura da Sidebar (Expanded)** | `320px` (Linha 44) | `260px` (`size.layout.sidebar`) | `16rem` (256px em `Sidebar.tsx:245`) | **CONFLITO CRÍTICO**: HTML declara 320px (+60px acima do token canônico). |
| **Altura da Topbar / Header** | `64px` (Linha 45) | `56px` (`size.layout.header`) | `h-16` (64px em `AppTopbar.tsx:81`) | **CONFLITO**: Spec definiu 56px, mas código atual e HTML usam 64px. |
| **Largura Máxima do Container** | `1400px` (Linha 262) | `1440px` (`size.container.dashboard`) | `max-w-[92rem]` (1472px em `globals.css:879`) | **CONFLITO**: HTML usa 1400px; Spec fixa 1440px; código usa 1472px. |
| **Token de Texto sobre Marca** | `--text-on-brand: #FFFFFF` (Linha 41) | `#0B132B` (ADR-002 Normativo) | Mistura de `text-white` e tokens | **VIOLAÇÃO**: O HTML traz `#FFFFFF` no `:root`, colidindo com a regra constitucional. |

**Conclusão Forense do VAL-003**:
- O finding é **CONFIRMADO como BLOCKER**. A especificação em HTML distribui variáveis CSS que contradizem seu próprio corpo textual e violam a decisão arquitetural ADR-002.

---

# 8. VAL-004 REVALIDATION (INVERSÃO DO SISTEMA DE Z-INDEX)

Avaliamos a escala de empilhamento declarada na Seção 19 da Master Specification contra os requisitos de renderização e as ocorrências reais no código-fonte:

### A Inversão no Documento:
A Seção 19 definiu:
- `z.dropdown: 100`
- `z.sticky: 200`
- `z.header: 300`
- `z.drawer: 400`
- `z.modal: 500`
- `z.popover: 600`

**Cenário de Falha Funcional Reproduzível**:
Quando uma tabela analítica de CRM possui cabeçalho fixo com `sticky` (`z-200`) e a barra de ferramentas logo acima possui menus suspensos de filtro ou seleção (`dropdown`, `z-100`), as opções inferiores do dropdown ao se expandirem para baixo são cortadas e renderizadas por baixo do cabeçalho da tabela.

### Ocorrências Reais de Z-Index no Código (`git grep "z-["`):
1. `src/components/ui/AIContextPopover.tsx:126` `z-[200]`
2. `src/components/ui/BugReportButton.tsx:77` `z-[900]`
3. `src/components/ui/ClickSpark.tsx:28` `z-[9999]`
4. `src/components/ui/CommandPalette.tsx:354` `z-[1000]`
5. `src/components/ui/CopilotTrigger.tsx:28` `z-[900]`
6. `src/components/ui/Toaster.tsx:40` `z-[100]`
7. `src/components/ui/VoiceCommandWidget.tsx:146` `z-[900]`
8. `src/features/chatbook/components/FloatingChatbook.tsx:115` `z-[999]`
9. `src/features/chatbook/components/FloatingChatbook.tsx:124` `z-[1000]`

**Conclusão Forense do VAL-004**:
- O finding é **CONFIRMADO como BLOCKER**. A escala teórica da especificação é disfuncional em interfaces densas de CRM. Além disso, o código real está repleto de valores arbitrários (`900`, `999`, `1000`, `9999`) que precisam ser normalizados por uma escala semântica corrigida.

---

# 9. VAL-005 → VAL-010 REVALIDATION & AUDITORIA DE ERRO DO RELATÓRIO

### VAL-005: Tokens Órfãos na Matriz de Estados
- **Diagnóstico**: A Seção 23 referencia `border.danger`, `border.strong`, `ring.focus`, `ring.danger` e `motion.scale.press`. A tabela da Seção 6.1 omite esses tokens.
- **Status**: **PARTIALLY VERIFIED (HIGH)**. Bloqueia a implementação automatizada no Tailwind v4.

### VAL-006: Draft Auto-Save e Isolamento de Tenancy (LGPD)
- **Diagnóstico**: A Seção 24.1 prescreve salvamento de rascunhos em `sessionStorage`, mas não exige chave composta por `tenantId` e `userId`. Em SaaS multi-tenant, isso gera risco real de vazamento de dados de prospecção entre organizações no mesmo navegador.
- **Status**: **VERIFIED NON-BLOCKING (MEDIUM)**. Requer adição de salvaguarda textual.

### VAL-007: Tags `<li>` Órfãs no HTML
- **Diagnóstico**: Foram localizadas 15 seções no HTML onde tags `<li>` são filhas diretas de `<div>`.
- **Status**: **VERIFIED NON-BLOCKING (MEDIUM)**. Incorreção sintática W3C.

### VAL-008: Incompatibilidade Métrica (Controle 36px vs Line-Height 21px)
- **Diagnóstico**: Fonte Inter 14px com line-height de 1.50 (21px) em container de 36px gera padding vertical de 7.5px. O navegador subpixel-renderiza essa fração, gerando desalinhamento de 0.5px a 1px.
- **Status**: **VERIFIED NON-BLOCKING (MEDIUM)**. Requer ajuste para line-height 20px (`leading-5`) + `py-2` (8px).

### VAL-009: Inexatidão Pontual no Apêndice de Evidências (E6)
- **Diagnóstico**: O item E6 da Seção 39 citou `VoiceCommandWidget.tsx` como portador de `z-[9999]`. A inspeção física comprovou que `VoiceCommandWidget.tsx:146` possui `z-[900]`, enquanto o valor `z-[9999]` está em `ClickSpark.tsx:28`.
- **Status**: **VERIFIED NON-BLOCKING (LOW)**.

### VAL-010: Auditoria do Erro Factual do Validation Report (Badge de Sucesso)
Existe aqui uma falha dupla que este Gate detectou e saneou:
1. **Erro na Master Specification (Seção 5.3)**:
   - Afirma que badge sólida com fundo `#10B981` e texto `#064E3B` atinge ratio de **6.10:1**.
   - **Recálculo Físico**: $L(\#064E3B) = 0.0580$, $L(\#10B981) = 0.3639$. Ratio real: $rac{0.3639 + 0.05}{0.0580 + 0.05} = rac{0.4139}{0.1080} = mathbf{3.83:1}$! **REPROVADO em texto normal WCAG AA (< 4.50:1)**.
2. **Defeito do Próprio Validation Report Anterior**:
   - O Validation Report anterior registrou na Seção 3: *"Padronizar na Seção 5.3 o modelo da Seção 7: fundo sutil emerald.100 com texto emerald.800 (#065F46, contraste 5.82:1 no Light Mode)..."*.
   - E na Tabela 3 alegou que `#065F46` sobre `#10B981` atingia 5.82:1.
   - **Recálculo Físico Rigoroso**:
     - Sobre verde sólido `#10B981`, o texto `#065F46` ($L=0.0867$) produz ratio de apenas:
       $$rac{0.3639 + 0.05}{0.0867 + 0.05} = rac{0.4139}{0.1367} = mathbf{3.03:1} longrightarrow mathbf{REPROVADO 	ext{ (< 4.50:1)}}!$$
     - A razão de **6.78:1** (ou os 5.82:1 aproximados pelo relatório anterior com sRGB truncado) SOMENTE ocorre quando `#065F46` é aplicado sobre o fundo verde claro sutil `#D1FAE5` ($L=0.8758$), e NUNCA sobre o verde médio saturado `#10B981`.
   - **Veredito do Gate sobre o VAL-010**:
     - **CLASSIFICAÇÃO**: **VALIDATION REPORT DEFECT**.
     - A recomendação do relatório anterior para badges sólidas induziria a uma violação de acessibilidade. Para badge com fundo sólido `#10B981`, o único texto de alto contraste aprovado é Deep Navy (`#0B132B`, ratio **7.25:1** - AAA). O par `#065F46` só pode ser utilizado na variante sutil (`#D1FAE5`).

---

# 10. CONTRAST RECALCULATION MATRIX (MATRIZ EXAUSTIVA DE CONTRASTES RECALCULADOS)

Todos os pares cromáticos definidos no sistema foram recalculados via script computacional reproduzível (`scratch/contrast_calculator.js`), com luminâncias relativas em precisão flutuante:

| ID | Par Cromático Auditado | Texto (FG) | Fundo (BG) | $L_1$ (FG) | $L_2$ (BG) | Ratio Calculado | Veredito WCAG 2.1 |
|---|---|---|---|---|---|---|---|
| **C-01** | Primário Repouso (Default) | `#0B132B` | `#FF5841` | 0.0071 | 0.2862 | **5.89:1** | **AA PASS** (Normal e Large) |
| **C-02** | Primário Hover (Master Spec) | `#0B132B` | `#E0442E` | 0.0071 | 0.2018 | **4.41:1** | **FAIL AA** (Apenas Large) |
| **C-03** | Primário Active (Master Spec) | `#0B132B` | `#C0321F` | 0.0071 | 0.1359 | **3.25:1** | **FAIL AA** (Apenas Large) |
| **C-04** | Primário Hover (Fix Candidate) | `#0B132B` | `#E64A32` | 0.0071 | 0.2195 | **4.72:1** | **AA PASS** (Normal e Large) |
| **C-05** | Sunset + Branco (Proibido ADR-002)| `#FFFFFF` | `#FF5841` | 1.0000 | 0.2862 | **3.12:1** | **FAIL AA** (Apenas Large) |
| **C-06** | Sunset Hover + Branco | `#FFFFFF` | `#E0442E` | 1.0000 | 0.2018 | **4.17:1** | **FAIL AA** (Apenas Large) |
| **C-07** | Sunset Active + Branco | `#FFFFFF` | `#C0321F` | 1.0000 | 0.1359 | **5.65:1** | **AA PASS** (Normal e Large) |
| **C-08** | Destrutivo Default (Navy) | `#0B132B` | `#F43F5E` | 0.0071 | 0.2360 | **5.01:1** | **AA PASS** (Normal e Large) |
| **C-09** | Destrutivo Hover (Navy) | `#0B132B` | `#E11D48` | 0.0071 | 0.1735 | **3.91:1** | **FAIL AA** (Apenas Large) |
| **C-10** | Destrutivo Active (Navy) | `#0B132B` | `#BE123C` | 0.0071 | 0.1171 | **2.93:1** | **FAIL GRAVE** (< 3.0:1) |
| **C-11** | Destrutivo Default (Branco) | `#FFFFFF` | `#F43F5E` | 1.0000 | 0.2360 | **3.67:1** | **FAIL AA** (Apenas Large) |
| **C-12** | Destrutivo Hover (Branco) | `#FFFFFF` | `#E11D48` | 1.0000 | 0.1735 | **4.70:1** | **AA PASS** (Normal e Large) |
| **C-13** | Destrutivo Active (Branco) | `#FFFFFF` | `#BE123C` | 1.0000 | 0.1171 | **6.29:1** | **AA PASS** (Normal e Large) |
| **C-14** | Inteligência (IA) Default | `#FFFFFF` | `#C53678` | 1.0000 | 0.1586 | **5.03:1** | **AA PASS** (Normal e Large) |
| **C-15** | Inteligência (IA) Hover | `#FFFFFF` | `#A82662` | 1.0000 | 0.1059 | **6.73:1** | **AA PASS** (Normal e Large) |
| **C-16** | Inteligência (IA) Active | `#FFFFFF` | `#8B1A4F` | 1.0000 | 0.0679 | **8.90:1** | **AAA PASS** (Excepcional) |
| **C-17** | Inteligência c/ Navy (Teste) | `#0B132B` | `#C53678` | 0.0071 | 0.1586 | **3.65:1** | **FAIL AA** (Inviável com Navy)|
| **C-20** | Light Mode Texto Primário | `#0B132B` | `#FFFFFF` | 0.0071 | 1.0000 | **18.38:1**| **AAA PASS** (Perfeito) |
| **C-21** | Light Mode Texto Secundário | `#334155` | `#FFFFFF` | 0.0514 | 1.0000 | **10.35:1**| **AAA PASS** |
| **C-22** | Light Mode Texto Muted | `#64748B` | `#FFFFFF` | 0.1706 | 1.0000 | **4.76:1** | **AA PASS** (Normal) |
| **C-23** | Light Mode Superfície Subtle | `#0B132B` | `#F8FAFC` | 0.0071 | 0.9536 | **17.57:1**| **AAA PASS** |
| **C-24** | Light Mode Superfície Interativa | `#0B132B` | `#F1F5F9` | 0.0071 | 0.9085 | **16.78:1**| **AAA PASS** |
| **C-25** | Dark Mode Texto Primário | `#F8FAFC` | `#0B132B` | 0.9536 | 0.0071 | **17.57:1**| **AAA PASS** |
| **C-26** | Dark Mode Texto Secundário | `#94A3B8` | `#0B132B` | 0.3595 | 0.0071 | **7.17:1** | **AAA PASS** |
| **C-27** | Dark Mode Texto Muted | `#64748B` | `#0B132B` | 0.1706 | 0.0071 | **3.86:1** | **FAIL AA** (Usar `#94A3B8`) |
| **C-28** | Badge Verde Sólido (Spec 5.3) | `#064E3B` | `#10B981` | 0.0580 | 0.3639 | **3.83:1** | **FAIL AA** (Erro na Spec) |
| **C-29** | Badge Verde Sólido (Report Claim)| `#065F46` | `#10B981` | 0.0867 | 0.3639 | **3.03:1** | **FAIL AA** (Defeito no Report)|
| **C-30** | Badge Verde Sólido Corrigido | `#0B132B` | `#10B981` | 0.0071 | 0.3639 | **7.25:1** | **AAA PASS** (Padrão Oficial) |
| **C-31** | Badge Verde Sutil Light | `#065F46` | `#D1FAE5` | 0.0867 | 0.8758 | **6.78:1** | **AA PASS** (Padrão Sutil) |
| **C-32** | Badge Verde Sutil Dark | `#34D399` | `#064E3B` | 0.4962 | 0.0580 | **5.06:1** | **AA PASS** |
| **C-34** | Badge Âmbar / Aviso Sólido | `#0B132B` | `#F59E0B` | 0.0071 | 0.4389 | **8.56:1** | **AAA PASS** |
| **C-35** | Badge Âmbar Sutil Light | `#B45309` | `#FEF3C7` | 0.1591 | 0.8930 | **4.51:1** | **AA PASS** |
| **C-36** | Botão Desabilitado Light | `#94A3B8` | `#E2E8F0` | 0.3595 | 0.8017 | **2.08:1** | **WCAG EXEMPT** (Isento SC 1.4.3) |
| **C-37** | Botão Desabilitado Dark | `#64748B` | `#1E293B` | 0.1706 | 0.0218 | **3.07:1** | **WCAG EXEMPT** (Isento SC 1.4.3) |

---

# 11. TOKEN VALIDATION (ARQUITETURA DE TOKENS DTCG 3-LAYER)

Avaliamos a integridade da arquitetura de 3 camadas da Master Specification:
$$	ext{Primitives} longrightarrow 	ext{Semantics} longrightarrow 	ext{Components}$$

1. **Tokens Órfãos (Consumidos na UI, mas não declarados na Camada Semântica)**:
   - `semantic.color.border.danger` (utilizado em Button Error, Input Error e Checkbox Error).
   - `semantic.color.ring.danger` (utilizado em Input Error).
   - `semantic.color.ring.focus` (utilizado em Input Focus-Visible).
   - `semantic.color.border.strong` (utilizado em Input Hover e Card Hover).
   - `motion.scale.press` e `motion.scale.subtle` (utilizados em Button Active e Checkbox Active).
2. **Tokens Proibidos no `:root`**:
   - `--text-on-brand: #FFFFFF` (linha 41 do HTML). Deve ser banido e substituído pelo token canônico Deep Navy (`#0B132B`).
3. **Avaliação da Camada Primitiva**:
   - Primitivas sRGB mapeadas em Hex, RGB, HSL e OKLCH estão matematicamente consistentes e preparadas para Tailwind v4.

---

# 12. TYPOGRAPHY VALIDATION (SISTEMA TIPOGRÁFICO)

Auditoria no código real (`src/styles/globals.css` e componentes):
- **Famílias Carregadas no CSS**:
  - `Plus Jakarta Sans` (fontes variáveis em `/fonts/`, linhas 14-28).
  - `Sora` (fontes variáveis em `/fonts/`, linhas 52-69).
  - `Inter` (fontes variáveis em `/fonts/`, linhas 76-92).
  - `Bodoni Moda` (linhas 99-115).
  - `IBM Plex Mono` (Google Fonts import na linha 10).
- **Variáveis Ativas no Código Atual**:
  - `--font-brand-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;` (Linha 247).
  - `--font-brand-display: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;` (Linha 248).
- **Diretriz Normativa da Master Specification**:
  - Headings / Display: **Sora** (`--font-display: "Sora"`).
  - Body / UI: **Inter** (`--font-sans: "Inter"`).
  - Dados / Código / Financeiro: **IBM Plex Mono** (`--font-mono: "IBM Plex Mono"`).
  - Extinção formal de `Plus Jakarta Sans`, `Bodoni Moda` e classes arbitrárias de `Cinzel`.
- **Status do Gate**:
  - A decisão arquitetural da Master Spec é impecável e unifica a identidade visual. A divergência reside no fato de que o código real ainda aponta `--font-brand-sans` para `Plus Jakarta Sans`. A transição para Sora + Inter ocorrerá na Wave 1.

---

# 13. SPACING VALIDATION (GRID MATEMÁTICO & SISTEMA DE ESPAÇAMENTOS)

- **Regra Geral**: Macro Grid estrito de **4px** (8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px).
- **Exceções Micro**: 2px (`0.125rem`) e 6px (`0.375rem`) formalmente autorizadas para alinhamento fino de ícones, badges e bordas ópticas.
- **Auditoria de Código**:
  - No código atual, foram localizadas classes com valores fracionados de Tailwind como `py-2.5` (10px), `px-3.5` (14px) e `gap-4.5` (18px).
  - A Master Specification classifica esses valores intermediários como **débito legado a ser unificado** para a escala de 4px na Wave 2. A regra é matematicamente consistente.

---

# 14. Z-INDEX VALIDATION & STACKING CONTEXT BLUEPRINT

Para resolver definitivamente o finding `VAL-004` e eliminar os valores soltos mapeados no código real (`z-[200]`, `z-[900]`, `z-[999]`, `z-[1000]`, `z-[9999]`), o Gate estabelece a seguinte **Escala Canônica Reescalonada**:

| Nível / Camada | Token Semântico | Valor Z-Index | Uso Específico na Aplicação | Resolução de Conflito |
|---|---|---|---|---|
| **00. Base** | `z.base` | `0` | Fundo da página, canvas, estrutura estática | Padrão do documento |
| **01. Card** | `z.card` | `1` | Cards analíticos, painéis e elementos elevados | Cria stacking context local |
| **02. Table Sticky** | `z.sticky` | `10` | Cabeçalhos de tabela (`<th>`) e colunas fixas | **Rebaixado de 200 para 10** |
| **03. Shell Header** | `z.header` | `50` | Topbar do App Shell (`AppTopbar.tsx`) | Sobrepõe tabelas e conteúdo fluido |
| **04. Dropdown** | `z.dropdown` | `100` | Menus select, autocompletes, toolbars | **Sobrepõe o cabeçalho sticky (100 > 10)** |
| **05. Shell Drawer** | `z.drawer` | `400` | Barra lateral móvel e painéis laterais (sheet) | Sobrepõe a navegação e conteúdo |
| **06. Modal Window**| `z.modal` | `500` | Janelas de diálogo e modais de confirmação | Backdrop com blur `z-500` |
| **07. Popover/Select**| `z.popover` | `600` | Dropdowns e selects abertos dentro de modais | **Sobrepõe o modal (600 > 500)** |
| **08. Toast Alerts** | `z.toast` | `700` | Notificações do sistema (`Toaster.tsx`) | Visível sobre modais |
| **09. Floating Tools**| `z.tools` | `800` | `VoiceCommandWidget`, `CopilotTrigger` | **Normaliza os antigos `z-[900]`** |
| **10. Tooltip** | `z.tooltip` | `900` | Dicas flutuantes de acessibilidade | Sobrepõe ferramentas e controles |
| **11. System Overlay**| `z.system` | `1000` | `CommandPalette`, `FloatingChatbook` | **Normaliza `z-[999]`, `1000` e `9999`** |

---

# 15. RESPONSIVE VALIDATION (MATEMÁTICA DE VIEWPORT EM TABLETS)

Auditamos a equação de área útil para a faixa crítica de tablets (768px a 1023px):

$$	ext{Área Útil} = 	ext{Viewport Width} - 	ext{Sidebar Width} - 	ext{Gutters} - 	ext{Paddings}$$

1. **Cenário A: Sidebar Recolhida Canônica (64px) em Viewport de 768px**:
   $$	ext{Área Útil} = 768px - 64px - 32px	ext{ (gutters)} = mathbf{672px}$$
   - *Resultado*: Perfeitamente viável para renderizar 2 colunas de cards de CRM de 320px.
2. **Cenário B: Sidebar Aberta Canônica (260px) em Viewport de 768px**:
   $$	ext{Área Útil} = 768px - 260px - 32px = mathbf{476px}$$
   - *Resultado*: Espaço insuficiente para multi-coluna, forçando a sidebar a recolher automaticamente (Regra R33).
3. **Cenário C: Erro do HTML (Sidebar de 320px) em Viewport de 768px**:
   $$	ext{Área Útil} = 768px - 320px - 32px = mathbf{416px}$$
   - *Resultado*: **QUEBRA CRÍTICA DE LAYOUT**. Destrói o grid de dashboards e achata tabelas analíticas. Confirma a gravidade do finding `VAL-003`.

---

# 16. ACCESSIBILITY VALIDATION (WCAG 2.1 AA)

- **Política de Não-Uso de Texto Branco como Default de Marca (ADR-002)**:
  - **Confirmada e validada**. Sobre Sunset Orange (`#FF5841`), o texto branco atinge apenas **3.12:1**, reprovando em texto normal. O uso de Deep Navy (`#0B132B`, ratio **5.89:1**) é a única estratégia em total conformidade com a WCAG 2.1 AA.
- **Exceções Legítimas para Texto Branco**:
  1. *Botão de Inteligência*: Red-Violet (`#C53678`) com texto branco atinge **5.03:1** (Aprovado AA).
  2. *Dark Mode*: Superfície `#0B132B` com texto `#F8FAFC` atinge **17.57:1** (Aprovado AAA).
  3. *Elementos de Ícone e Logos Vetoriais*: Elementos puramente gráficos ou com espessura > 3px.
  4. *Estado Active de Botões Primários e Destrutivos*: Se o fundo escurecer além de $L=0.15$ (ex: `#C0321F` ou `#BE123C`), o texto DEVE inverter para branco para preservar o contraste ($ge 5.65:1$).
- **Navegação por Teclado e Foco Visível**:
  - Todos os controles interativos devem exibir anel de foco visível duplo (`ring-2 ring-brand ring-offset-2`) com contraste $ge 3.0:1$ contra a superfície adjacente.

---

# 17. RAW VALUE LEAK AUDIT (INVENTÁRIO DE VALORES ARBITRÁRIOS EM CÓDIGO REAL)

Varredura automatizada executada sobre 1.163 arquivos de produção em `src/`:

| Categoria de Valor Solto | Padrão Detectado | Ocorrências Totais | Exemplo no Código Real | Ação na Migração |
|---|---|---|---|---|
| **Cores Arbitrárias** | `bg-[#...]`, `text-[#...]`, `border-[#...]` | **31 ocorrências** | `src/features/chatbook/...` `bg-[#00C2FF]` | Substituir por tokens na Wave 2 |
| **Z-Index Arbitrário** | `z-[...]` | **11 ocorrências** | `ClickSpark.tsx:28` `z-[9999]` | Normalizar para escala da Seção 14 |
| **Texto Branco Cru** | `text-white` | **168 ocorrências** | Múltiplos botões e badges | Auditar individualmente na Wave 3 |
| **Dimensões Arbitrárias** | `w-[...]`, `h-[...]`, `320px` | **6 ocorrências** | `CrmBoard.tsx:800` `320px` | Migrar para tokens de coluna |

---

# 18. STATE MATRIX VALIDATION (MATRIZ DE ESTADOS DOS COMPONENTES CANÔNICOS)

Auditamos a completude de estados para os 12 componentes fundamentais do sistema:

| Componente | Default | Hover | Active | Focus-Visible | Disabled | Error | Loading | Status de Governança |
|---|---|---|---|---|---|---|---|---|
| **Button Primary** | Sim | Calibrado (4.72:1) | Scale(0.98) | Ring Duplo | Opacity 50% | Token Mapeado | Spinner + Trava | **RESOLVIDO VIA BLUEPRINT** |
| **Button Destructive**| Sim | Texto Branco | Texto Branco | Ring Duplo | Opacity 50% | N/A | Spinner + Trava | **RESOLVIDO VIA BLUEPRINT** |
| **Button Intelligence**| Sim | Texto Branco | Texto Branco | Ring Duplo | Opacity 50% | N/A | Spinner + Trava | **APROVADO** |
| **Input / Textarea** | Sim | Border-Strong | N/A | Ring-Focus | Bg-Disabled | Border-Danger | N/A | **REQUER TOKEN VAL-005** |
| **Select / Dropdown** | Sim | Bg-Interactive | N/A | Ring-Focus | Bg-Disabled | Border-Danger | Skeleton | **REQUER TOKEN VAL-005** |
| **Checkbox / Radio** | Sim | Border-Strong | Scale(0.95) | Ring-Focus | Opacity 50% | Border-Danger | N/A | **REQUER TOKEN VAL-005** |
| **Switch** | Sim | Opacity 90% | Scale(0.98) | Ring-Focus | Opacity 50% | N/A | N/A | **APROVADO** |
| **Card** | Sim | Border-Strong | Scale(0.995)| Ring sutil | N/A | Border-Danger | Skeleton Card | **APROVADO** |
| **Table** | Sim | Row-Hover | N/A | Row-Focus | N/A | Empty/Error | Skeleton Rows | **APROVADO (Z-Sticky 10)** |
| **Badge** | Sim | N/A | N/A | N/A | N/A | Red Badge | N/A | **CORRIGIDO NO VAL-010** |
| **Modal / Dialog** | Sim | N/A | N/A | Trap Focus | N/A | N/A | N/A | **APROVADO (Z-Modal 500)** |
| **Tooltip** | Sim | N/A | N/A | N/A | N/A | N/A | N/A | **APROVADO (Z-Tooltip 900)** |

---

# 19. MASTER SPEC CONTRADICTIONS (MAPA DE CONTRADIÇÕES INTERNAS NA SPEC)

1. **Sidebar.tsx vs AppSidebar.tsx**: A Seção 30 e o CR-02 ordenam a destruição de `Sidebar.tsx`, que é o único componente real montado em `MainLayout.tsx`.
2. **Largura da Sidebar**: Seção 11.2 prescreve `260px`, enquanto a linha 44 do cabeçalho HTML declara `--sidebar-width: 320px;`.
3. **Altura da Topbar**: Seção 11.2 prescreve `56px`, enquanto a linha 45 do HTML declara `--topbar-height: 64px;`.
4. **Largura do Container**: Seção 20.1 prescreve `1440px`, enquanto a linha 262 do HTML prescreve `max-width: 1400px;`.
5. **Token de Texto de Marca**: O ADR-002 e a Seção 5 prescrevem Deep Navy (`#0B132B`), enquanto a linha 41 do HTML injeta `--text-on-brand: #FFFFFF;`.
6. **Hierarquia Z-Index**: Seção 19 coloca `z.dropdown: 100` abaixo de `z.sticky: 200`.
7. **Badge de Sucesso**: Seção 5.3 afirma que `#064E3B` sobre `#10B981` tem ratio de 6.10:1 (real é 3.83:1), colidindo com a receita sutil da Seção 7.

---

# 20. VALIDATION REPORT ERRORS (AUDITORIA E FALSIFICAÇÕES NO RELATÓRIO ANTERIOR)

Este Gate identificou e registrou formalmente 4 falhas no relatório de validação anterior:
1. **Defeito Matemático no Finding VAL-010**: O validador anterior afirmou que `#065F46` sobre o verde sólido `#10B981` atingia 5.82:1. O recálculo físico comprovou que esse par atinge apenas **3.03:1**, o que REPROVA em acessibilidade. A recomendação do validador estava incorreta para fundos sólidos.
2. **Imprecisão Decimal no Finding VAL-002**: O validador anterior registrou ratio de aproximadamente 4.76:1 para `#E64A32` sobre `#0B132B`. O valor computacional exato é **4.72:1** (delta de -0.04). Embora aprove na WCAG AA, o número exigia exatidão.
3. **Nomenclatura do Repositório**: O relatório citou `CENTRAL-DE-INTELIGENCIA-COMECIAL-ATLASGR` como repositório, em vez de `Birthub-360`, embora os caminhos e arquivos inspecionados pertencessem de fato à base local.
4. **Veredito Prematuro de "PASS WITH CONDITIONS"**: O validador anterior emitiu status condicional quando existiam 4 falhas bloqueantes que quebram compilação e violam normas internacionais de acessibilidade. Pelas regras de governança estrita do projeto, o único status cabível era `BLOCKED`.

---

# 21. CORRECTED RECOMMENDATIONS (BLUEPRINT TÉCNICO DE SANEAMENTO)

Antes de iniciar qualquer linha de código em `src/`, os documentos de especificação (`BIRTH-HUB-360-DESIGN-SYSTEM-MASTER-SPECIFICATION.md` e o arquivo HTML correspondente) DEVEM ser retificados com o seguinte blueprint:

### Correção 1: Preservação e Refatoração de `Sidebar.tsx` (VAL-001)
- No CR-02, Seção 30 e Seção 39: Excluir a menção a `AppSidebar.tsx`.
- Redigir: *"Sidebar.tsx é o componente canônico oficial da barra lateral. Na Wave 1, será refatorado in-place pelo Agente 02 para substituir gradientes legados e elementos visuais brutos pelos tokens do Design System, mantendo a integridade de montagem com MainLayout.tsx."*

### Correção 2: Calibração Cromática de Estados de Botão (VAL-002)
- Na Seção 6.2:
  - `action.primary.hover`: Atualizar para `#E64A32` (Ratio 4.72:1 com Deep Navy `#0B132B`, Aprovado AA).
  - `action.primary.active`: Definir microinteração mecânica com `motion.scale.press` (`scale(0.98)`) sem escurecimento destrutivo de fundo, OU autorizar inversão para texto branco `#FFFFFF` (Ratio 5.65:1, Aprovado AA).
  - `action.destructive.hover` e `active`: Autorizar formalmente a inversão para texto branco `#FFFFFF` sobre `#E11D48` (4.70:1) e `#BE123C` (6.29:1).

### Correção 3: Sincronização Dimensional no HTML (VAL-003)
- No bloco `<style>` do arquivo `BIRTH_HUB_360_DESIGN_SYSTEM_MASTER_SPECIFICATION.html`:
  - Linha 41: Remover `--text-on-brand: #FFFFFF;` e inserir `--text-on-brand: #0B132B;`.
  - Linha 44: Alterar de `--sidebar-width: 320px;` para `--sidebar-width: 260px;`.
  - Linha 45: Alterar de `--topbar-height: 64px;` para `--topbar-height: 56px;`.
  - Linha 262: Alterar `max-width: 1400px;` para `max-width: 1440px;`.

### Correção 4: Reescalonamento da Escala de Z-Index (VAL-004)
- Na Seção 19 e Regra R18:
  - Adotar a Escala Canônica de 11 Camadas da Seção 14 deste relatório (`z.sticky: 10`, `z.header: 50`, `z.dropdown: 100`, `z.modal: 500`, `z.popover: 600`, etc.).

### Correção 5: Retificação da Badge de Sucesso (VAL-010)
- Na Seção 5.3:
  - Declarar que sobre fundo verde sólido `#10B981`, o texto deve ser Deep Navy `#0B132B` (7.25:1, AAA).
  - Declarar que a variante suave utiliza fundo `#D1FAE5` com texto `#065F46` (6.78:1, AA).

### Correção 6: Integração dos Tokens Semânticos Faltantes (VAL-005)
- Inserir na tabela da Seção 6.1:
  - `semantic.color.border.danger`: Light `#F43F5E`, Dark `#F43F5E`
  - `semantic.color.border.strong`: Light `#94A3B8`, Dark `#334155`
  - `semantic.color.ring.focus`: `rgba(255, 88, 65, 0.35)`
  - `semantic.color.ring.danger`: `rgba(244, 63, 94, 0.35)`
  - `motion.scale.press`: `scale(0.98)`

---

# 22. REMAINING BLOCKERS (REGISTRO DE BLOQUEADORES REMANESCENTES)

Enquanto as ações de saneamento documental não forem concluídas, permanecem abertos os seguintes bloqueadores:

| Blocker ID | Descrição do Bloqueador | Impacto no Produto | Dependência | Status |
|---|---|---|---|---|
| **BLK-01** | Ordem de deleção de `Sidebar.tsx` na Spec (VAL-001) | Quebra de compilação e tela branca no CRM | Retificação do CR-02 e Seção 30 | **ABERTO** |
| **BLK-02** | Contraste de hover e active de botões reprovado (VAL-002) | Reprovação no gate de acessibilidade WCAG AA | Retificação da Seção 6.2 | **ABERTO** |
| **BLK-03** | Divergência de 60px na sidebar entre HTML e tokens (VAL-003) | Quebra do grid responsivo de páginas | Retificação do CSS no HTML | **ABERTO** |
| **BLK-04** | Inversão hierárquica z-index dropdown < sticky (VAL-004) | Menus cortados por cabeçalhos de tabela | Retificação da Seção 19 | **ABERTO** |
| **BLK-05** | Defeito no cálculo de badge de sucesso (VAL-010) | Contraste insuficiente em badges operacionais | Retificação da Seção 5.3 | **ABERTO** |

---

# 23. REQUIRED ACTIONS (LISTA DE AÇÕES PRÉ-IMPLEMENTAÇÃO)

Sequência mandatória a ser executada antes de qualquer autorização de código:

```text
[ ] 1. Atualizar o arquivo BIRTH-HUB-360-DESIGN-SYSTEM-MASTER-SPECIFICATION.md:
       - Retificar CR-02 e Seção 30 (preservar Sidebar.tsx).
       - Atualizar tokens de hover/active na Seção 6.2.
       - Reescalonar a tabela de Z-Index na Seção 19.
       - Corrigir a razão de contraste da badge na Seção 5.3.
       - Adicionar tokens semânticos na Seção 6.1.
       - Inserir salvaguarda de isolamento de tenant na Seção 24.1.

[ ] 2. Atualizar o arquivo BIRTH_HUB_360_DESIGN_SYSTEM_MASTER_SPECIFICATION.html:
       - Alterar --sidebar-width para 260px (linha 44).
       - Alterar --topbar-height para 56px (linha 45).
       - Alterar max-width do main-content para 1440px (linha 262).
       - Remover --text-on-brand: #FFFFFF (linha 41).
       - Envolver tags <li> órfãs em <ul> semânticas.

[ ] 3. Atualizar o relatório BIRTH-HUB-360-DESIGN-SYSTEM-VALIDATION-REPORT.md:
       - Retificar a recomendação do VAL-010 para distinguir fundo verde sólido de fundo suave.
       - Atualizar o ratio de #E64A32 para 4.72:1.

[ ] 4. Submeter a base documental retificada ao FINAL VALIDATION GATE 3:
       - Obtenção do status 🟢 CANONICAL DESIGN SYSTEM.

[ ] 5. Liberação oficial do Plano de Implementação (Wave 0 / Wave 1).
```

---

# 24. FINAL GO/NO-GO VERDICT (DECISÃO FINAL)

```text
========================================================================================
                               FINAL GATE DECISION: NO-GO
========================================================================================

  VEREDITO:              🔴 BLOCKED
  MOTIVO:                NÃO CONFORMIDADE ARQUITETURAL E ESPECIFICAÇÃO DIVERGENTE
  AUTORIZAÇÃO DE CÓDIGO: NEGADA (NENHUM ARQUIVO DA APLICAÇÃO DEVE SER MODIFICADO)
  PRÓXIMA ETAPA:         RETIFICAÇÃO CIRÚRGICA DOS DOCUMENTOS DE ESPECIFICAÇÃO

========================================================================================
```

---

# 25. CANONICAL EVIDENCE INDEX (ÍNDICE DE EVIDÊNCIAS FORENSES)

1. **Repositório**: `C:\GitHub\Birthub-360`
2. **Commit HEAD**: `8ebd31f1e04c70339e4e7e42326f339a3fb996c3`
3. **Branch**: `main`
4. **Script de Contraste Reproduzível**: `scratch/contrast_calculator.js` (Executado via Node.js v24.19.0, gerando 37 pares em `scratch/contrast_results.json`).
5. **Varredura de Código Completa**: `scratch/codebase_auditor.js` (1.163 arquivos de produção analisados em `src/`).
6. **Matriz em CSV**: Gerada em `BIRTH-HUB-360-FINAL-VALIDATION-MATRIX.csv` com 56 registros completos.
7. **Componente de Navegação**: Inspecionado em `src/components/layout/Sidebar.tsx` e `src/components/layout/MainLayout.tsx:14, 59`.
8. **Tokens CSS Globais**: Inspecionados em `src/styles/globals.css` (linhas 10-115, 247-248, 355-357).

---

# 26. RESPOSTAS OBJETIVAS DA CONCLUSÃO EXECUTIVA (SEÇÃO 36 DO PROTOCOLO)

1. **O Validation Report anterior estava correto?**
   *Parcialmente*. Acertou com precisão cirúrgica os blockers VAL-001 a VAL-004 e os débitos secundários VAL-005 a VAL-009, mas cometeu erro factual no recálculo do VAL-010 e foi prematuro ao emitir parecer condicional.
2. **Quais findings foram confirmados?**
   *VAL-001, VAL-002, VAL-003, VAL-004, VAL-006, VAL-007, VAL-008 e VAL-009*.
3. **Quais findings foram falsificados?**
   *Nenhum finding foi integralmente falsificado*. Contudo, o cálculo do VAL-010 no Validation Report anterior foi falsificado matematicamente.
4. **Quais recomendações estavam erradas?**
   *A recomendação do relatório anterior para o VAL-010*, que sugeria aplicar `#065F46` sobre verde sólido `#10B981` alegando ratio de 5.82:1 (o valor real é 3.03:1, que reprova).
5. **Quais cálculos estavam errados?**
   - O cálculo do relatório para `#065F46` sobre `#10B981` (alegou 5.82:1; real é 3.03:1).
   - O cálculo da Master Spec Seção 5.3 para `#064E3B` sobre `#10B981` (alegou 6.10:1; real é 3.83:1).
   - O valor decimal atribuído a `#E64A32` sobre `#0B132B` (alegou 4.76:1; real exato é 4.72:1).
6. **O relatório anterior utilizou o repositório canônico correto?**
   *Sim*, analisou os arquivos da base física real (`C:\GitHub\Birthub-360`), embora tenha referenciado o nome de projeto legado `CENTRAL-DE-INTELIGENCIA-COMECIAL-ATLASGR` presente no cabeçalho do `/AGENTS.md`.
7. **O Master Specification está internamente consistente?**
   *Não*. Apresenta 7 contradições internas graves entre suas tabelas, anexo forense e artefato HTML.
8. **O Birth Hub 360° pode considerar este Design System canônico?**
   *NÃO neste momento*. Somente após o saneamento documental dos 5 itens bloqueantes.
9. **Quais mudanças ainda precisam acontecer antes da implementação?**
   *As 6 retificações documentais listadas na Seção 21*. Nenhuma mudança de código deve ocorrer agora.
10. **Qual é o único status final?**
    $$mathbf{Large 🔴 BLOCKED}$$

---
*Fim do Documento Oficial de Arbitragem — Final Validation Gate 2*
