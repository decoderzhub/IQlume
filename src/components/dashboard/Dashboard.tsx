import React from 'react';
import { motion } from 'framer-motion';
import { PortfolioOverview } from './PortfolioOverview';
import { TradingStrategies } from './TradingStrategies';
import { RecentTrades } from './RecentTrades';

export function Dashboard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      <PortfolioOverview />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TradingStrategies />
        <RecentTrades />
      </div>
    </motion.div>
  );
}