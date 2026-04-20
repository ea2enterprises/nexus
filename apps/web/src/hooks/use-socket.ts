'use client';

import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useAppStore } from '@/stores/app.store';
import type { Signal, Trade, MartingaleState } from '@nexus/shared';

export function useSocket() {
  const { user, addSignal, addTrade, updateMartingaleState, setBrokerConnected, setBrokerDisconnected } = useAppStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    const socket = connectSocket(user.id);

    socket.on('signal:new', (signal: Signal) => {
      addSignal(signal);
    });

    socket.on('trade:update', (trade: Trade) => {
      addTrade(trade);
    });

    socket.on('martingale:update', (state: MartingaleState) => {
      updateMartingaleState(state);
    });

    socket.on('broker:connected', ({ isDemo }: { isDemo: boolean }) => {
      setBrokerConnected(true, isDemo);
    });

    socket.on('broker:disconnected', ({ reason }: { reason: string }) => {
      setBrokerDisconnected(reason);
    });

    socket.on('broker:reconnect_failed', () => {
      setBrokerDisconnected('reconnect_failed');
    });

    return () => {
      socket.off('signal:new');
      socket.off('trade:update');
      socket.off('martingale:update');
      socket.off('broker:connected');
      socket.off('broker:disconnected');
      socket.off('broker:reconnect_failed');
      disconnectSocket();
      initialized.current = false;
    };
  }, [user, addSignal, addTrade, updateMartingaleState, setBrokerConnected, setBrokerDisconnected]);

  return getSocket();
}
