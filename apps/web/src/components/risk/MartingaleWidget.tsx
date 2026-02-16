'use client';

import { cn, martingaleColor } from '@/lib/utils';
import { Shield } from 'lucide-react';

interface MartingaleWidgetProps {
  step: string;
  baseRisk: number;
  payoutPercent: number;
}

export function MartingaleWidget({ step, baseRisk, payoutPercent }: MartingaleWidgetProps) {
  const isDone = step === 'done';
  const isStep1 = step === '1';
  const doubleDownSize = baseRisk * (100 + payoutPercent) / payoutPercent;

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs',
      isDone
        ? 'border-halt/50 bg-loss-bg'
        : isStep1
          ? 'border-caution/50 bg-caution-bg'
          : 'border-profit/30 bg-profit-bg'
    )}>
      <Shield size={14} className={martingaleColor(step)} />
      <div className="flex gap-1">
        {/* Step 0 dot */}
        <div className={cn(
          'w-2 h-2 rounded-full',
          isDone ? 'bg-halt' : 'bg-profit'
        )} />
        {/* Step 1 dot */}
        <div className={cn(
          'w-2 h-2 rounded-full',
          isDone ? 'bg-halt' : isStep1 ? 'bg-caution' : 'bg-border-dark'
        )} />
      </div>
      <span className={cn('font-mono font-medium uppercase', martingaleColor(step))}>
        {isDone
          ? 'DONE'
          : isStep1
            ? `STEP 1 · ${doubleDownSize.toFixed(1)}%`
            : `STEP 0 · ${baseRisk}%`
        }
      </span>
    </div>
  );
}
