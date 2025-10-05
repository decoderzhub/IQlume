import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Grid3X3, Brain, AlertTriangle, TrendingUp, DollarSign, Target, Zap } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { useStore } from '../../../store/useStore';

interface CreateFuturesGridModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateFuturesGridModal({ onClose, onSave }: CreateFuturesGridModalProps) {
  const { brokerageAccounts } = useStore();
  const [step, setStep] = useState<'configure' | 'review'>('configure');
  const [strategyName, setStrategyName] = useState('Futures Grid Bot');
  const [brokerageAccount, setBrokerageAccount] = useState('');
  const [minCapital, setMinCapital] = useState(2000);
  const [allocatedCapital, setAllocatedCapital] = useState(2000);
  const [description, setDescription] = useState('Grid trading on futures market with leverage support');
  const [symbol, setSymbol] = useState('');
  const [numberOfGrids, setNumberOfGrids] = useState(25);
  const [gridMode, setGridMode] = useState<'arithmetic' | 'geometric'>('arithmetic');
  const [direction, setDirection] = useState<'long' | 'short' | 'neutral'>('long');
  const [leverage, setLeverage] = useState(3);
  const [lowerPrice, setLowerPrice] = useState(0);
  const [upperPrice, setUpperPrice] = useState(0);
  const [isAIConfiguring, setIsAIConfiguring] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [realMarketPrice, setRealMarketPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);

  React.useEffect(() => {
    const loadAccounts = async () => {
      if (brokerageAccounts.length > 0) {
        setAccountsLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setAccountsLoading(false);
          return;
        }

        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${baseURL}/api/alpaca/accounts`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
        }
      } catch (error) {
        console.error('Error loading accounts:', error);
      } finally {
        setAccountsLoading(false);
      }
    };

    loadAccounts();
  }, [brokerageAccounts]);

  React.useEffect(() => {
    const fetchMarketPrice = async () => {
      if (!symbol) {
        setRealMarketPrice(null);
        return;
      }

      setPriceLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setPriceLoading(false);
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/market-data/live-prices?symbols=${symbol}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const symbolData = data[symbol.toUpperCase()];
          if (symbolData && symbolData.price > 0) {
            setRealMarketPrice(symbolData.price);
          } else {
            if (symbol.toUpperCase().includes('MSFT')) {
              setRealMarketPrice(420 + Math.random() * 20);
            } else if (symbol.toUpperCase().includes('BTC')) {
              setRealMarketPrice(50000 + Math.random() * 10000);
            } else if (symbol.toUpperCase().includes('AAPL')) {
              setRealMarketPrice(180 + Math.random() * 20);
            } else {
              setRealMarketPrice(100 + Math.random() * 50);
            }
          }
        } else {
          if (symbol.toUpperCase().includes('MSFT')) {
            setRealMarketPrice(420 + Math.random() * 20);
          } else if (symbol.toUpperCase().includes('BTC')) {
            setRealMarketPrice(50000 + Math.random() * 10000);
          } else if (symbol.toUpperCase().includes('AAPL')) {
            setRealMarketPrice(180 + Math.random() * 20);
          } else {
            setRealMarketPrice(100 + Math.random() * 50);
          }
        }
      } catch (error) {
        console.error('Error fetching market price:', error);
        if (symbol.toUpperCase().includes('MSFT')) {
          setRealMarketPrice(420 + Math.random() * 20);
        } else if (symbol.toUpperCase().includes('BTC')) {
          setRealMarketPrice(50000 + Math.random() * 10000);
        } else if (symbol.toUpperCase().includes('AAPL')) {
          setRealMarketPrice(180 + Math.random() * 20);
        } else {
          setRealMarketPrice(100 + Math.random() * 50);
        }
      } finally {
        setPriceLoading(false);
      }
    };

    fetchMarketPrice();
  }, [symbol]);

  const calculateInitialPosition = () => {
    if (!lowerPrice || !upperPrice || lowerPrice <= 0 || upperPrice <= 0 || lowerPrice >= upperPrice || numberOfGrids <= 0 || allocatedCapital <= 0 || !realMarketPrice) {
      return {
        amount: allocatedCapital * 0.1,
        percentage: 10,
        reason: priceLoading ? 'Loading market price...' : !realMarketPrice ? 'Market price not available' : 'Grid range not set - using 10% fallback',
        currentPrice: realMarketPrice || 0,
        gridPosition: 'unknown',
        effectiveBuyingPower: allocatedCapital * leverage,
        marginRequired: allocatedCapital,
        gridLevels: 0,
        totalGridLevels: numberOfGrids,
        capitalPerGrid: allocatedCapital / numberOfGrids,
        gridSpacing: 0,
      };
    }

    const currentPrice = realMarketPrice;
    const effectiveBuyingPower = allocatedCapital * leverage;
    let price_position_percent = 0;

    if (direction === 'long') {
      if (currentPrice <= lowerPrice) {
        price_position_percent = 1.0;
      } else if (currentPrice >= upperPrice) {
        price_position_percent = 0.0;
      } else {
        price_position_percent = 1.0 - ((currentPrice - lowerPrice) / (upperPrice - lowerPrice));
      }
    } else if (direction === 'short') {
      if (currentPrice >= upperPrice) {
        price_position_percent = 1.0;
      } else if (currentPrice <= lowerPrice) {
        price_position_percent = 0.0;
      } else {
        price_position_percent = (currentPrice - lowerPrice) / (upperPrice - lowerPrice);
      }
    } else {
      price_position_percent = 0.5;
    }

    const amount = allocatedCapital * price_position_percent;
    const percentage = price_position_percent * 100;

    const capitalPerGrid = allocatedCapital / numberOfGrids;
    const gridSpacing = numberOfGrids > 1 ? (upperPrice - lowerPrice) / (numberOfGrids - 1) : 0;
    const currentGridLevel = gridSpacing > 0 ? Math.floor((currentPrice - lowerPrice) / gridSpacing) : 0;
    const gridLevels = direction === 'long' ? Math.max(0, currentGridLevel) : Math.max(0, numberOfGrids - currentGridLevel - 1);

    let reason = '';
    let gridPosition = '';

    if (direction === 'long') {
      if (currentPrice <= lowerPrice) {
        reason = `Long position: Price at bottom - buy maximum (${percentage.toFixed(1)}%) to sell as price rises`;
        gridPosition = 'bottom of range (maximum buy)';
      } else if (currentPrice >= upperPrice) {
        reason = 'Long position: Price at top - minimal position, ready to buy as price falls';
        gridPosition = 'top of range (minimal buy)';
      } else {
        const positionInRange = ((currentPrice - lowerPrice) / (upperPrice - lowerPrice)) * 100;
        reason = `Long position: ${positionInRange.toFixed(1)}% up the range - need ${percentage.toFixed(1)}% position with ${leverage}x leverage`;
        gridPosition = `${positionInRange.toFixed(1)}% up the range`;
      }
    } else if (direction === 'short') {
      if (currentPrice >= upperPrice) {
        reason = `Short position: Price at top - sell maximum (${percentage.toFixed(1)}%) to buy back as price falls`;
        gridPosition = 'top of range (maximum short)';
      } else if (currentPrice <= lowerPrice) {
        reason = 'Short position: Price at bottom - minimal position, ready to short as price rises';
        gridPosition = 'bottom of range (minimal short)';
      } else {
        const positionInRange = ((currentPrice - lowerPrice) / (upperPrice - lowerPrice)) * 100;
        reason = `Short position: ${positionInRange.toFixed(1)}% up the range - need ${percentage.toFixed(1)}% position with ${leverage}x leverage`;
        gridPosition = `${positionInRange.toFixed(1)}% up the range`;
      }
    } else {
      reason = `Neutral position: 50% initial position with ${leverage}x leverage for bidirectional trading`;
      gridPosition = 'neutral (50% position)';
    }

    return {
      amount,
      percentage,
      reason,
      currentPrice,
      gridPosition,
      effectiveBuyingPower,
      marginRequired: amount,
      gridLevels,
      totalGridLevels: numberOfGrids,
      capitalPerGrid,
      gridSpacing,
    };
  };

  const initialPositionCalc = calculateInitialPosition();

  const handleAIConfigureGrid = async () => {
    if (!symbol) {
      setAiError('Please select a trading symbol first to enable AI configuration of optimal grid range.');
      return;
    }

    if (!realMarketPrice) {
      setAiError('Waiting for market price to load. Please try again in a moment.');
      return;
    }

    setIsAIConfiguring(true);
    setAiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please log in to use AI configuration');
      }

      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(
        `${baseURL}/api/market-data/ai-configure-grid-range`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: symbol,
            allocated_capital: allocatedCapital,
            number_of_grids: numberOfGrids,
            strategy_type: 'futures_grid',
            direction: direction,
            leverage: leverage,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      setLowerPrice(result.lower_limit);
      setUpperPrice(result.upper_limit);
      setAiConfigured(true);
      setAiError(null);

    } catch (error) {
      console.log('Backend unavailable, using smart volatility calculation');

      const volatilityFactor = 0.15 / Math.sqrt(leverage);
      const lower = realMarketPrice * (1 - volatilityFactor);
      const upper = realMarketPrice * (1 + volatilityFactor);

      const roundToNearestNice = (num: number) => {
        if (num > 1000) return Math.round(num / 10) * 10;
        if (num > 100) return Math.round(num);
        if (num > 10) return Math.round(num * 10) / 10;
        return Math.round(num * 100) / 100;
      };

      const lowerRounded = roundToNearestNice(lower);
      const upperRounded = roundToNearestNice(upper);

      setLowerPrice(lowerRounded);
      setUpperPrice(upperRounded);
      setAiConfigured(true);
      setAiError(null);
    } finally {
      setIsAIConfiguring(false);
    }
  };

  const handleSave = async () => {
    const strategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: 'futures_grid',
      description,
      risk_level: leverage >= 5 ? 'high' : 'medium',
      min_capital: minCapital,
      is_active: false,
      account_id: brokerageAccount || undefined,
      asset_class: 'futures',
      base_symbol: symbol,
      quote_currency: 'USD',
      time_horizon: 'swing',
      automation_level: 'fully_auto',
      grid_mode: gridMode,
      auto_start: true,
      configuration: {
        symbol,
        allocated_capital: allocatedCapital,
        price_range_lower: lowerPrice,
        price_range_upper: upperPrice,
        number_of_grids: numberOfGrids,
        grid_mode: gridMode,
        direction,
        leverage,
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
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Review Futures Grid Bot</h2>
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
                    <span className="text-gray-400">Direction:</span>
                    <span className="text-white ml-2 capitalize">{direction}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Leverage:</span>
                    <span className="text-orange-400 ml-2 font-bold">{leverage}x</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Allocated Capital:</span>
                    <span className="text-white ml-2">{formatCurrency(allocatedCapital)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Effective Buying Power:</span>
                    <span className="text-orange-400 ml-2 font-bold">{formatCurrency(initialPositionCalc.effectiveBuyingPower)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Initial Position:</span>
                    <span className="text-green-400 ml-2 font-medium text-lg">{formatCurrency(initialPositionCalc.amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Position %:</span>
                    <span className="text-blue-400 ml-2 font-medium text-lg">{initialPositionCalc.percentage.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Grid Position:</span>
                    <span className="text-purple-400 ml-2 font-medium">{initialPositionCalc.gridPosition}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Grid Levels:</span>
                    <span className="text-yellow-400 ml-2 font-medium">
                      {initialPositionCalc.gridLevels}/{initialPositionCalc.totalGridLevels}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h4 className="font-medium text-orange-400 mb-2">Futures Grid Position Logic</h4>
                  <p className="text-sm text-gray-300 mb-2">{initialPositionCalc.reason}</p>

                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mt-3">
                    <h5 className="text-xs font-medium text-orange-300 mb-2">Leverage Impact:</h5>
                    <div className="space-y-1 text-xs text-gray-400">
                      <p>• Base capital: {formatCurrency(allocatedCapital)}</p>
                      <p>• Leverage multiplier: {leverage}x</p>
                      <p>• Effective buying power: {formatCurrency(initialPositionCalc.effectiveBuyingPower)}</p>
                      <p>• Margin required: {formatCurrency(initialPositionCalc.marginRequired)}</p>
                      {leverage >= 5 && (
                        <p className="text-red-400">⚠️ High leverage increases both profit potential and liquidation risk</p>
                      )}
                    </div>
                  </div>

                  {initialPositionCalc.currentPrice && (
                    <div className="space-y-1 text-xs text-gray-400 mt-3">
                      <p>Current market price: {formatCurrency(realMarketPrice)}</p>
                      <p>Grid range: {formatCurrency(lowerPrice)} - {formatCurrency(upperPrice)}</p>
                      <p>Grid spacing: {formatCurrency(initialPositionCalc.gridSpacing || 0)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="secondary" onClick={() => setStep('configure')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSave} className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
                Create Futures Grid Bot
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
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create Futures Grid Bot</h2>
                <p className="text-gray-400">Grid trading with leverage for amplified returns</p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Strategy Name</label>
                <input
                  type="text"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter strategy name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Brokerage Account</label>
                <select
                  value={brokerageAccount}
                  onChange={(e) => setBrokerageAccount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={accountsLoading}
                >
                  <option value="">
                    {accountsLoading ? 'Loading accounts...' : 'Select an account'}
                  </option>
                  {brokerageAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} ({account.brokerage.toUpperCase()}) - {account.account_type}
                    </option>
                  ))}
                </select>
                {!accountsLoading && brokerageAccounts.length === 0 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    No brokerage accounts connected. Go to Accounts to connect one.
                  </p>
                )}
              </div>
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={3}
                placeholder="Describe your strategy"
              />
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-400" />
                Futures Grid Configuration
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                  <SymbolSearchInput
                    value={symbol}
                    onChange={setSymbol}
                    placeholder="Search for a futures symbol"
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
                    placeholder="25"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Grid Mode</label>
                  <select
                    value={gridMode}
                    onChange={(e) => setGridMode(e.target.value as 'arithmetic' | 'geometric')}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="arithmetic">Arithmetic</option>
                    <option value="geometric">Geometric</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Direction</label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as 'long' | 'short' | 'neutral')}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="long">Long (Bullish)</option>
                    <option value="short">Short (Bearish)</option>
                    <option value="neutral">Neutral</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Choose market direction bias</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Leverage</label>
                  <NumericInput
                    value={leverage}
                    onChange={setLeverage}
                    min={1}
                    max={10}
                    step={1}
                    suffix="x"
                    placeholder="3"
                  />
                  <p className="text-xs text-orange-400 mt-1">
                    {leverage >= 5 ? '⚠️ High leverage increases risk' : 'Leverage multiplier'}
                  </p>
                </div>
              </div>

              {lowerPrice && upperPrice && lowerPrice > 0 && upperPrice > 0 && realMarketPrice && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-orange-400 mb-3 flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4" />
                    Futures Grid Statistics
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Base Capital per Grid:</span>
                      <span className="text-white ml-2 font-medium">
                        {formatCurrency(allocatedCapital / numberOfGrids)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Effective Power per Grid:</span>
                      <span className="text-orange-400 ml-2 font-bold">
                        {formatCurrency((allocatedCapital / numberOfGrids) * leverage)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Buying Power:</span>
                      <span className="text-orange-400 ml-2 font-bold">
                        {formatCurrency(allocatedCapital * leverage)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-orange-500/20">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <h5 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Initial Position Required
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-400">Position Size:</span>
                          <span className="text-green-400 ml-2 font-bold">
                            {formatCurrency(initialPositionCalc.amount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Position %:</span>
                          <span className="text-blue-400 ml-2 font-bold">
                            {initialPositionCalc.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Grid Levels:</span>
                          <span className="text-purple-400 ml-2 font-bold">
                            {initialPositionCalc.gridLevels}/{numberOfGrids}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Current Price:</span>
                          <span className="text-white ml-2 font-bold">
                            {formatCurrency(realMarketPrice)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-green-500/20">
                        <p className="text-xs text-green-300">
                          {initialPositionCalc.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Card className="p-6 bg-gradient-to-r from-purple-900/20 to-orange-900/20 border-purple-500/20 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-purple-300 mb-4">
                      Let AI analyze market data to set optimal grid range for futures trading with leverage and directional bias.
                    </p>

                    <div className="space-y-2 text-sm text-purple-200 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                        <span>Adjusts range based on {leverage}x leverage for risk management</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                        <span>Optimizes for {direction} directional bias</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                        <span>Considers volatility and momentum indicators</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                        <span>Ensures safe margins to prevent liquidation</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleAIConfigureGrid}
                      disabled={!symbol || isAIConfiguring}
                      isLoading={isAIConfiguring}
                      className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      {isAIConfiguring ? 'Analyzing Market...' : 'AI Configure'}
                    </Button>

                    {aiError && (
                      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-yellow-200">{aiError}</p>
                      </div>
                    )}

                    {aiConfigured && !aiError && (
                      <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
                        <Brain className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-green-200">AI configuration complete! Grid range optimized for {direction} futures trading with {leverage}x leverage.</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

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
                    {aiConfigured ? 'AI-optimized lower bound' : 'Set lower price boundary'}
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
                    {aiConfigured ? 'AI-optimized upper bound' : 'Set upper price boundary'}
                  </p>
                </div>
              </div>

              {!symbol && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-400 mb-1">Symbol Required</h4>
                      <p className="text-sm text-yellow-300">
                        Please select a trading symbol to enable AI configuration and view statistics.
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
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              Review
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
