import { sql } from '../db/client.js';

export type MartingaleStep = '0' | '1' | 'done';

interface MartingaleResult {
  currentStep: MartingaleStep;
  canTrade: boolean;
  consecutiveLosses: number;
}

export async function getMartingaleState(userId: string, instrument: string): Promise<MartingaleResult> {
  const states = await sql`
    SELECT * FROM martingale_states WHERE user_id = ${userId} AND instrument = ${instrument}
  `;

  if (states.length === 0) {
    return { currentStep: '0', canTrade: true, consecutiveLosses: 0 };
  }

  const state = states[0];
  return {
    currentStep: state.current_step as MartingaleStep,
    canTrade: state.current_step !== 'done',
    consecutiveLosses: state.consecutive_losses,
  };
}

/**
 * Compute the double-down position size for step 1.
 * Formula: baseRisk × (100 + payoutPercent) / payoutPercent
 * This ensures a step-1 win recovers the step-0 loss AND produces profit.
 */
export function computeDoubleDownSize(baseRisk: number, payoutPercent: number): number {
  return baseRisk * (100 + payoutPercent) / payoutPercent;
}

export async function processTradeResult(
  userId: string,
  instrument: string,
  isWin: boolean,
  tradeId: string,
  riskProfile: { martingale_enabled: boolean; daily_halt_losses: number }
) {
  // Get or create state
  let states = await sql`
    SELECT * FROM martingale_states WHERE user_id = ${userId} AND instrument = ${instrument}
  `;

  if (states.length === 0) {
    await sql`
      INSERT INTO martingale_states (user_id, instrument, current_step, consecutive_losses)
      VALUES (${userId}, ${instrument}, '0', 0)
    `;
    states = await sql`
      SELECT * FROM martingale_states WHERE user_id = ${userId} AND instrument = ${instrument}
    `;
  }

  const state = states[0];

  if (isWin) {
    // Win resets to step 0
    await sql`
      UPDATE martingale_states
      SET current_step = '0', consecutive_losses = 0, updated_at = NOW()
      WHERE id = ${state.id}
    `;
    return { newStep: '0' as MartingaleStep, halted: false };
  }

  // Loss
  const newLosses = state.consecutive_losses + 1;

  if (!riskProfile.martingale_enabled) {
    // No martingale — check halt threshold
    if (newLosses >= riskProfile.daily_halt_losses) {
      await sql`
        UPDATE martingale_states
        SET current_step = 'done', consecutive_losses = ${newLosses},
            last_loss_trade_id = ${tradeId}, halted_at = NOW(), updated_at = NOW()
        WHERE id = ${state.id}
      `;
      return { newStep: 'done' as MartingaleStep, halted: true };
    }
    await sql`
      UPDATE martingale_states
      SET consecutive_losses = ${newLosses}, last_loss_trade_id = ${tradeId}, updated_at = NOW()
      WHERE id = ${state.id}
    `;
    return { newStep: '0' as MartingaleStep, halted: false };
  }

  // Martingale enabled — strict 2-step: 0 → 1 → done
  if (state.current_step === '0') {
    // Loss at step 0 → advance to step 1
    await sql`
      UPDATE martingale_states
      SET current_step = '1', consecutive_losses = ${newLosses},
          last_loss_trade_id = ${tradeId}, updated_at = NOW()
      WHERE id = ${state.id}
    `;
    return { newStep: '1' as MartingaleStep, halted: false };
  }

  // Loss at step 1 → done (signal dead)
  await sql`
    UPDATE martingale_states
    SET current_step = 'done', consecutive_losses = ${newLosses},
        last_loss_trade_id = ${tradeId}, halted_at = NOW(), updated_at = NOW()
    WHERE id = ${state.id}
  `;
  return { newStep: 'done' as MartingaleStep, halted: true };
}

export async function resetAllMartingaleStates() {
  await sql`
    UPDATE martingale_states
    SET current_step = '0', consecutive_losses = 0, halted_at = NULL, reset_at = NOW(), updated_at = NOW()
  `;
}

export async function resetUserMartingaleStates(userId: string) {
  await sql`
    UPDATE martingale_states
    SET current_step = '0', consecutive_losses = 0, halted_at = NULL, reset_at = NOW(), updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}
