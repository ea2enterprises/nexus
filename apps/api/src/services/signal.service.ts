import { sql } from '../db/client.js';

export async function getActiveSignals(limit = 20, offset = 0) {
  return sql`
    SELECT * FROM signals
    WHERE status = 'active'
      AND (start_time + (expiration_seconds || ' seconds')::interval) > NOW()
    ORDER BY start_time DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

export async function getSignalById(signalId: string) {
  const results = await sql`
    SELECT * FROM signals WHERE id = ${signalId} OR signal_id = ${signalId}
  `;
  return results[0] || null;
}

export async function expireOldSignals() {
  return sql`
    UPDATE signals SET status = 'expired'
    WHERE status = 'active'
      AND (start_time + (expiration_seconds || ' seconds')::interval) < NOW()
  `;
}

export async function markSignalExecuted(signalId: string) {
  return sql`
    UPDATE signals SET status = 'executed'
    WHERE (id = ${signalId} OR signal_id = ${signalId}) AND status = 'active'
    RETURNING *
  `;
}
