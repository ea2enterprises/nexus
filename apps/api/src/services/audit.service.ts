import { sql } from '../db/client.js';

export async function logAuditEvent(
  userId: string | null,
  eventType: string,
  eventData: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  await sql`
    INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
    VALUES (${userId}, ${eventType}, ${JSON.stringify(eventData)}, ${ipAddress || null}, ${userAgent || null})
  `;
}

export async function getAuditLog(userId: string, limit = 50, offset = 0) {
  return sql`
    SELECT * FROM audit_log
    WHERE user_id = ${userId}
    ORDER BY timestamp DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}
