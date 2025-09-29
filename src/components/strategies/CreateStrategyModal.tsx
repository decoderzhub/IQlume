import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, Grid3X3, Bot, Target, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { INITIAL_LAUNCH_STRATEGY_TYPES, STRATEGY_TIERS, SubscriptionTier } from '../../lib/constants';
import { useStore } from '../../store/useStore';

// Import all bot-specific modals
import { CreateSpotGridModal } from './modals/CreateSpotGridModal';
import { CreateDCAModal } from './modals/CreateDCAModal';
import { CreateSmartRebalanceModal } from './modals/CreateSmartRebalanceModal';
import { CreateCoveredCallsModal } from './modals/CreateCoveredCallsModal';
import { CreateWheelModal } from './modals/CreateWheelModal';
import { CreateShortPutModal } from './modals/CreateShortPutModal';
import { CreateFuturesGridModal } from './modals/CreateFuturesGridModal';
import { CreateInfinityGridModal } from './modals/CreateInfinityGridModal';
import { CreateStraddleModal } from './modals/CreateStraddleModal';
import { CreateIronCondorModal } from './modals/CreateIronCondorModal';

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

interface StrategyType {
  id: TradingStrategy['type'];
  name: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high';
  min_capital: number;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
}

const strategyCategories = {
  'Grid Bots': {
    icon: Grid3X3,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    description: 'Automated buy-low/sell-high trading within defined price ranges',
    strategies: [
      {
        id: 'spot_grid' as const,
        name: 'Spot Grid Bot',
        description: 'Automate buy-low/sell-high trades within a defined price range',
        risk_level: 'low' as const,
        min_capital: 1000,
        icon: Grid3X3,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
      },
      {
        id: 'futures_grid' as const,
        name: 'Futures Grid Bot',
        description: 'Grid trading on futures market with leverage support',
        risk_level: 'medium' as const,
        min_capital: 2000,
        icon: Grid3X3,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
      },
      {
        id: 'infinity_grid' as const,
        name: 'Infinity Grid Bot',
        description: 'Grid trading without upper price limit for trending markets',
        risk_level: 'medium' as const,
        min_capital: 1500,
        icon: Grid3X3,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
      },
    ]
  },
  'Autonomous Bots': {
    icon: Bot,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    description: 'Set-and-forget strategies for systematic investing and rebalancing',
    strategies: [
      {
        id: 'dca' as const,
        name: 'DCA Bot',
        description: 'Dollar-cost averaging for systematic investment',
        risk_level: 'low' as const,
        min_capital: 500,
        icon: Bot,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
      },
      {
        id: 'smart_rebalance' as const,
        name: 'Smart Rebalance',
        description: 'Maintain target allocations through automatic rebalancing',
        risk_level: 'low' as const,
        min_capital: 5000,
        icon: Bot,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
      },
    ]
  },
  'Options Strategies': {
    icon: Target,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    description: 'Income generation and risk management using options contracts',
    strategies: [
      {
        id: 'covered_calls' as const,
        name: 'Covered Calls',
        description: 'Generate income by selling call options on owned stocks',
        risk_level: 'low' as const,
        min_capital: 15000,
        icon: Target,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
      },
      {
        id: 'wheel' as const,
        name: 'The Wheel',
        description: 'Systematic approach combining cash-secured puts and covered calls',
        risk_level: 'low' as const,
        min_capital: 20000,
        icon: Target,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
      },
      {
        id: 'short_put' as const,
        name: 'Cash-Secured Put',
        description: 'Cash-secured put strategy for income generation with potential stock acquisition',
        risk_level: 'medium' as const,
        min_capital: 15000,
        icon: Target,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
      },
      {
        id: 'iron_condor' as const,
        name: 'Iron Condor',
        description: 'Profit from low volatility with defined risk spreads',
        risk_level: 'medium' as const,
        min_capital: 5000,
        icon: Target,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
      },
      {
        id: 'straddle' as const,
        name: 'Long Straddle',
        description: 'Profit from high volatility in either direction',
        risk_level: 'medium' as const,
        min_capital: 8000,
        icon: Target,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
      },
    ]
  }
};

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<TradingStrategy['type'] | null>(null);
  const { getEffectiveSubscriptionTier } = useStore();

  // If a strategy is selected, render the appropriate modal
  if (selectedStrategy) {
    const modalProps = { onClose, onSave };
    
    switch (selectedStrategy) {
      case 'spot_grid':
        return <CreateSpotGridModal {...modalProps} />;
      case 'dca':
        return <CreateDCAModal {...modalProps} />;
      case 'smart_rebalance':
        return <CreateSmartRebalanceModal {...modalProps} />;
      case 'covered_calls':
        return <CreateCoveredCallsModal {...modalProps} />;
      case 'wheel':
        return <CreateWheelModal {...modalProps} />;
      case 'short_put':
        return <CreateShortPutModal {...modalProps} />;
      case 'futures_grid':
        return <CreateFuturesGridModal {...modalProps} />;
      case 'infinity_grid':
        return <CreateInfinityGridModal {...modalProps} />;
      case 'straddle':
        return <CreateStraddleModal {...modalProps} />;
      case 'iron_condor':
        return <CreateIronCondorModal {...modalProps} />;
      default:
        // Fallback for any strategy type not yet implemented
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="p-8 max-w-md">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-4">Coming Soon</h3>
                <p className="text-gray-400 mb-6">This strategy type is not yet available.</p>
                <Button onClick={onClose}>Close</Button>
              </div>
            </Card>
          </div>
        );
    }
  }

  // Strategy type selector
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-6xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Create Trading Strategy</h2>
              <p className="text-gray-400">Set up a new automated trading strategy</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <span className="text-blue-400 font-medium">Choose Strategy Type</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-700" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-700 text-gray-400 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <span className="text-gray-400">Configure</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-700" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-700 text-gray-400 rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <span className="text-gray-400">Review</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-2">Choose Strategy Type</h3>
            <p className="text-gray-400">Select the trading strategy that best fits your goals and risk tolerance</p>
          </div>

          {/* Strategy Categories */}
          <div className="space-y-8">
            {Object.entries(strategyCategories).map(([categoryName, categoryData]) => {
              const CategoryIcon = categoryData.icon;
              
              return (
                <div key={categoryName}>
                  <div className={`flex items-center gap-4 mb-6 p-4 rounded-lg ${categoryData.bgColor} ${categoryData.borderColor} border`}>
                    <div className={`w-10 h-10 ${categoryData.bgColor} rounded-xl flex items-center justify-center border ${categoryData.borderColor}`}>
                      <CategoryIcon className={`w-5 h-5 ${categoryData.color}`} />
                    </div>
                    <div>
                      <h4 className={`text-lg font-bold ${categoryData.color}`}>{categoryName}</h4>
                      <p className="text-gray-300 text-sm">{categoryData.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryData.strategies.map((strategy: StrategyType) => {
                      const StrategyIcon = strategy.icon;
                      const isImplemented = INITIAL_LAUNCH_STRATEGY_TYPES.includes(strategy.id);
                      const requiredTier = STRATEGY_TIERS[strategy.id] as SubscriptionTier;
                      const userTier = getEffectiveSubscriptionTier();
                      const tierOrder = { starter: 0, pro: 1, elite: 2 };
                      const hasAccess = tierOrder[userTier] >= tierOrder[requiredTier];
                      
                      const isComingSoon = !isImplemented;
                      const needsUpgrade = isImplemented && !hasAccess;
                      const isAvailable = isImplemented && hasAccess;

                      return (
                        <motion.div
                          key={strategy.id}
                          whileHover={isAvailable ? { scale: 1.02 } : {}}
                          whileTap={isAvailable ? { scale: 0.98 } : {}}
                          onClick={isAvailable ? () => setSelectedStrategy(strategy.id) : undefined}
                          className={`relative p-6 rounded-lg border transition-all ${
                            isAvailable
                              ? `${strategy.bgColor} ${strategy.borderColor} cursor-pointer hover:border-opacity-80`
                              : 'bg-gray-800/30 border-gray-700 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          {isComingSoon && (
                            <div className="absolute top-3 right-3 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded border border-yellow-500/30">
                              Coming Soon
                            </div>
                          )}
                          
                          {needsUpgrade && (
                            <div className="absolute top-3 right-3 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
                              {requiredTier === 'pro' ? 'Pro' : 'Elite'} Plan
                            </div>
                          )}

                          <div className="flex items-start gap-4 mb-4">
                            <div className={`w-12 h-12 ${strategy.bgColor} rounded-xl flex items-center justify-center border ${strategy.borderColor}`}>
                              <StrategyIcon className={`w-6 h-6 ${strategy.color}`} />
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-semibold mb-2 ${isAvailable ? strategy.color : 'text-gray-400'}`}>
                                {strategy.name}
                              </h4>
                              <p className={`text-sm ${isAvailable ? 'text-gray-300' : 'text-gray-500'}`}>
                                {strategy.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${
                                strategy.risk_level === 'low' 
                                  ? 'text-green-400 bg-green-400/10 border-green-400/20'
                                  : strategy.risk_level === 'medium'
                                  ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                                  : 'text-red-400 bg-red-400/10 border-red-400/20'
                              }`}>
                                {strategy.risk_level} risk
                              </span>
                            </div>
                            <span className={`text-sm font-medium ${isAvailable ? 'text-white' : 'text-gray-500'}`}>
                              Min: ${strategy.min_capital.toLocaleString()}
                            </span>
                          </div>

                          {needsUpgrade && (
                            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-purple-400" />
                                <span className="text-sm text-purple-300">
                                  Upgrade to {requiredTier === 'pro' ? 'Pro' : 'Elite'} to access this strategy
                                </span>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 mt-8">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}