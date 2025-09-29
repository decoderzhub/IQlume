import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, Shield, DollarSign, Target, Settings, AlertTriangle, Info, Grid3X3, Bot, Plus, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumericInput } from '../ui/NumericInput';
import { SymbolSearchInput } from '../ui/SymbolSearchInput';
import { OptionsBellCurve } from './OptionsBellCurve';
import { TradingStrategy, BrokerageAccount } from '../../types';
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
  const [strategy, setStrategy] = useState<Partial<TradingStrategy>>({
    name: '',
    description: '',
    risk_level: 'medium',
    min_capital: 10000,
    is_active: true,
    configuration: {},
    account_id: '',
    quantity_per_grid: 0,
  });

  const selectedStrategyType = strategyTypes.find(type => type.id === selectedType);
  const userTier = getEffectiveSubscriptionTier();
  
  const tierOrder = { starter: 0, pro: 1, elite: 2 };
  const hasAccess = selectedStrategyType ? tierOrder[userTier] >= tierOrder[selectedStrategyType.tier] : true;

  const handleTypeSelect = (typeId: string) => {
    const strategyType = strategyTypes.find(type => type.id === typeId);
    if (!strategyType) return;

    setSelectedType(typeId);
    setStrategy(prev => ({
      ...prev,
      type: typeId as TradingStrategy['type'],
      name: strategyType.name,
      description: strategyType.description,
      risk_level: strategyType.risk,
      min_capital: strategyType.minCapital,
      configuration: getDefaultConfiguration(typeId),
    }));
    setStep('config');
  };

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
          assets: [
            { symbol: 'BTC', allocation: 40 },
            { symbol: 'ETH', allocation: 30 },
            { symbol: 'USDT', allocation: 30 },
          ],
          trigger_type: 'threshold',
          threshold_deviation_percent: 5,
          rebalance_frequency: 'weekly',
        };
      default:
        return {};
    }
  };

  const handleAIConfigure = async () => {
    if (!strategy.configuration?.symbol || !user) {
      alert('Please select a symbol first');
      return;
    }

    setIsAIConfiguring(true);
    
    try {
      console.log('Checking supabase object:', supabase);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      console.log(`🤖 AI configuring grid range for ${strategy.configuration.symbol}...`);
      
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
      console.log('✅ AI configuration received:', data);
      
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

    const confirmMessage = `Create and immediately execute "${strategy.name}"?\n\n` +
      `This strategy will:\n` +
      `• Be saved to your database\n` +
      `• Execute immediately if market is open\n` +
      `• Place its first trade automatically\n` +
      `• Continue running autonomously\n\n` +
      `Symbol: ${strategy.configuration?.symbol || 'N/A'}\n` +
      `Capital: ${formatCurrency(strategy.configuration?.allocated_capital || 0)}\n` +
      `Risk Level: ${strategy.risk_level}`;

    if (!confirm(confirmMessage)) {
      return;
    }

    if (selectedType === 'spot_grid') {
      if (!strategy.account_id) {
        alert('Please select a brokerage account for this strategy.');
        return;
      }
      if (!strategy.configuration?.price_range_lower || !strategy.configuration?.price_range_upper) {
        alert('Please set both lower and upper price limits for the grid.');
        return;
      }
      if (strategy.configuration.price_range_lower >= strategy.configuration.price_range_upper) {
        alert('Upper price limit must be greater than lower price limit.');
        return;
      }
    }

    const newStrategy: Omit<TradingStrategy, 'id'> = {
      name: strategy.name,
      type: strategy.type as TradingStrategy['type'],
      description: strategy.description || '',
      risk_level: strategy.risk_level || 'medium',
      min_capital: strategy.min_capital || 10000,
      is_active: true,
      configuration: strategy.configuration || {},
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
              value={strategy.name}
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
            {brokerageAccounts.filter(account => account.is_connected).length === 0 && (
              <p className="text-xs text-yellow-400 mt-1">
                No connected accounts. Please connect a brokerage account first.
              </p>
            )}
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
            value={strategy.description}
            onChange={(e) => setStrategy(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Describe your strategy..."
          />
        </div>

        {/* Strategy-specific configuration */}
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

        {selectedType === 'smart_rebalance' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">Smart Rebalance Configuration</h4>
            
            {/* Asset Allocation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">Asset Allocation</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentAssets = strategy.configuration?.assets || [];
                    setStrategy(prev => ({
                      ...prev,
                      configuration: {
                        ...prev.configuration,
                        assets: [...currentAssets, { symbol: '', allocation: 0 }]
                      }
                    }));
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Asset
                </Button>
              </div>
              
              <div className="space-y-3">
                {(strategy.configuration?.assets || []).map((asset: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                    <div className="flex-1">
                      <SymbolSearchInput
                        value={asset.symbol}
                        onChange={(value) => {
                          const updatedAssets = [...(strategy.configuration?.assets || [])];
                          updatedAssets[index] = { ...updatedAssets[index], symbol: value };
                          setStrategy(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, assets: updatedAssets }
                          }));
                        }}
                        placeholder="Search symbol (e.g., BTC, AAPL)"
                        className="w-full"
                      />
                    </div>
                    
                    <div className="w-24">
                      <NumericInput
                        value={asset.allocation}
                        onChange={(value) => {
                          const updatedAssets = [...(strategy.configuration?.assets || [])];
                          updatedAssets[index] = { ...updatedAssets[index], allocation: value };
                          setStrategy(prev => ({
                            ...prev,
                            configuration: { ...prev.configuration, assets: updatedAssets }
                          }));
                        }}
                        min={0}
                        max={100}
                        step={1}
                        suffix="%"
                        className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      />
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updatedAssets = (strategy.configuration?.assets || []).filter((_: any, i: number) => i !== index);
                        setStrategy(prev => ({
                          ...prev,
                          configuration: { ...prev.configuration, assets: updatedAssets }
                        }));
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2"
                      disabled={(strategy.configuration?.assets || []).length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* Allocation Summary */}
              {(strategy.configuration?.assets || []).length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-400">Total Allocation</span>
                    <span className={`text-sm font-bold ${
                      (strategy.configuration?.assets || []).reduce((sum: number, asset: any) => sum + (asset.allocation || 0), 0) === 100
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }`}>
                      {(strategy.configuration?.assets || []).reduce((sum: number, asset: any) => sum + (asset.allocation || 0), 0)}%
                    </span>
                  </div>
                  {(strategy.configuration?.assets || []).reduce((sum: number, asset: any) => sum + (asset.allocation || 0), 0) !== 100 && (
                    <p className="text-xs text-yellow-300">
                      Allocation should total 100% for optimal rebalancing
                    </p>
                  )}
                </div>
              )}
            </div>
            
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
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Threshold Deviation</label>
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
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReview = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">{strategy.name}</h3>
        <p className="text-gray-300 mb-4">{strategy.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm text-gray-400">Risk Level</p>
              <p className="font-semibold text-white capitalize">{strategy.risk_level}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm text-gray-400">Min Capital</p>
              <p className="font-semibold text-white">{formatCurrency(strategy.min_capital || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <p className="font-semibold text-green-400">Will be Active</p>
            </div>
          </div>
          {strategy.account_id && (
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Account</p>
                <p className="font-semibold text-white">
                  {brokerageAccounts.find(acc => acc.id === strategy.account_id)?.account_name || 'Selected'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800/30 rounded-lg p-6">
        <h4 className="font-semibold text-white mb-4">Configuration</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {Object.entries(strategy.configuration || {}).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
              <span className="text-white font-medium">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
          {strategy.quantity_per_grid && strategy.quantity_per_grid > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Quantity per Grid:</span>
              <span className="text-white font-medium">
                {strategy.quantity_per_grid.toFixed(6)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-400 mb-2">Auto-Trading Enabled</h4>
            <p className="text-sm text-green-300">
              This strategy will be created in an <strong>active state</strong> and will begin autonomous trading 
              immediately based on market conditions and your configured parameters. You can pause it at any time 
              from the Strategies page.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-400 mb-2">Important Disclaimer</h4>
            <div className="space-y-2 text-sm text-yellow-300">
              <p>• All trading involves risk of loss, including potential total loss of capital</p>
              <p>• Past performance does not guarantee future results</p>
              <p>• Automated strategies may not perform as expected due to market conditions</p>
              <p>• You are responsible for monitoring and managing your strategies</p>
              <p>• Consider starting with paper trading or small amounts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const canProceed = () => {
    switch (step) {
      case 'type':
        return selectedType && hasAccess;
      case 'config':
        if (!strategy.name || !strategy.type) return false;
        
        if (selectedType === 'spot_grid') {
          if (!strategy.configuration?.symbol || strategy.configuration.symbol.trim() === '') {
            return false;
          }
          return strategy.account_id && 
                 strategy.configuration?.symbol &&
                 strategy.configuration.symbol.trim() !== '' &&
                 strategy.configuration?.price_range_lower && 
                 strategy.configuration?.price_range_upper &&
                 strategy.configuration.price_range_lower < strategy.configuration.price_range_upper;
        }
        
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 'type') setStep('config');
    else if (step === 'config') setStep('review');
    else if (step === 'review') handleCreateStrategy();
  };

  const handleBack = () => {
    if (step === 'config') setStep('type');
    else if (step === 'review') setStep('config');
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

          <div className="min-h-[400px]">
            {step === 'type' && renderTypeSelection()}
            {step === 'config' && renderConfiguration()}
            {step === 'review' && renderReview()}
          </div>

          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-800">
            {step !== 'type' && (
              <Button variant="secondary" onClick={handleBack}>
                Back
              </Button>
            )}
            
            <div className="flex-1" />
            
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            
            <Button 
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {step === 'review' ? 'Create Strategy' : 'Continue'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}