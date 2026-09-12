import { Copy } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { Label } from '../../../../components/ui/Label';
import { useAuth } from '../../../../contexts/AuthContext';
import { hasRequiredRole } from '../../../../lib/auth/authorization';
import { useVoiceHubIntegration } from '../../../../hooks/useVoiceHubIntegration';
import { VoiceCallActivity } from './VoiceCallActivity';

type CapabilityStatus = 'connected' | 'pending';

const CAPABILITY_CLASS: Record<CapabilityStatus, string> = {
  connected:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
  pending: 'bg-surface-2 text-ink-2 border-line',
};

/** Pill de capacidade local a este painel — mesmo estilo visual de `CapabilityBadge` em
 *  `Integrations.tsx`, sem importar de lá (evitaria reintroduzir o acoplamento que motivou esta
 *  extração: o card cresceu até estourar o limite de tamanho de arquivo do gate de arquitetura
 *  — "hotspot", ver docs/architecture/HOTSPOT_EXCEPTIONS.md — dentro de Integrations.tsx). */
function CapabilityPill({ status, children }: { status: CapabilityStatus; children: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${CAPABILITY_CLASS[status]}`}
    >
      {children}
    </span>
  );
}

/** Card de conexão com o Birth Voices Hub + atividade de chamadas — extraído de
 *  `Integrations.tsx` (que estava estourando o limite de 1000 linhas do gate de arquitetura,
 *  "hotspot") para o próprio módulo `integrations/birth-voice`, mesmo padrão de
 *  `BitrixImportPanel`/`BitrixSyncRulesPanel`/`WebhookMonitor`: self-contido, resolve seu próprio
 *  `canManage` e estado via hook, sem precisar de props do pai além do que já é implícito por
 *  estar montado dentro da tela de Integrações. */
export function VoiceHubConnectionPanel() {
  const { currentUser } = useAuth();
  const canManage = !!currentUser && hasRequiredRole(currentUser.role, ['ADMIN', 'GESTOR']);

  const {
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
    revealedWebhookSecret,
    revealedWebhookSecretConnectionId,
  } = useVoiceHubIntegration();

  return (
    <div className="space-y-4">
      <Card className="glass-card p-8 border border-gray-100 shadow-sm rounded-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl border border-violet-100 dark:border-violet-500/20">
              <span className="text-2xl">🎙️</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                SDR de Voz IA (Birth Voices Hub)
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Conexão usada para disparar ligações de voz por IA a partir do card do lead; sem
                conexão cadastrada aqui, o backend cai para as variáveis de ambiente do servidor.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${voiceHubConnections.some((c) => c.enabled) ? 'bg-success/15 text-success-active dark:text-success' : 'bg-surface-2 text-ink-2'}`}
            >
              {voiceHubConnections.some((c) => c.enabled) ? 'Conectado' : 'Não conectado'}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-line bg-surface-2 p-3 text-xs text-ink-2 space-y-2">
            <div className="flex flex-wrap gap-2">
              <CapabilityPill status={voiceHubConnections.length > 0 ? 'connected' : 'pending'}>
                {voiceHubConnections.length > 0
                  ? 'conexão cadastrada'
                  : 'usando env var do servidor (se configurada)'}
              </CapabilityPill>
              <CapabilityPill
                status={
                  voiceHubConnections.length > 0 && voiceHubConnections.every((c) => c.hasWebhookSecret)
                    ? 'connected'
                    : 'pending'
                }
              >
                {voiceHubConnections.length > 0 && voiceHubConnections.every((c) => c.hasWebhookSecret)
                  ? 'cada conexão tem segredo próprio de webhook'
                  : 'alguma conexão ainda depende do segredo global do servidor'}
              </CapabilityPill>
            </div>
            <p>
              &ldquo;Testar&rdquo; confirma só que a URL responde — nunca que a API key/agentId
              cadastrados são válidos (isso só se confirma na primeira ligação real).
            </p>
          </div>

          {voiceHubConnections.length > 0 && (
            <div className="space-y-3">
              {voiceHubConnections.map((conn) => (
                <div
                  key={conn.id}
                  className="p-4 rounded-xl border border-line bg-surface shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 ${conn.enabled ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300 dark:bg-gray-600'}`}
                      />
                      <div>
                        <p className="text-sm font-bold text-ink">{conn.label}</p>
                        <p className="text-xs text-ink-2">
                          {conn.baseUrl}
                          {conn.agentId ? ` — agente ${conn.agentId}` : ''}
                          {conn.hasApiKey ? '' : ' — sem API key cadastrada'}
                          {conn.hasWebhookSecret ? '' : ' — sem segredo de webhook próprio'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleVoiceHubTest(conn.id)}
                        disabled={!canManage}
                        title={canManage ? undefined : 'Requer permissão de Gestor ou Administrador'}
                        className="px-3 py-2 text-xs font-bold bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20 rounded-lg transition-colors border border-violet-100 dark:border-violet-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Testar conexão
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVoiceHubDisconnect(conn.id)}
                        disabled={voiceHubLoading || !canManage}
                        title={canManage ? undefined : 'Requer permissão de Gestor ou Administrador'}
                        className="px-3 py-2 text-xs font-bold text-danger-active dark:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Desconectar
                      </button>
                    </div>
                  </div>
                  {revealedWebhookSecret && revealedWebhookSecretConnectionId === conn.id && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 space-y-1.5">
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        Copie agora — este segredo só aparece uma vez:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono break-all text-amber-900 dark:text-amber-200">
                          {revealedWebhookSecret}
                        </code>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(revealedWebhookSecret)}
                          className="shrink-0 p-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-md transition-colors"
                          title="Copiar segredo"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="p-5 rounded-xl border border-dashed border-gray-300 dark:border-white/20 bg-gray-50/50 dark:bg-white/[0.03] space-y-4">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {voiceHubConnections.length > 0
                ? 'Conectar outro Birth Voices Hub'
                : 'Conectar Birth Voices Hub'}
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="voice-hub-label">Nome de exibição</Label>
                <input
                  id="voice-hub-label"
                  type="text"
                  value={voiceHubLabelInput}
                  onChange={(e) => setVoiceHubLabelInput(e.target.value)}
                  placeholder="Nome de exibição (ex.: Birth Voices Hub — Produção)"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                />
              </div>
              <div>
                <Label htmlFor="voice-hub-base-url">URL base</Label>
                <input
                  id="voice-hub-base-url"
                  type="url"
                  value={voiceHubBaseUrlInput}
                  onChange={(e) => setVoiceHubBaseUrlInput(e.target.value)}
                  placeholder="https://voices.suaempresa.com (ou https://api.bland.ai)"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                />
              </div>
              <div>
                <Label htmlFor="voice-hub-api-key">API key</Label>
                <input
                  id="voice-hub-api-key"
                  type="password"
                  value={voiceHubApiKeyInput}
                  onChange={(e) => setVoiceHubApiKeyInput(e.target.value)}
                  placeholder="API key (opcional aqui — cai para a env var do servidor se vazio)"
                  autoComplete="off"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                />
              </div>
              <div>
                <Label htmlFor="voice-hub-agent-id">Id do agente</Label>
                <input
                  id="voice-hub-agent-id"
                  type="text"
                  value={voiceHubAgentIdInput}
                  onChange={(e) => setVoiceHubAgentIdInput(e.target.value)}
                  placeholder="Id do agente de voz (não usado quando o Hub é a Bland AI)"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleVoiceHubConnect}
              disabled={voiceHubLoading || !canManage}
              title={canManage ? undefined : 'Requer permissão de Gestor ou Administrador'}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
            >
              {voiceHubLoading ? 'Conectando...' : 'Conectar Birth Voices Hub'}
            </button>
          </div>
        </div>
      </Card>

      <VoiceCallActivity />
    </div>
  );
}
