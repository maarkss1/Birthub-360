/**
 * ExternalCrmPanel — Painel genérico de conexão para CRMs externos.
 * Suporta HubSpot, Pipedrive, RD Station e Monday.com.
 * Exibe lista de conexões ativas + formulário de adicionar nova conexão.
 */

import { KeyRound, Link2, Loader2, PlusCircle, RefreshCw, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface CrmConnection {
  id: string;
  provider: string;
  label: string;
  inboundEventsEnabled: boolean;
  createdAt: string;
}

interface ExternalCrmPanelProps {
  providerKey: 'hubspot' | 'pipedrive' | 'rdstation' | 'monday';
  displayName: string;
  authType: 'oauth2' | 'api_key';
  iconSrc?: string;
  organizationId?: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  hubspot: 'text-orange-500',
  pipedrive: 'text-green-500',
  rdstation: 'text-blue-500',
  monday: 'text-[#F62B54]',
};

const PROVIDER_EMOJIS: Record<string, string> = {
  hubspot: '🟠',
  pipedrive: '🟢',
  rdstation: '🔵',
  monday: '🔴',
};

export function ExternalCrmPanel({
  providerKey,
  displayName,
  authType,
}: ExternalCrmPanelProps) {
  const [connections, setConnections] = useState<CrmConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formLabel, setFormLabel] = useState('');
  const [formToken, setFormToken] = useState('');
  const [formDomain, setFormDomain] = useState('');
  const [formBoardId, setFormBoardId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorClass = PROVIDER_COLORS[providerKey] ?? 'text-indigo-500';
  const emoji = PROVIDER_EMOJIS[providerKey] ?? '🔌';

  async function fetchConnections() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/integrations/external-crm?provider=${providerKey}`,
        { method: 'GET' }
      );
      if (!res.ok) throw new Error('Erro ao carregar conexões');
      const data = (await res.json()) as CrmConnection[];
      setConnections(data);
      setLoadedOnce(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const config: Record<string, string> = {};
      if (authType === 'api_key') config.apiKey = formToken;
      else config.accessToken = formToken;
      if (formDomain) config.domain = formDomain;
      if (formBoardId) config.boardId = formBoardId;

      const res = await fetch('/api/integrations/external-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerKey,
          label: formLabel || displayName,
          config,
        }),
      });

      if (!res.ok) throw new Error('Erro ao salvar conexão');

      setShowForm(false);
      setFormLabel('');
      setFormToken('');
      setFormDomain('');
      setFormBoardId('');
      await fetchConnections();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar conexão');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(connectionId: string) {
    if (!confirm(`Remover conexão com ${displayName}?`)) return;
    setLoading(true);
    try {
      await fetch(`/api/integrations/external-crm/${connectionId}`, { method: 'DELETE' });
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    } catch {
      setError('Erro ao remover conexão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-line">
        <div className="flex items-center gap-2.5">
          <span className="text-xl" aria-hidden>{emoji}</span>
          <h3 className={`font-semibold text-base ${colorClass}`}>{displayName}</h3>
        </div>
        <div className="flex items-center gap-2">
          {!loadedOnce && (
            <button
              type="button"
              onClick={fetchConnections}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-1 px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:bg-surface-2 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Link2 className="size-3.5" />
              )}
              Carregar conexões
            </button>
          )}
          {loadedOnce && (
            <button
              type="button"
              onClick={fetchConnections}
              disabled={loading}
              className="rounded-lg border border-line bg-surface-1 p-1.5 text-ink-3 transition hover:bg-surface-2 disabled:opacity-60"
              title="Recarregar"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand/90"
          >
            {showForm ? <X className="size-3.5" /> : <PlusCircle className="size-3.5" />}
            {showForm ? 'Cancelar' : 'Conectar'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-line bg-surface-2 p-4 space-y-3"
        >
          <h4 className="text-sm font-medium text-ink-1">Nova conexão com {displayName}</h4>

          <div>
            <label htmlFor="crm-conn-label" className="mb-1 block text-xs font-medium text-ink-2">
              Nome da conexão (opcional)
            </label>
            <input
              id="crm-conn-label"
              type="text"
              placeholder={`Ex: ${displayName} Principal`}
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-ink-1 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div>
            <label htmlFor="crm-conn-token" className="mb-1 block text-xs font-medium text-ink-2">
              {authType === 'api_key' ? (
                <span className="flex items-center gap-1">
                  <KeyRound className="size-3" />
                  API Token / Chave de Acesso
                </span>
              ) : (
                'Access Token (OAuth)'
              )}
            </label>
            <input
              id="crm-conn-token"
              type="password"
              required
              placeholder={authType === 'api_key' ? 'sk_live_...' : 'Bearer token...'}
              value={formToken}
              onChange={(e) => setFormToken(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm font-mono text-ink-1 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {(providerKey === 'hubspot' || providerKey === 'pipedrive') && (
            <div>
              <label htmlFor="crm-conn-domain" className="mb-1 block text-xs font-medium text-ink-2">
                Portal / Domínio (opcional)
              </label>
              <input
                id="crm-conn-domain"
                type="text"
                placeholder="Ex: meuportal.pipedrive.com"
                value={formDomain}
                onChange={(e) => setFormDomain(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-ink-1 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          )}

          {providerKey === 'monday' && (
            <div>
              <label htmlFor="crm-conn-board" className="mb-1 block text-xs font-medium text-ink-2">
                ID do Quadro (Board ID)
              </label>
              <input
                id="crm-conn-board"
                type="text"
                required
                placeholder="Ex: 1234567890"
                value={formBoardId}
                onChange={(e) => setFormBoardId(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm font-mono text-ink-1 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand/90 disabled:opacity-60"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar conexão'}
          </button>
        </form>
      )}

      {/* Connection list */}
      {loadedOnce && (
        <div className="space-y-2">
          {connections.length === 0 ? (
            <p className="rounded-lg bg-surface-2 px-4 py-3 text-sm text-ink-3">
              Nenhuma conexão configurada. Clique em &quot;Conectar&quot; para adicionar.
            </p>
          ) : (
            connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between rounded-lg border border-line bg-surface-1 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink-1">{conn.label}</p>
                  <p className="text-xs text-ink-3">
                    Conectado em{' '}
                    {new Date(conn.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(conn.id)}
                  className="rounded-lg border border-red-200 p-1.5 text-red-500 transition hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
                  title="Remover conexão"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
