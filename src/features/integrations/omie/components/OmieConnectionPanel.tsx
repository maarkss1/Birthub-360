import { Card } from '../../../../components/ui/Card';
import { useAuth } from '../../../../contexts/AuthContext';
import { hasRequiredRole } from '../../../../lib/auth/authorization';
import { useOmieIntegration } from '../../../../hooks/useOmieIntegration';

type CapabilityStatus = 'connected' | 'pending';

const CAPABILITY_CLASS: Record<CapabilityStatus, string> = {
  connected:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
  pending: 'bg-surface-2 text-ink-2 border-line',
};

/** Pill de capacidade local a este painel — mesmo padrão de CapabilityPill em
 *  VoiceHubConnectionPanel.tsx/SlackConnectionPanel.tsx/StripeConnectionPanel.tsx. */
function CapabilityPill({ status, children }: { status: CapabilityStatus; children: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${CAPABILITY_CLASS[status]}`}
    >
      {children}
    </span>
  );
}

/** Card de conexão com o Omie (ERP/financeiro) — mesmo padrão de extração de
 *  VoiceHubConnectionPanel/SlackConnectionPanel/StripeConnectionPanel. */
export function OmieConnectionPanel() {
  const { currentUser } = useAuth();
  const canManage = !!currentUser && hasRequiredRole(currentUser.role, ['ADMIN', 'GESTOR']);

  const {
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
  } = useOmieIntegration();

  return (
    <Card className="glass-card p-8 border border-gray-100 shadow-sm rounded-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-100 dark:border-teal-500/20">
            <span className="text-2xl">🧾</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Omie</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Sincronização de clientes com o ERP/financeiro Omie (cadastro de cliente).
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1.5 text-xs font-bold rounded-lg ${omieConnections.length > 0 ? 'bg-success/15 text-success-active dark:text-success' : 'bg-surface-2 text-ink-2'}`}
        >
          {omieConnections.length > 0 ? 'Conectado' : 'Não conectado'}
        </span>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-line bg-surface-2 p-3 text-xs text-ink-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            <CapabilityPill status={omieConnections.length > 0 ? 'connected' : 'pending'}>
              {omieConnections.length > 0 ? 'conectado' : 'desconectado'}
            </CapabilityPill>
            <CapabilityPill status="pending">cadastro de cliente</CapabilityPill>
          </div>
          <p>
            As credenciais são validadas de verdade contra a API do Omie ao conectar (consulta de
            clientes). Cadastro automático de cliente ainda não está disparado por nenhum fluxo do
            produto — disponível como ação manual/via API.
          </p>
        </div>

        {omieConnections.length > 0 && (
          <div className="space-y-3">
            {omieConnections.map((conn) => (
              <div
                key={conn.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-line bg-surface shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-ink">{conn.label}</p>
                    <p className="text-xs text-ink-2 font-mono">••••{conn.appKeyLast4}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOmieTest(conn.id)}
                    disabled={!canManage}
                    title={canManage ? undefined : 'Requer permissão de Gestor ou Administrador'}
                    className="px-3 py-2 text-xs font-bold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-500/20 rounded-lg transition-colors border border-teal-100 dark:border-teal-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Testar conexão
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOmieDisconnect(conn.id)}
                    disabled={omieLoading || !canManage}
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
            {omieConnections.length > 0 ? 'Conectar outra conta Omie' : 'Conectar Omie'}
          </p>
          <div className="space-y-3">
            <div>
              <label htmlFor="omie-label" className="block text-xs font-semibold text-ink-2 mb-1">
                Nome de exibição
              </label>
              <input
                id="omie-label"
                type="text"
                value={omieLabelInput}
                onChange={(e) => setOmieLabelInput(e.target.value)}
                placeholder="Nome de exibição (ex.: Omie Financeiro)"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>
            <div>
              <label htmlFor="omie-app-key" className="block text-xs font-semibold text-ink-2 mb-1">
                Chave de Integração (App Key)
              </label>
              <input
                id="omie-app-key"
                type="text"
                value={omieAppKeyInput}
                onChange={(e) => setOmieAppKeyInput(e.target.value)}
                placeholder="App Key do Omie"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>
            <div>
              <label
                htmlFor="omie-app-secret"
                className="block text-xs font-semibold text-ink-2 mb-1"
              >
                App Secret
              </label>
              <input
                id="omie-app-secret"
                type="password"
                value={omieAppSecretInput}
                onChange={(e) => setOmieAppSecretInput(e.target.value)}
                placeholder="App Secret do Omie"
                autoComplete="off"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleOmieConnect}
            disabled={omieLoading || !canManage}
            title={canManage ? undefined : 'Requer permissão de Gestor ou Administrador'}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {omieLoading ? 'Validando credenciais...' : 'Conectar Omie'}
          </button>
        </div>
      </div>
    </Card>
  );
}
