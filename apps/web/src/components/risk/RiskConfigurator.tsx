'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Badge } from '@/components/ui/Badge';
import { apiPut } from '@/lib/api';
import { RISK_GUARDRAILS } from '@nexus/shared';
import type { RiskProfile } from '@nexus/shared';
import { AlertTriangle, Save } from 'lucide-react';

interface RiskConfiguratorProps {
  profile: RiskProfile;
  onUpdate: (profile: RiskProfile) => void;
}

export function RiskConfigurator({ profile, onUpdate }: RiskConfiguratorProps) {
  const [values, setValues] = useState({
    base_risk_percent: Number(profile.base_risk_percent),
    martingale_enabled: profile.martingale_enabled,
    martingale_steps: profile.martingale_steps,
    daily_halt_losses: profile.daily_halt_losses,
    weekly_drawdown_limit: Number(profile.weekly_drawdown_limit),
    max_concurrent_exposure: Number(profile.max_concurrent_exposure),
    max_correlated_positions: profile.max_correlated_positions,
    news_blackout_before_min: profile.news_blackout_before_min,
    news_blackout_after_min: profile.news_blackout_after_min,
    kill_switch_latency_ms: profile.kill_switch_latency_ms,
    kill_switch_spread_multiplier: Number(profile.kill_switch_spread_multiplier),
    slippage_tolerance_pips: Number(profile.slippage_tolerance_pips),
    slippage_tolerance_crypto_pct: Number(profile.slippage_tolerance_crypto_pct),
    shadow_mode_duration_days: profile.shadow_mode_duration_days,
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed = Object.keys(values).some(
      (key) => (values as any)[key] !== Number((profile as any)[key]) && (values as any)[key] !== (profile as any)[key]
    );
    setHasChanges(changed);
  }, [values, profile]);

  const g = RISK_GUARDRAILS;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiPut('/risk/profile', values);
      if (res.success) {
        onUpdate(res.data);
      }
    } catch (err) {
      console.error('Failed to save risk profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Staged Changes Notice */}
      {(profile.pending_changes && Object.keys(profile.pending_changes).length > 0) && (
        <Card className="border-caution/50 bg-caution-bg">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-caution mt-0.5" />
            <div>
              <p className="text-sm font-medium text-caution">Pending Changes</p>
              <p className="text-xs text-text-secondary mt-0.5">
                You have staged changes that will take effect at the next daily reset (00:00 UTC).
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Position Sizing */}
      <Card>
        <CardHeader><CardTitle>Position Sizing</CardTitle></CardHeader>
        <div className="space-y-4">
          <Slider
            label="Base Position Size"
            value={values.base_risk_percent}
            onChange={(v) => setValues({ ...values, base_risk_percent: v })}
            min={g.base_risk_percent.min}
            max={g.base_risk_percent.max}
            step={0.5}
            unit="%"
            description="Percentage of account equity per trade"
          />
          <Slider
            label="Max Concurrent Exposure"
            value={values.max_concurrent_exposure}
            onChange={(v) => setValues({ ...values, max_concurrent_exposure: v })}
            min={g.max_concurrent_exposure.min}
            max={g.max_concurrent_exposure.max}
            step={1}
            unit="%"
          />
          <Slider
            label="Max Correlated Positions"
            value={values.max_correlated_positions}
            onChange={(v) => setValues({ ...values, max_correlated_positions: v })}
            min={g.max_correlated_positions.min}
            max={g.max_correlated_positions.max}
            step={1}
            unit=""
          />
        </div>
      </Card>

      {/* Martingale Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Martingale Recovery</CardTitle>
          <button
            onClick={() => setValues({ ...values, martingale_enabled: !values.martingale_enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              values.martingale_enabled ? 'bg-electric' : 'bg-border-dark'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              values.martingale_enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </CardHeader>
        {values.martingale_enabled && (
          <div className="space-y-4">
            <div className="text-sm text-text-secondary">
              Strict 2-step recovery: Initial trade + 1 double-down.
              Double-down size is computed from broker payout to ensure break-even + profit.
            </div>
            <Slider
              label="Daily Halt After Losses"
              value={values.daily_halt_losses}
              onChange={(v) => setValues({ ...values, daily_halt_losses: v })}
              min={g.daily_halt_losses.min}
              max={g.daily_halt_losses.max}
              step={1}
              unit=""
            />
          </div>
        )}
      </Card>

      {/* Drawdown Limits */}
      <Card>
        <CardHeader><CardTitle>Drawdown Limits</CardTitle></CardHeader>
        <div className="space-y-4">
          <Slider
            label="Weekly Drawdown Limit"
            value={values.weekly_drawdown_limit}
            onChange={(v) => setValues({ ...values, weekly_drawdown_limit: v })}
            min={g.weekly_drawdown_limit.min}
            max={g.weekly_drawdown_limit.max}
            step={1}
            unit="%"
          />
        </div>
      </Card>

      {/* Kill Switch */}
      <Card>
        <CardHeader><CardTitle>Kill Switch Sensitivity</CardTitle></CardHeader>
        <div className="space-y-4">
          <Slider
            label="Latency Threshold"
            value={values.kill_switch_latency_ms}
            onChange={(v) => setValues({ ...values, kill_switch_latency_ms: v })}
            min={g.kill_switch_latency_ms.min}
            max={g.kill_switch_latency_ms.max}
            step={50}
            unit="ms"
          />
          <Slider
            label="Spread Multiplier"
            value={values.kill_switch_spread_multiplier}
            onChange={(v) => setValues({ ...values, kill_switch_spread_multiplier: v })}
            min={g.kill_switch_spread_multiplier.min}
            max={g.kill_switch_spread_multiplier.max}
            step={0.5}
            unit="x"
          />
        </div>
      </Card>

      {/* Slippage */}
      <Card>
        <CardHeader><CardTitle>Slippage Tolerance</CardTitle></CardHeader>
        <div className="space-y-4">
          <Slider
            label="Forex (pips)"
            value={values.slippage_tolerance_pips}
            onChange={(v) => setValues({ ...values, slippage_tolerance_pips: v })}
            min={g.slippage_tolerance_pips.min}
            max={g.slippage_tolerance_pips.max}
            step={0.5}
            unit=" pips"
          />
          <Slider
            label="Crypto (%)"
            value={values.slippage_tolerance_crypto_pct}
            onChange={(v) => setValues({ ...values, slippage_tolerance_crypto_pct: v })}
            min={g.slippage_tolerance_crypto_pct.min}
            max={g.slippage_tolerance_crypto_pct.max}
            step={0.1}
            unit="%"
          />
        </div>
      </Card>

      {/* News Blackout */}
      <Card>
        <CardHeader><CardTitle>News Blackout Window</CardTitle></CardHeader>
        <div className="space-y-4">
          <Slider
            label="Before Event"
            value={values.news_blackout_before_min}
            onChange={(v) => setValues({ ...values, news_blackout_before_min: v })}
            min={g.news_blackout_before_min.min}
            max={g.news_blackout_before_min.max}
            step={5}
            unit=" min"
          />
          <Slider
            label="After Event"
            value={values.news_blackout_after_min}
            onChange={(v) => setValues({ ...values, news_blackout_after_min: v })}
            min={g.news_blackout_after_min.min}
            max={g.news_blackout_after_min.max}
            step={1}
            unit=" min"
          />
        </div>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button variant="primary" size="lg" loading={saving} onClick={handleSave}>
            <Save size={16} className="mr-2" />
            Save Changes (Effective Next Reset)
          </Button>
        </div>
      )}
    </div>
  );
}
