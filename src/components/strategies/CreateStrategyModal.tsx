import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Grid3X3, Bot, Target, Activity, TrendingUp, BarChart3, Zap, Shield, ArrowRight, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { INITIAL_LAUNCH_STRATEGY_TYPES, STRATEGY_TIERS, SubscriptionTier } from '../../lib/constants';
import { useStore } from '../../store/useStore';

// Import all individual bot modals
import { CreateSpotGridModal } from './modals/CreateSpotGridModal';
import { CreateDCAModal } from './modals/CreateDCAModal';
import { CreateCoveredCallsModal } from './modals/CreateCoveredCallsModal';
import { CreateWheelModal } from './modals/CreateWheelModal';
import { CreateShortPutModal } from './modals/CreateShortPutModal';
import { CreateSmartRebalanceModal } from './modals/CreateSmartRebalanceModal';
import { CreateFuturesGridModal } from './modals/CreateFuturesGridModal';
import { CreateInfinityGridModal } from './modals/CreateInfinityGridModal';
import { CreateGenericModal } from './modals/CreateGenericModal';

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

// Define all strategy types with their metadata
const strategyTypes = [
  // Grid Bots
  {
    type: 'spot_grid' as const,
    name: 'Spot Grid Bot',
    description: 'Automate buy-low/sell-high trades within a defined price range',
    icon: Grid3X3,
    color: 'from-blue-500 to-cyan-500',
    category: 'Grid Bots',
    tier: 'pro' as SubscriptionTier,
    implemented: true,
  },
  {
    type: 'futures_grid' as const,
    name: 'Futures Grid Bot',
    description: 'Grid trading on futures market with leverage support',
    icon: Zap,
    color: 'from-orange-500 to-red-500',
    category: 'Grid Bots',
    tier: 'elite' as SubscriptionTier,
    implemented: true,
  },
  {
    type: 'infinity_grid' as const,
    name: 'Infinity Grid Bot',
    description: 'Grid trading without upper price limit for trending markets',
    icon: TrendingUp,
    color: 'from-purple-500 to-pink-500',
    category: 'Grid Bots',
    tier: 'elite' as SubscriptionTier,
    implemented: true,
  },

  // Autonomous Bots
  {
    type: 'dca' as const,
    name: 'DCA Bot',
    description: 'Dollar-cost averaging for systematic investing',
    icon: Bot,
    color: 'from-green-500 to-emerald-500',
    category: 'Autonomous Bots',
    tier: 'starter' as SubscriptionTier,
    implemented: true,
  },
  {
    type: 'smart_rebalance' as const,
    name: 'Smart Rebalance Bot',
    description: 'Maintain target allocations through automatic rebalancing',
    icon: BarChart3,
    color: 'from-indigo-500 to-purple-500',
    category: 'Autonomous Bots',
    tier: 'starter' as SubscriptionTier,
    implemented: true,
  },

  // Options Strategies
  {
    type: 'covered_calls' as const,
    name: 'Covered Calls',
    description: 'Generate income by selling call options on owned stocks',
    icon: Shield,
    color: 'from-green-500 to-teal-500',
    category: 'Options Strategies',
    tier: 'pro' as SubscriptionTier,
    implemented: true,
  },
  {
    type: 'wheel' as const,
    name: 'The Wheel',
    description: 'Systematic cash-secured puts and covered calls',
    icon: Target,
    color: 'from-blue-500 to-purple-500',
    category: 'Options Strategies',
    tier: 'pro' as SubscriptionTier,
    implemented: true,
  },
  {
    type: 'short_put' as const,
    name: 'Cash-Secured Put',
    description: 'Generate income by selling cash-secured puts',
    icon: ArrowRight,
    color: 'from-purple-500 to-indigo-500',
    category: 'Options Strategies',
    tier: 'pro' as SubscriptionTier,
    implemented: true,
  },
  {
    type: 'iron_condor' as const,
    name: 'Iron Condor',
    description: 'Profit from low volatility with defined risk spreads',
    icon: Target,
    color: 'from-yellow-500 to-orange-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'straddle' as const,
    name: 'Long Straddle',
    description: 'Profit from high volatility in either direction',
    icon: Activity,
    color: 'from-red-500 to-pink-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'long_call' as const,
    name: 'Long Call',
    description: 'Bullish momentum play using long call options',
    icon: TrendingUp,
    color: 'from-green-500 to-lime-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'short_call' as const,
    name: 'Short Call',
    description: 'High-risk premium collection selling naked calls',
    icon: TrendingUp,
    color: 'from-red-500 to-orange-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'long_straddle' as const,
    name: 'Long Straddle',
    description: 'Volatility play around earnings using long straddle',
    icon: Activity,
    color: 'from-purple-500 to-pink-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'short_straddle' as const,
    name: 'Short Straddle',
    description: 'Ultra-high risk volatility selling strategy',
    icon: Activity,
    color: 'from-red-500 to-pink-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'long_condor' as const,
    name: 'Long Condor',
    description: 'Range-bound profit strategy using long condor spreads',
    icon: Target,
    color: 'from-blue-500 to-indigo-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'iron_butterfly' as const,
    name: 'Iron Butterfly',
    description: 'Low volatility income strategy using iron butterfly',
    icon: Target,
    color: 'from-purple-500 to-blue-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'long_butterfly' as const,
    name: 'Long Butterfly',
    description: 'Precision targeting strategy using long butterfly spreads',
    icon: Target,
    color: 'from-indigo-500 to-purple-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'short_strangle' as const,
    name: 'Short Strangle',
    description: 'Premium collection strategy using short strangles',
    icon: Activity,
    color: 'from-red-500 to-orange-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'short_put_vertical' as const,
    name: 'Short Put Vertical',
    description: 'Bullish spread strategy using short put verticals',
    icon: ArrowRight,
    color: 'from-green-500 to-blue-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'short_call_vertical' as const,
    name: 'Short Call Vertical',
    description: 'Bearish spread strategy using short call verticals',
    icon: ArrowRight,
    color: 'from-red-500 to-purple-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'broken_wing_butterfly' as const,
    name: 'Broken-Wing Butterfly',
    description: 'Asymmetric spread strategy with directional bias',
    icon: Target,
    color: 'from-yellow-500 to-red-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'option_collar' as const,
    name: 'Option Collar',
    description: 'Protective strategy limiting downside while capping upside',
    icon: Shield,
    color: 'from-blue-500 to-green-500',
    category: 'Options Strategies',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },

  // Algorithmic Trading
  {
    type: 'mean_reversion' as const,
    name: 'Mean Reversion',
    description: 'Contrarian strategy profiting from price reversions',
    icon: Activity,
    color: 'from-blue-500 to-purple-500',
    category: 'Algorithmic Trading',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'momentum_breakout' as const,
    name: 'Momentum Breakout',
    description: 'Trend following strategy capturing momentum breakouts',
    icon: TrendingUp,
    color: 'from-green-500 to-blue-500',
    category: 'Algorithmic Trading',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'pairs_trading' as const,
    name: 'Pairs Trading',
    description: 'Market neutral strategy trading correlated pairs',
    icon: BarChart3,
    color: 'from-purple-500 to-pink-500',
    category: 'Algorithmic Trading',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'scalping' as const,
    name: 'Scalping',
    description: 'High frequency scalping for quick profits',
    icon: Zap,
    color: 'from-red-500 to-yellow-500',
    category: 'Algorithmic Trading',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'swing_trading' as const,
    name: 'Swing Trading',
    description: 'Multi-day swing trading capturing intermediate moves',
    icon: Activity,
    color: 'from-blue-500 to-indigo-500',
    category: 'Algorithmic Trading',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'arbitrage' as const,
    name: 'Arbitrage',
    description: 'Cross-exchange arbitrage exploiting price differences',
    icon: BarChart3,
    color: 'from-green-500 to-teal-500',
    category: 'Algorithmic Trading',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'news_based_trading' as const,
    name: 'News-Based Trading',
    description: 'Event-driven strategy trading on news sentiment',
    icon: Activity,
    color: 'from-orange-500 to-red-500',
    category: 'Algorithmic Trading',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
  {
    type: 'orb' as const,
    name: 'Opening Range Breakout',
    description: 'Trade breakouts from market open range',
    icon: TrendingUp,
    color: 'from-yellow-500 to-orange-500',
    category: 'Algorithmic Trading',
    tier: 'elite' as SubscriptionTier,
    implemented: false,
  },
];

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<typeof strategyTypes[0] | null>(null);
  const { getEffectiveSubscriptionTier } = useStore();

  const userTier = getEffectiveSubscriptionTier();
  const tierOrder = { starter: 0, pro: 1, elite: 2 };

  // Group strategies by category
  const categorizedStrategies = strategyTypes.reduce((acc, strategy) => {
    if (!acc[strategy.category]) {
      acc[strategy.category] = [];
    }
    acc[strategy.category].push(strategy);
    return acc;
  }, {} as Record<string, typeof strategyTypes>);

  const getAccessStatus = (strategy: typeof strategyTypes[0]) => {
    const hasAccess = tierOrder[userTier] >= tierOrder[strategy.tier];
    const isImplemented = strategy.implemented;
    
    if (!isImplemented) return 'coming-soon';
    if (!hasAccess) return 'upgrade-required';
    return 'available';
  };

  const getUpgradeText = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'pro': return 'Upgrade to Pro';
      case 'elite': return 'Upgrade to Elite';
      default: return 'Upgrade Required';
    }
  };

  const renderStrategyModal = () => {
    if (!selectedStrategy) return null;

    const commonProps = {
      onClose: () => setSelectedStrategy(null),
      onSave: async (strategy: Omit<TradingStrategy, 'id'>) => {
        const result = await onSave(strategy);
        if (result) {
          setSelectedStrategy(null);
          onClose();
        }
        return result;
      },
    };

    switch (selectedStrategy.type) {
      case 'spot_grid':
        return <CreateSpotGridModal {...commonProps} />;
      case 'dca':
        return <CreateDCAModal {...commonProps} />;
      case 'covered_calls':
        return <CreateCoveredCallsModal {...commonProps} />;
      case 'wheel':
        return <CreateWheelModal {...commonProps} />;
      case 'short_put':
        return <CreateShortPutModal {...commonProps} />;
      case 'smart_rebalance':
        return <CreateSmartRebalanceModal {...commonProps} />;
      case 'futures_grid':
        return <CreateFuturesGridModal {...commonProps} />;
      case 'infinity_grid':
        return <CreateInfinityGridModal {...commonProps} />;
      default:
        return (
          <CreateGenericModal
            {...commonProps}
            strategyType={selectedStrategy.type}
            strategyName={selectedStrategy.name}
            strategyDescription={selectedStrategy.description}
          />
        );
    }
  };

  if (selectedStrategy) {
    return renderStrategyModal();
  }

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
              <p className="text-gray-400">Choose a strategy type to get started</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Strategy Categories */}
          <div className="space-y-8">
            {Object.entries(categorizedStrategies).map(([category, strategies]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold text-white mb-4">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {strategies.map((strategy) => {
                    const Icon = strategy.icon;
                    const accessStatus = getAccessStatus(strategy);
                    const isAvailable = accessStatus === 'available';
                    const isComingSoon = accessStatus === 'coming-soon';
                    const needsUpgrade = accessStatus === 'upgrade-required';

                    return (
                      <motion.div
                        key={strategy.type}
                        whileHover={isAvailable ? { scale: 1.02 } : {}}
                        whileTap={isAvailable ? { scale: 0.98 } : {}}
                        onClick={isAvailable ? () => setSelectedStrategy(strategy) : undefined}
                        className={`relative p-6 rounded-lg border transition-all ${
                          isAvailable
                            ? 'bg-gray-800/30 border-gray-700 cursor-pointer hover:border-blue-500'
                            : 'bg-gray-800/10 border-gray-800 cursor-not-allowed opacity-60'
                        }`}
                      >
                        {/* Status Badge */}
                        {isComingSoon && (
                          <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded border border-yellow-500/30">
                            Coming Soon
                          </div>
                        )}
                        {needsUpgrade && (
                          <div className="absolute top-2 right-2 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
                            {getUpgradeText(strategy.tier)}
                          </div>
                        )}
                        {isAvailable && (
                          <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                            Available
                          </div>
                        )}

                        <div className="text-center">
                          <div className={`w-16 h-16 bg-gradient-to-br ${strategy.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                          <h4 className={`font-semibold mb-2 ${
                            isAvailable ? 'text-white' : 'text-gray-500'
                          }`}>
                            {strategy.name}
                          </h4>
                          <p className={`text-sm ${
                            isAvailable ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {strategy.description}
                          </p>
                          
                          {/* Tier indicator */}
                          <div className="mt-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              strategy.tier === 'starter' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : strategy.tier === 'pro'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}>
                              {strategy.tier.charAt(0).toUpperCase() + strategy.tier.slice(1)} Plan
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-8 pt-6 border-t border-gray-800">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}