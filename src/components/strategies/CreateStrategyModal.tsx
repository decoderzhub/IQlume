import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  TrendingUp, 
  Grid3X3, 
  Bot, 
  Target, 
  Plus, 
  Trash2,
  Brain,
  Zap,
  AlertTriangle,
  DollarSign,
  Percent,
  Settings
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumericInput } from '../ui/NumericInput';
import { SymbolSearchInput } from '../ui/SymbolSearchInput';
import { TradingStrategy } from '../../types';
import { INITIAL_LAUNCH_STRATEGY_TYPES, STRATEGY_TIERS, SubscriptionTier } from '../../lib/constants';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

interface AssetAllocation {
  symbol: string;
  allocation: number;
}

const strategyTypes = [
  // Grid Bots
  {
    id: 'spot_grid',
    name: 'Spot Grid Bot',
    description: 'Automate buy-low/sell-high trades within a defined price range',
    risk_level: 'low' as const,
    min_capital: 1000,
    category: 'grid',
    tier: 'pro' as SubscriptionTier,
  },
  {
    id: 'futures_grid',
    name: 'Futures Grid Bot',
    description: 'Grid trading on futures market with leverage support',
    risk_level: 'medium' as const,
    min_capital: 2000,
    category: 'grid',
    tier: 'elite' as SubscriptionTier,
  },
  {
    id: 'infinity_grid',
    name: 'Infinity Grid Bot',
    description: 'Grid trading without upper price limit for trending markets',
    risk_level: 'medium' as const,
    min_capital: 1500,
    category: 'grid',
    tier: 'elite' as SubscriptionTier,
  },
  // Autonomous Bots
  {
    id: 'dca',
    name: 'DCA Bot',
    description: 'Dollar-cost averaging for systematic investment',
    risk_level: 'low' as const,
    min_capital: 500,
    category: 'autonomous',
    tier: 'starter' as SubscriptionTier,
  },
  {
    id: 'smart_rebalance',
    name: 'Smart Rebalance',
    description: 'Maintain target allocations through automatic rebalancing',
    risk_level: 'low' as const,
    min_capital: 5000,
    category: 'autonomous',
    tier: 'starter' as SubscriptionTier,
  },
  // Options Strategies
  {
    id: 'covered_calls',
    name: 'Covered Calls',
    description: 'Generate income by selling call options on owned stocks',
    risk_level: 'low' as const,
    min_capital: 15000,
    category: 'options',
    tier: 'pro' as SubscriptionTier,
  },
  {
    id: 'wheel',
    name: 'The Wheel',
    description: 'Systematic approach combining cash-secured puts and covered calls',
    risk_level: 'low' as const,
    min_capital: 20000,
    category: 'options',
    tier: 'pro' as SubscriptionTier,
  },
  {
    id: 'short_put',
    name: 'Cash-Secured Put',
    description: 'Sell put options with cash backing for potential stock acquisition',
    risk_level: 'medium' as const,
    min_capital: 10000,
    category: 'options',
    tier: 'pro' as SubscriptionTier,
  },
];

const categories = {
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
    description: 'Set-and-forget strategies for systematic investing and rebalancing',
  },
  options: {
    name: 'Options Strategies',
    icon: Target,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    description: 'Income generation and risk management using options contracts',
  },
};

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const [step, setStep] = useState<'type' | 'configure' | 'review'>('type');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [strategyName, setStrategyName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [minCapital, setMinCapital] = useState(0);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [aiConfiguring, setAiConfiguring] = useState(false);
  
  // Smart Rebalance specific state
  const [assets, setAssets] = useState<AssetAllocation[]>([]);
  const [rebalanceFrequency, setRebalanceFrequency] = useState('weekly');
  const [thresholdDeviation, setThresholdDeviation] = useState(5);
  
  // Grid strategy specific state
  const [priceRangeLower, setPriceRangeLower] = useState(0);
  const [priceRangeUpper, setPriceRangeUpper] = useState(0);
  const [numberOfGrids, setNumberOfGrids] = useState(20);
  
  // DCA specific state
  const [investmentAmount, setInvestmentAmount] = useState(100);
  const [dcaFrequency, setDcaFrequency] = useState('daily');
  
  // Options specific state
  const [strikeDelta, setStrikeDelta] = useState(0.30);
  const [dteTarget, setDteTarget] = useState(30);
  const [profitTarget, setProfitTarget] = useState(50);

  const { getEffectiveSubscriptionTier } = useStore();
  const userTier = getEffectiveSubscriptionTier();
  const tierOrder = { starter: 0, pro: 1, elite: 2 };

  const selectedStrategy = strategyTypes.find(s => s.id === selectedType);

  // Check if user has access to selected strategy
  const hasAccess = selectedStrategy ? tierOrder[userTier] >= tierOrder[selectedStrategy.tier] : false;

  const handleTypeSelect = (typeId: string) => {
    const strategy = strategyTypes.find(s => s.id === typeId);
    if (!strategy) return;

    setSelectedType(typeId);
    setStrategyName(strategy.name);
    setMinCapital(strategy.min_capital);
    setRiskLevel(strategy.risk_level);
    setDescription(strategy.description);
    
    // Reset strategy-specific state
    setAssets([]);
    setPriceRangeLower(0);
    setPriceRangeUpper(0);
    setSymbol('');
  };

  const addAsset = () => {
    const newAssets = [...assets, { symbol: '', allocation: 0 }];
    
    // Calculate even split for all assets
    const evenSplit = Math.floor(100 / newAssets.length);
    const remainder = 100 - (evenSplit * newAssets.length);
    
    // Distribute evenly with remainder going to first asset
    const updatedAssets = newAssets.map((asset, index) => ({
      ...asset,
      allocation: index === 0 ? evenSplit + remainder : evenSplit
    }));
    
    setAssets(updatedAssets);
  };

  const removeAsset = (index: number) => {
    if (assets.length <= 1) return; // Don't allow removing the last asset
    
    const newAssets = assets.filter((_, i) => i !== index);
    
    // Recalculate even split for remaining assets
    const evenSplit = Math.floor(100 / newAssets.length);
    const remainder = 100 - (evenSplit * newAssets.length);
    
    const updatedAssets = newAssets.map((asset, i) => ({
      ...asset,
      allocation: i === 0 ? evenSplit + remainder : evenSplit
    }));
    
    setAssets(updatedAssets);
  };

  const updateAssetSymbol = (index: number, newSymbol: string) => {
    const updatedAssets = [...assets];
    updatedAssets[index].symbol = newSymbol;
    setAssets(updatedAssets);
  };

  const updateAssetAllocation = (index: number, newAllocation: number) => {
    const updatedAssets = [...assets];
    updatedAssets[index].allocation = newAllocation;
    setAssets(updatedAssets);
  };

  const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation, 0);

  const handleAIConfigureGrid = async () => {
    if (!symbol) {
      alert('Please select a symbol first');
      return;
    }

    setAiConfiguring(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/market-data/ai-configure-grid-range`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          symbol: symbol,
          allocated_capital: minCapital,
          number_of_grids: numberOfGrids,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI configuration');
      }

      const result = await response.json();
      setPriceRangeLower(result.lower_limit);
      setPriceRangeUpper(result.upper_limit);
      
      alert(`AI Configuration Complete!\n\nOptimal Range: $${result.lower_limit} - $${result.upper_limit}\n\n${result.reasoning}`);
    } catch (error) {
      console.error('Error getting AI configuration:', error);
      alert('Failed to get AI configuration. Please set the range manually.');
    } finally {
      setAiConfiguring(false);
    }
  };

  const handleNext = () => {
    if (step === 'type' && selectedType) {
      setStep('configure');
    } else if (step === 'configure') {
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'review') {
      setStep('configure');
    } else if (step === 'configure') {
      setStep('type');
    }
  };

  const handleCreate = async () => {
    if (!selectedStrategy) return;

    setIsCreating(true);
    try {
      let configuration: Record<string, any> = {};

      // Build configuration based on strategy type
      if (selectedType === 'smart_rebalance') {
        configuration = {
          assets: assets,
          rebalance_frequency: rebalanceFrequency,
          threshold_deviation_percent: thresholdDeviation,
          trigger_type: 'threshold',
        };
      } else if (selectedType === 'spot_grid' || selectedType === 'futures_grid' || selectedType === 'infinity_grid') {
        configuration = {
          symbol: symbol,
          allocated_capital: minCapital,
          price_range_lower: priceRangeLower,
          price_range_upper: priceRangeUpper,
          number_of_grids: numberOfGrids,
          grid_mode: 'arithmetic',
        };
      } else if (selectedType === 'dca') {
        configuration = {
          symbol: symbol,
          investment_amount_per_interval: investmentAmount,
          frequency: dcaFrequency,
          allocated_capital: minCapital,
        };
      } else if (selectedType === 'covered_calls' || selectedType === 'wheel' || selectedType === 'short_put') {
        configuration = {
          symbol: symbol,
          strike_delta: strikeDelta,
          dte_target: dteTarget,
          profit_target: profitTarget,
          allocated_capital: minCapital,
        };
      }

      const strategy: Omit<TradingStrategy, 'id'> = {
        name: strategyName,
        type: selectedType as TradingStrategy['type'],
        description: description,
        risk_level: riskLevel,
        min_capital: minCapital,
        is_active: false,
        configuration: configuration,
      };

      await onSave(strategy);
    } catch (error) {
      console.error('Error creating strategy:', error);
      alert('Failed to create strategy. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const isValid = () => {
    if (!selectedType || !strategyName) return false;
    
    if (selectedType === 'smart_rebalance') {
      return assets.length > 0 && 
             assets.every(asset => asset.symbol.trim() !== '') && 
             Math.abs(totalAllocation - 100) < 0.01;
    }
    
    if (['spot_grid', 'futures_grid', 'infinity_grid'].includes(selectedType)) {
      return symbol && priceRangeLower > 0 && priceRangeUpper > priceRangeLower;
    }
    
    if (selectedType === 'dca') {
      return symbol && investmentAmount > 0;
    }
    
    if (['covered_calls', 'wheel', 'short_put'].includes(selectedType)) {
      return symbol && strikeDelta > 0 && dteTarget > 0;
    }
    
    return true;
  };

  const renderTypeSelection = () => {
    const categorizedStrategies = Object.entries(categories).map(([categoryKey, categoryData]) => ({
      ...categoryData,
      strategies: strategyTypes.filter(strategy => strategy.category === categoryKey)
    }));

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Choose Strategy Type</h3>
          <p className="text-gray-400">Select the trading strategy that best fits your goals and risk tolerance</p>
        </div>

        {categorizedStrategies.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.name} className="space-y-4">
              {/* Category Header */}
              <Card className={`p-6 ${category.bgColor} ${category.borderColor} border`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${category.bgColor} rounded-xl flex items-center justify-center border ${category.borderColor}`}>
                    <Icon className={`w-6 h-6 ${category.color}`} />
                  </div>
                  <div>
                    <h4 className={`text-xl font-bold ${category.color}`}>{category.name}</h4>
                    <p className="text-gray-300 text-sm">{category.description}</p>
                  </div>
                </div>
              </Card>

              {/* Strategy Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.strategies.map((strategy) => {
                  const hasStrategyAccess = tierOrder[userTier] >= tierOrder[strategy.tier];
                  const isImplemented = INITIAL_LAUNCH_STRATEGY_TYPES.includes(strategy.id as any);
                  
                  return (
                    <motion.div
                      key={strategy.id}
                      whileHover={hasStrategyAccess && isImplemented ? { scale: 1.02 } : {}}
                      whileTap={hasStrategyAccess && isImplemented ? { scale: 0.98 } : {}}
                      onClick={hasStrategyAccess && isImplemented ? () => handleTypeSelect(strategy.id) : undefined}
                      className={`p-6 rounded-lg border transition-all relative ${
                        selectedType === strategy.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : hasStrategyAccess && isImplemented
                            ? 'border-gray-700 bg-gray-800/30 hover:border-gray-600 cursor-pointer'
                            : 'border-gray-800 bg-gray-800/10 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {!isImplemented && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded border border-yellow-500/30">
                          Coming Soon
                        </div>
                      )}
                      
                      {!hasStrategyAccess && isImplemented && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30 capitalize">
                          {strategy.tier} Plan
                        </div>
                      )}

                      <h4 className={`font-semibold mb-2 ${
                        hasStrategyAccess && isImplemented ? 'text-white' : 'text-gray-500'
                      }`}>
                        {strategy.name}
                      </h4>
                      <p className={`text-sm mb-4 ${
                        hasStrategyAccess && isImplemented ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {strategy.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${
                          strategy.risk_level === 'low' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                          strategy.risk_level === 'medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                          'text-red-400 bg-red-400/10 border-red-400/20'
                        }`}>
                          {strategy.risk_level} risk
                        </span>
                        <span className={`text-sm ${
                          hasStrategyAccess && isImplemented ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Min: ${strategy.min_capital.toLocaleString()}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderConfiguration = () => {
    if (!selectedStrategy) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Configure {selectedStrategy.name}</h3>
          <p className="text-gray-400">Set up the parameters for your trading strategy</p>
        </div>

        {/* Basic Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Strategy Name</label>
            <input
              type="text"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter strategy name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Capital</label>
            <NumericInput
              value={minCapital}
              onChange={setMinCapital}
              min={selectedStrategy.min_capital}
              step={1000}
              prefix="$"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Describe your strategy goals and approach"
          />
        </div>

        {/* Strategy-Specific Configuration */}
        {selectedType === 'smart_rebalance' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-300">Asset Allocation</label>
                <Button size="sm" onClick={addAsset}>
                  <Plus className="w-4 h-4 mr-2" />
                  {assets.length === 0 ? 'Add First Asset' : 'Add Asset'}
                </Button>
              </div>
              
              {assets.length === 0 ? (
                <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700">
                  <Target className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 mb-4">No assets added yet</p>
                  <Button size="sm" onClick={addAsset}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Asset
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {assets.map((asset, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                      <div className="flex-1">
                        <SymbolSearchInput
                          value={asset.symbol}
                          onChange={(value) => updateAssetSymbol(index, value)}
                          placeholder="Search for symbol"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <NumericInput
                          value={asset.allocation}
                          onChange={(value) => updateAssetAllocation(index, value)}
                          min={0}
                          max={100}
                          step={0.1}
                          allowDecimals={true}
                          className="w-20"
                        />
                        <span className="text-gray-400">%</span>
                      </div>
                      {assets.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAsset(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {/* Total Allocation Display */}
                  <div className={`p-3 rounded-lg border text-center ${
                    Math.abs(totalAllocation - 100) < 0.01 
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                  }`}>
                    <span className="font-medium">
                      Total Allocation: {totalAllocation.toFixed(1)}%
                    </span>
                    {Math.abs(totalAllocation - 100) >= 0.01 && (
                      <p className="text-xs mt-1">Allocation should total 100%</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rebalance Frequency</label>
                <select
                  value={rebalanceFrequency}
                  onChange={(e) => setRebalanceFrequency(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Threshold Deviation (%)</label>
                <NumericInput
                  value={thresholdDeviation}
                  onChange={setThresholdDeviation}
                  min={1}
                  max={50}
                  step={0.5}
                  suffix="%"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Rebalance when any asset deviates by this percentage from target
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Grid Strategy Configuration */}
        {['spot_grid', 'futures_grid', 'infinity_grid'].includes(selectedType || '') && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Trading Symbol</label>
              <SymbolSearchInput
                value={symbol}
                onChange={setSymbol}
                placeholder="Search for a symbol (e.g., BTC, AAPL)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Lower Price Range</label>
                <NumericInput
                  value={priceRangeLower}
                  onChange={setPriceRangeLower}
                  min={0}
                  step={0.01}
                  prefix="$"
                  allowDecimals={true}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Upper Price Range</label>
                <NumericInput
                  value={priceRangeUpper}
                  onChange={setPriceRangeUpper}
                  min={priceRangeLower}
                  step={0.01}
                  prefix="$"
                  allowDecimals={true}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Number of Grids</label>
                <NumericInput
                  value={numberOfGrids}
                  onChange={setNumberOfGrids}
                  min={5}
                  max={100}
                  step={1}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>

            {/* AI Configuration Button */}
            <div className="text-center">
              <Button
                onClick={handleAIConfigureGrid}
                disabled={!symbol || aiConfiguring}
                isLoading={aiConfiguring}
                variant="outline"
                className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
              >
                <Brain className="w-4 h-4 mr-2" />
                {aiConfiguring ? 'AI Configuring...' : 'AI Configure Grid Range'}
              </Button>
              <p className="text-xs text-gray-400 mt-2">
                Let AI analyze market data to set optimal grid range
              </p>
            </div>
          </div>
        )}

        {/* DCA Configuration */}
        {selectedType === 'dca' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Trading Symbol</label>
              <SymbolSearchInput
                value={symbol}
                onChange={setSymbol}
                placeholder="Search for a symbol (e.g., BTC, ETH)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Investment Amount per Interval</label>
                <NumericInput
                  value={investmentAmount}
                  onChange={setInvestmentAmount}
                  min={10}
                  step={10}
                  prefix="$"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
                <select
                  value={dcaFrequency}
                  onChange={(e) => setDcaFrequency(e.target.value)}
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

        {/* Options Strategy Configuration */}
        {['covered_calls', 'wheel', 'short_put'].includes(selectedType || '') && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Trading Symbol</label>
              <SymbolSearchInput
                value={symbol}
                onChange={setSymbol}
                placeholder="Search for a symbol (e.g., AAPL, MSFT)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Strike Delta</label>
                <NumericInput
                  value={strikeDelta}
                  onChange={setStrikeDelta}
                  min={0.05}
                  max={0.95}
                  step={0.05}
                  allowDecimals={true}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
                <p className="text-xs text-gray-400 mt-1">0.30 = 30% out-of-the-money</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Days to Expiration</label>
                <NumericInput
                  value={dteTarget}
                  onChange={setDteTarget}
                  min={7}
                  max={90}
                  step={1}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Profit Target (%)</label>
                <NumericInput
                  value={profitTarget}
                  onChange={setProfitTarget}
                  min={10}
                  max={90}
                  step={5}
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

  const renderReview = () => {
    if (!selectedStrategy) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Review Strategy</h3>
          <p className="text-gray-400">Confirm your strategy configuration before creating</p>
        </div>

        <Card className="p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/20">
          <h4 className="font-semibold text-white mb-4">{strategyName}</h4>
          <p className="text-gray-300 mb-4">{description}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Type:</span>
              <span className="text-white ml-2">{selectedStrategy.name}</span>
            </div>
            <div>
              <span className="text-gray-400">Risk Level:</span>
              <span className="text-white ml-2 capitalize">{riskLevel}</span>
            </div>
            <div>
              <span className="text-gray-400">Min Capital:</span>
              <span className="text-white ml-2">${minCapital.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Configuration Summary */}
        <Card className="p-6">
          <h4 className="font-semibold text-white mb-4">Configuration Summary</h4>
          
          {selectedType === 'smart_rebalance' && (
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-medium text-blue-400 mb-2">Asset Allocation</h5>
                <div className="space-y-2">
                  {assets.map((asset, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-800/30 rounded">
                      <span className="text-white font-medium">{asset.symbol}</span>
                      <span className="text-blue-400">{asset.allocation.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Frequency:</span>
                  <span className="text-white ml-2 capitalize">{rebalanceFrequency}</span>
                </div>
                <div>
                  <span className="text-gray-400">Threshold:</span>
                  <span className="text-white ml-2">{thresholdDeviation}%</span>
                </div>
              </div>
            </div>
          )}

          {['spot_grid', 'futures_grid', 'infinity_grid'].includes(selectedType || '') && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Symbol:</span>
                <span className="text-white ml-2">{symbol}</span>
              </div>
              <div>
                <span className="text-gray-400">Price Range:</span>
                <span className="text-white ml-2">${priceRangeLower} - ${priceRangeUpper}</span>
              </div>
              <div>
                <span className="text-gray-400">Grid Levels:</span>
                <span className="text-white ml-2">{numberOfGrids}</span>
              </div>
            </div>
          )}

          {selectedType === 'dca' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Symbol:</span>
                <span className="text-white ml-2">{symbol}</span>
              </div>
              <div>
                <span className="text-gray-400">Amount:</span>
                <span className="text-white ml-2">${investmentAmount}</span>
              </div>
              <div>
                <span className="text-gray-400">Frequency:</span>
                <span className="text-white ml-2 capitalize">{dcaFrequency}</span>
              </div>
            </div>
          )}

          {['covered_calls', 'wheel', 'short_put'].includes(selectedType || '') && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Symbol:</span>
                <span className="text-white ml-2">{symbol}</span>
              </div>
              <div>
                <span className="text-gray-400">Strike Delta:</span>
                <span className="text-white ml-2">{strikeDelta}</span>
              </div>
              <div>
                <span className="text-gray-400">DTE Target:</span>
                <span className="text-white ml-2">{dteTarget} days</span>
              </div>
            </div>
          )}
        </Card>

        {/* Risk Disclosure */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-400 mb-2">Risk Disclosure</h4>
              <p className="text-sm text-yellow-300">
                All trading involves risk of loss. This strategy has been classified as{' '}
                <span className="font-semibold capitalize">{riskLevel}</span> risk. 
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
              <p className="text-gray-400">Set up a new automated trading strategy</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              {[
                { step: 'type', label: 'Type', number: 1 },
                { step: 'configure', label: 'Configure', number: 2 },
                { step: 'review', label: 'Review', number: 3 },
              ].map((stepInfo, index) => (
                <div key={stepInfo.step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step === stepInfo.step 
                      ? 'bg-blue-600 text-white' 
                      : ['type', 'configure', 'review'].indexOf(step) > index
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                  }`}>
                    {stepInfo.number}
                  </div>
                  {index < 2 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      ['type', 'configure', 'review'].indexOf(step) > index
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
            {step === 'configure' && renderConfiguration()}
            {step === 'review' && renderReview()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            {step !== 'type' && (
              <Button variant="secondary" onClick={handleBack}>
                Back
              </Button>
            )}
            
            <div className="flex-1" />
            
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            
            {step === 'review' ? (
              <Button
                onClick={handleCreate}
                disabled={!isValid() || isCreating}
                isLoading={isCreating}
              >
                {isCreating ? 'Creating Strategy...' : 'Create Strategy'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={step === 'type' ? !selectedType || !hasAccess : !isValid()}
              >
                Continue
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}