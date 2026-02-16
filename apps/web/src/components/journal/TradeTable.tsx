'use client';

import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatPrice, formatDateTime, formatDuration, cn, pnlColor } from '@/lib/utils';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import type { Trade } from '@nexus/shared';

interface TradeTableProps {
  trades: Trade[];
  loading?: boolean;
}

export function TradeTable({ trades, loading }: TradeTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-dark text-left">
            <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Date</th>
            <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Instrument</th>
            <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Dir</th>
            <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Strike</th>
            <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Duration</th>
            <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Payout</th>
            <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">P&L</th>
            <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Step</th>
            <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Result</th>
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)}
          {!loading && trades.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-text-secondary">
                No trades yet. Execute a signal to get started.
              </td>
            </tr>
          )}
          {!loading && trades.map((trade) => (
            <tr key={trade.id} className="border-b border-border-dark/50 hover:bg-navy/50 transition-colors">
              <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                {formatDateTime(trade.entry_time)}
              </td>
              <td className="px-4 py-3 font-medium text-text-primary-dark">{trade.instrument}</td>
              <td className="px-4 py-3">
                <Badge variant={trade.direction === 'BUY' ? 'profit' : 'loss'}>{trade.direction}</Badge>
              </td>
              <td className="px-4 py-3 font-mono text-text-primary-dark tabular-nums">
                {formatPrice(trade.strike_price, trade.instrument)}
              </td>
              <td className="px-4 py-3 font-mono text-text-secondary tabular-nums">
                {formatDuration(trade.expiration_seconds)}
              </td>
              <td className="px-4 py-3 font-mono text-profit tabular-nums">
                {trade.payout_percent}%
              </td>
              <td className={cn('px-4 py-3 font-mono font-medium tabular-nums', pnlColor(trade.pnl_usd ?? 0))}>
                {trade.pnl_usd != null ? formatCurrency(trade.pnl_usd) : '—'}
              </td>
              <td className="px-4 py-3">
                <Badge variant={
                  trade.martingale_step === '0' ? 'default' :
                  trade.martingale_step === 'done' ? 'halt' : 'caution'
                }>
                  {trade.martingale_step === 'done' ? 'DONE' : `STEP ${trade.martingale_step}`}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant={
                  trade.result === 'win' ? 'profit' :
                  trade.result === 'loss' ? 'loss' : 'default'
                }>
                  {trade.result || 'open'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
