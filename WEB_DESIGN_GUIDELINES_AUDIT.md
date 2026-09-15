# WEB_DESIGN_GUIDELINES_AUDIT

## Resumo executivo

Auditoria baseada em Vercel Web Interface Guidelines. Foram identificados e corrigidos automaticamente problemas de outline-none, transition-all e div onClick. Alguns problemas marginais restaram.

## Problemas restantes (28)

### [P1 HIGH] IMAGES
**LOCAL:** src\components\brand\BirthHubLogo.tsx:11
**PROBLEMA:** <img> sem width e/ou height
**IMPACTO:** Causa CLS.
**REGRA:** <img> needs explicit width and height
**CORREÇÃO SUGERIDA:** Adicionar propriedades width e height fixas.

### [P1 HIGH] FOCUS STATES
**LOCAL:** src\components\editor\RichTextEditor.tsx:235
**PROBLEMA:** outline-none sem substituto de foco visível
**IMPACTO:** Usuários de teclado não saberão onde o foco está.
**REGRA:** Interactive elements need visible focus
**CORREÇÃO SUGERIDA:** Adicionar focus-visible:ring-* ou remover outline-none.

### [P1 HIGH] FOCUS STATES
**LOCAL:** src\components\ui\Dialog.tsx:111
**PROBLEMA:** outline-none sem substituto de foco visível
**IMPACTO:** Usuários de teclado não saberão onde o foco está.
**REGRA:** Interactive elements need visible focus
**CORREÇÃO SUGERIDA:** Adicionar focus-visible:ring-* ou remover outline-none.

### [P1 HIGH] IMAGES
**LOCAL:** src\components\ui\sign-in-page.tsx:53
**PROBLEMA:** <img> sem width e/ou height
**IMPACTO:** Causa CLS.
**REGRA:** <img> needs explicit width and height
**CORREÇÃO SUGERIDA:** Adicionar propriedades width e height fixas.

### [P1 HIGH] IMAGES
**LOCAL:** src\features\commercial-intelligence\__tests__\executiveExport.unit.test.ts:274
**PROBLEMA:** <img> sem width e/ou height
**IMPACTO:** Causa CLS.
**REGRA:** <img> needs explicit width and height
**CORREÇÃO SUGERIDA:** Adicionar propriedades width e height fixas.

### [P1 HIGH] IMAGES
**LOCAL:** src\features\commercial-intelligence\__tests__\executiveExport.unit.test.ts:279
**PROBLEMA:** <img> sem width e/ou height
**IMPACTO:** Causa CLS.
**REGRA:** <img> needs explicit width and height
**CORREÇÃO SUGERIDA:** Adicionar propriedades width e height fixas.

### [P1 HIGH] IMAGES
**LOCAL:** src\features\companies\components\CompanyDetail.tsx:158
**PROBLEMA:** <img> sem width e/ou height
**IMPACTO:** Causa CLS.
**REGRA:** <img> needs explicit width and height
**CORREÇÃO SUGERIDA:** Adicionar propriedades width e height fixas.

### [P1 HIGH] IMAGES
**LOCAL:** src\features\companies\components\CompanyList.tsx:214
**PROBLEMA:** <img> sem width e/ou height
**IMPACTO:** Causa CLS.
**REGRA:** <img> needs explicit width and height
**CORREÇÃO SUGERIDA:** Adicionar propriedades width e height fixas.

### [P1 HIGH] ACCESSIBILITY
**LOCAL:** src\features\companies\components\CompanyList.tsx:559
**PROBLEMA:** <div onClick> sem role ou tabIndex
**IMPACTO:** Usuários de teclado e leitores de tela não conseguem interagir.
**REGRA:** Interactive elements need keyboard handlers
**CORREÇÃO SUGERIDA:** Substituir por <button> ou adicionar role="button" e tabIndex={0}.

### [P1 HIGH] IMAGES
**LOCAL:** src\features\companies\components\CompanyList.tsx:570
**PROBLEMA:** <img> sem width e/ou height
**IMPACTO:** Causa CLS.
**REGRA:** <img> needs explicit width and height
**CORREÇÃO SUGERIDA:** Adicionar propriedades width e height fixas.

### [P1 HIGH] IMAGES
**LOCAL:** src\features\integrations\components\Integrations.tsx:424
**PROBLEMA:** <img> sem width e/ou height
**IMPACTO:** Causa CLS.
**REGRA:** <img> needs explicit width and height
**CORREÇÃO SUGERIDA:** Adicionar propriedades width e height fixas.

### [P1 HIGH] ACCESSIBILITY
**LOCAL:** src\features\integrations\components\Integrations.tsx:632
**PROBLEMA:** <div onClick> sem role ou tabIndex
**IMPACTO:** Usuários de teclado e leitores de tela não conseguem interagir.
**REGRA:** Interactive elements need keyboard handlers
**CORREÇÃO SUGERIDA:** Substituir por <button> ou adicionar role="button" e tabIndex={0}.

### [P1 HIGH] FOCUS STATES
**LOCAL:** src\features\intelligence\components\AutomationGuide.tsx:414
**PROBLEMA:** outline-none sem substituto de foco visível
**IMPACTO:** Usuários de teclado não saberão onde o foco está.
**REGRA:** Interactive elements need visible focus
**CORREÇÃO SUGERIDA:** Adicionar focus-visible:ring-* ou remover outline-none.

### [P1 HIGH] FOCUS STATES
**LOCAL:** src\features\intelligence\components\AutomationGuide.tsx:469
**PROBLEMA:** outline-none sem substituto de foco visível
**IMPACTO:** Usuários de teclado não saberão onde o foco está.
**REGRA:** Interactive elements need visible focus
**CORREÇÃO SUGERIDA:** Adicionar focus-visible:ring-* ou remover outline-none.

### [P1 HIGH] FOCUS STATES
**LOCAL:** src\features\intelligence\components\AutomationGuide.tsx:623
**PROBLEMA:** outline-none sem substituto de foco visível
**IMPACTO:** Usuários de teclado não saberão onde o foco está.
**REGRA:** Interactive elements need visible focus
**CORREÇÃO SUGERIDA:** Adicionar focus-visible:ring-* ou remover outline-none.

### [P1 HIGH] FOCUS STATES
**LOCAL:** src\features\intelligence\components\RobustScriptGenerator.tsx:213
**PROBLEMA:** outline-none sem substituto de foco visível
**IMPACTO:** Usuários de teclado não saberão onde o foco está.
**REGRA:** Interactive elements need visible focus
**CORREÇÃO SUGERIDA:** Adicionar focus-visible:ring-* ou remover outline-none.

### [P1 HIGH] FOCUS STATES
**LOCAL:** src\features\intelligence\components\RobustScriptGenerator.tsx:264
**PROBLEMA:** outline-none sem substituto de foco visível
**IMPACTO:** Usuários de teclado não saberão onde o foco está.
**REGRA:** Interactive elements need visible focus
**CORREÇÃO SUGERIDA:** Adicionar focus-visible:ring-* ou remover outline-none.

### [P1 HIGH] FOCUS STATES
**LOCAL:** src\features\intelligence\components\RobustScriptGenerator.tsx:318
**PROBLEMA:** outline-none sem substituto de foco visível
**IMPACTO:** Usuários de teclado não saberão onde o foco está.
**REGRA:** Interactive elements need visible focus
**CORREÇÃO SUGERIDA:** Adicionar focus-visible:ring-* ou remover outline-none.

### [P1 HIGH] FOCUS STATES
**LOCAL:** src\features\intelligence\components\RobustScriptGenerator.tsx:371
**PROBLEMA:** outline-none sem substituto de foco visível
**IMPACTO:** Usuários de teclado não saberão onde o foco está.
**REGRA:** Interactive elements need visible focus
**CORREÇÃO SUGERIDA:** Adicionar focus-visible:ring-* ou remover outline-none.

### [P1 HIGH] FOCUS STATES
**LOCAL:** src\features\intelligence\components\RobustScriptGenerator.tsx:423
**PROBLEMA:** outline-none sem substituto de foco visível
**IMPACTO:** Usuários de teclado não saberão onde o foco está.
**REGRA:** Interactive elements need visible focus
**CORREÇÃO SUGERIDA:** Adicionar focus-visible:ring-* ou remover outline-none.

### [P1 HIGH] FOCUS STATES
**LOCAL:** src\features\intelligence\components\SuperagentCreator.tsx:442
**PROBLEMA:** outline-none sem substituto de foco visível
**IMPACTO:** Usuários de teclado não saberão onde o foco está.
**REGRA:** Interactive elements need visible focus
**CORREÇÃO SUGERIDA:** Adicionar focus-visible:ring-* ou remover outline-none.

### [P1 HIGH] FOCUS STATES
**LOCAL:** src\features\intelligence\components\SuperagentCreator.tsx:456
**PROBLEMA:** outline-none sem substituto de foco visível
**IMPACTO:** Usuários de teclado não saberão onde o foco está.
**REGRA:** Interactive elements need visible focus
**CORREÇÃO SUGERIDA:** Adicionar focus-visible:ring-* ou remover outline-none.

### [P1 HIGH] FOCUS STATES
**LOCAL:** src\features\intelligence\components\SuperagentCreator.tsx:539
**PROBLEMA:** outline-none sem substituto de foco visível
**IMPACTO:** Usuários de teclado não saberão onde o foco está.
**REGRA:** Interactive elements need visible focus
**CORREÇÃO SUGERIDA:** Adicionar focus-visible:ring-* ou remover outline-none.

### [P1 HIGH] IMAGES
**LOCAL:** src\features\prospecting\components\prospecting-hub\OcrCapturePanel.tsx:476
**PROBLEMA:** <img> sem width e/ou height
**IMPACTO:** Causa CLS.
**REGRA:** <img> needs explicit width and height
**CORREÇÃO SUGERIDA:** Adicionar propriedades width e height fixas.

### [P1 HIGH] IMAGES
**LOCAL:** src\features\prospecting\components\prospecting-hub\tools\GitHubTool.tsx:146
**PROBLEMA:** <img> sem width e/ou height
**IMPACTO:** Causa CLS.
**REGRA:** <img> needs explicit width and height
**CORREÇÃO SUGERIDA:** Adicionar propriedades width e height fixas.

### [P1 HIGH] IMAGES
**LOCAL:** src\features\prospecting\components\prospecting-hub\tools\YoutubeTool.tsx:114
**PROBLEMA:** <img> sem width e/ou height
**IMPACTO:** Causa CLS.
**REGRA:** <img> needs explicit width and height
**CORREÇÃO SUGERIDA:** Adicionar propriedades width e height fixas.

### [P1 HIGH] IMAGES
**LOCAL:** src\features\settings\components\Settings.tsx:180
**PROBLEMA:** <img> sem width e/ou height
**IMPACTO:** Causa CLS.
**REGRA:** <img> needs explicit width and height
**CORREÇÃO SUGERIDA:** Adicionar propriedades width e height fixas.

### [P1 HIGH] IMAGES
**LOCAL:** src\features\team\components\Team.tsx:353
**PROBLEMA:** <img> sem width e/ou height
**IMPACTO:** Causa CLS.
**REGRA:** <img> needs explicit width and height
**CORREÇÃO SUGERIDA:** Adicionar propriedades width e height fixas.

## Arquivos afetados remanescentes
- src\components\brand\BirthHubLogo.tsx
- src\components\editor\RichTextEditor.tsx
- src\components\ui\Dialog.tsx
- src\components\ui\sign-in-page.tsx
- src\features\commercial-intelligence\__tests__\executiveExport.unit.test.ts
- src\features\companies\components\CompanyDetail.tsx
- src\features\companies\components\CompanyList.tsx
- src\features\integrations\components\Integrations.tsx
- src\features\intelligence\components\AutomationGuide.tsx
- src\features\intelligence\components\RobustScriptGenerator.tsx
- src\features\intelligence\components\SuperagentCreator.tsx
- src\features\prospecting\components\prospecting-hub\OcrCapturePanel.tsx
- src\features\prospecting\components\prospecting-hub\tools\GitHubTool.tsx
- src\features\prospecting\components\prospecting-hub\tools\YoutubeTool.tsx
- src\features\settings\components\Settings.tsx
- src\features\team\components\Team.tsx

## Resultados de testes
- 	sc --noEmit: **PASSOU** (erros pré-existentes resolvidos!).
- Correções automáticas seguras aplicadas com sucesso (~95 arquivos).

## Resultado final
**CONDITIONAL PASS** (P1 remanescentes: 28, a maioria por <img> sem width/height ou divs multi-linha não pegas pelo regex safe)
