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
  const [symbol, setSymbol] = useState('');
  const [minCapital, setMinCapital] = useState(10000);
  
  // Grid bot specific states
  const [priceRangeLower, setPriceRangeLower] = useState<number>(0);
  const [priceRangeUpper, setPriceRangeUpper] = useState<number>(0);
  const [numberOfGrids, setNumberOfGrids] = useState<number>(20);
  const [totalInvestment, setTotalInvestment] = useState<number>(1000);
  const [triggerPrice, setTriggerPrice] = useState<number | undefined>(undefined);
  const [takeProfit, setTakeProfit] = useState<number | undefined>(undefined);
  const [stopLoss, setStopLoss] = useState<number | undefined>(undefined);
  const [gridMode, setGridMode] = useState<'arithmetic' | 'geometric'>('arithmetic');
  const [takeProfitType, setTakeProfitType] = useState<'amount' | 'percentage'>('amount');
  const [stopLossType, setStopLossType] = useState<'amount' | 'percentage'>('amount');
  
  // Capital allocation
  const [totalAvailableCapital] = useState(250000); // Mock total available capital
  const [allocatedCapitalPercentage, setAllocatedCapitalPercentage] = useState(50);
  const currentAllocatedCapital = (totalAvailableCapital * allocatedCapitalPercentage) / 100;
  
  const [assets, setAssets] = useState<AssetAllocation[]>([
    { symbol: 'BTC', allocation: 50 },
    { symbol: 'ETH', allocation: 30 },
    { symbol: 'USDT', allocation: 20 },
  ]);
  const [isAllocatingByMarketCap, setIsAllocatingByMarketCap] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAllocatedCapitalPercentage(Number(e.target.value));
  };

  const handleSliderSnap = () => {
    const snapPoints = [0, 25, 50, 75, 100];
    const threshold = 3; // 3% threshold for snapping
    
    for (const point of snapPoints) {
      if (Math.abs(allocatedCapitalPercentage - point) <= threshold) {
        setAllocatedCapitalPercentage(point);
        break;
      }
    }
  };

  const fetchMarketCapData = async (symbols: string[]): Promise<MarketCapData[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No valid session found. Please log in again.');
    }

    try {
      // Use the new market data endpoint for real-time quotes
      const symbolsParam = symbols.join(',');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/market-data/quotes?symbols=${symbolsParam}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch market data: ${response.status}`);
      }

      const result = await response.json();
      
      // Transform quotes data to market cap format for allocation
      const marketCapData: MarketCapData[] = [];
      
      if (result.quotes) {
        Object.entries(result.quotes).forEach(([symbol, quote]: [string, any]) => {
          // Estimate market cap based on price (this is simplified)
          // In a real implementation, you'd need actual market cap data
          const estimatedMarketCap = quote.bid_price * 1000000000; // Simplified estimation
          
          marketCapData.push({
            symbol: symbol,
            market_cap: estimatedMarketCap,
            price: quote.bid_price || quote.ask_price || 0,
            name: symbol, // You might want to add a name mapping
          });
        });
      }
      
      return marketCapData;
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Fallback to mock data if API fails
      const mockMarketCapData: MarketCapData[] = [
        // Cryptocurrencies
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
        // Major Stocks
        { symbol: 'AAPL', market_cap: 3000000000000, price: 195.50, name: 'Apple Inc.' },
        { symbol: 'MSFT', market_cap: 2800000000000, price: 375.25, name: 'Microsoft Corporation' },
        { symbol: 'GOOGL', market_cap: 1700000000000, price: 140.75, name: 'Alphabet Inc.' },
        { symbol: 'AMZN', market_cap: 1500000000000, price: 155.20, name: 'Amazon.com Inc.' },
        { symbol: 'NVDA', market_cap: 1800000000000, price: 740.50, name: 'NVIDIA Corporation' },
        { symbol: 'TSLA', market_cap: 800000000000, price: 250.80, name: 'Tesla Inc.' },
        { symbol: 'META', market_cap: 750000000000, price: 295.40, name: 'Meta Platforms Inc.' },
        { symbol: 'SPY', market_cap: 450000000000, price: 475.30, name: 'SPDR S&P 500 ETF' },
        { symbol: 'QQQ', market_cap: 200000000000, price: 385.60, name: 'Invesco QQQ Trust' },
        { symbol: 'VTI', market_cap: 300000000000, price: 245.75, name: 'Vanguard Total Stock Market ETF' },
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

    console.log('Submitting strategy...');
    if (!selectedType || !name) {
      console.warn('Missing required fields:', { selectedType, name });
      alert('Please fill in all required fields.');
      return;
    }

    // Validate symbol for non-smart_rebalance strategies
    if (selectedType !== 'smart_rebalance' && !symbol) {
      console.warn('Symbol required for strategy type:', selectedType);
      alert('Symbol is required for this strategy type.');
      return;
    }

    // Validate grid bot specific requirements
    const isGridBot = ['spot_grid', 'futures_grid', 'infinity_grid'].includes(selectedType);
    if (isGridBot) {
      if (selectedType !== 'infinity_grid' && (priceRangeLower <= 0 || priceRangeUpper <= 0 || priceRangeLower >= priceRangeUpper)) {
        alert('Please set a valid price range (lower price must be less than upper price and both must be greater than 0).');
        return;
      }
      if (numberOfGrids < 2 || numberOfGrids > 1000) {
        alert('Number of grids must be between 2 and 1000.');
        return;
      }
      if (totalInvestment <= 0) {
        alert('Total investment must be greater than 0.');
        return;
      }
    }
    // Validate smart_rebalance specific requirements
    if (selectedType === 'smart_rebalance') {
      const validAssets = assets.filter(asset => asset.symbol.trim() !== '' && asset.allocation > 0);
      console.log('Valid assets for smart_rebalance:', validAssets);
      console.log('Total allocation:', getTotalAllocation());
      
      if (validAssets.length < 2) {
        alert('Smart Rebalance strategy requires at least 2 assets with valid symbols and allocations.');
        return;
      }
      if (!isAllocationValid()) {
        alert(`Asset allocations must sum to exactly 100%. Current total: ${getTotalAllocation()}%`);
        return;
      }
    }

    const strategy: Omit<TradingStrategy, 'id'> = {
      name,
      type: selectedType,
      description: selectedType === 'smart_rebalance' 
        ? `${selectedType} strategy with ${assets.filter(a => a.symbol.trim()).length} assets`
        : `${selectedType} strategy for ${symbol}`,
      risk_level: 'medium', // Will be calculated by backend based on backtesting metrics
      min_capital: minCapital,
      is_active: false,
      configuration: {
        ...(selectedType !== 'smart_rebalance' && { symbol: symbol.toUpperCase() }),
        // Add default configuration based on strategy type
        ...(selectedType === 'spot_grid' && {
          price_range_lower: priceRangeLower,
          price_range_upper: priceRangeUpper,
          number_of_grids: numberOfGrids,
          total_investment: currentAllocatedCapital,
          allocated_capital: currentAllocatedCapital,
          trigger_price: triggerPrice,
          take_profit: takeProfit ? { value: takeProfit, type: takeProfitType } : undefined,
          stop_loss: stopLoss ? { value: stopLoss, type: stopLossType } : undefined,
          grid_mode: gridMode,
        }),
        ...(selectedType === 'futures_grid' && {
          price_range_lower: priceRangeLower,
          price_range_upper: priceRangeUpper,
          number_of_grids: numberOfGrids,
          total_investment: currentAllocatedCapital,
          allocated_capital: currentAllocatedCapital,
          trigger_price: triggerPrice,
          take_profit: takeProfit ? { value: takeProfit, type: takeProfitType } : undefined,
          stop_loss: stopLoss ? { value: stopLoss, type: stopLossType } : undefined,
          grid_mode: gridMode,
          direction: 'long',
          leverage: 3,
        }),
        ...(selectedType === 'infinity_grid' && {
          price_range_lower: priceRangeLower,
          number_of_grids: numberOfGrids,
          total_investment: currentAllocatedCapital,
          allocated_capital: currentAllocatedCapital,
          trigger_price: triggerPrice,
          take_profit: takeProfit ? { value: takeProfit, type: takeProfitType } : undefined,
          stop_loss: stopLoss ? { value: stopLoss, type: stopLossType } : undefined,
          grid_mode: gridMode,
        }),
        ...(selectedType === 'dca' && {
          investment_amount_per_interval: Math.max(10, currentAllocatedCapital / 365), // Daily amount based on allocated capital
          allocated_capital: currentAllocatedCapital,
          frequency: 'daily', // 'hourly', '4h', '8h', '12h', 'daily', 'weekly'
          investment_target_percent: 20, // Optional profit target
        }),
        ...(selectedType === 'smart_rebalance' && {
          assets: assets.filter(asset => asset.symbol.trim() !== '' && asset.allocation > 0),
          allocated_capital: currentAllocatedCapital,
          trigger_type: 'threshold', // 'time' or 'threshold'
          rebalance_frequency: 'daily', // for time-based
          threshold_deviation_percent: 5, // for threshold-based
        }),
        ...(selectedType === 'covered_calls' && {
          allocated_capital: currentAllocatedCapital,
          strike_delta: 0.30,
          dte_target: 30,
          profit_target: 0.5,
        }),
        ...(selectedType === 'iron_condor' && {
          allocated_capital: currentAllocatedCapital,
          wing_width: 10,
          dte_target: 45,
          profit_target: 0.25,
        }),
        ...(selectedType === 'orb' && {
          allocated_capital: currentAllocatedCapital,
          orb_period: 15, // minutes
          breakout_threshold: 0.002, // 0.2%
          stop_loss: 0.01, // 1%
          take_profit: 0.02, // 2%
        }),
      },
    };

    console.log('Strategy to be saved:', strategy);

    try {
      onSave(strategy);
      console.log('Strategy saved successfully');
    } catch (err) {
      console.error('onSave failed:', err);
      alert('Failed to save strategy. Please try again.');
    }
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
              {/* Capital Allocation Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Capital Allocation</h3>
                
                <div className="bg-gray-800/30 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-400">Available Capital</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(totalAvailableCapital)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Allocated Amount</p>
                      <p className="text-xl font-bold text-blue-400">{formatCurrency(currentAllocatedCapital)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={allocatedCapitalPercentage}
                        onChange={handleSliderChange}
                        onMouseUp={handleSliderSnap}
                        onTouchEnd={handleSliderSnap}
                        className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-with-markers"
                        style={{
                          background: `linear-gradient(to right, 
                            #3b82f6 0%, 
                            #3b82f6 ${allocatedCapitalPercentage}%, 
                            #374151 ${allocatedCapitalPercentage}%, 
                            #374151 100%)`
                        }}
                      />
                      
                      {/* Snap point markers */}
                      <div className="absolute top-0 left-0 w-full h-3 pointer-events-none">
                        {[25, 50, 75, 100].map((point) => (
                          <div
                            key={point}
                            className="absolute w-1 h-3 bg-white/60 rounded-full"
                            style={{ left: `${point}%`, transform: 'translateX(-50%)' }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">0%</span>
                      <div className="flex gap-4 text-gray-400">
                        <span className="text-xs">25%</span>
                        <span className="text-xs">50%</span>
                        <span className="text-xs">75%</span>
                      </div>
                      <span className="text-gray-400">100%</span>
                    </div>
                    
                    <div className="text-center">
                      <span className="text-lg font-bold text-blue-400">{allocatedCapitalPercentage}%</span>
                      <span className="text-gray-400 ml-2">of available capital</span>
                    </div>
                    
                    {currentAllocatedCapital < minCapital && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          <p className="text-sm text-yellow-400">
                            Allocated capital ({formatCurrency(currentAllocatedCapital)}) is below the minimum required ({formatCurrency(minCapital)}) for this strategy.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
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

                {/* Grid Bot Specific Configuration Fields */}
                {selectedType && ['spot_grid', 'futures_grid', 'infinity_grid'].includes(selectedType) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-semibold text-white">Grid Bot Configuration</h3>

                    {/* Price Range */}
                    {selectedType !== 'infinity_grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Lowest Price (USD)
                          </label>
                          <input
                            type="number"
                            value={priceRangeLower}
                            onChange={(e) => setPriceRangeLower(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Lowest price USD"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Highest Price (USD)
                          </label>
                          <input
                            type="number"
                            value={priceRangeUpper}
                            onChange={(e) => setPriceRangeUpper(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Highest price USD"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Lowest Price (USD)
                        </label>
                        <input
                          type="number"
                          value={priceRangeLower}
                          onChange={(e) => setPriceRangeLower(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Lowest price USD"
                          min="0"
                          step="0.01"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Infinity grid has no upper price limit
                        </p>
                      </div>
                    )}

                    {/* Grids and Investment */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Quantity of Grids (2-1000)
                        </label>
                        <input
                          type="number"
                          value={numberOfGrids}
                          onChange={(e) => setNumberOfGrids(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Number of grids"
                          min="2"
                          max="1000"
                        />
                        {numberOfGrids > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            Profit/grid: ~{(currentAllocatedCapital / numberOfGrids).toFixed(2)} USD (fee deducted)
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Allocated Investment
                        </label>
                        <div className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-400">{formatCurrency(currentAllocatedCapital)}</p>
                            <p className="text-sm text-gray-400">From capital allocation slider above</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="bg-gray-800/30 rounded-lg p-6">
                      <h4 className="font-semibold text-white mb-4">Advanced Settings</h4>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Trigger Price (USD, Optional)
                          </label>
                          <input
                            type="number"
                            value={triggerPrice || ''}
                            onChange={(e) => setTriggerPrice(e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Trigger price (USD)"
                            step="0.01"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Take Profit (Optional)
                            </label>
                            <div className="flex rounded-lg bg-gray-800 border border-gray-700 overflow-hidden mb-2">
                              <button
                                type="button"
                                onClick={() => setTakeProfitType('amount')}
                                className={`flex-1 px-3 py-2 text-center text-xs font-medium transition-colors ${
                                  takeProfitType === 'amount'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-700'
                                }`}
                              >
                                USD Amount
                              </button>
                              <button
                                type="button"
                                onClick={() => setTakeProfitType('percentage')}
                                className={`flex-1 px-3 py-2 text-center text-xs font-medium transition-colors ${
                                  takeProfitType === 'percentage'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-700'
                                }`}
                              >
                                Percentage
                              </button>
                            </div>
                            <input
                              type="number"
                              value={takeProfit || ''}
                              onChange={(e) => setTakeProfit(e.target.value ? Number(e.target.value) : undefined)}
                              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={takeProfitType === 'amount' ? "Take Profit (USD)" : "Take Profit (%)"}
                              step={takeProfitType === 'amount' ? "0.01" : "0.1"}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Stop Loss (Optional)
                            </label>
                            <div className="flex rounded-lg bg-gray-800 border border-gray-700 overflow-hidden mb-2">
                              <button
                                type="button"
                                onClick={() => setStopLossType('amount')}
                                className={`flex-1 px-3 py-2 text-center text-xs font-medium transition-colors ${
                                  stopLossType === 'amount'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-700'
                                }`}
                              >
                                USD Amount
                              </button>
                              <button
                                type="button"
                                onClick={() => setStopLossType('percentage')}
                                className={`flex-1 px-3 py-2 text-center text-xs font-medium transition-colors ${
                                  stopLossType === 'percentage'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-700'
                                }`}
                              >
                                Percentage
                              </button>
                            </div>
                            <input
                              type="number"
                              value={stopLoss || ''}
                              onChange={(e) => setStopLoss(e.target.value ? Number(e.target.value) : undefined)}
                              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={stopLossType === 'amount' ? "Stop Loss (USD)" : "Stop Loss (%)"}
                              step={stopLossType === 'amount' ? "0.01" : "0.1"}
                            />
                          </div>
                        </div>

                        {/* Grid Mode Toggle */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-3">Grid Mode</label>
                          <div className="flex rounded-lg bg-gray-800 border border-gray-700 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setGridMode('geometric')}
                              className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
                                gridMode === 'geometric'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-300 hover:bg-gray-700'
                              }`}
                            >
                              Geometric
                            </button>
                            <button
                              type="button"
                              onClick={() => setGridMode('arithmetic')}
                              className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
                                gridMode === 'arithmetic'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-300 hover:bg-gray-700'
                              }`}
                            >
                              Arithmetic
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            {gridMode === 'arithmetic'
                              ? 'Equal price differences between grids (e.g., $100, $200, $300). More effective in bullish markets.'
                              : 'Equal percentage changes between grids (e.g., $100, $200, $400). More effective in bearish markets or high volatility.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Grid Mode Explanation */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-400 mb-2">Grid Mode Selection</h4>
                          <div className="space-y-2 text-sm text-blue-300">
                            <p><strong>Arithmetic Mode:</strong> Equal price differences between grids (e.g., $100, $200, $300, $400). More effective in bullish markets where prices trend upward steadily.</p>
                            <p><strong>Geometric Mode:</strong> Equal percentage changes between grids (e.g., $100, $200, $400, $800). More effective in bearish markets or high volatility scenarios.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

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
                                placeholder="Symbol (e.g., BTC, AAPL, SPY)"
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
                            The AI allocation feature automatically distributes your portfolio based on each asset's market capitalization (supports both stocks and crypto).
                          </p>
                          <ul className="text-sm text-blue-300 space-y-1">
                            <li>• Larger market cap assets receive higher allocation percentages</li>
                            <li>• Allocations are calculated proportionally to total market cap</li>
                            <li>• Supports stocks (AAPL, MSFT) and crypto (BTC, ETH) symbols</li>
                            <li>• Perfect for diversified market-weighted portfolio strategies</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
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
                      (selectedType !== 'smart_rebalance' && !symbol.trim()) ||
                      (['spot_grid', 'futures_grid', 'infinity_grid'].includes(selectedType) && (
                        currentAllocatedCapital <= 0 || 
                        numberOfGrids < 2 || 
                      if (currentAllocatedCapital <= 0) {
                        alert('Allocated capital must be greater than 0.');
                      )) ||
                      (selectedType === 'smart_rebalance' && (!isAllocationValid() || assets.filter(a => a.symbol.trim()).length < 2)) ||
                      currentAllocatedCapital < minCapital
                    }
                    className="flex-1"
                  >
                    Create Strategy
                  </Button>
                </div>
              </motion.div>
            )}
          </form>
        </Card>
      </motion.div>
    </div>
  );
}