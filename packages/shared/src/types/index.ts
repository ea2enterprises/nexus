// ─── User Types ──────────────────────────────────────────────
export type UserTier = 'free' | 'pro' | 'enterprise_signal' | 'enterprise_fund';

export interface User {
  id: string;
  email: string;
  phone?: string;
  display_name: string;
  avatar_url?: string;
  tier: UserTier;
  level: number;
  xp_points: number;
  twofa_enabled: boolean;
  language: string;
  theme_preference: 'dark' | 'light' | 'system';
  paper_trade_count: number;
  paper_trade_start_date?: string;
  live_trading_unlocked: boolean;
  referral_code: string;
  referred_by?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

// ─── Risk Profile Types ─────────────────────────────────────
export interface RiskProfile {
  id: string;
  user_id: string;
  profile_name: string;
  base_risk_percent: number;
  martingale_enabled: boolean;
  martingale_steps: number;
  daily_halt_losses: number;
  weekly_drawdown_limit: number;
  max_concurrent_exposure: number;
  max_correlated_positions: number;
  news_blackout_before_min: number;
  news_blackout_after_min: number;
  kill_switch_latency_ms: number;
  kill_switch_spread_multiplier: number;
  slippage_tolerance_pips: number;
  slippage_tolerance_crypto_pct: number;
  shadow_mode_duration_days: number;
  is_active: boolean;
  pending_changes?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RiskProfileChangelog {
  id: string;
  risk_profile_id: string;
  user_id: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  effective_at: string;
  acknowledged_worst_case: number;
  changed_at: string;
}

export type RiskPresetName = 'conservative' | 'moderate' | 'aggressive';

export interface RiskPreset {
  name: RiskPresetName;
  label: string;
  description: string;
  values: Partial<RiskProfile>;
}

// ─── Signal Types ────────────────────────────────────────────
export type SignalDirection = 'BUY' | 'SELL';
export type SignalType = 'TURBO' | 'SHORT';
export type SignalStatus = 'active' | 'expired' | 'executed' | 'cancelled';

export type StrategyId =
  | 'SMC-01'
  | 'ICT-01'
  | 'PA-01'
  | 'QUANT-01'
  | 'FLOW-01'
  | 'SENT-01'
  | 'ML-01'
  | 'SCALP-01'
  | 'LIQ-SWEEP'
  | 'MSS'
  | 'FVG'
  | 'SMC-OB'
  | 'EMA-TREND'
  | 'VOLUME'
  | 'KILLZONE';

export interface SignalMeta {
  session: string;
  volume_confirmation: boolean;
  news_clear: boolean;
  correlation_check: 'PASS' | 'FAIL';
  daily_losses_count: number;
  weekly_drawdown_percent: number;
  // ICT confluence fields
  killzone?: string;
  sweep_type?: string;
  fvg_high?: number;
  fvg_low?: number;
  mss_level?: number;
  order_block_high?: number;
  order_block_low?: number;
  ema_trend?: string;
}

export interface Signal {
  id: string;
  signal_id: string;
  timestamp_utc: string;
  start_time: string;
  instrument: string;
  direction: SignalDirection;
  signal_type: SignalType;
  confidence: number;
  confirming_strategies: StrategyId[];
  strike_price: number;
  expiration_seconds: number;
  payout_percent: number;
  position_size_percent: number;
  martingale_step: MartingaleStep;
  meta: SignalMeta;
  status: SignalStatus;
}

// ─── Trade Types ─────────────────────────────────────────────
export type MartingaleStep = '0' | '1' | 'done';
export type TradeResult = 'win' | 'loss' | 'tie' | 'cancelled';

export interface Trade {
  id: string;
  trade_id: string;
  signal_id?: string;
  user_id: string;
  broker_connection_id?: string;
  instrument: string;
  direction: SignalDirection;
  martingale_step: MartingaleStep;
  strike_price: number;
  entry_time: string;
  expiration_seconds: number;
  exit_time?: string;
  exit_price?: number;
  payout_percent: number;
  position_size_percent: number;
  pnl_usd?: number;
  pnl_percent?: number;
  execution_latency_ms?: number;
  result?: TradeResult;
  user_notes?: string;
  created_at: string;
}

// ─── Martingale State ────────────────────────────────────────
export interface MartingaleState {
  id: string;
  user_id: string;
  instrument: string;
  current_step: MartingaleStep;
  consecutive_losses: number;
  last_loss_trade_id?: string;
  halted_at?: string;
  reset_at?: string;
  updated_at: string;
}

// ─── Broker Types ────────────────────────────────────────────
export type BrokerName = 'mock' | 'pocket_option' | 'metatrader' | 'binance';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error';

export interface BrokerConnection {
  id: string;
  user_id: string;
  broker_name: BrokerName;
  account_id: string;
  auth_type: 'oauth' | 'api_key';
  connection_status: ConnectionStatus;
  auto_execution_enabled: boolean;
  last_health_check_at?: string;
}

// ─── Daily Stats ─────────────────────────────────────────────
export interface DailyStats {
  id: string;
  user_id: string;
  date: string;
  starting_equity: number;
  ending_equity: number;
  total_signals: number;
  total_executed: number;
  wins: number;
  losses: number;
  gross_pnl: number;
  net_pnl: number;
  max_drawdown_percent: number;
  martingale_halts_triggered: number;
  is_halted: boolean;
}

// ─── WebSocket Events ────────────────────────────────────────
export interface WsSignalNew {
  event: 'signal:new';
  data: Signal;
}

export interface WsSignalUpdate {
  event: 'signal:update';
  data: Partial<Signal> & { signal_id: string };
}

export interface WsTradeUpdate {
  event: 'trade:update';
  data: Trade;
}

export interface WsMartingaleUpdate {
  event: 'martingale:update';
  data: MartingaleState;
}

export type WsEvent = WsSignalNew | WsSignalUpdate | WsTradeUpdate | WsMartingaleUpdate;

// ─── API Response Types ──────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
