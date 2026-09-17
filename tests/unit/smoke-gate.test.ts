import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import { execFile, execSync } from 'node:child_process';
import path from 'node:path';

function hasBash(): boolean {
  if (process.platform !== 'win32') {
    return true;
  }
  try {
    execSync('bash --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const isBashAvailable = hasBash();
const runShellTest = isBashAvailable ? it : it.skip;

describe('Production Smoke Gate (scripts/smoke-test-oci.sh)', () => {
  let server: http.Server | null = null;
  const PORT = 3099;
  const SCRIPT_PATH = path.resolve(__dirname, '../../scripts/smoke-test-oci.sh');

  function startMockServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<void> {
    return new Promise((resolve) => {
      server = http.createServer(handler);
      server.listen(PORT, '127.0.0.1', () => {
        resolve();
      });
    });
  }

  function stopMockServer(): Promise<void> {
    return new Promise((resolve) => {
      if (server) {
        server.close(() => {
          server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  afterEach(async () => {
    await stopMockServer();
  });

  function runSmokeScript(env: Record<string, string>): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      execFile('bash', [SCRIPT_PATH], { env }, (error, stdout, stderr) => {
        resolve({
          code: error ? (error.code as number) ?? 1 : 0,
          stdout,
          stderr,
        });
      });
    });
  }

  runShellTest('passa no smoke test quando /health/live e /health/ready respondem HTTP 200 com status ok', async () => {
    await startMockServer((req, res) => {
      if (req.url === '/health/live' || req.url === '/health/ready') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    const env = {
      ...process.env,
      TARGET_URL: `http://127.0.0.1:${PORT}`,
      MAX_RETRIES: '2',
      RETRY_INTERVAL: '1',
    };

    const result = await runSmokeScript(env);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('HEALTH_LIVE=PASS');
    expect(result.stdout).toContain('HEALTH_READY=PASS');
    expect(result.stdout).toContain('SMOKE_TEST=PASS');
  });

  runShellTest('falha no smoke test se /health/ready retornar HTTP 503 (banco indisponível)', async () => {
    await startMockServer((req, res) => {
      if (req.url === '/health/live') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else if (req.url === '/health/ready') {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Database unavailable' }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    const env = {
      ...process.env,
      TARGET_URL: `http://127.0.0.1:${PORT}`,
      MAX_RETRIES: '2',
      RETRY_INTERVAL: '1',
    };

    const result = await runSmokeScript(env);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('HEALTH_LIVE=PASS');
    expect(result.stdout).toContain('HEALTH_READY=FAIL');
    expect(result.stdout).toContain('SMOKE_TEST=FAIL');
  });

  runShellTest('recupera-se e passa se a aplicação estiver inicializando e só responder nas retries', async () => {
    let attempts = 0;
    await startMockServer((req, res) => {
      attempts++;
      if (attempts <= 2) {
        // Primeiras duas chamadas falham (simula boot da app)
        res.writeHead(500);
        res.end('Starting up...');
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      }
    });

    const env = {
      ...process.env,
      TARGET_URL: `http://127.0.0.1:${PORT}`,
      MAX_RETRIES: '4',
      RETRY_INTERVAL: '1',
    };

    const result = await runSmokeScript(env);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('HEALTH_LIVE=PASS');
    expect(result.stdout).toContain('HEALTH_READY=PASS');
    expect(result.stdout).toContain('SMOKE_TEST=PASS');
  });

  runShellTest('falha por timeout / recusou conexão quando o servidor está completamente offline', async () => {
    // Nenhum servidor iniciado na porta
    const env = {
      ...process.env,
      TARGET_URL: `http://127.0.0.1:${PORT + 10}`,
      MAX_RETRIES: '2',
      RETRY_INTERVAL: '1',
    };

    const result = await runSmokeScript(env);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('HEALTH_LIVE=FAIL');
    expect(result.stdout).toContain('HEALTH_READY=FAIL');
    expect(result.stdout).toContain('SMOKE_TEST=FAIL');
  });
});

describe('Deploy Log Parsing Logic (GitHub Actions Helper)', () => {
  function parseDeployLog(logContent: string) {
    const prevMatch = logContent.match(/^PREVIOUS_SHA=([0-9a-f]{40})$/m);
    const prev = prevMatch ? prevMatch[1] : 'UNKNOWN';

    const liveMatch = logContent.match(/^HEALTH_LIVE=(PASS|FAIL)$/m);
    const health_live = liveMatch ? liveMatch[1] : 'UNKNOWN';

    const readyMatch = logContent.match(/^HEALTH_READY=(PASS|FAIL)$/m);
    const health_ready = readyMatch ? readyMatch[1] : 'UNKNOWN';

    const smokeMatch = logContent.match(/^SMOKE_TEST=(PASS|FAIL)$/m);
    const smoke = smokeMatch ? smokeMatch[1] : 'FAIL';

    return { prev, health_live, health_ready, smoke };
  }

  it('extrai corretamente todos os marcadores em caso de sucesso', () => {
    const mockLog = `
PREVIOUS_SHA=847aabce8acffea607b6f7b9034efb895021f293
CURRENT_SHA=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
Executando migrações Prisma...
HEALTH_LIVE=PASS
HEALTH_READY=PASS
SMOKE_TEST=PASS
`;

    const parsed = parseDeployLog(mockLog);
    expect(parsed.prev).toBe('847aabce8acffea607b6f7b9034efb895021f293');
    expect(parsed.health_live).toBe('PASS');
    expect(parsed.health_ready).toBe('PASS');
    expect(parsed.smoke).toBe('PASS');
  });

  it('atribui UNKNOWN e FAIL quando marcadores estão ausentes ou corrompidos', () => {
    const mockLog = `
CURRENT_SHA=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
Some random error during deploy
{"status":"ok"}{"status":"ok"}SMOKE_TEST=PASS
`;

    const parsed = parseDeployLog(mockLog);
    expect(parsed.prev).toBe('UNKNOWN');
    expect(parsed.health_live).toBe('UNKNOWN');
    expect(parsed.health_ready).toBe('UNKNOWN');
    expect(parsed.smoke).toBe('FAIL'); // SMOKE_TEST sem quebra de linha inicial não é aceito por '^SMOKE_TEST='
  });
});
