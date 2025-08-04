import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !name || !symbol) return;

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
          assets: [
            { symbol: 'BTC', allocation: 50 },
            { symbol: 'ETH', allocation: 30 },
            { symbol: 'USDT', allocation: 20 },
          ],
          trigger_type: 'threshold', // 'time' or 'threshold'
          rebalance_frequency: 'daily', // for time-based
          threshold_deviation_percent: 5, // for threshold-based
        }),
        ...(selectedType === 'covered_calls' && {
          strike_delta: 0.3,
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
                disabled={!selectedType || !name || !symbol}
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