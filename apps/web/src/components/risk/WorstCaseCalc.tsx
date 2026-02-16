'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertTriangle } from 'lucide-react';

interface WorstCaseProps {
  baseRisk: number;
  martingaleEnabled: boolean;
  maxExposure: number;
  payoutPercent?: number;
  accountBalance?: number;
}

interface WorstCaseResult {
  max_daily_loss_percent: number;
  step_breakdown: { step: string; size_percent: number; loss_percent: number }[];
}

export function WorstCaseCalc({
  baseRisk, martingaleEnabled, maxExposure,
  payoutPercent = 88, accountBalance = 10000
}: WorstCaseProps) {
  const [result, setResult] = useState<WorstCaseResult | null>(null);

  useEffect(() => {
    let totalLoss = 0;
    const steps: WorstCaseResult['step_breakdown'] = [];

    // Step 0: base risk
    const step0 = Math.min(baseRisk, maxExposure);
    steps.push({ step: 'Step 0', size_percent: step0, loss_percent: step0 });
    totalLoss += step0;

    if (martingaleEnabled) {
      // Step 1: payout-based double-down
      const doubleDown = baseRisk * (100 + payoutPercent) / payoutPercent;
      const step1 = Math.min(doubleDown, maxExposure);
      steps.push({ step: 'Step 1', size_percent: step1, loss_percent: step1 });
      totalLoss += step1;
    }

    setResult({
      max_daily_loss_percent: totalLoss,
      step_breakdown: steps,
    });
  }, [baseRisk, martingaleEnabled, maxExposure, payoutPercent]);

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
