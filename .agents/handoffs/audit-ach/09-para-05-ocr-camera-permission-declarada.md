- De: 09 (auditoria ACH-09-03)
- Para: 05
- Onda: audit-ach
- Status: aberto
- Prioridade: normal

## Problema

`OcrCapturePanel.tsx` chama `navigator.mediaDevices.getUserMedia({ video: { facingMode:
'environment' }, audio: false })` (linhas 105-108) para mostrar pré-visualização de câmera ao
vivo no OCR de prospecção. Dentro do app Android empacotado (Capacitor), `getUserMedia` sempre
caía no `catch` (linha 114) porque `android.permission.CAMERA` nunca foi declarada em
`AndroidManifest.xml` — sem essa permissão no manifest, o WebView nunca chega a pedir a
permissão em runtime, então a chamada falha silenciosamente.

Confirmado ainda presente em `origin/main` nesta data (2026-09-11): `AndroidManifest.xml`
tinha só `INTERNET` na seção `<!-- Permissions -->`, nenhuma branch não mergeada tocando esse
arquivo adicionava `CAMERA`.

A feature não quebrava para o usuário: o mesmo componente já tem fallback funcional via
`<input type="file" capture="environment">` (linha 377), que abre o app de câmera nativo do
Android normalmente. Só a pré-visualização ao vivo *dentro* do app nunca aparecia.

## Arquivo(s) envolvido(s)

- `/android/app/src/main/AndroidManifest.xml` (Agente 09 — alterado neste handoff)
- `/src/features/prospecting/components/prospecting-hub/OcrCapturePanel.tsx` (Agente 05 —
  não alterado)

## Alteração feita (Agente 09)

Adicionei `<uses-permission android:name="android.permission.CAMERA" />` em
`AndroidManifest.xml`, com comentário explicando o uso funcional real (regra do próprio
`android/AGENTS.md`: "não solicitar permissão sem uso funcional correspondente") e apontando
para este handoff.

`MainActivity.java` estende `BridgeActivity` (Capacitor) sem overrides de `WebChromeClient`/
`onPermissionRequest` — a concessão de permissão em runtime para `getUserMedia` fica a cargo do
tratamento padrão que o Bridge do Capacitor já implementa (mapeia a permissão web pedida para a
permissão nativa correspondente e solicita em runtime se ainda não concedida). Isso é
comportamento de biblioteca de terceiro (Capacitor core), não código deste repositório.

## Pendência para o Agente 05 (ou quem validar em dispositivo real)

**Não consegui confirmar em dispositivo/emulador Android real se `getUserMedia` passa a
funcionar dentro do WebView com a permissão declarada** — o ambiente desta sessão não tem JDK
nem Android SDK instalados (`java -version` → `command not found`), então não foi possível
rodar `./gradlew assembleDebug` nem qualquer teste em emulador/dispositivo.

Ao validar em um build real (`./gradlew assembleDebug` + instalação em device/emulador com
Android 6+/API 23+, onde `CAMERA` é uma "dangerous permission" que exige runtime request):

1. Abrir a tela de OCR do Prospector (`OcrCapturePanel.tsx`) dentro do app instalado e acionar
   a captura por câmera (não o botão de upload/fallback).
2. **Se funcionar** (prompt de permissão do Android aparece, usuário concede, preview ao vivo
   aparece): fechar este handoff como resolvido, sem alteração de código adicional necessária.
3. **Se ainda falhar** (cai no mesmo `catch` de `OcrCapturePanel.tsx:114`): documentar aqui como
   limitação de plataforma real, não assumir que é regressão desta mudança — nesse caso o
   próximo passo de investigação seria confirmar se o Bridge do Capacitor desta versão
   (`@capacitor/android` — ver versão em `android/app/build.gradle` / `package.json`) de fato
   implementa `onPermissionRequest` para `getUserMedia` puro (fora do plugin `@capacitor/camera`,
   que este componente não usa), e só então considerar um `WebChromeClient` customizado em
   `MainActivity.java` como correção adicional (fora do escopo deste handoff, que é só a
   permissão declarada).

## Teste esperado

- `AndroidManifest.xml` → `android.permission.CAMERA` presente (confirmado nesta mudança).
- Build Android real (`./gradlew assembleDebug`) instalado em device/emulador, com captura por
  câmera testada manualmente dentro de `OcrCapturePanel.tsx` — não executável nesta sessão por
  falta de JDK/Android SDK no ambiente; ver seção "Pendência" acima.

## Contexto adicional

Item de auditoria ACH-09-03 (P2, esforço P) do relatório `report-atualizado.html`. Levantado
numa worktree isolada (`fix/ach-09-03`), sem alteração em `OcrCapturePanel.tsx` (propriedade do
Agente 05) — a mudança ficou restrita a `AndroidManifest.xml`, que é propriedade exclusiva do
Agente 09 por `android/AGENTS.md`.
