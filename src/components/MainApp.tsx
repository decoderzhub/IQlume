import React, { useEffect } from 'react';
import { Sidebar } from './layout/Sidebar';
import { Header } from './layout/Header';
import { Dashboard } from './dashboard/Dashboard';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { AIChatView } from './ai-chat/AIChatView';
import { SettingsView } from './settings/SettingsView';
import { AnalyticsView } from './analytics/AnalyticsView';
import { BrokerageAccount, BankAccount, CustodialWallet } from '../types';

import { StrategiesView } from './strategies/StrategiesView';
import { AccountsView } from './accounts/AccountsView';
import { TradesView } from './trades/TradesView';

export function MainApp() {
  const { activeView, sidebarOpen, setBrokerageAccounts, setBankAccounts, setCustodialWallets, updatePortfolioFromAccounts } = useStore();

  // Initialize account data on component mount
  useEffect(() => {
    const initializeAccountData = () => {
      // Mock brokerage accounts
      const mockBrokerageAccounts: BrokerageAccount[] = [
        {
          id: '1',
          user_id: '1',
          brokerage: 'alpaca',
          account_name: 'Alpaca Paper Trading',
          account_type: 'stocks',
          balance: 85420.50,
          is_connected: true,
          last_sync: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          user_id: '1',
          brokerage: 'schwab',
          account_name: 'Charles Schwab Brokerage',
          account_type: 'stocks',
          balance: 125420.50,
          is_connected: true,
          last_sync: '2024-01-15T10:25:00Z',
        },
        {
          id: '3',
          user_id: '1',
          brokerage: 'coinbase',
          account_name: 'Coinbase Pro',
          account_type: 'crypto',
          balance: 45000.00,
          is_connected: true,
          last_sync: '2024-01-15T10:20:00Z',
        },
        {
          id: '4',
          user_id: '1',
          brokerage: 'binance',
          account_name: 'Binance Trading',
          account_type: 'crypto',
          balance: 32500.00,
          is_connected: false,
          last_sync: '2024-01-14T15:30:00Z',
        },
      ];

      // Mock bank accounts
      const mockBankAccounts: BankAccount[] = [
        {
          id: '1',
          user_id: '1',
          bank_name: 'Chase',
          account_name: 'Chase Checking',
          account_type: 'checking',
          account_number_masked: '****1234',
          routing_number: '021000021',
          balance: 15420.50,
          is_verified: true,
          plaid_account_id: 'plaid_123',
          plaid_access_token: 'access_token_123',
          last_sync: '2024-01-15T09:30:00Z',
        },
      ];

      // Mock custodial wallets
      const mockCustodialWallets: CustodialWallet[] = [
        {
          id: '1',
          user_id: '1',
          wallet_name: 'High-Yield Treasury Wallet',
          balance_usd: 25000.00,
          balance_treasuries: 75000.00,
          apy: 0.0485,
          is_fdic_insured: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Set global state
      setBrokerageAccounts(mockBrokerageAccounts);
      setBankAccounts(mockBankAccounts);
      setCustodialWallets(mockCustodialWallets);
      
      // Update portfolio to reflect total from all accounts
      updatePortfolioFromAccounts();
    };

    initializeAccountData();
  }, [setBrokerageAccounts, setBankAccounts, setCustodialWallets, updatePortfolioFromAccounts]);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
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
      <Header />
      
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