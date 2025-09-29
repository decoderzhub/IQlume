import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, DollarSign, Target, Shield, Plus, Trash2, Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumericInput } from '../ui/NumericInput';
import { SymbolSearchInput } from '../ui/SymbolSearchInput';
import { TradingStrategy } from '../../types';
import { INITIAL_LAUNCH_STRATEGY_TYPES, STRATEGY_TIERS } from '../../lib/constants';
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
  { id: 'covered_calls', name: 'Covered Calls', description: 'Generate income by selling call options on owned stocks', risk: 'low', minCapital: 15000 },
  { id: 'wheel', name: 'The Wheel', description: 'Systematic approach combining cash-secured puts and covered calls', risk: 'low', minCapital: 20000 },
  { id: 'short_put', name: 'Cash-Secured Put', description: 'Generate income by selling put options with cash backing', risk: 'medium', minCapital: 15000 },
  { id: 'spot_grid', name: 'Spot Grid Bot', description: 'Automate buy-low/sell-high trades within a price range', risk: 'low', minCapital: 1000 },
  { id: 'futures_grid', name: 'Futures Grid Bot', description: 'Grid trading on futures with leverage support', risk: 'medium', minCapital: 2000 },
  { id: 'infinity_grid', name: 'Infinity Grid Bot', description: 'Grid trading without upper price limit for trending markets', risk: 'medium', minCapital: 1500 },
  { id: 'dca', name: 'DCA Bot', description: 'Dollar-cost averaging for systematic investing', risk: 'low', minCapital: 500 },
  { id: 'smart_rebalance', name: 'Smart Rebalance', description: 'Maintain target allocations through automatic rebalancing', risk: 'low', minCapital: 5000 },
];

const allocationMethods = [
  { id: 'even', name: 'Even Split', description: 'Equal allocation across all assets', color: 'blue' },
  { id: 'market_cap', name: 'Market Cap Weighted', description: 'Allocation based on market capitalization', color: 'purple' },
  { id: 'majority_cash_market_cap', name: 'Majority Cash + Market Cap', description: '60% cash, 40% market cap weighted', color: 'green' },
  { id: 'majority_cash_even', name: 'Majority Cash + Even Split', description: '60% cash, 40% evenly split', color: 'yellow' },
];

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string>('');
  const [strategyName, setStrategyName] = useState('');
  const [description, setDescription] = useState('');
  const [symbol, setSymbol] = useState('');
  const [minCapital, setMinCapital] = useState(10000);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  
  // Smart Rebalance specific state
  const [allocationMethod, setAllocationMethod] = useState<'even' | 'market_cap' | 'majority_cash_market_cap' | 'majority_cash_even'>('even');
  const [assets, setAssets] = useState<AssetAllocation[]>([]);
  const [rebalanceFrequency, setRebalanceFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [deviationThreshold, setDeviationThreshold] = useState(5);
  const [totalCapital, setTotalCapital] = useState(10000);
  
  // Grid strategy specific state
  const [priceRangeLower, setPriceRangeLower] = useState(0);
  const [priceRangeUpper, setPriceRangeUpper] = useState(0);
  const [numberOfGrids, setNumberOfGrids] = useState(20);
  
  // DCA specific state
  const [investmentAmount, setInvestmentAmount] = useState(100);
  const [dcaFrequency, setDcaFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  
  // AI configuration state
  const [aiConfiguring, setAiConfiguring] = useState(false);

  const { getEffectiveSubscriptionTier } = useStore();

  const selectedStrategyType = strategyTypes.find(type => type.id === selectedType);

  // Check if user has access to selected strategy
  const requiredTier = STRATEGY_TIERS[selectedType as keyof typeof STRATEGY_TIERS];
  const userTier = getEffectiveSubscriptionTier();
  const tierOrder = { starter: 0, pro: 1, elite: 2 };
  const hasAccess = !requiredTier || tierOrder[userTier] >= tierOrder[requiredTier];

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    const strategyType = strategyTypes.find(type => type.id === typeId);
    if (strategyType) {
      setStrategyName(strategyType.name);
      setDescription(strategyType.description);
      setRiskLevel(strategyType.risk as 'low' | 'medium' | 'high');
      setMinCapital(strategyType.minCapital);
      
      // Initialize Smart Rebalance with USD cash
      if (typeId === 'smart_rebalance') {
        setAssets([]);
        setAllocationMethod('even');
      }
    }
  };

  const addAsset = () => {
    const newAsset: AssetAllocation = { symbol: '', allocation: 0 };
    const updatedAssets = [...assets, newAsset];
    setAssets(updatedAssets);
    redistributeAllocations(updatedAssets);
  };

  const removeAsset = (index: number) => {
    const updatedAssets = assets.filter((_, i) => i !== index);
    setAssets(updatedAssets);
    redistributeAllocations(updatedAssets);
  };

  const updateAssetSymbol = (index: number, newSymbol: string) => {
    const updatedAssets = assets.map((asset, i) => 
      i === index ? { ...asset, symbol: newSymbol } : asset
    );
    setAssets(updatedAssets);
    redistributeAllocations(updatedAssets);
  };

  const updateAssetAllocation = (index: number, newAllocation: number) => {
    const updatedAssets = assets.map((asset, i) => 
      i === index ? { ...asset, allocation: newAllocation } : asset
    );
    setAssets(updatedAssets);
  };

  const redistributeAllocations = (assetList: AssetAllocation[]) => {
    if (assetList.length === 0) return;

    let updatedAssets = [...assetList];

    switch (allocationMethod) {
      case 'even':
        // Even split: divide remaining percentage after USD cash
        const cashAllocation = 20; // Default 20% cash
        const remainingForAssets = 100 - cashAllocation;
        const evenAllocation = assetList.length > 0 ? remainingForAssets / assetList.length : 0;
        updatedAssets = assetList.map(asset => ({ ...asset, allocation: evenAllocation }));
        break;

      case 'market_cap':
        // Market cap weighted (simplified)
        const marketCapWeights = { 'AAPL': 30, 'MSFT': 25, 'GOOGL': 20, 'AMZN': 15, 'TSLA': 10 };
        const totalWeight = assetList.reduce((sum, asset) => 
          sum + (marketCapWeights[asset.symbol as keyof typeof marketCapWeights] || 5), 0
        );
        updatedAssets = assetList.map(asset => ({
          ...asset,
          allocation: ((marketCapWeights[asset.symbol as keyof typeof marketCapWeights] || 5) / totalWeight) * 40 // 40% for assets, 60% cash
        }));
        break;

      case 'majority_cash_market_cap':
        // 60% cash, 40% market cap weighted
        const mcWeights = { 'AAPL': 30, 'MSFT': 25, 'GOOGL': 20, 'AMZN': 15, 'TSLA': 10 };
        const mcTotalWeight = assetList.reduce((sum, asset) => 
          sum + (mcWeights[asset.symbol as keyof typeof mcWeights] || 5), 0
        );
        updatedAssets = assetList.map(asset => ({
          ...asset,
          allocation: ((mcWeights[asset.symbol as keyof typeof mcWeights] || 5) / mcTotalWeight) * 40
        }));
        break;

      case 'majority_cash_even':
        // 60% cash, 40% evenly split
        const evenSplit = assetList.length > 0 ? 40 / assetList.length : 0;
        updatedAssets = assetList.map(asset => ({ ...asset, allocation: evenSplit }));
        break;
    }

    setAssets(updatedAssets);
  };

  const getSelectedSymbols = () => {
    return ['USD', ...assets.map(asset => asset.symbol).filter(symbol => symbol)];
  };

  const getCashAllocation = () => {
    switch (allocationMethod) {
      case 'majority_cash_market_cap':
      case 'majority_cash_even':
        return 60;
      case 'market_cap':
        return 60; // Default cash allocation for market cap
      case 'even':
      default:
        return Math.max(0, 100 - assets.reduce((sum, asset) => sum + asset.allocation, 0));
    }
  };

  const getTotalAllocation = () => {
    return getCashAllocation() + assets.reduce((sum, asset) => sum + asset.allocation, 0);
  };
  
  const handleAIConfigureGrid = async () => {
    if (!symbol) return;
    
    setAiConfiguring(true);
    try {
      console.log(`🤖 AI configuring grid range for ${symbol}...`);
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
        const errorText = await response.text();
        throw new Error(`Failed to get AI configuration: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ AI configuration result:', result);
      
      // Update grid range with AI suggestions
      setPriceRangeLower(result.lower_limit);
      setPriceRangeUpper(result.upper_limit);
      
      // Show AI reasoning in an alert
      alert(`🤖 AI Grid Configuration Complete!\n\n${result.reasoning}`);
      
    } catch (error) {
      console.error('Error in AI grid configuration:', error);
      alert(`Failed to configure grid with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAiConfiguring(false);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCreate = async () => {
    const configuration: Record<string, any> = {};

    if (selectedType === 'smart_rebalance') {
      configuration.allocation_method = allocationMethod;
      configuration.assets = assets;
      configuration.rebalance_frequency = rebalanceFrequency;
      configuration.deviation_threshold = deviationThreshold;
      configuration.total_capital = totalCapital;
      configuration.cash_allocation = getCashAllocation();
    } else if (selectedType === 'spot_grid' || selectedType === 'futures_grid' || selectedType === 'infinity_grid') {
      configuration.symbol = symbol;
      configuration.price_range_lower = priceRangeLower;
      configuration.price_range_upper = priceRangeUpper;
      configuration.number_of_grids = numberOfGrids;
      configuration.allocated_capital = minCapital;
    } else if (selectedType === 'dca') {
      configuration.symbol = symbol;
      configuration.investment_amount_per_interval = investmentAmount;
      configuration.frequency = dcaFrequency;
      configuration.allocated_capital = minCapital;
    } else {
      configuration.symbol = symbol;
    }

    const strategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: selectedType as TradingStrategy['type'],
      description,
      risk_level: riskLevel,
      min_capital: minCapital,
      is_active: false,
      configuration,
    };

    await onSave(strategy);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Choose Strategy Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategyTypes.filter(type => INITIAL_LAUNCH_STRATEGY_TYPES.includes(type.id as any)).map((type) => {
                const requiredTier = STRATEGY_TIERS[type.id as keyof typeof STRATEGY_TIERS];
                const hasAccess = !requiredTier || tierOrder[userTier] >= tierOrder[requiredTier];
                
                return (
                  <motion.div
                    key={type.id}
                    whileHover={hasAccess ? { scale: 1.02 } : {}}
                    whileTap={hasAccess ? { scale: 0.98 } : {}}
                    onClick={hasAccess ? () => handleTypeSelect(type.id) : undefined}
                    className={`p-6 border rounded-lg transition-all relative ${
                      selectedType === type.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : hasAccess
                          ? 'border-gray-700 bg-gray-800/30 cursor-pointer hover:border-gray-600'
                          : 'border-gray-800 bg-gray-800/10 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {!hasAccess && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
                        {requiredTier} Plan
                      </div>
                    )}
                    <h4 className="font-medium text-white mb-2">{type.name}</h4>
                    <p className="text-sm text-gray-400 mb-3">{type.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        type.risk === 'low' ? 'text-green-400 bg-green-400/10' :
                        type.risk === 'medium' ? 'text-yellow-400 bg-yellow-400/10' :
                        'text-red-400 bg-red-400/10'
                      }`}>
                        {type.risk} risk
                      </span>
                      <span className="text-sm text-gray-400">
                        ${type.minCapital.toLocaleString()}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Configure Strategy</h3>
            
            {/* Basic Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Strategy Name</label>
                <input
                  type="text"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="Enter strategy name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Risk Level</label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                rows={3}
                placeholder="Describe your strategy"
              />
            </div>

            {/* Strategy-specific configuration */}
            {selectedType === 'smart_rebalance' ? (
              <div className="space-y-6">
                {/* Allocation Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Allocation Method</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allocationMethods.map((method) => (
                      <motion.div
                        key={method.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          setAllocationMethod(method.id as any);
                          redistributeAllocations(assets);
                        }}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          allocationMethod === method.id
                            ? `border-${method.color}-500 bg-${method.color}-500/10`
                            : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                        }`}
                      >
                        <h4 className="font-medium text-white mb-1">{method.name}</h4>
                        <p className="text-sm text-gray-400">{method.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* USD Cash Display */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="font-medium text-white">USD Cash</span>
                        <p className="text-xs text-gray-400">Account cash balance</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-400">
                        {getCashAllocation().toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Portfolio Assets */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-white">Portfolio Assets</h4>
                    <Button size="sm" onClick={addAsset}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Asset
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
                        <div key={index} className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg">
                          <div className="flex-1">
                            <SymbolSearchInput
                              value={asset.symbol}
                              onChange={(value) => updateAssetSymbol(index, value)}
                              placeholder="Search for a symbol"
                              excludeSymbols={getSelectedSymbols()}
                            />
                          </div>
                          
                          <div className="w-24">
                            {allocationMethod === 'even' ? (
                              <NumericInput
                                value={asset.allocation}
                                onChange={(value) => updateAssetAllocation(index, value)}
                                min={0}
                                max={100}
                                step={0.1}
                                suffix="%"
                                allowDecimals={true}
                              />
                            ) : (
                              <div className="px-3 py-2 bg-gray-700 rounded text-center text-white">
                                {asset.allocation.toFixed(1)}%
                              </div>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAsset(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total Allocation Display */}
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Total Allocation</span>
                    <span className={`font-bold text-lg ${
                      Math.abs(getTotalAllocation() - 100) < 0.01 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {getTotalAllocation().toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    USD Cash: {getCashAllocation().toFixed(1)}% + Assets: {assets.reduce((sum, asset) => sum + asset.allocation, 0).toFixed(1)}%
                  </p>
                </div>

                {/* Rebalancing Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
                    <select
                      value={rebalanceFrequency}
                      onChange={(e) => setRebalanceFrequency(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
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
                      value={deviationThreshold}
                      onChange={setDeviationThreshold}
                      min={1}
                      max={20}
                      step={0.5}
                      suffix="%"
                      allowDecimals={true}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Total Capital</label>
                    <NumericInput
                      value={totalCapital}
                      onChange={setTotalCapital}
                      min={1000}
                      step={1000}
                      prefix="$"
                    />
                  </div>
                </div>
              </div>
            ) : selectedType === 'spot_grid' || selectedType === 'futures_grid' || selectedType === 'infinity_grid' ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Trading Symbol</label>
                  <SymbolSearchInput
                    value={symbol}
                    onChange={setSymbol}
                    placeholder="Search for a symbol (e.g., BTC, AAPL)"
                  />
                </div>
                
                {/* AI Configure Section */}
                {symbol && (
                  <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">🤖</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-purple-400">AI Grid Configuration</h4>
                          <p className="text-sm text-gray-400">Let AI analyze {symbol} and suggest optimal grid range</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleAIConfigureGrid}
                        disabled={aiConfiguring || !symbol}
                        variant="outline"
                        className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      >
                        {aiConfiguring ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Analyzing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>🧠</span>
                            <span>AI Configure</span>
                          </div>
                        )}
                      </Button>
                    </div>
                    
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-sm">✨</span>
                        </div>
                        <div>
                          <h5 className="font-medium text-purple-400 mb-2">How AI Configuration Works</h5>
                          <ul className="text-sm text-purple-300 space-y-1">
                            <li>• Analyzes 1-year price history and volatility patterns</li>
                            <li>• Calculates Bollinger Bands and technical indicators</li>
                            <li>• Considers current market momentum and RSI levels</li>
                            <li>• Suggests optimal grid range with 20% safety buffer</li>
                            <li>• Provides detailed reasoning for the configuration</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* AI Configure Section */}
                {symbol && (
                  <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">🤖</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-purple-400">AI Grid Configuration</h4>
                          <p className="text-sm text-gray-400">Let AI analyze {symbol} and suggest optimal grid range</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleAIConfigureGrid}
                        disabled={aiConfiguring || !symbol}
                        variant="outline"
                        className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      >
                        {aiConfiguring ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Analyzing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>🧠</span>
                            <span>AI Configure</span>
                          </div>
                        )}
                      </Button>
                    </div>
                    
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-sm">✨</span>
                        </div>
                        <div>
                          <h5 className="font-medium text-purple-400 mb-2">How AI Configuration Works</h5>
                          <ul className="text-sm text-purple-300 space-y-1">
                            <li>• Analyzes 1-year price history and volatility patterns</li>
                            <li>• Calculates Bollinger Bands and technical indicators</li>
                            <li>• Considers current market momentum and RSI levels</li>
                            <li>• Suggests optimal grid range with 20% safety buffer</li>
                            <li>• Provides detailed reasoning for the configuration</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Lower Price</label>
                    <NumericInput
                      value={priceRangeLower}
                      onChange={setPriceRangeLower}
                      min={0}
                      step={0.01}
                      prefix="$"
                      allowDecimals={true}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Upper Price</label>
                    <NumericInput
                      value={priceRangeUpper}
                      onChange={setPriceRangeUpper}
                      min={0}
                      step={0.01}
                      prefix="$"
                      allowDecimals={true}
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
                    />
                  </div>
                </div>
              </div>
            ) : selectedType === 'dca' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Trading Symbol</label>
                  <SymbolSearchInput
                    value={symbol}
                    onChange={setSymbol}
                    placeholder="Search for a symbol (e.g., BTC, AAPL)"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Investment Amount</label>
                    <NumericInput
                      value={investmentAmount}
                      onChange={setInvestmentAmount}
                      min={10}
                      step={10}
                      prefix="$"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
                    <select
                      value={dcaFrequency}
                      onChange={(e) => setDcaFrequency(e.target.value as any)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Trading Symbol</label>
                <SymbolSearchInput
                  value={symbol}
                  onChange={setSymbol}
                  placeholder="Search for a symbol (e.g., AAPL, MSFT)"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Capital</label>
              <NumericInput
                value={minCapital}
                onChange={setMinCapital}
                min={100}
                step={100}
                prefix="$"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Review & Create</h3>
            
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h4 className="font-medium text-white mb-4">Strategy Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white ml-2">{strategyName}</span>
                </div>
                <div>
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white ml-2">{selectedStrategyType?.name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Risk Level:</span>
                  <span className="text-white ml-2 capitalize">{riskLevel}</span>
                </div>
                <div>
                  <span className="text-gray-400">Min Capital:</span>
                  <span className="text-white ml-2">${minCapital.toLocaleString()}</span>
                </div>
                
                {selectedType === 'smart_rebalance' && (
                  <>
                    <div className="col-span-2">
                      <span className="text-gray-400">Allocation Method:</span>
                      <span className="text-white ml-2">{allocationMethods.find(m => m.id === allocationMethod)?.name}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-400">Assets:</span>
                      <div className="ml-2">
                        <div className="text-green-400">USD Cash: {getCashAllocation().toFixed(1)}%</div>
                        {assets.map((asset, index) => (
                          <div key={index} className="text-white">
                            {asset.symbol}: {asset.allocation.toFixed(1)}%
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                {(selectedType === 'spot_grid' || selectedType === 'futures_grid' || selectedType === 'infinity_grid') && (
                  <>
                    <div>
                      <span className="text-gray-400">Symbol:</span>
                      <span className="text-white ml-2">{symbol}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Price Range:</span>
                      <span className="text-white ml-2">${priceRangeLower} - ${priceRangeUpper}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Grids:</span>
                      <span className="text-white ml-2">{numberOfGrids}</span>
                    </div>
                  </>
                )}
                
                {selectedType === 'dca' && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedType && hasAccess;
      case 2:
        if (selectedType === 'smart_rebalance') {
          return strategyName && assets.length > 0 && Math.abs(getTotalAllocation() - 100) < 0.01;
        }
        return strategyName && symbol;
      case 3:
        return true;
      default:
        return false;
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
              <h2 className="text-2xl font-bold text-white">Create Trading Strategy</h2>
              <p className="text-gray-400">Set up a new automated trading strategy</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step === stepNumber 
                      ? 'bg-blue-600 text-white' 
                      : step > stepNumber
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                  }`}>
                    {stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      step > stepNumber ? 'bg-green-600' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="min-h-[400px] mb-8">
            {renderStepContent()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {step > 1 && (
              <Button variant="secondary" onClick={handleBack}>
                Back
              </Button>
            )}
            
            <div className="flex-1" />
            
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            
            {step < 3 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Continue
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={!canProceed()}>
                Create Strategy
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}