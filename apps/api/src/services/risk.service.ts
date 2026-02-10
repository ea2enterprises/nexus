import { sql } from '../db/client.js';
import type { RiskProfile } from '@nexus/shared';

export async function getActiveRiskProfile(userId: string) {
  const profiles = await sql`
    SELECT * FROM risk_profiles WHERE user_id = ${userId} AND is_active = true LIMIT 1
  `;
  return profiles[0] || null;
}

export async function applyPendingChanges() {
  // Apply all pending changes at daily reset
  const profiles = await sql`
    SELECT * FROM risk_profiles WHERE pending_changes IS NOT NULL
  `;

  for (const profile of profiles) {
    const changes = profile.pending_changes as Record<string, any>;
    if (!changes || Object.keys(changes).length === 0) continue;

    // Build update dynamically
    await sql`
      UPDATE risk_profiles
      SET ${sql(changes)}, pending_changes = NULL, updated_at = NOW()
      WHERE id = ${profile.id}
    `;
  }

  return profiles.length;
}

export function calculateWorstCase(profile: Partial<RiskProfile>) {
  const baseRisk = profile.base_risk_percent ?? 5;
  const steps = profile.martingale_steps ?? 2;
  const multiplier = profile.martingale_multiplier ?? 2;
  const martingaleEnabled = profile.martingale_enabled ?? true;
  const maxExposure = profile.max_concurrent_exposure ?? 20;

  let totalLoss = 0;
  const breakdown: { step: string; size: number }[] = [];

  if (martingaleEnabled) {
    let size = baseRisk;
    for (let i = 0; i <= steps; i++) {
      const effectiveSize = Math.min(size, maxExposure);
      breakdown.push({
        step: i === 0 ? 'Base' : `Step ${i}`,
        size: effectiveSize,
      });
      totalLoss += effectiveSize;
      size *= multiplier;
    }
  } else {
    breakdown.push({ step: 'Base', size: baseRisk });
    totalLoss = baseRisk;
  }

  return { totalLoss, breakdown };
}
