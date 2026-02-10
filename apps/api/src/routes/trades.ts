import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.js';
import { authenticate } from '../middleware/auth.js';

export async function tradeRoutes(app: FastifyInstance) {
  // All trade routes require auth
  app.addHook('onRequest', authenticate);

  // ─── GET /trades — Trade journal (paginated) ─────────────
  app.get('/', async (request, reply) => {
    const userId = request.user.sub;
    const { page = 1, limit = 20, instrument, result, from, to } = request.query as {
      page?: number; limit?: number; instrument?: string; result?: string; from?: string; to?: string;
    };
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: string[] = [];
    const params: any[] = [];

    // Build query with filters
    let trades;
    if (instrument) {
      trades = await sql`
        SELECT * FROM trades
        WHERE user_id = ${userId} AND instrument = ${instrument}
        ORDER BY entry_time DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `;
    } else {
      trades = await sql`
        SELECT * FROM trades
        WHERE user_id = ${userId}
        ORDER BY entry_time DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `;
    }

    const [{ count }] = await sql`SELECT COUNT(*) as count FROM trades WHERE user_id = ${userId}`;

    return reply.send({
      success: true,
      data: trades,
      meta: { page: Number(page), limit: Number(limit), total: Number(count) },
    });
  });

  // ─── GET /trades/stats — Trading statistics ──────────────
  app.get('/stats', async (request, reply) => {
    const userId = request.user.sub;

    const [stats] = await sql`
      SELECT
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE result IN ('tp1', 'tp2', 'win')) as wins,
        COUNT(*) FILTER (WHERE result IN ('sl', 'loss')) as losses,
        COALESCE(SUM(pnl_usd), 0) as total_pnl,
        COALESCE(AVG(pnl_percent), 0) as avg_pnl_percent,
        COALESCE(MAX(pnl_usd), 0) as best_trade,
        COALESCE(MIN(pnl_usd), 0) as worst_trade
      FROM trades
      WHERE user_id = ${userId}
    `;

    const totalTrades = Number(stats.total_trades);
    const wins = Number(stats.wins);
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return reply.send({
      success: true,
      data: {
        total_trades: totalTrades,
        wins,
        losses: Number(stats.losses),
        win_rate: Math.round(winRate * 10) / 10,
        total_pnl: Number(stats.total_pnl),
        avg_pnl_percent: Math.round(Number(stats.avg_pnl_percent) * 100) / 100,
        best_trade: Number(stats.best_trade),
        worst_trade: Number(stats.worst_trade),
      },
    });
  });

  // ─── POST /trades/execute — Manual trade execution ───────
  app.post('/execute', async (request, reply) => {
    const userId = request.user.sub;
    const { signal_id } = request.body as { signal_id: string };

    if (!signal_id) {
      return reply.status(400).send({ success: false, error: 'signal_id required' });
    }

    // Forward to execution service
    const { executeSignalForUser } = await import('../services/execution.service.js');
    const result = await executeSignalForUser(userId, signal_id);

    if (!result.success) {
      return reply.status(400).send(result);
    }

    return reply.status(201).send(result);
  });

  // ─── GET /trades/:id ─────────────────────────────────────
  app.get('/:id', async (request, reply) => {
    const userId = request.user.sub;
    const { id } = request.params as { id: string };

    const trades = await sql`
      SELECT * FROM trades WHERE (id = ${id} OR trade_id = ${id}) AND user_id = ${userId}
    `;

    if (trades.length === 0) {
      return reply.status(404).send({ success: false, error: 'Trade not found' });
    }

    return reply.send({ success: true, data: trades[0] });
  });

  // ─── PATCH /trades/:id/notes — Add notes to trade ────────
  app.patch('/:id/notes', async (request, reply) => {
    const userId = request.user.sub;
    const { id } = request.params as { id: string };
    const { notes } = request.body as { notes: string };

    const [trade] = await sql`
      UPDATE trades SET user_notes = ${notes}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (!trade) {
      return reply.status(404).send({ success: false, error: 'Trade not found' });
    }

    return reply.send({ success: true, data: trade });
  });
}
