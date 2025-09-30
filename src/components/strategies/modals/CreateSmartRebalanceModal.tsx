import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, BarChart3, Plus, Trash2, DollarSign, Target, AlertTriangle } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { useStore } from '../../../store/useStore';
import { supabase } from '../../../lib/supabase';

interface Asset {
  symbol: string;
  allocation: number;
}

interface CreateSmartRebalanceModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateSmartRebalanceModal({ onClose, onSave }: CreateSmartRebalanceModalProps) {
  const { brokerageAccounts } = useStore();
  const [step, setStep] = useState<'configure' | 'review'>('configure');
  const [strategyName, setStrategyName] = useState('Smart Rebalance');
  const [brokerageAccount, setBrokerageAccount] = useState('');
  const [minCapital, setMinCapital] = useState(5000);
  const [allocatedCapital, setAllocatedCapital] = useState(5000);
  const [description, setDescription] = useState('Maintain target allocations through automatic rebalancing');
  const [allocationMethod, setAllocationMethod] = useState<'even_split' | 'market_cap_weighted' | 'majority_cash_market_cap' | 'majority_cash_even_split'>('even_split');
  const [cashBalance, setCashBalance] = useState(20);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [rebalanceFrequency, setRebalanceFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [deviationThreshold, setDeviationThreshold] = useState(5);

  // Auto-configure allocations when allocation method changes
  React.useEffect(() => {
    const configureAssets = async () => {
      if (assets.length === 0) {
        // No assets to configure, just set cash balance
        const newCashBalance = allocationMethod.includes('majority_cash') ? 60 : 20;
        setCashBalance(newCashBalance);
        return;
      }

      // Configure existing assets based on allocation method
      const newCashBalance = allocationMethod.includes('majority_cash') ? 60 : 20;
      const availableForAssets = 100 - newCashBalance;
      
      let updatedAssets = [...assets];
      
      switch (allocationMethod) {
        case 'even_split':
        case 'majority_cash_even_split':
          // Distribute available percentage evenly among all assets
          const evenAllocation = availableForAssets / assets.length;
          updatedAssets = assets.map(asset => ({
            ...asset,
            allocation: evenAllocation
          }));
          break;
          
        case 'market_cap_weighted':
        case 'majority_cash_market_cap':
          // Fetch real market cap data for market cap weighting
          try {
            const marketCapWeights = await fetchMarketCapWeights(assets);
            
            const totalWeight = marketCapWeights.reduce((sum, weight) => sum + weight, 0);
            updatedAssets = assets.map((asset, index) => ({
              ...asset,
              allocation: totalWeight > 0 ? (marketCapWeights[index] / totalWeight) * availableForAssets : availableForAssets / assets.length
            }));
          } catch (error) {
            console.error('Error fetching market cap data, falling back to even split:', error);
            // Fallback to even split if market cap data fails
            const evenAllocation = availableForAssets / assets.length;
            updatedAssets = assets.map(asset => ({
              ...asset,
              allocation: evenAllocation
            }));
          }
          break;
      }
      
      setAssets(updatedAssets);
      setCashBalance(newCashBalance);
    };

    configureAssets();
  }, [allocationMethod, assets.length]); // Re-run when method changes or assets are added/removed

  // Fetch market cap data for assets
  const fetchMarketCapWeights = async (assetList: Asset[]): Promise<number[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Get symbols that have valid names
      const validAssets = assetList.filter(asset => asset.symbol && asset.symbol.trim());
      if (validAssets.length === 0) {
        return [];
      }

      const symbols = validAssets.map(asset => asset.symbol).join(',');
      
      // Fetch market data which includes market cap information
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/market-data/live-prices?symbols=${symbols}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch market data: ${response.status}`);
      }

      const marketData = await response.json();
      
      // Calculate market cap weights based on price and volume as proxy
      // In a real implementation, you'd fetch actual market cap data
      const weights = validAssets.map(asset => {
        const symbolData = marketData[asset.symbol.toUpperCase()];
        if (!symbolData) {
          return 1; // Default weight if no data
        }
        
        // Use price * volume as a proxy for market activity/size
        // Real implementation would use actual market cap from financial data provider
        const price = symbolData.price || 1;
        const volume = symbolData.volume || 1000000;
        const marketCapProxy = price * volume;
        
        // Apply realistic market cap ratios for common stocks
        if (asset.symbol.toUpperCase() === 'AAPL') return marketCapProxy * 3.0; // Apple is large cap
        if (asset.symbol.toUpperCase() === 'MSFT') return marketCapProxy * 2.8; // Microsoft is large cap
        if (asset.symbol.toUpperCase() === 'GOOGL') return marketCapProxy * 2.5; // Google is large cap
        if (asset.symbol.toUpperCase() === 'AMZN') return marketCapProxy * 2.2; // Amazon is large cap
        if (asset.symbol.toUpperCase() === 'TSLA') return marketCapProxy * 1.5; // Tesla is large but volatile
        if (asset.symbol.toUpperCase() === 'META') return marketCapProxy * 1.8; // Meta is large cap
        if (asset.symbol.toUpperCase() === 'NVDA') return marketCapProxy * 2.0; // NVIDIA is large cap
        
        // For ETFs, use moderate weighting
        if (['SPY', 'QQQ', 'VTI', 'VOO'].includes(asset.symbol.toUpperCase())) {
          return marketCapProxy * 1.2;
        }
        
        // For crypto, use different scaling
        if (asset.symbol.toUpperCase().includes('BTC')) return marketCapProxy * 4.0; // Bitcoin dominance
        if (asset.symbol.toUpperCase().includes('ETH')) return marketCapProxy * 2.0; // Ethereum second largest
        
        return marketCapProxy; // Default weight based on price * volume
      });
      
      return weights;
      
    } catch (error) {
      console.error('Error fetching market cap data:', error);
      // Fallback to equal weights
      return assetList.map(() => 1);
    }
  };
          
  // Dynamic rebalancing when cash balance or asset allocations change
  const rebalanceAllocations = (updatedAssets: Asset[], newCashBalance: number) => {
    if (updatedAssets.length === 0) return updatedAssets;
    
    const availableForAssets = 100 - newCashBalance;
    const currentAssetTotal = updatedAssets.reduce((sum, asset) => sum + asset.allocation, 0);
    
    // If assets total is 0, distribute evenly
    if (currentAssetTotal === 0) {
      const evenAllocation = availableForAssets / updatedAssets.length;
      return updatedAssets.map(asset => ({
        ...asset,
        allocation: evenAllocation
      }));
    }
    
    // Scale existing allocations proportionally to fit available space
    const scaleFactor = availableForAssets / currentAssetTotal;
    return updatedAssets.map(asset => ({
      ...asset,
      allocation: asset.allocation * scaleFactor
    }));
  };

  // Handle cash balance changes with automatic asset rebalancing
  const handleCashBalanceChange = (newCashBalance: number) => {
    setCashBalance(newCashBalance);
    
    if (assets.length > 0) {
      const rebalancedAssets = rebalanceAllocations(assets, newCashBalance);
      setAssets(rebalancedAssets);
    }
  };

  // Handle individual asset allocation changes with automatic rebalancing
  const handleAssetAllocationChange = (index: number, newAllocation: number, fromSlider: boolean = false) => {
    // Round to 2 decimal places for ease of use
    const roundedAllocation = Math.round(newAllocation * 100) / 100;
    
    // Calculate maximum allowed allocation for this asset
    const otherAssetsTotal = assets
      .filter((_, i) => i !== index)
      .reduce((sum, asset) => sum + asset.allocation, 0);
    const maxAllowedForThisAsset = 100 - cashBalance - otherAssetsTotal;
    
    // Constrain allocation to prevent exceeding 100% total
    const constrainedAllocation = Math.min(roundedAllocation, Math.max(0, maxAllowedForThisAsset));
    
    // Prevent total allocation from exceeding 100%
    const otherAssetsTotal = assets
      .filter((_, i) => i !== index)
      .reduce((sum, asset) => sum + asset.allocation, 0);
    const maxAllowedForThisAsset = 100 - cashBalance - otherAssetsTotal;
    const constrainedAllocation = Math.min(roundedAllocation, Math.max(0, maxAllowedForThisAsset));
    
    // If user is using slider, automatically switch to custom mode
    if (fromSlider && allocationMethod !== 'custom') {
      setAllocationMethod('custom');
    }
    
    if (allocationMethod === 'custom') {
      // In custom mode, sliders work independently - no auto-rebalancing
      const updatedAssets = assets.map((asset, i) => 
        i === index ? { ...asset, allocation: constrainedAllocation } : asset
      );
      setAssets(updatedAssets);
    } else {
      // In other modes, maintain auto-rebalancing behavior
      const updatedAssets = assets.map((asset, i) => 
        i === index ? { ...asset, allocation: constrainedAllocation } : asset
      );
      
      // Calculate how much allocation is left for other assets
      const thisAssetAllocation = constrainedAllocation;
      const otherAssetsCurrentTotal = updatedAssets
        .filter((_, i) => i !== index)
        .reduce((sum, asset) => sum + asset.allocation, 0);
      
      const availableForAssets = 100 - cashBalance;
      const availableForOtherAssets = availableForAssets - thisAssetAllocation;
      
      // If there's space available and other assets exist, rebalance them proportionally
      if (availableForOtherAssets > 0 && otherAssetsCurrentTotal > 0) {
        const scaleFactor = availableForOtherAssets / otherAssetsCurrentTotal;
        
        const finalAssets = updatedAssets.map((asset, i) => {
          if (i === index) {
            return asset; // Keep the user's change
          } else {
            return {
              ...asset,
              allocation: Math.round(asset.allocation * scaleFactor * 100) / 100 // Round to 2 decimal places
            };
          }
        });
        
        setAssets(finalAssets);
      } else if (availableForOtherAssets <= 0) {
        // If no space left, zero out other assets
        const finalAssets = updatedAssets.map((asset, i) => {
          if (i === index) {
            return asset; // Keep the user's change
          } else {
            return {
              ...asset,
              allocation: 0
            };
          }
        });
        
        setAssets(finalAssets);
      } else {
        // Just update the single asset
        setAssets(updatedAssets);
      }
    }
  };

  const addAsset = () => {
    const newAssets = [...assets, { symbol: '', allocation: 0 }];
    
    // Auto-allocate based on current method if this is the first asset
    if (assets.length === 0) {
      const availableForAssets = 100 - cashBalance;
      const rebalancedAssets = rebalanceAllocations(newAssets, cashBalance);
      setAssets(rebalancedAssets);
    } else {
      // Just add the asset with 0 allocation - user can adjust manually
      setAssets(newAssets);
    }
  };

  const removeAsset = (index: number) => {
    const newAssets = assets.filter((_, i) => i !== index);
    
    // Rebalance remaining assets to fill the space
    if (newAssets.length > 0) {
      const rebalancedAssets = rebalanceAllocations(newAssets, cashBalance);
      setAssets(rebalancedAssets);
    } else {
      setAssets(newAssets);
    }
  };

  const updateAsset = (index: number, field: keyof Asset, value: string | number) => {
    if (field === 'allocation') {
      handleAssetAllocationChange(index, value as number, false);
    } else {
      setAssets(prev => prev.map((asset, i) => 
        i === index ? { ...asset, [field]: value } : asset
      ));
    }
  };

  const handleSliderChange = (index: number, value: number) => {
    handleAssetAllocationChange(index, value, true);
  };

  const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation, 0) + cashBalance;
  const isAllocationValid = Math.abs(totalAllocation - 100) < 0.1; // Allow for rounding differences

  const handleSave = async () => {
    const strategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: 'smart_rebalance',
      description,
      risk_level: 'low',
      min_capital: minCapital,
      is_active: false,
      account_id: brokerageAccount || undefined,
      asset_class: 'equity',
      time_horizon: 'long_term',
      automation_level: 'fully_auto',
      auto_start: true,
      configuration: {
        allocated_capital: allocatedCapital,
        allocation_method: allocationMethod,
        cash_balance_percent: cashBalance,
        assets: assets.filter(asset => asset.symbol && asset.allocation > 0),
        rebalance_frequency: rebalanceFrequency,
        deviation_threshold_percent: deviationThreshold,
      },
    };

    await onSave(strategy);
  };

  const isValid = strategyName && allocatedCapital > 0 && isAllocationValid && assets.some(asset => asset.symbol && asset.allocation > 0);

  if (step === 'review') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <Card className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Review Smart Rebalance</h2>
                  <p className="text-gray-400">Confirm your strategy configuration</p>
                </div>
              </div>
              <Button variant="ghost" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Strategy Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white ml-2">{strategyName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Allocated Capital:</span>
                    <span className="text-white ml-2">{formatCurrency(allocatedCapital)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Cash Balance:</span>
                    <span className="text-white ml-2">{cashBalance}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Rebalance Frequency:</span>
                    <span className="text-white ml-2 capitalize">{rebalanceFrequency}</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium text-white mb-2">Asset Allocation</h4>
                  <div className="space-y-2">
                    {assets.map((asset, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-400">{asset.symbol}:</span>
                        <span className="text-white">{asset.allocation.toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="secondary" onClick={() => setStep('configure')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Create Smart Rebalance
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

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
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create Smart Rebalance</h2>
                <p className="text-gray-400">Maintain target allocations through automatic rebalancing</p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Strategy Name and Brokerage Account */}
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Brokerage Account</label>
                <select
                  value={brokerageAccount}
                  onChange={(e) => setBrokerageAccount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select an account</option>
                  {brokerageAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} ({account.brokerage.toUpperCase()}) - {account.account_type}
                    </option>
                  ))}
                </select>
                {brokerageAccounts.length === 0 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    No brokerage accounts connected. Go to Accounts to connect one.
                  </p>
                )}
              </div>
            </div>

            {/* Minimum Capital and Allocated Capital */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Capital</label>
                <NumericInput
                  value={minCapital}
                  onChange={setMinCapital}
                  min={100}
                  step={100}
                  prefix="$"
                  placeholder="Enter minimum capital"
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
                  placeholder="Enter allocated capital"
                />
              </div>
            </div>

            {/* Description */}
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

            {/* Smart Rebalance Configuration */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Smart Rebalance Configuration</h3>
              
              {/* Allocation Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">Allocation Method</label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setAllocationMethod('even_split')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      allocationMethod === 'even_split'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <h4 className="font-medium text-white mb-2">Even Split</h4>
                    <p className="text-sm text-gray-400">Equal weight over all allocations</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setAllocationMethod('market_cap_weighted')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      allocationMethod === 'market_cap_weighted'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <h4 className="font-medium text-white mb-2">Market Cap Weighted</h4>
                    <p className="text-sm text-gray-400">Allocation by market cap</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setAllocationMethod('custom')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      allocationMethod === 'custom'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <h4 className="font-medium text-white mb-2">Custom</h4>
                    <p className="text-sm text-gray-400">Manual percentage control</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setAllocationMethod('majority_cash_market_cap')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      allocationMethod === 'majority_cash_market_cap'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <h4 className="font-medium text-white mb-2">Majority Cash + Market Cap</h4>
                    <p className="text-sm text-gray-400">60% cash, 40% market cap weighted</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setAllocationMethod('majority_cash_even_split')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      allocationMethod === 'majority_cash_even_split'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <h4 className="font-medium text-white mb-2">Majority Cash + Even Split</h4>
                    <p className="text-sm text-gray-400">60% cash, 40% evenly split</p>
                  </motion.div>
                </div>
              </div>

              {/* Cash Balance */}
              <div className="mb-6">
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="font-medium text-white">USD Cash Balance</p>
                      <p className="text-sm text-gray-400">
                        {allocationMethod === 'custom' ? 'Manual control - assets auto-balance' : 'Account cash allocation'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      value={cashBalance}
                      onChange={handleCashBalanceChange}
                      min={0}
                      max={100}
                      step={1}
                      className="w-20 text-center"
                    />
                    <span className="text-white">%</span>
                  </div>
                </div>
              </div>

              {/* Portfolio Assets */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-white">Portfolio Assets</h4>
                  <Button onClick={addAsset} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Asset
                  </Button>
                </div>

                {assets.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                    <Target className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 mb-4">No assets added yet</p>
                    <Button onClick={addAsset} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Asset
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assets.map((asset, index) => (
                      <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex-1">
                            <SymbolSearchInput
                              value={asset.symbol}
                              onChange={(value) => updateAsset(index, 'symbol', value)}
                              placeholder="Search symbol"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <NumericInput
                              value={asset.allocation}
                              onChange={(value) => updateAsset(index, 'allocation', value)}
                              min={0}
                              max={100}
                              step={0.01}
                              className="w-20 text-center"
                              allowDecimals={true}
                            />
                            <span className="text-white">%</span>
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
                        
                        {/* Interactive Slider */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Allocation Slider</span>
                            <span className="text-sm text-blue-400">{asset.allocation.toFixed(2)}%</span>
                          </div>
                          <div className="relative">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="0.01"
                              value={asset.allocation}
                              onChange={(e) => handleSliderChange(index, parseFloat(e.target.value))}
                              className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-with-markers"
                              style={{
                                background: `linear-gradient(to right, 
                                  #3b82f6 0%, 
                                  #8b5cf6 ${asset.allocation}%, 
                                  #374151 ${asset.allocation}%, 
                                  #374151 100%)`
                              }}
                            />
                            {/* Slider markers */}
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>0%</span>
                              <span>25%</span>
                              <span>50%</span>
                              <span>75%</span>
                              <span>100%</span>
                            </div>
                          </div>
                          {allocationMethod !== 'custom' && (
                            <p className="text-xs text-yellow-300 mt-1">
                              💡 Using slider will switch to Custom mode for independent control
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            {/* Initial Buy Logic Display - Similar to Grid Bot */}
            {assets.length > 0 && assets.some(asset => asset.symbol && asset.allocation > 0) && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h4 className="font-medium text-green-400 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Initial Portfolio Buy Required
                </h4>
                
                <div className="space-y-3 mb-4">
                  {assets
                    .filter(asset => asset.symbol && asset.allocation > 0)
                    .map((asset, index) => {
                      const investmentAmount = (allocatedCapital * asset.allocation) / 100;
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                              <span className="text-blue-400 font-bold text-sm">
                                {asset.symbol.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-white">{asset.symbol}</p>
                              <p className="text-xs text-gray-400">{asset.allocation.toFixed(2)}% allocation</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-400">
                              {formatCurrency(investmentAmount)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {asset.allocation.toFixed(2)}% of {formatCurrency(allocatedCapital)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <h5 className="font-medium text-blue-300 mb-2">Portfolio Summary</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Total Investment:</span>
                      <span className="text-white ml-2 font-bold">
                        {formatCurrency(allocatedCapital * (100 - cashBalance) / 100)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Cash Reserve:</span>
                      <span className="text-green-400 ml-2 font-bold">
                        {formatCurrency(allocatedCapital * cashBalance / 100)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Assets Count:</span>
                      <span className="text-blue-400 ml-2 font-bold">
                        {assets.filter(asset => asset.symbol && asset.allocation > 0).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Avg per Asset:</span>
                      <span className="text-purple-400 ml-2 font-bold">
                        {assets.filter(asset => asset.symbol && asset.allocation > 0).length > 0
                          ? formatCurrency((allocatedCapital * (100 - cashBalance) / 100) / assets.filter(asset => asset.symbol && asset.allocation > 0).length)
                          : '$0'
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-green-500/20">
                    <p className="text-xs text-green-300">
                      💡 Initial Buy Logic: The bot will purchase each asset according to its allocation percentage, 
                      creating a balanced portfolio that will be maintained through automatic rebalancing.
                    </p>
                  </div>
                </div>
              </div>
            )}

              {/* Allocation Summary */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="font-medium text-white mb-3">Allocation Summary</h4>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Allocation:</span>
                  <span className={`font-bold ${isAllocationValid ? 'text-green-400' : 'text-red-400'}`}>
                    {totalAllocation.toFixed(2)}%
                  </span>
                </div>
                {allocationMethod === 'custom' ? (
                  <p className="text-xs text-blue-300 mt-2">
                    💡 Custom Mode: Sliders work independently - manually balance to 100%
                  </p>
                ) : (
                  <p className="text-xs text-blue-300 mt-2">
                    💡 Auto-Balance Mode: Other assets adjust automatically - use slider to switch to Custom
                  </p>
                )}
                {!isAllocationValid && (
                  <p className="text-sm text-red-400 mt-2">
                    Total allocation must equal 100%
                  </p>
                )}
              </div>
            </div>

              {/* Rebalance Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Rebalance Frequency</label>
                  <select
                    value={rebalanceFrequency}
                    onChange={(e) => setRebalanceFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Deviation Threshold</label>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      value={deviationThreshold}
                      onChange={setDeviationThreshold}
                      min={1}
                      max={50}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-white">%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Trigger rebalancing when allocation drifts by this amount
                  </p>
                </div>
              </div>
            </div>

          <div className="flex gap-4 mt-8">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => setStep('review')} 
              disabled={!isValid}
              className="flex-1"
            >
              Review
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}