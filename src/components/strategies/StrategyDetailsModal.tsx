import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Trash2, Play, Pause, BarChart3, DollarSign, AlertTriangle, TrendingUp, Shield } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency, formatPercent } from '../../lib/utils';

interface StrategyDetailsModalProps {
  strategy: TradingStrategy;
  onClose: () => void;
  onSave: (strategy: TradingStrategy) => void;
  onDelete: (strategyId: string) => void;
}

export function StrategyDetailsModal({ strategy, onClose, onSave, onDelete }: StrategyDetailsModalProps) {
  const [editedStrategy, setEditedStrategy] = useState<TradingStrategy>(strategy);
  
  // Grid bot specific states
  const [priceRangeLower, setPriceRangeLower] = useState<number>(strategy.configuration.price_range_lower || 0);
  const [priceRangeUpper, setPriceRangeUpper] = useState<number>(strategy.configuration.price_range_upper || 0);
  const [numberOfGrids, setNumberOfGrids] = useState<number>(strategy.configuration.number_of_grids || 20);
  const [totalInvestment, setTotalInvestment] = useState<number>(strategy.configuration.total_investment || 1000);
  const [triggerPrice, setTriggerPrice] = useState<number | undefined>(strategy.configuration.trigger_price);
  const [takeProfit, setTakeProfit] = useState<number | undefined>(strategy.configuration.take_profit);
  const [stopLoss, setStopLoss] = useState<number | undefined>(strategy.configuration.stop_loss);
  const [gridMode, setGridMode] = useState<'arithmetic' | 'geometric'>(strategy.configuration.grid_mode || 'arithmetic');
  
  // Capital allocation
  const [totalAvailableCapital] = useState(250000); // Mock total available capital
  const [allocatedCapitalPercentage, setAllocatedCapitalPercentage] = useState(() => {
    const allocatedCapital = strategy.configuration.allocated_capital || strategy.configuration.total_investment || strategy.min_capital;
    return Math.round((allocatedCapital / 250000) * 100);
  });
  const currentAllocatedCapital = (totalAvailableCapital * allocatedCapitalPercentage) / 100;

  // Update states when strategy prop changes
  useEffect(() => {
    setEditedStrategy(strategy);
    setPriceRangeLower(strategy.configuration.price_range_lower || 0);
    setPriceRangeUpper(strategy.configuration.price_range_upper || 0);
    setNumberOfGrids(strategy.configuration.number_of_grids || 20);
    setTotalInvestment(strategy.configuration.total_investment || 1000);
    setTriggerPrice(strategy.configuration.trigger_price);
    setTakeProfit(strategy.configuration.take_profit);
    setStopLoss(strategy.configuration.stop_loss);
    setGridMode(strategy.configuration.grid_mode || 'arithmetic');
    
    const allocatedCapital = strategy.configuration.allocated_capital || strategy.configuration.total_investment || strategy.min_capital;
    setAllocatedCapitalPercentage(Math.round((allocatedCapital / totalAvailableCapital) * 100));
  }, [strategy]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setEditedStrategy(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

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

  const handleSave = () => {
    // Validate grid bot specific fields
    const isGridBot = ['spot_grid', 'futures_grid', 'infinity_grid'].includes(editedStrategy.type);
    
    if (isGridBot) {
      if (editedStrategy.type !== 'infinity_grid' && (priceRangeLower <= 0 || priceRangeUpper <= 0 || priceRangeLower >= priceRangeUpper)) {
        alert('Please set a valid price range (lower price must be less than upper price and both must be greater than 0).');
        return;
      }
      if (numberOfGrids < 2 || numberOfGrids > 1000) {
        alert('Number of grids must be between 2 and 1000.');
        return;
      }
      if (currentAllocatedCapital <= 0) {
        alert('Allocated capital must be greater than 0.');
        return;
      }
    }

    const updatedStrategy: TradingStrategy = {
      ...editedStrategy,
      configuration: {
        ...editedStrategy.configuration,
        ...(isGridBot && {
          price_range_lower: priceRangeLower,
          price_range_upper: priceRangeUpper,
          number_of_grids: numberOfGrids,
          total_investment: currentAllocatedCapital,
          allocated_capital: currentAllocatedCapital,
          trigger_price: triggerPrice,
          take_profit: takeProfit,
          stop_loss: stopLoss,
          grid_mode: gridMode,
        }),
        // Add allocated_capital to all strategy types
        allocated_capital: currentAllocatedCapital,
      },
    };

    onSave(updatedStrategy);
  };

  const getRiskColor = (level: TradingStrategy['risk_level']) => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getStrategyTypeLabel = (type: TradingStrategy['type']) => {
    switch (type) {
      case 'spot_grid': return 'Spot Grid Bot';
      case 'futures_grid': return 'Futures Grid Bot';
      case 'infinity_grid': return 'Infinity Grid Bot';
      case 'dca': return 'DCA Bot';
      case 'smart_rebalance': return 'Smart Rebalance';
      case 'covered_calls': return 'Covered Calls';
      case 'iron_condor': return 'Iron Condor';
      case 'straddle': return 'Straddle';
      case 'wheel': return 'The Wheel';
      case 'orb': return 'ORB Strategy';
      default: return type.replace('_', ' ');
    }
  };

  const isGridBot = ['spot_grid', 'futures_grid', 'infinity_grid'].includes(editedStrategy.type);
  const profitPerGrid = isGridBot && numberOfGrids > 0 ? (totalInvestment / numberOfGrids).toFixed(2) : '0';

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
              <h2 className="text-2xl font-bold text-white mb-2">Strategy Details</h2>
              <p className="text-gray-400">Configure and manage your trading strategy</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-8">
            {/* Strategy Overview */}
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{editedStrategy.name}</h3>
                  <p className="text-gray-300 mb-3">{editedStrategy.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(editedStrategy.risk_level)}`}>
                    {editedStrategy.risk_level} risk
                  </span>
                  <div className={`w-3 h-3 rounded-full ${editedStrategy.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Min Capital</p>
                    <p className="font-semibold text-white">{formatCurrency(editedStrategy.min_capital)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-400">Risk Level</p>
                    <p className="font-semibold text-white capitalize">{editedStrategy.risk_level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-400">Strategy Type</p>
                    <p className="font-semibold text-white">{getStrategyTypeLabel(editedStrategy.type)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            {editedStrategy.performance && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-400">Total Return</span>
                  </div>
                  <p className="text-xl font-bold text-green-400">
                    {formatPercent(editedStrategy.performance.total_return)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-400">Win Rate</span>
                  </div>
                  <p className="text-xl font-bold text-blue-400">
                    {formatPercent(editedStrategy.performance.win_rate)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-400">Max Drawdown</span>
                  </div>
                  <p className="text-xl font-bold text-purple-400">
                    {formatPercent(editedStrategy.performance.max_drawdown)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-400">Total Trades</span>
                  </div>
                  <p className="text-xl font-bold text-yellow-400">
                    {editedStrategy.performance.total_trades || 0}
                  </p>
                </Card>
              </div>
            )}

            {/* Basic Configuration */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Basic Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Strategy Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editedStrategy.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Capital</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      name="min_capital"
                      value={editedStrategy.min_capital}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1000"
                      step="1000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Risk Level</label>
                  <select
                    name="risk_level"
                    value={editedStrategy.risk_level}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedStrategy.is_active}
                        onChange={(e) => setEditedStrategy(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-300">Active</span>
                    </label>
                    <div className={`w-2 h-2 rounded-full ${editedStrategy.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                  </div>
                </div>
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
                  
                  {currentAllocatedCapital < editedStrategy.min_capital && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <p className="text-sm text-yellow-400">
                          Allocated capital ({formatCurrency(currentAllocatedCapital)}) is below the minimum required ({formatCurrency(editedStrategy.min_capital)}) for this strategy.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Grid Bot Specific Configuration */}
            {isGridBot && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Grid Bot Configuration</h3>
                  <span className="text-sm text-gray-400">
                    {getStrategyTypeLabel(editedStrategy.type)}
                  </span>
                </div>

                {/* Price Range */}
                {editedStrategy.type !== 'infinity_grid' ? (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Lowest Price (USDT)
                      </label>
                      <input
                        type="number"
                        value={priceRangeLower}
                        onChange={(e) => setPriceRangeLower(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        placeholder="Lowest price USDT"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Highest Price (USDT)
                      </label>
                      <input
                        type="number"
                        value={priceRangeUpper}
                        onChange={(e) => setPriceRangeUpper(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        placeholder="Highest price USDT"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Lowest Price (USDT)
                    </label>
                    <input
                      type="number"
                      value={priceRangeLower}
                      onChange={(e) => setPriceRangeLower(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="Lowest price USDT"
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
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="Number of grids"
                      min="2"
                      max="1000"
                    />
                    {numberOfGrids > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Profit/grid: ~{profitPerGrid} USDT (fee deducted)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Total Investment (USDT)
                    </label>
                    <input
                      type="number"
                      value={totalInvestment}
                      onChange={(e) => setTotalInvestment(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="Total investment (USDT)"
                      min="0"
                      step="10"
                    />
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>0%</span>
                        <span>{((totalInvestment / editedStrategy.min_capital) * 100).toFixed(1)}% of min capital</span>
                        <span>100%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((totalInvestment / editedStrategy.min_capital) * 100, 100)}%` }}
                        />
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
                        Trigger Price (USDT, Optional)
                      </label>
                      <input
                        type="number"
                        value={triggerPrice || ''}
                        onChange={(e) => setTriggerPrice(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        placeholder="Trigger price"
                        step="0.01"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Take Profit (USDT, Optional)
                        </label>
                        <input
                          type="number"
                          value={takeProfit || ''}
                          onChange={(e) => setTakeProfit(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                          placeholder="Take Profit"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Stop Loss (USDT, Optional)
                        </label>
                        <input
                          type="number"
                          value={stopLoss || ''}
                          onChange={(e) => setStopLoss(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                          placeholder="Stop Loss"
                          step="0.01"
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
              </div>
            )}

            {/* Current Configuration Preview */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h4 className="font-semibold text-white mb-4">Current Configuration</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {editedStrategy.configuration.symbol && (
                  <div>
                    <span className="text-gray-400">Symbol:</span>
                    <span className="text-white ml-2">{editedStrategy.configuration.symbol}</span>
                  </div>
                )}
                {isGridBot && (
                  <>
                    <div>
                      <span className="text-gray-400">Price Range:</span>
                      <span className="text-white ml-2">
                        {editedStrategy.type === 'infinity_grid' 
                          ? `${priceRangeLower}+ USDT`
                          : `${priceRangeLower} - ${priceRangeUpper} USDT`
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Grids:</span>
                      <span className="text-white ml-2">{numberOfGrids}</span>
                  Position Size (shares)
                    <div>
                      <span className="text-gray-400">Investment:</span>
                     <span className="text-white ml-2">{formatCurrency(currentAllocatedCapital)}</span>
                  value={config.position_size || 100}
                  onChange={(e) => updateConfiguration('position_size', Number(e.target.value))}
                  min="100"
                  step="100"
                    {triggerPrice && (
                      <div>
                        <span className="text-gray-400">Trigger:</span>
                        <span className="text-white ml-2">{triggerPrice} USDT</span>
                      </div>
                  Strike Above Cost Basis (%)
                    {takeProfit && (
                      <div>
                        <span className="text-gray-400">Take Profit:</span>
                  value={config.strike_above_cost_basis || 5}
                  onChange={(e) => updateConfiguration('strike_above_cost_basis', Number(e.target.value))}
                  min="1"
                  max="20"
                  step="0.5"
                      <div>
                        <span className="text-gray-400">Stop Loss:</span>
                        <span className="text-red-400 ml-2">{stopLoss} USDT</span>
                      </div>
                    )}
                  </>
                )}
                  Expiration (days)
            </div>

            {/* Action Buttons */}
                  value={config.expiration || 30}
                  onChange={(e) => updateConfiguration('expiration', Number(e.target.value))}
                  min="7"
                  max="90"
                className="text-red-400 border-red-500/20 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Strategy
              </Button>
                  Minimum Premium (%)
              <div className="flex-1" />
              
              <Button variant="secondary" onClick={onClose}>
                  value={config.minimum_premium || 1}
                  onChange={(e) => updateConfiguration('minimum_premium', Number(e.target.value))}
                  min="0.5"
                  max="10"
                  step="0.1"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Exit Rules
              </label>
              <textarea
                value={config.exit_rules || 'Roll when ITM, close at 50% profit'}
                onChange={(e) => updateConfiguration('exit_rules', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                placeholder="Define exit conditions..."
              />
            </div>
          </div>
        );

      case 'long_call':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strike Price (above current)
                </label>
                <input
                  type="number"
                  value={config.strike_price || 0}
                  onChange={(e) => updateConfiguration('strike_price', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={config.expiration_date || ''}
                  onChange={(e) => updateConfiguration('expiration_date', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Entry Signal
                </label>
                <select
                  value={config.entry_signal || 'momentum_breakout'}
                  onChange={(e) => updateConfiguration('entry_signal', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="momentum_breakout">Momentum Breakout</option>
                  <option value="oversold_bounce">Oversold Bounce</option>
                  <option value="earnings_play">Earnings Play</option>
                  <option value="manual">Manual Entry</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Premium to Pay (%)
                </label>
                <input
                  type="number"
                  value={config.max_premium || 5}
                  onChange={(e) => updateConfiguration('max_premium', Number(e.target.value))}
                  min="1"
                  max="20"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stop Loss (%)
                </label>
                <input
                  type="number"
                  value={config.stop_loss || 50}
                  onChange={(e) => updateConfiguration('stop_loss', Number(e.target.value))}
                  min="20"
                  max="100"
                  step="5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Take Profit (%)
                </label>
                <input
                  type="number"
                  value={config.take_profit || 100}
                  onChange={(e) => updateConfiguration('take_profit', Number(e.target.value))}
                  min="50"
                  max="500"
                  step="25"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        );

      case 'long_straddle':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strike Price (ATM)
                </label>
                <input
                  type="number"
                  value={config.strike_price || 0}
                  onChange={(e) => updateConfiguration('strike_price', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={config.expiration_date || ''}
                  onChange={(e) => updateConfiguration('expiration_date', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Volatility Threshold (%)
                </label>
                <input
                  type="number"
                  value={config.volatility_threshold || 25}
                  onChange={(e) => updateConfiguration('volatility_threshold', Number(e.target.value))}
                  min="15"
                  max="50"
                  step="1"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Combined Premium (%)
                </label>
                <input
                  type="number"
                  value={config.max_combined_premium || 8}
                  onChange={(e) => updateConfiguration('max_combined_premium', Number(e.target.value))}
                  min="3"
                  max="15"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Entry Trigger
              </label>
              <select
                value={config.entry_trigger || 'earnings_release'}
                onChange={(e) => updateConfiguration('entry_trigger', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="earnings_release">Earnings Release</option>
                <option value="high_iv">High IV Environment</option>
                <option value="event_driven">Event Driven</option>
                <option value="manual">Manual Entry</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Exit Rules
              </label>
              <textarea
                value={config.exit_rules || 'Close at 50% profit or 21 DTE, whichever comes first'}
                onChange={(e) => updateConfiguration('exit_rules', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                placeholder="Define exit conditions..."
              />
            </div>
          </div>
        );

      case 'long_condor':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lower Strike Price
                </label>
                <input
                  type="number"
                  value={config.lower_strike || 0}
                  onChange={(e) => updateConfiguration('lower_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mid-Low Strike Price
                </label>
                <input
                  type="number"
                  value={config.mid_low_strike || 0}
                  onChange={(e) => updateConfiguration('mid_low_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mid-High Strike Price
                </label>
                <input
                  type="number"
                  value={config.mid_high_strike || 0}
                  onChange={(e) => updateConfiguration('mid_high_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Higher Strike Price
                </label>
                <input
                  type="number"
                  value={config.higher_strike || 0}
                  onChange={(e) => updateConfiguration('higher_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={config.expiration_date || ''}
                  onChange={(e) => updateConfiguration('expiration_date', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Price Range (%)
                </label>
                <input
                  type="number"
                  value={config.target_price_range || 5}
                  onChange={(e) => updateConfiguration('target_price_range', Number(e.target.value))}
                  min="2"
                  max="15"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Volatility Filter (%)
              </label>
              <input
                type="number"
                value={config.volatility_filter || 20}
                onChange={(e) => updateConfiguration('volatility_filter', Number(e.target.value))}
                min="10"
                max="40"
                step="1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Exit Target (%)
              </label>
              <input
                type="number"
                value={config.exit_target || 50}
                onChange={(e) => updateConfiguration('exit_target', Number(e.target.value))}
                min="25"
                max="100"
                step="5"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
          </div>
        );

      case 'iron_butterfly':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Short Strike (ATM)
                </label>
                <input
                  type="number"
                  value={config.short_strike || 0}
                  onChange={(e) => updateConfiguration('short_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Long Strikes (OTM)
                </label>
                <input
                  type="number"
                  value={config.long_strikes || 10}
                  onChange={(e) => updateConfiguration('long_strikes', Number(e.target.value))}
                  min="5"
                  max="50"
                  step="2.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  value={config.expiration || 30}
                  onChange={(e) => updateConfiguration('expiration', Number(e.target.value))}
                  min="7"
                  max="60"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Premium Collected (min %)
                </label>
                <input
                  type="number"
                  value={config.premium_collected || 2}
                  onChange={(e) => updateConfiguration('premium_collected', Number(e.target.value))}
                  min="1"
                  max="10"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Volatility Filter (%)
                </label>
                <input
                  type="number"
                  value={config.volatility_filter || 25}
                  onChange={(e) => updateConfiguration('volatility_filter', Number(e.target.value))}
                  min="15"
                  max="40"
                  step="1"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Exit % Profit/Loss
                </label>
                <input
                  type="number"
                  value={config.exit_profit_loss || 50}
                  onChange={(e) => updateConfiguration('exit_profit_loss', Number(e.target.value))}
                  min="25"
                  max="100"
                  step="5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        );

      case 'short_call':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strike Price (above current)
                </label>
                <input
                  type="number"
                  value={config.strike_price || 0}
                  onChange={(e) => updateConfiguration('strike_price', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  value={config.expiration || 30}
                  onChange={(e) => updateConfiguration('expiration', Number(e.target.value))}
                  min="7"
                  max="90"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Premium (%)
                </label>
                <input
                  type="number"
                  value={config.minimum_premium || 2}
                  onChange={(e) => updateConfiguration('minimum_premium', Number(e.target.value))}
                  min="1"
                  max="10"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Margin Requirements (%)
                </label>
                <input
                  type="number"
                  value={config.margin_requirements || 20}
                  onChange={(e) => updateConfiguration('margin_requirements', Number(e.target.value))}
                  min="10"
                  max="50"
                  step="5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Exit Stop-Loss (%)
              </label>
              <input
                type="number"
                value={config.exit_stop_loss || 200}
                onChange={(e) => updateConfiguration('exit_stop_loss', Number(e.target.value))}
                min="100"
                max="500"
                step="25"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
          </div>
        );

      case 'short_straddle':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strike Price (ATM)
                </label>
                <input
                  type="number"
                  value={config.strike_price || 0}
                  onChange={(e) => updateConfiguration('strike_price', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  value={config.expiration || 30}
                  onChange={(e) => updateConfiguration('expiration', Number(e.target.value))}
                  min="7"
                  max="60"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Premium Threshold (%)
                </label>
                <input
                  type="number"
                  value={config.premium_threshold || 3}
                  onChange={(e) => updateConfiguration('premium_threshold', Number(e.target.value))}
                  min="2"
                  max="10"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Volatility Filter (%)
                </label>
                <input
                  type="number"
                  value={config.volatility_filter || 20}
                  onChange={(e) => updateConfiguration('volatility_filter', Number(e.target.value))}
                  min="10"
                  max="35"
                  step="1"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stop-Loss per Leg (%)
                </label>
                <input
                  type="number"
                  value={config.stop_loss_per_leg || 200}
                  onChange={(e) => updateConfiguration('stop_loss_per_leg', Number(e.target.value))}
                  min="100"
                  max="500"
                  step="25"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Loss Allowed (%)
                </label>
                <input
                  type="number"
                  value={config.max_loss_allowed || 300}
                  onChange={(e) => updateConfiguration('max_loss_allowed', Number(e.target.value))}
                  min="200"
                  max="1000"
                  step="50"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        );

      case 'iron_condor':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Short Strikes (both sides)
                </label>
                <input
                  type="number"
                  value={config.short_strikes || 0}
                  onChange={(e) => updateConfiguration('short_strikes', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Long Strikes (both sides)
                </label>
                <input
                  type="number"
                  value={config.long_strikes || 10}
                  onChange={(e) => updateConfiguration('long_strikes', Number(e.target.value))}
                  min="5"
                  max="50"
                  step="2.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  value={config.expiration || 45}
                  onChange={(e) => updateConfiguration('expiration', Number(e.target.value))}
                  min="14"
                  max="90"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Net Credit (min %)
                </label>
                <input
                  type="number"
                  value={config.net_credit || 1}
                  onChange={(e) => updateConfiguration('net_credit', Number(e.target.value))}
                  min="0.5"
                  max="5"
                  step="0.25"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Volatility Filter (%)
                </label>
                <input
                  type="number"
                  value={config.volatility_filter || 20}
                  onChange={(e) => updateConfiguration('volatility_filter', Number(e.target.value))}
                  min="10"
                  max="40"
                  step="1"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Exit Targets (%)
                </label>
                <input
                  type="number"
                  value={config.exit_targets || 50}
                  onChange={(e) => updateConfiguration('exit_targets', Number(e.target.value))}
                  min="25"
                  max="100"
                  step="5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        );

      case 'long_butterfly':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lower Strike
                </label>
                <input
                  type="number"
                  value={config.lower_strike || 0}
                  onChange={(e) => updateConfiguration('lower_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Three Strikes (spacing)
                </label>
                <input
                  type="number"
                  value={config.three_strikes || 5}
                  onChange={(e) => updateConfiguration('three_strikes', Number(e.target.value))}
                  min="2.5"
                  max="20"
                  step="2.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  value={config.expiration || 30}
                  onChange={(e) => updateConfiguration('expiration', Number(e.target.value))}
                  min="7"
                  max="60"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Debit Paid (max %)
                </label>
                <input
                  type="number"
                  value={config.debit_paid || 3}
                  onChange={(e) => updateConfiguration('debit_paid', Number(e.target.value))}
                  min="1"
                  max="8"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Range Expectation (%)
                </label>
                <input
                  type="number"
                  value={config.range_expectation || 3}
                  onChange={(e) => updateConfiguration('range_expectation', Number(e.target.value))}
                  min="1"
                  max="10"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Exit % Gain
                </label>
                <input
                  type="number"
                  value={config.exit_gain || 50}
                  onChange={(e) => updateConfiguration('exit_gain', Number(e.target.value))}
                  min="25"
                  max="100"
                  step="5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        );

      case 'short_put':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strike Below Current (%)
                </label>
                <input
                  type="number"
                  value={config.strike_below_current || 5}
                  onChange={(e) => updateConfiguration('strike_below_current', Number(e.target.value))}
                  min="2"
                  max="20"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  value={config.expiration || 30}
                  onChange={(e) => updateConfiguration('expiration', Number(e.target.value))}
                  min="7"
                  max="90"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Premium (%)
                </label>
                <input
                  type="number"
                  value={config.minimum_premium || 2}
                  onChange={(e) => updateConfiguration('minimum_premium', Number(e.target.value))}
                  min="1"
                  max="8"
                  step="0.25"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Margin (%)
                </label>
                <input
                  type="number"
                  value={config.margin || 20}
                  onChange={(e) => updateConfiguration('margin', Number(e.target.value))}
                  min="10"
                  max="50"
                  step="5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stop-Loss Rules
              </label>
              <textarea
                value={config.stop_loss_rules || 'Close at 200% loss or when assigned'}
                onChange={(e) => updateConfiguration('stop_loss_rules', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                placeholder="Define stop-loss conditions..."
              />
            </div>
          </div>
        );

      case 'short_strangle':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Call Strike (above)
                </label>
                <input
                  type="number"
                  value={config.call_strike || 0}
                  onChange={(e) => updateConfiguration('call_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Put Strike (below)
                </label>
                <input
                  type="number"
                  value={config.put_strike || 0}
                  onChange={(e) => updateConfiguration('put_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  value={config.expiration || 30}
                  onChange={(e) => updateConfiguration('expiration', Number(e.target.value))}
                  min="7"
                  max="60"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Premium Target (%)
                </label>
                <input
                  type="number"
                  value={config.premium_target || 3}
                  onChange={(e) => updateConfiguration('premium_target', Number(e.target.value))}
                  min="2"
                  max="8"
                  step="0.25"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Volatility Filter (%)
                </label>
                <input
                  type="number"
                  value={config.volatility_filter || 20}
                  onChange={(e) => updateConfiguration('volatility_filter', Number(e.target.value))}
                  min="10"
                  max="35"
                  step="1"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stop-Loss Rules (%)
                </label>
                <input
                  type="number"
                  value={config.stop_loss_rules || 200}
                  onChange={(e) => updateConfiguration('stop_loss_rules', Number(e.target.value))}
                  min="150"
                  max="400"
                  step="25"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        );

      case 'short_put_vertical':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Short Strike
                </label>
                <input
                  type="number"
                  value={config.short_strike || 0}
                  onChange={(e) => updateConfiguration('short_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Long Strike
                </label>
                <input
                  type="number"
                  value={config.long_strike || 0}
                  onChange={(e) => updateConfiguration('long_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  value={config.expiration || 30}
                  onChange={(e) => updateConfiguration('expiration', Number(e.target.value))}
                  min="7"
                  max="60"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Net Credit (%)
                </label>
                <input
                  type="number"
                  value={config.net_credit || 1}
                  onChange={(e) => updateConfiguration('net_credit', Number(e.target.value))}
                  min="0.5"
                  max="5"
                  step="0.25"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Risk % (max)
                </label>
                <input
                  type="number"
                  value={config.risk_percent || 2}
                  onChange={(e) => updateConfiguration('risk_percent', Number(e.target.value))}
                  min="1"
                  max="10"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Exit % Profit/Loss
                </label>
                <input
                  type="number"
                  value={config.exit_profit_loss || 50}
                  onChange={(e) => updateConfiguration('exit_profit_loss', Number(e.target.value))}
                  min="25"
                  max="100"
                  step="5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        );

      case 'short_call_vertical':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Short Strike
                </label>
                <input
                  type="number"
                  value={config.short_strike || 0}
                  onChange={(e) => updateConfiguration('short_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Long Strike
                </label>
                <input
                  type="number"
                  value={config.long_strike || 0}
                  onChange={(e) => updateConfiguration('long_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  value={config.expiration || 30}
                  onChange={(e) => updateConfiguration('expiration', Number(e.target.value))}
                  min="7"
                  max="60"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Net Credit (%)
                </label>
                <input
                  type="number"
                  value={config.net_credit || 1}
                  onChange={(e) => updateConfiguration('net_credit', Number(e.target.value))}
                  min="0.5"
                  max="5"
                  step="0.25"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Risk (%)
                </label>
                <input
                  type="number"
                  value={config.max_risk || 3}
                  onChange={(e) => updateConfiguration('max_risk', Number(e.target.value))}
                  min="1"
                  max="10"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stop-Loss/Exit (%)
                </label>
                <input
                  type="number"
                  value={config.stop_loss_exit || 50}
                  onChange={(e) => updateConfiguration('stop_loss_exit', Number(e.target.value))}
                  min="25"
                  max="100"
                  step="5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        );

      case 'broken_wing_butterfly':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Three Strikes (asymmetric)
                </label>
                <input
                  type="text"
                  value={config.three_strikes || '95/100/110'}
                  onChange={(e) => updateConfiguration('three_strikes', e.target.value)}
                  placeholder="e.g., 95/100/110"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  value={config.expiration || 30}
                  onChange={(e) => updateConfiguration('expiration', Number(e.target.value))}
                  min="7"
                  max="60"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Debit/Credit (%)
                </label>
                <input
                  type="number"
                  value={config.debit_credit || 1}
                  onChange={(e) => updateConfiguration('debit_credit', Number(e.target.value))}
                  min="0.5"
                  max="5"
                  step="0.25"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Price Range (%)
                </label>
                <input
                  type="number"
                  value={config.target_price_range || 5}
                  onChange={(e) => updateConfiguration('target_price_range', Number(e.target.value))}
                  min="2"
                  max="15"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Exit Rules
              </label>
              <textarea
                value={config.exit_rules || 'Close at 50% profit or 21 DTE'}
                onChange={(e) => updateConfiguration('exit_rules', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                placeholder="Define exit conditions..."
              />
            </div>
          </div>
        );

      case 'option_collar':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position Size (shares)
                </label>
                <input
                  type="number"
                  value={config.position_size || 100}
                  onChange={(e) => updateConfiguration('position_size', Number(e.target.value))}
                  min="100"
                  step="100"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Put Strike (below)
                </label>
                <input
                  type="number"
                  value={config.put_strike || 0}
                  onChange={(e) => updateConfiguration('put_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Call Strike (above)
                </label>
                <input
                  type="number"
                  value={config.call_strike || 0}
                  onChange={(e) => updateConfiguration('call_strike', Number(e.target.value))}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  value={config.expiration || 30}
                  onChange={(e) => updateConfiguration('expiration', Number(e.target.value))}
                  min="7"
                  max="90"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Net Debit/Credit (%)
                </label>
                <input
                  type="number"
                  value={config.net_debit_credit || 0.5}
                  onChange={(e) => updateConfiguration('net_debit_credit', Number(e.target.value))}
                  min="0"
                  max="3"
                  step="0.25"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Exit Triggers (%)
                </label>
                <input
                  type="number"
                  value={config.exit_triggers || 50}
                  onChange={(e) => updateConfiguration('exit_triggers', Number(e.target.value))}
                  min="25"
                  max="100"
                  step="5"
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        );

      case 'wheel':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position Size (shares)
                </label>
                <input
                  type="number"
                  value={config.position_size || 100}
                  onChange={(e) => updateConfiguration('position_size', Number(e.target.value))}
                  min="100"
                  step="100"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Put Strike (below current %)
                </label>
                <input
                  type="number"
                  value={config.put_strike_below || 5}
                  onChange={(e) => updateConfiguration('put_strike_below', Number(e.target.value))}
                  min="2"
                  max="15"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Call Strike (above cost %)
                </label>
                <input
                  type="number"
                  value={config.call_strike_above || 5}
                  onChange={(e) => updateConfiguration('call_strike_above', Number(e.target.value))}
                  min="2"
                  max="15"
                  step="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  value={config.expiration || 30}
                  onChange={(e) => updateConfiguration('expiration', Number(e.target.value))}
                  min="7"
                  max="60"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Premium (%)
                </label>
                <input
                  type="number"
                  value={config.minimum_premium || 1}
                  onChange={(e) => updateConfiguration('minimum_premium', Number(e.target.value))}
                  min="0.5"
                  max="5"
                  step="0.25"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Assignment Handling
                </label>
                <select
                  value={config.assignment_handling || 'hold_and_sell_calls'}
                  onChange={(e) => updateConfiguration('assignment_handling', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="hold_and_sell_calls">Hold & Sell Calls</option>
                  <option value="immediate_sale">Immediate Sale</option>
                  <option value="manual_decision">Manual Decision</option>
                </select>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}