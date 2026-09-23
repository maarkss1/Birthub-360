/**
 * RdStationProvider — CRM connector para RD Station CRM (OAuth 2.0).
 *
 * Autenticação: OAuth 2.0.
 * Docs: https://developers.rdstation.com/reference/deals
 */

import {
  type CrmConnectionConfig,
  type CrmProvider,
  type NormalizedLead,
  registerCrmProvider,
} from '../shared/CrmProvider';

const RDSTATION_API_BASE = 'https://crm.rdstation.com/api/v1';

async function rdRequest<T>(
  path: string,
  config: CrmConnectionConfig,
  options: RequestInit = {}
): Promise<T> {
  const token = config.accessToken ?? config.apiKey;
  const res = await fetch(`${RDSTATION_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[RD Station] ${res.status} ${res.statusText}: ${body}`);
  }

  return res.json() as Promise<T>;
}

function mapRdDeal(deal: Record<string, unknown>): NormalizedLead {
  return {
    externalId: String(deal._id ?? deal.id),
    name: String(deal.name ?? 'Sem nome'),
    amount: deal.amount_montly ? Number(deal.amount_montly) : undefined,
    stageLabel: deal.deal_stage
      ? String((deal.deal_stage as Record<string, unknown>).name ?? '')
      : undefined,
    status: String(deal.win ?? 'open'),
    company: deal.organization
      ? String((deal.organization as Record<string, unknown>).name ?? '')
      : undefined,
    source: 'rdstation',
    metadata: {
      campaignId: deal.campaign_id,
      userId: deal.user_id,
    },
  };
}

const RdStationProvider: CrmProvider = {
  providerKey: 'rdstation',
  displayName: 'RD Station',
  authType: 'oauth2',

  async listLeads(config, _lastImportedAt, cursor) {
    const page = cursor ? Number(cursor) : 1;
    const params = new URLSearchParams({
      page: String(page),
      limit: '100',
    });

    const result = await rdRequest<{
      deals: Record<string, unknown>[];
      total: number;
    }>(`/deals?${params}`, config);

    const deals = result.deals ?? [];
    const totalPages = Math.ceil((result.total ?? 0) / 100);
    const nextCursor = page < totalPages ? String(page + 1) : undefined;

    return {
      leads: deals.map(mapRdDeal),
      nextCursor,
    };
  },

  async pushLead(config, lead, externalId) {
    const body = {
      name: lead.name,
      amount_montly: lead.amount ?? 0,
    };

    if (externalId) {
      await rdRequest(`/deals/${externalId}`, config, {
        method: 'PUT',
        body: JSON.stringify({ deal: body }),
      });
      return { externalId };
    }

    const created = await rdRequest<{ deal: { _id: string } }>(
      '/deals',
      config,
      { method: 'POST', body: JSON.stringify({ deal: body }) }
    );

    return { externalId: created.deal._id };
  },

  async validateConnection(config) {
    try {
      await rdRequest('/users/me', config);
      return true;
    } catch {
      return false;
    }
  },
};

registerCrmProvider(RdStationProvider);
export { RdStationProvider };
