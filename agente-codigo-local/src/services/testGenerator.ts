import { ProviderConfig } from '../types/agent';
import { callAIModel } from './aiProviders';

export type TestFramework = 'vitest' | 'jest' | 'node:test' | 'mocha' | 'pytest';
export type TestScope = 'full' | 'edge_cases' | 'smoke';

export interface UnitTestOptions {
  framework: TestFramework;
  scope: TestScope;
  targetPath?: string;
  includeMocks: boolean;
  customInstructions?: string;
}

export interface UnitTestResult {
  testFilePath: string;
  framework: TestFramework;
  testCode: string;
  testCases: string[];
  mockDependencies: string[];
  summary: string;
  modelUsed: string;
}

/**
 * Predicts the standard unit test file path for a given source file path.
 */
export function getDefaultTestFilePath(filePath: string, framework: TestFramework = 'vitest'): string {
  if (!filePath) return 'tests/app.test.js';

  const clean = filePath.replace(/\\/g, '/');
  const lastSlash = clean.lastIndexOf('/');
  const dir = lastSlash === -1 ? '' : clean.slice(0, lastSlash);
  const file = lastSlash === -1 ? clean : clean.slice(lastSlash + 1);

  const dotIdx = file.lastIndexOf('.');
  if (dotIdx === -1) {
    return dir ? `${dir}/${file}.test.js` : `${file}.test.js`;
  }

  const baseName = file.slice(0, dotIdx);
  const ext = file.slice(dotIdx + 1).toLowerCase();

  if (ext === 'py') {
    return dir ? `${dir}/test_${baseName}.py` : `test_${baseName}.py`;
  }

  // Already a test file
  if (baseName.endsWith('.test') || baseName.endsWith('.spec')) {
    return filePath;
  }

  // Preserve tsx/jsx/ts/js
  let testExt = ext;
  if (ext === 'tsx') testExt = 'test.tsx';
  else if (ext === 'ts') testExt = 'test.ts';
  else if (ext === 'jsx') testExt = 'test.jsx';
  else if (ext === 'js' || ext === 'mjs' || ext === 'cjs') testExt = 'test.js';
  else testExt = 'test.js';

  return dir ? `${dir}/${baseName}.${testExt}` : `${baseName}.${testExt}`;
}

/**
 * Generates comprehensive unit tests for a source file using the selected AI model.
 */
export async function generateUnitTests(
  config: ProviderConfig,
  sourceCode: string,
  filePath: string,
  options: UnitTestOptions
): Promise<UnitTestResult> {
  const modelName = config.model || 'modelo selecionado';
  const targetPath = options.targetPath || getDefaultTestFilePath(filePath, options.framework);

  const frameworkDescriptions: Record<TestFramework, string> = {
    vitest: 'Vitest (import { describe, it, expect, vi, beforeEach } from "vitest")',
    jest: 'Jest (describe, test/it, expect, jest.fn(), jest.mock())',
    'node:test': 'Node.js Test Runner nativo (import test, { describe, it } from "node:test"; import assert from "node:assert/strict")',
    mocha: 'Mocha & Chai (describe, it, expect from "chai")',
    pytest: 'Pytest para Python (import pytest, def test_...)'
  };

  const scopeDescriptions: Record<TestScope, string> = {
    full: 'Bateria Completa: Caminho feliz (happy path), casos de borda (edge cases), valores nulos/indefinidos, tratamento de exceções/erros e mocks de I/O ou APIs externas.',
    edge_cases: 'Casos de Borda e Erros: Entradas extremas, tipos inválidos, timeouts, falhas de rede simuladas, exceções esperadas e condições limites.',
    smoke: 'Smoke Tests e Caminho Feliz: Testes essenciais de sanidade, instanciação de classes, rotas principais e verificação de contratos básicos.'
  };

  const systemPrompt = `Você é um Engenheiro de QA & Testes Automatizados Sênior.
Sua missão é criar arquivos de teste unitário completos, robustos e diretamente executáveis para o código fornecido.

FRAMEWORK SOLICITADO:
${frameworkDescriptions[options.framework]}

ESCOPO DOS TESTES:
${scopeDescriptions[options.scope]}

MOCKS:
${options.includeMocks ? 'Simule módulos externos (banco, I/O, rede, timers) adequadamente para isolar as unidades testadas.' : 'Evite mocks excessivos, privilegie testes diretos sempre que possível.'}

DIRETRIZES CRÍTICAS:
1. O código de teste DEVE ser completo, sintaticamente válido e sem placeholders ("// faça o resto aqui").
2. Importe corretamente o arquivo original relativo ao caminho de teste (ex: de "${targetPath}" para "${filePath}").
3. Escreva asserções descritivas em português ou inglês claro.
4. Cubra casos de sucesso e tratamento de erros.

Você DEVE responder ESTRITAMENTE em formato JSON VÁLIDO com a seguinte estrutura:
{
  "testFilePath": "${targetPath}",
  "framework": "${options.framework}",
  "summary": "Resumo em português dos testes criados (quantidade de casos, cenários cobertos e mocks)",
  "testCases": [
    "Deve retornar status 200 na rota /health",
    "Deve lançar erro ao receber parâmetro inválido",
    "Deve tratar corretamente timeout do servidor"
  ],
  "mockDependencies": [
    "express",
    "node:fs"
  ],
  "testCode": "// CÓDIGO COMPLETO DO ARQUIVO DE TESTES PRONTO PARA SALVAR NO DISCO"
}

Não insira markdown antes ou depois do JSON. Retorne apenas o JSON puro.`;

  let userContent = `Crie o arquivo de testes unitários para o seguinte arquivo:
Caminho do arquivo: "${filePath}"
Caminho de saída recomendado: "${targetPath}"
Framework: ${options.framework}
Escopo: ${options.scope}

Conteúdo do arquivo original:
\`\`\`
${sourceCode}
\`\`\``;

  if (options.customInstructions && options.customInstructions.trim()) {
    userContent += `\n\nINSTRUÇÕES ADICIONAIS DO USUÁRIO:\n${options.customInstructions.trim()}`;
  }

  const response = await callAIModel(
    config,
    [{ role: 'user', content: userContent }],
    systemPrompt
  );

  let raw = response.content.trim();
  // Strip code fences if returned
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
      if (parsed.testCode) {
        return {
          testFilePath: parsed.testFilePath || targetPath,
          framework: (parsed.framework as TestFramework) || options.framework,
          testCode: parsed.testCode,
          testCases: Array.isArray(parsed.testCases) ? parsed.testCases : ['Testes gerados pela IA'],
          mockDependencies: Array.isArray(parsed.mockDependencies) ? parsed.mockDependencies : [],
          summary: parsed.summary || 'Arquivo de testes gerado com sucesso.',
          modelUsed: modelName
        };
      }
    } catch {
      // Fallback
    }
  }

  // Fallback: if model returned code directly
  let fallbackCode = raw;
  if (fallbackCode.startsWith('```')) {
    fallbackCode = fallbackCode.replace(/^```[a-z]*\s*/i, '');
    const last = fallbackCode.lastIndexOf('```');
    if (last !== -1) {
      fallbackCode = fallbackCode.slice(0, last).trim();
    }
  }

  return {
    testFilePath: targetPath,
    framework: options.framework,
    testCode: fallbackCode,
    testCases: ['Testes unitários automatizados'],
    mockDependencies: [],
    summary: 'Testes gerados com o modelo selecionado.',
    modelUsed: modelName
  };
}
