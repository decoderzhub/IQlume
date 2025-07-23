import { create } from 'zustand';
import { User, Portfolio, TradingStrategy, Trade, BrokerageAccount } from '../types';

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  
  // Portfolio state
  portfolio: Portfolio | null;
  selectedAccount: string | null;
  
  // Trading state
  strategies: TradingStrategy[];
  activeStrategy: TradingStrategy | null;
  trades: Trade[];
  
  // UI state
  sidebarOpen: boolean;
  activeView: 'dashboard' | 'strategies' | 'trades' | 'analytics' | 'settings';
  
  // Actions
  setUser: (user: User | null) => void;
  setPortfolio: (portfolio: Portfolio) => void;
  setSelectedAccount: (accountId: string) => void;
  setStrategies: (strategies: TradingStrategy[]) => void;
  setActiveStrategy: (strategy: TradingStrategy) => void;
  setTrades: (trades: Trade[]) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveView: (view: AppState['activeView']) => void;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  loading: false,
  portfolio: null,
  selectedAccount: null,
  strategies: [],
  activeStrategy: null,
  trades: [],
  sidebarOpen: true,
  activeView: 'dashboard',
  
  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setPortfolio: (portfolio) => set({ portfolio }),
  setSelectedAccount: (accountId) => set({ selectedAccount: accountId }),
  setStrategies: (strategies) => set({ strategies }),
  setActiveStrategy: (strategy) => set({ activeStrategy: strategy }),
  setTrades: (trades) => set({ trades }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveView: (view) => set({ activeView: view }),
  setLoading: (loading) => set({ loading }),
}));