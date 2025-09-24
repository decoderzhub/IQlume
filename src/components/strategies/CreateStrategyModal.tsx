import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, Shield, DollarSign, Settings, Target, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumericInput } from '../ui/NumericInput';
import { AssetAllocationManager } from './AssetAllocationManager';
import { TradingStrategy } from '../../types';
import { INITIAL_LAUNCH_STRATEGY_TYPES, STRATEGY_TIERS } from '../../lib/constants';
import { useStore } from '../../store/useStore';

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => void;
}

interface AssetAllocationItem {
  symbol: string;
  allocation_percent: number;
  asset_class?: string;
  market_cap?: number;
  name?: string;
  exchange?: string;
}

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const { getEffectiveSubscriptionTier } = useStore();
  const [step, setStep] = useState<'basic' | 'configuration' | 'allocation'>('basic');
  
  // Basic strategy info
  const [name, setName] = useState('');
  const [type, setType] = useState<TradingStrategy['type']>('covered_calls');
  const [description, setDescription] = useState('');
  const [riskLevel, setRiskLevel] = useState<TradingStrategy['risk_level']>('medium');
  const [minCapital, setMinCapital] = useState(10000);

  // Asset allocation (for smart_rebalance)
  const [totalCapital, setTotalCapital] = useState(10000);
  const [assets, setAssets] = useState<AssetAllocationItem[]>([]);
  const [allocationMode, setAllocationMode] = useState<'manual' | 'even_split' | 'market_cap_weighted' | 'majority_cash_even' | 'majority_cash_market_cap'>('manual');

  // Strategy-specific configuration
  const [configuration, setConfiguration] = useState<Record<string, any>>({});

  // Check if user has access to selected strategy
  const userTier = getEffectiveSubscriptionTier();
  const requiredTier = STRATEGY_TIERS[type as keyof typeof STRATEGY_TIERS];
  const tierOrder = { starter: 0, pro: 1, elite: 2 };
  const hasAccess = tierOrder[userTier] >= tierOrder[requiredTier];
  const isImplemented = INITIAL_LAUNCH_STRATEGY_TYPES.includes(type as any);

  // Available strategy types based on user tier
  const availableStrategies = Object.entries(STRATEGY_TIERS)
    .filter(([strategyType, tier]) => {
      const hasStrategyAccess = tierOrder[userTier] >= tierOrder[tier];
      const isStrategyImplemented = INITIAL_LAUNCH_STRATEGY_TYPES.includes(strategyType as any);
      return hasStrategyAccess && isStrategyImplemented;
    })
    .map(([strategyType]) => strategyType);

  const strategyOptions = [
    { value: 'covered_calls', label: 'Covered Calls', description: 'Generate income by selling call options on owned stocks' },
    { value: 'wheel', label: 'The Wheel', description: 'Systematic approach combining cash-secured puts and covered calls' },
    { value: 'short_put', label: 'Cash-Secured Put', description: 'Income generation with potential stock acquisition' },
    { value: 'spot_grid', label: 'Spot Grid Bot', description: 'Automate buy-low/sell-high trades within a price range' },
    { value: 'dca', label: 'DCA Bot', description: 'Dollar-cost averaging for systematic investing' },
    { value: 'smart_rebalance', label: 'Smart Rebalance', description: 'Maintain target allocations through automatic rebalancing' },
    { value: 'futures_grid', label: 'Futures Grid Bot', description: 'Grid trading with leverage on futures markets' },
    { value: 'infinity_grid', label: 'Infinity Grid Bot', description: 'Grid trading without upper price limit' },
  ].filter(option => availableStrategies.includes(option.value));

  const handleNext = () => {
    if (step === 'basic') {
      setStep('configuration');
    } else if (step === 'configuration') {
      if (type === 'smart_rebalance') {
        setStep('allocation');
      } else {
        handleSave();
      }
    } else if (step === 'allocation') {
      handleSave();
    }
  };

  const handleBack = () => {
    if (step === 'allocation') {
      setStep('configuration');
    } else if (step === 'configuration') {
      setStep('basic');
    }
  };

  const handleSave = () => {
    // Validate allocation for smart_rebalance
    if (type === 'smart_rebalance') {
      const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation_percent, 0);
      if (Math.abs(totalAllocation - 100) > 0.01) {
        alert('Asset allocation must total 100%');
        return;
      }
      if (assets.length === 0) {
        alert('Please add at least one asset to your allocation');
        return;
      }
    }

    const strategy: Omit<TradingStrategy, 'id'> = {
      name,
      type,
      description,
      risk_level: riskLevel,
      min_capital: type === 'smart_rebalance' ? totalCapital : minCapital,
      is_active: false,
      configuration: {
        ...configuration,
        ...(type === 'smart_rebalance' && {
          total_capital: totalCapital,
          allocation_mode: allocationMode,
          assets: assets,
          rebalance_threshold: 5.0,
          rebalance_frequency: 'weekly',
        }),
      },
      capital_allocation: type === 'smart_rebalance' ? {
        mode: 'fixed_amount_usd',
        value: totalCapital,
        assets: assets,
        allocation_mode: allocationMode,
      } : undefined,
    };

    onSave(strategy);
  };

  const canProceed = () => {
    if (step === 'basic') {
      return name.trim() && type && description.trim() && minCapital > 0;
    } else if (step === 'configuration') {
      return true; // Configuration is optional for most strategies
    } else if (step === 'allocation') {
      const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation_percent, 0);
      return assets.length > 0 && Math.abs(totalAllocation - 100) < 0.01;
    }
    return false;
  };

  const renderBasicStep = () => (
    <div className="space-y-6">
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
          Strategy Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TradingStrategy['type'])}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
        >
          {strategyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          {strategyOptions.find(opt => opt.value === type)?.description}
        </p>
      </div>

      <div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>

        {type !== 'smart_rebalance' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Minimum Capital
            </label>
            <NumericInput
              value={minCapital}
              onChange={setMinCapital}
              min={1000}
              step={1000}
              prefix="$"
              placeholder="Enter minimum capital"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderConfigurationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Strategy Configuration</h3>
        <p className="text-gray-400">Configure strategy-specific parameters</p>
      </div>

      {type === 'covered_calls' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
            <input
              type="text"
              value={configuration.symbol || ''}
              onChange={(e) => setConfiguration(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="AAPL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Strike Delta</label>
            <NumericInput
              value={configuration.strike_delta || 0.30}
              onChange={(value) => setConfiguration(prev => ({ ...prev, strike_delta: value }))}
              min={0.1}
              max={0.5}
              step={0.05}
              placeholder="0.30"
            />
          </div>
        </div>
      )}

      {type === 'spot_grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
            <input
              type="text"
              value={configuration.symbol || ''}
              onChange={(e) => setConfiguration(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="BTC/USD"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Number of Grids</label>
            <NumericInput
              value={configuration.number_of_grids || 20}
              onChange={(value) => setConfiguration(prev => ({ ...prev, number_of_grids: value }))}
              min={5}
              max={100}
              step={1}
              placeholder="20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Lower Price Range</label>
            <NumericInput
              value={configuration.price_range_lower || 0}
              onChange={(value) => setConfiguration(prev => ({ ...prev, price_range_lower: value }))}
              min={0}
              step={100}
              prefix="$"
              placeholder="50000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Upper Price Range</label>
            <NumericInput
              value={configuration.price_range_upper || 0}
              onChange={(value) => setConfiguration(prev => ({ ...prev, price_range_upper: value }))}
              min={0}
              step={100}
              prefix="$"
              placeholder="70000"
            />
          </div>
        </div>
      )}

      {type === 'dca' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
            <input
              type="text"
              value={configuration.symbol || ''}
              onChange={(e) => setConfiguration(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="BTC/USD"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Investment Amount</label>
            <NumericInput
              value={configuration.investment_amount_per_interval || 100}
              onChange={(value) => setConfiguration(prev => ({ ...prev, investment_amount_per_interval: value }))}
              min={10}
              step={10}
              prefix="$"
              placeholder="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
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
      )}

      {type === 'wheel' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
            <input
              type="text"
              value={configuration.symbol || ''}
              onChange={(e) => setConfiguration(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="AAPL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Position Size</label>
            <NumericInput
              value={configuration.position_size || 100}
              onChange={(value) => setConfiguration(prev => ({ ...prev, position_size: value }))}
              min={100}
              step={100}
              placeholder="100"
            />
          </div>
        </div>
      )}

      {type === 'short_put' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
            <input
              type="text"
              value={configuration.symbol || ''}
              onChange={(e) => setConfiguration(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="AAPL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Strike Delta</label>
            <NumericInput
              value={configuration.strike_delta || -0.30}
              onChange={(value) => setConfiguration(prev => ({ ...prev, strike_delta: value }))}
              min={-0.5}
              max={-0.1}
              step={0.05}
              placeholder="-0.30"
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderAllocationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Asset Allocation</h3>
        <p className="text-gray-400">Configure your portfolio allocation and rebalancing parameters</p>
      </div>

      <AssetAllocationManager
        totalCapital={totalCapital}
        onTotalCapitalChange={setTotalCapital}
        assets={assets}
        onAssetsChange={setAssets}
        allocationMode={allocationMode}
        onAllocationModeChange={setAllocationMode}
      />
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case 'basic': return 'Basic Information';
      case 'configuration': return 'Strategy Configuration';
      case 'allocation': return 'Asset Allocation';
      default: return 'Create Strategy';
    }
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
              <p className="text-gray-400">{getStepTitle()}</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              {['basic', 'configuration', ...(type === 'smart_rebalance' ? ['allocation'] : [])].map((stepName, index, array) => (
                <div key={stepName} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step === stepName 
                      ? 'bg-blue-600 text-white' 
                      : array.indexOf(step) > index
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  {index < array.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      array.indexOf(step) > index
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
            {step === 'basic' && renderBasicStep()}
            {step === 'configuration' && renderConfigurationStep()}
            {step === 'allocation' && renderAllocationStep()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            {step !== 'basic' && (
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
              {step === 'allocation' || (step === 'configuration' && type !== 'smart_rebalance') ? 'Create Strategy' : 'Next'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}