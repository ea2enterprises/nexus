'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { TradeTable } from '@/components/journal/TradeTable';
import { TradeFilters } from '@/components/journal/TradeFilters';
import { JournalExport } from '@/components/journal/JournalExport';
import { useAppStore } from '@/stores/app.store';
import { apiGet } from '@/lib/api';
import { useRouter } from 'next/navigation';
import type { Trade } from '@nexus/shared';

export default function JournalPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppStore();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [instrument, setInstrument] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    async function load() {
      try {
        const params = new URLSearchParams();
        params.set('limit', '50');
        if (instrument) params.set('instrument', instrument);

        const [tradesRes, statsRes] = await Promise.all([
          apiGet(`/trades?${params}`),
          apiGet('/trades/stats'),
        ]);

        if (tradesRes.success) {
          let filtered = tradesRes.data;
          if (result) {
            filtered = filtered.filter((t: Trade) => t.result === result);
          }
          setTrades(filtered);
        }
        if (statsRes.success) setStats(statsRes.data);
      } catch (err) {
        console.error('Failed to load journal:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isAuthenticated, router, instrument, result]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary-dark">Trade Journal</h1>
        <JournalExport trades={trades} />
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Trades', value: stats.total_trades },
            { label: 'Win Rate', value: `${stats.win_rate}%` },
            { label: 'Total P&L', value: `$${stats.total_pnl.toFixed(2)}`, color: stats.total_pnl >= 0 ? 'text-profit' : 'text-loss' },
            { label: 'Best Trade', value: `$${stats.best_trade.toFixed(2)}`, color: 'text-profit' },
          ].map((s) => (
            <Card key={s.label} padding="sm">
              <p className="text-xs text-text-secondary">{s.label}</p>
              <p className={`text-lg font-bold font-mono tabular-nums ${s.color || 'text-text-primary-dark'}`}>
                {s.value}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <TradeFilters
        selectedInstrument={instrument}
        selectedResult={result}
        onInstrumentChange={setInstrument}
        onResultChange={setResult}
      />

      {/* Trade Table */}
      <Card padding="sm">
        <TradeTable trades={trades} loading={loading} />
      </Card>
    </div>
  );
}
