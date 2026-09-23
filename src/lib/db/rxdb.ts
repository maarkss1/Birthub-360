import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

// Definindo o schema básico para leads offline
export const leadSchema = {
  title: 'crm_offline_schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    synced: { type: 'boolean' },
  },
  required: ['id', 'name'],
} as const;

export async function initOfflineDb() {
  const db = await createRxDatabase({
    name: 'birthhub360db',
    storage: getRxStorageDexie(), // O IndexedDB Storage
  });

  await db.addCollections({
    leads: {
      schema: leadSchema,
    },
  });

  return db;
}
