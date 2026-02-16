import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.js';
import { authenticate } from '../middleware/auth.js';
import { signalSchema } from '@nexus/shared';
import crypto from 'crypto';

export async function signalRoutes(app: FastifyInstance) {
  // ─── GET /signals — Paginated signal list with filters ─────
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { page = 1, limit = 20, status, instrument, direction, signal_type, sort = 'time_desc' } = request.query as {
      page?: number; limit?: number; status?: string; instrument?: string;
      direction?: string; signal_type?: string; sort?: string;
    };
    const offset = (Number(page) - 1) * Number(limit);

    // Build dynamic conditions
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (status) conditions.push(`status = '${status}'`);
    if (instrument) conditions.push(`instrument = '${instrument}'`);
    if (direction) conditions.push(`direction = '${direction}'`);
    if (signal_type) conditions.push(`signal_type = '${signal_type}'`);

    const orderBy = sort === 'confidence_desc' ? 'confidence DESC' : 'timestamp_utc DESC';

    let query;
    if (status && instrument) {
      query = sql`
        SELECT * FROM signals
        WHERE status = ${status} AND instrument = ${instrument}
        ORDER BY start_time DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `;
    } else if (status) {
      query = sql`
        SELECT * FROM signals WHERE status = ${status}
        ORDER BY start_time DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `;
    } else if (instrument) {
      query = sql`
        SELECT * FROM signals WHERE instrument = ${instrument}
        ORDER BY start_time DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `;
    } else {
      query = sql`
        SELECT * FROM signals
        ORDER BY start_time DESC
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

    // Payout filter — reject signals with payout below 70%
    const MIN_PAYOUT_PERCENT = 70;
    if (data.payout_percent < MIN_PAYOUT_PERCENT) {
      return reply.status(422).send({
        success: false,
        error: `Payout ${data.payout_percent}% is below minimum ${MIN_PAYOUT_PERCENT}%. Signal not broadcast.`,
      });
    }

    const signal_id = `NXS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${data.instrument.replace('/', '-')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    // Compute start_time: use provided value or default to top of next minute
    const now = Date.now();
    const startTime = data.start_time
      ? new Date(data.start_time)
      : new Date(Math.ceil(now / 60000) * 60000);

    const [signal] = await sql`
      INSERT INTO signals (
        signal_id, start_time, instrument, direction, signal_type, confidence,
        confirming_strategies, strike_price, expiration_seconds,
        payout_percent, position_size_percent, martingale_step, meta, status
      ) VALUES (
        ${signal_id}, ${startTime.toISOString()}, ${data.instrument}, ${data.direction},
        ${data.signal_type}, ${data.confidence},
        ${JSON.stringify(data.confirming_strategies)},
        ${data.strike_price}, ${data.expiration_seconds},
        ${data.payout_percent}, ${data.position_size_percent},
        ${data.martingale_step || '0'},
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
