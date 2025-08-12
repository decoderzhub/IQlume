import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Activity, AlertTriangle, ChevronDown, ChevronUp, TrendingUp, DollarSign, Target, Zap } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { getRiskDescription } from '../../lib/riskUtils';

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => void;
}

// Categorized strategies based on risk levels
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
      {
        type: 'long_butterfly' as const,
        name: 'Long Butterfly',
        description: 'Precision targeting for specific price level profits',
        min_capital: 2500,
        risk_level: 'low' as const,
      },
      {
        type: 'long_condor' as const,
        name: 'Long Condor',
        description: 'Range-bound profit strategy for sideways markets',
        min_capital: 3000,
        risk_level: 'low' as const,
      },
      {
        type: 'pairs_trading' as const,
        name: 'Pairs Trading',
        description: 'Market neutral strategy trading correlated pairs',
        min_capital: 10000,
        risk_level: 'low' as const,
      },
      {
        type: 'arbitrage' as const,
        name: 'Arbitrage',
        description: 'Cross-exchange arbitrage exploiting price differences',
        min_capital: 12000,
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
        type: 'iron_butterfly' as const,
        name: 'Iron Butterfly',
        description: 'Low volatility income strategy for range-bound markets',
        min_capital: 4000,
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
        type: 'short_put' as const,
        name: 'Short Put',
        description: 'Cash-secured put for income with potential assignment',
        min_capital: 15000,
        risk_level: 'medium' as const,
      },
      {
        type: 'long_strangle' as const,
        name: 'Long Strangle',
        description: 'Directional volatility play for large movements',
        min_capital: 6000,
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
      {
        type: 'straddle' as const,
        name: 'Long Straddle',
        description: 'Profit from high volatility in either direction',
        min_capital: 8000,
        risk_level: 'medium' as const,
      },
      {
        type: 'mean_reversion' as const,
        name: 'Mean Reversion',
        description: 'Contrarian strategy profiting from price reversions',
        min_capital: 7500,
        risk_level: 'medium' as const,
      },
      {
        type: 'momentum_breakout' as const,
        name: 'Momentum Breakout',
        description: 'Trend following strategy capturing breakouts',
        min_capital: 6000,
        risk_level: 'medium' as const,
      },
      {
        type: 'swing_trading' as const,
        name: 'Swing Trading',
        description: 'Multi-day holds capturing intermediate movements',
        min_capital: 8000,
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
        type: 'short_strangle' as const,
        name: 'Short Strangle',
        description: 'Premium collection in low volatility environments',
        min_capital: 25000,
        risk_level: 'high' as const,
      },
      {
        type: 'scalping' as const,
        name: 'Scalping',
        description: 'High frequency trading for quick profits',
        min_capital: 15000,
        risk_level: 'high' as const,
      },
      {
        type: 'news_based_trading' as const,
        name: 'News-Based Trading',
        description: 'Event-driven strategy based on news sentiment',
        min_capital: 10000,
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
  
  // Basic strategy fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [riskLevel, setRiskLevel] = useState<TradingStrategy['risk_level']>('medium');
  const [minCapital, setMinCapital] = useState(10000);
  const [isActive, setIsActive] = useState(false);

  // Grid bot specific configuration
  const [gridSymbol, setGridSymbol] = useState('BTC/USDT');
  const [gridPriceLower, setGridPriceLower] = useState(40000);
  const [gridPriceUpper, setGridPriceUpper] = useState(50000);
  const [gridNumGrids, setGridNumGrids] = useState(20);
  const [gridMode, setGridMode] = useState<'arithmetic' | 'geometric'>('arithmetic');
  const [gridTriggerPrice, setGridTriggerPrice] = useState<number | undefined>(undefined);
  const [gridTakeProfit, setGridTakeProfit] = useState<number | undefined>(undefined);
  const [gridStopLoss, setGridStopLoss] = useState<number | undefined>(undefined);
  
  // Futures grid specific
  const [futuresDirection, setFuturesDirection] = useState<'long' | 'short'>('long');
  const [futuresLeverage, setFuturesLeverage] = useState(3);

  // Smart rebalance specific configuration
  const [rebalanceAssets, setRebalanceAssets] = useState([
    { symbol: 'BTC', allocation: 40 },
    { symbol: 'ETH', allocation: 30 },
    { symbol: 'USDT', allocation: 30 },
  ]);
  const [rebalanceTriggerType, setRebalanceTriggerType] = useState<'threshold' | 'time'>('threshold');
  const [rebalanceThreshold, setRebalanceThreshold] = useState(5);
  const [rebalanceFrequency, setRebalanceFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // DCA specific configuration
  const [dcaSymbol, setDcaSymbol] = useState('BTC/USDT');
  const [dcaAmount, setDcaAmount] = useState(100);
  const [dcaFrequency, setDcaFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dcaTargetPercent, setDcaTargetPercent] = useState(25);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    switch (name) {
      case 'name': setName(value); break;
      case 'description': setDescription(value); break;
      case 'riskLevel': setRiskLevel(value as TradingStrategy['risk_level']); break;
      case 'minCapital': setMinCapital(Number(value)); break;
      default: break;
    }
  };

  const handleStrategySelect = (strategy: typeof categorizedStrategies[0]['strategies'][0]) => {
    setSelectedType(strategy.type);
    setSelectedStrategyDetails(strategy);
    
    // Pre-fill form with strategy defaults
    setName(strategy.name);
    setDescription(strategy.description);
    setRiskLevel(strategy.risk_level);
    setMinCapital(strategy.min_capital);

    // Set default configuration values based on strategy type
    if (strategy.type === 'spot_grid') {
      setGridSymbol('BTC/USDT');
      setGridPriceLower(40000);
      setGridPriceUpper(50000);
      setGridNumGrids(20);
      setGridMode('arithmetic');
    } else if (strategy.type === 'futures_grid') {
      setGridSymbol('BTC/USDT');
      setGridPriceLower(40000);
      setGridPriceUpper(50000);
      setGridNumGrids(25);
      setGridMode('arithmetic');
      setFuturesDirection('long');
      setFuturesLeverage(3);
    } else if (strategy.type === 'infinity_grid') {
      setGridSymbol('ETH/USDT');
      setGridPriceLower(2000);
      setGridPriceUpper(0); // No upper limit
      setGridNumGrids(30);
      setGridMode('geometric');
    } else if (strategy.type === 'smart_rebalance') {
      setRebalanceAssets([
        { symbol: 'BTC', allocation: 40 },
        { symbol: 'ETH', allocation: 30 },
        { symbol: 'USDT', allocation: 30 },
      ]);
      setRebalanceTriggerType('threshold');
      setRebalanceThreshold(5);
      setRebalanceFrequency('weekly');
    } else if (strategy.type === 'dca') {
      setDcaSymbol('BTC/USDT');
      setDcaAmount(100);
      setDcaFrequency('daily');
      setDcaTargetPercent(25);
    }
  };

  const handleCreate = () => {
    if (!selectedType) return;

    // Build configuration based on strategy type
    let configuration: Record<string, any> = {
      allocated_capital: minCapital,
    };

    // Grid bot configurations
    if (['spot_grid', 'futures_grid', 'infinity_grid'].includes(selectedType)) {
      configuration = {
        ...configuration,
        symbol: gridSymbol,
        price_range_lower: gridPriceLower,
        number_of_grids: gridNumGrids,
        grid_mode: gridMode,
        ...(gridTriggerPrice && { trigger_price: gridTriggerPrice }),
        ...(gridTakeProfit && { take_profit: gridTakeProfit }),
        ...(gridStopLoss && { stop_loss: gridStopLoss }),
      };

      // Add upper price range for spot and futures grid (not infinity)
      if (selectedType !== 'infinity_grid') {
        configuration.price_range_upper = gridPriceUpper;
      }

      // Add futures-specific parameters
      if (selectedType === 'futures_grid') {
        configuration.direction = futuresDirection;
        configuration.leverage = futuresLeverage;
      }
    }

    // Smart rebalance configuration
    if (selectedType === 'smart_rebalance') {
      configuration = {
        ...configuration,
        assets: rebalanceAssets,
        trigger_type: rebalanceTriggerType,
        threshold_deviation_percent: rebalanceThreshold,
        rebalance_frequency: rebalanceFrequency,
      };
    }

    // DCA configuration
    if (selectedType === 'dca') {
      configuration = {
        ...configuration,
        symbol: dcaSymbol,
        investment_amount_per_interval: dcaAmount,
        frequency: dcaFrequency,
        investment_target_percent: dcaTargetPercent,
      };
    }

    // Add other strategy-specific configurations
    if (selectedType === 'covered_calls') {
      configuration = {
        ...configuration,
        symbol: 'AAPL',
        position_size: 100,
        strike_delta: 0.30,
        expiration_days: 30,
        minimum_premium: 200,
        profit_target: 50,
        roll_when_itm: true,
      };
    }

    if (selectedType === 'iron_condor') {
      configuration = {
        ...configuration,
        symbol: 'SPY',
        wing_width: 10,
        short_strike_delta: 0.20,
        expiration_days: 45,
        net_credit_target: 200,
        profit_target: 25,
        stop_loss: { value: 200, type: 'percentage' },
      };
    }

    if (selectedType === 'wheel') {
      configuration = {
        ...configuration,
        symbol: 'AAPL',
        position_size: 100,
        put_strike_delta: -0.30,
        call_strike_delta: 0.30,
        expiration_days: 30,
        minimum_premium: 150,
        assignment_handling: 'automatic',
      };
    }

    if (selectedType === 'straddle') {
      configuration = {
        ...configuration,
        symbol: 'SPY',
        strike_selection: 'atm',
        expiration_days: 30,
        volatility_threshold: 20,
        max_premium_percent: 12,
        stop_loss: { value: 50, type: 'percentage' },
        take_profit: { value: 100, type: 'percentage' },
      };
    }

    if (selectedType === 'orb') {
      configuration = {
        ...configuration,
        symbol: 'SPY',
        orb_period: 30,
        breakout_threshold: 0.002,
        stop_loss: { value: 1, type: 'percentage' },
        take_profit: { value: 2, type: 'percentage' },
        max_position_size: 100,
      };
    }

    const strategy: Omit<TradingStrategy, 'id'> = {
      name,
      type: selectedType,
      description,
      risk_level: riskLevel,
      min_capital: minCapital,
      is_active: isActive,
      configuration,
    };

    onSave(strategy);
  };

  const toggleCategory = (category: 'low' | 'medium' | 'high') => {
    setExpandedCategory(expandedCategory === category ? 'low' : category);
  };

  const isGridBot = selectedType && ['spot_grid', 'futures_grid', 'infinity_grid'].includes(selectedType);
  const isSmartRebalance = selectedType === 'smart_rebalance';
  const isDCA = selectedType === 'dca';

  const updateAssetAllocation = (index: number, field: 'symbol' | 'allocation', value: string | number) => {
    setRebalanceAssets(prev => prev.map((asset, i) => 
      i === index ? { ...asset, [field]: value } : asset
    ));
  };

  const totalAllocation = rebalanceAssets.reduce((sum, asset) => sum + asset.allocation, 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto"
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
                        onClick={() => toggleCategory(category.risk)}
                        className="w-full p-6 flex items-center justify-between"
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

              {/* Basic Strategy Configuration */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Basic Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Strategy Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={name}
                      onChange={handleInputChange}
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
                        name="minCapital"
                        value={minCapital}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="100"
                        step="100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Risk Level
                    </label>
                    <select
                      name="riskLevel"
                      value={riskLevel}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    name="description"
                    value={description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Describe your strategy..."
                  />
                </div>
              </div>

              {/* Grid Bot Configuration */}
              {isGridBot && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Grid Bot Configuration</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Trading Symbol
                      </label>
                      <select
                        value={gridSymbol}
                        onChange={(e) => setGridSymbol(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="BTC/USDT">BTC/USDT</option>
                        <option value="ETH/USDT">ETH/USDT</option>
                        <option value="ADA/USDT">ADA/USDT</option>
                        <option value="SOL/USDT">SOL/USDT</option>
                        <option value="MATIC/USDT">MATIC/USDT</option>
                        <option value="DOT/USDT">DOT/USDT</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Number of Grids (2-1000)
                      </label>
                      <input
                        type="number"
                        value={gridNumGrids}
                        onChange={(e) => setGridNumGrids(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        min="2"
                        max="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Lowest Price (USDT)
                      </label>
                      <input
                        type="number"
                        value={gridPriceLower}
                        onChange={(e) => setGridPriceLower(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    {selectedType !== 'infinity_grid' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Highest Price (USDT)
                        </label>
                        <input
                          type="number"
                          value={gridPriceUpper}
                          onChange={(e) => setGridPriceUpper(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    )}

                    {selectedType === 'futures_grid' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Direction
                          </label>
                          <select
                            value={futuresDirection}
                            onChange={(e) => setFuturesDirection(e.target.value as 'long' | 'short')}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="long">Long (Bullish)</option>
                            <option value="short">Short (Bearish)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Leverage (1-10x)
                          </label>
                          <input
                            type="number"
                            value={futuresLeverage}
                            onChange={(e) => setFuturesLeverage(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                            min="1"
                            max="10"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Grid Mode Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Grid Mode</label>
                    <div className="flex rounded-lg bg-gray-800 border border-gray-700 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setGridMode('arithmetic')}
                        className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
                          gridMode === 'arithmetic' 
                            ? 'bg-blue-600 text-white' 
                            : 'text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        Arithmetic
                      </button>
                      <button
                        type="button"
                        onClick={() => setGridMode('geometric')}
                        className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
                          gridMode === 'geometric' 
                            ? 'bg-blue-600 text-white' 
                            : 'text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        Geometric
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {gridMode === 'arithmetic'
                        ? 'Equal price differences between grids. More effective in bullish markets.'
                        : 'Equal percentage changes between grids. More effective in bearish markets or high volatility.'
                      }
                    </p>
                  </div>

                  {/* Advanced Grid Settings */}
                  <div className="bg-gray-800/30 rounded-lg p-6">
                    <h4 className="font-semibold text-white mb-4">Advanced Settings (Optional)</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Trigger Price (USDT)
                        </label>
                        <input
                          type="number"
                          value={gridTriggerPrice || ''}
                          onChange={(e) => setGridTriggerPrice(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                          placeholder="Optional"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Take Profit (USDT)
                        </label>
                        <input
                          type="number"
                          value={gridTakeProfit || ''}
                          onChange={(e) => setGridTakeProfit(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                          placeholder="Optional"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Stop Loss (USDT)
                        </label>
                        <input
                          type="number"
                          value={gridStopLoss || ''}
                          onChange={(e) => setGridStopLoss(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                          placeholder="Optional"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Smart Rebalance Configuration */}
              {isSmartRebalance && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Target className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Smart Rebalance Configuration</h3>
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-6">
                    <h4 className="font-semibold text-white mb-4">Asset Allocation</h4>
                    
                    <div className="space-y-4">
                      {rebalanceAssets.map((asset, index) => (
                        <div key={index} className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Asset {index + 1}
                            </label>
                            <select
                              value={asset.symbol}
                              onChange={(e) => updateAssetAllocation(index, 'symbol', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="BTC">Bitcoin (BTC)</option>
                              <option value="ETH">Ethereum (ETH)</option>
                              <option value="USDT">Tether (USDT)</option>
                              <option value="ADA">Cardano (ADA)</option>
                              <option value="SOL">Solana (SOL)</option>
                              <option value="MATIC">Polygon (MATIC)</option>
                              <option value="DOT">Polkadot (DOT)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Allocation (%)
                            </label>
                            <input
                              type="number"
                              value={asset.allocation}
                              onChange={(e) => updateAssetAllocation(index, 'allocation', Number(e.target.value))}
                              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                              min="0"
                              max="100"
                              step="1"
                            />
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                        <span className="text-sm text-gray-400">Total Allocation:</span>
                        <span className={`font-semibold ${totalAllocation === 100 ? 'text-green-400' : 'text-red-400'}`}>
                          {totalAllocation}%
                        </span>
                      </div>
                      
                      {totalAllocation !== 100 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            <p className="text-sm text-yellow-400">
                              Total allocation must equal 100%. Current total: {totalAllocation}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Trigger Type
                      </label>
                      <select
                        value={rebalanceTriggerType}
                        onChange={(e) => setRebalanceTriggerType(e.target.value as 'threshold' | 'time')}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="threshold">Threshold-Based</option>
                        <option value="time">Time-Based</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {rebalanceTriggerType === 'threshold' ? 'Threshold (%)' : 'Rebalance Frequency'}
                      </label>
                      {rebalanceTriggerType === 'threshold' ? (
                        <input
                          type="number"
                          value={rebalanceThreshold}
                          onChange={(e) => setRebalanceThreshold(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                          min="1"
                          max="50"
                          step="1"
                        />
                      ) : (
                        <select
                          value={rebalanceFrequency}
                          onChange={(e) => setRebalanceFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Rebalance Frequency
                      </label>
                      <select
                        value={rebalanceFrequency}
                        onChange={(e) => setRebalanceFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* DCA Configuration */}
              {isDCA && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">DCA Bot Configuration</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Trading Symbol
                      </label>
                      <select
                        value={dcaSymbol}
                        onChange={(e) => setDcaSymbol(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="BTC/USDT">Bitcoin (BTC/USDT)</option>
                        <option value="ETH/USDT">Ethereum (ETH/USDT)</option>
                        <option value="ADA/USDT">Cardano (ADA/USDT)</option>
                        <option value="SOL/USDT">Solana (SOL/USDT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Investment Amount per Interval (USDT)
                      </label>
                      <input
                        type="number"
                        value={dcaAmount}
                        onChange={(e) => setDcaAmount(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        min="10"
                        step="10"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Frequency
                      </label>
                      <select
                        value={dcaFrequency}
                        onChange={(e) => setDcaFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Target Allocation (%)
                      </label>
                      <input
                        type="number"
                        value={dcaTargetPercent}
                        onChange={(e) => setDcaTargetPercent(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="100"
                        step="1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Grid Mode Explanation for Grid Bots */}
              {isGridBot && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-400 mb-2">Grid Mode Selection</h4>
                      <div className="space-y-2 text-sm text-blue-300">
                        <p><strong>Arithmetic Mode:</strong> Equal price differences between grids (e.g., $100, $200, $300, $400). More effective in bullish markets where prices trend upward steadily.</p>
                        <p><strong>Geometric Mode:</strong> Equal percentage changes between grids (e.g., $100, $200, $400, $800). More effective in bearish markets or high volatility scenarios.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Infinity Grid Notice */}
              {selectedType === 'infinity_grid' && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-purple-400 mb-2">Infinity Grid Strategy</h4>
                      <p className="text-sm text-purple-300">
                        This strategy has no upper price limit, making it ideal for trending bull markets. 
                        The bot will continue placing buy and sell orders as the price moves upward indefinitely.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Risk Assessment Notice */}
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

              {/* Validation Warnings */}
              {isGridBot && selectedType !== 'infinity_grid' && gridPriceLower >= gridPriceUpper && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <p className="text-sm text-red-400">
                      Lowest price must be less than highest price for grid range.
                    </p>
                  </div>
                </div>
              )}

              {isSmartRebalance && totalAllocation !== 100 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <p className="text-sm text-red-400">
                      Asset allocations must total exactly 100%. Current total: {totalAllocation}%
                    </p>
                  </div>
                </div>
              )}

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
                  disabled={
                    !name || 
                    !description || 
                    minCapital <= 0 ||
                    (isGridBot && selectedType !== 'infinity_grid' && gridPriceLower >= gridPriceUpper) ||
                    (isSmartRebalance && totalAllocation !== 100)
                  }
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