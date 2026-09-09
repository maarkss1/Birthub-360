import { Loader2, Sparkles, Trash, PhoneCall, MessageCircle, Send } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { Lead } from '../../../types';

interface LeadActionBarProps {
  lead: Lead;
  enriching: boolean;
  onEnrich: () => void;
  deleting: boolean;
  onDelete: () => void;
  agentType: string;
  onAgentTypeChange: (value: string) => void;
  callingVoice: boolean;
  onVoiceCall: () => void;
  leadPhone: string | null;
  onOpenWhatsapp: () => void;
  exportingBitrix: boolean;
  onExportBitrix: () => void;
}

/**
 * Barra de ação consolidada da oportunidade (Onda B, Agente 00 — Commercial AI OS, capability
 * P0-3). Antes desta barra, as mesmas ações já existiam mas espalhadas em 3 lugares diferentes do
 * LeadDetailDrawer (ícones soltos no cabeçalho, botões no rodapé, botão de envio Bitrix enterrado
 * dentro da seção "Integração Bitrix24") — nenhuma ação nova foi criada aqui, só consolidada e
 * rotulada num único lugar visível sem scroll, logo abaixo do cabeçalho.
 */
export function LeadActionBar({
  lead,
  enriching,
  onEnrich,
  deleting,
  onDelete,
  agentType,
  onAgentTypeChange,
  callingVoice,
  onVoiceCall,
  leadPhone,
  onOpenWhatsapp,
  exportingBitrix,
  onExportBitrix,
}: LeadActionBarProps) {
  const isSyncedToBitrix = Boolean(lead.bitrixLeadId || lead.bitrixDealId);

  return (
    // <fieldset> implica agrupamento de campos de formulário — isto é uma barra de ação
    // (botões + um select de configuração), não um form; role="group" num div é o padrão
    // WAI-ARIA correto aqui, mesmo padrão já aceito em CrmBoard.tsx (toggle Lead/Negócio).
    // biome-ignore lint/a11y/useSemanticElements: ver comentário acima
    <div
      role="group"
      aria-label="Ações da oportunidade"
      className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-line bg-surface-2/30 shrink-0"
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onEnrich}
        disabled={enriching}
        loading={enriching}
        title="Enriquecer dados via IA"
      >
        {enriching ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        Enriquecer
      </Button>

      <div className="flex items-center gap-1.5">
        <label className="sr-only" htmlFor="lead-action-bar-agent-type">
          Tipo de agente para a ligação de qualificação
        </label>
        <select
          id="lead-action-bar-agent-type"
          value={agentType}
          onChange={(e) => onAgentTypeChange(e.target.value)}
          className="h-8 px-2 bg-surface border border-line rounded-lg text-xs font-medium text-ink focus:outline-none focus:border-brand"
        >
          <option value="sdr">SDR Frio</option>
          <option value="reactivation">Reativação</option>
          <option value="nps">NPS</option>
        </select>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onVoiceCall}
          disabled={callingVoice}
          loading={callingVoice}
        >
          {callingVoice ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <PhoneCall className="w-3.5 h-3.5" />
          )}
          Qualificar via Voz
        </Button>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onOpenWhatsapp}
        disabled={!leadPhone}
        title={
          leadPhone ? 'Enviar WhatsApp para este lead' : 'Este lead não possui telefone cadastrado'
        }
      >
        <MessageCircle className="w-3.5 h-3.5" />
        WhatsApp
      </Button>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onExportBitrix}
        disabled={exportingBitrix}
        loading={exportingBitrix}
      >
        {exportingBitrix ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Send className="w-3.5 h-3.5" />
        )}
        {isSyncedToBitrix ? 'Reenviar ao Bitrix' : 'Enviar ao Bitrix24'}
      </Button>

      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onDelete}
        disabled={deleting}
        loading={deleting}
        className="ml-auto"
        title="Excluir lead"
      >
        {deleting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Trash className="w-3.5 h-3.5" />
        )}
        Excluir
      </Button>
    </div>
  );
}
