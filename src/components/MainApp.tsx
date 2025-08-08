import React, { useEffect } from 'react';
import { Sidebar } from './layout/Sidebar';
import { Header } from './layout/Header';
import { Dashboard } from './dashboard/Dashboard';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

import { StrategiesView } from './strategies/StrategiesView';
import { AccountsView } from './accounts/AccountsView';

// Placeholder components for other views
const TradesView = () => (
  <div className="p-8 text-center text-gray-400">
    <h2 className="text-2xl font-bold text-white mb-4">Trade History</h2>
    <p>Comprehensive trade analytics coming soon...</p>
  </div>
);

const AnalyticsView = () => (
  <div className="p-8 text-center text-gray-400">
    <h2 className="text-2xl font-bold text-white mb-4">Analytics</h2>
    <p>Advanced portfolio analytics and risk metrics coming soon...</p>
  </div>
);

const SettingsView = () => (
  <div className="p-8 text-center text-gray-400">
    <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>
    <p>Account settings and preferences coming soon...</p>
  </div>
);

export function MainApp() {
  const { activeView, sidebarOpen } = useStore();

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'strategies':
        return <StrategiesView />;
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
        sidebarOpen ? 'lg:pl-64' : 'lg:pl-21',
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