/**
 * CLI da verificação estática de deriva entre `docs/openapi.yaml` e as rotas reais montadas no
 * composition root da aplicação (`server.ts` + `src/bootstrap/*.ts`, ver ITEM-07).
 * Não precisa de servidor rodando nem de Postgres/Redis — só do checkout do repositório, por isso
 * pode rodar em qualquer job de CI (ver handoff `.agents/handoffs/onda-8/
 * 18-para-08-ci-openapi-drift.md` pedindo para o Agente 08 conectar isto ao workflow de CI).
 *
 * Uso: `npm run verify:openapi-drift`. Sai com código 1 e imprime a tabela de divergência quando
 * há prefixo de rota montado sem documentação, path documentado sem rota real correspondente, ou
 * (Passe 2, ver abaixo) endpoint concreto (path + método HTTP) montado dentro de um router de
 * feature sem doc correspondente exata.
 *
 * Passe 1 — escopo: ver o comentário no topo de `src/shared/contracts/openapiRouteInventory.ts` —
 * é estrutural (prefixo de recurso montado em `server.ts`/`src/bootstrap/*.ts` existe/documentado),
 * não valida método/parâmetro/corpo/status code por endpoint, e não olha dentro dos arquivos de
 * router de cada feature — só o `app.use('/api/xxx', ...)` de topo.
 *
 * Passe 2 (`computeSubRouteDrift`, definido só neste arquivo, propositalmente — Agente 18 audita
 * `docs/openapi.yaml` e este CLI, mas não é dono de `src/shared/contracts/openapiRouteInventory.ts`,
 * então a checagem mais funda vive aqui em vez de alterar aquele módulo): resolve, para cada
 * `app.use('/api/prefixo', ...middlewares, algumRouterImportado)` do composition root, o arquivo de
 * router de feature correspondente (via import estático de `src/bootstrap/*.ts`), lê os
 * `router.get/post/put/patch/delete('/subpath', ...)` literais desse arquivo e cruza path+método
 * exatos contra `docs/openapi.yaml`. Foi assim que se confirmou o achado real desta auditoria:
 * `GET /api/analytics/cohort` e `GET /api/analytics/export/pdf` existem no código e nunca tiveram
 * entrada em `docs/openapi.yaml` — o Passe 1 não pegava porque `/api/analytics` já tinha *outros*
 * paths documentados (`/analytics/overview`, `/analytics/dashboard`), o que bastava para o prefixo
 * inteiro ser considerado "coberto".
 *
 * Recursivo desde a auditoria de 2026-09-11 (Onda 8, achado de retomada): o passe original só
 * olhava um nível de router — se um arquivo de feature montasse `router.use('/subprefixo',
 * outroRouterImportado)`, os endpoints definidos DENTRO desse sub-router nunca eram lidos, e
 * ficavam invisíveis ao gate mesmo com drift real (achado confirmado: `intelligence.routes.ts`
 * monta `router.use('/suite', aiSuiteRouter)`, e os 16 endpoints POST/GET de `ai-suite.routes.ts`
 * — `/suite/inventory`, `/suite/bitrix-hygiene`, `/suite/lgpd/sanitize` etc. — nunca tiveram
 * entrada correspondente em `docs/openapi.yaml`, apesar de `/api/intelligence` já ter outros paths
 * documentados). Agora `resolveAndWalkRouter` segue `router.use('/subprefixo', identificador)`
 * aninhado dentro de qualquer arquivo de router já resolvido, compondo o prefixo completo
 * (`prefixoDoMount + subprefixoDoUse + subpathDoMétodo`) em cada nível antes de comparar contra o
 * documento — não só no nível montado direto pelo composition root. Um `Set` de
 * `arquivo::variávelLocal` visitados evita loop infinito em caso de import circular. Só falha o
 * build por algo que este passe resolveu com confiança em CADA nível (import estático de nome
 * simples, sem let/reassign, sem geração dinâmica de path) — quando não consegue resolver um
 * router com segurança em qualquer nível, pula esse mount em vez de arriscar falso positivo.
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import {
  computeOpenApiDrift,
  collectCompositionRootSource,
} from '../src/shared/contracts/openapiRouteInventory.js';

interface SubRouteDriftFinding {
  method: string;
  /** Path completo já no estilo do documento (sem `/api`, `:param` convertido para `{param}`). */
  docStylePath: string;
  /** Path completo como aparece no código-fonte (com `/api`, `:param` no estilo Express). */
  sourcePath: string;
  kind: 'undocumented-path' | 'undocumented-method';
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

function toDocStyleSegment(segment: string): string {
  return segment.startsWith(':') ? `{${segment.slice(1)}}` : segment;
}

function toDocStylePath(sourcePath: string): string {
  // remove o segmento inicial 'api' e converte ':param' -> '{param}', mesma convenção do path do YAML
  const segments = sourcePath.split('/').filter(Boolean);
  const withoutApi = segments[0] === 'api' ? segments.slice(1) : segments;
  return '/' + withoutApi.map(toDocStyleSegment).join('/');
}

/** Mapa `nomeDoIdentificador -> caminho relativo de import`, a partir de `import { a, b } from '../x.js';` simples. */
function buildImportMap(source: string): Map<string, string> {
  const map = new Map<string, string>();
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"](\.\.?\/[^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(source)) !== null) {
    const names = match[1]
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    const importPath = match[2];
    for (const rawName of names) {
      // suporta 'foo as bar' pegando o nome local (depois do 'as', se houver)
      const localName = rawName.includes(' as ') ? rawName.split(' as ')[1].trim() : rawName;
      map.set(localName, importPath);
    }
  }
  return map;
}

interface TopLevelMount {
  prefix: string;
  routerVarName: string;
}

interface UseMount {
  /** Path literal do primeiro argumento do `.use(...)`, ex.: '/api/analytics' ou '/suite'. */
  path: string;
  routerVarName: string;
}

/**
 * Extrai `<callerVarName>.use('/prefixo', ...middlewares, identificadorSimples)` — ignora handlers
 * inline. Genérico o bastante para ler tanto `app.use(...)` no composition root quanto
 * `router.use(...)` (ou qualquer outro nome de variável local de router) dentro de um arquivo de
 * feature, o que é o que torna a resolução de sub-router aninhado (Passe 2 recursivo) possível sem
 * duplicar esta regra de extração.
 */
function extractUseMounts(source: string, callerVarName: string): UseMount[] {
  const mounts: UseMount[] = [];
  const safeName = escapeForRegex(callerVarName);
  const useRegex = new RegExp(
    `${safeName}\\.use\\(\\s*['"](\\/[^'"]*)['"]\\s*,([^;]*?)\\)\\s*;`,
    'g',
  );
  let match: RegExpExecArray | null;
  while ((match = useRegex.exec(source)) !== null) {
    const usePath = match[1];
    const args = match[2].trim();
    // último token da lista de argumentos precisa ser um identificador simples (nome de router
    // importado) — se terminar em '}', ')' etc. é um handler inline ou expressão, não um router
    // resolvível estaticamente, então pulamos esse mount (best-effort, sem falso positivo).
    const lastArg = args
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)
      .pop();
    if (!lastArg || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(lastArg)) continue;
    mounts.push({ path: usePath, routerVarName: lastArg });
  }
  return mounts;
}

/** Extrai `app.use('/api/prefixo', ...middlewares, identificadorSimples)` no composition root. */
function extractTopLevelRouterMounts(source: string): TopLevelMount[] {
  return extractUseMounts(source, 'app')
    .filter((mount) => mount.path.startsWith('/api/'))
    .map((mount) => ({ prefix: mount.path, routerVarName: mount.routerVarName }));
}

function escapeForRegex(identifier: string): string {
  return identifier.replace(/[$]/g, '\\$');
}

/**
 * Alguns arquivos de feature declaram mais de um `Router()` e exportam cada um sob um nome
 * diferente (ex.: `threecx.routes.ts` — `threecxRoutes` para as rotas autenticadas e
 * `threecxWebhookRouter` para o webhook pré-`express.json()`, os dois no MESMO arquivo). Se
 * assumíssemos sempre a variável local `router`, dois mounts distintos que resolvem para esse
 * mesmo arquivo acabariam ambos herdando os sub-paths de só uma das duas variáveis — falso
 * positivo. Por isso resolvemos a variável local de verdade por export antes de extrair rotas:
 * `export const nome = router;` (alias) ou `export const nome = Router();` (direto). Sem um dos
 * dois padrões reconhecíveis, devolve `null` e o mount é pulado (sem falso positivo).
 */
function resolveRouterLocalVarName(source: string, exportedName: string): string | null {
  const safeName = escapeForRegex(exportedName);
  const aliasMatch = new RegExp(`export const ${safeName}\\s*=\\s*([A-Za-z_$][\\w$]*)\\s*;`).exec(
    source,
  );
  if (aliasMatch) return aliasMatch[1];
  if (new RegExp(`export const ${safeName}\\s*=\\s*Router\\(`).test(source)) return exportedName;
  return null;
}

/** Extrai `<localVarName>.<method>('/subpath', ...)` literais de um arquivo de router de feature. */
function extractRouterMethodPaths(
  source: string,
  localVarName: string,
): Array<{ method: string; subpath: string }> {
  const found: Array<{ method: string; subpath: string }> = [];
  const safeName = escapeForRegex(localVarName);
  const routeRegex = new RegExp(
    `${safeName}\\.(${HTTP_METHODS.join('|')})\\(\\s*['"](\\/[^'"]*)['"]`,
    'g',
  );
  let match: RegExpExecArray | null;
  while ((match = routeRegex.exec(source)) !== null) {
    found.push({ method: match[1], subpath: match[2] });
  }
  return found;
}

function joinPrefixAndSubpath(prefix: string, subpath: string): string {
  if (subpath === '/' || subpath === '') return prefix;
  return `${prefix.replace(/\/$/, '')}${subpath.startsWith('/') ? subpath : `/${subpath}`}`;
}

/**
 * Resolve um arquivo de router de feature já identificado (caminho absoluto + nome da variável
 * local do `Router()` dentro dele) sob um prefixo de rota já composto, cruza cada
 * `<localVarName>.<method>('/subpath', ...)` literal contra `docs/openapi.yaml`, e então RECURSA
 * em qualquer `<localVarName>.use('/subprefixo', outroRouterImportado)` encontrado no mesmo
 * arquivo — resolvendo o import de `outroRouterImportado` relativo a ESTE arquivo (não ao
 * composition root) e compondo `prefix + subprefixo` como o novo prefixo do nível seguinte. Isso é
 * o que fecha o buraco do Passe 2 original: um endpoint só existia dentro de um sub-router
 * aninhado (`router.use()` dentro de um arquivo de feature, não dentro de `server.ts`/
 * `src/bootstrap/*.ts`) e nunca era lido.
 *
 * `visited` (chave `caminhoAbsoluto::nomeDaVariávelLocal`) evita recursão infinita em caso de
 * import circular entre dois routers — best-effort, sem falso positivo: se não resolver um nível
 * com confiança (import não estático, export não reconhecido, arquivo fora de `src/`), esse ramo é
 * simplesmente abandonado em vez de arriscar reportar drift errado.
 */
function resolveAndWalkRouter(
  repoRoot: string,
  absoluteFilePath: string,
  localVarName: string,
  prefix: string,
  openapiPaths: Record<string, unknown>,
  findings: SubRouteDriftFinding[],
  visited: Set<string>,
): boolean {
  const visitKey = `${absoluteFilePath}::${localVarName}`;
  if (visited.has(visitKey)) return false; // já resolvido por este caminho — evita ciclo/duplicata
  visited.add(visitKey);

  if (!existsSync(absoluteFilePath)) return false; // não resolveu o arquivo — pula, sem falso positivo

  let source: string;
  try {
    source = readFileSync(absoluteFilePath, 'utf-8');
  } catch {
    return false;
  }

  const methodPaths = extractRouterMethodPaths(source, localVarName);
  for (const { method, subpath } of methodPaths) {
    const sourcePath = joinPrefixAndSubpath(prefix, subpath);
    const docStylePath = toDocStylePath(sourcePath);
    const pathItem = openapiPaths[docStylePath] as Record<string, unknown> | undefined;
    if (!pathItem) {
      findings.push({ method, docStylePath, sourcePath, kind: 'undocumented-path' });
    } else if (!(method in pathItem)) {
      findings.push({ method, docStylePath, sourcePath, kind: 'undocumented-method' });
    }
  }

  // Passe 2 recursivo: segue `<localVarName>.use('/subprefixo', outroRouterImportado)` aninhado
  // dentro deste mesmo arquivo, resolvendo o import relativo a ESTE arquivo (não ao
  // bootstrapDir/composition root) antes de recursar com o prefixo composto.
  const importMap = buildImportMap(source);
  const nestedMounts = extractUseMounts(source, localVarName);
  for (const nested of nestedMounts) {
    const importPath = importMap.get(nested.routerVarName);
    if (!importPath) continue; // sub-router não importado por nome simples resolvível — pula

    const relativeToTs = importPath.endsWith('.js')
      ? importPath.slice(0, -3) + '.ts'
      : `${importPath}.ts`;
    const nestedAbsolutePath = path.normalize(
      path.join(path.dirname(absoluteFilePath), relativeToTs),
    );
    if (!nestedAbsolutePath.startsWith(path.join(repoRoot, 'src') + path.sep)) continue; // fora do repo, não segue

    if (!existsSync(nestedAbsolutePath)) continue;
    let nestedSource: string;
    try {
      nestedSource = readFileSync(nestedAbsolutePath, 'utf-8');
    } catch {
      continue;
    }

    const nestedLocalVarName = resolveRouterLocalVarName(nestedSource, nested.routerVarName);
    if (!nestedLocalVarName) continue; // export não reconhecido com confiança — pula, sem falso positivo

    const nestedPrefix = joinPrefixAndSubpath(prefix, nested.path);
    resolveAndWalkRouter(
      repoRoot,
      nestedAbsolutePath,
      nestedLocalVarName,
      nestedPrefix,
      openapiPaths,
      findings,
      visited,
    );
  }

  return true;
}

/**
 * Passe 2, ver comentário de topo do arquivo. Resolve, recursivamente, cada árvore de router de
 * feature a partir de um mount de topo, e cruza path+método exatos contra `docs/openapi.yaml` em
 * cada nível. Retorna também `resolvedFileCount` só para log informativo (quantos arquivos de
 * router — de qualquer nível de aninhamento — puderam ser lidos e verificados de fato).
 */
function computeSubRouteDrift(
  repoRoot: string,
  compositionRootSource: string,
  bootstrapDir: string,
  openapiPaths: Record<string, unknown>,
): { findings: SubRouteDriftFinding[]; resolvedFileCount: number } {
  const importMap = buildImportMap(compositionRootSource);
  const mounts = extractTopLevelRouterMounts(compositionRootSource);
  const findings: SubRouteDriftFinding[] = [];
  const visited = new Set<string>();
  let resolvedFileCount = 0;

  for (const mount of mounts) {
    const importPath = importMap.get(mount.routerVarName);
    if (!importPath) continue; // router não importado por nome simples resolvível — pula

    const relativeToTs = importPath.endsWith('.js')
      ? importPath.slice(0, -3) + '.ts'
      : `${importPath}.ts`;
    const absoluteFilePath = path.normalize(path.join(bootstrapDir, relativeToTs));
    if (!absoluteFilePath.startsWith(path.join(repoRoot, 'src') + path.sep)) continue; // fora do repo, não segue
    if (!existsSync(absoluteFilePath)) continue; // não resolveu o arquivo — pula, sem falso positivo

    let routerFileSource: string;
    try {
      routerFileSource = readFileSync(absoluteFilePath, 'utf-8');
    } catch {
      continue;
    }

    const localVarName = resolveRouterLocalVarName(routerFileSource, mount.routerVarName);
    if (!localVarName) continue; // export não reconhecido com confiança — pula, sem falso positivo

    const resolved = resolveAndWalkRouter(
      repoRoot,
      absoluteFilePath,
      localVarName,
      mount.prefix,
      openapiPaths,
      findings,
      visited,
    );
    if (resolved) resolvedFileCount += 1;
  }

  return { findings, resolvedFileCount };
}

function main(): void {
  const repoRoot = process.cwd();
  const openapiYamlPath = path.join(repoRoot, 'docs', 'openapi.yaml');
  const bootstrapDir = path.join(repoRoot, 'src', 'bootstrap');

  const compositionRootSource = collectCompositionRootSource(repoRoot);
  const openapiDocument = parseYaml(readFileSync(openapiYamlPath, 'utf-8'));
  const openapiPaths: Record<string, unknown> = openapiDocument.paths ?? {};

  const result = computeOpenApiDrift(compositionRootSource, openapiPaths);

  console.log(`Prefixos de rota montados no composition root: ${result.allMountedPrefixes.length}`);
  console.log(`Paths documentados em docs/openapi.yaml: ${result.allDocumentedPaths.length}`);
  console.log('');

  let hasDrift = false;

  if (result.undocumentedPrefixes.length > 0) {
    hasDrift = true;
    console.error('❌ Prefixos de rota montados SEM documentação em docs/openapi.yaml:');
    for (const prefix of result.undocumentedPrefixes) {
      console.error(`   - /api/${prefix}`);
    }
    console.error('');
  }

  if (result.phantomDocumentedPaths.length > 0) {
    hasDrift = true;
    console.error(
      '❌ Paths documentados em docs/openapi.yaml SEM rota real montada no composition root:',
    );
    for (const docPath of result.phantomDocumentedPaths) {
      console.error(`   - ${docPath}`);
    }
    console.error('');
  }

  const subRouteDrift = computeSubRouteDrift(
    repoRoot,
    compositionRootSource,
    bootstrapDir,
    openapiPaths,
  );
  console.log(
    `Passe 2 — arquivos de router de feature resolvidos e verificados: ${subRouteDrift.resolvedFileCount}`,
  );
  console.log('');

  const undocumentedPathFindings = subRouteDrift.findings.filter(
    (f) => f.kind === 'undocumented-path',
  );
  const undocumentedMethodFindings = subRouteDrift.findings.filter(
    (f) => f.kind === 'undocumented-method',
  );

  if (undocumentedPathFindings.length > 0) {
    hasDrift = true;
    console.error(
      '❌ Endpoints reais (path + método) montados dentro de um router de feature SEM path documentado em docs/openapi.yaml:',
    );
    for (const f of undocumentedPathFindings) {
      console.error(`   - ${f.method.toUpperCase()} ${f.docStylePath}  (código: ${f.sourcePath})`);
    }
    console.error('');
  }

  if (undocumentedMethodFindings.length > 0) {
    hasDrift = true;
    console.error(
      '❌ Path documentado em docs/openapi.yaml, mas SEM o método HTTP real montado no código:',
    );
    for (const f of undocumentedMethodFindings) {
      console.error(`   - ${f.method.toUpperCase()} ${f.docStylePath}  (código: ${f.sourcePath})`);
    }
    console.error('');
  }

  if (hasDrift) {
    console.error(
      'Deriva de OpenAPI detectada. Documente a(s) rota(s) nova(s) em docs/openapi.yaml, ou ' +
        'remova/ajuste o path documentado se a rota não existir mais. Ver ' +
        'src/shared/contracts/openapiRouteInventory.ts (Passe 1, prefixo de recurso) e o ' +
        'comentário de topo deste arquivo (Passe 2, path+método dentro do router de feature) ' +
        'para o critério exato de cada verificação.',
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    '✅ Nenhuma deriva estrutural encontrada entre docs/openapi.yaml e o composition root.',
  );
}

main();
