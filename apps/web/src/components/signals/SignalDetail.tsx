'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/lib/utils';
import type { Signal } from '@nexus/shared';

interface SignalDetailProps {
  signal: Signal;
}

export function SignalDetail({ signal }: SignalDetailProps) {
  return (
    <div className="space-y-4">
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
            <span className="text-text-secondary">Key Level:</span>{' '}
            <span className="text-text-primary-dark">{signal.meta?.key_level}</span>
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
          <div>
            <span className="text-text-secondary">R:R Ratio:</span>{' '}
            <span className="font-mono text-text-primary-dark">1:{signal.risk_reward}</span>
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
  };
  return descriptions[id] || 'Strategy analysis confirmed';
}
