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
import { NumericInput } from '../ui/NumericInput';
import { OptionsBellCurve } from './OptionsBellCurve';
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
  const [optionsChainData, setOptionsChainData] = useState<any>(null);
  const [selectedOptionContract, setSelectedOptionContract] = useState<any>(null);
  const [loadingOptionsChain, setLoadingOptionsChain] = useState(false);
  const [tradableAssets, setTradableAssets] = useState<{ stocks: TradableAsset[], crypto: TradableAsset[] }>({ stocks: [], crypto: [] });
  const [symbolSuggestions, setSymbolSuggestions] = useState<TradableAsset[]>([]);
  // Options-specific state
  const [probabilityOfSuccessTarget, setProbabilityOfSuccessTarget] = useState(84);
  const [expirationDaysTarget, setExpirationDaysTarget] = useState(30);
  const [strikeSelectionMethod, setStrikeSelectionMethod] = useState<'delta' | 'pos' | 'manual'>('pos');

  // Check if current strategy type is options-related
  const isOptionsStrategy = selectedType && ['covered_calls', 'short_put', 'wheel'].includes(selectedType);

  // Fetch options chain data when symbol or expiration changes
  React.useEffect(() => {
    if (isOptionsStrategy && configuration.symbol && expirationDaysTarget) {
      fetchOptionsChainData();
    }
  }, [isOptionsStrategy, configuration.symbol, expirationDaysTarget]);

  const fetchOptionsChainData = async () => {
    if (!configuration.symbol) return;
    
    setLoadingOptionsChain(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Calculate target expiration date
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + expirationDaysTarget);
      const expirationDate = targetDate.toISOString().split('T')[0];

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/market-data/options-chain?symbol=${configuration.symbol}&expiration=${expirationDate}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOptionsChainData(data);
        
        // Create strategy object with conditional options fields
        const strategyData = {
          name: strategyName,
          type: strategyType,
          description: description,
          risk_level: riskLevel,
          min_capital: minCapital,
          is_active: false,
          configuration: {
            symbol: selectedSymbol,
            allocated_capital: allocatedCapital,
            ...configuration,
            // Add options-specific fields if it's an options strategy
            ...(isOptionsStrategy && {
              probability_of_success_target: probabilityOfSuccessTarget,
              expiration_days_target: expirationDaysTarget,
              strike_selection_method: strikeSelectionMethod,
            }),
          },
        };
      } else {
        console.error('Failed to fetch options chain data');
      }
    } catch (error) {
      console.error('Error fetching options chain:', error);
    } finally {
      setLoadingOptionsChain(false);
    }
  };

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [symbolSearchTerm, setSymbolSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'covered_calls' as TradingStrategy['type'],
    description: '',
    risk_level: 'medium' as TradingStrategy['risk_level'],
    min_capital: 10000,
    configuration: {
      symbol: 'AAPL', // Default for covered_calls
    },
  });
  const [assetSearchTerms, setAssetSearchTerms] = useState<Record<number, string>>({});
  const [assetSuggestions, setAssetSuggestions] = useState<Record<number, TradableAsset[]>>({});
  const [showAssetSuggestions, setShowAssetSuggestions] = useState<Record<number, boolean>>({});

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
          const data = await response.json();
          // Filter assets into stocks and crypto arrays
          const assets = data.assets || [];
          const stocks = assets.filter((asset: any) => asset.asset_class === 'equity');
          const crypto = assets.filter((asset: any) => asset.asset_class === 'crypto');
          
          setTradableAssets({ stocks, crypto });
        }
      } catch (error) {
        console.error('Error loading tradable assets:', error);
        // Set empty arrays on error to prevent iteration errors
        setTradableAssets({ stocks: [], crypto: [] });
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

  // Close suggestions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.symbol-input-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSymbolSelect = (asset: TradableAsset) => {
    setConfiguration(prev => ({ ...prev, symbol: asset.symbol }));
    setSymbolSearchTerm(asset.symbol);
    setShowSuggestions(false);
  };

  // Smart Rebalance allocation helpers
  const normalizeAllocationsEvenly = (assets: any[], cashAllocation = 0) => {
    const nonCashAssets = assets.filter(asset => asset.symbol.toUpperCase() !== 'CASH');
    const remainingPercentage = Math.max(0, 100 - cashAllocation);
    const evenAllocation = nonCashAssets.length > 0 ? remainingPercentage / nonCashAssets.length : 0;
    
    return assets.map(asset => ({
      ...asset,
      allocation: asset.symbol.toUpperCase() === 'CASH' ? cashAllocation : Math.round(evenAllocation * 100) / 100
    }));
  };

  const normalizeAllocationsByMarketCap = (assets: any[], cashAllocation = 0) => {
    const nonCashAssets = assets.filter(asset => asset.symbol.toUpperCase() !== 'CASH');
    const remainingPercentage = Math.max(0, 100 - cashAllocation);
    
    // Get market cap data for non-cash assets
    const assetsWithMarketCap = nonCashAssets.map(asset => {
      const assetData = [...tradableAssets.stocks, ...tradableAssets.crypto].find(
        a => a.symbol === asset.symbol
      );
      return {
        ...asset,
        market_cap: assetData?.market_cap || 100 // Default market cap in billions if not found
      };
    });
    
    const totalMarketCap = assetsWithMarketCap.reduce((sum, asset) => sum + asset.market_cap, 0);
    
    return assets.map(asset => {
      if (asset.symbol.toUpperCase() === 'CASH') {
        return { ...asset, allocation: cashAllocation };
      }
      
      const assetWithMarketCap = assetsWithMarketCap.find(a => a.symbol === asset.symbol);
      const marketCapWeight = (assetWithMarketCap?.market_cap || 0) / totalMarketCap;
      const allocation = remainingPercentage * marketCapWeight;
      
      return {
        ...asset,
        allocation: Math.round(allocation * 100) / 100
      };
    });
  };

  const applyMajorityCash = (assets: any[], cashPercentage: number, distributionMethod: 'even' | 'marketcap') => {
    // Ensure cash asset exists
    const hasCash = assets.some(asset => asset.symbol.toUpperCase() === 'CASH');
    let updatedAssets = [...assets];
    
    if (!hasCash) {
      updatedAssets.push({ symbol: 'CASH', allocation: cashPercentage });
    } else {
      updatedAssets = updatedAssets.map(asset => 
        asset.symbol.toUpperCase() === 'CASH' 
          ? { ...asset, allocation: cashPercentage }
          : asset
      );
    }
    
    // Apply distribution method to remaining assets
    if (distributionMethod === 'even') {
      return normalizeAllocationsEvenly(updatedAssets, cashPercentage);
    } else {
      return normalizeAllocationsByMarketCap(updatedAssets, cashPercentage);
    }
  };

  const handleNormalization = (method: 'even' | 'marketcap' | 'majority_cash_even' | 'majority_cash_marketcap') => {
    const currentAssets = configuration.assets || [];
    let normalizedAssets;
    
    switch (method) {
      case 'even':
        normalizedAssets = normalizeAllocationsEvenly(currentAssets);
        break;
      case 'marketcap':
        normalizedAssets = normalizeAllocationsByMarketCap(currentAssets);
        break;
      case 'majority_cash_even':
        normalizedAssets = applyMajorityCash(currentAssets, 60, 'even');
        break;
      case 'majority_cash_marketcap':
        normalizedAssets = applyMajorityCash(currentAssets, 60, 'marketcap');
        break;
      default:
        normalizedAssets = currentAssets;
    }
    
    setConfiguration(prev => ({ ...prev, assets: normalizedAssets }));
  };

  const addAsset = () => {
    const currentAssets = configuration.assets || [];
    const newAssets = [...currentAssets, { symbol: '', allocation: 0 }];
    
    // Auto-normalize to maintain 100% allocation
    const normalizedAssets = normalizeAllocationsEvenly(newAssets);
    setConfiguration(prev => ({ ...prev, assets: normalizedAssets }));
  };

  const removeAsset = (index: number) => {
    const currentAssets = configuration.assets || [];
    const newAssets = currentAssets.filter((_: any, i: number) => i !== index);
    
    // Auto-normalize remaining assets to maintain 100% allocation
    const normalizedAssets = normalizeAllocationsEvenly(newAssets);
    setConfiguration(prev => ({ ...prev, assets: normalizedAssets }));
  };

  const updateAssetSymbol = (index: number, symbol: string) => {
    const newAssets = [...(configuration.assets || [])];
    newAssets[index] = { ...newAssets[index], symbol: symbol.toUpperCase() };
    setConfiguration(prev => ({ ...prev, assets: newAssets }));
  };

  const updateAssetAllocation = (index: number, allocation: number) => {
    const newAssets = [...(configuration.assets || [])];
    newAssets[index] = { ...newAssets[index], allocation: Math.max(0, Math.min(100, allocation)) };
    setConfiguration(prev => ({ ...prev, assets: newAssets }));
  };

  // Handle asset search for smart rebalance
  const handleAssetSearch = (index: number, searchTerm: string) => {
    setAssetSearchTerms(prev => ({ ...prev, [index]: searchTerm }));
    
    if (!searchTerm || searchTerm.toUpperCase() === 'CASH') {
      setAssetSuggestions(prev => ({ ...prev, [index]: [] }));
      setShowAssetSuggestions(prev => ({ ...prev, [index]: false }));
      return;
    }

    const allAssets = [...tradableAssets.stocks, ...tradableAssets.crypto];
    const filtered = allAssets.filter(asset => 
      asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 8); // Limit to 8 suggestions

    setAssetSuggestions(prev => ({ ...prev, [index]: filtered }));
    setShowAssetSuggestions(prev => ({ ...prev, [index]: filtered.length > 0 }));
  };

  const handleAssetSelect = (index: number, asset: TradableAsset) => {
    updateAssetSymbol(index, asset.symbol);
    setAssetSearchTerms(prev => ({ ...prev, [index]: asset.symbol }));
    setShowAssetSuggestions(prev => ({ ...prev, [index]: false }));
  };

  const selectedCategoryData = strategyTypes.find(c => c.category === selectedCategory);
  const selectedStrategyType = selectedCategoryData?.strategies.find(s => s.type === selectedType);
  const selectedAccountData = brokerageAccounts.find(acc => acc.id === selectedAccount);
  const userTier = getEffectiveSubscriptionTier();

  // Update default symbol when strategy type changes
  useEffect(() => {
    const getDefaultSymbol = (strategyType: string): string => {
      // Crypto-related strategies
      if (['spot_grid', 'futures_grid', 'infinity_grid', 'dca', 'smart_rebalance'].includes(strategyType)) {
        return 'BTC/USD';
      }
      
      // Stock/options-related strategies
      return 'AAPL';
    };

    const defaultSymbol = getDefaultSymbol(newStrategy.type);
    
    // Only update if the current symbol is empty or if we're switching strategy types
    if (!newStrategy.configuration?.symbol || 
        (newStrategy.configuration.symbol !== defaultSymbol && 
         ((newStrategy.configuration.symbol === 'BTC/USD' && !['spot_grid', 'futures_grid', 'infinity_grid', 'dca', 'smart_rebalance'].includes(newStrategy.type)) ||
          (newStrategy.configuration.symbol === 'AAPL' && ['spot_grid', 'futures_grid', 'infinity_grid', 'dca', 'smart_rebalance'].includes(newStrategy.type))))) {
      
      setNewStrategy(prev => ({
        ...prev,
        configuration: {
          ...prev.configuration,
          symbol: defaultSymbol,
        }
      }));
    }
  }, [newStrategy.type]);

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
              <option value="">Select account</option>
              {brokerageAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name} ({account.brokerage})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Strategy-specific configuration */}
        {selectedType === 'smart_rebalance' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-300">
                  Asset Allocation
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNormalization('even')}
                    className="text-xs"
                  >
                    Equal Weight
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNormalization('marketcap')}
                    className="text-xs"
                  >
                    Market Cap
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNormalization('majority_cash_even')}
                    className="text-xs"
                  >
                    60% Cash
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                {(configuration.assets || []).map((asset: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex-1 relative symbol-input-container">
                      <input
                        type="text"
                        value={assetSearchTerms[index] || asset.symbol || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleAssetSearch(index, value);
                          updateAssetSymbol(index, value);
                        }}
                        onFocus={() => {
                          if (assetSuggestions[index]?.length > 0) {
                            setShowAssetSuggestions(prev => ({ ...prev, [index]: true }));
                          }
                        }}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        placeholder="Symbol (e.g., AAPL, BTC, CASH)"
                      />
                      
                      {/* Asset suggestions dropdown */}
                      {showAssetSuggestions[index] && assetSuggestions[index]?.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {assetSuggestions[index].map((suggestion) => (
                            <button
                              key={suggestion.symbol}
                              onClick={() => handleAssetSelect(index, suggestion)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-white font-medium">{suggestion.symbol}</span>
                                  <span className="text-gray-400 text-sm ml-2">{suggestion.name}</span>
                                </div>
                                <span className="text-xs text-gray-500 capitalize">{suggestion.asset_class}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="w-24">
                      <NumericInput
                        value={asset.allocation || 0}
                        onChange={(value) => updateAssetAllocation(index, value)}
                        min={0}
                        max={100}
                        step={1}
                        suffix="%"
                        className="text-center"
                      />
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAsset(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  onClick={addAsset}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Asset
                </Button>
              </div>
              
              {/* Allocation Summary */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Total Allocation:</span>
                  <span className={`font-medium ${
                    Math.abs((configuration.assets || []).reduce((sum: number, asset: any) => sum + (asset.allocation || 0), 0) - 100) < 0.01
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {(configuration.assets || []).reduce((sum: number, asset: any) => sum + (asset.allocation || 0), 0).toFixed(1)}%
                  </span>
                </div>
                {Math.abs((configuration.assets || []).reduce((sum: number, asset: any) => sum + (asset.allocation || 0), 0) - 100) >= 0.01 && (
                  <p className="text-xs text-red-400">
                    Total allocation should equal 100%
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Common configuration for other strategies */}
        {selectedType !== 'smart_rebalance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="symbol-input-container relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Trading Symbol
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={symbolSearchTerm}
                  onChange={(e) => setSymbolSearchTerm(e.target.value)}
                  onFocus={() => {
                    if (symbolSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Search symbols (e.g., AAPL, BTC)"
                />
                
                {/* Symbol suggestions dropdown */}
                {showSuggestions && symbolSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {symbolSuggestions.map((asset) => (
                      <button
                        key={asset.symbol}
                        onClick={() => handleSymbolSelect(asset)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white font-medium">{asset.symbol}</span>
                            <span className="text-gray-400 text-sm ml-2">{asset.name}</span>
                          </div>
                          <span className="text-xs text-gray-500 capitalize">{asset.asset_class}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Allocated Capital
              </label>
              <NumericInput
                value={configuration.allocated_capital || selectedStrategyType.min_capital}
                onChange={(value) => setConfiguration(prev => ({ ...prev, allocated_capital: value }))}
                min={selectedStrategyType.min_capital}
                step={1000}
                prefix="$"
                placeholder="Enter capital amount"
              />
            </div>
          </div>
        )}

        {/* Strategy-specific parameters */}
        {selectedType === 'spot_grid' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">Grid Configuration</h4>
            
            {/* Basic Grid Setup */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Grid Mode
                </label>
                <select
                  value={configuration.grid_mode || 'arithmetic'}
                  onChange={(e) => setConfiguration(prev => ({ ...prev, grid_mode: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="arithmetic">Arithmetic (Equal $)</option>
                  <option value="geometric">Geometric (Equal %)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lower Price Range
                </label>
                <NumericInput
                  value={configuration.price_range_lower || 0}
                  onChange={(value) => setConfiguration(prev => ({ ...prev, price_range_lower: value }))}
                  min={0}
                  prefix="$"
                  placeholder="Auto-configure"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upper Price Range
                </label>
                <NumericInput
                  value={configuration.price_range_upper || 0}
                  onChange={(value) => setConfiguration(prev => ({ ...prev, price_range_upper: value }))}
                  min={0}
                  prefix="$"
                  placeholder="Auto-configure"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Grids
                </label>
                <NumericInput
                  value={configuration.number_of_grids || 20}
                  onChange={(value) => setConfiguration(prev => ({ ...prev, number_of_grids: value }))}
                  min={5}
                  max={100}
                  allowDecimals={false}
                />
              </div>
            </div>
            
            {/* Advanced Grid Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quantity per Grid
                </label>
                <NumericInput
                  value={configuration.quantity_per_grid || 0}
                  onChange={(value) => setConfiguration(prev => ({ ...prev, quantity_per_grid: value }))}
                  min={0}
                  step={0.001}
                  placeholder="Auto-calculate"
                />
                <p className="text-xs text-gray-500 mt-1">Base currency amount per grid level</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Volume Threshold
                </label>
                <NumericInput
                  value={configuration.volume_threshold || 0}
                  onChange={(value) => setConfiguration(prev => ({ ...prev, volume_threshold: value }))}
                  min={0}
                  allowDecimals={false}
                  placeholder="No minimum"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 24h volume required</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price Movement Threshold
                </label>
                <NumericInput
                  value={configuration.price_movement_threshold || 0}
                  onChange={(value) => setConfiguration(prev => ({ ...prev, price_movement_threshold: value }))}
                  min={0}
                  max={10}
                  step={0.1}
                  suffix="%"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum price change to trigger orders</p>
              </div>
            </div>
            
            {/* Risk Management */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h5 className="font-medium text-red-400 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Risk Management
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Stop Loss %
                  </label>
                  <NumericInput
                    value={configuration.stop_loss_percent || 0}
                    onChange={(value) => setConfiguration(prev => ({ ...prev, stop_loss_percent: value }))}
                    min={0}
                    max={50}
                    step={0.5}
                    suffix="%"
                    placeholder="0 (disabled)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Emergency liquidation trigger</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Trailing Stop Loss %
                  </label>
                  <NumericInput
                    value={configuration.trailing_stop_loss_percent || 0}
                    onChange={(value) => setConfiguration(prev => ({ ...prev, trailing_stop_loss_percent: value }))}
                    min={0}
                    max={20}
                    step={0.1}
                    suffix="%"
                    placeholder="0 (disabled)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Trailing stop from peak price</p>
                </div>
              </div>
            </div>
            
            {/* Take Profit Levels */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-green-400 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Take Profit Levels
                </h5>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const currentLevels = configuration.take_profit_levels || [];
                    setConfiguration(prev => ({
                      ...prev,
                      take_profit_levels: [...currentLevels, { percent: 10, quantity_percent: 50 }]
                    }));
                  }}
                  className="text-green-400 hover:text-green-300"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Level
                </Button>
              </div>
              
              <div className="space-y-3">
                {(configuration.take_profit_levels || []).map((level: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Profit %</label>
                      <NumericInput
                        value={level.percent || 0}
                        onChange={(value) => {
                          const newLevels = [...(configuration.take_profit_levels || [])];
                          newLevels[index] = { ...newLevels[index], percent: value };
                          setConfiguration(prev => ({ ...prev, take_profit_levels: newLevels }));
                        }}
                        min={0.1}
                        max={1000}
                        step={0.5}
                        suffix="%"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Close %</label>
                      <NumericInput
                        value={level.quantity_percent || 0}
                        onChange={(value) => {
                          const newLevels = [...(configuration.take_profit_levels || [])];
                          newLevels[index] = { ...newLevels[index], quantity_percent: value };
                          setConfiguration(prev => ({ ...prev, take_profit_levels: newLevels }));
                        }}
                        min={1}
                        max={100}
                        step={5}
                        suffix="%"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newLevels = (configuration.take_profit_levels || []).filter((_: any, i: number) => i !== index);
                        setConfiguration(prev => ({ ...prev, take_profit_levels: newLevels }));
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                {(!configuration.take_profit_levels || configuration.take_profit_levels.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No take profit levels configured. Add levels to automatically realize profits.
                  </p>
                )}
              </div>
            </div>
            
            {/* Technical Indicators */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <h5 className="font-medium text-purple-400 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Technical Indicators
              </h5>
              
              <div className="space-y-4">
                {/* RSI */}
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={configuration.technical_indicators?.rsi?.enabled || false}
                      onChange={(e) => setConfiguration(prev => ({
                        ...prev,
                        technical_indicators: {
                          ...prev.technical_indicators,
                          rsi: {
                            ...prev.technical_indicators?.rsi,
                            enabled: e.target.checked,
                            period: 14,
                            buy_threshold: 30,
                            sell_threshold: 70
                          }
                        }
                      }))}
                      className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">RSI (Relative Strength Index)</p>
                      <p className="text-xs text-gray-400">Momentum oscillator (0-100)</p>
                    </div>
                  </div>
                  
                  {configuration.technical_indicators?.rsi?.enabled && (
                    <div className="flex gap-2">
                      <div className="w-16">
                        <label className="block text-xs text-gray-400 mb-1">Period</label>
                        <NumericInput
                          value={configuration.technical_indicators?.rsi?.period || 14}
                          onChange={(value) => setConfiguration(prev => ({
                            ...prev,
                            technical_indicators: {
                              ...prev.technical_indicators,
                              rsi: { ...prev.technical_indicators?.rsi, period: value }
                            }
                          }))}
                          min={5}
                          max={50}
                          allowDecimals={false}
                        />
                      </div>
                      <div className="w-16">
                        <label className="block text-xs text-gray-400 mb-1">Buy</label>
                        <NumericInput
                          value={configuration.technical_indicators?.rsi?.buy_threshold || 30}
                          onChange={(value) => setConfiguration(prev => ({
                            ...prev,
                            technical_indicators: {
                              ...prev.technical_indicators,
                              rsi: { ...prev.technical_indicators?.rsi, buy_threshold: value }
                            }
                          }))}
                          min={0}
                          max={50}
                          allowDecimals={false}
                        />
                      </div>
                      <div className="w-16">
                        <label className="block text-xs text-gray-400 mb-1">Sell</label>
                        <NumericInput
                          value={configuration.technical_indicators?.rsi?.sell_threshold || 70}
                          onChange={(value) => setConfiguration(prev => ({
                            ...prev,
                            technical_indicators: {
                              ...prev.technical_indicators,
                              rsi: { ...prev.technical_indicators?.rsi, sell_threshold: value }
                            }
                          }))}
                          min={50}
                          max={100}
                          allowDecimals={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* MACD */}
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={configuration.technical_indicators?.macd?.enabled || false}
                      onChange={(e) => setConfiguration(prev => ({
                        ...prev,
                        technical_indicators: {
                          ...prev.technical_indicators,
                          macd: {
                            ...prev.technical_indicators?.macd,
                            enabled: e.target.checked,
                            period: 12,
                            additional_params: {
                              fast_period: 12,
                              slow_period: 26,
                              signal_period: 9
                            }
                          }
                        }
                      }))}
                      className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">MACD</p>
                      <p className="text-xs text-gray-400">Moving Average Convergence Divergence</p>
                    </div>
                  </div>
                  
                  {configuration.technical_indicators?.macd?.enabled && (
                    <div className="flex gap-2">
                      <div className="w-12">
                        <label className="block text-xs text-gray-400 mb-1">Fast</label>
                        <NumericInput
                          value={configuration.technical_indicators?.macd?.additional_params?.fast_period || 12}
                          onChange={(value) => setConfiguration(prev => ({
                            ...prev,
                            technical_indicators: {
                              ...prev.technical_indicators,
                              macd: {
                                ...prev.technical_indicators?.macd,
                                additional_params: {
                                  ...prev.technical_indicators?.macd?.additional_params,
                                  fast_period: value
                                }
                              }
                            }
                          }))}
                          min={5}
                          max={50}
                          allowDecimals={false}
                        />
                      </div>
                      <div className="w-12">
                        <label className="block text-xs text-gray-400 mb-1">Slow</label>
                        <NumericInput
                          value={configuration.technical_indicators?.macd?.additional_params?.slow_period || 26}
                          onChange={(value) => setConfiguration(prev => ({
                            ...prev,
                            technical_indicators: {
                              ...prev.technical_indicators,
                              macd: {
                                ...prev.technical_indicators?.macd,
                                additional_params: {
                                  ...prev.technical_indicators?.macd?.additional_params,
                                  slow_period: value
                                }
                              }
                            }
                          }))}
                          min={10}
                          max={100}
                          allowDecimals={false}
                        />
                      </div>
                      <div className="w-12">
                        <label className="block text-xs text-gray-400 mb-1">Signal</label>
                        <NumericInput
                          value={configuration.technical_indicators?.macd?.additional_params?.signal_period || 9}
                          onChange={(value) => setConfiguration(prev => ({
                            ...prev,
                            technical_indicators: {
                              ...prev.technical_indicators,
                              macd: {
                                ...prev.technical_indicators?.macd,
                                additional_params: {
                                  ...prev.technical_indicators?.macd?.additional_params,
                                  signal_period: value
                                }
                              }
                            }
                          }))}
                          min={5}
                          max={30}
                          allowDecimals={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Bollinger Bands */}
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={configuration.technical_indicators?.bollinger_bands?.enabled || false}
                      onChange={(e) => setConfiguration(prev => ({
                        ...prev,
                        technical_indicators: {
                          ...prev.technical_indicators,
                          bollinger_bands: {
                            ...prev.technical_indicators?.bollinger_bands,
                            enabled: e.target.checked,
                            period: 20,
                            additional_params: {
                              std_dev: 2.0
                            }
                          }
                        }
                      }))}
                      className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">Bollinger Bands</p>
                      <p className="text-xs text-gray-400">Volatility-based support/resistance</p>
                    </div>
                  </div>
                  
                  {configuration.technical_indicators?.bollinger_bands?.enabled && (
                    <div className="flex gap-2">
                      <div className="w-16">
                        <label className="block text-xs text-gray-400 mb-1">Period</label>
                        <NumericInput
                          value={configuration.technical_indicators?.bollinger_bands?.period || 20}
                          onChange={(value) => setConfiguration(prev => ({
                            ...prev,
                            technical_indicators: {
                              ...prev.technical_indicators,
                              bollinger_bands: {
                                ...prev.technical_indicators?.bollinger_bands,
                                period: value
                              }
                            }
                          }))}
                          min={10}
                          max={50}
                          allowDecimals={false}
                        />
                      </div>
                      <div className="w-16">
                        <label className="block text-xs text-gray-400 mb-1">Std Dev</label>
                        <NumericInput
                          value={configuration.technical_indicators?.bollinger_bands?.additional_params?.std_dev || 2.0}
                          onChange={(value) => setConfiguration(prev => ({
                            ...prev,
                            technical_indicators: {
                              ...prev.technical_indicators,
                              bollinger_bands: {
                                ...prev.technical_indicators?.bollinger_bands,
                                additional_params: {
                                  ...prev.technical_indicators?.bollinger_bands?.additional_params,
                                  std_dev: value
                                }
                              }
                            }
                          }))}
                          min={1.0}
                          max={3.0}
                          step={0.1}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Automation Settings */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h5 className="font-medium text-blue-400 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Automation Settings
              </h5>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Auto Start</p>
                  <p className="text-xs text-gray-400">Automatically activate bot after creation</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configuration.auto_start || false}
                    onChange={(e) => setConfiguration(prev => ({ ...prev, auto_start: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {selectedType === 'dca' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">DCA Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Investment Amount per Interval
                </label>
                <NumericInput
                  value={configuration.investment_amount_per_interval || 0}
                  onChange={(value) => setConfiguration(prev => ({ ...prev, investment_amount_per_interval: value }))}
                  min={10}
                  step={10}
                  prefix="$"
                  placeholder="Amount per DCA interval"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Investment Target Percentage
                </label>
                <NumericInput
                  value={configuration.investment_target_percent || 0}
                  onChange={(value) => setConfiguration(prev => ({ ...prev, investment_target_percent: value }))}
                  min={1}
                  max={100}
                  step={1}
                  suffix="%"
                  placeholder="Target allocation percentage"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Frequency
                </label>
                <select
                  value={configuration.frequency || 'daily'}
                  onChange={(e) => setConfiguration(prev => ({ ...prev, frequency: e.target.value }))}
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

        {selectedType === 'covered_calls' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">Covered Calls Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position Size (shares)
                </label>
                <NumericInput
                  value={configuration.position_size || 100}
                  onChange={(value) => setConfiguration(prev => ({ ...prev, position_size: value }))}
                  min={100}
                  step={100}
                  allowDecimals={false}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strike Delta
                </label>
                <NumericInput
                  value={configuration.strike_delta || 0.30}
                  onChange={(value) => setConfiguration(prev => ({ ...prev, strike_delta: value }))}
                  min={0.1}
                  max={0.5}
                  step={0.05}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Days to Expiration
                </label>
                <NumericInput
                  value={configuration.expiration_days || 30}
                  onChange={(value) => setConfiguration(prev => ({ ...prev, expiration_days: value }))}
                  min={7}
                  max={90}
                  allowDecimals={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReviewStep = () => {
    if (!selectedStrategyType || !selectedAccountData) return null;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Review Strategy</h3>
          <p className="text-gray-400 mb-6">
            Review your strategy configuration before creating
          </p>
        </div>

        {/* Strategy Summary */}
        <Card className="p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-xl font-semibold text-white">{strategyName}</h4>
              <p className="text-gray-300">{selectedStrategyType.description}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Risk Level</p>
                <p className="font-semibold text-white capitalize">{selectedStrategyType.risk_level}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">Min Capital</p>
                <p className="font-semibold text-white">{formatCurrency(selectedStrategyType.min_capital)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Account</p>
                <p className="font-semibold text-white">{selectedAccountData.account_name}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Configuration Details */}
        <Card className="p-6">
          <h4 className="font-semibold text-white mb-4">Configuration Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {Object.entries(configuration).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
                <span className="text-white font-medium">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Risk Disclaimer */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-400 mb-2">Risk Disclaimer</h4>
              <p className="text-sm text-yellow-300">
                All trading involves risk of loss. This strategy has been classified as{' '}
                <span className="font-semibold capitalize">{selectedStrategyType.risk_level}</span> risk. 
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
              <p className="text-gray-400">Build a new automated trading strategy</p>
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
          <div className="min-h-[400px]">
            {step === 'category' && renderCategoryStep()}
            {step === 'strategy' && renderStrategyStep()}
            {step === 'configure' && renderConfigureStep()}
            {step === 'review' && renderReviewStep()}
          </div>

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
                disabled={
                  (step === 'category' && !selectedCategory) ||
                  (step === 'strategy' && !selectedType) ||
                  (step === 'configure' && (!strategyName || !selectedAccount))
                }
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleCreate}
                disabled={!strategyName || !selectedAccount}
              >
                Create Strategy
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}