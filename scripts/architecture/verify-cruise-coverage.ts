// scripts/architecture/verify-cruise-coverage.ts
//
// Gate de "cobertura real do dependency-cruiser" (Onda 49, handoff
// .agents/handoffs/onda-49/00-para-14-validacao-local-pre-push.md, achado #1).
//
// `npm run lint:architecture` (depcruise --output-type err) sai com exit 0 sempre que não
// encontra violação ENTRE os módulos que conseguiu cruzar — mas se o parser TypeScript falhar em
// resolver a maior parte do código-fonte (ex.: node_modules corrompido/parcial, versão de
// `typescript` incompatível com o que o depcruise sabe interpretar), ele simplesmente cruza um
// subconjunto minúsculo do grafo real (achado real: 61 de ~955 módulos numa revisão local) e
// ainda assim reporta sucesso, porque "nenhuma violação encontrada" também é verdade sobre um
// grafo vazio. O gate passava escondendo o problema.
//
// Este script roda o depcruise com `--output-type json` (que sempre inclui `modules`, o grafo
// efetivamente cruzado, independente de haver violação) e compara `modules.length` contra uma
// contagem de arquivos-fonte feita por uma varredura de sistema de arquivos independente
// (`listSourceFiles()`, de check-hotspots.ts — não depende do parser TypeScript do
// dependency-cruiser, só de `fs.readdirSync`), usando as mesmas raízes (`src/`, `server.ts`,
// `worker.ts`) e as mesmas exclusões de diretório. Se a cobertura real cair muito abaixo do
// esperado, ou se a saída do depcruise mencionar uma versão de TypeScript não suportada, o gate
// falha alto e cedo — em vez de silenciosamente aprovar uma varredura incompleta.
//
// Uma pequena margem (COVERAGE_THRESHOLD) é tolerada porque as duas contagens não são
// definicionalmente idênticas (ex.: arquivos-fonte sem nenhum import/export que o TypeScript
// ainda assim emite como módulo isolado, diferenças de borda em como cada ferramenta trata
// arquivos totalmente do tipo `type-only`). Uma diferença grande (ex.: 61 vs. 955) nunca é
// explicada por essa margem — é sinal de cobertura quebrada.

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { listSourceFiles } from './check-hotspots.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Abaixo desta fração da contagem de arquivos-fonte esperada, tratamos como cobertura quebrada,
// não como diferença metodológica normal entre as duas varreduras.
export const COVERAGE_THRESHOLD = 0.9;

// Padrões observados em ferramentas baseadas no compilador TypeScript quando a versão instalada
// foge do intervalo que o parser sabe interpretar — sinal de alerta mesmo se o exit code do
// depcruise for 0 e a cobertura numérica parecer aceitável.
const UNSUPPORTED_TS_PATTERNS = [
  /does not support typescript/i,
  /typescript version.*not (?:officially )?supported/i,
  /unsupported typescript/i,
];

const DEPCRUISE_COMMAND =
  'npx depcruise --config .dependency-cruiser.cjs --output-type json src server.ts worker.ts';

export type CruiseCoverageResult = {
  cruisedModuleCount: number;
  expectedSourceFileCount: number;
  minimumAcceptable: number;
  unsupportedTsWarning: string | null;
};

type DepcruiseJsonOutput = {
  modules?: Array<{ source: string }>;
};

// Ver check-audit-waivers.ts para o mesmo raciocínio: no Windows `npx`/`npm` são scripts `.cmd`,
// então `execSync` com a linha de comando pronta (sem `execFileSync`) é o jeito que roda em
// qualquer plataforma sem ENOENT/EINVAL. A string é literal fixa, sem input externo — não há
// superfície de injeção de shell para escapar aqui.
function runDependencyCruiserJson(): { stdout: string; stderr: string } {
  let stdout = '';
  let stderr = '';
  try {
    stdout = execSync(DEPCRUISE_COMMAND, {
      cwd: ROOT,
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    const asExecErr = err as { stdout?: string; stderr?: string };
    stdout = typeof asExecErr.stdout === 'string' ? asExecErr.stdout : '';
    stderr = typeof asExecErr.stderr === 'string' ? asExecErr.stderr : '';
    if (!stdout.trim()) {
      throw err;
    }
  }
  return { stdout, stderr };
}

export function parseCruisedModuleCount(stdout: string): number {
  let parsed: DepcruiseJsonOutput;
  try {
    parsed = JSON.parse(stdout) as DepcruiseJsonOutput;
  } catch (err) {
    throw new Error(
      `A saída do depcruise não é um JSON válido — não é possível verificar cobertura. ` +
        `Detalhe: ${(err as Error).message}`,
    );
  }
  if (!Array.isArray(parsed.modules)) {
    throw new Error(
      'A saída do depcruise não tem um array `modules` — formato inesperado, não é possível ' +
        'verificar cobertura.',
    );
  }
  return parsed.modules.length;
}

export function findUnsupportedTsWarning(combinedOutput: string): string | null {
  for (const pattern of UNSUPPORTED_TS_PATTERNS) {
    const match = combinedOutput.match(pattern);
    if (match) return match[0];
  }
  return null;
}

export function evaluateCoverage(
  cruisedModuleCount: number,
  expectedSourceFileCount: number,
  threshold: number = COVERAGE_THRESHOLD,
): { ok: boolean; minimumAcceptable: number } {
  const minimumAcceptable = Math.floor(expectedSourceFileCount * threshold);
  return { ok: cruisedModuleCount >= minimumAcceptable, minimumAcceptable };
}

function main(): void {
  const expectedSourceFileCount = listSourceFiles(ROOT).length;
  const { stdout, stderr } = runDependencyCruiserJson();

  const unsupportedTsWarning = findUnsupportedTsWarning(`${stdout}\n${stderr}`);
  const cruisedModuleCount = parseCruisedModuleCount(stdout);
  const { ok, minimumAcceptable } = evaluateCoverage(cruisedModuleCount, expectedSourceFileCount);

  if (unsupportedTsWarning) {
    console.error(
      `❌ dependency-cruiser reportou uma versão de TypeScript não suportada pelo seu parser ` +
        `("${unsupportedTsWarning}"). Mesmo que o exit code do depcruise seja 0, isso é sinal de ` +
        `que a varredura pode estar incompleta — não confie no resultado sem investigar antes.`,
    );
    process.exit(1);
  }

  if (!ok) {
    console.error(
      `❌ Cobertura do dependency-cruiser abaixo do esperado: cruzou ${cruisedModuleCount} ` +
        `módulo(s), mas há ${expectedSourceFileCount} arquivo(s)-fonte em src/, server.ts e ` +
        `worker.ts (mínimo aceitável: ${minimumAcceptable}, ${Math.round(COVERAGE_THRESHOLD * 100)}% do total). ` +
        `Isso normalmente significa que o parser TypeScript do depcruise falhou em resolver a ` +
        `maior parte do código (ex.: node_modules corrompido/parcial, versão de \`typescript\` ` +
        `incompatível) e "nenhuma violação encontrada" está mentindo sobre um grafo quase vazio. ` +
        `Rode \`npm install\` limpo e reexecute antes de confiar no gate de arquitetura.`,
    );
    process.exit(1);
  }

  console.log(
    `✅ verify:architecture-coverage — depcruise cruzou ${cruisedModuleCount} módulo(s) contra ` +
      `${expectedSourceFileCount} arquivo(s)-fonte esperado(s) (mínimo aceitável: ` +
      `${minimumAcceptable}). Cobertura real, não um grafo parcial disfarçado de sucesso.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
