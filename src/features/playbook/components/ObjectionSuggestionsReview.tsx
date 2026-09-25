import { Check, Info, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog.js';
import type { PlaybookKey } from '../../../config/playbooks.js';
import { clientLogger } from '../../../lib/clientLogger.js';
import { toast } from '../../../lib/toast.js';
import { type ObjectionSuggestion, playbookApi } from '../playbook.api.js';

interface ObjectionSuggestionsReviewProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: ObjectionSuggestion[];
  emptyReason?: string;
  defaultBrand: PlaybookKey;
  /** Chamado depois que pelo menos uma sugestão vira um item real — a página recarrega a lista. */
  onAdded: () => void;
}

/** Chave estável por sugestão — a API não devolve id (não é persistida ainda), então
 * segmento+persona+título identifica a sugestão dentro desta rodada. */
function suggestionKey(suggestion: ObjectionSuggestion): string {
  return `${suggestion.segment}::${suggestion.persona}::${suggestion.objectionTitle}`;
}

/**
 * Painel de revisão humana das sugestões geradas a partir de negócios REALMENTE perdidos (item 7
 * de "IA Agêntica de Vendas") — nada aqui vira `ObjectionMatrixItem` sem um clique explícito em
 * "Adicionar à matriz" por sugestão, mesmo fluxo de aprovação usado em outras superfícies de IA
 * do produto (AIPendingActions.tsx), aplicado aqui a conteúdo em vez de comunicação externa.
 */
export function ObjectionSuggestionsReview({
  isOpen,
  onClose,
  suggestions,
  emptyReason,
  defaultBrand,
  onAdded,
}: ObjectionSuggestionsReviewProps) {
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());

  const handleAdd = async (suggestion: ObjectionSuggestion) => {
    const key = suggestionKey(suggestion);
    setAddingKey(key);
    try {
      await playbookApi.createObjection({
        brand: defaultBrand,
        segment: suggestion.segment,
        persona: suggestion.persona,
        objectionTitle: suggestion.objectionTitle,
        objectionText: suggestion.objectionText,
        responseScript: suggestion.responseScript,
        keyDifferentiator: suggestion.keyDifferentiator,
      });
      setAddedKeys((prev) => new Set(prev).add(key));
      toast.success('Objeção adicionada à matriz.');
      onAdded();
    } catch (error: any) {
      clientLogger.error({ err: error }, 'Falha ao adicionar sugestão de objeção à matriz');
      toast.error(error instanceof Error ? error.message : 'Falha ao adicionar a objeção.');
    } finally {
      setAddingKey(null);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Sugestões de objeções geradas de negócios perdidos reais"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-ink-2">
          Cada sugestão vem de padrões reais de motivo de perda registrados no CRM — nunca de um
          script genérico de mercado. Revise e adicione só o que fizer sentido; nada aqui entra na
          matriz sem sua confirmação.
        </p>

        {suggestions.length === 0 ? (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-surface-2 border border-line text-sm text-ink-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand" />
            <span>
              {emptyReason ||
                'Nenhuma sugestão gerada nesta rodada — tente novamente mais tarde, quando houver mais negócios perdidos com motivo registrado.'}
            </span>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {suggestions.map((suggestion) => {
              const key = suggestionKey(suggestion);
              const isAdded = addedKeys.has(key);
              const isAdding = addingKey === key;
              return (
                <div
                  key={key}
                  className="p-4 rounded-xl border border-line bg-surface-2 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger/15 text-danger-active dark:text-danger font-bold">
                        {suggestion.segment}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-info/15 text-info-active dark:text-info font-bold">
                        {suggestion.persona}
                      </span>
                      <span
                        title={suggestion.sourceLossReasons.join(' · ')}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-iris/15 text-iris font-bold cursor-help"
                      >
                        {suggestion.evidenceCount} negócio
                        {suggestion.evidenceCount !== 1 ? 's' : ''} perdido
                        {suggestion.evidenceCount !== 1 ? 's' : ''} reais
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdd(suggestion)}
                      disabled={isAdding || isAdded}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-brand-active hover:brightness-110 disabled:opacity-60 text-on-brand transition-colors cursor-pointer shrink-0"
                    >
                      {isAdding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isAdded ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {isAdded ? 'Adicionada' : isAdding ? 'Adicionando...' : 'Adicionar à matriz'}
                    </button>
                  </div>

                  <div>
                    <h4 className="font-black text-sm text-ink">
                      &quot;{suggestion.objectionTitle}&quot;
                    </h4>
                    <p className="text-ink-2 text-sm italic">
                      &quot;{suggestion.objectionText}&quot;
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-surface border border-line">
                    <span className="text-[10px] font-black uppercase tracking-wider text-success-active dark:text-success block mb-1">
                      Script de Contorno Sugerido
                    </span>
                    <p className="text-sm text-ink leading-relaxed">{suggestion.responseScript}</p>
                  </div>

                  <p className="text-xs text-warning-active dark:text-warning font-bold">
                    💡 Diferencial-chave: {suggestion.keyDifferentiator}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
}
