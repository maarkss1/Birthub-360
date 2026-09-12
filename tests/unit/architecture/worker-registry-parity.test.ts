import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// ACH-16-05: ACH-16-01, ACH-16-02 e um worker morto (ACH-16-04) são exatamente a classe de
// regressão que este teste existe para pegar — "arquivo de worker existe, mas não registrado em
// algum entrypoint". Nenhum desses casos quebrou nenhum teste existente antes deste arquivo.
//
// Este teste faz glob de todos os arquivos que exportam uma fábrica `createXWorker` nos dois
// diretórios onde workers de fila deste projeto vivem, e confirma que cada fábrica aparece
// importada tanto em `worker.ts` (processo dedicado, obrigatório em produção — ver
// `src/lib/queue/redis.ts`, que aborta o boot se `ENABLE_EMBEDDED_WORKERS=true` em produção)
// quanto em `src/bootstrap/workers.ts` (modo embutido, usado em dev/staging via
// `ENABLE_EMBEDDED_WORKERS=true`). O objetivo é que adicionar um worker novo sem registrá-lo em
// algum dos dois quebre este gate automaticamente.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

const WORKER_TS_PATH = path.join(ROOT, 'worker.ts');
const BOOTSTRAP_WORKERS_PATH = path.join(ROOT, 'src/bootstrap/workers.ts');

const CREATE_WORKER_EXPORT_RE =
  /^export\s+(?:function|const)\s+(create\w*Worker)\b/gm;

/**
 * Worker morto conhecido (ACH-16-04): `stalledLeadQueue`/`createStalledLeadWorker`
 * (src/lib/queue/stalledLead.worker.ts) não é importado por nenhum entrypoint — a stagnation
 * scanner (`src/features/automations/application/stagnation-scanner.service.ts`) assumiu esse
 * papel e só resta um comentário mencionando o arquivo antigo. Allowlist explícita em vez de
 * remoção: decisão de manter ou apagar o arquivo é fora do escopo deste gate de paridade.
 */
const KNOWN_DEAD_WORKERS = new Set<string>(['createStalledLeadWorker']);

interface WorkerExport {
  factoryName: string;
  /** Caminho relativo ao root do repo, para mensagens de erro legíveis. */
  relativeFile: string;
}

function listWorkerFilesInDir(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.worker.ts'))
    .map((name) => path.join(dir, name));
}

/** Glob manual de `src/lib/queue/*.worker.ts` — um único nível, sem subdiretórios. */
function globQueueWorkers(): string[] {
  return listWorkerFilesInDir(path.join(ROOT, 'src/lib/queue'));
}

/** Glob manual de `src/features/*​/jobs/*.worker.ts` — um nível de feature, depois `jobs/`. */
function globFeatureJobWorkers(): string[] {
  const featuresDir = path.join(ROOT, 'src/features');
  const featureNames = readdirSync(featuresDir).filter((name) =>
    statSync(path.join(featuresDir, name)).isDirectory(),
  );

  return featureNames.flatMap((featureName) =>
    listWorkerFilesInDir(path.join(featuresDir, featureName, 'jobs')),
  );
}

function extractWorkerFactories(filePath: string): WorkerExport[] {
  const content = readFileSync(filePath, 'utf-8');
  const relativeFile = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const matches: WorkerExport[] = [];

  for (const match of content.matchAll(CREATE_WORKER_EXPORT_RE)) {
    matches.push({ factoryName: match[1], relativeFile });
  }

  return matches;
}

/**
 * Extrai só o texto dos blocos `import ... ;` de um entrypoint, para checar se um identificador
 * foi importado sem dar falso positivo em um nome citado apenas num comentário.
 */
function extractImportBlocksText(filePath: string): string {
  const content = readFileSync(filePath, 'utf-8');
  const importBlocks = content.match(/^import[^;]+;/gm) ?? [];
  return importBlocks.join('\n');
}

function isImported(factoryName: string, importBlocksText: string): boolean {
  return new RegExp(`\\b${factoryName}\\b`).test(importBlocksText);
}

describe('paridade do registro de workers (worker.ts vs. src/bootstrap/workers.ts)', () => {
  const discovered = [...globQueueWorkers(), ...globFeatureJobWorkers()]
    .flatMap(extractWorkerFactories)
    .sort((a, b) => a.factoryName.localeCompare(b.factoryName));

  it('encontrou pelo menos um worker via glob (sanity check do próprio teste)', () => {
    // Se isso falhar, o glob quebrou (ex.: reorganização de diretórios) e o resto do arquivo
    // estaria testando um conjunto vazio silenciosamente — sempre "verde" e inútil.
    expect(discovered.length).toBeGreaterThan(0);
  });

  it('toda allowlist de worker morto corresponde a um worker real descoberto pelo glob', () => {
    // Evita que a allowlist apodreça: se `createStalledLeadWorker` for renomeado ou o arquivo
    // removido, este teste força a atualização da allowlist em vez de deixá-la um no-op mudo.
    const discoveredNames = new Set(discovered.map((w) => w.factoryName));
    for (const deadWorker of KNOWN_DEAD_WORKERS) {
      expect(discoveredNames.has(deadWorker)).toBe(true);
    }
  });

  const entrypoints = [
    { label: 'worker.ts (processo dedicado)', filePath: WORKER_TS_PATH },
    { label: 'src/bootstrap/workers.ts (modo embutido)', filePath: BOOTSTRAP_WORKERS_PATH },
  ];

  for (const { label, filePath } of entrypoints) {
    it(`todo worker de src/lib/queue/*.worker.ts e src/features/*/jobs/*.worker.ts está importado em ${label}`, () => {
      const importBlocksText = extractImportBlocksText(filePath);

      const missing = discovered.filter(
        (worker) =>
          !KNOWN_DEAD_WORKERS.has(worker.factoryName) &&
          !isImported(worker.factoryName, importBlocksText),
      );

      if (missing.length > 0) {
        const details = missing
          .map((w) => `  - ${w.factoryName} (${w.relativeFile})`)
          .join('\n');
        throw new Error(
          `${missing.length} worker(s) com fábrica createXWorker não estão importados em ` +
            `${path.relative(ROOT, filePath).replace(/\\/g, '/')}:\n${details}\n\n` +
            'Se o worker foi criado de propósito sem uso em produção, adicione-o a ' +
            'KNOWN_DEAD_WORKERS em tests/unit/architecture/worker-registry-parity.test.ts com ' +
            'justificativa. Caso contrário, registre-o no entrypoint (import + criação da ' +
            'instância + agendamento, se aplicável) seguindo o padrão dos workers já existentes.',
        );
      }

      expect(missing).toEqual([]);
    });
  }
});
