import { useCallback, useEffect, useState } from 'react';
import { clientLogger } from '../lib/clientLogger';
import { toast } from '../lib/toast';

interface OmieConnection {
  id: string;
  label: string;
  appKeyLast4: string;
}

/** Estado/ações das conexões Omie na tela de Integrações — mesmo padrão de use3CXIntegration.ts. */
export function useOmieIntegration() {
  const [omieConnections, setOmieConnections] = useState<OmieConnection[]>([]);
  const [omieLabelInput, setOmieLabelInput] = useState('');
  const [omieAppKeyInput, setOmieAppKeyInput] = useState('');
  const [omieAppSecretInput, setOmieAppSecretInput] = useState('');
  const [omieLoading, setOmieLoading] = useState(false);

  const fetchOmieConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/omie/connections');
      const data = await res.json();
      if (data.success) {
        setOmieConnections(data.data);
      }
    } catch (error) {
      clientLogger.error({ err: error }, 'Failed to fetch Omie connections');
    }
  }, []);

  useEffect(() => {
    fetchOmieConnections();
  }, [fetchOmieConnections]);

  const handleOmieConnect = async () => {
    if (!omieAppKeyInput.trim() || !omieAppSecretInput.trim()) {
      toast.error('Informe a Chave de Integração (App Key) e o App Secret do Omie.');
      return;
    }
    setOmieLoading(true);
    try {
      const res = await fetch('/api/integrations/omie/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: omieLabelInput || undefined,
          appKey: omieAppKeyInput,
          appSecret: omieAppSecretInput,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao conectar Omie.');
      }
      toast.success('Omie conectado com sucesso!');
      setOmieLabelInput('');
      setOmieAppKeyInput('');
      setOmieAppSecretInput('');
      fetchOmieConnections();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setOmieLoading(false);
    }
  };

  const handleOmieDisconnect = async (id: string) => {
    setOmieLoading(true);
    try {
      const res = await fetch(`/api/integrations/omie/disconnect/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Erro ao desconectar Omie.');
        return;
      }
      toast.success('Omie desconectado.');
      fetchOmieConnections();
    } catch {
      toast.error('Erro ao desconectar Omie.');
    } finally {
      setOmieLoading(false);
    }
  };

  const handleOmieTest = async (id: string) => {
    try {
      const res = await fetch(`/api/integrations/omie/connections/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Não foi possível testar a conexão com o Omie.');
        return;
      }
      if (data.data?.success) {
        toast.success(data.data.message || 'Omie respondendo normalmente!');
      } else {
        toast.error(data.data?.message || 'Omie não respondeu ao teste de comunicação.');
      }
    } catch {
      toast.error('Não foi possível testar a conexão com o Omie.');
    }
  };

  return {
    omieConnections,
    omieLabelInput,
    setOmieLabelInput,
    omieAppKeyInput,
    setOmieAppKeyInput,
    omieAppSecretInput,
    setOmieAppSecretInput,
    omieLoading,
    handleOmieConnect,
    handleOmieDisconnect,
    handleOmieTest,
  };
}
