'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn, martingaleColor } from '@/lib/utils';
import { Shield, AlertTriangle } from 'lucide-react';
import type { MartingaleState, RiskProfile } from '@nexus/shared';

interface RiskStatusProps {
  riskProfile: RiskProfile | null;
  martingaleStates: MartingaleState[];
  totalExposure: number;
  dailyDrawdown: number;
  isHalted: boolean;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-2 bg-navy rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function RiskStatus({
  riskProfile, martingaleStates, totalExposure, dailyDrawdown, isHalted
}: RiskStatusProps) {
  const maxExposure = riskProfile?.max_concurrent_exposure ?? 20;
  const weeklyLimit = riskProfile?.weekly_drawdown_limit ?? 15;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Status</CardTitle>
        {isHalted ? (
          <Badge variant="halt" pulse>HALTED</Badge>
        ) : (
          <Badge variant="profit">ACTIVE</Badge>
        )}
      </CardHeader>

      <div className="space-y-4">
        {/* Daily Drawdown */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-secondary">Daily Drawdown</span>
            <span className="font-mono text-text-primary-dark tabular-nums">
              {Math.abs(dailyDrawdown).toFixed(1)}% / {weeklyLimit}%
            </span>
          </div>
          <ProgressBar
            value={Math.abs(dailyDrawdown)}
            max={weeklyLimit}
            color={Math.abs(dailyDrawdown) > weeklyLimit * 0.7 ? 'bg-loss' : 'bg-electric'}
          />
        </div>

        {/* Exposure */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-secondary">Exposure</span>
            <span className="font-mono text-text-primary-dark tabular-nums">
              {totalExposure.toFixed(1)}% / {maxExposure}%
            </span>
          </div>
          <ProgressBar
            value={totalExposure}
            max={maxExposure}
            color={totalExposure > maxExposure * 0.7 ? 'bg-caution' : 'bg-electric'}
          />
        </div>

        {/* Martingale States */}
        <div>
          <p className="text-xs text-text-secondary mb-2">Martingale States</p>
          {martingaleStates.length === 0 ? (
            <p className="text-xs text-text-secondary">All instruments at BASE</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {martingaleStates.map((ms) => (
                <div
                  key={ms.instrument}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-navy border border-border-dark"
                >
                  <Shield size={14} className={martingaleColor(ms.current_step)} />
                  <span className="text-xs font-medium">{ms.instrument}</span>
                  <span className={cn('text-xs font-mono uppercase', martingaleColor(ms.current_step))}>
                    {ms.current_step}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Status */}
        <div className="flex items-center gap-2 pt-2 border-t border-border-dark">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isHalted ? 'bg-halt animate-pulse' : 'bg-profit'
          )} />
          <span className="text-xs text-text-secondary">
            {isHalted ? 'Trading halted until daily reset' : 'All systems nominal'}
          </span>
        </div>
      </div>
    </Card>
  );
}
