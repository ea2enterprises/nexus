-- NEXUS Trading Platform — Full Database Schema
-- PostgreSQL 16 + TimescaleDB

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(50),
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    avatar_url      TEXT,
    tier            VARCHAR(30) NOT NULL DEFAULT 'free'
                    CHECK (tier IN ('free', 'pro', 'enterprise_signal', 'enterprise_fund')),
    level           INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0 AND level <= 6),
    xp_points       INTEGER NOT NULL DEFAULT 0,
    twofa_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
    twofa_secret    VARCHAR(255),
    language        VARCHAR(10) NOT NULL DEFAULT 'en',
    theme_preference VARCHAR(10) NOT NULL DEFAULT 'dark'
                    CHECK (theme_preference IN ('dark', 'light', 'system')),
    paper_trade_count       INTEGER NOT NULL DEFAULT 0,
    paper_trade_start_date  TIMESTAMPTZ,
    live_trading_unlocked   BOOLEAN NOT NULL DEFAULT FALSE,
    referred_by     UUID REFERENCES users(id),
    referral_code   VARCHAR(20) UNIQUE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referral_code ON users(referral_code);

-- ─── Risk Profiles ──────────────────────────────────────────
CREATE TABLE risk_profiles (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_name                VARCHAR(100) NOT NULL DEFAULT 'Default',
    base_risk_percent           NUMERIC(5,2) NOT NULL DEFAULT 5.0
                                CHECK (base_risk_percent >= 0.5 AND base_risk_percent <= 10),
    martingale_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
    martingale_steps            INTEGER NOT NULL DEFAULT 2
                                CHECK (martingale_steps >= 1 AND martingale_steps <= 5),
    martingale_multiplier       NUMERIC(4,2) NOT NULL DEFAULT 2.0
                                CHECK (martingale_multiplier >= 1.5 AND martingale_multiplier <= 4),
    daily_halt_losses           INTEGER NOT NULL DEFAULT 2
                                CHECK (daily_halt_losses >= 1 AND daily_halt_losses <= 10),
    weekly_drawdown_limit       NUMERIC(5,2) NOT NULL DEFAULT 15.0
                                CHECK (weekly_drawdown_limit >= 5 AND weekly_drawdown_limit <= 30),
    max_concurrent_exposure     NUMERIC(5,2) NOT NULL DEFAULT 20.0
                                CHECK (max_concurrent_exposure >= 5 AND max_concurrent_exposure <= 50),
    max_correlated_positions    INTEGER NOT NULL DEFAULT 3
                                CHECK (max_correlated_positions >= 1 AND max_correlated_positions <= 6),
    news_blackout_before_min    INTEGER NOT NULL DEFAULT 15
                                CHECK (news_blackout_before_min >= 5 AND news_blackout_before_min <= 60),
    news_blackout_after_min     INTEGER NOT NULL DEFAULT 5
                                CHECK (news_blackout_after_min >= 2 AND news_blackout_after_min <= 30),
    kill_switch_latency_ms      INTEGER NOT NULL DEFAULT 500
                                CHECK (kill_switch_latency_ms >= 100 AND kill_switch_latency_ms <= 2000),
    kill_switch_spread_multiplier NUMERIC(4,2) NOT NULL DEFAULT 3.0
                                CHECK (kill_switch_spread_multiplier >= 2 AND kill_switch_spread_multiplier <= 5),
    slippage_tolerance_pips     NUMERIC(4,2) NOT NULL DEFAULT 1.5
                                CHECK (slippage_tolerance_pips >= 0.5 AND slippage_tolerance_pips <= 5),
    slippage_tolerance_crypto_pct NUMERIC(4,2) NOT NULL DEFAULT 0.3
                                CHECK (slippage_tolerance_crypto_pct >= 0.1 AND slippage_tolerance_crypto_pct <= 1),
    shadow_mode_duration_days   INTEGER NOT NULL DEFAULT 30
                                CHECK (shadow_mode_duration_days >= 7 AND shadow_mode_duration_days <= 90),
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    pending_changes             JSONB,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_profiles_user ON risk_profiles(user_id);

-- ─── Risk Profile Changelog ─────────────────────────────────
CREATE TABLE risk_profile_changelog (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_profile_id         UUID NOT NULL REFERENCES risk_profiles(id) ON DELETE CASCADE,
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_changed           VARCHAR(100) NOT NULL,
    old_value               TEXT NOT NULL,
    new_value               TEXT NOT NULL,
    effective_at            TIMESTAMPTZ NOT NULL,
    acknowledged_worst_case NUMERIC(8,2),
    changed_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_changelog_profile ON risk_profile_changelog(risk_profile_id);

-- ─── Broker Connections ─────────────────────────────────────
CREATE TABLE broker_connections (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    broker_name             VARCHAR(50) NOT NULL,
    account_id              VARCHAR(100) NOT NULL,
    auth_type               VARCHAR(20) NOT NULL CHECK (auth_type IN ('oauth', 'api_key')),
    encrypted_credentials   TEXT,
    connection_status       VARCHAR(20) NOT NULL DEFAULT 'disconnected'
                            CHECK (connection_status IN ('connected', 'disconnected', 'error')),
    auto_execution_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    last_health_check_at    TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broker_connections_user ON broker_connections(user_id);

-- ─── Signals ─────────────────────────────────────────────────
CREATE TABLE signals (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id               VARCHAR(50) UNIQUE NOT NULL,
    timestamp_utc           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    instrument              VARCHAR(30) NOT NULL,
    direction               VARCHAR(4) NOT NULL CHECK (direction IN ('BUY', 'SELL')),
    signal_type             VARCHAR(10) NOT NULL
                            CHECK (signal_type IN ('SCALP', 'INTRADAY', 'SWING', 'POSITION')),
    confidence              INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    confirming_strategies   JSONB NOT NULL,
    entry_type              VARCHAR(10) NOT NULL CHECK (entry_type IN ('MARKET', 'LIMIT')),
    entry_price             NUMERIC(18,8) NOT NULL,
    valid_until             TIMESTAMPTZ,
    stop_loss               NUMERIC(18,8) NOT NULL,
    take_profits            JSONB NOT NULL,
    risk_reward             NUMERIC(6,2) NOT NULL,
    position_size_percent   NUMERIC(5,2) NOT NULL,
    meta                    JSONB,
    status                  VARCHAR(15) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'expired', 'executed', 'cancelled')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signals_signal_id ON signals(signal_id);
CREATE INDEX idx_signals_status ON signals(status);
CREATE INDEX idx_signals_instrument ON signals(instrument);
CREATE INDEX idx_signals_timestamp ON signals(timestamp_utc DESC);

-- ─── Trades ──────────────────────────────────────────────────
CREATE TABLE trades (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id                VARCHAR(50) UNIQUE NOT NULL,
    signal_id               UUID REFERENCES signals(id),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    broker_connection_id    UUID REFERENCES broker_connections(id),
    instrument              VARCHAR(30) NOT NULL,
    direction               VARCHAR(4) NOT NULL CHECK (direction IN ('BUY', 'SELL')),
    martingale_step         VARCHAR(10) NOT NULL DEFAULT 'base',
    entry_price             NUMERIC(18,8) NOT NULL,
    entry_time              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_price              NUMERIC(18,8),
    exit_time               TIMESTAMPTZ,
    position_size_percent   NUMERIC(5,2) NOT NULL,
    position_size_lots      NUMERIC(10,4),
    pnl_pips                NUMERIC(10,2),
    pnl_usd                 NUMERIC(12,2),
    pnl_percent             NUMERIC(8,4),
    slippage_pips           NUMERIC(6,2),
    execution_latency_ms    INTEGER,
    result                  VARCHAR(20),
    user_notes              TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_user ON trades(user_id);
CREATE INDEX idx_trades_signal ON trades(signal_id);
CREATE INDEX idx_trades_instrument ON trades(instrument);
CREATE INDEX idx_trades_entry_time ON trades(entry_time DESC);

-- ─── Martingale States ──────────────────────────────────────
CREATE TABLE martingale_states (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instrument          VARCHAR(30) NOT NULL,
    current_step        VARCHAR(10) NOT NULL DEFAULT 'base',
    consecutive_losses  INTEGER NOT NULL DEFAULT 0,
    last_loss_trade_id  UUID REFERENCES trades(id),
    halted_at           TIMESTAMPTZ,
    reset_at            TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, instrument)
);

CREATE INDEX idx_martingale_user_instrument ON martingale_states(user_id, instrument);

-- ─── Daily Stats ────────────────────────────────────────────
CREATE TABLE daily_stats (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date                        DATE NOT NULL,
    starting_equity             NUMERIC(14,2) NOT NULL DEFAULT 0,
    ending_equity               NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_signals               INTEGER NOT NULL DEFAULT 0,
    total_executed              INTEGER NOT NULL DEFAULT 0,
    wins                        INTEGER NOT NULL DEFAULT 0,
    losses                      INTEGER NOT NULL DEFAULT 0,
    gross_pnl                   NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_pnl                     NUMERIC(12,2) NOT NULL DEFAULT 0,
    max_drawdown_percent        NUMERIC(6,2) NOT NULL DEFAULT 0,
    martingale_halts_triggered  INTEGER NOT NULL DEFAULT 0,
    is_halted                   BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, date DESC);

-- ─── Subscriptions ──────────────────────────────────────────
CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier                    VARCHAR(30) NOT NULL,
    stripe_subscription_id  VARCHAR(100),
    status                  VARCHAR(20) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    trial_end_date          TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

-- ─── Referrals ──────────────────────────────────────────────
CREATE TABLE referrals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'qualified', 'rewarded')),
    reward_type         VARCHAR(50),
    reward_amount       NUMERIC(10,2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_user_id);

-- ─── Audit Log ──────────────────────────────────────────────
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type      VARCHAR(100) NOT NULL,
    event_data      JSONB NOT NULL DEFAULT '{}',
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);

-- ─── Refresh Tokens ─────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
