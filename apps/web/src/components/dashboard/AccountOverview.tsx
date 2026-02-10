'use client';

import { Card, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatPercent, cn, pnlColor } from '@/lib/utils';
import { DollarSign, TrendingUp, Target, BarChart3 } from 'lucide-react';

interface AccountOverviewProps {
  balance: number;
  equity: number;
  todayPnl: number;
  openPnl: number;
  winRate7d: number;
  freeMargin: number;
}

export function AccountOverview({
  balance, equity, todayPnl, openPnl, winRate7d, freeMargin
}: AccountOverviewProps) {
  const stats = [
    { label: 'Balance', value: formatCurrency(balance), icon: DollarSign },
    { label: "Today's P&L", value: formatCurrency(todayPnl), icon: TrendingUp, color: pnlColor(todayPnl) },
    { label: 'Win Rate (7d)', value: `${winRate7d}%`, icon: Target },
    { label: 'Open P&L', value: formatCurrency(openPnl), icon: BarChart3, color: pnlColor(openPnl) },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <p className={cn(
                'text-xl font-bold font-mono tabular-nums',
                stat.color || 'text-text-primary-dark'
              )}>
                {stat.value}
              </p>
            </div>
            <stat.icon size={20} className="text-text-secondary" />
          </div>
        </Card>
      ))}
    </div>
  );
}
