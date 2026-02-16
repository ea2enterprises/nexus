import { create } from 'zustand';
import type { User, Signal, RiskProfile, MartingaleState, Trade } from '@nexus/shared';

function normalizeSignal(s: any): Signal {
  return {
    ...s,
    confirming_strategies: typeof s.confirming_strategies === 'string'
      ? JSON.parse(s.confirming_strategies) : s.confirming_strategies,
    meta: typeof s.meta === 'string' ? JSON.parse(s.meta) : s.meta,
    start_time: s.start_time || s.timestamp_utc,
  };
}

interface AppState {
  // Auth
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (access: string, refresh: string) => void;
  logout: () => void;

  // Signals
  signals: Signal[];
  addSignal: (signal: Signal) => void;
  setSignals: (signals: Signal[]) => void;

  // Risk
  riskProfile: RiskProfile | null;
  setRiskProfile: (profile: RiskProfile) => void;

  // Martingale
  martingaleStates: MartingaleState[];
  setMartingaleStates: (states: MartingaleState[]) => void;
  updateMartingaleState: (state: MartingaleState) => void;

  // Trades
  recentTrades: Trade[];
  setRecentTrades: (trades: Trade[]) => void;
  addTrade: (trade: Trade) => void;

  // Audio
  isMuted: boolean;
  audioReady: boolean;
  toggleMute: () => void;
  setAudioReady: (ready: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  accessToken: typeof window !== 'undefined' ? localStorage.getItem('nexus_access_token') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('nexus_access_token') : false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setTokens: (access, refresh) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_access_token', access);
      localStorage.setItem('nexus_refresh_token', refresh);
    }
    set({ accessToken: access, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nexus_access_token');
      localStorage.removeItem('nexus_refresh_token');
    }
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  // Signals
  signals: [],
  addSignal: (signal) => set((s) => ({
    signals: [normalizeSignal(signal), ...s.signals].slice(0, 100),
  })),
  setSignals: (signals) => set({ signals: signals.map(normalizeSignal) }),

  // Risk
  riskProfile: null,
  setRiskProfile: (profile) => set({ riskProfile: profile }),

  // Martingale
  martingaleStates: [],
  setMartingaleStates: (states) => set({ martingaleStates: states }),
  updateMartingaleState: (state) => set((s) => ({
    martingaleStates: s.martingaleStates.map((ms) =>
      ms.instrument === state.instrument ? state : ms
    ),
  })),

  // Trades
  recentTrades: [],
  setRecentTrades: (trades) => set({ recentTrades: trades }),
  addTrade: (trade) => set((s) => ({
    recentTrades: [trade, ...s.recentTrades].slice(0, 50),
  })),

  // Audio
  isMuted: typeof window !== 'undefined' ? localStorage.getItem('nexus_muted') === 'true' : false,
  audioReady: false,
  toggleMute: () => set((s) => {
    const next = !s.isMuted;
    if (typeof window !== 'undefined') localStorage.setItem('nexus_muted', String(next));
    return { isMuted: next };
  }),
  setAudioReady: (ready) => set({ audioReady: ready }),
}));
