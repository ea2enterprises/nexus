'use client';

import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
import type { Trade } from '@nexus/shared';

interface JournalExportProps {
  trades: Trade[];
}

export function JournalExport({ trades }: JournalExportProps) {
  const handleExportCSV = () => {
    const headers = [
      'Date', 'Instrument', 'Direction', 'Entry', 'Exit',
      'P&L ($)', 'P&L (pips)', 'P&L (%)', 'Martingale Step', 'Result', 'Notes'
    ];

    const rows = trades.map((t) => [
      t.entry_time,
      t.instrument,
      t.direction,
      t.entry_price,
      t.exit_price ?? '',
      t.pnl_usd ?? '',
      t.pnl_pips ?? '',
      t.pnl_percent ?? '',
      t.martingale_step,
      t.result ?? '',
      t.user_notes ?? '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleExportCSV}>
      <Download size={14} className="mr-1.5" />
      Export CSV
    </Button>
  );
}
