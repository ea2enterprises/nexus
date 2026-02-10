import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sql } from '../db/client.js';
import { registerSchema, loginSchema } from '@nexus/shared';
import { rateLimit } from '../middleware/rate-limit.js';
import { config } from '../config/index.js';

export async function authRoutes(app: FastifyInstance) {
  // Rate limit auth endpoints: 5 attempts per 15 minutes
  app.addHook('onRequest', rateLimit(15, 15 * 60 * 1000));

  // ─── Register ────────────────────────────────────────────
  app.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const { email, password, display_name, phone, referred_by } = parsed.data;

    // Check if email exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return reply.status(409).send({ success: false, error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const referral_code = crypto.randomBytes(6).toString('hex').toUpperCase();

    // Resolve referrer
    let referrer_id = null;
    if (referred_by) {
      const referrer = await sql`SELECT id FROM users WHERE referral_code = ${referred_by}`;
      if (referrer.length > 0) referrer_id = referrer[0].id;
    }

    const [user] = await sql`
      INSERT INTO users (email, password_hash, display_name, phone, referral_code, referred_by, paper_trade_start_date)
      VALUES (${email}, ${password_hash}, ${display_name}, ${phone || null}, ${referral_code}, ${referrer_id}, NOW())
      RETURNING id, email, display_name, tier, referral_code
    `;

    // Create default risk profile
    await sql`
      INSERT INTO risk_profiles (user_id, profile_name, is_active)
      VALUES (${user.id}, 'Default', true)
    `;

    // Create referral record if applicable
    if (referrer_id) {
      await sql`
        INSERT INTO referrals (referrer_user_id, referred_user_id)
        VALUES (${referrer_id}, ${user.id})
      `;
    }

    // Generate tokens
    const access_token = app.jwt.sign(
      { sub: user.id, email: user.email, tier: user.tier },
      { expiresIn: config.jwt.accessExpiresIn }
    );
    const refresh_token = crypto.randomBytes(40).toString('hex');
    const refresh_hash = crypto.createHash('sha256').update(refresh_token).digest('hex');

    await sql`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${refresh_hash}, NOW() + INTERVAL '7 days')
    `;

    // Audit log
    await sql`
      INSERT INTO audit_log (user_id, event_type, event_data, ip_address)
      VALUES (${user.id}, 'user.register', ${JSON.stringify({ email })}, ${request.ip})
    `;

    return reply.status(201).send({
      success: true,
      data: {
        user: { id: user.id, email: user.email, display_name: user.display_name, tier: user.tier },
        tokens: { access_token, refresh_token, expires_in: 900 },
      },
    });
  });

  // ─── Login ───────────────────────────────────────────────
  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Validation failed' });
    }

    const { email, password } = parsed.data;

    const users = await sql`
      SELECT id, email, password_hash, display_name, tier, twofa_enabled
      FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    }

    // Update last login
    await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`;

    const access_token = app.jwt.sign(
      { sub: user.id, email: user.email, tier: user.tier },
      { expiresIn: config.jwt.accessExpiresIn }
    );
    const refresh_token = crypto.randomBytes(40).toString('hex');
    const refresh_hash = crypto.createHash('sha256').update(refresh_token).digest('hex');

    await sql`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${refresh_hash}, NOW() + INTERVAL '7 days')
    `;

    await sql`
      INSERT INTO audit_log (user_id, event_type, event_data, ip_address)
      VALUES (${user.id}, 'user.login', '{}', ${request.ip})
    `;

    return reply.send({
      success: true,
      data: {
        user: { id: user.id, email: user.email, display_name: user.display_name, tier: user.tier },
        tokens: { access_token, refresh_token, expires_in: 900 },
      },
    });
  });

  // ─── Refresh Token ───────────────────────────────────────
  app.post('/refresh', async (request, reply) => {
    const { refresh_token } = request.body as { refresh_token: string };
    if (!refresh_token) {
      return reply.status(400).send({ success: false, error: 'Refresh token required' });
    }

    const token_hash = crypto.createHash('sha256').update(refresh_token).digest('hex');

    const tokens = await sql`
      SELECT rt.id, rt.user_id, u.email, u.tier
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = ${token_hash}
        AND rt.expires_at > NOW()
        AND rt.revoked_at IS NULL
    `;

    if (tokens.length === 0) {
      return reply.status(401).send({ success: false, error: 'Invalid or expired refresh token' });
    }

    const tokenRecord = tokens[0];

    // Revoke old token
    await sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ${tokenRecord.id}`;

    // Issue new tokens
    const access_token = app.jwt.sign(
      { sub: tokenRecord.user_id, email: tokenRecord.email, tier: tokenRecord.tier },
      { expiresIn: config.jwt.accessExpiresIn }
    );
    const new_refresh_token = crypto.randomBytes(40).toString('hex');
    const new_hash = crypto.createHash('sha256').update(new_refresh_token).digest('hex');

    await sql`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (${tokenRecord.user_id}, ${new_hash}, NOW() + INTERVAL '7 days')
    `;

    return reply.send({
      success: true,
      data: {
        tokens: { access_token, refresh_token: new_refresh_token, expires_in: 900 },
      },
    });
  });
}
