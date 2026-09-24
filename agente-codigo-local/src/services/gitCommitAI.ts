import { GitFileChange, GitCommitSuggestion } from '../types/git';

/**
 * Generates rule-based heuristic commit suggestions if AI is unavailable or as quick offline fallback
 */
export function generateHeuristicCommitSuggestions(
  changes: GitFileChange[],
  userPromptHint?: string
): GitCommitSuggestion[] {
  if (changes.length === 0) {
    return [
      {
        style: 'conventional',
        title: 'chore: atualização geral de arquivos',
        fullMessage: 'chore: atualização geral de arquivos',
        type: 'chore'
      }
    ];
  }

  // Detect predominant change types and files
  const filePaths = changes.map((c) => c.path);
  const isAllComponents = filePaths.every((p) => p.includes('component') || p.endsWith('.tsx') || p.endsWith('.jsx'));
  const isAllStyles = filePaths.every((p) => p.endsWith('.css') || p.endsWith('.scss'));
  const isAllTests = filePaths.every((p) => p.includes('test') || p.includes('spec'));
  const isAllDocs = filePaths.every((p) => p.endsWith('.md') || p.endsWith('.txt'));
  const hasAdded = changes.some((c) => c.status === 'added');
  const hasDeleted = changes.some((c) => c.status === 'deleted');

  let type = 'chore';
  let scope = '';

  if (isAllTests) {
    type = 'test';
    scope = 'tests';
  } else if (isAllDocs) {
    type = 'docs';
    scope = 'docs';
  } else if (isAllStyles) {
    type = 'style';
    scope = 'ui';
  } else if (hasAdded) {
    type = 'feat';
  } else if (changes.some((c) => c.path.includes('fix') || c.path.includes('error'))) {
    type = 'fix';
  } else {
    type = 'refactor';
  }

  // Detect scope
  if (filePaths.some((p) => p.includes('git') || p.includes('Git'))) {
    scope = 'git';
  } else if (filePaths.some((p) => p.includes('auth') || p.includes('firebase') || p.includes('Firebase'))) {
    scope = 'auth';
  } else if (filePaths.some((p) => p.includes('editor') || p.includes('CodeEditor'))) {
    scope = 'editor';
  } else if (filePaths.some((p) => p.includes('terminal') || p.includes('Terminal'))) {
    scope = 'terminal';
  } else if (isAllComponents) {
    scope = 'ui';
  }

  const scopePrefix = scope ? `(${scope})` : '';

  // Extract base names for short descriptions
  const sampleNames = filePaths.slice(0, 3).map((p) => p.split('/').pop()).join(', ');
  const extraCount = filePaths.length > 3 ? ` e mais ${filePaths.length - 3} arquivo(s)` : '';

  const hint = userPromptHint?.trim() ? ` ${userPromptHint.trim()}` : '';

  const conventionalTitle = `${type}${scopePrefix}: ${hint || `atualiza ${sampleNames}${extraCount}`}`;
  const conciseTitle = `${type === 'feat' ? 'Adiciona' : type === 'fix' ? 'Corrige' : type === 'test' ? 'Adiciona testes em' : 'Atualiza'} ${sampleNames}${extraCount}${hint ? ` - ${hint}` : ''}`;

  const bulletPoints = changes.slice(0, 8).map((c) => {
    const action = c.status === 'added' ? 'Cria' : c.status === 'deleted' ? 'Remove' : 'Modifica';
    return `- ${action} ${c.path} (+${c.additions} -${c.deletions})`;
  }).join('\n');

  const detailedMessage = `${conventionalTitle}\n\n${bulletPoints}${changes.length > 8 ? `\n- ... e mais ${changes.length - 8} arquivos` : ''}`;

  return [
    {
      style: 'conventional',
      title: conventionalTitle,
      description: 'Padrão Conventional Commits (Recomendado)',
      fullMessage: conventionalTitle,
      type,
      scope
    },
    {
      style: 'concise',
      title: conciseTitle,
      description: 'Direto e conciso',
      fullMessage: conciseTitle,
      type
    },
    {
      style: 'detailed',
      title: conventionalTitle,
      description: 'Mensagem detalhada com lista de alterações',
      fullMessage: detailedMessage,
      type,
      scope
    }
  ];
}

/**
 * Calls Gemini to generate intelligent commit messages based on diff and changed files
 */
export async function generateAICommitMessages(options: {
  changes: GitFileChange[];
  userHint?: string;
  customGeminiKey?: string;
  language?: 'pt' | 'en';
}): Promise<GitCommitSuggestion[]> {
  const { changes, userHint, customGeminiKey, language = 'pt' } = options;

  if (changes.length === 0) {
    return generateHeuristicCommitSuggestions(changes, userHint);
  }

  // Format diff summary to send to AI
  const summaryList = changes.slice(0, 20).map((c) => {
    let snippet = '';
    if (c.newContent && c.status === 'added') {
      snippet = ` (Novo arquivo, primeiras linhas: ${c.newContent.slice(0, 150).replace(/\n/g, ' ')})`;
    }
    return `[${c.status.toUpperCase()}] ${c.path} (+${c.additions}/-${c.deletions})${snippet}`;
  }).join('\n');

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customGeminiKey) {
      headers['x-gemini-key'] = customGeminiKey;
    }

    const res = await fetch('/api/git/generate-commit-message', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        diffSummary: summaryList,
        userHint,
        language
      })
    });

    if (!res.ok) {
      // Fallback to calling general agent gemini proxy
      const prompt = `Você é um engenheiro de software sênior especialista em Git.
Analise a lista de arquivos alterados e o contexto fornecido abaixo e gere mensagens de commit perfeitas no padrão Conventional Commits (ex: feat(escopo): descrição, fix(escopo): descrição, refactor(escopo): descrição).

Arquivos alterados no workspace:
${summaryList}

${userHint ? `Instrução ou objetivo do usuário: "${userHint}"` : ''}

Retorne ESTRITAMENTE um objeto JSON no seguinte formato (sem crases nem texto adicional):
{
  "suggestions": [
    {
      "style": "conventional",
      "title": "feat(escopo): mensagem concisa no padrão conventional commits",
      "description": "Conventional Commits padrão",
      "fullMessage": "feat(escopo): mensagem concisa no padrão conventional commits",
      "type": "feat",
      "scope": "escopo"
    },
    {
      "style": "concise",
      "title": "Mensagem direta em tom imperativo",
      "description": "Resumo direto",
      "fullMessage": "Mensagem direta em tom imperativo"
    },
    {
      "style": "detailed",
      "title": "feat(escopo): mensagem principal",
      "description": "Mensagem com bullet points explicativos",
      "fullMessage": "feat(escopo): mensagem principal\\n\\n- Alteração específica 1\\n- Alteração específica 2"
    }
  ]
}`;

      const fallbackRes = await fetch('/api/agent/gemini', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          messages: [{ role: 'user', content: prompt }],
          systemPrompt: 'Você gera mensagens de commit Git profissionais e retorna estritamente JSON.'
        })
      });

      if (!fallbackRes.ok) {
        throw new Error('Falha ao contatar Gemini para gerar commit');
      }

      const fbData = await fallbackRes.json();
      const content = fbData.content || '';
      const cleanJson = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
        return parsed.suggestions;
      }
    }

    const data = await res.json();
    if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
      return data.suggestions;
    }
  } catch (err) {
    console.warn('Falha na IA ao gerar commit, usando sugestões heurísticas:', err);
  }

  // Safe fallback
  return generateHeuristicCommitSuggestions(changes, userHint);
}
