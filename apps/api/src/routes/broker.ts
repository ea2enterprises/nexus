import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.js';
import { authenticate } from '../middleware/auth.js';
import { brokerSession } from '../brokers/session.manager.js';

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

  // ─── POST /broker/connections — Add mock broker ───────────
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

  // ─── GET /broker/status — Live connection status ──────────
  app.get('/status', async (_request, reply) => {
    const status = brokerSession.getStatus();
    return reply.send({ success: true, data: status });
  });

  // ─── POST /broker/session — Submit / refresh SSID ─────────
  app.post('/session', async (request, reply) => {
    const userId = request.user.sub;
    const { ssid, is_demo = true } = request.body as { ssid: string; is_demo?: boolean };

    if (!ssid || typeof ssid !== 'string' || ssid.trim().length < 10) {
      return reply.status(400).send({ success: false, error: 'Invalid SSID' });
    }

    try {
      await brokerSession.connect(ssid.trim(), is_demo);

      // Upsert broker_connections record
      const existing = await sql`
        SELECT id FROM broker_connections
        WHERE user_id = ${userId} AND broker_name = 'pocket_option'
        LIMIT 1
      `;

      if (existing.length > 0) {
        await sql`
          UPDATE broker_connections
          SET encrypted_credentials = ${JSON.stringify({ ssid: ssid.trim(), isDemo: is_demo })},
              connection_status = 'connected',
              last_health_check_at = NOW(),
              updated_at = NOW()
          WHERE id = ${existing[0].id}
        `;
      } else {
        await sql`
          INSERT INTO broker_connections
            (user_id, broker_name, account_id, auth_type, encrypted_credentials,
             connection_status, auto_execution_enabled)
          VALUES
            (${userId}, 'pocket_option',
             ${is_demo ? 'DEMO' : 'LIVE'},
             'api_key',
             ${JSON.stringify({ ssid: ssid.trim(), isDemo: is_demo })},
             'connected', true)
        `;
      }

      return reply.send({
        success: true,
        data: {
          connected: true,
          isDemo: is_demo,
          message: `Connected to Pocket Option ${is_demo ? 'demo' : 'live'} account`,
        },
      });
    } catch (err) {
      // Mark as error in DB if exists
      await sql`
        UPDATE broker_connections
        SET connection_status = 'error', updated_at = NOW()
        WHERE user_id = ${userId} AND broker_name = 'pocket_option'
      `;

      const message = (err as Error).message;
      const isExpired = message.includes('SSID');
      return reply.status(400).send({
        success: false,
        error: isExpired ? 'SSID invalid or expired — please copy a fresh one from your browser' : message,
      });
    }
  });

  // ─── PATCH /broker/mode — Switch demo/live ────────────────
  app.patch('/mode', async (request, reply) => {
    const userId = request.user.sub;
    const { is_demo } = request.body as { is_demo: boolean };

    const status = brokerSession.getStatus();
    if (!status.connected || !status.hasSsid) {
      return reply.status(400).send({
        success: false,
        error: 'No active broker session. Submit SSID first.',
      });
    }

    // Re-connect with same SSID, different mode
    try {
      // Get SSID from DB
      const [conn] = await sql`
        SELECT encrypted_credentials FROM broker_connections
        WHERE user_id = ${userId} AND broker_name = 'pocket_option'
        LIMIT 1
      `;

      if (!conn) {
        return reply.status(404).send({ success: false, error: 'No Pocket Option connection found' });
      }

      const creds = JSON.parse(conn.encrypted_credentials);
      await brokerSession.connect(creds.ssid, is_demo);

      await sql`
        UPDATE broker_connections
        SET encrypted_credentials = ${JSON.stringify({ ...creds, isDemo: is_demo })},
            account_id = ${is_demo ? 'DEMO' : 'LIVE'},
            updated_at = NOW()
        WHERE user_id = ${userId} AND broker_name = 'pocket_option'
      `;

      return reply.send({
        success: true,
        data: { isDemo: is_demo, message: `Switched to ${is_demo ? 'demo' : 'live'} mode` },
      });
    } catch (err) {
      return reply.status(500).send({ success: false, error: (err as Error).message });
    }
  });
}
