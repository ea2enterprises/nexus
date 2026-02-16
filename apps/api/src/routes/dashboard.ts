import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.js';
import { authenticate } from '../middleware/auth.js';

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // ─── GET /dashboard — Full dashboard overview ────────────
  app.get('/', async (request, reply) => {
    const userId = request.user.sub;

    // Get today's stats
    const dailyStats = await sql`
      SELECT * FROM daily_stats
      WHERE user_id = ${userId} AND date = CURRENT_DATE
      LIMIT 1
    `;

    // Get active positions (open trades)
    const activePositions = await sql`
      SELECT * FROM trades
      WHERE user_id = ${userId} AND exit_time IS NULL
      ORDER BY entry_time DESC
    `;

    // Get recent signals
    const recentSignals = await sql`
      SELECT * FROM signals
      ORDER BY start_time DESC
      LIMIT 5
    `;

    // Get martingale states
    const martingaleStates = await sql`
      SELECT * FROM martingale_states
      WHERE user_id = ${userId}
    `;

    // Get risk profile
    const riskProfile = await sql`
      SELECT * FROM risk_profiles
      WHERE user_id = ${userId} AND is_active = true
      LIMIT 1
    `;

    // Get 7-day win rate
    const [weekStats] = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE result = 'win') as wins
      FROM trades
      WHERE user_id = ${userId} AND entry_time > NOW() - INTERVAL '7 days'
    `;

    const winRate7d = Number(weekStats.total) > 0
      ? (Number(weekStats.wins) / Number(weekStats.total)) * 100
      : 0;

    // Calculate total exposure
    const totalExposure = activePositions.reduce(
      (sum: number, t: any) => sum + Number(t.position_size_percent), 0
    );

    return reply.send({
      success: true,
      data: {
        daily_stats: dailyStats[0] || {
          starting_equity: 10000,
          ending_equity: 10000,
          total_signals: 0,
          total_executed: 0,
          wins: 0,
          losses: 0,
          net_pnl: 0,
          is_halted: false,
        },
        active_positions: activePositions,
        recent_signals: recentSignals,
        martingale_states: martingaleStates,
        risk_profile: riskProfile[0] || null,
        win_rate_7d: Math.round(winRate7d * 10) / 10,
        total_exposure: totalExposure,
      },
    });
  });

  // ─── GET /dashboard/equity-curve — Historical equity ─────
  app.get('/equity-curve', async (request, reply) => {
    const userId = request.user.sub;
    const { period = '30' } = request.query as { period?: string };

    const stats = await sql`
      SELECT date, ending_equity, net_pnl, max_drawdown_percent
      FROM daily_stats
      WHERE user_id = ${userId} AND date > CURRENT_DATE - ${Number(period)}::integer
      ORDER BY date ASC
    `;

    return reply.send({ success: true, data: stats });
  });
}
