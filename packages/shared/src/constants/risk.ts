import type { RiskPreset } from '../types/index';

// ─── Risk Parameter Guardrails ───────────────────────────────
export const RISK_GUARDRAILS = {
  base_risk_percent:              { min: 0.5,  max: 10,   default: 5     },
  martingale_steps:               { min: 1,    max: 1,    default: 1     },
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
      martingale_steps: 1,
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
      martingale_steps: 1,
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
  'LIQ-SWEEP', 'MSS', 'FVG', 'SMC-OB',
  'EMA-TREND', 'VOLUME', 'KILLZONE',
] as const;

// ─── Supported Instruments (20 major/cross pairs, NO OTC) ───
export const INSTRUMENTS = [
  // Majors
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD',
  // EUR crosses
  'EUR/GBP', 'EUR/JPY', 'EUR/AUD', 'EUR/CAD', 'EUR/CHF',
  // GBP crosses
  'GBP/JPY', 'GBP/CAD', 'GBP/CHF',
  // AUD crosses
  'AUD/JPY', 'AUD/CHF', 'AUD/CAD',
  // CAD crosses
  'CAD/CHF', 'CAD/JPY',
  // CHF crosses
  'CHF/JPY',
] as const;

// Correlation groups — instruments in the same group are considered correlated
export const CORRELATION_GROUPS: string[][] = [
  ['EUR/USD', 'GBP/USD', 'EUR/GBP'],
  ['USD/JPY', 'USD/CHF', 'CHF/JPY'],
  ['AUD/USD', 'AUD/JPY', 'AUD/CHF', 'AUD/CAD'],
  ['EUR/JPY', 'GBP/JPY', 'CAD/JPY'],
  ['EUR/CAD', 'GBP/CAD', 'USD/CAD', 'CAD/CHF'],
];

// ─── Binary Option Durations ─────────────────────────────────
export const BINARY_DURATIONS = [60] as const; // 1-minute only

// ─── Paper Trading Requirements ──────────────────────────────
export const PAPER_TRADING_REQUIRED_TRADES = 50;
export const PAPER_TRADING_REQUIRED_DAYS = 7;

// ─── Default Payout Rates by Duration ────────────────────────
export const PAYOUT_RATES: Record<number, number> = {
  60: 0.88,
};

// ─── Duration Labels ─────────────────────────────────────────
export const DURATION_LABELS: Record<number, string> = {
  60: '1m',
};
