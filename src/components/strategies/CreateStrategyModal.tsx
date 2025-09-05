import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, Shield, DollarSign, Target, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { INITIAL_LAUNCH_STRATEGY_TYPES } from '../../lib/constants';

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => void;
}

// Strategy categories with filtering for initial launch
const strategyCategories = [
  {
    id: 'grid_trading',
    name: 'Grid Trading Bots',
    description: 'Automated trading bots that profit from market volatility within defined ranges',
    icon: '📊',
    color: 'from-green-500 to-emerald-500',
    strategies: [
      {
        type: 'spot_grid',
        name: 'Spot Grid Bot',
        description: 'Automates buy-low/sell-high trades within a defined price range',
        risk_level: 'low' as const,
        min_capital: 1000,
        available: true,
      },
      {
        type: 'futures_grid',
        name: 'Futures Grid Bot',
        description: 'Grid trading on futures market with leverage support',
        risk_level: 'medium' as const,
        min_capital: 2000,
        available: true,
      },
      {
        type: 'infinity_grid',
        name: 'Infinity Grid Bot',
        description: 'Grid trading without upper price limit for trending markets',
        risk_level: 'medium' as const,
        min_capital: 1500,
        available: true,
      },
    ]
  },
  {
    id: 'core_strategies',
    name: 'Automated Core Strategies',
    description: 'Systematic strategies using technical analysis and market patterns',
    icon: '🤖',
    color: 'from-blue-500 to-purple-500',
    strategies: [
      {
        type: 'dca',
        name: 'DCA Bot (Dollar-Cost Averaging)',
        description: 'Automatically invests at fixed intervals to minimize volatility risk',
        risk_level: 'low' as const,
        min_capital: 500,
        available: true,
      },
      {
        type: 'smart_rebalance',
        name: 'Smart Rebalance Bot',
        description: 'Maintains target allocations through automatic rebalancing',
        risk_level: 'low' as const,
        min_capital: 5000,
        available: true,
      },
    ]
  },
  {
    id: 'options_income',
    name: 'Options Income Strategies',
    description: 'Conservative options strategies focused on generating consistent income',
    icon: '💰',
    color: 'from-purple-500 to-pink-500',
    strategies: [
      {
        type: 'covered_calls',
        name: 'Covered Calls',
        description: 'Generate income by selling call options on owned stocks',
        risk_level: 'low' as const,
        min_capital: 15000,
        available: true,
      },
      {
        type: 'wheel',
        name: 'The Wheel',
        description: 'Systematic approach combining cash-secured puts and covered calls',
        risk_level: 'low' as const,
        min_capital: 20000,
        available: true,
      },
      {
        type: 'short_put',
        name: 'Cash-Secured Put',
        description: 'Income generation with potential stock acquisition',
        risk_level: 'medium' as const,
        min_capital: 15000,
        available: true,
      },
    ]
  }
];

// Coming Soon categories
const comingSoonCategories = [
  {
    id: 'options_directional',
    name: 'Options Directional & Volatility',
    description: 'Directional and volatility-based options strategies for active traders',
    icon: '⚡',
    color: 'from-orange-500 to-red-500',
    strategies: [
      {
        type: 'iron_condor',
        name: 'Iron Condor',
        description: 'Profit from low volatility with defined risk spreads',
        risk_level: 'medium' as const,
        min_capital: 5000,
        available: false,
      },
      {
        type: 'straddle',
        name: 'Long Straddle',
        description: 'Profit from high volatility in either direction',
        risk_level: 'medium' as const,
        min_capital: 8000,
        available: false,
      },
      {
        type: 'long_call',
        name: 'Long Call',
        description: 'Bullish momentum play using long call options',
        risk_level: 'medium' as const,
        min_capital: 5000,
        available: false,
      },
      {
        type: 'short_call',
        name: 'Short Call',
        description: 'High-risk premium collection strategy',
        risk_level: 'high' as const,
        min_capital: 15000,
        available: false,
      },
      {
        type: 'short_straddle',
        name: 'Short Straddle',
        description: 'Ultra-high risk volatility selling strategy',
        risk_level: 'high' as const,
        min_capital: 20000,
        available: false,
      },
    ]
  },
  {
    id: 'advanced_options',
    name: 'Advanced Options Spreads',
    description: 'Complex multi-leg options strategies for experienced traders',
    icon: '🎯',
    color: 'from-indigo-500 to-purple-500',
    strategies: [
      {
        type: 'long_butterfly',
        name: 'Long Butterfly',
        description: 'Precision targeting strategy using butterfly spreads',
        risk_level: 'low' as const,
        min_capital: 2500,
        available: false,
      },
      {
        type: 'iron_butterfly',
        name: 'Iron Butterfly',
        description: 'Low volatility income strategy using iron butterfly',
        risk_level: 'medium' as const,
        min_capital: 4000,
        available: false,
      },
      {
        type: 'broken_wing_butterfly',
        name: 'Broken-Wing Butterfly',
        description: 'Asymmetric spread strategy with directional bias',
        risk_level: 'medium' as const,
        min_capital: 3500,
        available: false,
      },
      {
        type: 'option_collar',
        name: 'Option Collar',
        description: 'Protective strategy to limit downside while capping upside',
        risk_level: 'low' as const,
        min_capital: 25000,
        available: false,
      },
    ]
  },
  {
    id: 'algorithmic_trading',
    name: 'Algorithmic Trading Strategies',
    description: 'Advanced algorithmic strategies for professional traders',
    icon: '🧠',
    color: 'from-teal-500 to-blue-500',
    strategies: [
      {
        type: 'mean_reversion',
        name: 'Mean Reversion',
        description: 'Contrarian strategy that profits from price reversions',
        risk_level: 'medium' as const,
        min_capital: 7500,
        available: false,
      },
      {
        type: 'momentum_breakout',
        name: 'Momentum Breakout',
        description: 'Trend following strategy that captures momentum breakouts',
        risk_level: 'medium' as const,
        min_capital: 6000,
        available: false,
      },
      {
        type: 'pairs_trading',
        name: 'Pairs Trading',
        description: 'Market neutral strategy trading correlated pairs',
        risk_level: 'low' as const,
        min_capital: 10000,
        available: false,
      },
      {
        type: 'scalping',
        name: 'Scalping',
        description: 'High frequency scalping strategy for quick profits',
        risk_level: 'high' as const,
        min_capital: 15000,
        available: false,
      },
      {
        type: 'swing_trading',
        name: 'Swing Trading',
        description: 'Multi-day swing trading strategy capturing intermediate moves',
        risk_level: 'medium' as const,
        min_capital: 8000,
        available: false,
      },
      {
        type: 'arbitrage',
        name: 'Arbitrage',
        description: 'Cross-exchange arbitrage strategy exploiting price differences',
        risk_level: 'low' as const,
        min_capital: 12000,
        available: false,
      },
      {
        type: 'news_based_trading',
        name: 'News-Based Trading',
        description: 'Event-driven strategy that trades based on news sentiment',
        risk_level: 'high' as const,
        min_capital: 10000,
        available: false,
      },
    ]
  }
];

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  const [step, setStep] = useState<'category' | 'strategy' | 'configure'>('category');
  const [strategyConfig, setStrategyConfig] = useState<any>({});

  // Filter categories to only show those with available strategies
  const availableCategories = strategyCategories.filter(category => 
    category.strategies.some(strategy => 
      INITIAL_LAUNCH_STRATEGY_TYPES.includes(strategy.type as any)
    )
  );

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStep('strategy');
  };

  const handleStrategySelect = (strategy: any) => {
    setSelectedStrategy(strategy);
    setStep('configure');
    
    // Set default configuration based on strategy type
    const defaultConfig: any = {
      symbol: 'AAPL',
      allocated_capital: strategy.min_capital,
    };

    switch (strategy.type) {
      case 'covered_calls':
        defaultConfig.strike_delta = 0.30;
        defaultConfig.expiration_days = 30;
        defaultConfig.minimum_premium = 200;
        defaultConfig.profit_target = 50;
        break;
      case 'wheel':
        defaultConfig.put_strike_delta = -0.30;
        defaultConfig.call_strike_delta = 0.30;
        defaultConfig.expiration_days = 30;
        defaultConfig.minimum_premium = 150;
        break;
      case 'short_put':
        defaultConfig.strike_delta = -0.30;
        defaultConfig.expiration_days = 30;
        defaultConfig.minimum_premium = 150;
        break;
      case 'spot_grid':
        defaultConfig.price_range_lower = 0;
        defaultConfig.price_range_upper = 0;
        defaultConfig.number_of_grids = 20;
        defaultConfig.grid_mode = 'arithmetic';
        break;
      case 'futures_grid':
        defaultConfig.price_range_lower = 0;
        defaultConfig.price_range_upper = 0;
        defaultConfig.number_of_grids = 25;
        defaultConfig.leverage = 3;
        defaultConfig.direction = 'long';
        break;
      case 'infinity_grid':
        defaultConfig.price_range_lower = 0;
        defaultConfig.number_of_grids = 30;
        defaultConfig.grid_mode = 'geometric';
        break;
      case 'dca':
        defaultConfig.investment_amount_per_interval = 50;
        defaultConfig.frequency = 'daily';
        defaultConfig.investment_target_percent = 25;
        break;
      case 'smart_rebalance':
        defaultConfig.assets = [
          { symbol: 'BTC', allocation: 40 },
          { symbol: 'ETH', allocation: 30 },
          { symbol: 'USDT', allocation: 30 },
        ];
        defaultConfig.trigger_type = 'threshold';
        defaultConfig.threshold_deviation_percent = 5;
        defaultConfig.rebalance_frequency = 'weekly';
        break;
    }

    setStrategyConfig(defaultConfig);
  };

  const handleSave = () => {
    if (!selectedStrategy) return;

    const strategy: Omit<TradingStrategy, 'id'> = {
      name: `${selectedStrategy.name} - ${strategyConfig.symbol || 'Custom'}`,
      type: selectedStrategy.type,
      description: selectedStrategy.description,
      risk_level: selectedStrategy.risk_level,
      min_capital: selectedStrategy.min_capital,
      is_active: false,
      configuration: strategyConfig,
    };

    onSave(strategy);
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
    }
  };

  const renderCategoryStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Choose Strategy Category</h3>
        <p className="text-gray-400">Select a category to explore available trading strategies</p>
      </div>

      {/* Available Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {availableCategories.map((category) => {
          const availableStrategies = category.strategies.filter(strategy => 
            INITIAL_LAUNCH_STRATEGY_TYPES.includes(strategy.type as any)
          );
          const riskCounts = availableStrategies.reduce((acc, strategy) => {
            acc[strategy.risk_level] = (acc[strategy.risk_level] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          return (
            <motion.div
              key={category.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCategorySelect(category.id)}
              className="p-6 bg-gray-800/30 border border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center text-2xl`}>
                  {category.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-2">{category.name}</h4>
                  <p className="text-sm text-gray-400 mb-3">{category.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">
                      {availableStrategies.length} strategies
                    </span>
                    <div className="flex gap-1">
                      {riskCounts.low && (
                        <span className="px-2 py-1 bg-green-400/10 text-green-400 text-xs rounded border border-green-400/20">
                          {riskCounts.low} Low
                        </span>
                      )}
                      {riskCounts.medium && (
                        <span className="px-2 py-1 bg-yellow-400/10 text-yellow-400 text-xs rounded border border-yellow-400/20">
                          {riskCounts.medium} Med
                        </span>
                      )}
                      {riskCounts.high && (
                        <span className="px-2 py-1 bg-red-400/10 text-red-400 text-xs rounded border border-red-400/20">
                          {riskCounts.high} High
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Coming Soon Section */}
      <div className="border-t border-gray-700 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-400">Coming Soon</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comingSoonCategories.map((category) => (
            <motion.div
              key={category.id}
              className="p-4 bg-gray-800/20 border border-gray-800 rounded-lg opacity-60 relative"
            >
              <div className="absolute top-2 right-2 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30">
                Coming Soon
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center text-lg opacity-50`}>
                  {category.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-400 mb-1">{category.name}</h4>
                  <p className="text-xs text-gray-500 mb-2">{category.description}</p>
                  <span className="text-xs text-gray-500">
                    {category.strategies.length} strategies
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStrategyStep = () => {
    const category = availableCategories.find(c => c.id === selectedCategory);
    if (!category) return null;

    const availableStrategies = category.strategies.filter(strategy => 
      INITIAL_LAUNCH_STRATEGY_TYPES.includes(strategy.type as any)
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setStep('category')}>
            ← Back
          </Button>
          <div>
            <h3 className="text-lg font-semibold text-white">{category.name}</h3>
            <p className="text-gray-400">{category.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {availableStrategies.map((strategy) => (
            <motion.div
              key={strategy.type}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleStrategySelect(strategy)}
              className="p-6 bg-gray-800/30 border border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">{strategy.name}</h4>
                  <p className="text-sm text-gray-400 mb-3">{strategy.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(strategy.risk_level)}`}>
                  {strategy.risk_level} risk
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">
                    Min Capital: ${strategy.min_capital.toLocaleString()}
                  </span>
                </div>
                <div className="px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">
                  Available Now
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderConfigureStep = () => {
    if (!selectedStrategy) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setStep('strategy')}>
            ← Back
          </Button>
          <div>
            <h3 className="text-lg font-semibold text-white">{selectedStrategy.name}</h3>
            <p className="text-gray-400">Configure your strategy parameters</p>
          </div>
        </div>

        {/* Strategy Overview */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Risk Level</p>
                <p className="font-semibold text-white capitalize">{selectedStrategy.risk_level}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">Min Capital</p>
                <p className="font-semibold text-white">${selectedStrategy.min_capital.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Strategy Type</p>
                <p className="font-semibold text-white capitalize">{selectedStrategy.type.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Configuration */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Symbol
              </label>
              <input
                type="text"
                value={strategyConfig.symbol || ''}
                onChange={(e) => setStrategyConfig(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., AAPL, BTC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Allocated Capital
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  value={strategyConfig.allocated_capital || ''}
                  onChange={(e) => setStrategyConfig(prev => ({ ...prev, allocated_capital: Number(e.target.value) }))}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={selectedStrategy.min_capital}
                  step="1000"
                />
              </div>
            </div>
          </div>

          {/* Strategy-specific configuration */}
          {selectedStrategy.type === 'covered_calls' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strike Delta
                </label>
                <input
                  type="number"
                  value={strategyConfig.strike_delta || ''}
                  onChange={(e) => setStrategyConfig(prev => ({ ...prev, strike_delta: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  min="0.1"
                  max="0.5"
                  step="0.05"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration Days
                </label>
                <input
                  type="number"
                  value={strategyConfig.expiration_days || ''}
                  onChange={(e) => setStrategyConfig(prev => ({ ...prev, expiration_days: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  min="7"
                  max="90"
                />
              </div>
            </div>
          )}

          {selectedStrategy.type === 'spot_grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Grids
                </label>
                <input
                  type="number"
                  value={strategyConfig.number_of_grids || ''}
                  onChange={(e) => setStrategyConfig(prev => ({ ...prev, number_of_grids: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  min="5"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Grid Mode
                </label>
                <select
                  value={strategyConfig.grid_mode || ''}
                  onChange={(e) => setStrategyConfig(prev => ({ ...prev, grid_mode: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="arithmetic">Arithmetic</option>
                  <option value="geometric">Geometric</option>
                </select>
              </div>
            </div>
          )}

          {selectedStrategy.type === 'dca' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Investment Amount per Interval
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    value={strategyConfig.investment_amount_per_interval || ''}
                    onChange={(e) => setStrategyConfig(prev => ({ ...prev, investment_amount_per_interval: Number(e.target.value) }))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    min="10"
                    step="10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Frequency
                </label>
                <select
                  value={strategyConfig.frequency || ''}
                  onChange={(e) => setStrategyConfig(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Risk Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-400 mb-2">Risk Disclosure</h4>
              <p className="text-sm text-yellow-300">
                All trading involves risk of loss. Past performance does not guarantee future results. 
                Please ensure you understand the strategy before activating it.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Create Trading Strategy</h2>
              <p className="text-gray-400">Choose a strategy category to get started</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {step === 'category' && renderCategoryStep()}
          {step === 'strategy' && renderStrategyStep()}
          {step === 'configure' && renderConfigureStep()}

          {step === 'configure' && (
            <div className="flex gap-4 mt-8">
              <Button variant="secondary" onClick={() => setStep('strategy')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleSave}
                disabled={!strategyConfig.symbol || !strategyConfig.allocated_capital}
                className="flex-1"
              >
                Create Strategy
              </Button>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}