import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.js';
import { authenticate } from '../middleware/auth.js';
import { signalSchema } from '@nexus/shared';
import crypto from 'crypto';

export async function signalRoutes(app: FastifyInstance) {
  // ─── GET /signals — Paginated signal list ────────────────
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { page = 1, limit = 20, status, instrument } = request.query as {
      page?: number; limit?: number; status?: string; instrument?: string;
    };
    const offset = (Number(page) - 1) * Number(limit);

    let query;
    if (status && instrument) {
      query = sql`
        SELECT * FROM signals
        WHERE status = ${status} AND instrument = ${instrument}
        ORDER BY timestamp_utc DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `;
    } else if (status) {
      query = sql`
        SELECT * FROM signals WHERE status = ${status}
        ORDER BY timestamp_utc DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `;
    } else if (instrument) {
      query = sql`
        SELECT * FROM signals WHERE instrument = ${instrument}
        ORDER BY timestamp_utc DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `;
    } else {
      query = sql`
        SELECT * FROM signals
        ORDER BY timestamp_utc DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `;
    }

    const signals = await query;
    const [{ count }] = await sql`SELECT COUNT(*) as count FROM signals`;

    return reply.send({
      success: true,
      data: signals,
      meta: { page: Number(page), limit: Number(limit), total: Number(count) },
    });
  });

  // ─── GET /signals/:id ────────────────────────────────────
  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const signals = await sql`SELECT * FROM signals WHERE id = ${id} OR signal_id = ${id}`;

    if (signals.length === 0) {
      return reply.status(404).send({ success: false, error: 'Signal not found' });
    }

    return reply.send({ success: true, data: signals[0] });
  });

  // ─── POST /signals — Internal endpoint from signal engine ─
  app.post('/', async (request, reply) => {
    // Validate API key for internal service
    const apiKey = request.headers['x-api-key'];
    if (apiKey !== process.env.SIGNAL_ENGINE_API_KEY && apiKey !== 'dev-signal-key') {
      return reply.status(403).send({ success: false, error: 'Invalid API key' });
    }

    const parsed = signalSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const data = parsed.data;
    const signal_id = `NXS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${data.instrument.replace('/', '-')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const [signal] = await sql`
      INSERT INTO signals (
        signal_id, instrument, direction, signal_type, confidence,
        confirming_strategies, entry_type, entry_price, valid_until,
        stop_loss, take_profits, risk_reward, position_size_percent, meta, status
      ) VALUES (
        ${signal_id}, ${data.instrument}, ${data.direction}, ${data.signal_type},
        ${data.confidence}, ${JSON.stringify(data.confirming_strategies)},
        ${data.entry.type}, ${data.entry.price}, ${data.entry.valid_until},
        ${data.stop_loss}, ${JSON.stringify(data.take_profits)},
        ${data.risk_reward}, ${data.position_size_percent},
        ${JSON.stringify(data.meta)}, 'active'
      )
      RETURNING *
    `;

    // Broadcast via Socket.IO
    const io = (app as any).io;
    if (io) {
      io.emit('signal:new', signal);
    }

    return reply.status(201).send({ success: true, data: signal });
  });
}
