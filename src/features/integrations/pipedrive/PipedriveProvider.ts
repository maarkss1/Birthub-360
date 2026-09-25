/**
 * PipedriveProvider — CRM connector para Pipedrive (API Key ou OAuth 2.0).
 *
 * Autenticação: API Token via query param `api_token` (mais simples) ou OAuth.
 * Docs: https://developers.pipedrive.com/docs/api/v1
 */

import {
  type CrmConnectionConfig,
  type CrmProvider,
  type NormalizedLead,
  registerCrmProvider,
} from '../shared/CrmProvider.js';

const PIPEDRIVE_BASE = 'https://api.pipedrive.com/v1';

async function pipedriveRequest<T>(
  path: string,
  config: CrmConnectionConfig,
  options: RequestInit = {},
): Promise<T> {
  const separator = path.includes('?') ? '&' : '?';
  const token = config.apiKey ?? config.accessToken;
  const url = `${PIPEDRIVE_BASE}${path}${separator}api_token=${token}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[Pipedrive] ${res.status} ${res.statusText}: ${body}`);
  }

  const json = (await res.json()) as { success: boolean; data: T; additional_data?: unknown };
  if (!json.success) {
    throw new Error(`[Pipedrive] API returned success=false for ${path}`);
  }
  return json.data;
}

function mapPipedriveDeal(deal: Record<string, unknown>): NormalizedLead {
  return {
    externalId: String(deal.id),
    name: String(deal.title ?? 'Sem nome'),
    email: (deal.person_id as Record<string, unknown>)?.email
      ? String(((deal.person_id as Record<string, unknown>).email as unknown[])[0] ?? '')
      : undefined,
    company: deal.org_name ? String(deal.org_name) : undefined,
    amount: deal.value ? Number(deal.value) : undefined,
    stageLabel: deal.stage_name ? String(deal.stage_name) : undefined,
    status: deal.status ? String(deal.status) : undefined,
    source: 'pipedrive',
    metadata: {
      pipelineId: deal.pipeline_id,
      stageId: deal.stage_id,
      ownerId: deal.user_id,
    },
  };
}

const PipedriveProvider: CrmProvider = {
  providerKey: 'pipedrive',
  displayName: 'Pipedrive',
  authType: 'api_key',

  async listLeads(config, lastImportedAt, cursor) {
    const start = cursor ? Number(cursor) : 0;
    const params = new URLSearchParams({
      limit: '100',
      start: start.toString(),
      status: 'open',
    });

    if (lastImportedAt) {
      // Pipedrive supports `since_timestamp` filter
      params.set('since_timestamp', lastImportedAt.toISOString().split('T')[0]);
    }

    const data = await pipedriveRequest<Record<string, unknown>[]>(`/deals?${params}`, config);

    const deals = Array.isArray(data) ? data : [];
    const nextCursor = deals.length === 100 ? String(start + 100) : undefined;

    return {
      leads: deals.map(mapPipedriveDeal),
      nextCursor,
    };
  },

  async pushLead(config, lead, externalId) {
    const body = {
      title: lead.name,
      value: lead.amount,
      status: 'open',
    };

    if (externalId) {
      await pipedriveRequest(`/deals/${externalId}`, config, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      return { externalId };
    }

    const created = await pipedriveRequest<{ id: number }>('/deals', config, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      externalId: String(created.id),
      url: `https://app.pipedrive.com/deal/${created.id}`,
    };
  },

  async validateConnection(config) {
    try {
      await pipedriveRequest('/deals?limit=1', config);
      return true;
    } catch {
      return false;
    }
  },
};

registerCrmProvider(PipedriveProvider);
export { PipedriveProvider };
