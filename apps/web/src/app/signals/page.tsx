'use client';

import { useEffect, useState } from 'react';
import { SignalCard } from '@/components/signals/SignalCard';
import { SignalDetail } from '@/components/signals/SignalDetail';
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
        if (res.success) setSelectedSignal(res.data);
      } catch (err) {
        console.error('Failed to fetch signal:', err);
      }
    }
  };

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
        <span className="text-sm text-text-secondary">{signals.length} signals</span>
      </div>

      {signals.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-secondary">Waiting for signals...</p>
          <p className="text-xs text-text-secondary mt-1">Signals are generated every 15–60 seconds</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {signals.map((signal) => (
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
