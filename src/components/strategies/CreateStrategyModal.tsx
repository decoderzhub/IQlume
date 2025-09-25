import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, Shield, DollarSign, Target, Settings, AlertTriangle, Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumericInput } from '../ui/NumericInput';
import { OptionsBellCurve } from './OptionsBellCurve';
import { TradingStrategy, BrokerageAccount } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useStore } from '../../store/useStore';

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
  },
  {
    id: 'wheel',
    name: 'The Wheel',
    description: 'Systematic approach combining cash-secured puts and covered calls',
    risk: 'low' as const,
    minCapital: 20000,
    tier: 'pro' as const,
  },
  {
    id: 'short_put',
    name: 'Cash-Secured Put',
    description: 'Sell put options with cash backing for potential stock acquisition',
    risk: 'medium' as const,
    minCapital: 10000,
    tier: 'pro' as const,
  },
  {
    id: 'spot_grid',
    name: 'Spot Grid Bot',
    description: 'Automate buy-low/sell-high trades within a defined price range',
    risk: 'low' as const,
    minCapital: 1000,
    tier: 'pro' as const,
  },
  {
    id: 'futures_grid',
    name: 'Futures Grid Bot',
    description: 'Grid trading on futures market with leverage support',
    risk: 'medium' as const,
    minCapital: 2000,
    tier: 'elite' as const,
  },
  {
    id: 'infinity_grid',
    name: 'Infinity Grid Bot',
    description: 'Grid trading without upper price limit for trending markets',
    risk: 'medium' as const,
    minCapital: 1500,
    tier: 'elite' as const,
  },
  {
    id: 'dca',
    name: 'DCA Bot',
    description: 'Dollar-cost averaging for systematic investment',
    risk: 'low' as const,
    minCapital: 500,
    tier: 'starter' as const,
  },
  {
    id: 'smart_rebalance',
    name: 'Smart Rebalance',
    description: 'Maintain target allocations through automatic rebalancing',
    risk: 'low' as const,
    minCapital: 5000,
    tier: 'starter' as const,
  },
];

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const { brokerageAccounts, getEffectiveSubscriptionTier, user } = useStore();
  const [selectedType, setSelectedType] = useState<string>('');
  const [step, setStep] = useState<'type' | 'config' | 'review'>('type');
  const [strategy, setStrategy] = useState<Partial<TradingStrategy>>({
    name: '',
    description: '',
    risk_level: 'medium',
    min_capital: 10000,
    is_active: true, // Set to true by default
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
          symbol: 'AAPL',
          strike_delta: 0.30,
          dte_target: 30,
          profit_target: 0.5,
          position_size: 100,
        };
      case 'wheel':
        return {
          symbol: 'AAPL',
          put_strike_delta: -0.30,
          call_strike_delta: 0.30,
          dte_target: 30,
          position_size: 100,
        };
      case 'short_put':
        return {
          symbol: 'AAPL',
          strike_delta: -0.30,
          dte_target: 30,
          profit_target: 0.5,
          position_size: 100,
        };
      case 'spot_grid':
        return {
          symbol: 'BTC',
          allocated_capital: 1000,
          price_range_lower: 50000,
          price_range_upper: 60000,
          number_of_grids: 20,
          grid_spacing_percent: 1.0,
        };
      case 'futures_grid':
        return {
          symbol: 'BTC/USDT',
          allocated_capital: 2000,
          price_range_lower: 0,
          price_range_upper: 0,
          number_of_grids: 25,
          leverage: 3,
        };
      case 'infinity_grid':
        return {
          symbol: 'ETH/USDT',
          allocated_capital: 1500,
          price_range_lower: 0,
          number_of_grids: 30,
        };
      case 'dca':
        return {
          symbol: 'BTC',
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

  const handleCreateStrategy = () => {
    if (!strategy.name || !strategy.type) return;

    // Validation for spot grid
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
      is_active: true, // Ensure it's active
      configuration: strategy.configuration || {},
      account_id: strategy.account_id,
      quantity_per_grid: strategy.quantity_per_grid,
      grid_mode: strategy.grid_mode || 'arithmetic',
    };

    onSave(newStrategy);
  };

  // Auto-calculate quantity per grid for spot grid strategies
  React.useEffect(() => {
    if (selectedType === 'spot_grid' && strategy.configuration) {
      const { allocated_capital, number_of_grids, price_range_lower, price_range_upper } = strategy.configuration;
      
      if (allocated_capital && number_of_grids && price_range_lower && price_range_upper && 
          price_range_lower > 0 && price_range_upper > price_range_lower) {
        
        // Calculate average price in the range
        const averagePrice = (price_range_lower + price_range_upper) / 2;
        
        // Calculate quantity per grid: (allocated capital / number of grids) / average price
        const quantityPerGrid = (allocated_capital / number_of_grids) / averagePrice;
        
        setStrategy(prev => ({
          ...prev,
          quantity_per_grid: Math.round(quantityPerGrid * 1000000) / 1000000, // Round to 6 decimal places
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategyTypes.map((type) => {
          const tierAccess = tierOrder[userTier] >= tierOrder[type.tier];
          const isComingSoon = !tierAccess;

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
        <>
        {selectedType === 'covered_calls' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">Covered Calls Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                <input
                  type="text"
                  value={strategy.configuration?.symbol || 'AAPL'}
                  onChange={(e) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, symbol: e.target.value.toUpperCase() }
                  }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
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

        {selectedType === 'spot_grid' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">Grid Bot Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                <input
                  type="text"
                  value={strategy.configuration?.symbol || 'BTC'}
                  onChange={(e) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, symbol: e.target.value.toUpperCase() }
                  }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="e.g., BTC, ETH, AAPL"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Enter symbol (crypto or stock) - Predictive dropdown coming soon
                </p>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Lower Price Limit</label>
                <NumericInput
                  value={strategy.configuration?.price_range_lower || 50000}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, price_range_lower: value }
                  }))}
                  min={0.01}
                  step={strategy.configuration?.symbol?.includes('BTC') ? 1000 : 1}
                  allowDecimals={true}
                  prefix="$"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Grid will place buy orders at this level and below
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Upper Price Limit</label>
                <NumericInput
                  value={strategy.configuration?.price_range_upper || 60000}
                  onChange={(value) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, price_range_upper: value }
                  }))}
                  min={0.01}
                  step={strategy.configuration?.symbol?.includes('BTC') ? 1000 : 1}
                  allowDecimals={true}
                  prefix="$"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Grid will place sell orders at this level and above
                </p>
              </div>
            </div>
            
            {/* Auto-calculated quantity per grid display */}
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
            
            {/* Validation warnings */}
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

        {selectedType === 'dca' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">DCA Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                <input
                  type="text"
                  value={strategy.configuration?.symbol || 'BTC'}
                  onChange={(e) => setStrategy(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, symbol: e.target.value.toUpperCase() }
                  }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
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
        </>
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
        
        // Additional validation for spot grid
        if (selectedType === 'spot_grid') {
          return strategy.account_id && 
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

          {/* Progress Indicator */}
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