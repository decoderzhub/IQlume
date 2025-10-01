import { useStore } from './useStore';

export const useUser = () => useStore((state) => state.user);
export const useIsAuthenticated = () => useStore((state) => state.isAuthenticated);
export const useIsDeveloperMode = () => useStore((state) => state.isDeveloperMode);

export const usePortfolio = () => useStore((state) => state.portfolio);

export const usePortfolioStats = () =>
  useStore((state) => ({
    totalValue: state.portfolio?.total_value || 0,
    buyingPower: state.portfolio?.buying_power || 0,
    dayChange: state.portfolio?.day_change || 0,
    dayChangePercent: state.portfolio?.day_change_percent || 0,
  }));

export const useBrokerageAccounts = () => useStore((state) => state.brokerageAccounts);
export const useBankAccounts = () => useStore((state) => state.bankAccounts);
export const useCustodialWallets = () => useStore((state) => state.custodialWallets);
export const useSelectedAccount = () => useStore((state) => state.selectedAccount);

export const useAccounts = () =>
  useStore((state) => ({
    brokerageAccounts: state.brokerageAccounts,
    bankAccounts: state.bankAccounts,
    custodialWallets: state.custodialWallets,
    selectedAccount: state.selectedAccount,
  }));

export const useStrategies = () => useStore((state) => state.strategies);
export const useActiveStrategy = () => useStore((state) => state.activeStrategy);
export const useTrades = () => useStore((state) => state.trades);

export const useTradingState = () =>
  useStore((state) => ({
    strategies: state.strategies,
    activeStrategy: state.activeStrategy,
    trades: state.trades,
  }));

export const useSidebarOpen = () => useStore((state) => state.sidebarOpen);
export const useActiveView = () => useStore((state) => state.activeView);
export const useLoading = () => useStore((state) => state.loading);

export const useUIState = () =>
  useStore((state) => ({
    sidebarOpen: state.sidebarOpen,
    activeView: state.activeView,
    loading: state.loading,
  }));

export const useSetUser = () => useStore((state) => state.setUser);
export const useSetPortfolio = () => useStore((state) => state.setPortfolio);
export const useSetBrokerageAccounts = () => useStore((state) => state.setBrokerageAccounts);
export const useSetBankAccounts = () => useStore((state) => state.setBankAccounts);
export const useSetCustodialWallets = () => useStore((state) => state.setCustodialWallets);
export const useUpdatePortfolioFromAccounts = () => useStore((state) => state.updatePortfolioFromAccounts);
export const useSetSelectedAccount = () => useStore((state) => state.setSelectedAccount);
export const useSetStrategies = () => useStore((state) => state.setStrategies);
export const useSetActiveStrategy = () => useStore((state) => state.setActiveStrategy);
export const useSetTrades = () => useStore((state) => state.setTrades);
export const useSetSidebarOpen = () => useStore((state) => state.setSidebarOpen);
export const useSetActiveView = () => useStore((state) => state.setActiveView);
export const useSetLoading = () => useStore((state) => state.setLoading);
export const useSetIsDeveloperMode = () => useStore((state) => state.setIsDeveloperMode);
export const useGetEffectiveSubscriptionTier = () => useStore((state) => state.getEffectiveSubscriptionTier);

export const useActions = () =>
  useStore((state) => ({
    setUser: state.setUser,
    setPortfolio: state.setPortfolio,
    setBrokerageAccounts: state.setBrokerageAccounts,
    setBankAccounts: state.setBankAccounts,
    setCustodialWallets: state.setCustodialWallets,
    updatePortfolioFromAccounts: state.updatePortfolioFromAccounts,
    setSelectedAccount: state.setSelectedAccount,
    setStrategies: state.setStrategies,
    setActiveStrategy: state.setActiveStrategy,
    setTrades: state.setTrades,
    setSidebarOpen: state.setSidebarOpen,
    setActiveView: state.setActiveView,
    setLoading: state.setLoading,
    setIsDeveloperMode: state.setIsDeveloperMode,
    getEffectiveSubscriptionTier: state.getEffectiveSubscriptionTier,
  }));
