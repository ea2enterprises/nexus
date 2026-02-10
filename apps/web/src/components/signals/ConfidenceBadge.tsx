'use client';

import { cn } from '@/lib/utils';

interface ConfidenceBadgeProps {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const getColor = () => {
    if (confidence >= 80) return 'text-profit bg-profit-bg';
    if (confidence >= 65) return 'text-electric bg-electric/10';
    return 'text-caution bg-caution-bg';
  };

  return (
    <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold', getColor())}>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={cn(
              'w-1 rounded-full',
              bar <= Math.ceil(confidence / 25) ? 'opacity-100' : 'opacity-25'
            )}
            style={{
              height: `${8 + bar * 2}px`,
              backgroundColor: 'currentColor',
            }}
          />
        ))}
      </div>
      <span className="font-mono tabular-nums">{confidence}</span>
    </div>
  );
}
