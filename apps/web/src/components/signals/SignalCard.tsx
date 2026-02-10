'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfidenceBadge } from './ConfidenceBadge';
import { formatPrice, formatTime, cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Signal } from '@nexus/shared';

interface SignalCardProps {
  signal: Signal;
  onExecute?: (signalId: string) => void;
  onViewDetail?: (signalId: string) => void;
}

export function SignalCard({ signal, onExecute, onViewDetail }: SignalCardProps) {
  const isBuy = signal.direction === 'BUY';
  const instrument = signal.instrument;
  const isJpy = instrument.includes('JPY');
  const pipSize = isJpy ? 0.01 : 0.0001;

  const slPips = Math.abs(Number(signal.entry.price) - Number(signal.stop_loss)) / pipSize;
  const tp1 = signal.take_profits[0];
  const tp2 = signal.take_profits[1];
  const tp1Pips = tp1 ? Math.abs(Number(signal.entry.price) - tp1.price) / pipSize : 0;
  const tp2Pips = tp2 ? Math.abs(Number(signal.entry.price) - tp2.price) / pipSize : 0;

  return (
    <Card hover className="animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={signal.status === 'active' ? 'profit' : 'default'} pulse={signal.status === 'active'}>
            {signal.status === 'active' ? 'LIVE' : signal.status.toUpperCase()}
          </Badge>
          <Badge variant="electric">{signal.signal_type}</Badge>
        </div>
        <ConfidenceBadge confidence={signal.confidence} />
      </div>

      {/* Direction + Instrument */}
      <div className="flex items-center gap-2 mb-4">
        {isBuy ? (
          <ArrowUpRight size={24} className="text-profit" />
        ) : (
          <ArrowDownRight size={24} className="text-loss" />
        )}
        <span className={cn('text-lg font-bold', isBuy ? 'text-profit' : 'text-loss')}>
          {signal.direction}
        </span>
        <span className="text-lg font-bold text-text-primary-dark">{instrument}</span>
      </div>

      {/* Price Levels */}
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Entry</span>
          <span className="font-mono text-text-primary-dark tabular-nums">
            {formatPrice(signal.entry.price, instrument)} ({signal.entry.type})
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Stop Loss</span>
          <span className="font-mono text-loss tabular-nums">
            {formatPrice(Number(signal.stop_loss), instrument)} (-{slPips.toFixed(1)} pips)
          </span>
        </div>
        {tp1 && (
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">TP1</span>
            <span className="font-mono text-profit tabular-nums">
              {formatPrice(tp1.price, instrument)} (+{tp1Pips.toFixed(1)} pips)
            </span>
          </div>
        )}
        {tp2 && (
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">TP2</span>
            <span className="font-mono text-profit tabular-nums">
              {formatPrice(tp2.price, instrument)} (+{tp2Pips.toFixed(1)} pips)
            </span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs text-text-secondary">
        <span>R:R 1:{signal.risk_reward}</span>
        <span>|</span>
        <span>Size: {signal.position_size_percent}%</span>
        <span>|</span>
        <span>{signal.meta?.session}</span>
      </div>

      {/* Confirming Strategies */}
      <div className="flex flex-wrap gap-1 mb-4">
        {signal.confirming_strategies.map((s) => (
          <Badge key={s} variant="default">{s}</Badge>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {signal.status === 'active' && onExecute && (
          <Button variant="primary" size="sm" className="flex-1" onClick={() => onExecute(signal.id)}>
            Execute Now
          </Button>
        )}
        {onViewDetail && (
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => onViewDetail(signal.id)}>
            View Analysis
          </Button>
        )}
      </div>
    </Card>
  );
}
