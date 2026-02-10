'use client';

import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useAppStore } from '@/stores/app.store';
import type { Signal, Trade, MartingaleState } from '@nexus/shared';

export function useSocket() {
  const { user, addSignal, addTrade, updateMartingaleState } = useAppStore();
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

    return () => {
      socket.off('signal:new');
      socket.off('trade:update');
      socket.off('martingale:update');
      disconnectSocket();
      initialized.current = false;
    };
  }, [user, addSignal, addTrade, updateMartingaleState]);

  return getSocket();
}
