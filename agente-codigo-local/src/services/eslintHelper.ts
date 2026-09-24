import { ESLintConfig } from '../types/agent';

export const DEFAULT_ESLINT_CONFIG: ESLintConfig = {
  enabled: true,
  semi: 'always',
  quotes: 'single',
  indent: 2,
  trailingComma: 'always-multiline',
  noExplicitAny: 'error',
  noUnusedVars: 'error',
  preferConst: true,
  noConsole: 'warn',
  reactHooks: true,
  arrowParens: 'always',
  maxLen: 100,
  customRulesJson: ''
};

/**
 * Builds standard .eslintrc.json object based on visual settings
 */
export function generateEslintRcObject(config: ESLintConfig): Record<string, any> {
  const rules: Record<string, any> = {
    // Semicolons
    semi: [config.semi === 'always' ? 'error' : 'error', config.semi],
    
    // Quotes
    quotes: ['error', config.quotes, { avoidEscape: true, allowTemplateLiterals: true }],
    
    // Indentation
    indent: ['error', config.indent === 'tab' ? 'tab' : config.indent, { SwitchCase: 1 }],
    
    // Trailing commas
    'comma-dangle': [
      'error',
      config.trailingComma === 'always-multiline'
        ? 'always-multiline'
        : config.trailingComma === 'all'
        ? 'always'
        : 'never'
    ],

    // Prefer const
    'prefer-const': config.preferConst ? 'error' : 'off',

    // Arrow parens
    'arrow-parens': ['error', config.arrowParens],

    // Console logs
    'no-console': config.noConsole === 'off' ? 'off' : config.noConsole,

    // Unused variables
    'no-unused-vars': [
      config.noUnusedVars,
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ],

    // TypeScript explicit any
    '@typescript-eslint/no-explicit-any': config.noExplicitAny,
    '@typescript-eslint/explicit-module-boundary-types': 'off'
  };

  // Max line length
  if (config.maxLen && config.maxLen > 0) {
    rules['max-len'] = ['warn', { code: config.maxLen, ignoreUrls: true, ignoreStrings: true }];
  }

  // React hooks
  if (config.reactHooks) {
    rules['react-hooks/rules-of-hooks'] = 'error';
    rules['react-hooks/exhaustive-deps'] = 'warn';
  }

  // Parse and merge custom rules if provided
  if (config.customRulesJson && config.customRulesJson.trim()) {
    try {
      const custom = JSON.parse(config.customRulesJson.trim());
      if (typeof custom === 'object' && custom !== null) {
        Object.assign(rules, custom);
      }
    } catch {
      // ignore invalid json in custom rules
    }
  }

  return {
    env: {
      browser: true,
      es2022: true,
      node: true
    },
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      ...(config.reactHooks ? ['plugin:react-hooks/recommended'] : [])
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    plugins: [
      '@typescript-eslint',
      ...(config.reactHooks ? ['react-hooks'] : [])
    ],
    rules
  };
}

/**
 * Generates formatted prompt directives for the AI Agent system prompt.
 * This instructs the LLM with surgical precision to follow the configured ESLint rules.
 */
export function formatESLintDirectives(config: ESLintConfig): string {
  if (!config.enabled) {
    return '';
  }

  const lines: string[] = [
    '=== REGRAS OBRIGATÓRIAS DE LINTING / ESLINT PARA O CÓDIGO ===',
    'O projeto possui padronização estrita de código com ESLint. Todo código novo ou editado DEVE seguir rigorosamente:'
  ];

  // Semicolons
  if (config.semi === 'always') {
    lines.push('- Ponto e vírgula (semi): OBRIGATÓRIO no final de cada declaração (ex: const a = 1;).');
  } else {
    lines.push('- Ponto e vírgula (semi): NÃO utilizar ponto e vírgula no final das declarações (estilo StandardJS).');
  }

  // Quotes
  if (config.quotes === 'single') {
    lines.push('- Aspas (quotes): Use SEMPRE aspas simples \'exemplo\' para strings (exceto interpolação em template strings ou JSX).');
  } else {
    lines.push('- Aspas (quotes): Use SEMPRE aspas duplas "exemplo" para strings.');
  }

  // Indent
  if (config.indent === 'tab') {
    lines.push('- Indentação (indent): Use Tabulações (Tabs).');
  } else {
    lines.push(`- Indentação (indent): Use rigorosamente ${config.indent} espaços por nível de indentação.`);
  }

  // Trailing comma
  if (config.trailingComma === 'always-multiline') {
    lines.push('- Vírgula final (comma-dangle): Obrigatória em objetos e arrays com múltiplas linhas.');
  } else if (config.trailingComma === 'all') {
    lines.push('- Vírgula final (comma-dangle): Sempre incluir vírgula final.');
  } else {
    lines.push('- Vírgula final (comma-dangle): Nunca incluir vírgula final.');
  }

  // Prefer const
  if (config.preferConst) {
    lines.push('- Declarações de variáveis (prefer-const): Use SEMPRE `const` para variáveis que não forem reatribuídas. Nunca use `var`.');
  }

  // Arrow parens
  if (config.arrowParens === 'always') {
    lines.push('- Arrow functions (arrow-parens): Sempre inclua parênteses nos parâmetros: `(item) => ...`.');
  } else {
    lines.push('- Arrow functions (arrow-parens): Evite parênteses em parâmetros únicos: `item => ...`.');
  }

  // TypeScript Any
  if (config.noExplicitAny === 'error') {
    lines.push('- Tipagem TypeScript (@typescript-eslint/no-explicit-any): PROIBIDO usar o tipo `any`. Defina tipos, interfaces ou use `unknown` com narrowing.');
  } else if (config.noExplicitAny === 'warn') {
    lines.push('- Tipagem TypeScript (@typescript-eslint/no-explicit-any): Evite o uso de `any`; dê preferência máxima a tipos explícitos.');
  }

  // Unused vars
  if (config.noUnusedVars === 'error' || config.noUnusedVars === 'warn') {
    lines.push('- Variáveis e Imports Não Utilizados (no-unused-vars): NUNCA deixe imports, variáveis ou parâmetros não utilizados no código.');
  }

  // Console
  if (config.noConsole === 'error') {
    lines.push('- Console (no-console): PROIBIDO usar `console.log` em código de produção ou rotas.');
  } else if (config.noConsole === 'warn') {
    lines.push('- Console (no-console): Evite `console.log` desnecessário; use logging estruturado se aplicável.');
  }

  // React hooks
  if (config.reactHooks) {
    lines.push('- React Hooks (react-hooks): Siga estritamente as regras de hooks; nunca declare hooks em condicionais e liste TODAS as dependências em useEffect, useMemo e useCallback.');
  }

  // Max line len
  if (config.maxLen && config.maxLen > 0) {
    lines.push(`- Comprimento de linha (max-len): Limite as linhas a ~${config.maxLen} caracteres para manter o código legível.`);
  }

  // Custom rules JSON notice
  if (config.customRulesJson && config.customRulesJson.trim()) {
    lines.push(`- Regras adicionais customizadas pelo usuário: ${config.customRulesJson.trim()}`);
  }

  lines.push('Certifique-se de que o código compile sem nenhum erro ou aviso de linter.');

  return lines.join('\n');
}

export interface LintDiagnostic {
  id: string;
  line: number;
  column: number;
  message: string;
  ruleId: string;
  severity: 'error' | 'warn';
  fixable?: boolean;
}

const JS_TS_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];

/**
 * Checks if a file path corresponds to a JS/TS source file
 */
export function isLintableFile(filePath?: string | null): boolean {
  if (!filePath) return false;
  const lower = filePath.toLowerCase();
  return JS_TS_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * High-performance client-side linter that evaluates code against configured ESLint rules
 */
export function lintCode(
  filePath: string,
  code: string,
  config: ESLintConfig = DEFAULT_ESLINT_CONFIG
): LintDiagnostic[] {
  if (!config.enabled || !isLintableFile(filePath) || !code) {
    return [];
  }

  const diagnostics: LintDiagnostic[] = [];
  const lines = code.split('\n');

  // Track imports and identifiers for no-unused-vars
  const importedVars: Array<{ name: string; line: number; col: number }> = [];
  const importRegex = /import\s+(?:\{([^}]+)\}|([a-zA-Z0-9_$]+))\s+from/g;
  let match: RegExpExecArray | null;

  if (config.noUnusedVars !== 'off') {
    while ((match = importRegex.exec(code)) !== null) {
      const lineNum = code.slice(0, match.index).split('\n').length;
      if (match[1]) {
        // Named imports { a, b as c }
        const parts = match[1].split(',');
        parts.forEach((p) => {
          const trimmed = p.trim();
          if (!trimmed) return;
          const varName = trimmed.includes(' as ') ? trimmed.split(' as ')[1].trim() : trimmed;
          if (varName && !varName.startsWith('_')) {
            importedVars.push({ name: varName, line: lineNum, col: 1 });
          }
        });
      } else if (match[2]) {
        // Default import
        const varName = match[2].trim();
        if (varName && !varName.startsWith('_')) {
          importedVars.push({ name: varName, line: lineNum, col: 1 });
        }
      }
    }
  }

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const line = rawLine.trim();

    // Skip empty lines or full-line comments
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
      return;
    }

    // 1. max-len check
    if (config.maxLen > 0 && rawLine.length > config.maxLen) {
      // Don't flag if it's just a long URL or import statement
      if (!line.includes('http://') && !line.includes('https://') && !line.startsWith('import ')) {
        diagnostics.push({
          id: `max-len-${lineNum}`,
          line: lineNum,
          column: config.maxLen + 1,
          ruleId: 'max-len',
          severity: 'warn',
          message: `Linha excede o comprimento máximo configurado de ${config.maxLen} caracteres (atual: ${rawLine.length}).`,
          fixable: false
        });
      }
    }

    // 2. TypeScript Any check
    if (config.noExplicitAny !== 'off' && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
      const anyMatch = /(?::\s*any\b|<\s*any\s*>|\bas\s+any\b)/.exec(line);
      if (anyMatch) {
        diagnostics.push({
          id: `no-any-${lineNum}`,
          line: lineNum,
          column: anyMatch.index + 1,
          ruleId: '@typescript-eslint/no-explicit-any',
          severity: config.noExplicitAny === 'warn' ? 'warn' : 'error',
          message: 'Uso explícito de "any" detectado. Prefira tipos estritos, interfaces ou "unknown".',
          fixable: true
        });
      }
    }

    // 3. no-console check
    if (config.noConsole !== 'off') {
      const consoleMatch = /\bconsole\.(log|info|debug|trace)\s*\(/.exec(line);
      if (consoleMatch) {
        diagnostics.push({
          id: `no-console-${lineNum}`,
          line: lineNum,
          column: consoleMatch.index + 1,
          ruleId: 'no-console',
          severity: config.noConsole === 'error' ? 'error' : 'warn',
          message: `Chamada inesperada de console.${consoleMatch[1]}(). Evite logs em código final.`,
          fixable: true
        });
      }
    }

    // 4. Semicolons check
    const isStatementStart =
      /^(const|let|var|import|export|return|throw|break|continue|yield)\b/.test(line) ||
      /\w+\s*\([^)]*\)$/.test(line) ||
      /\w+\s*=\s*[^=].+$/.test(line);

    const isBlockOrControl =
      line.endsWith('{') ||
      line.endsWith('}') ||
      line.endsWith('(') ||
      line.endsWith('[') ||
      line.endsWith(',') ||
      line.endsWith(':') ||
      line.endsWith('\\') ||
      line.startsWith('if ') ||
      line.startsWith('for ') ||
      line.startsWith('while ') ||
      line.startsWith('switch ') ||
      line.startsWith('function ') ||
      line.startsWith('class ') ||
      line.startsWith('interface ') ||
      line.startsWith('type ');

    if (config.semi === 'always') {
      if (isStatementStart && !isBlockOrControl && !line.endsWith(';')) {
        diagnostics.push({
          id: `semi-missing-${lineNum}`,
          line: lineNum,
          column: rawLine.length + 1,
          ruleId: 'semi',
          severity: 'error',
          message: 'Ponto e vírgula ausente no final da instrução.',
          fixable: true
        });
      }
    } else if (config.semi === 'never') {
      if (line.endsWith(';') && !line.includes('for (')) {
        diagnostics.push({
          id: `semi-extra-${lineNum}`,
          line: lineNum,
          column: rawLine.lastIndexOf(';') + 1,
          ruleId: 'semi',
          severity: 'error',
          message: 'Ponto e vírgula desnecessário (estilo sem ponto e vírgula ativo).',
          fixable: true
        });
      }
    }

    // 5. Quotes check (simple string literals)
    if (config.quotes === 'single') {
      // Find "..." without single quotes inside
      const doubleQuoteMatch = /"([^"\n']{2,})"/.exec(line);
      if (doubleQuoteMatch && !line.includes('="') && !line.includes('="') && !filePath.endsWith('.json')) {
        diagnostics.push({
          id: `quotes-${lineNum}`,
          line: lineNum,
          column: doubleQuoteMatch.index + 1,
          ruleId: 'quotes',
          severity: 'error',
          message: 'Strings devem usar aspas simples \'exemplo\'.',
          fixable: true
        });
      }
    } else if (config.quotes === 'double' && !filePath.endsWith('.json')) {
      const singleQuoteMatch = /'([^'\n"]{2,})'/.exec(line);
      if (singleQuoteMatch) {
        diagnostics.push({
          id: `quotes-${lineNum}`,
          line: lineNum,
          column: singleQuoteMatch.index + 1,
          ruleId: 'quotes',
          severity: 'error',
          message: 'Strings devem usar aspas duplas "exemplo".',
          fixable: true
        });
      }
    }
  });

  // Check unused imported vars
  if (config.noUnusedVars !== 'off' && importedVars.length > 0) {
    importedVars.forEach((v) => {
      // Look for occurrences of word v.name beyond the import line
      const occurrences = (code.match(new RegExp(`\\b${v.name}\\b`, 'g')) || []).length;
      if (occurrences <= 1) {
        diagnostics.push({
          id: `unused-${v.name}-${v.line}`,
          line: v.line,
          column: v.col,
          ruleId: 'no-unused-vars',
          severity: config.noUnusedVars === 'warn' ? 'warn' : 'error',
          message: `'${v.name}' foi importado mas nunca utilizado no arquivo.`,
          fixable: false
        });
      }
    });
  }

  return diagnostics;
}

/**
 * Auto-fixes common ESLint violations (semicolons, quotes, any types, trailing spaces)
 */
export function autoFixCode(
  filePath: string,
  code: string,
  config: ESLintConfig = DEFAULT_ESLINT_CONFIG
): string {
  if (!isLintableFile(filePath) || !code) {
    return code;
  }

  const lines = code.split('\n');
  const fixedLines = lines.map((rawLine) => {
    let line = rawLine;

    // 1. Trim trailing whitespace
    line = line.trimEnd();

    // Skip comments or blank lines
    if (!line.trim() || line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      return line;
    }

    // 2. Fix quotes if clean
    if (config.quotes === 'single' && !filePath.endsWith('.json')) {
      // Replace "foo" with 'foo' if no single quote inside
      line = line.replace(/"([^"'\n]+)"/g, (match, p1) => {
        // Don't replace if it looks like JSX attribute: prop="val"
        return `'${p1}'`;
      });
    } else if (config.quotes === 'double' && !filePath.endsWith('.json')) {
      line = line.replace(/'([^"'\n]+)'/g, (match, p1) => {
        return `"${p1}"`;
      });
    }

    // 3. Fix semicolons
    const trimmed = line.trim();
    const isStatementStart =
      /^(const|let|var|import|export|return|throw|break|continue|yield)\b/.test(trimmed) ||
      /\w+\s*\([^)]*\)$/.test(trimmed) ||
      /\w+\s*=\s*[^=].+$/.test(trimmed);

    const isBlockOrControl =
      trimmed.endsWith('{') ||
      trimmed.endsWith('}') ||
      trimmed.endsWith('(') ||
      trimmed.endsWith('[') ||
      trimmed.endsWith(',') ||
      trimmed.endsWith(':') ||
      trimmed.endsWith('\\') ||
      trimmed.startsWith('if ') ||
      trimmed.startsWith('for ') ||
      trimmed.startsWith('while ') ||
      trimmed.startsWith('switch ') ||
      trimmed.startsWith('function ') ||
      trimmed.startsWith('class ') ||
      trimmed.startsWith('interface ') ||
      trimmed.startsWith('type ');

    if (config.semi === 'always') {
      if (isStatementStart && !isBlockOrControl && !trimmed.endsWith(';')) {
        line += ';';
      }
    } else if (config.semi === 'never') {
      if (trimmed.endsWith(';') && !trimmed.includes('for (')) {
        const lastSemi = line.lastIndexOf(';');
        line = line.slice(0, lastSemi) + line.slice(lastSemi + 1);
      }
    }

    // 4. Fix any to unknown in TypeScript
    if (config.noExplicitAny === 'error' && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
      line = line.replace(/:\s*any\b/g, ': unknown');
      line = line.replace(/\bas\s+any\b/g, 'as unknown');
    }

    return line;
  });

  return fixedLines.join('\n');
}

/**
 * Lints all eligible files in the workspace
 */
export function lintAllFiles(
  files: Record<string, string>,
  config: ESLintConfig = DEFAULT_ESLINT_CONFIG
): Record<string, LintDiagnostic[]> {
  const result: Record<string, LintDiagnostic[]> = {};
  for (const [path, content] of Object.entries(files)) {
    if (isLintableFile(path)) {
      const diags = lintCode(path, content, config);
      if (diags.length > 0) {
        result[path] = diags;
      }
    }
  }
  return result;
}

