import { useCallback, useEffect, useState } from 'react';
import { toast } from '../lib/toast';
import { clientLogger } from '../lib/clientLogger';

interface VoiceHubConnection {
  id: string;
  label: string;
  baseUrl: string;
  agentId: string | null;
  enabled: boolean;
  hasApiKey: boolean;
}

/** Estado/ações das conexões com o Birth Voices Hub na tela de Integrações — mesmo padrão de
 *  `use3CXIntegration.ts` (FRONT-006). */
export function useVoiceHubIntegration() {
  const [voiceHubConnections, setVoiceHubConnections] = useState<VoiceHubConnection[]>([]);
  const [voiceHubBaseUrlInput, setVoiceHubBaseUrlInput] = useState('');
  const [voiceHubApiKeyInput, setVoiceHubApiKeyInput] = useState('');
  const [voiceHubAgentIdInput, setVoiceHubAgentIdInput] = useState('');
  const [voiceHubLabelInput, setVoiceHubLabelInput] = useState('');
  const [voiceHubLoading, setVoiceHubLoading] = useState(false);

  const fetchVoiceHubConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/birth-voice/connections');
      const data = await res.json();
      if (data.success) {
        setVoiceHubConnections(data.data);
      }
    } catch (error) {
      clientLogger.error({ err: error }, 'Failed to fetch Birth Voices Hub connections');
    }
  }, []);

  useEffect(() => {
    fetchVoiceHubConnections();
  }, [fetchVoiceHubConnections]);

  const handleVoiceHubConnect = async () => {
    if (!voiceHubBaseUrlInput.trim()) {
      toast.error('Informe a URL do Birth Voices Hub.');
      return;
    }
    setVoiceHubLoading(true);
    try {
      const res = await fetch('/api/integrations/birth-voice/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: voiceHubBaseUrlInput,
          apiKey: voiceHubApiKeyInput || undefined,
          agentId: voiceHubAgentIdInput || undefined,
          label: voiceHubLabelInput || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao conectar o Birth Voices Hub.');
      }
      toast.success('Birth Voices Hub conectado com sucesso!');
      setVoiceHubBaseUrlInput('');
      setVoiceHubApiKeyInput('');
      setVoiceHubAgentIdInput('');
      setVoiceHubLabelInput('');
      fetchVoiceHubConnections();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setVoiceHubLoading(false);
    }
  };

  const handleVoiceHubDisconnect = async (id: string) => {
    setVoiceHubLoading(true);
    try {
      const res = await fetch(`/api/integrations/birth-voice/disconnect/${id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Erro ao desconectar o Birth Voices Hub.');
        return;
      }
      toast.success('Birth Voices Hub desconectado.');
      fetchVoiceHubConnections();
    } catch {
      toast.error('Erro ao desconectar o Birth Voices Hub.');
    } finally {
      setVoiceHubLoading(false);
    }
  };

  const handleVoiceHubTest = async (id: string) => {
    try {
      const res = await fetch(`/api/integrations/birth-voice/connections/${id}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Não foi possível testar a comunicação com o Hub.');
        return;
      }
      // Mesmo cuidado do bug de auditoria já corrigido em use3CXIntegration.ts: `data.success` é
      // só o envelope HTTP da rota; o resultado REAL do healthcheck é `data.data.success`.
      if (data.data?.success) {
        toast.success(data.data.message || 'Birth Voices Hub pronto para chamadas!');
      } else {
        toast.error(
          data.data?.message || 'Birth Voices Hub não respondeu ao teste de comunicação.',
        );
      }
    } catch {
      toast.error('Não foi possível testar a comunicação com o Hub.');
    }
  };

  return {
    voiceHubConnections,
    voiceHubBaseUrlInput,
    setVoiceHubBaseUrlInput,
    voiceHubApiKeyInput,
    setVoiceHubApiKeyInput,
    voiceHubAgentIdInput,
    setVoiceHubAgentIdInput,
    voiceHubLabelInput,
    setVoiceHubLabelInput,
    voiceHubLoading,
    handleVoiceHubConnect,
    handleVoiceHubDisconnect,
    handleVoiceHubTest,
  };
}
