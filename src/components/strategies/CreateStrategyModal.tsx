import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  TrendingUp, 
  DollarSign, 
  Save, 
  ArrowLeft,
  Grid3X3,
  ShoppingBag,
  Shield,
  Zap,
  Target,
  Activity,
  BarChart3,
  Brain,
  Coins,
  RefreshCw,
  TrendingDown,
  Shuffle,
  Clock,
  Gauge
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => void;
}

interface StrategyTemplate {
  id: TradingStrategy['type'];
  name: string;
  description: string;
  skill_level: 'beginner' | 'moderate' | 'advanced';
  risk_level: 'low' | 'medium' | 'high';
  min_capital: number;
  icon: React.ComponentType<any>;
  category: string;
  defaultConfig: Record<string, any>;
}

const strategyTemplates: StrategyTemplate[] = [
  // Beginner Strategies
  {
    id: 'dca',
    name: 'DCA Bot',
    description: 'Dollar-cost averaging for consistent, low-risk investing',
    skill_level: 'beginner',
    risk_level: 'low',
    min_capital: 500,
    icon: RefreshCw,
    category: 'Grid Trading Bots',
    defaultConfig: {
      symbol: 'BTC/USDT',
      investment_amount_per_interval: 100,
      frequency: 'weekly',
      investment_target_percent: 20,
    },
  },
  {
    id: 'smart_rebalance',
    name: 'Smart Rebalance',
    description: 'Automatically maintain target portfolio allocations',
    skill_level: 'beginner',
    risk_level: 'low',
    min_capital: 5000,
    icon: Shuffle,
    category: 'Automated Core Strategies',
    defaultConfig: {
      assets: [
        { symbol: 'BTC', allocation: 40 },
        { symbol: 'ETH', allocation: 30 },
        { symbol: 'USDT', allocation: 30 },
      ],
      trigger_type: 'threshold',
      threshold_deviation_percent: 5,
    },
  },
  {
    id: 'covered_calls',
    name: 'Covered Calls',
    description: 'Generate income by selling calls on owned stocks',
    skill_level: 'beginner',
    risk_level: 'low',
    min_capital: 15000,
    icon: Shield,
    category: 'Options Income Strategies',
    defaultConfig: {
      symbol: 'AAPL',
      position_size: 100,
      strike_delta: 0.30,
      expiration_days: 30,
      minimum_premium: 200,
    },
  },

  // Moderate Strategies
  {
    id: 'spot_grid',
    name: 'Spot Grid Bot',
    description: 'Automated buy-low/sell-high within defined price ranges',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 1000,
    icon: Grid3X3,
    category: 'Grid Trading Bots',
    defaultConfig: {
      symbol: 'BTC/USDT',
      price_range_lower: 40000,
      price_range_upper: 50000,
      number_of_grids: 20,
      grid_mode: 'arithmetic',
    },
  },
  {
    id: 'futures_grid',
    name: 'Futures Grid Bot',
    description: 'Grid trading with leverage on futures markets',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 2000,
    icon: Zap,
    category: 'Grid Trading Bots',
    defaultConfig: {
      symbol: 'BTC/USDT',
      price_range_lower: 40000,
      price_range_upper: 50000,
      number_of_grids: 25,
      leverage: 3,
      direction: 'long',
    },
  },
  {
    id: 'iron_condor',
    name: 'Iron Condor',
    description: 'Profit from low volatility with defined risk spreads',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 5000,
    icon: Target,
    category: 'Options Income Strategies',
    defaultConfig: {
      symbol: 'SPY',
      wing_width: 10,
      short_strike_delta: 0.20,
      expiration_days: 45,
      net_credit_target: 200,
    },
  },
  {
    id: 'wheel',
    name: 'The Wheel',
    description: 'Systematic cash-secured puts and covered calls',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 20000,
    icon: RefreshCw,
    category: 'Options Income Strategies',
    defaultConfig: {
      symbol: 'AAPL',
      position_size: 100,
      put_strike_delta: -0.30,
      call_strike_delta: 0.30,
      expiration_days: 30,
    },
  },
  {
    id: 'momentum_breakout',
    name: 'Momentum Breakout',
    description: 'Trend following strategy capturing momentum breakouts',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 6000,
    icon: TrendingUp,
    category: 'Automated Core Strategies',
    defaultConfig: {
      symbol: 'QQQ',
      breakout_threshold: 0.03,
      volume_confirmation: true,
      position_size: 100,
      stop_loss: { value: 2, type: 'percentage' },
    },
  },
  {
    id: 'pairs_trading',
    name: 'Pairs Trading',
    description: 'Market neutral strategy trading correlated pairs',
    skill_level: 'moderate',
    risk_level: 'low',
    min_capital: 10000,
    icon: Activity,
    category: 'Automated Core Strategies',
    defaultConfig: {
      pair_symbols: ['AAPL', 'MSFT'],
      correlation_threshold: 0.8,
      z_score_entry: 2.0,
      z_score_exit: 0.5,
    },
  },

  // Advanced Strategies
  {
    id: 'infinity_grid',
    name: 'Infinity Grid Bot',
    description: 'Grid trading without upper limit for trending markets',
    skill_level: 'advanced',
    risk_level: 'high',
    min_capital: 1500,
    icon: TrendingUp,
    category: 'Grid Trading Bots',
    defaultConfig: {
      symbol: 'ETH/USDT',
      price_range_lower: 2000,
      number_of_grids: 30,
      grid_mode: 'geometric',
    },
  },
  {
    id: 'short_straddle',
    name: 'Short Straddle',
    description: 'High-risk volatility selling for premium income',
    skill_level: 'advanced',
    risk_level: 'high',
    min_capital: 20000,
    icon: TrendingDown,
    category: 'Options Directional & Volatility',
    defaultConfig: {
      symbol: 'SPY',
      strike_selection: 'atm',
      expiration_days: 21,
      minimum_premium: 600,
      volatility_filter: 25,
    },
  },
  {
    id: 'long_straddle',
    name: 'Long Straddle',
    description: 'Volatility play for large directional moves',
    skill_level: 'advanced',
    risk_level: 'medium',
    min_capital: 8000,
    icon: Zap,
    category: 'Options Directional & Volatility',
    defaultConfig: {
      symbol: 'SPY',
      strike_selection: 'atm',
      expiration_days: 30,
      volatility_threshold: 20,
      max_premium_percent: 12,
    },
  },
  {
    id: 'short_call',
    name: 'Short Call',
    description: 'High-risk premium collection selling naked calls',
    skill_level: 'advanced',
    risk_level: 'high',
    min_capital: 15000,
    icon: TrendingDown,
    category: 'Options Directional & Volatility',
    defaultConfig: {
      symbol: 'AAPL',
      strike_delta: 0.20,
      expiration_days: 30,
      minimum_premium: 300,
      margin_requirement: 10000,
    },
  },
  {
    id: 'scalping',
    name: 'Scalping',
    description: 'High frequency trading for quick profits',
    skill_level: 'advanced',
    risk_level: 'high',
    min_capital: 15000,
    icon: Gauge,
    category: 'Automated Core Strategies',
    defaultConfig: {
      symbol: 'SPY',
      time_frame: '1m',
      profit_target: 0.1,
      stop_loss: { value: 0.05, type: 'percentage' },
      max_trades_per_day: 50,
    },
  },
  {
    id: 'news_based_trading',
    name: 'News-Based Trading',
    description: 'Event-driven trading based on news sentiment',
    skill_level: 'advanced',
    risk_level: 'high',
    min_capital: 10000,
    icon: Brain,
    category: 'Automated Core Strategies',
    defaultConfig: {
      symbol: 'SPY',
      sentiment_threshold: 0.7,
      news_sources: ['reuters', 'bloomberg', 'cnbc'],
      reaction_window: 30,
    },
  },
];

const sophisticationCategories = [
  {
    id: 'beginner',
    name: 'Grid Trading Bots',
    description: 'Automated trading bots that profit from market volatility within defined ranges',
    icon: Grid3X3,
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'moderate',
    name: 'Automated Core Strategies',
    description: 'Algorithmic strategies using technical analysis and market patterns',
    icon: ShoppingBag,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'beginner',
    name: 'Options Income Strategies',
    description: 'Conservative options strategies focused on generating consistent income',
    icon: Shield,
    color: 'from-purple-500 to-violet-600',
  },
  {
    id: 'advanced',
    name: 'Options Directional & Volatility',
    description: 'Directional and volatility-based options strategies for active traders',
    icon: Zap,
    color: 'from-orange-500 to-red-600',
  },
];

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyTemplate | null>(null);
  const [strategyName, setStrategyName] = useState('');
  const [description, setDescription] = useState('');
  const [minCapital, setMinCapital] = useState(1000);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [configuration, setConfiguration] = useState<Record<string, any>>({});

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
  };

  const handleStrategySelect = (strategy: StrategyTemplate) => {
    setSelectedStrategy(strategy);
    setStrategyName(strategy.name);
    setDescription(strategy.description);
    setMinCapital(strategy.min_capital);
    setRiskLevel(strategy.risk_level);
    setConfiguration(strategy.defaultConfig);
  };

  const handleSave = () => {
    if (!selectedStrategy) return;

    const newStrategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: selectedStrategy.id,
      description: description,
      risk_level: riskLevel,
      skill_level: selectedStrategy.skill_level,
      min_capital: minCapital,
      is_active: false,
      configuration: configuration,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(newStrategy);
  };

  const getStrategiesByCategory = (categoryName: string) => {
    return strategyTemplates.filter(strategy => strategy.category === categoryName);
  };

  const getCategoryStats = (categoryName: string) => {
    const strategies = getStrategiesByCategory(categoryName);
    const total = strategies.length;
    const lowRisk = strategies.filter(s => s.risk_level === 'low').length;
    const medRisk = strategies.filter(s => s.risk_level === 'medium').length;
    const highRisk = strategies.filter(s => s.risk_level === 'high').length;
    
    return { total, lowRisk, medRisk, highRisk };
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
    }
  };

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
            <div className="flex items-center gap-4">
              {selectedCategory && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedStrategy(null);
                  }}
                  className="p-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div>
                <h2 className="text-2xl font-bold text-white">Create Trading Strategy</h2>
                <p className="text-gray-400">
                  {!selectedCategory 
                    ? 'Choose a strategy category to get started'
                    : selectedStrategy
                      ? 'Configure your strategy parameters'
                      : `Select a strategy from ${selectedCategory}`
                  }
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {!selectedCategory ? (
              // Category Selection View
              <motion.div
                key="categories"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Choose Strategy Category</h3>
                  <p className="text-gray-400 mb-6">Select a category to explore available trading strategies</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sophisticationCategories.map((category) => {
                    const stats = getCategoryStats(category.name);
                    const Icon = category.icon;
                    
                    return (
                      <motion.div
                        key={category.name}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCategorySelect(category.name)}
                        className="p-6 bg-gray-800/30 border border-gray-700 rounded-xl cursor-pointer hover:border-blue-500 transition-all group"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-white mb-2">{category.name}</h4>
                            <p className="text-sm text-gray-400 leading-relaxed">{category.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300 font-medium">
                            {stats.total} strategies
                          </span>
                          <div className="flex gap-2">
                            {stats.lowRisk > 0 && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-green-400/10 text-green-400 border border-green-400/20">
                                {stats.lowRisk} Low
                              </span>
                            )}
                            {stats.medRisk > 0 && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                                {stats.medRisk} Med
                              </span>
                            )}
                            {stats.highRisk > 0 && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-red-400/10 text-red-400 border border-red-400/20">
                                {stats.highRisk} High
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : !selectedStrategy ? (
              // Strategy Selection View
              <motion.div
                key="strategies"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{selectedCategory}</h3>
                  <p className="text-gray-400 mb-6">Select a strategy to configure and create</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getStrategiesByCategory(selectedCategory).map((strategy) => {
                    const Icon = strategy.icon;
                    
                    return (
                      <motion.div
                        key={strategy.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleStrategySelect(strategy)}
                        className="p-6 bg-gray-800/30 border border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-all group"
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">{strategy.name}</h4>
                            <p className="text-sm text-gray-400 leading-relaxed">{strategy.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(strategy.risk_level)}`}>
                            {strategy.risk_level} risk
                          </span>
                          <span className="text-sm text-gray-400">
                            Min: ${strategy.min_capital.toLocaleString()}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              // Strategy Configuration View
              <motion.div
                key="configuration"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <selectedStrategy.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedStrategy.name}</h3>
                    <p className="text-gray-400">{selectedStrategy.description}</p>
                  </div>
                  <div className="ml-auto">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(selectedStrategy.risk_level)}`}>
                      {selectedStrategy.risk_level} risk
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Strategy Name
                    </label>
                    <input
                      type="text"
                      value={strategyName}
                      onChange={(e) => setStrategyName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter strategy name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Minimum Capital
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="number"
                        value={minCapital}
                        onChange={(e) => setMinCapital(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="100"
                        step="100"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Describe your strategy..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Risk Level
                    </label>
                    <select
                      value={riskLevel}
                      onChange={(e) => setRiskLevel(e.target.value as any)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                    </select>
                  </div>
                </div>

                {/* Strategy-specific configuration fields */}
                <div className="bg-gray-800/30 rounded-lg p-6">
                  <h4 className="font-semibold text-white mb-4">Strategy Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(configuration).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-300 mb-2 capitalize">
                          {key.replace(/_/g, ' ')}
                        </label>
                        {typeof value === 'boolean' ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => setConfiguration(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-sm text-gray-300">Enabled</span>
                          </label>
                        ) : typeof value === 'number' ? (
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => setConfiguration(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                            step={key.includes('percent') || key.includes('delta') ? '0.01' : '1'}
                          />
                        ) : Array.isArray(value) ? (
                          <div className="text-sm text-gray-400 p-3 bg-gray-900/50 rounded border border-gray-700">
                            {JSON.stringify(value, null, 2)}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setConfiguration(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedStrategy(null)}
                    className="flex-1"
                  >
                    Back to Strategies
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!strategyName.trim()}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Create Strategy
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}