import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, Shield, DollarSign, Target, Settings, AlertTriangle, Info, Grid3X3, Bot, Plus, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumericInput } from '../ui/NumericInput';
import { SymbolSearchInput } from '../ui/SymbolSearchInput';
import { TradingStrategy } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

const strategyTypes = [
  {
    id: 'covered_calls',
    name: 'Covered Calls',
    description: 'Generate income by selling call options on owned stocks',
    risk: 'low' as const,
    minCapital: 15000,
    tier: 'pro' as const,
    category: 'options' as const,
  },
  {
    id: 'wheel',
    name: 'The Wheel',
    description: 'Systematic approach combining cash-secured puts and covered calls',
    risk: 'low' as const,
    minCapital: 20000,
    tier: 'pro' as const,
    category: 'options' as const,
  },
  {
    id: 'short_put',
    name: 'Cash-Secured Put',
    description: 'Sell put options with cash backing for potential stock acquisition',
    risk: 'medium' as const,
    minCapital: 10000,
    tier: 'pro' as const,
    category: 'options' as const,
  },
  {
    id: 'spot_grid',
    name: 'Spot Grid Bot',
    description: 'Automate buy-low/sell-high trades within a defined price range',
    risk: 'low' as const,
    minCapital: 1000,
    tier: 'pro' as const,
    category: 'grid' as const,
  },
  {
    id: 'futures_grid',
    name: 'Futures Grid Bot',
    description: 'Grid trading on futures market with leverage support',
    risk: 'medium' as const,
    minCapital: 2000,
    tier: 'elite' as const,
    category: 'grid' as const,
  },
  {
    id: 'infinity_grid',
    name: 'Infinity Grid Bot',
    description: 'Grid trading without upper price limit for trending markets',
    risk: 'medium' as const,
    minCapital: 1500,
    tier: 'elite' as const,
    category: 'grid' as const,
  },
  {
    id: 'dca',
    name: 'DCA Bot',
    description: 'Dollar-cost averaging for systematic investment',
    risk: 'low' as const,
    minCapital: 500,
    tier: 'starter' as const,
    category: 'autonomous' as const,
  },
  {
    id: 'smart_rebalance',
    name: 'Smart Rebalance',
    description: 'Maintain target allocations through automatic rebalancing',
    risk: 'low' as const,
    minCapital: 5000,
    tier: 'starter' as const,
    category: 'autonomous' as const,
  },
];

const strategyCategories = {
  grid: {
    name: 'Grid Bots',
    icon: Grid3X3,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    description: 'Automated buy-low/sell-high trading within defined price ranges',
  },
  autonomous: {
    name: 'Autonomous Bots',
    icon: Bot,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    description: 'Set-and-forget strategies for systematic investing',
  },
  options: {
    name: 'Options Strategies',
    icon: Target,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    description: 'Income generation using options contracts',
  },
};

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const { brokerageAccounts, getEffectiveSubscriptionTier, user } = useStore();
  const [selectedType, setSelectedType] = useState<string>('');
  const [step, setStep] = useState<'type' | 'config' | 'review'>('type');
  const [isAIConfiguring, setIsAIConfiguring] = useState(false);
  
  // Smart Rebalance specific state
  const [allocationMethod, setAllocationMethod] = useState<'even' | 'market_cap' | 'majority_cash_market_cap' | 'majority_cash_even'>('even');
  const [assets, setAssets] = useState<Array<{ symbol: string; allocation: number }>>([]);
  const [usdCashAllocation, setUsdCashAllocation] = useState(20);
  
  const [strategy, setStrategy] = useState<Partial<TradingStrategy>>({
    configuration: {},
    account_id: '',
    quantity_per_grid: 0,
  });

  const selectedStrategyType = strategyTypes.find(type => type.id === selectedType);
  const userTier = getEffectiveSubscriptionTier();
  
  const tierOrder = { starter: 0, pro: 1, elite: 2 };
  const hasAccess = selectedStrategyType ? tierOrder[userTier] >= tierOrder[selectedStrategyType.tier] : true;

  const getDefaultConfiguration = (type: string) => {
    switch (type) {
      case 'covered_calls':
        return {
          symbol: '',
          strike_delta: 0.30,
          dte_target: 30,
          profit_target: 0.5,
          position_size: 100,
        };
      case 'wheel':
        return {
          symbol: '',
          put_strike_delta: -0.30,
          call_strike_delta: 0.30,
          dte_target: 30,
          position_size: 100,
        };
      case 'short_put':
        return {
          symbol: '',
          strike_delta: -0.30,
          dte_target: 30,
          profit_target: 0.5,
          position_size: 100,
        };
      case 'spot_grid':
        return {
          symbol: '',
          allocated_capital: 1000,
          price_range_lower: 0,
          price_range_upper: 0,
          number_of_grids: 20,
          grid_spacing_percent: 1.0,
        };
      case 'futures_grid':
        return {
          symbol: '',
          allocated_capital: 2000,
          price_range_lower: 0,
          price_range_upper: 0,
          number_of_grids: 25,
          leverage: 3,
        };
      case 'infinity_grid':
        return {
          symbol: '',
          allocated_capital: 1500,
          price_range_lower: 0,
          number_of_grids: 30,
        };
      case 'dca':
        return {
          symbol: '',
          investment_amount_per_interval: 100,
          frequency: 'daily',
          investment_target_percent: 20,
        };
      case 'smart_rebalance':
        return {
          assets: [],
          trigger_type: 'threshold',
          threshold_deviation_percent: 5,
          rebalance_frequency: 'weekly',
        };
      default:
        return {};
    }
  };

  const applyAllocationMethod = (method: string, currentAssets: Array<{ symbol: string; allocation: number }>) => {
    if (method === 'even') {
      // Even split: divide remaining percentage evenly among assets
      const remainingPercent = 100 - usdCashAllocation;
      const evenAllocation = currentAssets.length > 0 ? remainingPercent / currentAssets.length : 0;
      
      const updatedAssets = currentAssets.map((asset, index) => ({
        ...asset,
        allocation: index === currentAssets.length - 1 
          ? remainingPercent - (evenAllocation * (currentAssets.length - 1)) // Give remainder to last asset
          : evenAllocation
      }));
      
      setAssets(updatedAssets);
    } else if (method === 'market_cap') {
      // Market cap weighted (mock implementation)
      const marketCapWeights = {
        'AAPL': 30, 'MSFT': 25, 'GOOGL': 20, 'AMZN': 15, 'TSLA': 10,
        'BTC': 40, 'ETH': 30, 'BNB': 15, 'ADA': 10, 'SOL': 5
      };
      
      const totalWeight = currentAssets.reduce((sum, asset) => {
        return sum + (marketCapWeights[asset.symbol as keyof typeof marketCapWeights] || 5);
      }, 0);
      
      const remainingPercent = 100 - usdCashAllocation;
      
      const updatedAssets = currentAssets.map(asset => ({
        ...asset,
        allocation: totalWeight > 0 
          ? (marketCapWeights[asset.symbol as keyof typeof marketCapWeights] || 5) / totalWeight * remainingPercent
          : 0
      }));
      
      setAssets(updatedAssets);
    } else if (method === 'majority_cash_market_cap') {
      // 60% cash, 40% market cap weighted
      setUsdCashAllocation(60);
      
      const marketCapWeights = {
        'AAPL': 30, 'MSFT': 25, 'GOOGL': 20, 'AMZN': 15, 'TSLA': 10,
        'BTC': 40, 'ETH': 30, 'BNB': 15, 'ADA': 10, 'SOL': 5
      };
      
      const totalWeight = currentAssets.reduce((sum, asset) => {
        return sum + (marketCapWeights[asset.symbol as keyof typeof marketCapWeights] || 5);
      }, 0);
      
      const updatedAssets = currentAssets.map(asset => ({
        ...asset,
        allocation: totalWeight > 0 
          ? (marketCapWeights[asset.symbol as keyof typeof marketCapWeights] || 5) / totalWeight * 40
          : 0
      }));
      
      setAssets(updatedAssets);
    } else if (method === 'majority_cash_even') {
      // 60% cash, 40% even split
      setUsdCashAllocation(60);
      
      const evenAllocation = currentAssets.length > 0 ? 40 / currentAssets.length : 0;
      
      const updatedAssets = currentAssets.map((asset, index) => ({
        ...asset,
        allocation: index === currentAssets.length - 1 
          ? 40 - (evenAllocation * (currentAssets.length - 1)) // Give remainder to last asset
          : evenAllocation
      }));
      
      setAssets(updatedAssets);
    }
  };

  const handleTypeSelect = (typeId: string) => {
    const strategyType = strategyTypes.find(type => type.id === typeId);
    if (!strategyType) return;

    setSelectedType(typeId);
    setStrategy(prev => ({
      ...prev,
      type: strategyType.id,
      name: strategyType.name,
      description: strategyType.description,
      risk_level: strategyType.risk,
      min_capital: strategyType.minCapital,
      configuration: getDefaultConfiguration(strategyType.id)
    }));

    // Initialize Smart Rebalance with empty assets
    if (typeId === 'smart_rebalance') {
      setAssets([]);
      setUsdCashAllocation(20);
      setAllocationMethod('even');
    }

    setStep('config');
  };

  const handleAddAsset = () => {
    const newAssets = [...assets, { symbol: '', allocation: 0 }];
    setAssets(newAssets);
    applyAllocationMethod(allocationMethod, newAssets);
  };

  const handleRemoveAsset = (index: number) => {
    const newAssets = assets.filter((_, i) => i !== index);
    setAssets(newAssets);
    applyAllocationMethod(allocationMethod, newAssets);
  };

  const handleAssetSymbolChange = (index: number, symbol: string) => {
    const updatedAssets = [...assets];
    updatedAssets[index] = { ...updatedAssets[index], symbol };
    setAssets(updatedAssets);
    applyAllocationMethod(allocationMethod, updatedAssets);
  };

  const handleAssetAllocationChange = (index: number, allocation: number) => {
    if (allocationMethod !== 'even') return; // Only allow manual changes in even split mode
    
    const updatedAssets = [...assets];
    updatedAssets[index] = { ...updatedAssets[index], allocation };
    setAssets(updatedAssets);
  };

  const handleAllocationMethodChange = (method: 'even' | 'market_cap' | 'majority_cash_market_cap' | 'majority_cash_even') => {
    setAllocationMethod(method);
    
    // Reset USD cash allocation based on method
    if (method === 'majority_cash_market_cap' || method === 'majority_cash_even') {
      setUsdCashAllocation(60);
    } else {
      setUsdCashAllocation(20);
    }
    
    applyAllocationMethod(method, assets);
  };

  const handleAIConfigure = async () => {
    if (!strategy.configuration?.symbol || !user) {
      alert('Please select a symbol first');
      return;
    }

    setIsAIConfiguring(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No valid session found. Please log in again.');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/market-data/ai-configure-grid-range`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          symbol: strategy.configuration.symbol,
          allocated_capital: strategy.configuration?.allocated_capital || 1000,
          number_of_grids: strategy.configuration?.number_of_grids || 20,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get AI configuration: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      setStrategy(prev => ({
        ...prev,
        configuration: {
          ...prev.configuration,
          price_range_lower: data.lower_limit,
          price_range_upper: data.upper_limit,
        }
      }));
      
      if (data.reasoning) {
        alert(`✅ AI Configuration Complete!\n\n${data.reasoning}`);
      }
      
    } catch (error) {
      console.error('Error in AI configuration:', error);
      alert(`Failed to configure grid range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAIConfiguring(false);
    }
  };

  const handleCreateStrategy = () => {
    if (!strategy.name || !strategy.type) return;

    // For Smart Rebalance, include assets in configuration
    let finalConfiguration = { ...strategy.configuration };
    if (selectedType === 'smart_rebalance') {
      finalConfiguration = {
        ...finalConfiguration,
        assets: assets,
        usd_cash_allocation: usdCashAllocation,
        allocation_method: allocationMethod,
      };
    }

    const newStrategy: Omit<TradingStrategy, 'id'> = {
      name: strategy.name,
      type: strategy.type as TradingStrategy['type'],
      description: strategy.description || '',
      risk_level: strategy.risk_level || 'medium',
      min_capital: strategy.min_capital || 10000,
      is_active: true,
      configuration: finalConfiguration,
      account_id: strategy.account_id,
      quantity_per_grid: strategy.quantity_per_grid,
      grid_mode: strategy.grid_mode || 'arithmetic',
    };

    onSave(newStrategy);
  };

  React.useEffect(() => {
    if (selectedType === 'spot_grid' && strategy.configuration) {
      const { allocated_capital, number_of_grids, price_range_lower, price_range_upper } = strategy.configuration;
      
      if (allocated_capital && number_of_grids && price_range_lower && price_range_upper && 
          price_range_lower > 0 && price_range_upper > price_range_lower) {
        
        const averagePrice = (price_range_lower + price_range_upper) / 2;
        const quantityPerGrid = (allocated_capital / number_of_grids) / averagePrice;
        
        setStrategy(prev => ({
          ...prev,
          quantity_per_grid: Math.round(quantityPerGrid * 1000000) / 1000000,
        }));
      }
    }
  }, [
    selectedType,
    strategy.configuration?.allocated_capital,
    strategy.configuration?.number_of_grids,
    strategy.configuration?.price_range_lower,
    strategy.configuration?.price_range_upper,
  ]);

  const renderTypeSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Choose Strategy Type</h3>
        <p className="text-gray-400 mb-6">Select the trading strategy that best fits your goals and risk tolerance</p>
      </div>

      <div className="space-y-6">
        {Object.entries(strategyCategories).map(([categoryKey, categoryData]) => {
          const Icon = categoryData.icon;
          const categoryStrategies = strategyTypes.filter(type => type.category === categoryKey);
          
          if (categoryStrategies.length === 0) return null;
          
          return (
            <div key={categoryKey} className="space-y-4">
              <Card className={`p-6 ${categoryData.bgColor} ${categoryData.borderColor} border`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${categoryData.bgColor} rounded-xl flex items-center justify-center border ${categoryData.borderColor}`}>
                    <Icon className={`w-6 h-6 ${categoryData.color}`} />
                  </div>
                  <div>
                    <h4 className={`text-xl font-bold ${categoryData.color}`}>{categoryData.name}</h4>
                    <p className="text-gray-300 text-sm">{categoryData.description}</p>
                  </div>
                </div>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryStrategies.map((type) => {
                  const tierAccess = tierOrder[userTier] >= tierOrder[type.tier];
                  
                  return (
                    <motion.div
                      key={type.id}
                      whileHover={tierAccess ? { scale: 1.02 } : {}}
                      whileTap={tierAccess ? { scale: 0.98 } : {}}
                      onClick={tierAccess ? () => handleTypeSelect(type.id) : undefined}
                      className={`p-6 rounded-lg border transition-all relative ${
                        tierAccess
                          ? 'bg-gray-800/30 border-gray-700 cursor-pointer hover:border-blue-500'
                          : 'bg-gray-800/10 border-gray-800 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {!tierAccess && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
                          {type.tier === 'pro' ? 'Pro' : 'Elite'} Required
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-white mb-2">{type.name}</h4>
                          <p className="text-sm text-gray-400 mb-3">{type.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${
                          type.risk === 'low' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                          type.risk === 'medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                          'text-red-400 bg-red-400/10 border-red-400/20'
                        }`}>
                          {type.risk} risk
                        </span>
                        <div className="text-sm text-gray-400">
                          Min: {formatCurrency(type.minCapital)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderConfiguration = () => {
    if (!selectedStrategyType) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <TrendingUp className="w-8 h-8 text-blue-400" />
          <div>
            <h3 className="font-semibold text-white">{selectedStrategyType.name}</h3>
            <p className="text-sm text-gray-400">{selectedStrategyType.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Strategy Name
            </label>
            <input
              type="text"
              value={strategy.name || ''}
              onChange={(e) => setStrategy(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter strategy name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Brokerage Account
            </label>
            <select
              value={strategy.account_id || ''}
              onChange={(e) => setStrategy(prev => ({ ...prev, account_id: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select an account</option>
              {brokerageAccounts
                .filter(account => account.is_connected)
                .map(account => (
                <option key={account.id} value={account.id}>
                  {account.account_name} ({account.brokerage.toUpperCase()}) - {formatCurrency(account.balance)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Minimum Capital
            </label>
            <NumericInput
              value={strategy.min_capital || 0}
              onChange={(value) => setStrategy(prev => ({ ...prev, min_capital: value }))}
              min={1000}
              step={1000}
              prefix="$"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Allocated Capital
            </label>
            <NumericInput
              value={strategy.configuration?.allocated_capital || 1000}
              onChange={(value) => setStrategy(prev => ({
                ...prev,
                configuration: { ...prev.configuration, allocated_capital: value }
              }))}
              min={100}
              step={100}
              prefix="$"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={strategy.description || ''}
            onChange={(e) => setStrategy(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Describe your strategy..."
          />
        </div>

        {/* Strategy-specific configuration */}
        {selectedType === 'smart_rebalance' && (
          <div className="space-y-6">
            <h4 className="font-medium text-white">Smart Rebalance Configuration</h4>
            
            {/* Allocation Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Allocation Method</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleAllocationMethodChange('even')}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    allocationMethod === 'even'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }`}
                >
                  <h5 className="font-medium text-white mb-1">Even Split</h5>
                  <p className="text-xs text-gray-400">Manual control over all allocations</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleAllocationMethodChange('market_cap')}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    allocationMethod === 'market_cap'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }`}
                >
                  <h5 className="font-medium text-white mb-1">Market Cap Weighted</h5>
                  <p className="text-xs text-gray-400">Automatic allocation by market cap</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleAllocationMethodChange('majority_cash_market_cap')}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    allocationMethod === 'majority_cash_market_cap'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }`}
                >
                  <h5 className="font-medium text-white mb-1">Majority Cash + Market Cap</h5>
                  <p className="text-xs text-gray-400">60% cash, 40% market cap weighted</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleAllocationMethodChange('majority_cash_even')}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    allocationMethod === 'majority_cash_even'
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }`}
                >
                  <h5 className="font-medium text-white mb-1">Majority Cash + Even Split</h5>
                  <p className="text-xs text-gray-400">60% cash, 40% evenly split</p>
                </motion.div>
              </div>
            </div>

            {/* USD Cash Allocation */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h5 className="font-medium text-white">USD Cash Balance</h5>
                    <p className="text-xs text-gray-400">Account cash allocation</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {allocationMethod === 'even' ? (
                    <NumericInput
                      value={usdCashAllocation}
                      onChange={setUsdCashAllocation}
                      min={0}
                      max={100}
                      step={1}
                      suffix="%"
                      className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    />
                  ) : (
                    <span className="text-green-400 font-bold text-lg">{usdCashAllocation}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Asset List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">Portfolio Assets</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAsset}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Asset
                </Button>
              </div>
              
              {assets.length === 0 ? (
                <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700">
                  <Target className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 mb-3">No assets added yet</p>
                  <Button onClick={handleAddAsset} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Asset
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {assets.map((asset, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                      <div className="flex-1">
                        <SymbolSearchInput
                          value={asset.symbol}
                          onChange={(value) => handleAssetSymbolChange(index, value)}
                          placeholder="Search symbol (e.g., BTC, AAPL)"
                          className="w-full"
                        />
                      </div>
                      
                      <div className="w-24">
                        <NumericInput
                          value={asset.allocation}
                          onChange={(value) => handleAssetAllocationChange(index, value)}
                          min={0}
                          max={100}
                          step={0.1}
                          suffix="%"
                          disabled={allocationMethod !== 'even'}
                          className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        />
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAsset(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2"
                        disabled={assets.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Allocation Summary */}
              {assets.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-400">Total Allocation</span>
                    <span className={`text-sm font-bold ${
                      (usdCashAllocation + assets.reduce((sum, asset) => sum + (asset.allocation || 0), 0)) === 100
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }`}>
                      {(usdCashAllocation + assets.reduce((sum, asset) => sum + (asset.allocation || 0), 0)).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    USD Cash: {usdCashAllocation}% + Assets: {assets.reduce((sum, asset) => sum + (asset.allocation || 0), 0).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>

            {/* Rebalancing Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rebalance Frequency</label>
                <select
                  value={strategy.configuration?.rebalance_frequency || 'weekly'}
                  onChange={(e) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, rebalance_frequency: e.target.value }
                  }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Deviation Threshold</label>
                <NumericInput
                  value={strategy.configuration?.threshold_deviation_percent || 5}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, threshold_deviation_percent: value }
                  }))}
                  min={1}
                  max={20}
                  step={1}
                  suffix="%"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Trigger rebalancing when allocation drifts by this amount
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Other strategy configurations remain the same */}
        {selectedType === 'spot_grid' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">Grid Bot Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                <SymbolSearchInput
                  value={strategy.configuration?.symbol || ''}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, symbol: value }
                  }))}
                  placeholder="Search for a symbol (e.g., BTC, ETH, AAPL)"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Number of Grids</label>
                <NumericInput
                  value={strategy.configuration?.number_of_grids || 20}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, number_of_grids: value }
                  }))}
                  min={5}
                  max={100}
                  step={5}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Grid Mode</label>
                <select
                  value={strategy.grid_mode || 'arithmetic'}
                  onChange={(e) => setStrategy(prev => ({ 
                    ...prev, 
                    grid_mode: e.target.value as 'arithmetic' | 'geometric' 
                  }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="arithmetic">Arithmetic</option>
                  <option value="geometric">Geometric</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-lg">
                <div>
                  <h5 className="font-medium text-purple-400 mb-1">AI Grid Configuration</h5>
                  <p className="text-sm text-purple-300">
                    Let AI analyze market data to set optimal grid range using technical indicators, volatility, and mean reversion
                  </p>
                </div>
                <Button
                  onClick={handleAIConfigure}
                  disabled={!strategy.configuration?.symbol || isAIConfiguring}
                  isLoading={isAIConfiguring}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isAIConfiguring ? 'AI Configuring...' : 'AI Configure'}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Lower Price Limit</label>
                  <div className="relative">
                    <NumericInput
                      value={strategy.configuration?.price_range_lower || 0}
                      onChange={(value) => setStrategy(prev => ({
                        ...prev,
                        configuration: { ...prev.configuration, price_range_lower: value }
                      }))}
                      min={0.01}
                      step={strategy.configuration?.symbol?.includes('BTC') ? 1000 : 1}
                      allowDecimals={true}
                      prefix="$"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      disabled={isAIConfiguring}
                    />
                    {isAIConfiguring && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    AI-optimized lower bound, manually configurable
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Upper Price Limit</label>
                  <div className="relative">
                    <NumericInput
                      value={strategy.configuration?.price_range_upper || 0}
                      onChange={(value) => setStrategy(prev => ({
                        ...prev,
                        configuration: { ...prev.configuration, price_range_upper: value }
                      }))}
                      min={0.01}
                      step={strategy.configuration?.symbol?.includes('BTC') ? 1000 : 1}
                      allowDecimals={true}
                      prefix="$"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      disabled={isAIConfiguring}
                    />
                    {isAIConfiguring && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    AI-optimized upper bound, manually configurable
                  </p>
                </div>
              </div>
            </div>
            
            {strategy.quantity_per_grid && strategy.quantity_per_grid > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-blue-400" />
                  <h5 className="font-medium text-blue-400">Auto-Calculated Grid Settings</h5>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Quantity per Grid:</span>
                    <span className="text-white ml-2 font-medium">
                      {strategy.quantity_per_grid.toFixed(6)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Grid Spacing:</span>
                    <span className="text-white ml-2 font-medium">
                      ${((strategy.configuration?.price_range_upper - strategy.configuration?.price_range_lower) / (strategy.configuration?.number_of_grids - 1)).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Capital per Grid:</span>
                    <span className="text-white ml-2 font-medium">
                      {formatCurrency((strategy.configuration?.allocated_capital || 0) / (strategy.configuration?.number_of_grids || 1))}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Price Range:</span>
                    <span className="text-white ml-2 font-medium">
                      {((strategy.configuration?.price_range_upper - strategy.configuration?.price_range_lower) / strategy.configuration?.price_range_lower * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {selectedType === 'spot_grid' && !strategy.configuration?.symbol && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-medium">Symbol Required</span>
                </div>
                <p className="text-sm text-yellow-300 mt-1">
                  Please select a symbol to enable AI configuration of optimal grid range.
                </p>
              </div>
            )}
            
            {strategy.configuration?.price_range_lower && strategy.configuration?.price_range_upper && 
             strategy.configuration.price_range_lower >= strategy.configuration.price_range_upper && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-medium">Invalid Price Range</span>
                </div>
                <p className="text-sm text-red-300 mt-1">
                  Upper price limit must be greater than lower price limit.
                </p>
              </div>
            )}
          </div>
        )}

        {(selectedType === 'futures_grid' || selectedType === 'infinity_grid') && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">
              {selectedType === 'futures_grid' ? 'Futures Grid Bot Configuration' : 'Infinity Grid Bot Configuration'}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                <SymbolSearchInput
                  value={strategy.configuration?.symbol || 'BTC/USD'}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, symbol: value }
                  }))}
                  placeholder="e.g., BTC/USD, ETH/USD"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Number of Grids</label>
                <NumericInput
                  value={strategy.configuration?.number_of_grids || (selectedType === 'futures_grid' ? 25 : 30)}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, number_of_grids: value }
                  }))}
                  min={5}
                  max={100}
                  step={5}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              
              {selectedType === 'futures_grid' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Leverage</label>
                  <NumericInput
                    value={strategy.configuration?.leverage || 3}
                    onChange={(value) => setStrategy(prev => ({
                      ...prev,
                      configuration: { ...prev.configuration, leverage: value }
                    }))}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {selectedType === 'dca' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">DCA Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                <SymbolSearchInput
                  value={strategy.configuration?.symbol || 'BTC'}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, symbol: value }
                  }))}
                  placeholder="Search for a symbol (e.g., BTC, ETH, AAPL)"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Investment Amount</label>
                <NumericInput
                  value={strategy.configuration?.investment_amount_per_interval || 100}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, investment_amount_per_interval: value }
                  }))}
                  min={10}
                  step={10}
                  prefix="$"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        )}

        {selectedType === 'covered_calls' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">Covered Calls Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                <SymbolSearchInput
                  value={strategy.configuration?.symbol || 'AAPL'}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, symbol: value }
                  }))}
                  placeholder="Search for a stock symbol (e.g., AAPL, MSFT)"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Strike Delta</label>
                <NumericInput
                  value={strategy.configuration?.strike_delta || 0.30}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, strike_delta: value }
                  }))}
                  min={0.1}
                  max={0.5}
                  step={0.05}
                  allowDecimals={true}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        )}

        {selectedType === 'wheel' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">Wheel Strategy Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                <SymbolSearchInput
                  value={strategy.configuration?.symbol || 'AAPL'}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, symbol: value }
                  }))}
                  placeholder="Search for a stock symbol (e.g., AAPL, MSFT)"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Position Size</label>
                <NumericInput
                  value={strategy.configuration?.position_size || 100}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, position_size: value }
                  }))}
                  min={100}
                  step={100}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        )}

        {selectedType === 'short_put' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">Cash-Secured Put Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                <SymbolSearchInput
                  value={strategy.configuration?.symbol || 'AAPL'}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, symbol: value }
                  }))}
                  placeholder="Search for a stock symbol (e.g., AAPL, MSFT)"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Strike Delta</label>
                <NumericInput
                  value={strategy.configuration?.strike_delta || -0.30}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, strike_delta: value }
                  }))}
                  min={-0.5}
                  max={-0.1}
                  step={0.05}
                  allowDecimals={true}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReview = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white mb-4">Review Strategy</h3>
      
      <div className="bg-gray-800/30 rounded-lg p-6">
        <h4 className="font-medium text-white mb-4">Strategy Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Name:</span>
            <span className="text-white ml-2">{strategy.name}</span>
          </div>
          <div>
            <span className="text-gray-400">Type:</span>
            <span className="text-white ml-2">{selectedStrategyType?.name}</span>
          </div>
          <div>
            <span className="text-gray-400">Risk Level:</span>
            <span className="text-white ml-2 capitalize">{strategy.risk_level}</span>
          </div>
          <div>
            <span className="text-gray-400">Min Capital:</span>
            <span className="text-white ml-2">{formatCurrency(strategy.min_capital || 0)}</span>
          </div>
        </div>
      </div>

      {selectedType === 'smart_rebalance' && (
        <div className="bg-gray-800/30 rounded-lg p-6">
          <h4 className="font-medium text-white mb-4">Portfolio Allocation</h4>
          <div className="space-y-3">
            {/* USD Cash */}
            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-white font-medium">USD Cash</span>
              </div>
              <span className="text-green-400 font-bold">{usdCashAllocation}%</span>
            </div>
            
            {/* Assets */}
            {assets.map((asset, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <span className="text-white font-medium">{asset.symbol || 'Unnamed Asset'}</span>
                <span className="text-blue-400 font-bold">{asset.allocation.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Allocation Method:</span>
              <span className="text-white capitalize">{allocationMethod.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

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

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              {['type', 'config', 'review'].map((stepName, index) => (
                <div key={stepName} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step === stepName 
                      ? 'bg-blue-600 text-white' 
                      : index < ['type', 'config', 'review'].indexOf(step)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  {index < 2 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      index < ['type', 'config', 'review'].indexOf(step)
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
            {step === 'type' && renderTypeSelection()}
            {step === 'config' && renderConfiguration()}
            {step === 'review' && renderReview()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            {step !== 'type' && (
              <Button variant="secondary" onClick={() => {
                if (step === 'review') setStep('config');
                else if (step === 'config') setStep('type');
              }}>
                Back
              </Button>
            )}
            
            <div className="flex-1" />
            
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            
            {step === 'type' && selectedType && (
              <Button onClick={() => setStep('config')}>
                Continue
              </Button>
            )}
            
            {step === 'config' && (
              <Button onClick={() => setStep('review')}>
                Review
              </Button>
            )}
            
            {step === 'review' && (
              <Button onClick={handleCreateStrategy}>
                Create Strategy
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}