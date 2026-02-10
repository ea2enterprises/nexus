import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.js';
import { authenticate } from '../middleware/auth.js';

export async function brokerRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // ─── GET /broker/connections ──────────────────────────────
  app.get('/connections', async (request, reply) => {
    const userId = request.user.sub;

    const connections = await sql`
      SELECT id, broker_name, account_id, auth_type, connection_status,
             auto_execution_enabled, last_health_check_at, created_at
      FROM broker_connections WHERE user_id = ${userId}
    `;

    return reply.send({ success: true, data: connections });
  });

  // ─── POST /broker/connections — Add mock broker ──────────
  app.post('/connections', async (request, reply) => {
    const userId = request.user.sub;
    const { broker_name, account_id } = request.body as {
      broker_name: string; account_id?: string;
    };

    const genAccountId = account_id || `MOCK-${Date.now().toString(36).toUpperCase()}`;

    const [connection] = await sql`
      INSERT INTO broker_connections (user_id, broker_name, account_id, auth_type, connection_status, auto_execution_enabled)
      VALUES (${userId}, ${broker_name || 'mock'}, ${genAccountId}, 'api_key', 'connected', true)
      RETURNING *
    `;

    return reply.status(201).send({ success: true, data: connection });
  });

  // ─── DELETE /broker/connections/:id ───────────────────────
  app.delete('/connections/:id', async (request, reply) => {
    const userId = request.user.sub;
    const { id } = request.params as { id: string };

    // Check for open positions
    const openTrades = await sql`
      SELECT COUNT(*) as count FROM trades
      WHERE user_id = ${userId} AND broker_connection_id = ${id} AND exit_time IS NULL
    `;

    if (Number(openTrades[0].count) > 0) {
      return reply.status(400).send({
        success: false,
        error: 'Cannot remove broker with open positions',
      });
    }

    await sql`DELETE FROM broker_connections WHERE id = ${id} AND user_id = ${userId}`;

    return reply.send({ success: true, message: 'Broker connection removed' });
  });

  // ─── PATCH /broker/connections/:id/toggle ─────────────────
  app.patch('/connections/:id/toggle', async (request, reply) => {
    const userId = request.user.sub;
    const { id } = request.params as { id: string };

    const [connection] = await sql`
      UPDATE broker_connections
      SET auto_execution_enabled = NOT auto_execution_enabled, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (!connection) {
      return reply.status(404).send({ success: false, error: 'Connection not found' });
    }

    return reply.send({ success: true, data: connection });
  });
}
