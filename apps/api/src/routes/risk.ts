import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.js';
import { authenticate } from '../middleware/auth.js';
import { riskProfileSchema, RISK_PRESETS, RISK_GUARDRAILS } from '@nexus/shared';

export async function riskRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // ─── GET /risk/profile — Get active risk profile ─────────
  app.get('/profile', async (request, reply) => {
    const userId = request.user.sub;

    const profiles = await sql`
      SELECT * FROM risk_profiles WHERE user_id = ${userId} AND is_active = true LIMIT 1
    `;

    if (profiles.length === 0) {
      return reply.status(404).send({ success: false, error: 'No active risk profile' });
    }

    return reply.send({ success: true, data: profiles[0] });
  });

  // ─── PUT /risk/profile — Update risk profile (staged) ────
  app.put('/profile', async (request, reply) => {
    const userId = request.user.sub;

    const parsed = riskProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed — values outside guardrail limits',
        details: parsed.error.flatten(),
      });
    }

    const changes = parsed.data;

    // Get current profile
    const profiles = await sql`
      SELECT * FROM risk_profiles WHERE user_id = ${userId} AND is_active = true LIMIT 1
    `;

    if (profiles.length === 0) {
      return reply.status(404).send({ success: false, error: 'No active risk profile' });
    }

    const profile = profiles[0];

    // Merge with existing pending changes
    const existingPending = profile.pending_changes || {};
    const newPending = { ...existingPending, ...changes };

    // Log each field change
    for (const [field, newValue] of Object.entries(changes)) {
      if (field === 'profile_name') continue;
      const oldValue = (profile as any)[field];
      if (oldValue !== undefined && String(oldValue) !== String(newValue)) {
        await sql`
          INSERT INTO risk_profile_changelog (risk_profile_id, user_id, field_changed, old_value, new_value, effective_at)
          VALUES (${profile.id}, ${userId}, ${field}, ${String(oldValue)}, ${String(newValue)},
                  (CURRENT_DATE + INTERVAL '1 day')::timestamptz)
        `;
      }
    }

    // Store as pending changes (take effect at next daily reset)
    const [updated] = await sql`
      UPDATE risk_profiles
      SET pending_changes = ${JSON.stringify(newPending)}, updated_at = NOW()
      WHERE id = ${profile.id}
      RETURNING *
    `;

    await sql`
      INSERT INTO audit_log (user_id, event_type, event_data, ip_address)
      VALUES (${userId}, 'risk.profile.update_staged', ${JSON.stringify(changes)}, ${request.ip})
    `;

    return reply.send({
      success: true,
      data: updated,
      message: 'Changes staged. They will take effect at the next daily reset (00:00 UTC).',
    });
  });

  // ─── GET /risk/presets — Get available presets ────────────
  app.get('/presets', async (_request, reply) => {
    return reply.send({ success: true, data: RISK_PRESETS });
  });

  // ─── POST /risk/presets/:name/apply — Apply a preset ─────
  app.post('/presets/:name/apply', async (request, reply) => {
    const userId = request.user.sub;
    const { name } = request.params as { name: string };

    const preset = RISK_PRESETS.find(p => p.name === name);
    if (!preset) {
      return reply.status(404).send({ success: false, error: 'Preset not found' });
    }

    const profiles = await sql`
      SELECT * FROM risk_profiles WHERE user_id = ${userId} AND is_active = true LIMIT 1
    `;

    if (profiles.length === 0) {
      return reply.status(404).send({ success: false, error: 'No active risk profile' });
    }

    const profile = profiles[0];

    // Stage preset values as pending changes
    const [updated] = await sql`
      UPDATE risk_profiles
      SET pending_changes = ${JSON.stringify(preset.values)},
          profile_name = ${preset.label},
          updated_at = NOW()
      WHERE id = ${profile.id}
      RETURNING *
    `;

    await sql`
      INSERT INTO audit_log (user_id, event_type, event_data, ip_address)
      VALUES (${userId}, 'risk.preset.applied', ${JSON.stringify({ preset: name })}, ${request.ip})
    `;

    return reply.send({
      success: true,
      data: updated,
      message: `${preset.label} preset staged. Changes take effect at next daily reset.`,
    });
  });

  // ─── POST /risk/worst-case — Calculate worst case ────────
  app.post('/worst-case', async (request, reply) => {
    const parsed = riskProfileSchema.safeParse(request.body);
    const values = parsed.success ? parsed.data : {};

    const g = RISK_GUARDRAILS;
    const baseRisk = values.base_risk_percent ?? g.base_risk_percent.default;
    const steps = values.martingale_steps ?? g.martingale_steps.default;
    const multiplier = values.martingale_multiplier ?? g.martingale_multiplier.default;
    const martingaleEnabled = values.martingale_enabled ?? true;
    const maxExposure = values.max_concurrent_exposure ?? g.max_concurrent_exposure.default;

    // Calculate worst-case loss
    let totalLoss = 0;
    const stepBreakdown: { step: string; size_percent: number; loss_percent: number }[] = [];

    if (martingaleEnabled) {
      let currentSize = baseRisk;
      for (let i = 0; i <= steps; i++) {
        const effectiveSize = Math.min(currentSize, maxExposure);
        const stepName = i === 0 ? 'Base' : `Step ${i}`;
        stepBreakdown.push({
          step: stepName,
          size_percent: effectiveSize,
          loss_percent: effectiveSize,
        });
        totalLoss += effectiveSize;
        currentSize *= multiplier;
      }
    } else {
      stepBreakdown.push({
        step: 'Base (no martingale)',
        size_percent: baseRisk,
        loss_percent: baseRisk,
      });
      totalLoss = baseRisk;
    }

    return reply.send({
      success: true,
      data: {
        max_daily_loss_percent: Math.round(totalLoss * 100) / 100,
        max_daily_loss_at_10k: Math.round(totalLoss * 100),
        step_breakdown: stepBreakdown,
        settings_used: {
          base_risk_percent: baseRisk,
          martingale_enabled: martingaleEnabled,
          martingale_steps: steps,
          martingale_multiplier: multiplier,
          max_concurrent_exposure: maxExposure,
        },
      },
    });
  });

  // ─── GET /risk/guardrails — Get min/max ranges ───────────
  app.get('/guardrails', async (_request, reply) => {
    return reply.send({ success: true, data: RISK_GUARDRAILS });
  });
}
