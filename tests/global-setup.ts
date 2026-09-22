/**
 * global-setup.ts — Playwright Global Setup
 *
 * Aquece o servidor Vite antes do primeiro teste rodar.
 *
 * Problema: com `reuseExistingServer: true`, o Playwright confirma apenas que a
 * porta 3000 está aberta, não que o Vite terminou a compilação do CSS/JS. A primeira
 * requisição real de um browser dispara a compilação lazy, que pode levar 40-50s —
 * mais do que o timeout padrão de 45s dos testes. Os primeiros 1-2 testes falhavam
 * com "page.goto: Test timeout of 45000ms exceeded" enquanto o Vite ainda compilava.
 *
 * Solução: este script faz uma requisição HTTP simples a `/login` com retries até
 * receber 200, dando tempo ao Vite de compilar o bundle completo antes que qualquer
 * worker de teste seja iniciado.
 */

import http from 'node:http';

const PORT = process.env.PORT ?? '3000';
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const WARMUP_URL = `${BASE_URL}/login`;
const MAX_WAIT_MS = 120_000; // 2min — suficiente para cold-start + compilação CSS
const POLL_INTERVAL_MS = 2_000;

function httpGet(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume(); // descarta o body — só precisamos do status
      resolve(res.statusCode ?? 0);
    });
    req.setTimeout(5_000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.on('error', reject);
  });
}

export default async function globalSetup() {
  const deadline = Date.now() + MAX_WAIT_MS;
  let attempts = 0;

  console.log(`[global-setup] Aquecendo servidor em ${WARMUP_URL}...`);

  while (Date.now() < deadline) {
    attempts++;
    try {
      const status = await httpGet(WARMUP_URL);
      if (status >= 200 && status < 400) {
        // Aguarda mais 2s para garantir que os chunks de CSS/JS do primeiro request
        // já foram enviados ao cliente antes de o Playwright começar a abrir browsers.
        await new Promise((r) => setTimeout(r, 2_000));
        console.log(
          `[global-setup] Servidor pronto após ${attempts} tentativa(s). Status: ${status}`,
        );
        return;
      }
      console.log(`[global-setup] Tentativa ${attempts}: status ${status}, aguardando...`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[global-setup] Tentativa ${attempts}: ${msg}, aguardando...`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.warn(
    `[global-setup] Servidor não confirmou prontidão em ${MAX_WAIT_MS / 1000}s — continuando mesmo assim.`,
  );
}
