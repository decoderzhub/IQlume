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
        // Mobile - full width
        'left-0',
        // Desktop - account for sidebar width
        'lg:left-[74px]', // When sidebar is collapsed (74px)
        sidebarOpen && 'lg:left-64' // When sidebar is expanded (256px = 64 * 4px)
      )}
    >
      <div className="flex items-center justify-between px-6 h-full">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors lg:hidden flex items-center gap-2"
          >
            {/* N Icon for mobile header when sidebar is closed */}
            {!sidebarOpen && (
              <div className="flex items-center gap-2">
                {/* Replace this div with your N icon image */}
                {/* <img src="/path/to/your/n-icon.svg" alt="N" className="h-6 w-6" /> */}
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white font-bold text-sm">
                  N
                </div>
              </div>
            )}
            <Menu className="w-5 h-5" />
          </motion.button>

          <h2 className="text-xl font-semibold text-white capitalize">
            {useStore.getState().activeView}
          </h2>
        </div>
      </div>
    </motion.header>
  );
}
