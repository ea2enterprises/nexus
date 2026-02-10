'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatPips, formatPrice, cn, pnlColor } from '@/lib/utils';
import type { Trade } from '@nexus/shared';

interface ActivePositionsProps {
  positions: Trade[];
  onClose?: (tradeId: string) => void;
}

export function ActivePositions({ positions, onClose }: ActivePositionsProps) {
  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Positions</CardTitle>
          <Badge variant="default">0</Badge>
        </CardHeader>
        <p className="text-sm text-text-secondary text-center py-6">No open positions</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Positions</CardTitle>
        <Badge variant="electric">{positions.length}</Badge>
      </CardHeader>
      <div className="space-y-2">
        {positions.map((pos) => {
          const pnl = pos.pnl_usd ?? 0;
          const pips = pos.pnl_pips ?? 0;
          return (
            <div
              key={pos.id}
              className="flex items-center justify-between p-3 rounded-lg bg-navy border border-border-dark"
            >
              <div className="flex items-center gap-3">
                <Badge variant={pos.direction === 'BUY' ? 'profit' : 'loss'}>
                  {pos.direction}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-text-primary-dark">{pos.instrument}</p>
                  <p className="text-xs font-mono text-text-secondary">
                    {formatPrice(pos.entry_price, pos.instrument)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={cn('text-sm font-mono font-medium tabular-nums', pnlColor(pnl))}>
                    {formatCurrency(pnl)}
                  </p>
                  <p className={cn('text-xs font-mono tabular-nums', pnlColor(pips))}>
                    {formatPips(pips)}
                  </p>
                </div>
                {onClose && (
                  <Button variant="danger" size="sm" onClick={() => onClose(pos.id)}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
