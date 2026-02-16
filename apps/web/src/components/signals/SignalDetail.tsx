'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatPrice, formatDuration } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import type { Signal } from '@nexus/shared';

interface SignalDetailProps {
  signal: Signal;
}

export function SignalDetail({ signal }: SignalDetailProps) {
  const [copied, setCopied] = useState(false);
  const potentialReturn = (signal.position_size_percent * signal.payout_percent / 100).toFixed(2);

  const copyStrike = useCallback(() => {
    const price = formatPrice(Number(signal.strike_price), signal.instrument);
    navigator.clipboard.writeText(price).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [signal.strike_price, signal.instrument]);

  return (
    <div className="space-y-4">
      {/* Payout Highlight */}
      <div className="flex items-center justify-center gap-2 bg-profit/10 border border-profit/25 rounded-xl px-4 py-3">
        <span className="text-sm font-medium text-profit/80 uppercase tracking-wide">Broker Payout</span>
        <span className="text-2xl font-bold text-profit tabular-nums">{signal.payout_percent}%</span>
        <span className="text-sm text-text-secondary">
          (return +{potentialReturn}% on {signal.position_size_percent}% size)
        </span>
      </div>

      {/* Trade Details */}
      <Card padding="sm">
        <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">Trade Details</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-text-secondary">Strike Price:</span>{' '}
            <button
              onClick={copyStrike}
              className="group inline-flex items-center gap-1 font-mono text-text-primary-dark hover:text-electric transition-colors"
              title="Click to copy"
            >
              {formatPrice(Number(signal.strike_price), signal.instrument)}
              {copied ? (
                <Check size={12} className="text-profit" />
              ) : (
                <Copy size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />
              )}
            </button>
          </div>
          <div>
            <span className="text-text-secondary">Duration:</span>{' '}
            <span className="font-mono text-text-primary-dark">{formatDuration(signal.expiration_seconds)}</span>
          </div>
          <div>
            <span className="text-text-secondary">Position Size:</span>{' '}
            <span className="font-mono text-text-primary-dark">{signal.position_size_percent}%</span>
          </div>
          <div>
            <span className="text-text-secondary">Martingale:</span>{' '}
            <Badge variant={signal.martingale_step === '0' ? 'profit' : signal.martingale_step === 'done' ? 'halt' : 'caution'}>
              {signal.martingale_step === 'done' ? 'DONE' : `STEP ${signal.martingale_step || '0'}`}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Strategy Breakdown */}
      <Card padding="sm">
        <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">Confirming Strategies</h4>
        <div className="space-y-2">
          {signal.confirming_strategies.map((strat) => (
            <div key={strat} className="flex items-start gap-2 text-sm">
              <Badge variant="electric">{strat}</Badge>
              <span className="text-text-secondary">{getStrategyDescription(strat)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Meta Details */}
      <Card padding="sm">
        <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">Signal Meta</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-text-secondary">Session:</span>{' '}
            <span className="text-text-primary-dark">{signal.meta?.session}</span>
          </div>
          <div>
            <span className="text-text-secondary">Volume:</span>{' '}
            <Badge variant={signal.meta?.volume_confirmation ? 'profit' : 'loss'}>
              {signal.meta?.volume_confirmation ? 'Confirmed' : 'Unconfirmed'}
            </Badge>
          </div>
          <div>
            <span className="text-text-secondary">News:</span>{' '}
            <Badge variant={signal.meta?.news_clear ? 'profit' : 'caution'}>
              {signal.meta?.news_clear ? 'Clear' : 'Pending'}
            </Badge>
          </div>
          <div>
            <span className="text-text-secondary">Correlation:</span>{' '}
            <Badge variant={signal.meta?.correlation_check === 'PASS' ? 'profit' : 'loss'}>
              {signal.meta?.correlation_check}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}

function getStrategyDescription(id: string): string {
  const descriptions: Record<string, string> = {
    'SMC-01': 'Order block rejection with fair value gap confirmation',
    'ICT-01': 'Optimal trade entry at London killzone with Judas swing',
    'PA-01': 'Price action pattern at key support/resistance level',
    'QUANT-01': 'Statistical mean reversion signal with momentum alignment',
    'FLOW-01': 'Order flow imbalance detected with volume delta confirmation',
    'SENT-01': 'Sentiment divergence between retail and institutional positioning',
    'ML-01': 'Machine learning ensemble consensus prediction',
    'SCALP-01': 'High-frequency scalp opportunity on tick-level data',
    // ICT confluence confirmations
    'LIQ-SWEEP': 'Liquidity sweep — price took out prior swing high/low',
    'MSS': 'Market structure shift — break of opposing swing level',
    'FVG': 'Fair value gap — 3-candle imbalance in displacement move',
    'SMC-OB': 'SMC order block — last opposing candle before displacement',
    'EMA-TREND': 'EMA trend alignment — 9 EMA above 21 EMA confirms direction',
    'VOLUME': 'Volume confirmation — displacement candle exceeds 1.5x average',
    'KILLZONE': 'Fired during high-volume institutional killzone session',
  };
  return descriptions[id] || 'Strategy analysis confirmed';
}
