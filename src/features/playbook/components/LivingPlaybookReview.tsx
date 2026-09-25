import { Check, Info, Loader2, Megaphone, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog.js';
import { clientLogger } from '../../../lib/clientLogger.js';
import { toast } from '../../../lib/toast.js';
import { playbookApi, type WinningPatternSuggestion } from '../playbook.api.js';

interface LivingPlaybookReviewProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: WinningPatternSuggestion[];
  emptyReason?: string;
}

function suggestionKey(suggestion: WinningPatternSuggestion): string {
  return `${suggestion.sellerId}::${suggestion.segment}::${suggestion.patternTitle}`;
}

/**
 * Playbook Vivo (item 42): revisão humana antes de anunciar um padrão vencedor pro time inteiro.
 * Cada sugestão vem de mensagens REAIS com resultado positivo confirmado — nunca vira anúncio sem
 * um clique explícito em "Anunciar para o time", mesmo princípio de aprovação humana já usado em
 * ObjectionSuggestionsReview.tsx e AIPendingActions.tsx, aplicado aqui a reconhecimento de
 * performance em vez de comunicação externa ou conteúdo de playbook.
 */
export function LivingPlaybookReview({
  isOpen,
  onClose,
  suggestions,
  emptyReason,
}: LivingPlaybookReviewProps) {
  const [broadcastingKey, setBroadcastingKey] = useState<string | null>(null);
  const [broadcastedKeys, setBroadcastedKeys] = useState<Set<string>>(new Set());

  const handleBroadcast = async (suggestion: WinningPatternSuggestion) => {
    const key = suggestionKey(suggestion);
    setBroadcastingKey(key);
    try {
      await playbookApi.broadcastWinningPattern({
        sellerName: suggestion.sellerName,
        segment: suggestion.segment,
        patternTitle: suggestion.patternTitle,
        suggestedScript: suggestion.suggestedScript,
        insightId: suggestion.insightId,
      });
      setBroadcastedKeys((prev) => new Set(prev).add(key));
      toast.success('Padrão anunciado para o time.');
    } catch (error: any) {
      clientLogger.error({ err: error }, 'Falha ao anunciar padrão vencedor do Playbook Vivo');
      toast.error(error instanceof Error ? error.message : 'Falha ao anunciar o padrão.');
    } finally {
      setBroadcastingKey(null);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Playbook Vivo — abordagens que estão convertendo melhor"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-ink-2">
          Cada padrão vem de mensagens reais que um vendedor enviou e que tiveram resultado positivo
          confirmado — nunca de uma média genérica. Revise e anuncie só o que fizer sentido; nada
          aqui vira comunicado pro time sem sua confirmação.
        </p>

        {suggestions.length === 0 ? (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-surface-2 border border-line text-sm text-ink-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand" />
            <span>
              {emptyReason ||
                'Nenhum padrão identificado nesta rodada — tente novamente quando houver mais outcomes positivos confirmados.'}
            </span>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {suggestions.map((suggestion) => {
              const key = suggestionKey(suggestion);
              const isBroadcast = broadcastedKeys.has(key);
              const isBroadcasting = broadcastingKey === key;
              return (
                <div
                  key={key}
                  className="p-4 rounded-xl border border-line bg-surface-2 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-iris/15 text-iris font-bold">
                        <Trophy className="w-3 h-3" />
                        {suggestion.sellerName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger/15 text-danger-active dark:text-danger font-bold">
                        {suggestion.segment}
                      </span>
                      <span
                        title={suggestion.sourceExcerpts.join(' · ')}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success-active dark:text-success font-bold cursor-help"
                      >
                        {suggestion.evidenceCount} outcome
                        {suggestion.evidenceCount !== 1 ? 's' : ''} positivo
                        {suggestion.evidenceCount !== 1 ? 's' : ''} reais
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBroadcast(suggestion)}
                      disabled={isBroadcasting || isBroadcast}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-brand-active hover:brightness-110 disabled:opacity-60 text-on-brand transition-all cursor-pointer shrink-0"
                    >
                      {isBroadcasting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isBroadcast ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Megaphone className="w-3.5 h-3.5" />
                      )}
                      {isBroadcast
                        ? 'Anunciado'
                        : isBroadcasting
                          ? 'Anunciando...'
                          : 'Anunciar para o time'}
                    </button>
                  </div>

                  <div>
                    <h4 className="font-black text-sm text-ink">{suggestion.patternTitle}</h4>
                    <p className="text-ink-2 text-sm">{suggestion.patternDescription}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-surface border border-line">
                    <span className="text-[10px] font-black uppercase tracking-wider text-success-active dark:text-success block mb-1">
                      Abordagem sugerida
                    </span>
                    <p className="text-sm text-ink leading-relaxed">{suggestion.suggestedScript}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
}
