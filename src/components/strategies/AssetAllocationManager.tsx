import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Search, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  Percent,
  Building,
  Coins,
  Banknote
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumericInput } from '../ui/NumericInput';
import { formatCurrency } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface AssetAllocationItem {
  symbol: string;
  allocation_percent: number;
  asset_class?: string;
  market_cap?: number;
  name?: string;
  exchange?: string;
}

interface MarketCapData {
  symbol: string;
  market_cap: number;
  price: number;
  name?: string;
  exchange?: string;
  asset_class: string;
}

interface AssetAllocationManagerProps {
  totalCapital: number;
  onTotalCapitalChange: (capital: number) => void;
  assets: AssetAllocationItem[];
  onAssetsChange: (assets: AssetAllocationItem[]) => void;
  allocationMode: 'manual' | 'even_split' | 'market_cap_weighted' | 'majority_cash_even' | 'majority_cash_market_cap';
  onAllocationModeChange: (mode: 'manual' | 'even_split' | 'market_cap_weighted' | 'majority_cash_even' | 'majority_cash_market_cap') => void;
  className?: string;
}

export function AssetAllocationManager({
  totalCapital,
  onTotalCapitalChange,
  assets,
  onAssetsChange,
  allocationMode,
  onAllocationModeChange,
  className = ''
}: AssetAllocationManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MarketCapData[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate total allocation percentage
  const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation_percent, 0);
  const isValidAllocation = Math.abs(totalAllocation - 100) < 0.01; // Allow for floating point precision

  // Search for assets
  const searchAssets = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/market-data/asset-lookup?query=${encodeURIComponent(query)}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.assets || []);
      }
    } catch (error) {
      console.error('Error searching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchAssets(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Add asset to allocation
  const addAsset = (asset: MarketCapData) => {
    // Check if asset already exists
    if (assets.some(a => a.symbol === asset.symbol)) {
      return;
    }

    const newAsset: AssetAllocationItem = {
      symbol: asset.symbol,
      allocation_percent: 0,
      asset_class: asset.asset_class,
      market_cap: asset.market_cap,
      name: asset.name,
      exchange: asset.exchange,
    };

    const newAssets = [...assets, newAsset];
    
    // Auto-normalize if using automatic allocation modes
    if (allocationMode !== 'manual') {
      applyAllocationMode(allocationMode, newAssets);
    } else {
      onAssetsChange(newAssets);
    }

    setSearchQuery('');
    setShowSearch(false);
  };

  // Remove asset from allocation
  const removeAsset = (symbol: string) => {
    const newAssets = assets.filter(a => a.symbol !== symbol);
    
    // Auto-normalize remaining assets
    if (allocationMode !== 'manual' && newAssets.length > 0) {
      applyAllocationMode(allocationMode, newAssets);
    } else {
      onAssetsChange(newAssets);
    }
  };

  // Update individual asset allocation
  const updateAssetAllocation = (symbol: string, percent: number) => {
    const newAssets = assets.map(asset =>
      asset.symbol === symbol ? { ...asset, allocation_percent: percent } : asset
    );
    onAssetsChange(newAssets);
  };

  // Apply allocation mode
  const applyAllocationMode = (mode: string, assetList: AssetAllocationItem[] = assets) => {
    if (assetList.length === 0) return;

    let updatedAssets = [...assetList];

    switch (mode) {
      case 'even_split':
        const evenPercent = 100 / assetList.length;
        updatedAssets = assetList.map(asset => ({
          ...asset,
          allocation_percent: evenPercent
        }));
        break;

      case 'market_cap_weighted':
        const nonCashAssets = assetList.filter(a => a.symbol !== 'CASH');
        const totalMarketCap = nonCashAssets.reduce((sum, asset) => sum + (asset.market_cap || 0), 0);
        
        if (totalMarketCap > 0) {
          updatedAssets = assetList.map(asset => {
            if (asset.symbol === 'CASH') {
              return { ...asset, allocation_percent: 0 };
            }
            return {
              ...asset,
              allocation_percent: ((asset.market_cap || 0) / totalMarketCap) * 100
            };
          });
        }
        break;

      case 'majority_cash_even':
        const cashAsset = assetList.find(a => a.symbol === 'CASH');
        const nonCashAssetsEven = assetList.filter(a => a.symbol !== 'CASH');
        const remainingPercent = nonCashAssetsEven.length > 0 ? 40 / nonCashAssetsEven.length : 0;
        
        updatedAssets = assetList.map(asset => ({
          ...asset,
          allocation_percent: asset.symbol === 'CASH' ? 60 : remainingPercent
        }));
        break;

      case 'majority_cash_market_cap':
        const nonCashAssetsMarketCap = assetList.filter(a => a.symbol !== 'CASH');
        const totalMarketCapForCash = nonCashAssetsMarketCap.reduce((sum, asset) => sum + (asset.market_cap || 0), 0);
        
        if (totalMarketCapForCash > 0) {
          updatedAssets = assetList.map(asset => {
            if (asset.symbol === 'CASH') {
              return { ...asset, allocation_percent: 60 };
            }
            return {
              ...asset,
              allocation_percent: ((asset.market_cap || 0) / totalMarketCapForCash) * 40
            };
          });
        }
        break;

      default:
        // Manual mode - no changes
        break;
    }

    onAssetsChange(updatedAssets);
  };

  // Handle allocation mode change
  const handleAllocationModeChange = (mode: typeof allocationMode) => {
    onAllocationModeChange(mode);
    if (mode !== 'manual') {
      applyAllocationMode(mode);
    }
  };

  // Get asset icon
  const getAssetIcon = (assetClass: string) => {
    switch (assetClass) {
      case 'stock':
      case 'etf':
        return <Building className="w-4 h-4 text-blue-400" />;
      case 'crypto':
        return <Coins className="w-4 h-4 text-orange-400" />;
      case 'cash':
        return <Banknote className="w-4 h-4 text-green-400" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get asset class color
  const getAssetClassColor = (assetClass: string) => {
    switch (assetClass) {
      case 'stock':
      case 'etf':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'crypto':
        return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'cash':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Allocated Capital Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Total Allocated Capital
        </label>
        <NumericInput
          value={totalCapital}
          onChange={onTotalCapitalChange}
          min={1000}
          step={1000}
          prefix="$"
          placeholder="Enter total capital"
          className="text-lg font-semibold"
        />
        <p className="text-xs text-gray-400 mt-1">
          This amount will be distributed among your selected assets
        </p>
      </div>

      {/* Allocation Method Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Allocation Method
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { id: 'manual', label: 'Manual', description: 'Set custom percentages' },
            { id: 'even_split', label: 'Even Split', description: 'Equal allocation across all assets' },
            { id: 'market_cap_weighted', label: 'Market Cap Weighted', description: 'Allocate by market capitalization' },
            { id: 'majority_cash_even', label: '60% Cash + Even', description: '60% cash, 40% split evenly' },
            { id: 'majority_cash_market_cap', label: '60% Cash + Market Cap', description: '60% cash, 40% by market cap' },
          ].map((method) => (
            <motion.div
              key={method.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleAllocationModeChange(method.id as any)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                allocationMode === method.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${
                  allocationMode === method.id ? 'bg-blue-500' : 'bg-gray-500'
                }`} />
                <span className="font-medium text-white text-sm">{method.label}</span>
              </div>
              <p className="text-xs text-gray-400">{method.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Asset Search and Add */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-300">
            Assets in Portfolio
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
        </div>

        {/* Asset Search */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <Card className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search stocks, ETFs, crypto, or type 'CASH'..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {loading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-gray-400">Searching...</span>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.map((asset) => (
                      <motion.div
                        key={asset.symbol}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => addAsset(asset)}
                        className="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg cursor-pointer transition-all border border-gray-700/50 hover:border-gray-600"
                      >
                        <div className="flex items-center gap-3">
                          {getAssetIcon(asset.asset_class)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{asset.symbol}</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${getAssetClassColor(asset.asset_class)}`}>
                                {asset.asset_class}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400">{asset.name}</p>
                            <p className="text-xs text-gray-500">{asset.exchange}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-white">{formatCurrency(asset.price)}</p>
                          {asset.market_cap > 0 && (
                            <p className="text-xs text-gray-400">
                              {asset.market_cap >= 1000 
                                ? `$${(asset.market_cap / 1000).toFixed(1)}T` 
                                : `$${asset.market_cap.toFixed(0)}B`} cap
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {searchQuery && !loading && searchResults.length === 0 && (
                  <div className="text-center py-4 text-gray-400">
                    <p>No assets found for "{searchQuery}"</p>
                    <p className="text-xs mt-1">Try searching for popular stocks like AAPL, MSFT, or crypto like BTC/USD</p>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current Assets */}
        <div className="space-y-3">
          {assets.map((asset, index) => (
            <motion.div
              key={asset.symbol}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50"
            >
              <div className="flex items-center gap-3 flex-1">
                {getAssetIcon(asset.asset_class || 'stock')}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{asset.symbol}</span>
                    {asset.asset_class && (
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getAssetClassColor(asset.asset_class)}`}>
                        {asset.asset_class}
                      </span>
                    )}
                  </div>
                  {asset.name && (
                    <p className="text-sm text-gray-400">{asset.name}</p>
                  )}
                  {asset.market_cap && asset.market_cap > 0 && (
                    <p className="text-xs text-gray-500">
                      {asset.market_cap >= 1000 
                        ? `$${(asset.market_cap / 1000).toFixed(1)}T` 
                        : `$${asset.market_cap.toFixed(0)}B`} market cap
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-24">
                  <NumericInput
                    value={asset.allocation_percent}
                    onChange={(value) => updateAssetAllocation(asset.symbol, value)}
                    min={0}
                    max={100}
                    step={0.1}
                    suffix="%"
                    disabled={allocationMode !== 'manual'}
                    className="text-center"
                  />
                </div>
                
                <div className="text-right min-w-[80px]">
                  <p className="font-medium text-white text-sm">
                    {formatCurrency((totalCapital * asset.allocation_percent) / 100)}
                  </p>
                </div>

                {asset.symbol !== 'CASH' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAsset(asset.symbol)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}

          {assets.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p>No assets selected</p>
              <p className="text-xs">Add assets to create your allocation</p>
            </div>
          )}
        </div>
      </div>

      {/* Allocation Summary */}
      {assets.length > 0 && (
        <Card className={`p-4 ${isValidAllocation ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isValidAllocation ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              )}
              <span className="font-medium text-white">Allocation Summary</span>
            </div>
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-gray-400" />
              <span className={`font-bold ${isValidAllocation ? 'text-green-400' : 'text-yellow-400'}`}>
                {totalAllocation.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Capital:</span>
              <span className="text-white ml-2 font-medium">{formatCurrency(totalCapital)}</span>
            </div>
            <div>
              <span className="text-gray-400">Assets:</span>
              <span className="text-white ml-2 font-medium">{assets.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Allocation:</span>
              <span className={`ml-2 font-medium ${isValidAllocation ? 'text-green-400' : 'text-yellow-400'}`}>
                {totalAllocation.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className={`ml-2 font-medium ${isValidAllocation ? 'text-green-400' : 'text-yellow-400'}`}>
                {isValidAllocation ? 'Ready' : 'Needs adjustment'}
              </span>
            </div>
          </div>

          {!isValidAllocation && (
            <div className="mt-3 pt-3 border-t border-yellow-500/20">
              <p className="text-sm text-yellow-300">
                Total allocation must equal 100%. Current total: {totalAllocation.toFixed(2)}%
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Capital Preview */}
      {assets.length > 0 && totalCapital > 0 && (
        <Card className="p-4">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Capital Distribution Preview
          </h4>
          <div className="space-y-2">
            {assets.map((asset) => (
              <div key={asset.symbol} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getAssetIcon(asset.asset_class || 'stock')}
                  <span className="text-gray-300">{asset.symbol}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{asset.allocation_percent.toFixed(2)}%</span>
                  <span className="font-medium text-white min-w-[80px] text-right">
                    {formatCurrency((totalCapital * asset.allocation_percent) / 100)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}