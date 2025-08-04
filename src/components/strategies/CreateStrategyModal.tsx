import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, AlertTriangle, DollarSign, Plus, Minus, Brain, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy, AssetAllocation, MarketCapData } from '../../types';
import { supabase } from '../../lib/supabase';

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => void;
}

const strategyTypes = [
  {
    type: 'spot_grid' as const,
    name: 'Spot Grid Bot',
    description: 'Automates buy-low/sell-high trades within a defined price range',
    risk: 'low' as const,
    minCapital: 1000,
  },
  {
    type: 'futures_grid' as const,
    name: 'Futures Grid Bot',
    description: 'Grid trading on futures market with leverage support',
    risk: 'medium' as const,
    minCapital: 2000,
  },
  {
    type: 'infinity_grid' as const,
    name: 'Infinity Grid Bot',
    description: 'Grid trading without upper price limit for trending markets',
    risk: 'medium' as const,
    minCapital: 1500,
  },
  {
    type: 'dca' as const,
    name: 'DCA Bot (Dollar-Cost Averaging)',
    description: 'Automatically invests at fixed intervals to minimize volatility risk',
    risk: 'low' as const,
    minCapital: 500,
  },
  {
    type: 'smart_rebalance' as const,
    name: 'Smart Rebalance Bot',
    description: 'Maintains target allocations in a portfolio of selected coins',
    risk: 'low' as const,
    minCapital: 5000,
  },
  {
    type: 'covered_calls' as const,
    name: 'Covered Calls',
    description: 'Generate income by selling call options on owned stocks',
    risk: 'low' as const,
    minCapital: 15000,
  },
  {
    type: 'iron_condor' as const,
    name: 'Iron Condor',
    description: 'Profit from low volatility with defined risk spreads',
    risk: 'medium' as const,
    minCapital: 5000,
  },
  {
    type: 'straddle' as const,
    name: 'Long Straddle',
    description: 'Profit from high volatility in either direction',
    risk: 'medium' as const,
    minCapital: 8000,
  },
  {
    type: 'wheel' as const,
    name: 'The Wheel',
    description: 'Systematic approach combining puts and covered calls',
    risk: 'low' as const,
    minCapital: 20000,
  },
  {
    type: 'orb' as const,
    name: 'Opening Range Breakout (ORB)',
    description: 'Trade breakouts from the first 15-30 minutes of market open',
    risk: 'medium' as const,
    minCapital: 5000,
  },
];

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const [selectedType, setSelectedType] = useState<TradingStrategy['type'] | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [symbol, setSymbol] = useState('');
  const [minCapital, setMinCapital] = useState(10000);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [assets, setAssets] = useState<AssetAllocation[]>([
    { symbol: 'BTC', allocation: 50 },
    { symbol: 'ETH', allocation: 30 },
    { symbol: 'USDT', allocation: 20 },
  ]);
  const [isAllocatingByMarketCap, setIsAllocatingByMarketCap] = useState(false);

  const fetchMarketCapData = async (symbols: string[]): Promise<MarketCapData[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No valid session found. Please log in again.');
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/market-cap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ symbols }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch market cap data: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching market cap data:', error);
      // Fallback to mock data if API fails
      const mockMarketCapData: MarketCapData[] = [
        { symbol: 'BTC', market_cap: 850000000000, price: 43500, name: 'Bitcoin' },
        { symbol: 'ETH', market_cap: 280000000000, price: 2650, name: 'Ethereum' },
        { symbol: 'ADA', market_cap: 18000000000, price: 0.52, name: 'Cardano' },
        { symbol: 'SOL', market_cap: 45000000000, price: 105, name: 'Solana' },
        { symbol: 'DOT', market_cap: 9000000000, price: 7.2, name: 'Polkadot' },
        { symbol: 'MATIC', market_cap: 8500000000, price: 0.92, name: 'Polygon' },
        { symbol: 'AVAX', market_cap: 14000000000, price: 38, name: 'Avalanche' },
        { symbol: 'LINK', market_cap: 8200000000, price: 14.5, name: 'Chainlink' },
        { symbol: 'UNI', market_cap: 5000000000, price: 8.3, name: 'Uniswap' },
        { symbol: 'ATOM', market_cap: 3800000000, price: 12.8, name: 'Cosmos' },
        { symbol: 'USDT', market_cap: 95000000000, price: 1.0, name: 'Tether' },
        { symbol: 'USDC', market_cap: 25000000000, price: 1.0, name: 'USD Coin' },
      ];

      return mockMarketCapData.filter(data => 
        symbols.map(s => s.toUpperCase()).includes(data.symbol.toUpperCase())
      );
    }
  };

  const handleAllocateByMarketCap = async () => {
    if (assets.length === 0) {
      alert('Please add at least one asset before using AI allocation.');
      return;
    }

    const validAssets = assets.filter(asset => asset.symbol.trim() !== '');
    if (validAssets.length === 0) {
      alert('Please enter valid asset symbols before using AI allocation.');
      return;
    }

    setIsAllocatingByMarketCap(true);

    try {
      const symbols = validAssets.map(asset => asset.symbol.toUpperCase());
      const marketCapData = await fetchMarketCapData(symbols);

      if (marketCapData.length === 0) {
        alert('Could not fetch market cap data for the provided symbols. Please check the symbols and try again.');
        return;
      }

      // Calculate total market cap
      const totalMarketCap = marketCapData.reduce((sum, data) => sum + data.market_cap, 0);

      // Calculate proportional allocations
      const newAssets = assets.map(asset => {
        const marketData = marketCapData.find(data => 
          data.symbol.toUpperCase() === asset.symbol.toUpperCase()
        );
        
        if (marketData) {
          const allocation = Math.round((marketData.market_cap / totalMarketCap) * 100);
          return { ...asset, allocation };
        }
        
        return asset; // Keep original allocation if no market data found
      });

      setAssets(newAssets);
    } catch (error) {
      console.error('Error fetching market cap data:', error);
      alert('Failed to fetch market cap data. Please try again later.');
    } finally {
      setIsAllocatingByMarketCap(false);
    }
  };

  const addAsset = () => {
    if (assets.length < 12) { // Max 12 assets
      setAssets([...assets, { symbol: '', allocation: 0 }]);
    }
  };

  const removeAsset = (index: number) => {
    if (assets.length > 2) { // Minimum 2 assets
      setAssets(assets.filter((_, i) => i !== index));
    }
  };

  const updateAsset = (index: number, field: keyof AssetAllocation, value: string | number) => {
    const newAssets = [...assets];
    newAssets[index] = { ...newAssets[index], [field]: value };
    setAssets(newAssets);
  };

  const getTotalAllocation = () => {
    return assets.reduce((sum, asset) => sum + (asset.allocation || 0), 0);
  };

  const isAllocationValid = () => {
    const total = getTotalAllocation();
    return total === 100;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !name || !symbol) return;

    // Additional validation for smart_rebalance
    if (selectedType === 'smart_rebalance') {
      const validAssets = assets.filter(asset => asset.symbol.trim() !== '' && asset.allocation > 0);
      if (validAssets.length < 2) {
        alert('Smart Rebalance strategy requires at least 2 assets with valid symbols and allocations.');
        return;
      }
      if (!isAllocationValid()) {
        alert('Asset allocations must sum to exactly 100%.');
        return;
      }
    }

    const strategy: Omit<TradingStrategy, 'id'> = {
      name,
      type: selectedType,
      description: description || `${selectedType} strategy for ${symbol}`,
      risk_level: riskLevel,
      min_capital: minCapital,
      is_active: false,
      configuration: {
        symbol: symbol.toUpperCase(),
        // Add default configuration based on strategy type
        ...(selectedType === 'spot_grid' && {
          price_range_lower: 0,
          price_range_upper: 0,
          number_of_grids: 25,
          grid_spacing_percent: 1.0,
          mode: 'auto', // 'auto' or 'customize'
        }),
        ...(selectedType === 'futures_grid' && {
          direction: 'long', // 'long' or 'short'
          leverage: 3,
          price_range_lower: 0,
          price_range_upper: 0,
          number_of_grids: 20,
          margin_amount: 1000,
        }),
        ...(selectedType === 'infinity_grid' && {
          lowest_price: 0,
          profit_per_grid_percent: 1.0,
          mode: 'auto', // 'auto' or 'customize'
        }),
        ...(selectedType === 'dca' && {
          investment_amount_per_interval: 100,
          frequency: 'daily', // 'hourly', '4h', '8h', '12h', 'daily', 'weekly'
          investment_target_percent: 20, // Optional profit target
        }),
        ...(selectedType === 'smart_rebalance' && {
          assets: assets.filter(asset => asset.symbol.trim() !== '' && asset.allocation > 0),
          trigger_type: 'threshold', // 'time' or 'threshold'
          rebalance_frequency: 'daily', // for time-based
          threshold_deviation_percent: 5, // for threshold-based
        }),
        ...(selectedType === 'covered_calls' && {
          strike_delta: 0.30,
          dte_target: 30,
          profit_target: 0.5,
        }),
        ...(selectedType === 'iron_condor' && {
          wing_width: 10,
          dte_target: 45,
          profit_target: 0.25,
        }),
        ...(selectedType === 'orb' && {
          orb_period: 15, // minutes
          breakout_threshold: 0.002, // 0.2%
          stop_loss: 0.01, // 1%
          take_profit: 0.02, // 2%
        }),
      },
    };

    onSave(strategy);
  };

  const selectedStrategyType = strategyTypes.find(s => s.type === selectedType);

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
              <h2 className="text-2xl font-bold text-white mb-2">Create New Strategy</h2>
              <p className="text-gray-400">Configure your automated trading bot</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Strategy Type Selection */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Choose Strategy Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {strategyTypes.map((strategy) => (
                  <motion.div
                    key={strategy.type}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedType(strategy.type);
                      setRiskLevel(strategy.risk);
                      setMinCapital(strategy.minCapital);
                    }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedType === strategy.type
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <h4 className="font-medium text-white mb-2">{strategy.name}</h4>
                    <p className="text-sm text-gray-400 mb-3">{strategy.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        strategy.risk === 'low' ? 'bg-green-400/10 text-green-400' :
                        strategy.risk === 'medium' ? 'bg-yellow-400/10 text-yellow-400' :
                        'bg-red-400/10 text-red-400'
                      }`}>
                        {strategy.risk} risk
                      </span>
                      <span className="text-xs text-gray-500">
                        ${strategy.minCapital.toLocaleString()} min
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {selectedType && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Basic Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Strategy Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="My Trading Strategy"
                      required
                    />
                  </div>

                  {selectedType !== 'smart_rebalance' && (
                    <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Symbol *
                    </label>
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="AAPL, SPY, BTCUSD"
                      required
                    />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      onChange={(e) => setRiskLevel(e.target.value as any)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Minimum Capital
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="number"
                        value={minCapital}
                        onChange={(e) => setMinCapital(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1000"
                        step="1000"
                      />
                    </div>
                  </div>
                </div>

                {/* Smart Rebalance Asset Configuration */}
                {selectedType === 'smart_rebalance' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">Asset Allocations</h4>
                        <p className="text-sm text-gray-400">Configure your portfolio allocation (must sum to 100%)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAllocateByMarketCap}
                          disabled={isAllocatingByMarketCap || assets.filter(a => a.symbol.trim()).length === 0}
                          className="flex items-center gap-2"
                        >
                          {isAllocatingByMarketCap ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Brain className="w-4 h-4" />
                          )}
                          {isAllocatingByMarketCap ? 'Allocating...' : 'Allocate by Market Cap (AI)'}
                        </Button>
                      </div>
                    </div>

                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <div className="space-y-3">
                        {assets.map((asset, index) => (
                          <div key={index} className="grid grid-cols-12 gap-3 items-center">
                            <div className="col-span-5">
                              <input
                                type="text"
                                value={asset.symbol}
                                onChange={(e) => updateAsset(index, 'symbol', e.target.value.toUpperCase())}
                                placeholder="Symbol (e.g., BTC)"
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="col-span-4">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={asset.allocation}
                                  onChange={(e) => updateAsset(index, 'allocation', Number(e.target.value))}
                                  placeholder="Allocation %"
                                  min="0"
                                  max="100"
                                  step="1"
                                  className="w-full px-3 py-2 pr-8 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                              </div>
                            </div>
                            <div className="col-span-3 flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={addAsset}
                                disabled={assets.length >= 12}
                                className="p-2"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAsset(index)}
                                disabled={assets.length <= 2}
                                className="p-2 text-red-400 hover:text-red-300"
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Total Allocation:</span>
                          <span className={`font-semibold ${
                            isAllocationValid() ? 'text-green-400' : 
                            getTotalAllocation() > 100 ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {getTotalAllocation()}%
                          </span>
                        </div>
                        {!isAllocationValid() && (
                          <p className="text-sm text-yellow-400 mt-2">
                            {getTotalAllocation() > 100 
                              ? 'Total allocation exceeds 100%. Please adjust the percentages.'
                              : 'Total allocation must equal 100% to create the strategy.'
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Brain className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-400 mb-2">AI Market Cap Allocation</h4>
                          <p className="text-sm text-blue-300 mb-2">
                            The AI allocation feature automatically distributes your portfolio based on each asset's market capitalization.
                          </p>
                          <ul className="text-sm text-blue-300 space-y-1">
                            <li>• Larger market cap assets receive higher allocation percentages</li>
                            <li>• Allocations are calculated proportionally to total market cap</li>
                            <li>• Perfect for market-weighted diversification strategies</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Strategy-specific configuration preview */}
                {selectedStrategyType && (
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      <h4 className="font-medium text-white">Strategy Configuration</h4>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                      Default settings will be applied. You can customize these after creation.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {selectedType === 'smart_rebalance' && (
                        <>
                          <div>
                            <span className="text-gray-400">Trigger Type:</span>
                            <span className="text-white ml-2">Threshold</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Threshold:</span>
                            <span className="text-white ml-2">5% deviation</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Assets:</span>
                            <span className="text-white ml-2">{assets.filter(a => a.symbol.trim()).length} configured</span>
                          </div>
                        </>
                      )}
                      {selectedType === 'covered_calls' && (
                        <>
                          <div>
                            <span className="text-gray-400">Strike Delta:</span>
                            <span className="text-white ml-2">0.30</span>
                          </div>
                          <div>
                            <span className="text-gray-400">DTE Target:</span>
                            <span className="text-white ml-2">30 days</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Profit Target:</span>
                            <span className="text-white ml-2">50%</span>
                          </div>
                        </>
                      )}
                      {selectedType === 'iron_condor' && (
                        <>
                          <div>
                            <span className="text-gray-400">Wing Width:</span>
                            <span className="text-white ml-2">$10</span>
                          </div>
                          <div>
                            <span className="text-gray-400">DTE Target:</span>
                            <span className="text-white ml-2">45 days</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Profit Target:</span>
                            <span className="text-white ml-2">25%</span>
                          </div>
                        </>
                      )}
                      {selectedType === 'martingale' && (
                        <>
                          <div>
                            <span className="text-gray-400">Base Size:</span>
                            <span className="text-white ml-2">0.01</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Max Levels:</span>
                            <span className="text-white ml-2">5</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Grid Spacing:</span>
                            <span className="text-white ml-2">2%</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Warning for high-risk strategies */}
                {riskLevel === 'high' && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <h4 className="font-medium text-red-400">High Risk Strategy</h4>
                    </div>
                    <p className="text-sm text-red-300">
                      This strategy involves significant risk and can result in substantial losses. 
                      Please ensure you understand the risks and have appropriate risk management in place.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-800">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !selectedType || 
                  !name || 
                  (selectedType !== 'smart_rebalance' && !symbol) ||
                  (selectedType === 'smart_rebalance' && (!isAllocationValid() || assets.filter(a => a.symbol.trim()).length < 2))
                }
                className="flex-1"
              >
                Create Strategy
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}