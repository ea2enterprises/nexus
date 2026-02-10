import type { RiskPreset } from '../types/index';

// ─── Risk Parameter Guardrails ───────────────────────────────
export const RISK_GUARDRAILS = {
  base_risk_percent:              { min: 0.5,  max: 10,   default: 5     },
  martingale_steps:               { min: 1,    max: 5,    default: 2     },
  martingale_multiplier:          { min: 1.5,  max: 4,    default: 2     },
  daily_halt_losses:              { min: 1,    max: 10,   default: 2     },
  weekly_drawdown_limit:          { min: 5,    max: 30,   default: 15    },
  max_concurrent_exposure:        { min: 5,    max: 50,   default: 20    },
  max_correlated_positions:       { min: 1,    max: 6,    default: 3     },
  news_blackout_before_min:       { min: 5,    max: 60,   default: 15    },
  news_blackout_after_min:        { min: 2,    max: 30,   default: 5     },
  kill_switch_latency_ms:         { min: 100,  max: 2000, default: 500   },
  kill_switch_spread_multiplier:  { min: 2,    max: 5,    default: 3     },
  slippage_tolerance_pips:        { min: 0.5,  max: 5,    default: 1.5   },
  slippage_tolerance_crypto_pct:  { min: 0.1,  max: 1,    default: 0.3   },
  shadow_mode_duration_days:      { min: 7,    max: 90,   default: 30    },
} as const;

// ─── Risk Presets ────────────────────────────────────────────
export const RISK_PRESETS: RiskPreset[] = [
  {
    name: 'conservative',
    label: 'Conservative',
    description: '1% base risk, 1 martingale step, 1.5x multiplier. Best for capital preservation.',
    values: {
      base_risk_percent: 1,
      martingale_enabled: true,
      martingale_steps: 1,
      martingale_multiplier: 1.5,
      daily_halt_losses: 2,
      weekly_drawdown_limit: 10,
      max_concurrent_exposure: 10,
      max_correlated_positions: 2,
    },
  },
  {
    name: 'moderate',
    label: 'Moderate',
    description: '3% base risk, 2 martingale steps, 2x multiplier. Balanced risk/reward.',
    values: {
      base_risk_percent: 3,
      martingale_enabled: true,
      martingale_steps: 2,
      martingale_multiplier: 2,
      daily_halt_losses: 2,
      weekly_drawdown_limit: 15,
      max_concurrent_exposure: 20,
      max_correlated_positions: 3,
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description: '5% base risk, 2 martingale steps, 2x multiplier. Higher risk for experienced traders.',
    values: {
      base_risk_percent: 5,
      martingale_enabled: true,
      martingale_steps: 2,
      martingale_multiplier: 2,
      daily_halt_losses: 2,
      weekly_drawdown_limit: 20,
      max_concurrent_exposure: 30,
      max_correlated_positions: 3,
    },
  },
];

// ─── Strategy IDs ────────────────────────────────────────────
export const STRATEGY_IDS = [
  'SMC-01', 'ICT-01', 'PA-01', 'QUANT-01',
  'FLOW-01', 'SENT-01', 'ML-01', 'SCALP-01',
] as const;

// ─── Supported Instruments ───────────────────────────────────
export const FOREX_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'EUR/GBP',
  'AUD/USD', 'USD/CHF', 'USD/CAD', 'NZD/USD',
] as const;

export const OTC_PAIRS = [
  'EUR/USD_OTC', 'GBP/USD_OTC', 'USD/JPY_OTC', 'EUR/GBP_OTC',
] as const;

// Correlation groups — instruments in the same group are considered correlated
export const CORRELATION_GROUPS: string[][] = [
  ['EUR/USD', 'GBP/USD', 'EUR/GBP'],
  ['USD/JPY', 'USD/CHF'],
  ['AUD/USD', 'NZD/USD'],
];

// ─── Binary Option Durations ─────────────────────────────────
export const BINARY_DURATIONS = [5, 30, 60, 300] as const; // seconds

// ─── Paper Trading Requirements ──────────────────────────────
export const PAPER_TRADING_REQUIRED_TRADES = 50;
export const PAPER_TRADING_REQUIRED_DAYS = 7;

// ─── Default Payout Rates by Duration ────────────────────────
export const PAYOUT_RATES: Record<number, number> = {
  5: 0.80,
  30: 0.85,
  60: 0.88,
  300: 0.92,
};
