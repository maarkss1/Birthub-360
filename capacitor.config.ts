import type { CapacitorConfig } from '@capacitor/cli';

// server.url faz o WebView carregar a aplicação diretamente do backend, em vez de servir só o
// bundle estático empacotado em `dist` (webDir). Isso é proposital, não um placeholder: a
// arquitetura de produção (docs/deploy/producao.md) é um monólito único no Render que serve API +
// frontend Vite no mesmo domínio. Com server.url apontando pra esse domínio, as chamadas relativas
// de src/lib/api.ts (`fetch('/api/...')`) e src/lib/auth-client.ts (`window.location.origin`)
// resolvem contra a própria origem carregada — sem precisar embutir uma VITE_API_URL absoluta no
// build nem lidar com CORS entre origens diferentes.
//
// ACHADO (Onda 8, Agente 09): este bloco `server` existia antes e foi apagado por engano no commit
// 5b06b80d ("feat(09): configure capacitor for android and ios wrapper"), que deixou as constantes
// e os comentários acima intactos mas removeu o campo `server` do objeto de config — o app
// empacotado carregava só o HTML/JS estático de `dist` a partir de `https://localhost` (esquema
// padrão do Capacitor no Android), origem onde não existe nenhum backend rodando. Resultado: todo
// fetch relativo (`/api/...`) ia para `https://localhost/api/...` e falhava — o app abria, mas
// nenhuma tela que depende de dados (dashboard, CRM, prospecção, Hub de IA etc.) funcionava.
// Restaurado aqui, com o domínio de produção real confirmado nesta onda (ver comentário abaixo).
//
// NOTA DE MARCA (atualizado 2026-09-22, pedido explícito do usuário): appId, esquema de deep
// link e domínio foram renomeados para `br.com.birthhub360.prospector`/`birthhub360://`/
// `app.birthhub360.com.br` (identificadores da marca anterior removidos por completo) — o app
// nunca chegou a ser publicado nas lojas sob o nome anterior, então não há instalação real, link
// salvo ou configuração de DNS/Render em produção que essa troca invalide. `npx cap sync android`/
// `npx cap sync ios` precisam rodar de novo depois desta mudança para propagar o novo appId/scheme
// aos projetos nativos.
//
// `app.birthhub360.com.br` (domínio final, usado em render.yaml/docs/deploy/producao.md como
// ALLOWED_ORIGINS/BETTER_AUTH_URL/PUBLIC_BASE_URL) ainda não resolve DNS. O fallback documentado
// em docs/deploy/producao.md §8 ("até lá") é o hostname direto do Render, usado como default
// abaixo — mas note que Render está desativado desde a transição para modo Local-First
// (docs/deploy/README.md); o caminho de build mobile contra um backend real precisa ser
// revisitado à luz disso, não é bloqueador desta troca de nome.
//
// Para apontar para um backend de desenvolvimento local (mesma rede Wi-Fi/LAN) durante testes no
// celular, exporte CAPACITOR_SERVER_URL=http://<ip-da-sua-maquina>:3005 antes de `npx cap sync
// android`. cleartext HTTP só liga automaticamente quando a URL não é https (IS_LOCAL_TEST_URL) —
// e mesmo assim só afeta build de debug, já que o manifest de release não declara
// usesCleartextTraffic (ver android/app/src/main/AndroidManifest.xml e
// android/app/src/debug/AndroidManifest.xml).
const PRODUCTION_URL = process.env.CAPACITOR_SERVER_URL || 'https://prospector-atlas.onrender.com';
const IS_LOCAL_TEST_URL = PRODUCTION_URL.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'br.com.birthhub360.prospector',
  appName: 'Birth Hub 360',
  webDir: 'dist',
  server: {
    url: PRODUCTION_URL,
    cleartext: IS_LOCAL_TEST_URL,
    // Esquema custom de deep link (ver android/app/src/main/AndroidManifest.xml e
    // ios/App/App/Info.plist) — precisa estar em allowNavigation só se o link apontar pra um host
    // diferente do PRODUCTION_URL; como o deep link é resolvido nativamente (MainActivity.java /
    // SceneDelegate.swift) e só recarrega o WebView com uma URL do próprio PRODUCTION_URL, não é
    // necessário adicionar `birthhub360://` aqui.
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      // Obsidian: a marca é escura por padrão (identidade-visual/birthhub360). Splash
      // branco criava um flash claro antes do app pintar a própria superfície.
      backgroundColor: '#0B132B',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // "LIGHT" = conteúdo claro sobre barra escura (nomenclatura do Capacitor),
      // combinando com o Obsidian do splash e do tema escuro.
      style: 'LIGHT',
      overlaysWebView: false,
      backgroundColor: '#0B132B',
    },
  },
};

export default config;
