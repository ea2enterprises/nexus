'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { apiPost } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';

interface WorstCaseProps {
  baseRisk: number;
  martingaleEnabled: boolean;
  martingaleSteps: number;
  martingaleMultiplier: number;
  maxExposure: number;
  accountBalance?: number;
}

interface WorstCaseResult {
  max_daily_loss_percent: number;
  max_daily_loss_at_10k: number;
  step_breakdown: { step: string; size_percent: number; loss_percent: number }[];
}

export function WorstCaseCalc({
  baseRisk, martingaleEnabled, martingaleSteps, martingaleMultiplier, maxExposure,
  accountBalance = 10000
}: WorstCaseProps) {
  const [result, setResult] = useState<WorstCaseResult | null>(null);

  useEffect(() => {
    async function calculate() {
      try {
        const res = await apiPost('/risk/worst-case', {
          base_risk_percent: baseRisk,
          martingale_enabled: martingaleEnabled,
          martingale_steps: martingaleSteps,
          martingale_multiplier: martingaleMultiplier,
          max_concurrent_exposure: maxExposure,
        });
        if (res.success) {
          setResult(res.data);
        }
      } catch (err) {
        // Calculate locally as fallback
        let totalLoss = 0;
        const steps: WorstCaseResult['step_breakdown'] = [];
        if (martingaleEnabled) {
          let size = baseRisk;
          for (let i = 0; i <= martingaleSteps; i++) {
            const effective = Math.min(size, maxExposure);
            steps.push({ step: i === 0 ? 'Base' : `Step ${i}`, size_percent: effective, loss_percent: effective });
            totalLoss += effective;
            size *= martingaleMultiplier;
          }
        } else {
          steps.push({ step: 'Base', size_percent: baseRisk, loss_percent: baseRisk });
          totalLoss = baseRisk;
        }
        setResult({
          max_daily_loss_percent: totalLoss,
          max_daily_loss_at_10k: totalLoss * 100,
          step_breakdown: steps,
        });
      }
    }
    calculate();
  }, [baseRisk, martingaleEnabled, martingaleSteps, martingaleMultiplier, maxExposure]);

  if (!result) return null;

  const lossAmount = (result.max_daily_loss_percent / 100) * accountBalance;
  const isHighRisk = result.max_daily_loss_percent > 20;

  return (
    <Card className={isHighRisk ? 'border-loss/50' : 'border-caution/50'}>
      <CardHeader>
        <CardTitle>Worst-Case Scenario</CardTitle>
        <AlertTriangle size={16} className={isHighRisk ? 'text-loss' : 'text-caution'} />
      </CardHeader>

      <div className="space-y-3">
        {/* Step breakdown */}
        {result.step_breakdown.map((step) => (
          <div key={step.step} className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">{step.step} loss</span>
            <span className="font-mono text-loss tabular-nums">
              -{step.loss_percent.toFixed(1)}% (${((step.loss_percent / 100) * accountBalance).toFixed(0)})
            </span>
          </div>
        ))}

        {/* Total */}
        <div className="pt-2 border-t border-border-dark flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary-dark">Max Daily Loss</span>
          <div className="text-right">
            <p className="font-mono font-bold text-loss tabular-nums text-lg">
              -{result.max_daily_loss_percent.toFixed(1)}%
            </p>
            <p className="font-mono text-xs text-text-secondary tabular-nums">
              ${lossAmount.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
