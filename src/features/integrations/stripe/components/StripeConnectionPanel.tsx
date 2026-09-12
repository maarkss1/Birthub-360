import { Card } from '../../../../components/ui/Card';
import { useAuth } from '../../../../contexts/AuthContext';
import { hasRequiredRole } from '../../../../lib/auth/authorization';
import { useStripeIntegration } from '../../../../hooks/useStripeIntegration';

type CapabilityStatus = 'connected' | 'pending';

const CAPABILITY_CLASS: Record<CapabilityStatus, string> = {
  connected:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
  pending: 'bg-surface-2 text-ink-2 border-line',
};

/** Pill de capacidade local a este painel — mesmo padrão de CapabilityPill em
 *  VoiceHubConnectionPanel.tsx/SlackConnectionPanel.tsx. */
function CapabilityPill({ status, children }: { status: CapabilityStatus; children: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${CAPABILITY_CLASS[status]}`}
    >
      {children}
    </span>
  );
}

/** Card de conexão com o Stripe (cobrança/consulta de pagamento) — mesmo padrão de extração de
 *  VoiceHubConnectionPanel/SlackConnectionPanel. */
export function StripeConnectionPanel() {
  const { currentUser } = useAuth();
  const canManage = !!currentUser && hasRequiredRole(currentUser.role, ['ADMIN', 'GESTOR']);

  const {
    stripeConnections,
    stripeLabelInput,
    setStripeLabelInput,
    stripeSecretKeyInput,
    setStripeSecretKeyInput,
    stripeLoading,
    handleStripeConnect,
    handleStripeDisconnect,
    handleStripeTest,
  } = useStripeIntegration();

  return (
    <Card className="glass-card p-8 border border-gray-100 shadow-sm rounded-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
            <span className="text-2xl">💳</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Stripe</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Cadastro da chave secreta da API do Stripe — cobrança e consulta de pagamento.
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1.5 text-xs font-bold rounded-lg ${stripeConnections.length > 0 ? 'bg-success/15 text-success-active dark:text-success' : 'bg-surface-2 text-ink-2'}`}
        >
          {stripeConnections.length > 0 ? 'Conectado' : 'Não conectado'}
        </span>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-line bg-surface-2 p-3 text-xs text-ink-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            <CapabilityPill status={stripeConnections.length > 0 ? 'connected' : 'pending'}>
              {stripeConnections.length > 0 ? 'conectado' : 'desconectado'}
            </CapabilityPill>
            <CapabilityPill status="pending">cobrança exige método de pagamento</CapabilityPill>
          </div>
          <p>
            A chave é validada de verdade contra a API do Stripe ao conectar. Criar uma cobrança
            sem um método de pagamento anexado fica &ldquo;requires_payment_method&rdquo; — o
            status refletido aqui é sempre o real, nunca fabricado.
          </p>
        </div>

        {stripeConnections.length > 0 && (
          <div className="space-y-3">
            {stripeConnections.map((conn) => (
              <div
                key={conn.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-line bg-surface shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-ink">{conn.label}</p>
                    <p className="text-xs text-ink-2 font-mono">••••{conn.secretKeyLast4}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStripeTest(conn.id)}
                    disabled={!canManage}
                    title={canManage ? undefined : 'Requer permissão de Gestor ou Administrador'}
                    className="px-3 py-2 text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Testar conexão
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStripeDisconnect(conn.id)}
                    disabled={stripeLoading || !canManage}
                    title={canManage ? undefined : 'Requer permissão de Gestor ou Administrador'}
                    className="px-3 py-2 text-xs font-bold text-danger-active dark:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Desconectar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-5 rounded-xl border border-dashed border-gray-300 dark:border-white/20 bg-gray-50/50 dark:bg-white/[0.03] space-y-4">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {stripeConnections.length > 0 ? 'Conectar outra chave Stripe' : 'Conectar Stripe'}
          </p>
          <div className="space-y-3">
            <div>
              <label htmlFor="stripe-label" className="block text-xs font-semibold text-ink-2 mb-1">
                Nome de exibição
              </label>
              <input
                id="stripe-label"
                type="text"
                value={stripeLabelInput}
                onChange={(e) => setStripeLabelInput(e.target.value)}
                placeholder="Nome de exibição (ex.: Stripe Produção)"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label
                htmlFor="stripe-secret-key"
                className="block text-xs font-semibold text-ink-2 mb-1"
              >
                Chave secreta da API
              </label>
              <input
                id="stripe-secret-key"
                type="password"
                value={stripeSecretKeyInput}
                onChange={(e) => setStripeSecretKeyInput(e.target.value)}
                placeholder="sk_live_... ou sk_test_..."
                autoComplete="off"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleStripeConnect}
            disabled={stripeLoading || !canManage}
            title={canManage ? undefined : 'Requer permissão de Gestor ou Administrador'}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {stripeLoading ? 'Validando chave...' : 'Conectar Stripe'}
          </button>
        </div>
      </div>
    </Card>
  );
}
