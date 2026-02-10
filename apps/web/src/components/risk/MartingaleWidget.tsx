'use client';

import { cn, martingaleColor } from '@/lib/utils';
import { Shield } from 'lucide-react';

interface MartingaleWidgetProps {
  step: string;
  maxSteps: number;
  baseRisk: number;
  multiplier: number;
}

export function MartingaleWidget({ step, maxSteps, baseRisk, multiplier }: MartingaleWidgetProps) {
  const stepNum = step === 'base' ? 0 : step === 'halted' ? maxSteps + 1 : parseInt(step.replace('step', ''), 10) || 0;
  const isHalted = step === 'halted';
  const currentSize = isHalted ? 0 : baseRisk * Math.pow(multiplier, stepNum);

  const dots = Array.from({ length: maxSteps + 1 }, (_, i) => i <= stepNum);

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs',
      isHalted
        ? 'border-halt/50 bg-loss-bg'
        : step === 'base'
          ? 'border-profit/30 bg-profit-bg'
          : 'border-caution/50 bg-caution-bg'
    )}>
      <Shield size={14} className={martingaleColor(step)} />
      <div className="flex gap-0.5">
        {dots.map((active, i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full',
              active ? (isHalted ? 'bg-halt' : i === 0 ? 'bg-profit' : 'bg-caution') : 'bg-border-dark'
            )}
          />
        ))}
      </div>
      <span className={cn('font-mono font-medium uppercase', martingaleColor(step))}>
        {isHalted ? 'HALTED' : step === 'base' ? `BASE ${baseRisk}%` : `${step.toUpperCase()} ${currentSize.toFixed(0)}%`}
      </span>
    </div>
  );
}
