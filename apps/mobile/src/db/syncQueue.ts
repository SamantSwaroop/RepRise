import * as Crypto from 'expo-crypto';
import type { SyncEntityType, SyncOperation, SyncMutation } from '@reprise/shared';
import { getDatabase } from './database';

interface SyncQueueRow {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: string | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

export async function enqueueSyncMutation(
  userId: string,
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload?: any,
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Compaction check: look for pending mutations for this entity
  const existingRows = await db.getAllAsync<SyncQueueRow>(
    `SELECT * FROM sync_queue WHERE user_id = ? AND entity_type = ? AND entity_id = ? ORDER BY created_at ASC`,
    [userId, entityType, entityId],
  );

  if (existingRows.length > 0) {
    const lastRow = existingRows[existingRows.length - 1];

    // If an entity was created offline and is now deleted before syncing, delete the queue item entirely
    if (lastRow.operation === 'create' && operation === 'delete') {
      await db.runAsync(`DELETE FROM sync_queue WHERE user_id = ? AND entity_type = ? AND entity_id = ?`, [
        userId,
        entityType,
        entityId,
      ]);
      return;
    }

    // If created and now updated, update the payload of the existing create operation
    if (lastRow.operation === 'create' && operation === 'update') {
      const mergedPayload = {
        ...(lastRow.payload ? JSON.parse(lastRow.payload) : {}),
        ...payload,
      };
      await db.runAsync(
        `UPDATE sync_queue SET payload = ?, created_at = ? WHERE id = ?`,
        [JSON.stringify(mergedPayload), now, lastRow.id],
      );
      return;
    }

    // If updated and updated again, merge payload
    if (lastRow.operation === 'update' && operation === 'update') {
      const mergedPayload = {
        ...(lastRow.payload ? JSON.parse(lastRow.payload) : {}),
        ...payload,
      };
      await db.runAsync(
        `UPDATE sync_queue SET payload = ?, created_at = ? WHERE id = ?`,
        [JSON.stringify(mergedPayload), now, lastRow.id],
      );
      return;
    }
  }

  // Otherwise insert new queue entry
  const id = Crypto.randomUUID();
  const payloadStr = payload !== undefined ? JSON.stringify(payload) : null;

  await db.runAsync(
    `INSERT INTO sync_queue (id, user_id, entity_type, entity_id, operation, payload, created_at, attempts)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [id, userId, entityType, entityId, operation, payloadStr, now],
  );

  notifyMutationListeners();
}

type MutationListener = () => void;
const _listeners: Set<MutationListener> = new Set();

export function onMutationEnqueued(listener: MutationListener): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

function notifyMutationListeners() {
  for (const listener of _listeners) {
    try {
      listener();
    } catch (e) {
      console.error('Error in mutation listener:', e);
    }
  }
}

export async function getPendingMutations(userId: string): Promise<SyncMutation[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SyncQueueRow>(
    `SELECT * FROM sync_queue WHERE user_id = ? ORDER BY created_at ASC`,
    [userId],
  );

  return rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type as SyncEntityType,
    entityId: row.entity_id,
    operation: row.operation as SyncOperation,
    payload: row.payload ? JSON.parse(row.payload) : undefined,
    timestamp: row.created_at,
  }));
}

export async function removeProcessedMutations(mutationIds: string[]): Promise<void> {
  if (mutationIds.length === 0) return;
  const db = await getDatabase();
  const placeholders = mutationIds.map(() => '?').join(', ');
  await db.runAsync(
    `DELETE FROM sync_queue WHERE id IN (${placeholders})`,
    mutationIds,
  );
}

export async function getPendingCount(userId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM sync_queue WHERE user_id = ?`,
    [userId],
  );
  return row?.cnt ?? 0;
}

export async function getLastSyncedAt(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'last_synced_at'`,
  );
  return row ? row.value : null;
}

export async function setLastSyncedAt(timestamp: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_synced_at', ?)`,
    [timestamp],
  );
}

export async function clearSyncData(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM sync_queue`);
  await db.runAsync(`DELETE FROM sync_meta WHERE key = 'last_synced_at'`);
}
