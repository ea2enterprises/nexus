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

export function calculateWorstCase(profile: Partial<RiskProfile>, payoutPercent = 88) {
  const baseRisk = profile.base_risk_percent ?? 5;
  const martingaleEnabled = profile.martingale_enabled ?? true;
  const maxExposure = profile.max_concurrent_exposure ?? 20;

  let totalLoss = 0;
  const breakdown: { step: string; size: number }[] = [];

  const step0 = Math.min(baseRisk, maxExposure);
  breakdown.push({ step: 'Step 0', size: step0 });
  totalLoss += step0;

  if (martingaleEnabled) {
    const doubleDown = baseRisk * (100 + payoutPercent) / payoutPercent;
    const step1 = Math.min(doubleDown, maxExposure);
    breakdown.push({ step: 'Step 1', size: step1 });
    totalLoss += step1;
  }

  return { totalLoss, breakdown };
}
