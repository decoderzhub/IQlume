import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Grid3X3, Brain, AlertTriangle, TrendingUp, DollarSign, Target } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { useStore } from '../../../store/useStore';

interface CreateSpotGridModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateSpotGridModal({ onClose, onSave }: CreateSpotGridModalProps) {
  const { brokerageAccounts } = useStore();
  const [step, setStep] = useState<'configure' | 'review'>('configure');
  const [strategyName, setStrategyName] = useState('Spot Grid Bot');
  const [brokerageAccount, setBrokerageAccount] = useState('');
  const [minCapital, setMinCapital] = useState(1000);
  const [allocatedCapital, setAllocatedCapital] = useState(1000);
  const [description, setDescription] = useState('Automate buy-low/sell-high trades within a defined price range');
  const [symbol, setSymbol] = useState('');
  const [numberOfGrids, setNumberOfGrids] = useState(20);
  const [gridMode, setGridMode] = useState<'arithmetic' | 'geometric'>('arithmetic');
  const [lowerPrice, setLowerPrice] = useState(0);
  const [upperPrice, setUpperPrice] = useState(0);
  const [isAIConfiguring, setIsAIConfiguring] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);

  // Calculate initial buy amount based on current price position
  const calculateInitialBuy = () => {
    if (!lowerPrice || !upperPrice || lowerPrice <= 0 || upperPrice <= 0 || lowerPrice >= upperPrice || numberOfGrids <= 0 || allocatedCapital <= 0) {
      return { 
        amount: allocatedCapital * 0.1,
        percentage: 10, 
        reason: 'Using 10% fallback (grid range not set)',
        currentPrice: 0,
        gridPosition: 'unknown',
        gridLevelsBought: 0,
        totalGridLevels: numberOfGrids,
        capitalPerGrid: allocatedCapital / numberOfGrids,
        gridSpacing: 0,
      };
    }
    
    // Calculate realistic current price based on symbol and range (for demo purposes)
    let mockCurrentPrice = lowerPrice + (upperPrice - lowerPrice) * 0.17; // Default to 17% up the range
    
    // Adjust mock price based on symbol for more realistic demo
    if (symbol.toUpperCase().includes('MSFT')) {
      mockCurrentPrice = lowerPrice + (upperPrice - lowerPrice) * 0.17; // 17% up the range (lower in grid)
    } else if (symbol.toUpperCase().includes('BTC')) {
      mockCurrentPrice = lowerPrice + (upperPrice - lowerPrice) * 0.25; // 25% up the range
    } else if (symbol.toUpperCase().includes('AAPL')) {
      mockCurrentPrice = lowerPrice + (upperPrice - lowerPrice) * 0.30; // 30% up the range
    } else {
      // For other symbols, use a position that makes sense for grid trading
      mockCurrentPrice = lowerPrice + (upperPrice - lowerPrice) * 0.20; // 20% up the range
    }
    
    // CORE GRID BOT MECHANICS: Calculate exact grid levels and required position using user's configuration
    const capitalPerGrid = allocatedCapital / numberOfGrids;
    const gridSpacing = (upperPrice - lowerPrice) / (numberOfGrids - 1);
    
    // Find which grid level the current price is at
    const currentGridLevel = Math.floor((mockCurrentPrice - lowerPrice) / gridSpacing);
    const gridLevelsBelowPrice = Math.max(0, currentGridLevel);
    
    // GRID BOT STRATEGY: Need to buy enough to fill all grid levels below current price
    // Each grid level below current price should be "filled" with base position
    const requiredBasePosition = gridLevelsBelowPrice * capitalPerGrid;
    
    // Calculate the actual buy amount needed (this is the core grid bot logic)
    const amount = requiredBasePosition;
    const percentage = (amount / allocatedCapital) * 100;
    
    let reason = '';
    let gridPosition = '';
    
    if (mockCurrentPrice <= lowerPrice) {
      // Price below grid - need maximum position
      reason = `Price below grid range - need maximum position (${numberOfGrids} levels × ${formatCurrency(capitalPerGrid)} = ${formatCurrency(amount)})`;
      gridPosition = 'below grid (maximum buy zone)';
    } else if (mockCurrentPrice >= upperPrice) {
      // Price above grid - minimal position
      reason = 'Price above grid range - minimal initial position, ready to buy as price falls into range';
      gridPosition = 'above grid (minimal buy zone)';
    } else {
      // Price within grid - calculate exact position
      reason = `Price at grid level ${currentGridLevel + 1}/${numberOfGrids} - need to fill ${gridLevelsBelowPrice} levels below current price`;
      gridPosition = `grid level ${currentGridLevel + 1} of ${numberOfGrids}`;
    }
    
    return { 
      amount, 
      percentage, 
      reason, 
      currentPrice: mockCurrentPrice,
      gridPosition,
      gridLevelsBought: gridLevelsBelowPrice,
      totalGridLevels: numberOfGrids,
      capitalPerGrid: capitalPerGrid,
      gridSpacing: gridSpacing,
    };
  };

  const initialBuyCalculation = calculateInitialBuy();

  const handleAIConfigureGrid = async () => {
    if (!symbol) {
      alert('Please select a trading symbol first to enable AI configuration of optimal grid range.');
      return;
    }

    setIsAIConfiguring(true);
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
          allocated_capital: allocatedCapital,
          number_of_grids: numberOfGrids,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to configure grid range: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      setLowerPrice(result.lower_limit);
      setUpperPrice(result.upper_limit);
      setAiConfigured(true);
      
      alert(`🤖 AI Configuration Complete!\n\n${result.reasoning}`);
      
    } catch (error) {
      console.error('Error configuring grid range:', error);
      alert(`Failed to configure grid range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAIConfiguring(false);
    }
  };

  const handleSave = async () => {
    const strategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: 'spot_grid',
      description,
      risk_level: 'low',
      min_capital: minCapital,
      is_active: false,
      account_id: brokerageAccount || undefined,
      asset_class: 'crypto',
      base_symbol: symbol,
      quote_currency: 'USD',
      time_horizon: 'swing',
      automation_level: 'fully_auto',
      grid_mode: gridMode,
      auto_start: true, // Always enable auto-start for grid bots
      configuration: {
        symbol,
        allocated_capital: allocatedCapital,
        price_range_lower: lowerPrice,
        price_range_upper: upperPrice,
        number_of_grids: numberOfGrids,
        grid_mode: gridMode,
      },
    };

    await onSave(strategy);
  };

  const isValid = strategyName && symbol && allocatedCapital > 0 && numberOfGrids > 0;

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
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Grid3X3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Review Spot Grid Bot</h2>
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
                    <span className="text-gray-400">Symbol:</span>
                    <span className="text-white ml-2">{symbol}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Allocated Capital:</span>
                    <span className="text-white ml-2">{formatCurrency(allocatedCapital)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Initial Buy Amount:</span>
                    <span className="text-green-400 ml-2 font-medium text-lg">{formatCurrency(initialBuyCalculation.amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Initial Buy %:</span>
                    <span className="text-blue-400 ml-2 font-medium text-lg">{initialBuyCalculation.percentage.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Grid Position:</span>
                    <span className="text-purple-400 ml-2 font-medium text-lg">{initialBuyCalculation.gridPosition}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Grid Levels to Fill:</span>
                    <span className="text-yellow-400 ml-2 font-medium">
                      {initialBuyCalculation.gridLevelsBought}/{initialBuyCalculation.totalGridLevels} levels
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Grid Mode:</span>
                    <span className="text-white ml-2 capitalize">{gridMode}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h4 className="font-medium text-blue-400 mb-2">Grid Bot Initial Position Logic</h4>
                  <p className="text-sm text-gray-300 mb-2">{initialBuyCalculation.reason}</p>
                  
                  {/* Enhanced calculation breakdown */}
                  <div className="bg-gray-800/50 rounded-lg p-3 mt-3">
                    <h5 className="text-xs font-medium text-blue-300 mb-2">Calculation Breakdown:</h5>
                    <div className="space-y-1 text-xs text-gray-400">
                      <p>• Capital per grid: {formatCurrency(allocatedCapital)} ÷ {numberOfGrids} grids = {formatCurrency(initialBuyCalculation.capitalPerGrid || 0)}</p>
                      <p>• Grid levels below price: {initialBuyCalculation.gridLevelsBought}</p>
                      <p>• Required position: {initialBuyCalculation.gridLevelsBought} × {formatCurrency(initialBuyCalculation.capitalPerGrid || 0)} = {formatCurrency(initialBuyCalculation.amount)}</p>
                      <p>• This creates the base position needed for {initialBuyCalculation.gridLevelsBought} grid levels to start selling as price rises</p>
                    </div>
                  </div>
                  
                  {initialBuyCalculation.currentPrice && (
                    <div className="space-y-1 text-xs text-gray-400">
                      <p>Estimated current price: {formatCurrency(initialBuyCalculation.currentPrice)}</p>
                      <p>Grid range: {formatCurrency(lowerPrice)} - {formatCurrency(upperPrice)}</p>
                      <p>Capital per grid level: {formatCurrency(initialBuyCalculation.capitalPerGrid || 0)}</p>
                      <p>Grid spacing: {formatCurrency(initialBuyCalculation.gridSpacing || 0)}</p>
                      <p>Fills {initialBuyCalculation.gridLevelsBought} grid levels below current price</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="secondary" onClick={() => setStep('configure')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Create Spot Grid Bot
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
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Grid3X3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create Spot Grid Bot</h2>
                <p className="text-gray-400">Automate buy-low/sell-high trades within a defined price range</p>
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

            {/* Grid Bot Configuration */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Grid Bot Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                  <SymbolSearchInput
                    value={symbol}
                    onChange={setSymbol}
                    placeholder="Search for a symbol (e.g., BTC, AAPL)"
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
                    placeholder="20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Grid Mode</label>
                  <select
                    value={gridMode}
                    onChange={(e) => setGridMode(e.target.value as 'arithmetic' | 'geometric')}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="arithmetic">Arithmetic</option>
                    <option value="geometric">Geometric</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Grid Statistics */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-400 mb-3 flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4" />
                  Grid Configuration Stats
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-400">Capital per Grid:</span>
                    <span className="text-white ml-2 font-medium">
                      {formatCurrency(allocatedCapital / numberOfGrids)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Grids:</span>
                    <span className="text-blue-400 ml-2 font-medium">{numberOfGrids}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Grid Spacing:</span>
                    <span className="text-purple-400 ml-2 font-medium">
                      {lowerPrice && upperPrice && lowerPrice > 0 && upperPrice > 0 
                        ? formatCurrency((upperPrice - lowerPrice) / (numberOfGrids - 1))
                        : 'Set range first'
                      }
                    </span>
                  </div>
                </div>
                
                {/* Initial Buy Calculation - Dynamic based on user config */}
                {lowerPrice && upperPrice && lowerPrice > 0 && upperPrice > 0 && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <h5 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Initial Buy Required
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Buy Amount:</span>
                        <span className="text-green-400 ml-2 font-bold">
                          {formatCurrency(initialBuyCalculation.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Buy %:</span>
                        <span className="text-blue-400 ml-2 font-bold">
                          {initialBuyCalculation.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Grid Position:</span>
                        <span className="text-purple-400 ml-2 font-bold">
                          {initialBuyCalculation.gridLevelsBought}/{numberOfGrids}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Est. Price:</span>
                        <span className="text-white ml-2 font-bold">
                          {formatCurrency(initialBuyCalculation.currentPrice)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-green-500/20">
                      <p className="text-xs text-green-300">
                        {initialBuyCalculation.reason}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Price Range Width:</span>
                    <span className="text-yellow-400 ml-2 font-medium">
                      {lowerPrice && upperPrice && lowerPrice > 0 && upperPrice > 0 
                        ? `${(((upperPrice - lowerPrice) / lowerPrice) * 100).toFixed(1)}%`
                        : 'Set range first'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Profit per Grid Level:</span>
                    <span className="text-green-400 ml-2 font-medium">
                      {formatCurrency((allocatedCapital / numberOfGrids) * 0.005)} - {formatCurrency((allocatedCapital / numberOfGrids) * 0.02)}
                    </span>
                  </div>
                </div>
                
                {lowerPrice && upperPrice && lowerPrice > 0 && upperPrice > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-500/20">
                    <div className="text-sm text-gray-400">
                      <span className="text-gray-400">Estimated Trades per Cycle:</span>
                      <span className="text-green-400 ml-2 font-medium">
                        {Math.floor(numberOfGrids * 0.6)} - {numberOfGrids}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Grid Configuration */}
              <Card className="p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/20 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-2">AI Grid Configuration</h4>
                    <p className="text-sm text-gray-300 mb-4">
                      Let AI analyze market data to set optimal grid range using technical indicators, volatility, and mean reversion
                    </p>
                    
                    <div className="space-y-2 text-sm text-purple-200 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                        <span>Analyzes 1-year historical price data</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                        <span>Calculates Bollinger Bands and RSI indicators</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                        <span>Optimizes range for mean reversion opportunities</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                        <span>Ensures current price is safely within range</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleAIConfigureGrid}
                      disabled={!symbol || isAIConfiguring}
                      isLoading={isAIConfiguring}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      {isAIConfiguring ? 'Analyzing Market...' : 'AI Configure'}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Manual Grid Range Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Lower Price Limit</label>
                  <NumericInput
                    value={lowerPrice}
                    onChange={setLowerPrice}
                    min={0}
                    step={0.01}
                    prefix="$"
                    placeholder="0"
                    allowDecimals={true}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {aiConfigured ? 'AI-optimized lower bound, manually configurable' : 'AI-optimized lower bound, manually configurable'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Upper Price Limit</label>
                  <NumericInput
                    value={upperPrice}
                    onChange={setUpperPrice}
                    min={0}
                    step={0.01}
                    prefix="$"
                    placeholder="0"
                    allowDecimals={true}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {aiConfigured ? 'AI-optimized upper bound, manually configurable' : 'AI-optimized upper bound, manually configurable'}
                  </p>
                </div>
              </div>

              {/* Symbol Required Warning */}
              {!symbol && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-400 mb-1">Symbol Required</h4>
                      <p className="text-sm text-yellow-300">
                        Please select a trading symbol to enable AI configuration of optimal grid range.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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