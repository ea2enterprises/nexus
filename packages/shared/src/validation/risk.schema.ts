import { z } from 'zod';
import { RISK_GUARDRAILS } from '../constants/risk';

const g = RISK_GUARDRAILS;

export const riskProfileSchema = z.object({
  profile_name: z.string().min(1).max(100).optional(),
  base_risk_percent: z.number().min(g.base_risk_percent.min).max(g.base_risk_percent.max).optional(),
  martingale_enabled: z.boolean().optional(),
  martingale_steps: z.number().int().min(g.martingale_steps.min).max(g.martingale_steps.max).optional(),
  martingale_multiplier: z.number().min(g.martingale_multiplier.min).max(g.martingale_multiplier.max).optional(),
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
  signal_type: z.enum(['SCALP', 'INTRADAY', 'SWING', 'POSITION']),
  confidence: z.number().min(0).max(100),
  confirming_strategies: z.array(z.string()).min(1),
  entry: z.object({
    type: z.enum(['MARKET', 'LIMIT']),
    price: z.number().positive(),
    valid_until: z.string(),
  }),
  stop_loss: z.number().positive(),
  take_profits: z.array(z.object({
    level: z.string(),
    price: z.number().positive(),
    close_percent: z.number().min(0).max(100),
  })),
  risk_reward: z.number().positive(),
  position_size_percent: z.number().positive(),
  meta: z.object({
    session: z.string(),
    key_level: z.string(),
    volume_confirmation: z.boolean(),
    news_clear: z.boolean(),
    correlation_check: z.enum(['PASS', 'FAIL']),
    daily_losses_count: z.number().int().min(0),
    weekly_drawdown_percent: z.number(),
  }),
});
