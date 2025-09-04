import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Activity, 
  Wallet,
  PieChart, 
  Settings,
  Brain,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { auth } from '../../lib/supabase';
import { cn } from '../../lib/utils';

const navigation = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'strategies', name: 'Strategies', icon: TrendingUp },
  { id: 'ai-chat', name: 'BroNomics Ai', icon: Brain },
  { id: 'trades', name: 'Trades', icon: Activity },
  { id: 'accounts', name: 'Accounts', icon: Wallet },
  { id: 'analytics', name: 'Analytics', icon: PieChart },
  { id: 'settings', name: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, activeView, setActiveView, setUser } = useStore();

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        mass: 0.8
      }
    },
    closed: {
      x: "-100%",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        mass: 0.8
      }
    }
  };

  const overlayVariants = {
    open: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    closed: {
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
  };

  const menuItemVariants = {
    open: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: "easeOut"
      }
    }),
    closed: {
      opacity: 0,
      x: -20,
      transition: {
        duration: 0.2
      }
    }
  };

  const logoVariants = {
    open: {
      opacity: 1,
      scale: 1,
      transition: {
        delay: 0.2,
        duration: 0.3
      }
    },
    closed: {
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar - always visible but can be collapsed */}
      <motion.aside
        animate={{
          width: sidebarOpen ? 256 : 80,
          transition: {
            type: "spring",
            stiffness: 400,
            damping: 40
          }
        }}
        className="hidden lg:flex fixed left-0 top-0 h-full bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 z-30 flex-col"
      >
        <div className="flex items-center justify-center p-4 border-b border-gray-800 min-h-[64px]">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.h1 
                variants={logoVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className="mr-auto flex items-center gap-3"
              >
                <img src="/logo.png" alt="brokernomex" className="h-10 w-auto" />
                <span className="text-xl font-bold text-white">BrokerNomex</span>
              </motion.h1>
            )}
          </AnimatePresence>
          
          {!sidebarOpen && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center justify-center w-full hover:bg-gray-800 rounded-lg p-2 transition-colors group"
              title="Expand sidebar"
            >
              <img src="/logo.png" alt="brokernomex" className="w-10 h-10 rounded mb-1" />
              <Menu className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
            </motion.button>
          )}
          
          {sidebarOpen && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Collapse sidebar"
            >
              <Menu className="w-5 h-5" />
            </motion.button>
          )}
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          {navigation.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <motion.button
                key={item.id}
                whileHover={{ 
                  x: sidebarOpen ? 4 : 0,
                  scale: sidebarOpen ? 1 : 1.1
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveView(item.id as any)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 relative',
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border border-blue-500/30' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )}
                title={!sidebarOpen ? item.name : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span 
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ 
                        opacity: 1, 
                        width: "auto",
                        transition: { delay: 0.1, duration: 0.2 }
                      }}
                      exit={{ 
                        opacity: 0, 
                        width: 0,
                        transition: { duration: 0.1 }
                      }}
                      className="font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="p-4 border-t border-gray-800">
          <motion.button
            whileHover={{ 
              x: sidebarOpen ? 4 : 0,
              scale: sidebarOpen ? 1 : 1.1
            }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            title={!sidebarOpen ? 'Sign Out' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ 
                    opacity: 1, 
                    width: "auto",
                    transition: { delay: 0.1, duration: 0.2 }
                  }}
                  exit={{ 
                    opacity: 0, 
                    width: 0,
                    transition: { duration: 0.1 }
                  }}
                  className="font-medium whitespace-nowrap overflow-hidden"
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed left-0 top-0 h-full w-80 bg-gray-900/98 backdrop-blur-xl border-r border-gray-800 z-50 lg:hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <motion.div 
                variants={logoVariants}
                initial="closed"
                animate="open"
                className="flex items-center gap-3"
              >
                <img src="/logo.png" alt="brokernomex" className="h-12 w-auto" />
                <span className="text-2xl font-bold text-white">BrokerNomex</span>
              </motion.div>
              
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            <nav className="p-6 space-y-3 flex-1">
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;

                return (
                  <motion.button
                    key={item.id}
                    custom={index}
                    variants={menuItemVariants}
                    initial="closed"
                    animate="open"
                    whileHover={{ 
                      x: 8,
                      transition: { type: "spring", stiffness: 400, damping: 25 }
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setActiveView(item.id as any);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 text-left',
                      isActive 
                        ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border border-blue-500/30 shadow-lg' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                    )}
                  >
                    <Icon className="w-6 h-6 flex-shrink-0" />
                    <span className="font-medium text-lg">{item.name}</span>
                  </motion.button>
                );
              })}
            </nav>

            {/* Mobile Sign Out Button */}
            <div className="p-6 border-t border-gray-800">
              <motion.button
                whileHover={{ 
                  x: 8,
                  transition: { type: "spring", stiffness: 400, damping: 25 }
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  handleSignOut();
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
              >
                <LogOut className="w-6 h-6 flex-shrink-0" />
                <span className="font-medium text-lg">Sign Out</span>
              </motion.button>
            </div>

            {/* Mobile footer */}
            <div className="p-6 border-t border-gray-800">
              <div className="text-center text-sm text-gray-400">
                <p>brokernomex Trading Platform</p>
                <p className="text-xs mt-1">v1.0.0</p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}