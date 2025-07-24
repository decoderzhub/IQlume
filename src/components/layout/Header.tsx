import React from 'react';
import { motion } from 'framer-motion';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { useStore } from '../../store/useStore';
import { auth } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export function Header() {
  const { user, setUser, sidebarOpen, setSidebarOpen } = useStore();

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        'fixed top-0 right-0 h-16 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800 z-30 transition-all duration-300',
        // On mobile, header spans full width
        'left-0',
        // On desktop, adjust for sidebar
        'lg:left-0',
        sidebarOpen && 'lg:left-64'
      )}
    >
      <div className="flex items-center justify-between px-6 h-full">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
          
          <h2 className="text-xl font-semibold text-white capitalize">
            {useStore.getState().activeView}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <Bell className="w-5 h-5" />
          </motion.button>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user?.email}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.subscription_tier}</p>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <User className="w-5 h-5" />
            </motion.button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-400"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}