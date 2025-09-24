import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  TrendingUp, 
  Shield, 
  DollarSign, 
  Settings,
  AlertTriangle,
  Building,
  Grid3X3,
  Calculator,
  Target,
  BarChart3,
  Search,
  ChevronDown,
  Plus
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy, BrokerageAccount } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';

interface TradableAsset {
  symbol: string;
  name: string;
  exchange: string;
  asset_class: 'equity' | 'crypto';
}

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => void;
}

const strategyTypes = [
  // Grid Trading Bots
  {
    category: 'Grid Trading Bots',
    icon: Grid3X3,
    description: 'Automated buy-low/sell-high trading within defined ranges',
    strategies: [
      {
        type: 'spot_grid',
        name: 'Spot Grid Bot',
        description: 'Automate buy-low/sell-high trades within a price range',
        risk_level: 'low' as const,
        min_capital: 1000,
        tier: 'pro' as const,
      },
      {
        type: 'futures_grid',
        name: 'Futures Grid Bot',
        description: 'Grid trading on futures with leverage support',
        risk_level: 'medium' as const,
        min_capital: 2000,
        tier: 'elite' as const,
      },
      {
        type: 'infinity_grid',
        name: 'Infinity Grid Bot',
        description: 'Grid trading without upper price limit for trending markets',
        risk_level: 'medium' as const,
        min_capital: 1500,
        tier: 'elite' as const,
      },
    ]
  },
  // Options Income Strategies
  {
    category: 'Options Income Strategies',
    icon: TrendingUp,
    description: 'Generate consistent income through options trading',
    strategies: [
      {
        type: 'covered_calls',
        name: 'Covered Calls',
        description: 'Generate income by selling call options on owned stocks',
        risk_level: 'low' as const,
        min_capital: 15000,
        tier: 'pro' as const,
      },
      {
        type: 'wheel',
        name: 'The Wheel',
        description: 'Systematic approach combining cash-secured puts and covered calls',
        risk_level: 'low' as const,
        min_capital: 20000,
        tier: 'pro' as const,
      },
      {
        type: 'short_put',
        name: 'Cash-Secured Put',
        description: 'Generate income by selling put options with cash backing',
        risk_level: 'medium' as const,
        min_capital: 10000,
        tier: 'pro' as const,
      },
    ]
  },
  // Portfolio Management
  {
    category: 'Portfolio Management',
    icon: BarChart3,
    description: 'Systematic investing and portfolio optimization',
    strategies: [
      {
        type: 'dca',
        name: 'DCA Bot',
        description: 'Dollar-cost averaging for systematic investing',
        risk_level: 'low' as const,
        min_capital: 500,
        tier: 'starter' as const,
      },
      {
        type: 'smart_rebalance',
        name: 'Smart Rebalance',
        description: 'Maintain target allocations through automatic rebalancing',
        risk_level: 'low' as const,
        min_capital: 5000,
        tier: 'starter' as const,
      },
    ]
  },
];

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const { brokerageAccounts, getEffectiveSubscriptionTier } = useStore();
  const [step, setStep] = useState<'category' | 'strategy' | 'configure' | 'review'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [strategyName, setStrategyName] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [configuration, setConfiguration] = useState<Record<string, any>>({});
  const [tradableAssets, setTradableAssets] = useState<{ stocks: TradableAsset[], crypto: TradableAsset[] }>({ stocks: [], crypto: [] });
  const [symbolSuggestions, setSymbolSuggestions] = useState<TradableAsset[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [symbolSearchTerm, setSymbolSearchTerm] = useState('');

  // Load tradable assets on component mount
  React.useEffect(() => {
    const loadTradableAssets = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/strategies/tradable-assets`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const assets = await response.json();
          setTradableAssets(assets);
        }
      } catch (error) {
        console.error('Error loading tradable assets:', error);
      }
    };

    loadTradableAssets();
  }, []);

  // Filter suggestions based on search term
  React.useEffect(() => {
    if (!symbolSearchTerm) {
      setSymbolSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const allAssets = [...tradableAssets.stocks, ...tradableAssets.crypto];
    const filtered = allAssets.filter(asset => 
      asset.symbol.toLowerCase().includes(symbolSearchTerm.toLowerCase()) ||
      asset.name.toLowerCase().includes(symbolSearchTerm.toLowerCase())
    ).slice(0, 10); // Limit to 10 suggestions

    setSymbolSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [symbolSearchTerm, tradableAssets]);

  const handleSymbolSelect = (asset: TradableAsset) => {
    setConfiguration(prev => ({ ...prev, symbol: asset.symbol }));
    setSymbolSearchTerm(asset.symbol);
    setShowSuggestions(false);
  };

  const selectedCategoryData = strategyTypes.find(c => c.category === selectedCategory);
  const selectedStrategyType = selectedCategoryData?.strategies.find(s => s.type === selectedType);
  const selectedAccountData = brokerageAccounts.find(acc => acc.id === selectedAccount);
  const userTier = getEffectiveSubscriptionTier();

  const tierOrder = { starter: 0, pro: 1, elite: 2 };
  const hasAccess = (requiredTier: string) => tierOrder[userTier] >= tierOrder[requiredTier as keyof typeof tierOrder];

  const handleNext = () => {
    if (step === 'category' && selectedCategory) {
      setStep('strategy');
    } else if (step === 'strategy' && selectedType) {
      setStep('configure');
      // Set default strategy name
      if (!strategyName) {
        setStrategyName(`${selectedStrategyType?.name} Strategy`);
      }
    } else if (step === 'configure') {
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'review') {
      setStep('configure');
    } else if (step === 'configure') {
      setStep('strategy');
    } else if (step === 'strategy') {
      setStep('category');
    }
  };

  const handleCreate = () => {
    if (!selectedType || !selectedStrategyType || !selectedAccount) return;

    const strategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: selectedType as TradingStrategy['type'],
      description: selectedStrategyType.description,
      risk_level: selectedStrategyType.risk_level,
      min_capital: selectedStrategyType.min_capital,
      is_active: false,
      account_id: selectedAccount,
      asset_class: 'equity',
      base_symbol: configuration.symbol || 'AAPL',
      quote_currency: 'USD',
      time_horizon: 'swing',
      automation_level: 'fully_auto',
      capital_allocation: {
        mode: 'fixed_amount_usd',
        value: configuration.allocated_capital || selectedStrategyType.min_capital,
        max_positions: 1,
        max_exposure_usd: configuration.allocated_capital || selectedStrategyType.min_capital,
      },
      position_sizing: {
        mode: 'fixed_units',
        value: 1,
      },
      trade_window: {
        enabled: false,
        start_time: '09:30',
        end_time: '16:00',
        days_of_week: [1, 2, 3, 4, 5],
      },
      order_execution: {
        order_type_default: 'market',
        limit_tolerance_percent: 0.1,
        allow_partial_fill: false,
        combo_execution: 'atomic',
      },
      risk_controls: {
        stop_loss_usd: 0,
        take_profit_usd: 0,
        max_daily_loss_usd: 0,
        max_drawdown_percent: 0,
      },
      data_filters: {},
      notifications: {
        email_alerts: true,
        push_notifications: false,
        webhook_url: '',
      },
      backtest_mode: 'paper',
      backtest_params: {},
      base_symbol: configuration.symbol || 'BTC',
      configuration,
    };

    onSave(strategy);
  };

  const renderCategoryStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Choose Strategy Category</h3>
        <p className="text-gray-400 mb-6">
          Select the category of trading strategy you want to create
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {strategyTypes.map((category) => {
          const Icon = category.icon;
          const hasAnyAccess = category.strategies.some(s => hasAccess(s.tier));
          
          return (
            <motion.div
              key={category.category}
              whileHover={hasAnyAccess ? { scale: 1.01 } : {}}
              whileTap={hasAnyAccess ? { scale: 0.99 } : {}}
              onClick={hasAnyAccess ? () => setSelectedCategory(category.category) : undefined}
              className={`p-6 border rounded-lg transition-all relative ${
                selectedCategory === category.category
                  ? 'border-blue-500 bg-blue-500/10'
                  : hasAnyAccess
                    ? 'border-gray-700 bg-gray-800/30 cursor-pointer hover:border-gray-600'
                    : 'border-gray-800 bg-gray-800/10 cursor-not-allowed opacity-60'
              }`}
            >
              {!hasAnyAccess && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
                  Upgrade Required
                </div>
              )}
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-lg">{category.category}</h4>
                  <p className="text-sm text-gray-400">{category.description}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>{category.strategies.length} strategies available</span>
                <span>
                  From {formatCurrency(Math.min(...category.strategies.map(s => s.min_capital)))}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderStrategyStep = () => {
    if (!selectedCategoryData) return null;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Choose Strategy</h3>
          <p className="text-gray-400 mb-6">
            Select a specific strategy from the {selectedCategory} category
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedCategoryData.strategies.map((strategy) => {
            const hasStrategyAccess = hasAccess(strategy.tier);
            
            return (
              <motion.div
                key={strategy.type}
                whileHover={hasStrategyAccess ? { scale: 1.01 } : {}}
                whileTap={hasStrategyAccess ? { scale: 0.99 } : {}}
                onClick={hasStrategyAccess ? () => setSelectedType(strategy.type) : undefined}
                className={`p-6 border rounded-lg transition-all relative ${
                  selectedType === strategy.type
                    ? 'border-blue-500 bg-blue-500/10'
                    : hasStrategyAccess
                      ? 'border-gray-700 bg-gray-800/30 cursor-pointer hover:border-gray-600'
                      : 'border-gray-800 bg-gray-800/10 cursor-not-allowed opacity-60'
                }`}
              >
                {!hasStrategyAccess && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30 capitalize">
                    {strategy.tier} Required
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-white mb-2">{strategy.name}</h4>
                    <p className="text-sm text-gray-400 mb-3">{strategy.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${
                      strategy.risk_level === 'low' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                      strategy.risk_level === 'medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                      'text-red-400 bg-red-400/10 border-red-400/20'
                    }`}>
                      {strategy.risk_level} risk
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Min: {formatCurrency(strategy.min_capital)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderConfigureStep = () => {
    if (!selectedStrategyType) return null;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Configure Strategy</h3>
          <p className="text-gray-400 mb-6">
            Set up the parameters for your {selectedStrategyType.name} strategy
          </p>
        </div>

        {/* Basic Configuration */}
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
              placeholder={`${selectedStrategyType.name} Strategy`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Brokerage Account
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select account...</option>
              {brokerageAccounts.filter(acc => acc.is_connected).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name} - {formatCurrency(account.balance)}
                </option>
              ))}
            </select>
            {brokerageAccounts.filter(acc => acc.is_connected).length === 0 && (
              <p className="text-sm text-yellow-400 mt-1">
                No connected accounts. Please connect a brokerage account first.
              </p>
            )}
          </div>
        </div>

        {/* Strategy-specific configuration */}
        {selectedType === 'spot_grid' && (
          <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
              <h4 className="font-medium text-blue-400 mb-4 flex items-center gap-2">
                <Grid3X3 className="w-5 h-5" />
                Grid Configuration
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Symbol
                  </label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={symbolSearchTerm || configuration.symbol || 'AAPL'}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setSymbolSearchTerm(value);
                          setConfiguration(prev => ({ ...prev, symbol: value }));
                        }}
                        onFocus={() => {
                          if (symbolSuggestions.length > 0) setShowSuggestions(true);
                        }}
                        className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        placeholder="Search symbols (e.g., AAPL, MSFT, SPY)"
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    </div>
                    
                    {/* Symbol Suggestions Dropdown */}
                    {showSuggestions && symbolSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {symbolSuggestions.map((asset) => (
                          <motion.div
                            key={asset.symbol}
                            whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                            onClick={() => handleSymbolSelect(asset)}
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-700/50 border-b border-gray-700/50 last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                asset.asset_class === 'crypto' 
                                  ? 'bg-gradient-to-br from-orange-500 to-yellow-500 text-white'
                                  : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                              }`}>
                                {asset.symbol.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-white">{asset.symbol}</p>
                                <p className="text-sm text-gray-400">{asset.name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-400">{asset.exchange}</p>
                              <p className={`text-xs font-medium ${
                                asset.asset_class === 'crypto' ? 'text-orange-400' : 'text-blue-400'
                              }`}>
                                {asset.asset_class}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Lower Price Range
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      value={configuration.price_range_lower || ''}
                      onChange={(e) => setConfiguration(prev => ({ ...prev, price_range_lower: Number(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      placeholder="40000"
                      min="0"
                      step="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Upper Price Range
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      value={configuration.price_range_upper || ''}
                      onChange={(e) => setConfiguration(prev => ({ ...prev, price_range_upper: Number(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      placeholder="50000"
                      min="0"
                      step="100"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Number of Grids
                  </label>
                  <input
                    type="number"
                    value={configuration.number_of_grids || 20}
                    onChange={(e) => setConfiguration(prev => ({ ...prev, number_of_grids: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    min="5"
                    max="100"
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
                      value={configuration.allocated_capital || selectedStrategyType?.min_capital || 1000}
                      onChange={(e) => setConfiguration(prev => ({ ...prev, allocated_capital: Number(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      min="100"
                      step="100"
                    />
                  </div>
                </div>
              </div>

              {/* Grid Preview */}
              {configuration.price_range_lower && configuration.price_range_upper && configuration.number_of_grids && (
                <div className="mt-6 bg-gray-800/30 rounded-lg p-4">
                  <h5 className="font-medium text-white mb-3 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Grid Preview
                  </h5>
                  {(() => {
                    const lower = configuration.price_range_lower;
                    const upper = configuration.price_range_upper;
                    const grids = configuration.number_of_grids;
                    const capital = configuration.allocated_capital || selectedStrategyType?.min_capital || 1000;
                    
                    if (lower >= upper) {
                      return (
                        <p className="text-red-400 text-sm">
                          Upper price must be greater than lower price
                        </p>
                      );
                    }
                    
                    const priceRange = upper - lower;
                    const gridSpacing = priceRange / grids;
                    const capitalPerGrid = capital / grids;
                    
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Price Range:</span>
                          <span className="text-white ml-2">{formatCurrency(priceRange)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Grid Spacing:</span>
                          <span className="text-white ml-2">{formatCurrency(gridSpacing)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Capital/Grid:</span>
                          <span className="text-white ml-2">{formatCurrency(capitalPerGrid)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Total Grids:</span>
                          <span className="text-white ml-2">{grids}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DCA Configuration */}
        {selectedType === 'dca' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
            <h4 className="font-medium text-green-400 mb-4">DCA Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Symbol
                </label>
                <input
                  type="text"
                  value={configuration.symbol || 'BTC'}
                  onChange={(e) => setConfiguration(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="BTC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Investment Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    value={configuration.investment_amount_per_interval || 100}
                    onChange={(e) => setConfiguration(prev => ({ ...prev, investment_amount_per_interval: Number(e.target.value) }))}
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
                  value={configuration.frequency || 'daily'}
                  onChange={(e) => setConfiguration(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {selectedType === 'smart_rebalance' && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
            <h4 className="font-medium text-blue-400 mb-4">Smart Rebalance Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Capital
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    value={configuration.allocated_capital || selectedStrategyType?.min_capital || 5000}
                    onChange={(e) => setConfiguration(prev => ({ ...prev, allocated_capital: Number(e.target.value) }))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    min="1000"
                    step="1000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rebalance Threshold (%)
                </label>
                <input
                  type="number"
                  value={configuration.threshold_deviation_percent || 5}
                  onChange={(e) => setConfiguration(prev => ({ ...prev, threshold_deviation_percent: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  min="1"
                  max="20"
                  step="1"
                />
              </div>
            </div>

            {/* Asset Allocation */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Asset Allocation
              </label>
              <div className="space-y-3">
                {(configuration.assets || [{ symbol: 'BTC', allocation: 40 }, { symbol: 'ETH', allocation: 30 }, { symbol: 'USDT', allocation: 30 }]).map((asset: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          value={asset.symbol || ''}
                          onChange={(e) => {
                            const newAssets = [...(configuration.assets || [])];
                            newAssets[index] = { ...newAssets[index], symbol: e.target.value.toUpperCase() };
                            setConfiguration(prev => ({ ...prev, assets: newAssets }));
                          }}
                          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                          placeholder="Symbol"
                        />
                      </div>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={asset.allocation || 0}
                        onChange={(e) => {
                          const newAssets = [...(configuration.assets || [])];
                          newAssets[index] = { ...newAssets[index], allocation: Number(e.target.value) };
                          setConfiguration(prev => ({ ...prev, assets: newAssets }));
                        }}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                        min="0"
                        max="100"
                        step="5"
                      />
                    </div>
                    <span className="text-gray-400 text-sm">%</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newAssets = (configuration.assets || []).filter((_: any, i: number) => i !== index);
                        setConfiguration(prev => ({ ...prev, assets: newAssets }));
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newAssets = [...(configuration.assets || []), { symbol: '', allocation: 0 }];
                    setConfiguration(prev => ({ ...prev, assets: newAssets }));
                  }}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Asset
                </Button>
              </div>
              
              {/* Allocation Summary */}
              {configuration.assets && configuration.assets.length > 0 && (
                <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total Allocation:</span>
                    <span className={`font-medium ${
                      configuration.assets.reduce((sum: number, asset: any) => sum + (asset.allocation || 0), 0) === 100
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }`}>
                      {configuration.assets.reduce((sum: number, asset: any) => sum + (asset.allocation || 0), 0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Covered Calls Configuration */}
        {selectedType === 'covered_calls' && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6">
            <h4 className="font-medium text-purple-400 mb-4">Covered Calls Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Symbol
                </label>
                <input
                  type="text"
                  value={configuration.symbol || 'AAPL'}
                  onChange={(e) => setConfiguration(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="AAPL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strike Delta
                </label>
                <input
                  type="number"
                  value={configuration.strike_delta || 0.30}
                  onChange={(e) => setConfiguration(prev => ({ ...prev, strike_delta: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  min="0.1"
                  max="0.5"
                  step="0.05"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Days to Expiration
                </label>
                <input
                  type="number"
                  value={configuration.expiration_days || 30}
                  onChange={(e) => setConfiguration(prev => ({ ...prev, expiration_days: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  min="7"
                  max="90"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Review Strategy</h3>
        <p className="text-gray-400 mb-6">
          Review your strategy configuration before creating
        </p>
      </div>

      {/* Strategy Summary */}
      <div className="bg-gray-800/30 rounded-lg p-6">
        <h4 className="font-medium text-white mb-4">Strategy Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Name:</span>
              <span className="text-white">{strategyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Type:</span>
              <span className="text-white">{selectedStrategyType?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Risk Level:</span>
              <span className={`capitalize ${
                selectedStrategyType?.risk_level === 'low' ? 'text-green-400' :
                selectedStrategyType?.risk_level === 'medium' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {selectedStrategyType?.risk_level}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Account:</span>
              <span className="text-white">{selectedAccountData?.account_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Min Capital:</span>
              <span className="text-white">{formatCurrency(selectedStrategyType?.min_capital || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Available Balance:</span>
              <span className="text-white">{formatCurrency(selectedAccountData?.balance || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Details */}
      <div className="bg-gray-800/30 rounded-lg p-6">
        <h4 className="font-medium text-white mb-4">Configuration</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {Object.entries(configuration).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
              <span className="text-white">
                {typeof value === 'number' && key.includes('price') ? formatCurrency(value) :
                 typeof value === 'number' && key.includes('capital') ? formatCurrency(value) :
                 String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Validation Warnings */}
      {selectedAccountData && (configuration.allocated_capital || selectedStrategyType?.min_capital || 0) > selectedAccountData.balance && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-400 mb-2">Insufficient Balance</h4>
              <p className="text-sm text-red-300">
                The required capital ({formatCurrency(configuration.allocated_capital || selectedStrategyType?.min_capital || 0)}) 
                exceeds your account balance ({formatCurrency(selectedAccountData.balance)}).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const canProceed = () => {
    if (step === 'category') return selectedCategory !== null;
    if (step === 'strategy') return selectedType !== null;
    if (step === 'configure') {
      if (!strategyName || !selectedAccount) return false;
      
      // Validate grid configuration
      if (selectedType === 'spot_grid') {
        return configuration.price_range_lower && 
               configuration.price_range_upper && 
               configuration.price_range_lower < configuration.price_range_upper &&
               configuration.number_of_grids > 0;
      }
      
      return true;
    }
    if (step === 'review') {
      return selectedAccountData && 
             (configuration.allocated_capital || selectedStrategyType?.min_capital || 0) <= selectedAccountData.balance;
    }
    return false;
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
              <p className="text-gray-400">Set up a new automated trading strategy</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              {['category', 'strategy', 'configure', 'review'].map((stepName, index) => (
                <div key={stepName} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step === stepName 
                      ? 'bg-blue-600 text-white' 
                      : index < ['category', 'strategy', 'configure', 'review'].indexOf(step)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      index < ['category', 'strategy', 'configure', 'review'].indexOf(step)
                        ? 'bg-green-600'
                        : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {step === 'category' && renderCategoryStep()}
          {step === 'strategy' && renderStrategyStep()}
          {step === 'configure' && renderConfigureStep()}
          {step === 'review' && renderReviewStep()}

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            {step !== 'category' && (
              <Button variant="secondary" onClick={handleBack}>
                Back
              </Button>
            )}
            
            <div className="flex-1" />
            
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            
            {step !== 'review' ? (
              <Button 
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleCreate}
                disabled={!canProceed()}
              >
                <Target className="w-4 h-4 mr-2" />
                Create Strategy
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}