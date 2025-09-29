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
  DollarSign,
  Percent,
  BarChart3,
  PieChart,
  TrendingDown,
  Coins
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumericInput } from '../ui/NumericInput';
import { SymbolSearchInput } from '../ui/SymbolSearchInput';
import { TradingStrategy } from '../../types';
import { INITIAL_LAUNCH_STRATEGY_TYPES, STRATEGY_TIERS } from '../../lib/constants';
import { useStore } from '../../store/useStore';

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

interface AssetAllocation {
  symbol: string;
  allocation: number;
}

const strategyTypes = [
  {
    id: 'spot_grid',
    name: 'Spot Grid Bot',
    description: 'Automates buy-low/sell-high trades within a defined price range',
    icon: Grid3X3,
    color: 'from-blue-500 to-cyan-500',
    tier: 'pro',
    risk: 'medium',
    minCapital: 1000,
  },
  {
    id: 'dca',
    name: 'DCA Bot',
    description: 'Dollar-cost averaging for systematic investing',
    icon: Bot,
    color: 'from-green-500 to-emerald-500',
    tier: 'starter',
    risk: 'low',
    minCapital: 500,
  },
  {
    id: 'smart_rebalance',
    name: 'Smart Rebalance',
    description: 'Maintains target allocations in a portfolio of selected assets',
    icon: PieChart,
    color: 'from-purple-500 to-pink-500',
    tier: 'starter',
    risk: 'low',
    minCapital: 5000,
  },
  {
    id: 'covered_calls',
    name: 'Covered Calls',
    description: 'Generate income by selling call options on owned stocks',
    icon: Target,
    color: 'from-orange-500 to-red-500',
    tier: 'pro',
    risk: 'low',
    minCapital: 15000,
  },
  {
    id: 'wheel',
    name: 'The Wheel',
    description: 'Systematic approach combining cash-secured puts and covered calls',
    icon: TrendingUp,
    color: 'from-indigo-500 to-purple-500',
    tier: 'pro',
    risk: 'medium',
    minCapital: 20000,
  },
  {
    id: 'short_put',
    name: 'Cash-Secured Put',
    description: 'Generate income by selling put options with cash backing',
    icon: TrendingDown,
    color: 'from-pink-500 to-rose-500',
    tier: 'pro',
    risk: 'medium',
    minCapital: 15000,
  },
];

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string>('');
  const [strategyName, setStrategyName] = useState('');
  const [description, setDescription] = useState('');
  const [minCapital, setMinCapital] = useState(10000);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  
  // Smart Rebalance specific state
  const [assets, setAssets] = useState<AssetAllocation[]>([]);
  const [allocationMethod, setAllocationMethod] = useState<'even' | 'market_cap' | 'majority_cash_market_cap' | 'majority_cash_even'>('even');
  const [rebalanceFrequency, setRebalanceFrequency] = useState('weekly');
  const [deviationThreshold, setDeviationThreshold] = useState(5);
  const [totalCapital, setTotalCapital] = useState(10000);
  
  // Grid strategy specific state
  const [symbol, setSymbol] = useState('');
  const [allocatedCapital, setAllocatedCapital] = useState(1000);
  const [priceRangeLower, setPriceRangeLower] = useState(0);
  const [priceRangeUpper, setPriceRangeUpper] = useState(0);
  const [numberOfGrids, setNumberOfGrids] = useState(20);
  const [gridMode, setGridMode] = useState<'arithmetic' | 'geometric'>('arithmetic');
  
  // DCA specific state
  const [dcaSymbol, setDcaSymbol] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState(100);
  const [dcaFrequency, setDcaFrequency] = useState('daily');
  
  // Options specific state
  const [optionsSymbol, setOptionsSymbol] = useState('');
  const [strikeDelta, setStrikeDelta] = useState(0.30);
  const [dteTarget, setDteTarget] = useState(30);
  const [profitTarget, setProfitTarget] = useState(50);

  const { getEffectiveSubscriptionTier } = useStore();
  const userTier = getEffectiveSubscriptionTier();
  
  const selectedStrategyType = strategyTypes.find(type => type.id === selectedType);

  // Check if user has access to selected strategy
  const tierOrder = { starter: 0, pro: 1, elite: 2 };
  const hasAccess = selectedStrategyType ? tierOrder[userTier] >= tierOrder[selectedStrategyType.tier as keyof typeof tierOrder] : false;

  // Calculate even split allocation
  const calculateEvenSplit = (assetCount: number) => {
    if (assetCount === 0) return 0;
    return Math.floor(100 / assetCount);
  };

  // Add new asset with even split
  const addAsset = () => {
    const newAssets = [...assets, { symbol: '', allocation: 0 }];
    
    if (allocationMethod === 'even') {
      // Calculate even split including USD cash
      const totalAssets = newAssets.length + 1; // +1 for USD cash
      const evenAllocation = Math.floor(100 / totalAssets);
      const remainder = 100 - (evenAllocation * totalAssets);
      
      // Distribute evenly with remainder going to first asset
      const updatedAssets = newAssets.map((asset, index) => ({
        ...asset,
        allocation: index === 0 ? evenAllocation + remainder : evenAllocation
      }));
      
      setAssets(updatedAssets);
    } else {
      setAssets(newAssets);
      // Recalculate allocations based on method
      recalculateAllocations(newAssets);
    }
  };

  // Remove asset and redistribute
  const removeAsset = (index: number) => {
    const newAssets = assets.filter((_, i) => i !== index);
    setAssets(newAssets);
    
    if (allocationMethod === 'even' && newAssets.length > 0) {
      // Recalculate even split
      const totalAssets = newAssets.length + 1; // +1 for USD cash
      const evenAllocation = Math.floor(100 / totalAssets);
      const remainder = 100 - (evenAllocation * totalAssets);
      
      const updatedAssets = newAssets.map((asset, i) => ({
        ...asset,
        allocation: i === 0 ? evenAllocation + remainder : evenAllocation
      }));
      
      setAssets(updatedAssets);
    } else {
      recalculateAllocations(newAssets);
    }
  };

  // Update asset symbol
  const updateAssetSymbol = (index: number, symbol: string) => {
    const newAssets = [...assets];
    newAssets[index].symbol = symbol;
    setAssets(newAssets);
    
    // Recalculate allocations if using market cap method
    if (allocationMethod === 'market_cap' || allocationMethod === 'majority_cash_market_cap') {
      recalculateAllocations(newAssets);
    }
  };

  // Update asset allocation (only for even split method)
  const updateAssetAllocation = (index: number, allocation: number) => {
    if (allocationMethod !== 'even') return;
    
    const newAssets = [...assets];
    newAssets[index].allocation = allocation;
    setAssets(newAssets);
  };

  // Recalculate allocations based on method
  const recalculateAllocations = (assetList: AssetAllocation[]) => {
    if (allocationMethod === 'even') {
      // Even split including USD cash
      const totalAssets = assetList.length + 1;
      const evenAllocation = Math.floor(100 / totalAssets);
      const remainder = 100 - (evenAllocation * totalAssets);
      
      const updatedAssets = assetList.map((asset, index) => ({
        ...asset,
        allocation: index === 0 ? evenAllocation + remainder : evenAllocation
      }));
      
      setAssets(updatedAssets);
    } else if (allocationMethod === 'market_cap') {
      // Mock market cap allocation (in production, this would use real market cap data)
      const mockMarketCaps: Record<string, number> = {
        'AAPL': 3000, 'MSFT': 2800, 'GOOGL': 1800, 'AMZN': 1500, 'TSLA': 800,
        'META': 900, 'NVDA': 1200, 'BTC': 1000, 'ETH': 400, 'SPY': 500
      };
      
      const totalMarketCap = assetList.reduce((sum, asset) => {
        return sum + (mockMarketCaps[asset.symbol] || 100);
      }, 0);
      
      if (totalMarketCap > 0) {
        const updatedAssets = assetList.map(asset => ({
          ...asset,
          allocation: Math.round(((mockMarketCaps[asset.symbol] || 100) / totalMarketCap) * 100)
        }));
        setAssets(updatedAssets);
      }
    } else if (allocationMethod === 'majority_cash_market_cap') {
      // 60% cash, 40% market cap weighted
      const mockMarketCaps: Record<string, number> = {
        'AAPL': 3000, 'MSFT': 2800, 'GOOGL': 1800, 'AMZN': 1500, 'TSLA': 800,
        'META': 900, 'NVDA': 1200, 'BTC': 1000, 'ETH': 400, 'SPY': 500
      };
      
      const totalMarketCap = assetList.reduce((sum, asset) => {
        return sum + (mockMarketCaps[asset.symbol] || 100);
      }, 0);
      
      if (totalMarketCap > 0) {
        const updatedAssets = assetList.map(asset => ({
          ...asset,
          allocation: Math.round(((mockMarketCaps[asset.symbol] || 100) / totalMarketCap) * 40) // 40% of total
        }));
        setAssets(updatedAssets);
      }
    } else if (allocationMethod === 'majority_cash_even') {
      // 60% cash, 40% evenly split
      if (assetList.length > 0) {
        const evenAllocation = Math.floor(40 / assetList.length);
        const remainder = 40 - (evenAllocation * assetList.length);
        
        const updatedAssets = assetList.map((asset, index) => ({
          ...asset,
          allocation: index === 0 ? evenAllocation + remainder : evenAllocation
        }));
        setAssets(updatedAssets);
      }
    }
  };

  // Handle allocation method change
  const handleAllocationMethodChange = (method: typeof allocationMethod) => {
    setAllocationMethod(method);
    recalculateAllocations(assets);
  };

  // Calculate USD cash allocation
  const getUsdCashAllocation = () => {
    if (allocationMethod === 'majority_cash_market_cap' || allocationMethod === 'majority_cash_even') {
      return 60;
    } else if (allocationMethod === 'even') {
      const totalAssets = assets.length + 1;
      const evenAllocation = Math.floor(100 / totalAssets);
      const remainder = 100 - (evenAllocation * totalAssets);
      return evenAllocation + remainder;
    } else {
      // Market cap method - USD gets remaining percentage
      const assetTotal = assets.reduce((sum, asset) => sum + asset.allocation, 0);
      return Math.max(0, 100 - assetTotal);
    }
  };

  // Calculate total allocation
  const getTotalAllocation = () => {
    const assetTotal = assets.reduce((sum, asset) => sum + asset.allocation, 0);
    const usdAllocation = getUsdCashAllocation();
    return assetTotal + usdAllocation;
  };

  const handleNext = () => {
    if (step === 1 && selectedType) {
      const strategyType = strategyTypes.find(type => type.id === selectedType);
      if (strategyType) {
        setStrategyName(strategyType.name);
        setDescription(strategyType.description);
        setMinCapital(strategyType.minCapital);
        setRiskLevel(strategyType.risk);
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCreate = async () => {
    if (!selectedType) return;

    let configuration: Record<string, any> = {};

    // Build configuration based on strategy type
    switch (selectedType) {
      case 'smart_rebalance':
        configuration = {
          assets: assets,
          allocation_method: allocationMethod,
          usd_cash_allocation: getUsdCashAllocation(),
          rebalance_frequency: rebalanceFrequency,
          deviation_threshold: deviationThreshold,
          total_capital: totalCapital,
        };
        break;
      case 'spot_grid':
        configuration = {
          symbol,
          allocated_capital: allocatedCapital,
          price_range_lower: priceRangeLower,
          price_range_upper: priceRangeUpper,
          number_of_grids: numberOfGrids,
          grid_mode: gridMode,
        };
        break;
      case 'dca':
        configuration = {
          symbol: dcaSymbol,
          investment_amount_per_interval: investmentAmount,
          frequency: dcaFrequency,
          allocated_capital: minCapital,
        };
        break;
      case 'covered_calls':
      case 'wheel':
      case 'short_put':
        configuration = {
          symbol: optionsSymbol,
          strike_delta: strikeDelta,
          dte_target: dteTarget,
          profit_target: profitTarget,
          allocated_capital: minCapital,
        };
        break;
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
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Choose Strategy Type</h3>
              <p className="text-gray-400 mb-6">Select the type of trading strategy you want to create</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategyTypes.map((type) => {
                const Icon = type.icon;
                const isImplemented = INITIAL_LAUNCH_STRATEGY_TYPES.includes(type.id as any);
                const tierOrder = { starter: 0, pro: 1, elite: 2 };
                const hasAccess = tierOrder[userTier] >= tierOrder[type.tier as keyof typeof tierOrder];
                const isAvailable = isImplemented && hasAccess;
                
                return (
                  <motion.div
                    key={type.id}
                    whileHover={isAvailable ? { scale: 1.02 } : {}}
                    whileTap={isAvailable ? { scale: 0.98 } : {}}
                    onClick={isAvailable ? () => setSelectedType(type.id) : undefined}
                    className={`p-6 rounded-lg border transition-all relative ${
                      selectedType === type.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : isAvailable
                          ? 'border-gray-700 bg-gray-800/30 hover:border-gray-600 cursor-pointer'
                          : 'border-gray-800 bg-gray-800/10 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {!isImplemented && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded border border-yellow-500/30">
                        Coming Soon
                      </div>
                    )}
                    {isImplemented && !hasAccess && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
                        {type.tier} Plan
                      </div>
                    )}
                    
                    <div className={`w-12 h-12 bg-gradient-to-br ${type.color} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-white mb-2">{type.name}</h4>
                    <p className="text-sm text-gray-400 mb-3">{type.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-1 rounded border ${
                        type.risk === 'low' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                        type.risk === 'medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                        'text-red-400 bg-red-400/10 border-red-400/20'
                      }`}>
                        {type.risk} risk
                      </span>
                      <span className="text-gray-400">
                        ${(type.minCapital / 1000).toFixed(0)}K min
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
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Configure Strategy</h3>
              <p className="text-gray-400 mb-6">Set up the parameters for your {selectedStrategyType?.name}</p>
            </div>

            {/* Basic Strategy Info */}
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Risk Level</label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe your strategy"
              />
            </div>

            {/* Strategy-specific configuration */}
            {selectedType === 'smart_rebalance' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Total Capital</label>
                  <NumericInput
                    value={totalCapital}
                    onChange={setTotalCapital}
                    min={1000}
                    step={1000}
                    prefix="$"
                    className="w-full"
                    placeholder="Enter total capital to manage"
                  />
                </div>

                {/* Allocation Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">Allocation Method</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                        <h4 className="font-medium text-white">Even Split</h4>
                      </div>
                      <p className="text-sm text-gray-400">Manual control over all allocations</p>
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
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full" />
                        <h4 className="font-medium text-white">Market Cap Weighted</h4>
                      </div>
                      <p className="text-sm text-gray-400">Automatic allocation by market cap</p>
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
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <h4 className="font-medium text-white">Majority Cash + Market Cap</h4>
                      </div>
                      <p className="text-sm text-gray-400">60% cash, 40% market cap weighted</p>
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
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                        <h4 className="font-medium text-white">Majority Cash + Even Split</h4>
                      </div>
                      <p className="text-sm text-gray-400">60% cash, 40% evenly split</p>
                    </motion.div>
                  </div>
                </div>

                {/* Asset Allocation */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-300">Asset Allocation</label>
                    <div className={`text-sm font-medium ${
                      getTotalAllocation() === 100 ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      Total: {getTotalAllocation()}%
                    </div>
                  </div>

                  {/* USD Cash (Always present) */}
                  <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
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
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-400">
                          {getUsdCashAllocation()}%
                        </span>
                        {allocationMethod !== 'even' && (
                          <span className="text-xs text-gray-400">Auto</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Asset List */}
                  <div className="space-y-3">
                    {assets.map((asset, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                        <SymbolSearchInput
                          value={asset.symbol}
                          onChange={(value) => updateAssetSymbol(index, value)}
                          placeholder="Search symbol..."
                          className="flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <NumericInput
                            value={asset.allocation}
                            onChange={(value) => updateAssetAllocation(index, value)}
                            min={0}
                            max={100}
                            step={1}
                            suffix="%"
                            className="w-20"
                            disabled={allocationMethod !== 'even'}
                          />
                          {allocationMethod !== 'even' && (
                            <span className="text-xs text-gray-400">Auto</span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAsset(index)}
                          disabled={assets.length <= 1}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add Asset Button */}
                  <Button
                    variant="outline"
                    onClick={addAsset}
                    className="w-full mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {assets.length === 0 ? 'Add First Asset' : 'Add Asset'}
                  </Button>

                  {/* Allocation Method Info */}
                  <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
                    <p className="text-sm text-gray-400">
                      {allocationMethod === 'even' && 'You can manually adjust each allocation percentage. Total should equal 100%.'}
                      {allocationMethod === 'market_cap' && 'Assets are automatically weighted by market capitalization.'}
                      {allocationMethod === 'majority_cash_market_cap' && 'USD cash gets 60%, remaining 40% is market cap weighted.'}
                      {allocationMethod === 'majority_cash_even' && 'USD cash gets 60%, remaining 40% is split evenly across assets.'}
                    </p>
                  </div>
                </div>

                {/* Rebalancing Settings */}
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
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Deviation Threshold</label>
                    <NumericInput
                      value={deviationThreshold}
                      onChange={setDeviationThreshold}
                      min={1}
                      max={50}
                      step={1}
                      suffix="%"
                      className="w-full"
                      placeholder="Trigger rebalancing when allocation drifts"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Spot Grid Configuration */}
            {selectedType === 'spot_grid' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Trading Symbol</label>
                    <SymbolSearchInput
                      value={symbol}
                      onChange={setSymbol}
                      placeholder="Search for a symbol"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Allocated Capital</label>
                    <NumericInput
                      value={allocatedCapital}
                      onChange={setAllocatedCapital}
                      min={100}
                      step={100}
                      prefix="$"
                      className="w-full"
                    />
                  </div>
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
                      className="w-full"
                      placeholder="Auto-configure"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Upper Price Range</label>
                    <NumericInput
                      value={priceRangeUpper}
                      onChange={setPriceRangeUpper}
                      min={0}
                      step={0.01}
                      prefix="$"
                      className="w-full"
                      placeholder="Auto-configure"
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
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Grid Mode</label>
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setGridMode('arithmetic')}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        gridMode === 'arithmetic'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                      }`}
                    >
                      <h4 className="font-medium text-white mb-2">Arithmetic</h4>
                      <p className="text-sm text-gray-400">Equal spacing between grid levels</p>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setGridMode('geometric')}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        gridMode === 'geometric'
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                      }`}
                    >
                      <h4 className="font-medium text-white mb-2">Geometric</h4>
                      <p className="text-sm text-gray-400">Percentage-based spacing between levels</p>
                    </motion.div>
                  </div>
                </div>
              </div>
            )}

            {/* DCA Configuration */}
            {selectedType === 'dca' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Trading Symbol</label>
                    <SymbolSearchInput
                      value={dcaSymbol}
                      onChange={setDcaSymbol}
                      placeholder="Search for a symbol"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Investment Amount per Interval</label>
                    <NumericInput
                      value={investmentAmount}
                      onChange={setInvestmentAmount}
                      min={10}
                      step={10}
                      prefix="$"
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Investment Frequency</label>
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
            )}

            {/* Options Strategies Configuration */}
            {(selectedType === 'covered_calls' || selectedType === 'wheel' || selectedType === 'short_put') && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Underlying Symbol</label>
                    <SymbolSearchInput
                      value={optionsSymbol}
                      onChange={setOptionsSymbol}
                      placeholder="Search for a stock symbol"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Strike Delta</label>
                    <NumericInput
                      value={strikeDelta}
                      onChange={setStrikeDelta}
                      min={0.05}
                      max={0.50}
                      step={0.05}
                      allowDecimals={true}
                      className="w-full"
                      placeholder="0.30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Days to Expiration (DTE)</label>
                    <NumericInput
                      value={dteTarget}
                      onChange={setDteTarget}
                      min={7}
                      max={90}
                      step={1}
                      className="w-full"
                      placeholder="30"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Profit Target</label>
                    <NumericInput
                      value={profitTarget}
                      onChange={setProfitTarget}
                      min={10}
                      max={90}
                      step={5}
                      suffix="%"
                      className="w-full"
                      placeholder="50"
                    />
                  </div>
                </div>
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
                className="w-full"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Review & Create</h3>
              <p className="text-gray-400 mb-6">Review your strategy configuration before creating</p>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-6">
              <h4 className="font-semibold text-white mb-4">{strategyName}</h4>
              <p className="text-gray-300 mb-4">{description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white ml-2">{selectedStrategyType?.name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Risk:</span>
                  <span className="text-white ml-2 capitalize">{riskLevel}</span>
                </div>
                <div>
                  <span className="text-gray-400">Capital:</span>
                  <span className="text-white ml-2">${minCapital.toLocaleString()}</span>
                </div>
              </div>

              {/* Strategy-specific review */}
              {selectedType === 'smart_rebalance' && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h5 className="font-medium text-white mb-3">Asset Allocation</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">USD Cash:</span>
                      <span className="text-white">{getUsdCashAllocation()}%</span>
                    </div>
                    {assets.map((asset, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-400">{asset.symbol || `Asset ${index + 1}`}:</span>
                        <span className="text-white">{asset.allocation}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm">
                    <span className="text-gray-400">Method:</span>
                    <span className="text-white ml-2 capitalize">{allocationMethod.replace('_', ' ')}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Frequency:</span>
                    <span className="text-white ml-2 capitalize">{rebalanceFrequency}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
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
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
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
              <Button 
                onClick={handleNext}
                disabled={
                  (step === 1 && !selectedType) ||
                  (step === 2 && !strategyName)
                }
              >
                Continue
              </Button>
            ) : (
              <Button 
                onClick={handleCreate}
                disabled={
                  !strategyName || 
                  (selectedType === 'smart_rebalance' && (assets.length === 0 || getTotalAllocation() !== 100))
                }
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