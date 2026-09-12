- De: Agente 09 (Mobile — Capacitor/Android/iOS)
- Para: Agente 02 (Produto e UX)
- Onda: 8
- Status: resolvido
- Prioridade: alto

## Problema

Vários componentes exportam arquivo gerado no cliente (CSV/XLSX/texto) via `URL.createObjectURL`
de um `Blob` + um `<a download>` sintético (padrão comum de "exportar" no navegador):
`src/components/CrmBoard.tsx`, `src/features/intelligence/components/AutomationGuide.tsx`,
`src/features/intelligence/components/RobustScriptGenerator.tsx`,
`src/features/intelligence/components/SuperagentCreator.tsx`,
`src/features/prospecting/components/ProspectingHub.tsx`.

Verifiquei o código-fonte do `BridgeWebViewClient`/`Bridge` do Capacitor Android
(`node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/`) — nenhum
`WebView.setDownloadListener(...)` é configurado por padrão. Isso tem duas consequências:

1. Para downloads via URL http(s) normal, o WebView chamaria `DownloadListener.onDownloadStart`,
   mas sem um listener registrado, **o clique simplesmente não faz nada visível** (nem erro, nem
   download).
2. Para o padrão usado neste projeto (`blob:` URL gerada inteiramente no JS, sem round-trip de
   rede), a situação é pior: um `DownloadListener` nativo nem teria acesso ao conteúdo do blob —
   ele vive só na realm JS do WebView. Não existe caminho nativo simples de interceptar isso sem
   uma ponte JS↔nativo explícita.

Ou seja: hoje, tocar em "Exportar CSV"/"Exportar" nessas telas dentro do app Android/iOS
empacotado muito provavelmente não produz nenhum arquivo e não mostra nenhum erro ao usuário — o
botão parece funcionar (não trava, não quebra a tela) mas silenciosamente não entrega o arquivo.
Não confirmei isso num dispositivo real (ambiente sem SDK Android/Xcode disponível nesta sessão —
ver relatório da onda), mas o comportamento é bem documentado para Capacitor/WebView em geral e a
ausência de `DownloadListener` no bridge confirma a lacuna estruturalmente.

## Arquivo(s) envolvido(s)

- `src/components/CrmBoard.tsx`
- `src/features/intelligence/components/AutomationGuide.tsx`
- `src/features/intelligence/components/RobustScriptGenerator.tsx`
- `src/features/intelligence/components/SuperagentCreator.tsx`
- `src/features/prospecting/components/ProspectingHub.tsx`
- `package.json` (plugins novos precisariam de aprovação do Coordenador)

## Alteração necessária

Não implementável dentro do escopo do Agente 09 sozinho — a geração do Blob e o gatilho de download
moram em `src/**`. Caminho recomendado (padrão oficial Capacitor para esse cenário):

1. Instalar `@capacitor/filesystem` (grava o conteúdo do Blob, convertido para base64, num
   diretório acessível do app) + `@capacitor/share` (abre a folha de compartilhamento nativa, que
   no Android/iOS inclui "salvar em Arquivos"/"salvar no Drive"/etc.) — ambos exigem aprovação do
   Coordenador para `package.json`.
2. Nos componentes listados acima, detectar `Capacitor.isNativePlatform()` e, nesse caso, usar
   `Filesystem.writeFile` + `Share.share` em vez do padrão `URL.createObjectURL` + `<a download>`
   — sem duplicar a lógica de geração do CSV/XLSX em si (a função que monta o conteúdo continua
   igual), só o mecanismo de entrega ao usuário.
3. Dentro do escopo do Agente 09: uma vez que esse plugin for aprovado e o código em `src/**`
   existir, adiciono a configuração nativa necessária (permissões de storage se aplicável — no
   Android moderno, `@capacitor/filesystem` usando o diretório do próprio app normalmente não
   precisa de `WRITE_EXTERNAL_STORAGE`, mas isso deve ser confirmado na implementação real).

## Teste esperado

Dentro do app Android/iOS empacotado, tocar em "Exportar" nessas telas deve produzir um arquivo
real acessível pelo usuário (via folha de compartilhamento nativa ou app de arquivos) — hoje, o
clique não produz nada visível.

## Contexto adicional

Achado durante o inventário de paridade web × mobile da Onda 8, ao ler o código-fonte do bridge
Android do Capacitor (`@capacitor/android@8.5.0`, instalado via `npm ci` nesta sessão) em busca de
tratamento de download. Documentado aqui em vez de implementado às pressas com uma ponte
JS↔nativo improvisada, que eu não teria como validar num dispositivo real nesta sessão (sem SDK
Android/Xcode disponíveis) — risco de "parecer que funciona" sem funcionar de fato, o que o prompt
do Agente 09 proíbe explicitamente.

## Resolução

(Coordenador): O comportamento está documentado e avaliado. Devido à regra de 'Freeze de escopo' em vigor na Sprint 00, a inclusão de três plugins novos no app (Filesystem e Share) se enquadra como Feature Nova/Paridade e não será feita no release RC1. Fica marcado como resolvido (postponed para Sprint pós-13).

## Atualização — auditoria ACH-09-04 (2026-09-11)

Ainda em freeze de escopo, não corrigido agora. Nota apenas para que a estimativa de esforço
pós-Sprint 13 (`@capacitor/filesystem` + `@capacitor/share`) considere o escopo real hoje, não o
de 5 ondas atrás.

Levantamento de todo uso de `URL.createObjectURL`/`window.URL.createObjectURL` em `src/**` nesta
data mostra que o padrão `Blob` + `<a download>` (o mecanismo que não funciona dentro do WebView
do app empacotado, conforme diagnóstico original acima) se espalhou para além dos 5 arquivos
originais da Onda 8. Arquivos que passaram a acionar esse mesmo padrão desde então:

- `src/lib/api.ts` — novo helper compartilhado `downloadFile()` (fetch bruto + Blob +
  `<a download>` temporário), consumido por:
  - `src/features/activities/components/ActivityList.tsx` (exportar agenda `.ics`)
  - `src/features/calendar/components/Calendar.tsx` (exportar agenda `.ics`)
- `src/features/commercial-intelligence/commercialIntelligence.api.ts` —
  `downloadExecutiveExport()`, mesmo padrão fetch bruto + Blob + `<a download>`.
- `src/features/analytics/components/CohortAnalysis.tsx` — exportação de relatório de cohort em
  CSV, mesmo padrão.

`src/features/commercial-intelligence/presentation/CommercialIntelligenceController.ts` é o
endpoint Express correspondente ao export acima (`getExport`) — não é, ele mesmo, um gatilho de
download no cliente, mas é o par server-side do novo fluxo e por isso relevante para dimensionar o
trabalho de migração (o endpoint em si não muda; só o mecanismo de entrega no cliente).

`src/features/roleplay/components/RoleplayHub.tsx` e
`src/features/prospecting/components/prospecting-hub/OcrCapturePanel.tsx` também usam
`createObjectURL`, mas não para download: são preview de áudio gravado (`<audio src={...}>`) e
preview de imagem capturada, respectivamente — nenhum dos dois tem `<a download>`. Não estão no
escopo deste problema (não sofrem do mesmo bug, já que não tentam entregar um arquivo ao usuário).

Escopo real atualizado para a estimativa pós-Sprint 13: **8 arquivos** usam o padrão
Blob + `<a download>` que não funciona no WebView do app empacotado — os 5 originais da Onda 8
(`src/components/CrmBoard.tsx`,
`src/features/intelligence/components/AutomationGuide.tsx`,
`src/features/intelligence/components/RobustScriptGenerator.tsx`,
`src/features/intelligence/components/SuperagentCreator.tsx`,
`src/features/prospecting/components/ProspectingHub.tsx`) mais os 3 novos listados acima
(`src/lib/api.ts`, `commercialIntelligence.api.ts`, `CohortAnalysis.tsx`) — mais os 2 consumidores
do helper novo (`ActivityList.tsx`, `Calendar.tsx`), que herdam o problema automaticamente ao
chamar `downloadFile()` e por isso não precisam de correção separada própria, só a migração do
helper compartilhado em `src/lib/api.ts`.
