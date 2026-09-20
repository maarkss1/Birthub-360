// scripts/pwa/verify-precache.ts
//
// Gate de "o build do PWA gerou um precache de verdade" (Onda 49, handoff
// .agents/handoffs/onda-49/00-para-14-validacao-local-pre-push.md, achado #2).
//
// `npm run build` (vite build + vite-plugin-pwa) pode terminar com exit 0 mesmo quando o Rollup
// falhou silenciosamente em resolver um dos pacotes usados no bundle (achado real: node_modules
// corrompido/parcial deixou `lucide-react` sem seus arquivos ESM, o que fazia o build de produção
// quebrar em cascata) e o Workbox, chamado logo depois com um `dist/` incompleto ou de uma corrida
// anterior, gerar `dist/sw.js` com um precache vazio ou quase vazio (achado real: 1 entrada / 0
// KiB). Nenhum desses dois sintomas falha o processo `vite build` por si só — o service worker
// "existe", só não serve para nada.
//
// Este script roda depois do build (`vite build`) e antes de considerar o pipeline de produção
// pronto:
//   1. lê `dist/sw.js` gerado pelo vite-plugin-pwa (modo `generateSW`, workbox-build);
//   2. extrai a lista de entradas do precache do argumento de `precacheAndRoute([...])` — é assim
//      que o workbox injeta o manifesto no modo generateSW (ver dist/sw.js real: chamada única,
//      array literal de `{url, revision}`);
//   3. falha (exit 1) se o arquivo não existir, se a chamada não for encontrada, se o array tiver
//      menos entradas que o mínimo esperado, ou se algum arquivo referenciado pela URL do
//      manifesto não existir de fato em `dist/` (o manifesto mentindo sobre o conteúdo do build).
//
// MIN_PRECACHE_ENTRIES é deliberadamente conservador (bem abaixo do que o app real gera hoje,
// ~150) para não quebrar o gate a cada ajuste legítimo de `globPatterns`/`includeAssets` — o
// objetivo aqui é pegar o caso "praticamente vazio" (1 entrada / 0 KiB), não policiar o tamanho
// exato do precache.

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST_DIR = path.join(ROOT, 'dist');
const SW_PATH = path.join(DIST_DIR, 'sw.js');

export const MIN_PRECACHE_ENTRIES = 20;

export type PrecacheEntry = { url: string; revision: string | null };

export function extractPrecacheManifest(swSource: string): PrecacheEntry[] {
  const match = swSource.match(/precacheAndRoute\((\[[\s\S]*?\])(?:,\s*\{[\s\S]*?\})?\)/);
  if (!match) {
    throw new Error(
      'Não encontrei a chamada `precacheAndRoute([...])` em dist/sw.js — formato do service ' +
        'worker gerado pelo workbox mudou, ou o arquivo não é o service worker esperado.',
    );
  }
  let manifest: unknown;
  try {
    // O array vem como literal JS minificado (chaves sem aspas, sem vírgula final) — não é JSON
    // válido. new Function(...) é seguro aqui porque a entrada é o próprio dist/sw.js que este
    // mesmo build acabou de gerar, não input externo/não confiável.
    manifest = new Function(`return (${match[1]});`)();
  } catch (err) {
    throw new Error(
      `Não consegui interpretar o array de precache extraído de dist/sw.js: ${(err as Error).message}`,
    );
  }
  if (!Array.isArray(manifest)) {
    throw new Error('O precache extraído de dist/sw.js não é um array.');
  }
  return manifest as PrecacheEntry[];
}

export function findMissingPrecacheFiles(entries: PrecacheEntry[], distDir: string): string[] {
  const missing: string[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry.url !== 'string') continue;
    const [urlWithoutQuery] = entry.url.split('?');
    const absPath = path.join(distDir, urlWithoutQuery);
    let sizeBytes = 0;
    try {
      sizeBytes = statSync(absPath).size;
    } catch {
      missing.push(entry.url);
      continue;
    }
    if (sizeBytes === 0) missing.push(`${entry.url} (0 bytes)`);
  }
  return missing;
}

function main(): void {
  if (!existsSync(SW_PATH)) {
    console.error(
      `❌ dist/sw.js não existe. O build do PWA (vite-plugin-pwa, modo generateSW) não rodou ou ` +
        `falhou antes de gerar o service worker — rode \`npm run build\` e confira o log do plugin ` +
        `PWA por erro.`,
    );
    process.exit(1);
  }

  const swSource = readFileSync(SW_PATH, 'utf-8');
  const entries = extractPrecacheManifest(swSource);

  if (entries.length < MIN_PRECACHE_ENTRIES) {
    console.error(
      `❌ Precache do PWA quase vazio: ${entries.length} entrada(s) (mínimo esperado: ` +
        `${MIN_PRECACHE_ENTRIES}). Isso é o sintoma exato de um build que "passou" (exit 0) sem ` +
        `empacotar o app de verdade — geralmente porque o \`vite build\` principal falhou em ` +
        `resolver alguma dependência (ex.: node_modules corrompido/parcial) e o Workbox rodou em ` +
        `cima de um \`dist/\` incompleto ou de uma corrida anterior. Rode \`npm install\` limpo e ` +
        `\`npm run build\` de novo antes de confiar neste artefato.`,
    );
    process.exit(1);
  }

  const missing = findMissingPrecacheFiles(entries, DIST_DIR);
  if (missing.length > 0) {
    console.error(
      `❌ ${missing.length} entrada(s) do precache do PWA apontam para arquivo(s) inexistente(s) ` +
        `ou vazio(s) em dist/ — o manifesto do service worker não corresponde ao conteúdo real do ` +
        `build:`,
    );
    for (const m of missing.slice(0, 20)) console.error(`   - ${m}`);
    if (missing.length > 20) console.error(`   ... e mais ${missing.length - 20}.`);
    process.exit(1);
  }

  const totalBytes = entries.reduce((sum, entry) => {
    if (!entry || typeof entry.url !== 'string') return sum;
    const [urlWithoutQuery] = entry.url.split('?');
    try {
      return sum + statSync(path.join(DIST_DIR, urlWithoutQuery)).size;
    } catch {
      return sum;
    }
  }, 0);

  console.log(
    `✅ verify:pwa-precache — dist/sw.js precacheia ${entries.length} entrada(s), ` +
      `${(totalBytes / 1024).toFixed(2)} KiB reais em dist/. Precache não está vazio nem ` +
      `desalinhado do build.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
