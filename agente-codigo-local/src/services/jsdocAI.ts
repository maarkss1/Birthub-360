/**
 * Serviço de Análise e Geração de Documentação JSDoc com Inteligência Artificial
 * Suporta análise estática local e geração avançada via Gemini API.
 */

export interface ExportedItemInfo {
  name: string;
  kind: 'function' | 'async_function' | 'arrow_function' | 'class' | 'method' | 'const' | 'interface';
  lineNumber: number;
  hasExistingJsDoc: boolean;
  action: 'created' | 'updated';
  description?: string;
  params?: Array<{ name: string; type?: string; description?: string }>;
  returns?: { type?: string; description?: string };
}

export interface JSDocGenerationResult {
  documentedCode: string;
  items: ExportedItemInfo[];
  stats: {
    totalExported: number;
    functionsDocumented: number;
    classesDocumented: number;
    createdCount: number;
    updatedCount: number;
  };
  summary: string;
}

export interface JSDocOptions {
  language?: 'pt' | 'en';
  includeExamples?: boolean;
  includeTypes?: boolean;
}

/**
 * Analisa localmente o código para identificar funções, classes e métodos exportados
 */
export function detectExportedItems(code: string): ExportedItemInfo[] {
  const lines = code.split('\n');
  const items: ExportedItemInfo[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLines = lines.slice(Math.max(0, i - 10), i).join('\n');
    const hasExistingJsDoc = /\/\*\*[\s\S]*?\*\/\s*$/.test(prevLines);

    // 1. export async function name(...)
    const asyncFnMatch = line.match(/^export\s+async\s+function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/);
    if (asyncFnMatch) {
      items.push({
        name: asyncFnMatch[1],
        kind: 'async_function',
        lineNumber: i + 1,
        hasExistingJsDoc,
        action: hasExistingJsDoc ? 'updated' : 'created',
        description: `Executa a operação assíncrona ${asyncFnMatch[1]}.`,
      });
      continue;
    }

    // 2. export function name(...) or export default function name(...)
    const fnMatch = line.match(/^export\s+(?:default\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      items.push({
        name: fnMatch[1],
        kind: 'function',
        lineNumber: i + 1,
        hasExistingJsDoc,
        action: hasExistingJsDoc ? 'updated' : 'created',
        description: `Função ${fnMatch[1]} para processamento de dados.`,
      });
      continue;
    }

    // 3. export const name = (...) => or export const name = async (...) =>
    const arrowMatch = line.match(/^export\s+const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/);
    if (arrowMatch) {
      items.push({
        name: arrowMatch[1],
        kind: 'arrow_function',
        lineNumber: i + 1,
        hasExistingJsDoc,
        action: hasExistingJsDoc ? 'updated' : 'created',
        description: `Função flecha ${arrowMatch[1]}.`,
      });
      continue;
    }

    // 4. export class ClassName or export default class ClassName
    const classMatch = line.match(/^export\s+(?:default\s+)?class\s+([a-zA-Z0-9_$]+)/);
    if (classMatch) {
      items.push({
        name: classMatch[1],
        kind: 'class',
        lineNumber: i + 1,
        hasExistingJsDoc,
        action: hasExistingJsDoc ? 'updated' : 'created',
        description: `Classe ${classMatch[1]} para modelagem e encapsulamento de estado.`,
      });
      continue;
    }
  }

  return items;
}

/**
 * Gera documentação JSDoc local heurística caso o modelo de IA esteja indisponível
 */
export function generateLocalJSDocFallback(
  code: string,
  filePath: string,
  options: JSDocOptions = {}
): JSDocGenerationResult {
  const isPt = options.language !== 'en';
  const lines = code.split('\n');
  const items = detectExportedItems(code);
  const newLines: string[] = [];

  let createdCount = 0;
  let updatedCount = 0;
  let functionsCount = 0;
  let classesCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Verifica se esta linha contém um dos itens exportados
    const matchingItem = items.find((it) => it.lineNumber === i + 1);

    if (matchingItem) {
      if (matchingItem.kind === 'class') {
        classesCount++;
      } else {
        functionsCount++;
      }

      // Se havia JSDoc anterior imediatamente acima, removemos os comentários antigos para substituir pelo atualizado
      if (matchingItem.hasExistingJsDoc) {
        updatedCount++;
        // Remove linhas anteriores que compunham o JSDoc
        while (newLines.length > 0 && /^\s*(\/\*\*|\*|\*\/)/.test(newLines[newLines.length - 1])) {
          newLines.pop();
        }
      } else {
        createdCount++;
      }

      // Monta o bloco JSDoc profissional
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const jsDocLines: string[] = [];
      jsDocLines.push(`${indent}/**`);

      if (matchingItem.kind === 'class') {
        jsDocLines.push(
          `${indent} * ${isPt ? `Classe ${matchingItem.name}` : `Class ${matchingItem.name}`}`
        );
        jsDocLines.push(
          `${indent} * @description ${isPt ? `Gerencia estado, operações e lógica de ${matchingItem.name}.` : `Manages state and logic for ${matchingItem.name}.`}`
        );
      } else {
        jsDocLines.push(
          `${indent} * ${isPt ? `Executa a lógica de ${matchingItem.name}` : `Executes logic for ${matchingItem.name}`}`
        );
        jsDocLines.push(
          `${indent} * @description ${isPt ? `Processa parâmetros de entrada e retorna o resultado esperado de ${matchingItem.name}.` : `Processes input parameters and produces the result of ${matchingItem.name}.`}`
        );

        // Extrai parâmetros da declaração se possível
        const paramMatch = line.match(/\(([^)]*)\)/);
        if (paramMatch && paramMatch[1].trim()) {
          const rawParams = paramMatch[1].split(',');
          for (const raw of rawParams) {
            const cleanParam = raw.trim().split(/[:=]/)[0].trim();
            if (cleanParam && cleanParam !== '...') {
              const typeHint = raw.includes(':') ? raw.split(':')[1].split('=')[0].trim() : 'any';
              jsDocLines.push(
                `${indent} * @param {${typeHint}} ${cleanParam} - ${isPt ? `Parâmetro de entrada ${cleanParam}` : `Input parameter ${cleanParam}`}`
              );
            }
          }
        }

        if (matchingItem.kind === 'async_function') {
          jsDocLines.push(
            `${indent} * @returns {Promise<any>} ${isPt ? 'Promessa resolvida com o resultado da operação' : 'Promise resolved with the operation result'}`
          );
        } else {
          jsDocLines.push(
            `${indent} * @returns {any} ${isPt ? 'Resultado processado da função' : 'Processed result of the function'}`
          );
        }

        if (options.includeExamples) {
          jsDocLines.push(`${indent} * @example`);
          jsDocLines.push(`${indent} * const result = ${matchingItem.name}();`);
        }
      }

      jsDocLines.push(`${indent} */`);
      newLines.push(...jsDocLines);
    }

    newLines.push(line);
  }

  const documentedCode = newLines.join('\n');
  const summary = isPt
    ? `Documentou ${items.length} entidades exportadas (${functionsCount} funções e ${classesCount} classes) no arquivo ${filePath}.`
    : `Documented ${items.length} exported entities (${functionsCount} functions and ${classesCount} classes) in ${filePath}.`;

  return {
    documentedCode,
    items,
    stats: {
      totalExported: items.length,
      functionsDocumented: functionsCount,
      classesDocumented: classesCount,
      createdCount,
      updatedCount,
    },
    summary,
  };
}

/**
 * Gera ou atualiza JSDoc com Inteligência Artificial através do endpoint Gemini
 */
export async function generateJSDocWithAI(params: {
  code: string;
  filePath: string;
  language?: 'pt' | 'en';
  options?: JSDocOptions;
  customKey?: string;
}): Promise<JSDocGenerationResult> {
  const { code, filePath, language = 'pt', options = {}, customKey } = params;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (customKey) {
      headers['x-gemini-key'] = customKey;
    }

    const response = await fetch('/api/ai/generate-jsdoc', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code,
        filePath,
        language,
        options,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.documentedCode) {
      throw new Error('Resposta de JSDoc vazia ou inválida da IA.');
    }

    return {
      documentedCode: data.documentedCode,
      items: data.items || detectExportedItems(data.documentedCode),
      stats: data.stats || {
        totalExported: (data.items || []).length,
        functionsDocumented: (data.items || []).filter((i: any) => i.kind !== 'class').length,
        classesDocumented: (data.items || []).filter((i: any) => i.kind === 'class').length,
        createdCount: (data.items || []).filter((i: any) => i.action === 'created').length,
        updatedCount: (data.items || []).filter((i: any) => i.action === 'updated').length,
      },
      summary:
        data.summary ||
        `Documentação JSDoc gerada com sucesso pela IA para ${filePath}.`,
    };
  } catch (error) {
    console.warn('Fallback para geração JSDoc local heurística:', error);
    return generateLocalJSDocFallback(code, filePath, { language, ...options });
  }
}
