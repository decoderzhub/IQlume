import React from 'react';
import { motion } from 'framer-motion';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { useStore } from '../../store/useStore';
import { auth } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { EnvironmentToggle } from '../trading/EnvironmentToggle';

interface HeaderProps {
  isConnected: boolean;
}

export function Header({ isConnected }: HeaderProps) {
  const { user, setUser, sidebarOpen, setSidebarOpen, activeView } = useStore();
  const showEnvironmentToggle = ['trading', 'dashboard'].includes(activeView);

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
              <EnvironmentToggle />
            </div>
          )}

          {/* Beta Badge */}
          <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/50 text-xs font-semibold text-blue-400 hidden sm:inline-block">
            BETA
          </span>

          {/* Real-time connection indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400 hidden sm:inline">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </motion.header>
  );

}