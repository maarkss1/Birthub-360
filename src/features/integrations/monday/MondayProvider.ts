/**
 * MondayProvider — CRM connector para Monday.com (API Key / GraphQL).
 *
 * Autenticação: API Token via Authorization header.
 * Docs: https://developer.monday.com/api-reference/reference
 */

import {
  type CrmConnectionConfig,
  type CrmProvider,
  type NormalizedLead,
  registerCrmProvider,
} from '../shared/CrmProvider.js';

const MONDAY_API_URL = 'https://api.monday.com/v2';

async function mondayQuery<T>(
  query: string,
  variables: Record<string, unknown>,
  config: CrmConnectionConfig,
): Promise<T> {
  const token = config.apiKey ?? config.accessToken;
  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      Authorization: token ?? '',
      'Content-Type': 'application/json',
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[Monday] ${res.status} ${res.statusText}: ${body}`);
  }

  const json = (await res.json()) as { data: T; errors?: unknown[] };
  if (json.errors?.length) {
    throw new Error(`[Monday] GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

function mapMondayItem(item: Record<string, unknown>): NormalizedLead {
  const cols = (item.column_values as Record<string, unknown>[]) ?? [];
  const get = (id: string): string | undefined => {
    const val = cols.find((c) => c.id === id)?.text;
    return typeof val === 'string' ? val : undefined;
  };

  return {
    externalId: String(item.id),
    name: String(item.name ?? 'Sem nome'),
    email: get('email'),
    phone: get('phone'),
    company: get('company'),
    amount: get('deal_value') ? Number(get('deal_value')) : undefined,
    stageLabel: get('status'),
    source: 'monday',
    metadata: { boardId: item.board ? (item.board as Record<string, unknown>).id : undefined },
  };
}

const MondayProvider: CrmProvider = {
  providerKey: 'monday',
  displayName: 'Monday.com',
  authType: 'api_key',

  async listLeads(config, _lastImportedAt, cursor) {
    const boardId = config.boardId;
    if (!boardId) {
      throw new Error('[Monday] boardId is required in connection config');
    }

    const page = cursor ? Number(cursor) : 1;

    const query = `
      query ($boardId: [ID!], $page: Int) {
        boards(ids: $boardId, limit: 1) {
          items_page(limit: 100, page: $page) {
            cursor
            items {
              id
              name
              column_values {
                id
                text
              }
            }
          }
        }
      }
    `;

    const result = await mondayQuery<{
      boards: {
        items_page: {
          cursor?: string;
          items: Record<string, unknown>[];
        };
      }[];
    }>(query, { boardId: [boardId], page }, config);

    const items = result.boards?.[0]?.items_page?.items ?? [];
    const nextCursor = result.boards?.[0]?.items_page?.cursor ? String(page + 1) : undefined;

    return {
      leads: items.map(mapMondayItem),
      nextCursor,
    };
  },

  async pushLead(config, lead, externalId) {
    const boardId = config.boardId;
    if (!boardId) throw new Error('[Monday] boardId is required');

    if (externalId) {
      const mutation = `
        mutation ($itemId: ID!, $columnValues: JSON!) {
          change_multiple_column_values(item_id: $itemId, board_id: ${boardId}, column_values: $columnValues) { id }
        }
      `;
      const columnValues = JSON.stringify({ status: { label: lead.stageLabel ?? 'Lead' } });
      await mondayQuery(mutation, { itemId: externalId, columnValues }, config);
      return { externalId };
    }

    const mutation = `
      mutation ($boardId: ID!, $itemName: String!) {
        create_item(board_id: $boardId, item_name: $itemName) { id }
      }
    `;

    const result = await mondayQuery<{ create_item: { id: string } }>(
      mutation,
      { boardId, itemName: lead.name },
      config,
    );

    return {
      externalId: result.create_item.id,
      url: `https://monday.com/boards/${boardId}/pulses/${result.create_item.id}`,
    };
  },

  async validateConnection(config) {
    try {
      const query = `{ me { id name } }`;
      await mondayQuery(query, {}, config);
      return true;
    } catch {
      return false;
    }
  },
};

registerCrmProvider(MondayProvider);
export { MondayProvider };
