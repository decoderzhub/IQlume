import { create } from 'zustand';
import { User, Portfolio, TradingStrategy, Trade, BrokerageAccount, BankAccount, CustodialWallet } from '../types';
import { SubscriptionTier } from '../lib/constants';

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  isDeveloperMode: boolean;
  userTimezone: string;

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
  globalError: Error | null;

  // Actions
  setUser: (user: User | null) => void;
  setUserTimezone: (timezone: string) => void;
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
  setIsDeveloperMode: (isDeveloperMode: boolean) => void;
  setGlobalError: (error: Error | null) => void;
  getEffectiveSubscriptionTier: () => SubscriptionTier;
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  loading: false,
  isDeveloperMode: typeof window !== 'undefined' ? localStorage.getItem('brokernomex_developer_mode') === 'true' : false,
  userTimezone: 'America/New_York', // Default to EST
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
  globalError: null,

  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setUserTimezone: (timezone) => set({ userTimezone: timezone }),
  setPortfolio: (portfolio) => set({ portfolio }),
  setBrokerageAccounts: (accounts) => set({ brokerageAccounts: accounts }, false, 'setBrokerageAccounts'),
  setBankAccounts: (accounts) => set({ bankAccounts: accounts }, false, 'setBankAccounts'),
  setCustodialWallets: (wallets) => set({ custodialWallets: wallets }, false, 'setCustodialWallets'),
  updatePortfolioFromAccounts: () => set((state) => {
    const brokerageTotal = state.brokerageAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const bankTotal = state.bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const walletTotal = state.custodialWallets.reduce((sum, wallet) => sum + wallet.balance_usd + wallet.balance_treasuries, 0);

    // Calculate buying power: liquid cash available for trading
    // Includes bank account balances, custodial wallet USD balances, and brokerage cash
    // Note: This is a simplified calculation. Real buying power calculation should come from backend
    const brokerageCash = state.brokerageAccounts.reduce((sum, acc) => {
      // Assuming 20% of brokerage balance is available cash (this should come from API)
      return sum + (acc.balance * 0.2);
    }, 0);
    const buyingPower = bankTotal + state.custodialWallets.reduce((sum, wallet) => sum + wallet.balance_usd, 0) + brokerageCash;

    const totalValue = brokerageTotal + bankTotal + walletTotal;

    // Use existing portfolio data for day change if available, otherwise calculate from backend
    // Day change should be fetched from backend API with actual market data
    const existingPortfolio = state.portfolio;
    const dayChange = existingPortfolio?.day_change || 0;
    const dayChangePercent = existingPortfolio?.day_change_percent || 0;

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
  setIsDeveloperMode: (isDeveloperMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('brokernomex_developer_mode', isDeveloperMode.toString());
    }
    set({ isDeveloperMode });
  },
  setGlobalError: (error) => set({ globalError: error }),
  getEffectiveSubscriptionTier: () => {
    const state = useStore.getState();
    if (state.isDeveloperMode) {
      return 'elite';
    }
    return state.user?.subscription_tier || 'starter';
  },
}));