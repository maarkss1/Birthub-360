import { useCallback, useEffect, useState } from 'react';
import { toast } from '../lib/toast';
import { clientLogger } from '../lib/clientLogger';

interface StripeConnection {
  id: string;
  label: string;
  secretKeyLast4: string;
}

/** Estado/ações das conexões Stripe na tela de Integrações — mesmo padrão de use3CXIntegration.ts. */
export function useStripeIntegration() {
  const [stripeConnections, setStripeConnections] = useState<StripeConnection[]>([]);
  const [stripeLabelInput, setStripeLabelInput] = useState('');
  const [stripeSecretKeyInput, setStripeSecretKeyInput] = useState('');
  const [stripeLoading, setStripeLoading] = useState(false);

  const fetchStripeConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/stripe/connections');
      const data = await res.json();
      if (data.success) {
        setStripeConnections(data.data);
      }
    } catch (error) {
      clientLogger.error({ err: error }, 'Failed to fetch Stripe connections');
    }
  }, []);

  useEffect(() => {
    fetchStripeConnections();
  }, [fetchStripeConnections]);

  const handleStripeConnect = async () => {
    if (!stripeSecretKeyInput.trim()) {
      toast.error('Informe a chave secreta da API do Stripe.');
      return;
    }
    setStripeLoading(true);
    try {
      const res = await fetch('/api/integrations/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: stripeLabelInput || undefined,
          secretKey: stripeSecretKeyInput,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao conectar Stripe.');
      }
      toast.success('Stripe conectado com sucesso!');
      setStripeLabelInput('');
      setStripeSecretKeyInput('');
      fetchStripeConnections();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setStripeLoading(false);
    }
  };

  const handleStripeDisconnect = async (id: string) => {
    setStripeLoading(true);
    try {
      const res = await fetch(`/api/integrations/stripe/disconnect/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Erro ao desconectar Stripe.');
        return;
      }
      toast.success('Stripe desconectado.');
      fetchStripeConnections();
    } catch {
      toast.error('Erro ao desconectar Stripe.');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleStripeTest = async (id: string) => {
    try {
      const res = await fetch(`/api/integrations/stripe/connections/${id}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Não foi possível testar a conexão com o Stripe.');
        return;
      }
      if (data.data?.success) {
        toast.success(data.data.message || 'Stripe respondendo normalmente!');
      } else {
        toast.error(data.data?.message || 'Stripe não respondeu ao teste de comunicação.');
      }
    } catch {
      toast.error('Não foi possível testar a conexão com o Stripe.');
    }
  };

  return {
    stripeConnections,
    stripeLabelInput,
    setStripeLabelInput,
    stripeSecretKeyInput,
    setStripeSecretKeyInput,
    stripeLoading,
    handleStripeConnect,
    handleStripeDisconnect,
    handleStripeTest,
  };
}
