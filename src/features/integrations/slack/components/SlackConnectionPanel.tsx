import { Card } from '../../../../components/ui/Card';
import { useAuth } from '../../../../contexts/AuthContext';
import { hasRequiredRole } from '../../../../lib/auth/authorization';
import { useSlackIntegration } from '../../../../hooks/useSlackIntegration';

type CapabilityStatus = 'connected' | 'pending';

const CAPABILITY_CLASS: Record<CapabilityStatus, string> = {
  connected:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
  pending: 'bg-surface-2 text-ink-2 border-line',
};

/** Pill de capacidade local a este painel — mesmo padrão de CapabilityPill em
 *  VoiceHubConnectionPanel.tsx (sem importar de Integrations.tsx, evita reintroduzir o
 *  acoplamento que motivou a extração dos painéis de integração para seus próprios módulos). */
function CapabilityPill({ status, children }: { status: CapabilityStatus; children: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${CAPABILITY_CLASS[status]}`}
    >
      {children}
    </span>
  );
}

/** Card de conexão com o Slack (Incoming Webhook ou Bot Token) — mesmo padrão de extração de
 *  VoiceHubConnectionPanel/BitrixImportPanel: self-contido, resolve seu próprio `canManage` e
 *  estado via hook. */
export function SlackConnectionPanel() {
  const { currentUser } = useAuth();
  const canManage = !!currentUser && hasRequiredRole(currentUser.role, ['ADMIN', 'GESTOR']);

  const {
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
  } = useSlackIntegration();

  return (
    <Card className="glass-card p-8 border border-gray-100 shadow-sm rounded-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 rounded-xl border border-fuchsia-100 dark:border-fuchsia-500/20">
            <span className="text-2xl">💬</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Slack</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Envia notificações/alertas para um canal do Slack via Incoming Webhook ou Bot Token.
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1.5 text-xs font-bold rounded-lg ${slackConnections.length > 0 ? 'bg-success/15 text-success-active dark:text-success' : 'bg-surface-2 text-ink-2'}`}
        >
          {slackConnections.length > 0 ? 'Conectado' : 'Não conectado'}
        </span>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-line bg-surface-2 p-3 text-xs text-ink-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            <CapabilityPill status={slackConnections.length > 0 ? 'connected' : 'pending'}>
              {slackConnections.length > 0 ? 'conectado' : 'desconectado'}
            </CapabilityPill>
            <CapabilityPill status="pending">envio real de mensagem</CapabilityPill>
          </div>
          <p>
            &ldquo;Testar&rdquo; envia uma mensagem real ao canal configurado — se não chegar no
            Slack, a conexão não está funcionando.
          </p>
        </div>

        {slackConnections.length > 0 && (
          <div className="space-y-3">
            {slackConnections.map((conn) => (
              <div
                key={conn.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-line bg-surface shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-ink">{conn.label}</p>
                    <p className="text-xs text-ink-2">
                      {conn.hasWebhook ? 'Incoming Webhook' : 'Bot Token'}
                      {conn.defaultChannel ? ` — ${conn.defaultChannel}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSlackTest(conn.id)}
                    disabled={!canManage}
                    title={canManage ? undefined : 'Requer permissão de Gestor ou Administrador'}
                    className="px-3 py-2 text-xs font-bold bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-500/20 rounded-lg transition-colors border border-fuchsia-100 dark:border-fuchsia-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Testar conexão
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSlackDisconnect(conn.id)}
                    disabled={slackLoading || !canManage}
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
            {slackConnections.length > 0 ? 'Conectar outro canal Slack' : 'Conectar Slack'}
          </p>
          <div className="space-y-3">
            <div>
              <label htmlFor="slack-label" className="block text-xs font-semibold text-ink-2 mb-1">
                Nome de exibição
              </label>
              <input
                id="slack-label"
                type="text"
                value={slackLabelInput}
                onChange={(e) => setSlackLabelInput(e.target.value)}
                placeholder="Nome de exibição (ex.: Alertas Comerciais)"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition-all"
              />
            </div>
            <div>
              <label
                htmlFor="slack-webhook"
                className="block text-xs font-semibold text-ink-2 mb-1"
              >
                URL do Incoming Webhook
              </label>
              <input
                id="slack-webhook"
                type="url"
                value={slackWebhookInput}
                onChange={(e) => setSlackWebhookInput(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition-all"
              />
            </div>
            <p className="text-xs text-ink-2">— ou, para escolher o canal por chamada —</p>
            <div>
              <label
                htmlFor="slack-bot-token"
                className="block text-xs font-semibold text-ink-2 mb-1"
              >
                Bot User OAuth Token
              </label>
              <input
                id="slack-bot-token"
                type="password"
                value={slackBotTokenInput}
                onChange={(e) => setSlackBotTokenInput(e.target.value)}
                placeholder="xoxb-..."
                autoComplete="off"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition-all"
              />
            </div>
            <div>
              <label
                htmlFor="slack-default-channel"
                className="block text-xs font-semibold text-ink-2 mb-1"
              >
                Canal padrão (com Bot Token)
              </label>
              <input
                id="slack-default-channel"
                type="text"
                value={slackDefaultChannelInput}
                onChange={(e) => setSlackDefaultChannelInput(e.target.value)}
                placeholder="#vendas-alertas"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition-all"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSlackConnect}
            disabled={slackLoading || !canManage}
            title={canManage ? undefined : 'Requer permissão de Gestor ou Administrador'}
            className="w-full py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {slackLoading ? 'Conectando...' : 'Conectar Slack'}
          </button>
        </div>
      </div>
    </Card>
  );
}
