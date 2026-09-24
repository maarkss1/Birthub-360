import { ProviderConfig } from '../types/agent';
import { callAIModel } from './aiProviders';

export interface DecisionPoint {
  line: number;
  type: string;
  keyword: string;
  snippet: string;
  weight: number;
}

export interface FunctionComplexity {
  name: string;
  startLine: number;
  endLine: number;
  complexity: number;
  rating: 'low' | 'moderate' | 'high' | 'critical';
}

export interface CyclomaticMetrics {
  totalComplexity: number;
  rating: 'low' | 'moderate' | 'high' | 'critical';
  ratingLabel: string;
  decisionPointsCount: number;
  decisionPoints: DecisionPoint[];
  functionComplexities: FunctionComplexity[];
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  lineCount: number;
  codeLinesCount: number;
  commentLinesCount: number;
}

export interface RefactoringSuggestion {
  id: string;
  title: string;
  category: 'algorithmic' | 'memory' | 'async' | 'clean_code' | 'data_structures';
  impact: 'high' | 'medium' | 'low';
  impactLabel: string;
  timeComplexityBefore?: string;
  timeComplexityAfter?: string;
  explanation: string;
  originalSnippet: string;
  optimizedSnippet: string;
}

export interface PerformanceAnalysisResult {
  summary: string;
  bottlenecksFound: number;
  overallOptimizedCode?: string;
  suggestions: RefactoringSuggestion[];
  estimatedPerformanceGain: string;
  modelUsed: string;
}

/**
 * Calculates Cyclomatic Complexity deterministically using lexical analysis of decision branches.
 * Formula: M = D + 1, where D is the count of decision points (if, loops, cases, logical gates, etc.)
 */
export function calculateCyclomaticComplexity(code: string, _fileName?: string): CyclomaticMetrics {
  if (!code || !code.trim()) {
    return {
      totalComplexity: 1,
      rating: 'low',
      ratingLabel: 'Muito Baixa',
      decisionPointsCount: 0,
      decisionPoints: [],
      functionComplexities: [],
      cognitiveComplexity: 0,
      maintainabilityIndex: 100,
      lineCount: 0,
      codeLinesCount: 0,
      commentLinesCount: 0
    };
  }

  const lines = code.split('\n');
  const lineCount = lines.length;
  let codeLinesCount = 0;
  let commentLinesCount = 0;
  const decisionPoints: DecisionPoint[] = [];

  let inBlockComment = false;
  let cognitiveComplexity = 0;
  let currentNesting = 0;

  // Regex patterns for decision points
  const ifRegex = /\bif\s*\(/;
  const elseIfRegex = /\belse\s+if\s*\(/;
  const forRegex = /\bfor\s*\(/;
  const whileRegex = /\bwhile\s*\(/;
  const doWhileRegex = /\bdo\s*\{/;
  const caseRegex = /\bcase\s+[^:]+:/;
  const catchRegex = /\bcatch\s*(\(|$|\{)/;
  const ternaryRegex = /\?[^:?\n]+:/;
  const logicalAndRegex = /&&/g;
  const logicalOrRegex = /\|\|/g;
  const nullishRegex = /\?\?/g;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) continue;

    // Handle block comments
    if (inBlockComment) {
      commentLinesCount++;
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmed.startsWith('/*')) {
      commentLinesCount++;
      if (!trimmed.includes('*/')) {
        inBlockComment = true;
      }
      continue;
    }

    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      commentLinesCount++;
      continue;
    }

    codeLinesCount++;

    // Track nesting depth based on braces
    const openBraces = (rawLine.match(/\{/g) || []).length;
    const closeBraces = (rawLine.match(/\}/g) || []).length;

    // Calculate line snippet without inline comments
    const codeOnly = rawLine.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');

    // Check decision points
    if (elseIfRegex.test(codeOnly)) {
      decisionPoints.push({
        line: i + 1,
        type: 'Condicional (else if)',
        keyword: 'else if',
        snippet: trimmed.slice(0, 75),
        weight: 1
      });
      cognitiveComplexity += 1 + currentNesting;
    } else if (ifRegex.test(codeOnly)) {
      decisionPoints.push({
        line: i + 1,
        type: 'Condicional (if)',
        keyword: 'if',
        snippet: trimmed.slice(0, 75),
        weight: 1
      });
      cognitiveComplexity += 1 + currentNesting;
    }

    if (forRegex.test(codeOnly)) {
      decisionPoints.push({
        line: i + 1,
        type: 'Loop (for)',
        keyword: 'for',
        snippet: trimmed.slice(0, 75),
        weight: 1
      });
      cognitiveComplexity += 1 + currentNesting;
    } else if (whileRegex.test(codeOnly) && !/^\s*\}\s*while/.test(codeOnly)) {
      decisionPoints.push({
        line: i + 1,
        type: 'Loop (while)',
        keyword: 'while',
        snippet: trimmed.slice(0, 75),
        weight: 1
      });
      cognitiveComplexity += 1 + currentNesting;
    } else if (doWhileRegex.test(codeOnly)) {
      decisionPoints.push({
        line: i + 1,
        type: 'Loop (do-while)',
        keyword: 'do',
        snippet: trimmed.slice(0, 75),
        weight: 1
      });
      cognitiveComplexity += 1 + currentNesting;
    }

    if (caseRegex.test(codeOnly)) {
      decisionPoints.push({
        line: i + 1,
        type: 'Seleção (case)',
        keyword: 'case',
        snippet: trimmed.slice(0, 75),
        weight: 1
      });
      cognitiveComplexity += 1;
    }

    if (catchRegex.test(codeOnly)) {
      decisionPoints.push({
        line: i + 1,
        type: 'Tratamento de Exceção (catch)',
        keyword: 'catch',
        snippet: trimmed.slice(0, 75),
        weight: 1
      });
      cognitiveComplexity += 1 + currentNesting;
    }

    if (ternaryRegex.test(codeOnly)) {
      decisionPoints.push({
        line: i + 1,
        type: 'Operador Ternário (? :)',
        keyword: '?:',
        snippet: trimmed.slice(0, 75),
        weight: 1
      });
      cognitiveComplexity += 1 + currentNesting;
    }

    // Logical binary operators that branch evaluation
    const andMatches = codeOnly.match(logicalAndRegex);
    if (andMatches) {
      for (let m = 0; m < andMatches.length; m++) {
        decisionPoints.push({
          line: i + 1,
          type: 'Conjunção Lógica (&&)',
          keyword: '&&',
          snippet: trimmed.slice(0, 75),
          weight: 1
        });
        cognitiveComplexity += 1;
      }
    }

    const orMatches = codeOnly.match(logicalOrRegex);
    if (orMatches) {
      for (let m = 0; m < orMatches.length; m++) {
        decisionPoints.push({
          line: i + 1,
          type: 'Disjunção Lógica (||)',
          keyword: '||',
          snippet: trimmed.slice(0, 75),
          weight: 1
        });
        cognitiveComplexity += 1;
      }
    }

    const nullishMatches = codeOnly.match(nullishRegex);
    if (nullishMatches) {
      for (let m = 0; m < nullishMatches.length; m++) {
        decisionPoints.push({
          line: i + 1,
          type: 'Nullish Coalescing (??)',
          keyword: '??',
          snippet: trimmed.slice(0, 75),
          weight: 1
        });
        cognitiveComplexity += 1;
      }
    }

    currentNesting = Math.max(0, currentNesting + openBraces - closeBraces);
  }

  // Base complexity is 1 + decision points count
  const totalComplexity = decisionPoints.length + 1;

  // Rating classification (industry standard McCabe metric)
  let rating: CyclomaticMetrics['rating'] = 'low';
  let ratingLabel = 'Baixa Complexidade (Código Simples)';

  if (totalComplexity >= 21) {
    rating = 'critical';
    ratingLabel = 'Complexidade Crítica (Refatoração Urgente)';
  } else if (totalComplexity >= 11) {
    rating = 'high';
    ratingLabel = 'Alta Complexidade (Risco de Defeitos)';
  } else if (totalComplexity >= 6) {
    rating = 'moderate';
    ratingLabel = 'Complexidade Moderada (Bom)';
  }

  // Calculate Maintainability Index (Coleman / Oman formula approximation)
  // MI = 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code)
  const loc = Math.max(codeLinesCount, 1);
  const approxHalsteadVolume = loc * 4.5;
  const rawMI = 171 - 5.2 * Math.log(approxHalsteadVolume) - 0.23 * totalComplexity - 16.2 * Math.log(loc);
  const maintainabilityIndex = Math.min(100, Math.max(0, Math.round((rawMI / 171) * 100)));

  // Identify function scopes and their internal complexities
  const functionComplexities = extractFunctionComplexities(lines);

  return {
    totalComplexity,
    rating,
    ratingLabel,
    decisionPointsCount: decisionPoints.length,
    decisionPoints,
    functionComplexities,
    cognitiveComplexity,
    maintainabilityIndex,
    lineCount,
    codeLinesCount,
    commentLinesCount
  };
}

/**
 * Extracts functions and measures their individual cyclomatic complexity
 */
function extractFunctionComplexities(lines: string[]): FunctionComplexity[] {
  const list: FunctionComplexity[] = [];
  const funcPattern = /(?:async\s+)?(?:function\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(funcPattern);
    if (match) {
      const name = match[1] || match[2] || match[3] || 'função anônima';
      if (['if', 'for', 'while', 'switch', 'catch'].includes(name)) continue;

      let braceCount = 0;
      let startLine = i + 1;
      let endLine = lines.length;
      let started = false;
      let subDecisions = 0;

      for (let j = i; j < lines.length; j++) {
        const subLine = lines[j];
        if (subLine.includes('{')) {
          braceCount += (subLine.match(/\{/g) || []).length;
          started = true;
        }
        if (subLine.includes('}')) {
          braceCount -= (subLine.match(/\}/g) || []).length;
        }

        if (started) {
          if (/\b(if|for|while|case|catch)\b|\?|&&|\|\||\?\?/.test(subLine)) {
            subDecisions++;
          }
          if (braceCount <= 0) {
            endLine = j + 1;
            break;
          }
        }
      }

      const comp = subDecisions + 1;
      let r: FunctionComplexity['rating'] = 'low';
      if (comp >= 15) r = 'critical';
      else if (comp >= 10) r = 'high';
      else if (comp >= 5) r = 'moderate';

      list.push({
        name,
        startLine,
        endLine,
        complexity: comp,
        rating: r
      });

      if (list.length >= 8) break; // Limit to 8 functions
    }
  }

  return list;
}

/**
 * Uses the selected AI model to analyze performance bottlenecks and suggest refactorings
 */
export async function analyzePerformanceAndRefactor(
  config: ProviderConfig,
  code: string,
  filePath: string,
  metrics: CyclomaticMetrics
): Promise<PerformanceAnalysisResult> {
  const modelName = config.model || 'modelo configurado';

  const systemPrompt = `Você é um Engenheiro de Software Sênior especialista em Análise Estática de Código, Otimização de Performance e Refatoração de Alta Eficiência.
Sua missão é analisar o código fornecido, considerar sua complexidade ciclomática (${metrics.totalComplexity}) e identificar gargalos reais de performance (algoritmos ineficientes O(N^2), alocações desnecessárias de memória, loops redundantes, falta de memoização, operações síncronas bloqueantes, etc.).

Você DEVE responder ESTRITAMENTE em formato JSON VÁLIDO com a estrutura exata:
{
  "summary": "Resumo executivo em português da análise de performance e complexidade",
  "bottlenecksFound": 2,
  "estimatedPerformanceGain": "ex: ~40% a 70% menos tempo de execução em grandes entradas",
  "suggestions": [
    {
      "id": "sug-1",
      "title": "Título conciso da otimização (ex: Substituir busca quadrática O(N²) por Set O(1))",
      "category": "algorithmic", // escolha entre: "algorithmic", "memory", "async", "clean_code", "data_structures"
      "impact": "high", // escolha entre: "high", "medium", "low"
      "impactLabel": "Alto Impacto (Algoritmo O(N²) para O(N))",
      "timeComplexityBefore": "O(N²)",
      "timeComplexityAfter": "O(N)",
      "explanation": "Explicação detalhada em português do motivo da lentidão e como a solução otimiza a execução.",
      "originalSnippet": "// trecho do código original antes da refatoração",
      "optimizedSnippet": "// trecho refatorado otimizado com comentários explicativos"
    }
  ],
  "overallOptimizedCode": "// Versão completa e limpa do código analisado com TODAS as refatorações e otimizações aplicadas, pronta para substituir o arquivo ou trecho"
}

Não inclua markdown fora do JSON. Retorne apenas o JSON.`;

  const userPrompt = `Analise o seguinte código do arquivo "${filePath}".
Métricas estáticas calculadas:
- Complexidade Ciclomática: ${metrics.totalComplexity} (${metrics.ratingLabel})
- Pontos de decisão: ${metrics.decisionPointsCount}
- Índice de Manutenibilidade: ${metrics.maintainabilityIndex}/100
- Linhas: ${metrics.codeLinesCount}

Código para análise e refatoração:
\`\`\`
${code}
\`\`\`

Identifique os gargalos de performance e gere as sugestões de refatoração completas e funcionais.`;

  const response = await callAIModel(
    config,
    [{ role: 'user', content: userPrompt }],
    systemPrompt
  );

  let raw = response.content.trim();
  // Strip code block fences if any
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*/i, '');
    const last = raw.lastIndexOf('```');
    if (last !== -1) {
      raw = raw.slice(0, last).trim();
    }
  }

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1));
      return {
        summary: parsed.summary || 'Análise de performance concluída com sucesso.',
        bottlenecksFound: parsed.bottlenecksFound ?? (parsed.suggestions?.length || 0),
        estimatedPerformanceGain: parsed.estimatedPerformanceGain || 'Ganho considerável de eficiência.',
        overallOptimizedCode: parsed.overallOptimizedCode,
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.map((s: any, idx: number) => ({
              id: s.id || `sug-${idx + 1}`,
              title: s.title || `Otimização #${idx + 1}`,
              category: s.category || 'algorithmic',
              impact: s.impact || 'medium',
              impactLabel: s.impactLabel || (s.impact === 'high' ? 'Alto Impacto' : 'Médio Impacto'),
              timeComplexityBefore: s.timeComplexityBefore,
              timeComplexityAfter: s.timeComplexityAfter,
              explanation: s.explanation || '',
              originalSnippet: s.originalSnippet || '',
              optimizedSnippet: s.optimizedSnippet || ''
            }))
          : [],
        modelUsed: modelName
      };
    } catch {
      // Fallback below
    }
  }

  // Fallback if model returned unstructured text
  return {
    summary: 'A IA concluiu a análise do código. Veja a refatoração sugerida abaixo.',
    bottlenecksFound: 1,
    estimatedPerformanceGain: 'Melhoria na legibilidade e performance.',
    overallOptimizedCode: raw,
    suggestions: [
      {
        id: 'sug-fallback',
        title: 'Refatoração recomendada pelo modelo',
        category: 'clean_code',
        impact: 'medium',
        impactLabel: 'Médio Impacto',
        explanation: 'Sugestões consolidadas de otimização de fluxo e redução de complexidade.',
        originalSnippet: code.slice(0, 180) + '...',
        optimizedSnippet: raw.slice(0, 300) + '...'
      }
    ],
    modelUsed: modelName
  };
}
