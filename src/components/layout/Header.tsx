import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, User, LogOut, Menu, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { useStore } from '../../store/useStore';
import { auth } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { EnvironmentToggle } from '../trading/EnvironmentToggle';
import { getMarketStatus } from '../../lib/marketHours';
import { getTimezoneAbbreviation, formatTimeOnly } from '../../lib/timezone';

interface HeaderProps {
  isConnected: boolean;
  onShowEnvironmentModal: (environment: 'paper' | 'live') => void;
}

export function Header({ isConnected, onShowEnvironmentModal }: HeaderProps) {
  const { user, setUser, sidebarOpen, setSidebarOpen, activeView, userTimezone } = useStore();
  const showEnvironmentToggle = ['trading', 'dashboard'].includes(activeView);
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());

  useEffect(() => {
    // Update market status every minute
    const interval = setInterval(() => {
      setMarketStatus(getMarketStatus());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        'fixed top-0 right-0 h-16 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800 z-30 transition-all duration-300',
        'left-0',
        sidebarOpen ? 'lg:left-64' : 'lg:left-[80px]'
      )}
    >
      <div className="flex items-center justify-between px-6 h-full">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors lg:hidden flex items-center gap-2"
          >
            <Menu className="w-5 h-5" />
          </motion.button>

          <h2 className="text-xl font-semibold text-white capitalize">
            {activeView}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Environment Toggle - Show on trading and dashboard views */}
          {showEnvironmentToggle && (
            <div className="hidden md:block">
              <EnvironmentToggle onShowModal={onShowEnvironmentModal} />
            </div>
          )}

          {/* Timezone Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700" title={`Your timezone: ${userTimezone}`}>
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-medium text-gray-300">
              {getTimezoneAbbreviation(userTimezone)}
            </span>
          </div>

          {/* Market Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700">
            <div className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-xs font-medium text-gray-300 hidden sm:inline">
              {marketStatus.isOpen ? 'Market Open' : 'Market Closed'}
            </span>
          </div>

          {/* Data Connection Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs font-medium text-gray-300 hidden sm:inline">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Beta Badge */}
          <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/50 text-xs font-semibold text-blue-400 hidden sm:inline-block">
            BETA
          </span>
        </div>
      </div>
    </motion.header>
  );

}