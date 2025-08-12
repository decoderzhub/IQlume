import { create } from 'zustand';
import { User, Portfolio, TradingStrategy, Trade, BrokerageAccount, BankAccount, CustodialWallet } from '../types';

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  
  // Portfolio state
  portfolio: Portfolio | null;
  brokerageAccounts: BrokerageAccount[];
  bankAccounts: BankAccount[];
  custodialWallets: CustodialWallet[];
  selectedAccount: string | null;
  
  // Trading state
  strategies: TradingStrategy[];
  activeStrategy: TradingStrategy | null;
  trades: Trade[];
  
  // UI state
  sidebarOpen: boolean;
  activeView: 'dashboard' | 'strategies' | 'ai-chat' | 'trades' | 'accounts' | 'analytics' | 'settings';
  
  // Actions
  setUser: (user: User | null) => void;
  setPortfolio: (portfolio: Portfolio) => void;
  setBrokerageAccounts: (accounts: BrokerageAccount[]) => void;
  setBankAccounts: (accounts: BankAccount[]) => void;
  setCustodialWallets: (wallets: CustodialWallet[]) => void;
  updatePortfolioFromAccounts: () => void;
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
  brokerageAccounts: [],
  bankAccounts: [],
  custodialWallets: [],
  selectedAccount: null,
  strategies: [],
  activeStrategy: null,
  trades: [],
  sidebarOpen: true,
  activeView: 'dashboard',
  
  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setPortfolio: (portfolio) => set({ portfolio }),
  setBrokerageAccounts: (accounts) => set({ brokerageAccounts: accounts }, false, 'setBrokerageAccounts'),
  setBankAccounts: (accounts) => set({ bankAccounts: accounts }, false, 'setBankAccounts'),
  setCustodialWallets: (wallets) => set({ custodialWallets: wallets }, false, 'setCustodialWallets'),
  updatePortfolioFromAccounts: () => set((state) => {
    const brokerageTotal = state.brokerageAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const bankTotal = state.bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const walletTotal = state.custodialWallets.reduce((sum, wallet) => sum + wallet.balance_usd + wallet.balance_treasuries, 0);
    const buyingPower = bankTotal + state.custodialWallets.reduce((sum, wallet) => sum + wallet.balance_usd, 0);
    
    const totalValue = brokerageTotal + bankTotal + walletTotal;
    const dayChange = totalValue * 0.01; // Mock 1% daily change
    const dayChangePercent = 1.0;
    
    return {
      portfolio: {
        total_value: totalValue,
        buying_power: buyingPower,
        day_change: dayChange,
        day_change_percent: dayChangePercent,
        accounts: state.brokerageAccounts,
        bank_accounts: state.bankAccounts,
        custodial_wallets: state.custodialWallets,
      }
    };
  }, false, 'updatePortfolioFromAccounts'),
  setSelectedAccount: (accountId) => set({ selectedAccount: accountId }),
  setStrategies: (strategies) => set({ strategies }),
  setActiveStrategy: (strategy) => set({ activeStrategy: strategy }),
  setTrades: (trades) => set({ trades }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveView: (view) => set({ activeView: view }),
  setLoading: (loading) => set({ loading }),
}));