import React, { useEffect } from 'react';
import { Sidebar } from './layout/Sidebar';
import { Header } from './layout/Header';
import { Dashboard } from './dashboard/Dashboard';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { AIChatView } from './ai-chat/AIChatView';
import { SettingsView } from './settings/SettingsView';
import { AnalyticsView } from './analytics/AnalyticsView';
import { TradingView } from './trading/TradingView';
import { ErrorNotification } from './ui/ErrorNotification';

import { StrategiesView } from './strategies/StrategiesView';
import { AccountsView } from './accounts/AccountsView';
import { TradesView } from './trades/TradesView';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { supabase } from '../lib/supabase';
import { BrokerageAccount } from '../types';

export function MainApp() {
  const {
    activeView,
    sidebarOpen,
    user,
    brokerageAccounts,
    setBrokerageAccounts,
    updatePortfolioFromAccounts,
    globalError,
    setGlobalError
  } = useStore();

  // Enable real-time updates for autonomous trading
  const { isConnected } = useRealTimeUpdates();

  // Load brokerage accounts from database on app initialization
  useEffect(() => {
    const loadAccounts = async () => {
      if (!user || brokerageAccounts.length > 0) return;

      try {
        const { data: accounts, error } = await supabase
          .from('brokerage_accounts')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error loading accounts:', error);
          return;
        }

        const transformedAccounts: BrokerageAccount[] = (accounts || []).map((account: any) => ({
          id: account.id,
          user_id: account.user_id,
          brokerage: account.brokerage,
          account_name: account.account_name,
          account_type: account.account_type,
          balance: account.balance,
          is_connected: account.is_connected,
          last_sync: account.last_sync,
          oauth_token: account.oauth_token,
          account_number: account.account_number,
          routing_number: account.routing_number,
        }));

        setBrokerageAccounts(transformedAccounts);
        updatePortfolioFromAccounts();
      } catch (error) {
        console.error('Error loading brokerage accounts:', error);
      }
    };

    loadAccounts();
  }, [user, brokerageAccounts.length, setBrokerageAccounts, updatePortfolioFromAccounts]);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'trading':
        return <TradingView />;
      case 'strategies':
        return <StrategiesView />;
      case 'ai-chat':
        return <AIChatView />;
      case 'trades':
        return <TradesView />;
      case 'accounts':
        return <AccountsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20">
      <Sidebar />
      <Header isConnected={isConnected} />
      <ErrorNotification
        error={globalError}
        onDismiss={() => setGlobalError(null)}
        autoHide={false}
      />

      <main className={cn(
        'pt-20 transition-all duration-300',
        // Desktop margins
        'lg:ml-0',
        sidebarOpen ? 'lg:pl-64' : 'lg:pl-[80px]',
        // Mobile - no left margin, full width
        'ml-0',
        // Padding
        'px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8'
      )}>
        {renderView()}
      </main>
    </div>
  );
}