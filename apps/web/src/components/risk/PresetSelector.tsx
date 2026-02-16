'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiPost } from '@/lib/api';
import { RISK_PRESETS } from '@nexus/shared';
import type { RiskPresetName } from '@nexus/shared';
import { Shield, Zap, Flame } from 'lucide-react';

const presetIcons: Record<RiskPresetName, typeof Shield> = {
  conservative: Shield,
  moderate: Zap,
  aggressive: Flame,
};

const presetColors: Record<RiskPresetName, string> = {
  conservative: 'border-profit/50 hover:border-profit',
  moderate: 'border-electric/50 hover:border-electric',
  aggressive: 'border-caution/50 hover:border-caution',
};

interface PresetSelectorProps {
  currentProfile?: string;
  onApply: () => void;
}

export function PresetSelector({ currentProfile, onApply }: PresetSelectorProps) {
  const handleApply = async (name: RiskPresetName) => {
    try {
      const res = await apiPost(`/risk/presets/${name}/apply`, {});
      if (res.success) onApply();
    } catch (err) {
      console.error('Failed to apply preset:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {RISK_PRESETS.map((preset) => {
        const Icon = presetIcons[preset.name];
        const isActive = currentProfile?.toLowerCase() === preset.label.toLowerCase();

        return (
          <Card
            key={preset.name}
            hover
            className={`relative ${presetColors[preset.name]} ${isActive ? 'ring-2 ring-electric' : ''}`}
          >
            {isActive && (
              <Badge variant="electric" className="absolute top-3 right-3">Active</Badge>
            )}
            <div className="flex items-center gap-2 mb-3">
              <Icon size={20} className="text-text-primary-dark" />
              <h3 className="font-semibold text-text-primary-dark">{preset.label}</h3>
            </div>
            <p className="text-xs text-text-secondary mb-4">{preset.description}</p>

            <div className="space-y-1 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Base Risk</span>
                <span className="font-mono text-text-primary-dark">{preset.values.base_risk_percent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Recovery</span>
                <span className="font-mono text-text-primary-dark">1 double-down</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Weekly Limit</span>
                <span className="font-mono text-text-primary-dark">{preset.values.weekly_drawdown_limit}%</span>
              </div>
            </div>

            <Button
              variant={isActive ? 'secondary' : 'primary'}
              size="sm"
              className="w-full"
              onClick={() => handleApply(preset.name)}
              disabled={isActive}
            >
              {isActive ? 'Currently Active' : 'Apply Preset'}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
