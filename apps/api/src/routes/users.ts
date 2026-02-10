import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.js';
import { authenticate } from '../middleware/auth.js';

export async function userRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // ─── GET /users/me — Current user profile ────────────────
  app.get('/me', async (request, reply) => {
    const userId = request.user.sub;

    const users = await sql`
      SELECT id, email, phone, display_name, avatar_url, tier, level, xp_points,
             twofa_enabled, language, theme_preference, paper_trade_count,
             paper_trade_start_date, live_trading_unlocked, referral_code,
             created_at, updated_at, last_login_at
      FROM users WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return reply.status(404).send({ success: false, error: 'User not found' });
    }

    return reply.send({ success: true, data: users[0] });
  });

  // ─── PATCH /users/me — Update profile ────────────────────
  app.patch('/me', async (request, reply) => {
    const userId = request.user.sub;
    const { display_name, phone, language, theme_preference } = request.body as {
      display_name?: string; phone?: string; language?: string; theme_preference?: string;
    };

    const updates: Record<string, any> = {};
    if (display_name) updates.display_name = display_name;
    if (phone !== undefined) updates.phone = phone;
    if (language) updates.language = language;
    if (theme_preference && ['dark', 'light', 'system'].includes(theme_preference)) {
      updates.theme_preference = theme_preference;
    }

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ success: false, error: 'No valid fields to update' });
    }

    // Build dynamic update
    const setClauses = Object.entries(updates)
      .map(([key, val]) => sql`${sql(key)} = ${val}`)
    ;

    const [user] = await sql`
      UPDATE users SET ${sql(updates)}, updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id, email, display_name, phone, language, theme_preference
    `;

    return reply.send({ success: true, data: user });
  });

  // ─── GET /users/me/paper-trading — Paper trading status ──
  app.get('/me/paper-trading', async (request, reply) => {
    const userId = request.user.sub;

    const [user] = await sql`
      SELECT paper_trade_count, paper_trade_start_date, live_trading_unlocked
      FROM users WHERE id = ${userId}
    `;

    const requiredTrades = 50;
    const requiredDays = 7;
    const tradesDone = user.paper_trade_count || 0;
    const startDate = user.paper_trade_start_date ? new Date(user.paper_trade_start_date) : null;
    const daysPassed = startDate
      ? Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const tradesReady = tradesDone >= requiredTrades;
    const daysReady = daysPassed >= requiredDays;

    return reply.send({
      success: true,
      data: {
        paper_trade_count: tradesDone,
        required_trades: requiredTrades,
        days_elapsed: daysPassed,
        required_days: requiredDays,
        trades_ready: tradesReady,
        days_ready: daysReady,
        live_trading_unlocked: user.live_trading_unlocked,
        can_unlock: tradesReady || daysReady,
      },
    });
  });
}
