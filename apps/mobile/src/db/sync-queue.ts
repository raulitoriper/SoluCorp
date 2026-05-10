import { getDatabase } from './database';
import { v4 as uuidv4 } from 'uuid';

export interface QueueItem {
  id: number;
  entity_type: string;
  endpoint: string;
  payload: string;
  idempotency_key: string;
  status: string;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  sent_at: string | null;
}

export async function enqueueOperation(entityType: string, endpoint: string, data: any, location?: { latitude: number; longitude: number }): Promise<string> {
  const db = await getDatabase();
  const idempotencyKey = uuidv4();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO sync_queue (entity_type, endpoint, payload, idempotency_key, status, latitude, longitude, created_at) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
    entityType, endpoint, JSON.stringify(data), idempotencyKey, location?.latitude ?? null, location?.longitude ?? null, now,
  );

  return idempotencyKey;
}

export async function getPendingItems(): Promise<QueueItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<QueueItem>(
    `SELECT * FROM sync_queue WHERE status IN ('PENDING', 'FAILED') AND retry_count < max_retries ORDER BY created_at ASC LIMIT 20`,
  );
}

export async function markSent(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE sync_queue SET status = 'SENT', sent_at = ? WHERE id = ?`, new Date().toISOString(), id);
}

export async function markFailed(id: number, error: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE sync_queue SET status = 'FAILED', retry_count = retry_count + 1, error_message = ? WHERE id = ?`, error, id);
}

export async function getQueueCounts(): Promise<{ pending: number; failed: number; sent: number }> {
  const db = await getDatabase();
  const result = await db.getAllAsync<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status`,
  );
  const counts = { pending: 0, failed: 0, sent: 0 };
  for (const row of result) {
    if (row.status === 'PENDING') counts.pending = row.count;
    else if (row.status === 'FAILED') counts.failed = row.count;
    else if (row.status === 'SENT') counts.sent = row.count;
  }
  return counts;
}

export async function clearSent(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM sync_queue WHERE status = 'SENT'`);
}
