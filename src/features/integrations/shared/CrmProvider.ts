/**
 * CrmProvider — Interface genérica para provedores de CRM externos.
 * Todos os conectores (HubSpot, Pipedrive, RD Station, Monday) implementam esta interface.
 * O factory getCrmProvider() resolve a instância correta com base no `provider` do ExternalCrmConnection.
 */

export interface NormalizedLead {
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  status?: string;
  amount?: number;
  stageLabel?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface PushLeadResult {
  externalId: string;
  url?: string;
}

export interface CrmConnectionConfig {
  // OAuth providers
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  // API Key providers
  apiKey?: string;
  // Portal / domain
  domain?: string;
  // Monday.com board ID or similar provider-specific context
  boardId?: string;
  pipelineId?: string;
}

export interface CrmProvider {
  readonly providerKey: string;
  readonly displayName: string;
  readonly authType: 'oauth2' | 'api_key';

  /**
   * Pulls a page of leads/deals from the external CRM.
   * @param config Decrypted connection config
   * @param lastImportedAt Checkpoint for incremental sync (null = full import)
   * @param cursor Pagination cursor (provider-specific)
   */
  listLeads(
    config: CrmConnectionConfig,
    lastImportedAt: Date | null,
    cursor?: string
  ): Promise<{ leads: NormalizedLead[]; nextCursor?: string }>;

  /**
   * Pushes a single lead to the external CRM. Creates or updates.
   * @param config Decrypted connection config
   * @param lead Normalized lead payload
   * @param externalId If provided, attempts an update; otherwise, creates.
   */
  pushLead(
    config: CrmConnectionConfig,
    lead: NormalizedLead,
    externalId?: string
  ): Promise<PushLeadResult>;

  /**
   * Validates the credentials are still valid (e.g. token not expired).
   */
  validateConnection(config: CrmConnectionConfig): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const _registry: Map<string, CrmProvider> = new Map();

export function registerCrmProvider(provider: CrmProvider): void {
  _registry.set(provider.providerKey, provider);
}

export function getCrmProvider(providerKey: string): CrmProvider {
  const provider = _registry.get(providerKey);
  if (!provider) {
    throw new Error(
      `[CrmProvider] Provider "${providerKey}" not registered. ` +
        `Known providers: ${[..._registry.keys()].join(', ')}`
    );
  }
  return provider;
}

export function listCrmProviders(): CrmProvider[] {
  return [..._registry.values()];
}
