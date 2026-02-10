-- NEXUS Trading Platform — Seed Data
-- Default risk presets and demo data

-- Note: Risk presets are stored in code (packages/shared/src/constants/risk.ts)
-- This seed file creates a demo user for development

-- Demo user (password: "nexus123!" — bcrypt hash)
INSERT INTO users (id, email, password_hash, display_name, tier, referral_code, paper_trade_count, live_trading_unlocked)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'demo@nexus.dev',
    '$2b$12$LJ3m4ys3Lk0TSwHvW1Q/H.K9.3YO7S6tBMVDBrdPFGnGW6jkSO/Cm',
    'Demo Trader',
    'pro',
    'DEMO2026',
    50,
    true
) ON CONFLICT (email) DO NOTHING;

-- Default risk profile for demo user
INSERT INTO risk_profiles (user_id, profile_name, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Default',
    true
) ON CONFLICT DO NOTHING;

-- Demo broker connection (mock broker)
INSERT INTO broker_connections (user_id, broker_name, account_id, auth_type, connection_status, auto_execution_enabled)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'mock',
    'MOCK-001',
    'api_key',
    'connected',
    true
) ON CONFLICT DO NOTHING;

-- Initial daily stats
INSERT INTO daily_stats (user_id, date, starting_equity, ending_equity)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    10000.00,
    10000.00
) ON CONFLICT (user_id, date) DO NOTHING;
