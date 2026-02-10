import { sql } from '../db/client.js';

export type MartingaleStep = 'base' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'halted';

interface MartingaleResult {
  currentStep: MartingaleStep;
  positionSizeMultiplier: number;
  canTrade: boolean;
  consecutiveLosses: number;
}

export async function getMartingaleState(userId: string, instrument: string): Promise<MartingaleResult> {
  const states = await sql`
    SELECT * FROM martingale_states WHERE user_id = ${userId} AND instrument = ${instrument}
  `;

  if (states.length === 0) {
    return { currentStep: 'base', positionSizeMultiplier: 1, canTrade: true, consecutiveLosses: 0 };
  }

  const state = states[0];
  return {
    currentStep: state.current_step as MartingaleStep,
    positionSizeMultiplier: getMultiplierForStep(state.current_step),
    canTrade: state.current_step !== 'halted',
    consecutiveLosses: state.consecutive_losses,
  };
}

export async function processTradeResult(
  userId: string,
  instrument: string,
  isWin: boolean,
  tradeId: string,
  riskProfile: { martingale_enabled: boolean; martingale_steps: number; martingale_multiplier: number; daily_halt_losses: number }
) {
  // Get or create state
  let states = await sql`
    SELECT * FROM martingale_states WHERE user_id = ${userId} AND instrument = ${instrument}
  `;

  if (states.length === 0) {
    await sql`
      INSERT INTO martingale_states (user_id, instrument, current_step, consecutive_losses)
      VALUES (${userId}, ${instrument}, 'base', 0)
    `;
    states = await sql`
      SELECT * FROM martingale_states WHERE user_id = ${userId} AND instrument = ${instrument}
    `;
  }

  const state = states[0];

  if (isWin) {
    // Win resets to base
    await sql`
      UPDATE martingale_states
      SET current_step = 'base', consecutive_losses = 0, updated_at = NOW()
      WHERE id = ${state.id}
    `;
    return { newStep: 'base' as MartingaleStep, halted: false };
  }

  // Loss — advance martingale
  if (!riskProfile.martingale_enabled) {
    // No martingale, check halt condition
    const newLosses = state.consecutive_losses + 1;
    if (newLosses >= riskProfile.daily_halt_losses) {
      await sql`
        UPDATE martingale_states
        SET current_step = 'halted', consecutive_losses = ${newLosses},
            last_loss_trade_id = ${tradeId}, halted_at = NOW(), updated_at = NOW()
        WHERE id = ${state.id}
      `;
      return { newStep: 'halted' as MartingaleStep, halted: true };
    }
    await sql`
      UPDATE martingale_states
      SET consecutive_losses = ${newLosses}, last_loss_trade_id = ${tradeId}, updated_at = NOW()
      WHERE id = ${state.id}
    `;
    return { newStep: 'base' as MartingaleStep, halted: false };
  }

  // Martingale enabled
  const newLosses = state.consecutive_losses + 1;
  const currentStepNum = getStepNumber(state.current_step);
  const nextStepNum = currentStepNum + 1;

  if (nextStepNum > riskProfile.martingale_steps) {
    // Reached final step — HALT
    await sql`
      UPDATE martingale_states
      SET current_step = 'halted', consecutive_losses = ${newLosses},
          last_loss_trade_id = ${tradeId}, halted_at = NOW(), updated_at = NOW()
      WHERE id = ${state.id}
    `;
    return { newStep: 'halted' as MartingaleStep, halted: true };
  }

  const nextStep = `step${nextStepNum}` as MartingaleStep;
  await sql`
    UPDATE martingale_states
    SET current_step = ${nextStep}, consecutive_losses = ${newLosses},
        last_loss_trade_id = ${tradeId}, updated_at = NOW()
    WHERE id = ${state.id}
  `;

  return { newStep: nextStep, halted: false };
}

export async function resetAllMartingaleStates() {
  await sql`
    UPDATE martingale_states
    SET current_step = 'base', consecutive_losses = 0, halted_at = NULL, reset_at = NOW(), updated_at = NOW()
  `;
}

export async function resetUserMartingaleStates(userId: string) {
  await sql`
    UPDATE martingale_states
    SET current_step = 'base', consecutive_losses = 0, halted_at = NULL, reset_at = NOW(), updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

function getStepNumber(step: string): number {
  if (step === 'base') return 0;
  const match = step.match(/step(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function getMultiplierForStep(step: string): number {
  const n = getStepNumber(step);
  return Math.pow(2, n); // default 2x multiplier per step
}
