import React from 'react';
import { motion } from 'framer-motion';
import { Bell, User, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { useStore } from '../../store/useStore';
import { auth } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export function Header() {
  const { user, setUser, sidebarOpen } = useStore();

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        'fixed top-0 right-0 h-16 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800 z-40 transition-all duration-300',
        sidebarOpen ? 'left-64' : 'left-16'
      )}
    >
      <div className="flex items-center justify-between px-6 h-full">
        <div>
          <h2 className="text-xl font-semibold text-white capitalize">
            {useStore.getState().activeView}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.email}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.subscription_tier}</p>
            </div>
            
            <button className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <User className="w-5 h-5" />
            </button>
            
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