import { create } from 'zustand';
import type { User, Signal, RiskProfile, MartingaleState, Trade } from '@nexus/shared';

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
    signals: [signal, ...s.signals].slice(0, 100),
  })),
  setSignals: (signals) => set({ signals }),

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
}));
