'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/app.store';
import { apiGet } from '@/lib/api';

export function useSignals() {
  const { signals, setSignals, isAuthenticated } = useAppStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchSignals() {
      try {
        const res = await apiGet('/signals?limit=20&status=active');
        if (res.success) {
          setSignals(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch signals:', err);
      }
    }

    fetchSignals();
    const interval = setInterval(fetchSignals, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [isAuthenticated, setSignals]);

  return signals;
}
