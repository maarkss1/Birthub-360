import { AlertTriangle, ArrowRight, Mic, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  COACHING_DIMENSION_LABELS,
  type CoachingRubricOutput,
  type CopilotoConversationDTO,
  type HandoffSummaryDTO,
  copilotoIaApi,
} from '../copilotoIa.api';

/** Mesma paleta de `MeetingSynthesisOutput.sentimentScore` (meetingSynthesis.contract.ts) — só os
 * 4 valores fixos que o modelo pode retornar têm mapeamento; qualquer outro cai no `default` do
 * Badge (nunca quebra por um valor inesperado). */
const SENTIMENT_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'danger'> = {
  'Muito Positivo': 'success',
  Positivo: 'success',
  'Neutro / Cauteloso': 'warning',
  Negativo: 'danger',
};

const SOURCE_LABEL: Record<string, string> = {
  MEET: 'reunião',
  CALL: 'ligação',
  WHATSAPP: 'conversa de WhatsApp',
  MANUAL: 'conversa registrada',
  OTHER: 'conversa',
};

function weakestCoachingDimension(
  rubric: CoachingRubricOutput,
): { label: string; score: number; evidence: string } | null {
  const entries = Object.entries(rubric) as [
    keyof CoachingRubricOutput,
    CoachingRubricOutput[keyof CoachingRubricOutput],
  ][];
  if (entries.length === 0) return null;
  const [key, dimension] = entries.reduce((worst, entry) =>
    entry[1].score < worst[1].score ? entry : worst,
  );
  return {
    label: COACHING_DIMENSION_LABELS[key],
    score: dimension.score,
    evidence: dimension.evidence,
  };
}

/**
 * Seção compacta do Copiloto Comercial IA dentro do `LeadDetailDrawer` — mesmo raciocínio de
 * `WhatsAppChatPanel` ali: o CRM decide QUANDO oferecer a entrada, não COMO o módulo funciona.
 * Chamadas independentes e silenciosas (nunca bloqueiam o resto do drawer, nunca mostram erro
 * cheio — é uma seção secundária, não a tela principal).
 *
 * Além do resumo numérico (contagem/Deal Health/pendência de WhatsApp), traz o resumo executivo +
 * sentimento da conversa mais recente já pronta (via `getHandoff`) e, quando há avaliação de
 * coaching (hoje só para reuniões — ligações da IA de voz são roteiro fixo, não avaliadas por
 * design, ver `CopilotoVoiceIngestionAdapter.ts`), o ponto de atenção mais acionável dela — nunca
 * um score genérico sozinho.
 */
export function LeadCopilotoPanel({ leadId }: { leadId: string }) {
  const navigate = useNavigate();
  const [conversationCount, setConversationCount] = useState<number | null>(null);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [pendingWhatsApp, setPendingWhatsApp] = useState(false);
  const [latestConversation, setLatestConversation] = useState<CopilotoConversationDTO | null>(
    null,
  );
  const [handoff, setHandoff] = useState<HandoffSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLatestConversation(null);
    setHandoff(null);
    Promise.all([
      copilotoIaApi.listConversations({ leadId }).catch(() => []),
      copilotoIaApi.getLeadDealHealth(leadId).catch(() => []),
      copilotoIaApi.getLeadWhatsAppResponseTime(leadId).catch(() => null),
    ]).then(async ([conversations, dealHealth, whatsapp]) => {
      if (cancelled) return;
      setConversationCount(conversations.length);
      setLatestScore(dealHealth[0]?.score ?? null);
      setPendingWhatsApp(whatsapp?.hasPendingResponse ?? false);
      setLoading(false);

      // `listConversations` já vem ordenada por updatedAt desc (PrismaCopilotoIaRepository) — a
      // primeira conversa READY é a mais recente com handoff útil. SCHEDULED/CAPTURING/
      // PROCESSING/FAILED/CANCELLED ainda não têm resumo pra mostrar aqui.
      const ready = conversations.find((c) => c.status === 'READY') ?? null;
      if (!ready) return;
      setLatestConversation(ready);
      try {
        const data = await copilotoIaApi.getHandoff(ready.id);
        if (!cancelled) setHandoff(data);
      } catch {
        // seção secundária do drawer — uma falha aqui nunca pode impedir o resto da tela.
      }
    });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const sentiment = handoff?.summary?.sentimentScore ?? null;
  const weakestDimension = handoff?.coachingEvaluation
    ? weakestCoachingDimension(handoff.coachingEvaluation.rubricJson as CoachingRubricOutput)
    : null;

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-ink-2 flex items-center gap-2">
        <Mic className="w-4 h-4 text-brand" /> Copiloto IA
      </h3>
      <div className="bg-surface-2/40 p-4 rounded-2xl border border-line space-y-3">
        {loading ? (
          <Skeleton className="h-6 w-full" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-ink-2">
                {conversationCount === 0
                  ? 'Nenhuma conversa capturada ainda'
                  : `${conversationCount} conversa${conversationCount === 1 ? '' : 's'} capturada${conversationCount === 1 ? '' : 's'}`}
              </span>
              {latestScore != null && (
                <Badge
                  variant={latestScore >= 70 ? 'success' : latestScore >= 40 ? 'warning' : 'danger'}
                >
                  Deal Health {latestScore}/100
                </Badge>
              )}
              {pendingWhatsApp && <Badge variant="warning">WhatsApp aguardando resposta</Badge>}
            </div>

            {handoff?.summary && (
              <div className="pt-3 border-t border-line space-y-2">
                <div className="flex items-center gap-2 text-xs text-ink-2">
                  <Sparkles className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden="true" />
                  <span>
                    Resumo da última {SOURCE_LABEL[latestConversation?.source ?? 'OTHER']}
                  </span>
                  {sentiment && (
                    <Badge variant={SENTIMENT_BADGE_VARIANT[sentiment] ?? 'default'}>
                      {sentiment}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-ink leading-relaxed">
                  {handoff.summary.executiveSummary}
                </p>
                {handoff.summary.unresolvedObjections.length > 0 && (
                  <p className="text-xs text-ink-2">
                    <span className="font-semibold text-warning-active dark:text-warning">
                      Objeções em aberto:{' '}
                    </span>
                    {handoff.summary.unresolvedObjections.join(' · ')}
                  </p>
                )}
              </div>
            )}

            {weakestDimension && (
              <div className="flex items-start gap-2 text-xs bg-warning/10 border border-warning/20 rounded-xl p-2.5">
                <AlertTriangle
                  className="w-3.5 h-3.5 text-warning-active dark:text-warning shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="text-ink-2">
                  <span className="font-semibold text-ink">
                    Coaching — ponto de atenção em &ldquo;{weakestDimension.label}&rdquo; (
                    {weakestDimension.score}/10):{' '}
                  </span>
                  {weakestDimension.evidence}
                </p>
              </div>
            )}
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/app/copiloto_ia?tab=conversas&leadId=${leadId}`)}
        >
          Ver histórico no Copiloto IA <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </section>
  );
}
