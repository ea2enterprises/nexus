'use client';

import { useEffect, useState, useMemo } from 'react';
import { SignalCard } from '@/components/signals/SignalCard';
import { SignalDetail } from '@/components/signals/SignalDetail';
import { SignalFilters } from '@/components/signals/SignalFilters';
import { Modal } from '@/components/ui/Modal';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useSocket } from '@/hooks/use-socket';
import { useSignals } from '@/hooks/use-signals';
import { useAppStore } from '@/stores/app.store';
import { apiPost, apiGet } from '@/lib/api';
import { useRouter } from 'next/navigation';
import type { Signal } from '@nexus/shared';

export default function SignalsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppStore();
  const signals = useSignals();
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterInstrument, setFilterInstrument] = useState<string | null>(null);
  const [filterDirection, setFilterDirection] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'time' | 'confidence'>('time');

  useSocket();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setLoading(false);
  }, [isAuthenticated, router]);

  const handleExecute = async (signalId: string) => {
    try {
      await apiPost('/trades/execute', { signal_id: signalId });
    } catch (err) {
      console.error('Execution failed:', err);
    }
  };

  const handleViewDetail = async (signalId: string) => {
    const signal = signals.find(s => s.id === signalId);
    if (signal) {
      setSelectedSignal(signal);
    } else {
      try {
        const res = await apiGet(`/signals/${signalId}`);
        if (res.success) {
          const d = res.data;
          setSelectedSignal({
            ...d,
            confirming_strategies: typeof d.confirming_strategies === 'string' ? JSON.parse(d.confirming_strategies) : d.confirming_strategies,
            meta: typeof d.meta === 'string' ? JSON.parse(d.meta) : d.meta,
          } as Signal);
        }
      } catch (err) {
        console.error('Failed to fetch signal:', err);
      }
    }
  };

  // Client-side filtering and sorting
  const filtered = useMemo(() => {
    return signals
      .filter(s => !filterInstrument || s.instrument === filterInstrument)
      .filter(s => !filterDirection || s.direction === filterDirection)
      .filter(s => !filterType || s.signal_type === filterType)
      .sort((a, b) =>
        sortBy === 'confidence'
          ? b.confidence - a.confidence
          : new Date(b.timestamp_utc).getTime() - new Date(a.timestamp_utc).getTime()
      );
  }, [signals, filterInstrument, filterDirection, filterType, sortBy]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary-dark">Live Signals</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary-dark">Live Signals</h1>
        <span className="text-sm text-text-secondary">{filtered.length} signals</span>
      </div>

      {/* Filters */}
      <SignalFilters
        instrument={filterInstrument}
        direction={filterDirection}
        signalType={filterType}
        sortBy={sortBy}
        onInstrumentChange={setFilterInstrument}
        onDirectionChange={setFilterDirection}
        onSignalTypeChange={setFilterType}
        onSortChange={setSortBy}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-secondary">
            {signals.length === 0 ? 'Waiting for signals...' : 'No signals match your filters'}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {signals.length === 0 ? 'Signals are generated every 15–60 seconds' : 'Try adjusting your filter criteria'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onExecute={handleExecute}
              onViewDetail={handleViewDetail}
            />
          ))}
        </div>
      )}

      {/* Signal Detail Modal */}
      <Modal
        open={!!selectedSignal}
        onClose={() => setSelectedSignal(null)}
        title={selectedSignal ? `${selectedSignal.direction} ${selectedSignal.instrument}` : ''}
      >
        {selectedSignal && <SignalDetail signal={selectedSignal} />}
      </Modal>
    </div>
  );
}
