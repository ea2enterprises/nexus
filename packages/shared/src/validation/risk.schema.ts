import { z } from 'zod';
import { RISK_GUARDRAILS } from '../constants/risk';

const g = RISK_GUARDRAILS;

export const riskProfileSchema = z.object({
  profile_name: z.string().min(1).max(100).optional(),
  base_risk_percent: z.number().min(g.base_risk_percent.min).max(g.base_risk_percent.max).optional(),
  martingale_enabled: z.boolean().optional(),
  martingale_steps: z.number().int().min(g.martingale_steps.min).max(g.martingale_steps.max).optional(),
  daily_halt_losses: z.number().int().min(g.daily_halt_losses.min).max(g.daily_halt_losses.max).optional(),
  weekly_drawdown_limit: z.number().min(g.weekly_drawdown_limit.min).max(g.weekly_drawdown_limit.max).optional(),
  max_concurrent_exposure: z.number().min(g.max_concurrent_exposure.min).max(g.max_concurrent_exposure.max).optional(),
  max_correlated_positions: z.number().int().min(g.max_correlated_positions.min).max(g.max_correlated_positions.max).optional(),
  news_blackout_before_min: z.number().int().min(g.news_blackout_before_min.min).max(g.news_blackout_before_min.max).optional(),
  news_blackout_after_min: z.number().int().min(g.news_blackout_after_min.min).max(g.news_blackout_after_min.max).optional(),
  kill_switch_latency_ms: z.number().int().min(g.kill_switch_latency_ms.min).max(g.kill_switch_latency_ms.max).optional(),
  kill_switch_spread_multiplier: z.number().min(g.kill_switch_spread_multiplier.min).max(g.kill_switch_spread_multiplier.max).optional(),
  slippage_tolerance_pips: z.number().min(g.slippage_tolerance_pips.min).max(g.slippage_tolerance_pips.max).optional(),
  slippage_tolerance_crypto_pct: z.number().min(g.slippage_tolerance_crypto_pct.min).max(g.slippage_tolerance_crypto_pct.max).optional(),
  shadow_mode_duration_days: z.number().int().min(g.shadow_mode_duration_days.min).max(g.shadow_mode_duration_days.max).optional(),
});

export type RiskProfileUpdate = z.infer<typeof riskProfileSchema>;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  display_name: z.string().min(2).max(50),
  phone: z.string().optional(),
  referred_by: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signalSchema = z.object({
  instrument: z.string(),
  direction: z.enum(['BUY', 'SELL']),
  start_time: z.string().datetime({ offset: true }).optional(),
  signal_type: z.enum(['TURBO', 'SHORT']),
  confidence: z.number().min(0).max(100),
  confirming_strategies: z.array(z.string()).min(1),
  strike_price: z.number().positive(),
  expiration_seconds: z.number().refine(
    (v) => v === 60,
    { message: 'Must be 60-second binary duration' }
  ),
  payout_percent: z.number().min(0).max(100),
  position_size_percent: z.number().positive(),
  martingale_step: z.enum(['0', '1', 'done']).optional(),
  meta: z.object({
    session: z.string(),
    volume_confirmation: z.boolean(),
    news_clear: z.boolean(),
    correlation_check: z.enum(['PASS', 'FAIL']),
    daily_losses_count: z.number().int().min(0),
    weekly_drawdown_percent: z.number(),
    // ICT confluence fields (optional, present when signal uses ICT engine)
    killzone: z.string().optional(),
    sweep_type: z.string().optional(),
    fvg_high: z.number().optional(),
    fvg_low: z.number().optional(),
    mss_level: z.number().optional(),
    order_block_high: z.number().optional(),
    order_block_low: z.number().optional(),
    ema_trend: z.string().optional(),
  }),
});
