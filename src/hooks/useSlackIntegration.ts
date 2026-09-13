import { useCallback, useEffect, useState } from 'react';
import { toast } from '../lib/toast';
import { clientLogger } from '../lib/clientLogger';

interface SlackConnection {
  id: string;
  label: string;
  hasWebhook: boolean;
  hasBotToken: boolean;
  defaultChannel: string | null;
}

/** Estado/ações das conexões Slack na tela de Integrações — mesmo padrão de use3CXIntegration.ts. */
export function useSlackIntegration() {
  const [slackConnections, setSlackConnections] = useState<SlackConnection[]>([]);
  const [slackLabelInput, setSlackLabelInput] = useState('');
  const [slackWebhookInput, setSlackWebhookInput] = useState('');
  const [slackBotTokenInput, setSlackBotTokenInput] = useState('');
  const [slackDefaultChannelInput, setSlackDefaultChannelInput] = useState('');
  const [slackLoading, setSlackLoading] = useState(false);

  const fetchSlackConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/slack/connections');
      const data = await res.json();
      if (data.success) {
        setSlackConnections(data.data);
      }
    } catch (error) {
      clientLogger.error({ err: error }, 'Failed to fetch Slack connections');
    }
  }, []);

  useEffect(() => {
    fetchSlackConnections();
  }, [fetchSlackConnections]);

  const handleSlackConnect = async () => {
    if (!slackWebhookInput.trim() && !slackBotTokenInput.trim()) {
      toast.error('Informe a URL do Incoming Webhook ou um Bot Token do Slack.');
      return;
    }
    setSlackLoading(true);
    try {
      const res = await fetch('/api/integrations/slack/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: slackLabelInput || undefined,
          webhookUrl: slackWebhookInput || undefined,
          botToken: slackBotTokenInput || undefined,
          defaultChannel: slackDefaultChannelInput || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao conectar Slack.');
      }
      toast.success('Slack conectado com sucesso!');
      setSlackLabelInput('');
      setSlackWebhookInput('');
      setSlackBotTokenInput('');
      setSlackDefaultChannelInput('');
      fetchSlackConnections();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSlackLoading(false);
    }
  };

  const handleSlackDisconnect = async (id: string) => {
    setSlackLoading(true);
    try {
      const res = await fetch(`/api/integrations/slack/disconnect/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Erro ao desconectar Slack.');
        return;
      }
      toast.success('Slack desconectado.');
      fetchSlackConnections();
    } catch {
      toast.error('Erro ao desconectar Slack.');
    } finally {
      setSlackLoading(false);
    }
  };

  const handleSlackTest = async (id: string) => {
    try {
      const res = await fetch(`/api/integrations/slack/connections/${id}/test`, { method: 'POST' });
      const data = await res.json();
      // `data.success` é só o envelope HTTP da rota — o resultado real do teste é
      // `data.data.success` (testSlackConnection), mesmo cuidado de handle3CXTest
      // (use3CXIntegration.ts) para não mostrar um toast de sucesso quando o envio de verdade falhou.
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Não foi possível testar a conexão com o Slack.');
        return;
      }
      if (data.data?.success) {
        toast.success(data.data.message || 'Mensagem de teste enviada ao Slack!');
      } else {
        toast.error(data.data?.message || 'Falha ao enviar mensagem de teste ao Slack.');
      }
    } catch {
      toast.error('Não foi possível testar a conexão com o Slack.');
    }
  };

  return {
    slackConnections,
    slackLabelInput,
    setSlackLabelInput,
    slackWebhookInput,
    setSlackWebhookInput,
    slackBotTokenInput,
    setSlackBotTokenInput,
    slackDefaultChannelInput,
    setSlackDefaultChannelInput,
    slackLoading,
    handleSlackConnect,
    handleSlackDisconnect,
    handleSlackTest,
  };
}
