import React, { useEffect, useState } from 'react';
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
import { AdminDashboard } from './admin/AdminDashboard';
import { EnvironmentSwitchModal } from './trading/EnvironmentSwitchModal';

import { StrategiesView } from './strategies/StrategiesView';
import { AccountsView } from './accounts/AccountsView';
import { TradesView } from './trades/TradesView';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { useUserTimezone } from '../hooks/useUserTimezone';
import { supabase } from '../lib/supabase';
import { BrokerageAccount } from '../types';
import { wsManager } from '../services/WebSocketManager';

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

  const [showEnvironmentModal, setShowEnvironmentModal] = useState(false);
  const [targetEnvironment, setTargetEnvironment] = useState<'paper' | 'live'>('paper');

  // Enable real-time updates for autonomous trading
  const { isConnected } = useRealTimeUpdates();

  // Load user's timezone on app startup
  useUserTimezone();

  // Initialize WebSocket connection for real-time market data
  useEffect(() => {
    const initializeWebSocket = async () => {
      if (!user) return;

      try {
        // Get Alpaca credentials from brokerage accounts
        const { data: accounts, error } = await supabase
          .from('brokerage_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('brokerage', 'alpaca')
          .eq('is_connected', true)
          .limit(1);

        if (error || !accounts || accounts.length === 0) {
          console.warn('[MainApp] No connected Alpaca account found - will use HTTP polling for market data');
          return;
        }

        const alpacaAccount = accounts[0];

        // Check if oauth_data contains access token (OAuth) or use access_token field
        const oauthData = alpacaAccount.oauth_data as any;
        const authToken = alpacaAccount.access_token || oauthData?.access_token;

        if (!authToken) {
          console.warn('[MainApp] No Alpaca access token found - will use HTTP polling for market data');
          return;
        }

        // Set auth token and connect to WebSocket
        console.log('[MainApp] Initializing WebSocket with Alpaca OAuth credentials');
        wsManager.setAuthToken(authToken);

        // Set environment based on oauth_data.env field
        const environment = oauthData?.env === 'live' ? 'live' : 'paper';
        console.log(`[MainApp] Using Alpaca ${environment} environment for WebSocket`);
        wsManager.setEnvironment(environment);

        await wsManager.connect();
        console.log('[MainApp] ✅ WebSocket connected successfully for real-time market data');
      } catch (error) {
        console.error('[MainApp] ❌ Error initializing WebSocket:', error);
        console.log('[MainApp] Will fall back to HTTP polling for market data');
      }
    };

    initializeWebSocket();

    // Cleanup on unmount
    return () => {
      wsManager.disconnect();
    };
  }, [user]);

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

  const handleShowEnvironmentModal = (environment: 'paper' | 'live') => {
    setTargetEnvironment(environment);
    setShowEnvironmentModal(true);
  };

  const handleConfirmEnvironmentSwitch = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from('trading_environment_preferences')
        .upsert({
          user_id: session.user.id,
          current_environment: targetEnvironment,
          default_environment: targetEnvironment,
          show_confirmation_on_switch: true,
        });

      setShowEnvironmentModal(false);
    } catch (error) {
      console.error('Error updating environment:', error);
    }
  };

  const handleCancelEnvironmentSwitch = () => {
    setShowEnvironmentModal(false);
  };

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
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20">
      <Sidebar />
      <Header isConnected={isConnected} onShowEnvironmentModal={handleShowEnvironmentModal} />
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

      <EnvironmentSwitchModal
        isOpen={showEnvironmentModal}
        targetEnvironment={targetEnvironment}
        onConfirm={handleConfirmEnvironmentSwitch}
        onCancel={handleCancelEnvironmentSwitch}
      />
    </div>
  );
}