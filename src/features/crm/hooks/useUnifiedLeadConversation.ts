import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import type { TimelineItem } from '../../../components/ui/Timeline';

/**
 * Central unificada de conversas (item #18 do roadmap comercial) — mescla, num único feed
 * cronológico, os eventos nativos do CRM (`lead.timeline`, já resolvidos pelo chamador em
 * `TimelineItem[]`) com WhatsApp, e-mail e ligações de voz, cada um buscado por `leadId` na sua
 * própria integração (`GET /api/whatsapp/messages`, `GET /api/integrations/email/messages`,
 * `GET /api/integrations/birth-voice/calls`). Não substitui `WhatsAppChatPanel` (que continua
 * sendo o lugar de ENVIAR mensagem) nem `VoiceCallActivity` (feed geral, todos os leads) — aqui é
 * só leitura, um resumo por item, igual ao resto da timeline.
 *
 * Três chamadas independentes e silenciosas (mesmo raciocínio de `LeadCopilotoPanel`): a falha de
 * uma fonte nunca esconde as outras nem quebra o resto do drawer.
 */

interface WhatsAppMessageRow {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string | null;
  receivedAt: string;
}

interface EmailMessageRow {
  id: string;
  direction: 'inbound' | 'outbound';
  subject: string | null;
  body: string | null;
  receivedAt: string;
}

type CallOutcome =
  | 'completed'
  | 'voicemail'
  | 'no-answer'
  | 'busy'
  | 'invalid-number'
  | 'failed'
  | 'cancelled'
  | 'timeout'
  | 'unknown';

interface VoiceCallRow {
  id: string;
  outcome: CallOutcome;
  durationSeconds: number;
  summary: string | null;
  createdAt: string;
}

/** Mesmos rótulos de `VoiceCallActivity.tsx` (`OUTCOME_LABEL`) — não exportado de lá (é um
 * componente, não um módulo compartilhado), então redeclarado aqui, mesmo padrão já usado em
 * `LeadCopilotoPanel.tsx` (`SENTIMENT_BADGE_VARIANT`) para um mapa pequeno e local. */
const CALL_OUTCOME_LABEL: Record<CallOutcome, string> = {
  completed: 'conversa real',
  voicemail: 'caixa postal',
  'no-answer': 'não atendeu',
  busy: 'ocupado',
  'invalid-number': 'número inválido',
  failed: 'falha',
  cancelled: 'cancelada',
  timeout: 'tempo esgotado',
  unknown: 'desconhecido',
};

function truncate(text: string, max = 160): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

interface SortableItem {
  sortAt: number;
  item: TimelineItem;
}

export interface RawTimelineEvent {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  type?: TimelineItem['type'];
}

export function useUnifiedLeadConversation(
  leadId: string,
  nativeEvents: RawTimelineEvent[],
): { items: TimelineItem[]; loading: boolean } {
  const [channelItems, setChannelItems] = useState<SortableItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!leadId) {
      setChannelItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api
        .get<WhatsAppMessageRow[]>(`/api/whatsapp/messages?leadId=${encodeURIComponent(leadId)}`)
        .catch(() => []),
      api
        .get<EmailMessageRow[]>(
          `/api/integrations/email/messages?leadId=${encodeURIComponent(leadId)}`,
        )
        .catch(() => []),
      api
        .get<{ calls: VoiceCallRow[] }>(
          `/api/integrations/birth-voice/calls?leadId=${encodeURIComponent(leadId)}&limit=20`,
        )
        .catch(() => ({ calls: [] })),
    ]).then(([whatsapp, email, voice]) => {
      if (cancelled) return;

      const whatsappItems: SortableItem[] = whatsapp.map((m) => ({
        sortAt: new Date(m.receivedAt).getTime(),
        item: {
          id: `wa-${m.id}`,
          type: 'whatsapp',
          title: m.direction === 'inbound' ? 'WhatsApp recebido' : 'WhatsApp enviado',
          description: m.body ? truncate(m.body) : undefined,
          timestamp: new Date(m.receivedAt).toLocaleString('pt-BR'),
        },
      }));

      const emailItems: SortableItem[] = email.map((m) => ({
        sortAt: new Date(m.receivedAt).getTime(),
        item: {
          id: `email-${m.id}`,
          type: 'email',
          title:
            (m.direction === 'inbound' ? 'E-mail recebido' : 'E-mail enviado') +
            (m.subject ? `: ${m.subject}` : ''),
          description: m.body ? truncate(m.body) : undefined,
          timestamp: new Date(m.receivedAt).toLocaleString('pt-BR'),
        },
      }));

      const callItems: SortableItem[] = (voice.calls ?? []).map((c) => ({
        sortAt: new Date(c.createdAt).getTime(),
        item: {
          id: `call-${c.id}`,
          type: 'call',
          title: `Ligação — ${CALL_OUTCOME_LABEL[c.outcome] ?? c.outcome}`,
          description: c.summary ? truncate(c.summary) : undefined,
          timestamp: new Date(c.createdAt).toLocaleString('pt-BR'),
        },
      }));

      setChannelItems([...whatsappItems, ...emailItems, ...callItems]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const nativeSortable: SortableItem[] = nativeEvents.map((event) => ({
    sortAt: new Date(event.createdAt).getTime(),
    item: {
      id: event.id,
      title: event.title,
      description: event.description,
      timestamp: new Date(event.createdAt).toLocaleString('pt-BR'),
      type: event.type,
    },
  }));

  const items = [...nativeSortable, ...channelItems]
    .sort((a, b) => b.sortAt - a.sortAt)
    .map((entry) => entry.item);

  return { items, loading };
}
