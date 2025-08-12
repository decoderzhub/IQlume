import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Activity, AlertTriangle, ChevronDown, ChevronUp, TrendingUp, DollarSign } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { getRiskDescription } from '../../lib/riskUtils';

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => void;
}

// Categorized strategies based on risk levels from the provided image
const categorizedStrategies = [
  {
    risk: 'low' as const,
    label: 'Low-Risk Strategies',
    description: 'Income generation, hedged positions, limited loss potential',
    icon: Shield,
    colorClass: 'text-green-400',
    bgClass: 'bg-green-500/10 border-green-500/20',
    strategies: [
      {
        type: 'covered_calls' as const,
        name: 'Covered Call',
        description: 'Generate income by selling call options on owned stocks',
        min_capital: 15000,
        risk_level: 'low' as const,
      },
      {
        type: 'option_collar' as const,
        name: 'Option Collar',
        description: 'Protective strategy limiting downside while capping upside',
        min_capital: 25000,
        risk_level: 'low' as const,
      },
      {
        type: 'dca' as const,
        name: 'DCA Bot (Dollar-Cost Averaging)',
        description: 'Systematic investing at fixed intervals to minimize volatility',
        min_capital: 500,
        risk_level: 'low' as const,
      },
      {
        type: 'smart_rebalance' as const,
        name: 'Smart Rebalance Bot',
        description: 'Maintains target allocations through automatic rebalancing',
        min_capital: 5000,
        risk_level: 'low' as const,
      },
      {
        type: 'wheel' as const,
        name: 'The Wheel',
        description: 'Systematic cash-secured puts and covered calls strategy',
        min_capital: 20000,
        risk_level: 'low' as const,
      },
      {
        type: 'spot_grid' as const,
        name: 'Spot Grid Bot',
        description: 'Automated buy-low/sell-high within defined price range',
        min_capital: 1000,
        risk_level: 'low' as const,
      },
    ],
  },
  {
    risk: 'medium' as const,
    label: 'Medium-Risk Strategies',
    description: 'Defined loss spreads, volatility-dependent, moderate directional bias',
    icon: Activity,
    colorClass: 'text-yellow-400',
    bgClass: 'bg-yellow-500/10 border-yellow-500/20',
    strategies: [
      {
        type: 'iron_condor' as const,
        name: 'Iron Condor',
        description: 'Profit from low volatility with defined risk spreads',
        min_capital: 5000,
        risk_level: 'medium' as const,
      },
      {
        type: 'broken_wing_butterfly' as const,
        name: 'Broken-Wing Butterfly',
        description: 'Asymmetric spread strategy with directional bias',
        min_capital: 3500,
        risk_level: 'medium' as const,
      },
      {
        type: 'long_butterfly' as const,
        name: 'Long Butterfly',
        description: 'Precision targeting for specific price level profits',
        min_capital: 2500,
        risk_level: 'medium' as const,
      },
      {
        type: 'short_call_vertical' as const,
        name: 'Short Call Vertical',
        description: 'Bearish spread with defined maximum risk',
        min_capital: 3000,
        risk_level: 'medium' as const,
      },
      {
        type: 'short_put_vertical' as const,
        name: 'Short Put Vertical',
        description: 'Bullish spread with limited risk profile',
        min_capital: 2500,
        risk_level: 'medium' as const,
      },
      {
        type: 'futures_grid' as const,
        name: 'Futures Grid Bot',
        description: 'Grid trading with leverage for advanced traders',
        min_capital: 2000,
        risk_level: 'medium' as const,
      },
      {
        type: 'infinity_grid' as const,
        name: 'Infinity Grid Bot',
        description: 'Grid trading without upper limit for trending markets',
        min_capital: 1500,
        risk_level: 'medium' as const,
      },
      {
        type: 'orb' as const,
        name: 'Opening Range Breakout (ORB)',
        description: 'Trade breakouts from market open for momentum capture',
        min_capital: 5000,
        risk_level: 'medium' as const,
      },
    ],
  },
  {
    risk: 'high' as const,
    label: 'High-Risk Strategies',
    description: 'Unhedged short options, leveraged directional plays, high volatility exposure',
    icon: AlertTriangle,
    colorClass: 'text-red-400',
    bgClass: 'bg-red-500/10 border-red-500/20',
    strategies: [
      {
        type: 'long_call' as const,
        name: 'Long Call',
        description: 'Bullish momentum play with leveraged upside exposure',
        min_capital: 5000,
        risk_level: 'high' as const,
      },
      {
        type: 'short_call' as const,
        name: 'Short Call (naked)',
        description: 'High-risk premium collection with unlimited loss potential',
        min_capital: 15000,
        risk_level: 'high' as const,
      },
      {
        type: 'long_straddle' as const,
        name: 'Long Straddle',
        description: 'Profit from high volatility in either direction',
        min_capital: 8000,
        risk_level: 'high' as const,
      },
      {
        type: 'short_straddle' as const,
        name: 'Short Straddle',
        description: 'Ultra-high risk volatility selling for premium income',
        min_capital: 20000,
        risk_level: 'high' as const,
      },
      {
        type: 'long_strangle' as const,
        name: 'Long Strangle',
        description: 'Directional volatility play for large price movements',
        min_capital: 6000,
        risk_level: 'high' as const,
      },
      {
        type: 'short_strangle' as const,
        name: 'Short Strangle',
        description: 'Premium collection in low volatility environments',
        min_capital: 25000,
        risk_level: 'high' as const,
      },
      {
        type: 'short_put' as const,
        name: 'Short Put (naked)',
        description: 'High-risk premium collection with potential assignment',
        min_capital: 15000,
        risk_level: 'high' as const,
      },
    ],
  },
];

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const [expandedCategory, setExpandedCategory] = useState<'low' | 'medium' | 'high'>('low');
  const [selectedType, setSelectedType] = useState<TradingStrategy['type'] | null>(null);
  const [selectedStrategyDetails, setSelectedStrategyDetails] = useState<{
    name: string;
    description: string;
    min_capital: number;
    risk_level: TradingStrategy['risk_level'];
  } | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [riskLevel, setRiskLevel] = useState<TradingStrategy['risk_level']>('medium');
  const [minCapital, setMinCapital] = useState(10000);
  const [isActive, setIsActive] = useState(false);

  const handleStrategySelect = (strategy: typeof categorizedStrategies[0]['strategies'][0]) => {
    setSelectedType(strategy.type);
    setSelectedStrategyDetails(strategy);
    
    // Pre-fill form with strategy defaults
    setName(strategy.name);
    setDescription(strategy.description);
    setRiskLevel(strategy.risk_level);
    setMinCapital(strategy.min_capital);
  };

  const handleCreate = () => {
    if (!selectedType) return;

    const strategy: Omit<TradingStrategy, 'id'> = {
      name,
      type: selectedType,
      description,
      risk_level: riskLevel,
      min_capital: minCapital,
      is_active: isActive,
      configuration: {
        allocated_capital: minCapital,
        // Add default configuration based on strategy type
        ...(selectedType === 'covered_calls' && {
          position_size: 100,
          strike_delta: 0.30,
          expiration_days: 30,
          minimum_premium: 200,
          profit_target: 50,
          roll_when_itm: true,
        }),
        ...(selectedType === 'iron_condor' && {
          wing_width: 10,
          short_strike_delta: 0.20,
          expiration_days: 45,
          net_credit_target: 200,
          profit_target: 25,
        }),
        ...(selectedType === 'spot_grid' && {
          price_range_lower: 0,
          price_range_upper: 0,
          number_of_grids: 20,
          grid_mode: 'arithmetic',
        }),
        ...(selectedType === 'futures_grid' && {
          symbol: 'BTC/USDT',
          price_range_lower: 0,
          price_range_upper: 0,
          number_of_grids: 25,
          grid_mode: 'arithmetic',
          direction: 'long',
          leverage: 3,
        }),
        ...(selectedType === 'infinity_grid' && {
          symbol: 'BTC/USDT',
          price_range_lower: 0,
          number_of_grids: 30,
          grid_mode: 'geometric',
        }),
        ...(selectedType === 'smart_rebalance' && {
          assets: [
            { symbol: 'BTC', allocation: 40 },
            { symbol: 'ETH', allocation: 30 },
            { symbol: 'USDT', allocation: 30 },
          ],
          trigger_type: 'threshold',
          threshold_deviation_percent: 5,
          rebalance_frequency: 'weekly',
        }),
        ...(selectedType === 'dca' && {
          symbol: 'BTC/USDT',
          investment_amount_per_interval: 100,
          frequency: 'daily',
          investment_target_percent: 20,
        }),
        ...(selectedType === 'wheel' && {
          symbol: 'AAPL',
          position_size: 100,
          put_strike_delta: -0.30,
          call_strike_delta: 0.30,
          expiration_days: 30,
          minimum_premium: 150,
          assignment_handling: 'automatic',
        }),
        ...(selectedType === 'straddle' && {
          symbol: 'SPY',
          strike_selection: 'atm',
          expiration_days: 30,
          volatility_threshold: 20,
          max_premium_percent: 12,
          stop_loss: { value: 50, type: 'percentage' },
          take_profit: { value: 100, type: 'percentage' },
        }),
        ...(selectedType === 'orb' && {
          symbol: 'SPY',
          orb_period: 30,
          breakout_threshold: 0.002,
          stop_loss: { value: 1, type: 'percentage' },
          take_profit: { value: 2, type: 'percentage' },
          max_position_size: 100,
        }),
      },
    };

    onSave(strategy);
  };

  const toggleCategory = (category: 'low' | 'medium' | 'high') => {
    setExpandedCategory(expandedCategory === category ? 'low' : category);
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
              <p className="text-gray-400">Choose a strategy template and customize it for your needs</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {!selectedType ? (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-white mb-2">Select Strategy by Risk Level</h3>
                <p className="text-gray-400">
                  Strategies are categorized by historical risk performance and typical market behavior
                </p>
              </div>

              {/* Risk Categories */}
              <div className="space-y-4">
                {categorizedStrategies.map((category) => {
                  const Icon = category.icon;
                  const isExpanded = expandedCategory === category.risk;
                  
                  return (
                    <div key={category.risk} className={`border rounded-lg ${category.bgClass}`}>
                      {/* Category Header */}
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => toggleCategory(category.risk)}
                        className="w-full p-6 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-4">
                          <Icon className={`w-8 h-8 ${category.colorClass}`} />
                          <div>
                            <h3 className={`text-xl font-semibold ${category.colorClass}`}>
                              {category.label}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">
                              {category.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">
                            {category.strategies.length} strategies
                          </span>
                          {isExpanded ? (
                            <ChevronUp className={`w-5 h-5 ${category.colorClass}`} />
                          ) : (
                            <ChevronDown className={`w-5 h-5 ${category.colorClass}`} />
                          )}
                        </div>
                      </motion.button>

                      {/* Category Strategies */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {category.strategies.map((strategy) => (
                                  <motion.div
                                    key={strategy.type}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleStrategySelect(strategy)}
                                    className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition-all"
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <h4 className="font-semibold text-white text-sm">
                                        {strategy.name}
                                      </h4>
                                      <span className={`px-2 py-1 rounded text-xs font-medium border ${
                                        category.risk === 'low' 
                                          ? 'text-green-400 bg-green-400/10 border-green-400/20'
                                          : category.risk === 'medium'
                                          ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                                          : 'text-red-400 bg-red-400/10 border-red-400/20'
                                      }`}>
                                        {category.risk}
                                      </span>
                                    </div>
                                    
                                    <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                                      {strategy.description}
                                    </p>
                                    
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        <DollarSign className="w-3 h-3 text-gray-500" />
                                        <span className="text-xs text-gray-400">
                                          Min: {formatCurrency(strategy.min_capital)}
                                        </span>
                                      </div>
                                      <TrendingUp className={`w-4 h-4 ${category.colorClass}`} />
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Risk Explanation */}
              <div className="bg-gray-800/30 rounded-lg p-6 mt-8">
                <h4 className="font-semibold text-white mb-4">Risk Level Explanation</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-green-400">Low Risk:</span>
                      <span className="text-gray-300 ml-2">{getRiskDescription('low')}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-yellow-400">Medium Risk:</span>
                      <span className="text-gray-300 ml-2">{getRiskDescription('medium')}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-red-400">High Risk:</span>
                      <span className="text-gray-300 ml-2">{getRiskDescription('high')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selected Strategy Info */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white">{selectedStrategyDetails?.name}</h3>
                    <p className="text-sm text-gray-400">{selectedStrategyDetails?.description}</p>
                  </div>
                  <Button variant="ghost" onClick={() => {
                    setSelectedType(null);
                    setSelectedStrategyDetails(null);
                  }}>
                    Change Strategy
                  </Button>
                </div>
              </div>

              {/* Strategy Configuration Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Strategy Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                      min="500"
                      step="500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Risk Level
                  </label>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value as TradingStrategy['risk_level'])}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    This will be dynamically updated after backtesting
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Initial Status
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-300">Start Active</span>
                    </label>
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Describe your strategy..."
                />
              </div>

              {/* Risk Assessment Notice */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-400 mb-2">Dynamic Risk Assessment</h4>
                    <p className="text-sm text-blue-300">
                      The risk level you set here is preliminary. After backtesting this strategy against 
                      historical market data, the system will calculate advanced risk metrics (volatility, 
                      Sharpe ratio, Beta, VaR, etc.) and may automatically adjust the risk classification 
                      based on actual performance data.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedType(null);
                    setSelectedStrategyDetails(null);
                  }}
                  className="flex-1"
                >
                  Back to Selection
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!name || !description || minCapital <= 0}
                  className="flex-1"
                >
                  Create Strategy
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}