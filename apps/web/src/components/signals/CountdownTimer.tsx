'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCountdown } from '@/lib/utils';

interface CountdownTimerProps {
  startTime: number;   // absolute ms timestamp when trade begins
  expiresAt: number;   // absolute ms timestamp when trade expires
  totalSeconds: number; // duration in seconds (e.g. 60)
}

export function CountdownTimer({ startTime, expiresAt, totalSeconds }: CountdownTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isPreparing = now < startTime;
  const isExpired = !isPreparing && now >= expiresAt;

  const remaining = isPreparing
    ? Math.max(0, startTime - now)
    : Math.max(0, expiresAt - now);

  // For the progress bar: prep phase uses prep window, active phase uses trade duration
  const prepDuration = startTime - (expiresAt - totalSeconds * 1000); // time between creation and start
  const totalMs = isPreparing ? Math.max(prepDuration, 1) : totalSeconds * 1000;
  const fraction = totalMs > 0 ? remaining / totalMs : 0;

  const colorClass = isExpired
    ? 'text-text-secondary'
    : isPreparing
      ? 'text-caution'
      : fraction > 0.5
        ? 'text-profit'
        : fraction > 0.2
          ? 'text-caution'
          : 'text-loss';

  const barColor = isExpired
    ? 'bg-border-dark'
    : isPreparing
      ? 'bg-caution'
      : fraction > 0.5
        ? 'bg-profit'
        : fraction > 0.2
          ? 'bg-caution'
          : 'bg-loss';

  const label = isPreparing ? 'Starts In' : 'Time Left';
  const displayText = isExpired ? 'EXPIRED' : formatCountdown(remaining);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className={cn(
          'font-mono font-bold tabular-nums',
          colorClass,
          isPreparing && 'animate-pulse-signal',
          !isPreparing && remaining > 0 && fraction <= 0.2 && 'animate-pulse-signal',
        )}>
          {displayText}
        </span>
      </div>
      <div className="w-full h-1 bg-border-dark rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', barColor)}
          style={{ width: `${Math.max(0, fraction * 100)}%` }}
        />
      </div>
    </div>
  );
}
