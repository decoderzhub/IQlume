import React, { useEffect } from 'react';
import { Sidebar } from './layout/Sidebar';
import { Header } from './layout/Header';
import { Dashboard } from './dashboard/Dashboard';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { AIChatView } from './ai-chat/AIChatView';
import { SettingsView } from './settings/SettingsView';
import { AnalyticsView } from './analytics/AnalyticsView';

import { StrategiesView } from './strategies/StrategiesView';
import { AccountsView } from './accounts/AccountsView';
import { TradesView } from './trades/TradesView';

export function MainApp() {
  const { activeView, sidebarOpen } = useStore();

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