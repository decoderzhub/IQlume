import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PortfolioOverview } from './PortfolioOverview';
import { TradingStrategies } from './TradingStrategies';
import { RecentTrades } from './RecentTrades';
import { BotStatusDashboard } from '../bots/BotStatusDashboard';
import { Activity } from 'lucide-react';

export function Dashboard() {
  const [showBotDashboard, setShowBotDashboard] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => setShowBotDashboard(!showBotDashboard)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Activity className="w-5 h-5" />
          {showBotDashboard ? 'Hide' : 'Show'} Bot Status
        </button>
      </div>

      {showBotDashboard && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <BotStatusDashboard />
        </motion.div>
      )}

      <PortfolioOverview />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TradingStrategies />
        <RecentTrades />
      </div>
    </motion.div>
  );
}