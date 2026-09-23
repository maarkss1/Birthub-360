/**
 * HubSpotProvider — CRM connector para HubSpot (OAuth 2.0 + REST API v3).
 *
 * Autenticação: OAuth 2.0 com refresh automático de token.
 * Docs: https://developers.hubspot.com/docs/api/crm/contacts
 */

import {
  CrmConnectionConfig,
  CrmProvider,
  NormalizedLead,
  PushLeadResult,
  registerCrmProvider,
} from '../shared/CrmProvider';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

async function hubspotRequest<T>(
  path: string,
  config: CrmConnectionConfig,
  options: RequestInit = {}
): Promise<T> {
  const url = `${HUBSPOT_API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[HubSpot] ${res.status} ${res.statusText}: ${body}`);
  }

  return res.json() as Promise<T>;
}

function mapHubSpotDeal(deal: Record<string, unknown>): NormalizedLead {
  const props = (deal.properties ?? {}) as Record<string, unknown>;
  return {
    externalId: String(deal.id),
    name: String(props.dealname ?? 'Sem nome'),
    company: props.company_name ? String(props.company_name) : undefined,
    amount: props.amount ? Number(props.amount) : undefined,
    stageLabel: props.dealstage ? String(props.dealstage) : undefined,
    status: props.hs_deal_stage_probability ? 'open' : undefined,
    source: 'hubspot',
    metadata: { raw: props },
  };
}

const HubSpotProvider: CrmProvider = {
  providerKey: 'hubspot',
  displayName: 'HubSpot',
  authType: 'oauth2',

  async listLeads(config, lastImportedAt, cursor) {
    const params = new URLSearchParams({
      limit: '100',
      properties: 'dealname,amount,dealstage,company_name,closedate',
      ...(cursor ? { after: cursor } : {}),
    });

    if (lastImportedAt) {
      // HubSpot supports filter groups for incremental sync
      const body = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'hs_lastmodifieddate',
                operator: 'GTE',
                value: lastImportedAt.getTime().toString(),
              },
            ],
          },
        ],
        properties: ['dealname', 'amount', 'dealstage', 'company_name'],
        limit: 100,
        after: cursor,
      };

      const result = await hubspotRequest<{
        results: Record<string, unknown>[];
        paging?: { next?: { after?: string } };
      }>('/crm/v3/objects/deals/search', config, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return {
        leads: result.results.map(mapHubSpotDeal),
        nextCursor: result.paging?.next?.after,
      };
    }

    const result = await hubspotRequest<{
      results: Record<string, unknown>[];
      paging?: { next?: { after?: string } };
    }>(`/crm/v3/objects/deals?${params}`, config);

    return {
      leads: result.results.map(mapHubSpotDeal),
      nextCursor: result.paging?.next?.after,
    };
  },

  async pushLead(config, lead, externalId) {
    const properties = {
      dealname: lead.name,
      amount: lead.amount?.toString() ?? '',
      dealstage: lead.stageLabel ?? 'appointmentscheduled',
    };

    if (externalId) {
      await hubspotRequest(`/crm/v3/objects/deals/${externalId}`, config, {
        method: 'PATCH',
        body: JSON.stringify({ properties }),
      });
      return { externalId };
    }

    const created = await hubspotRequest<{ id: string }>(
      '/crm/v3/objects/deals',
      config,
      {
        method: 'POST',
        body: JSON.stringify({ properties }),
      }
    );

    return {
      externalId: created.id,
      url: `https://app.hubspot.com/contacts/${config.domain ?? ''}/deal/${created.id}`,
    };
  },

  async validateConnection(config) {
    try {
      await hubspotRequest('/crm/v3/objects/deals?limit=1', config);
      return true;
    } catch {
      return false;
    }
  },
};

// Auto-register on module load
registerCrmProvider(HubSpotProvider);

export { HubSpotProvider };
