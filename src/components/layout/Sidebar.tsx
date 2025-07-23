import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Activity, 
  Wallet,
  PieChart, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

const navigation = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'strategies', name: 'Strategies', icon: TrendingUp },
  { id: 'trades', name: 'Trades', icon: Activity },
  { id: 'accounts', name: 'Accounts', icon: Wallet },
  { id: 'analytics', name: 'Analytics', icon: PieChart },
  { id: 'settings', name: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, activeView, setActiveView } = useStore();

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className={cn(
        'fixed left-0 top-0 h-full bg-gray-900/90 backdrop-blur-xl border-r border-gray-800 z-50 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {sidebarOpen && (
          <h1 className="text-xl font-bold text-white">
            IQ<span className="text-blue-400">lume</span>
          </h1>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              onClick={() => setActiveView(item.id as any)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200',
                isActive 
                  ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border border-blue-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <span className="font-medium">{item.name}</span>
              )}
            </motion.button>
          );
        })}
      </nav>
    </motion.aside>
  );
}