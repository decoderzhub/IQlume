import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Trash2, Play, Pause, BarChart3, DollarSign, AlertTriangle, TrendingUp, Shield, Plus, Wallet, Activity, Clock, Mail, Bell, Zap, Filter } from 'lucide-react';
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
  
  // Configuration state for dynamic editing
  const [configurationState, setConfigurationState] = useState<Record<string, any>>(strategy.configuration);
  
  // Capital allocation
  const [totalAvailableCapital] = useState(250000); // Mock total available capital
  const [allocatedCapitalPercentage, setAllocatedCapitalPercentage] = useState(() => {
    const allocatedCapital = strategy.capital_allocation?.value || strategy.min_capital;
    return Math.round((allocatedCapital / 250000) * 100);
  });
  const currentAllocatedCapital = (totalAvailableCapital * allocatedCapitalPercentage) / 100;

  // Update states when strategy prop changes
  useEffect(() => {
    setEditedStrategy(strategy);
    setConfigurationState(strategy.configuration || {});
    
    // Update allocated capital percentage based on new strategy prop
    const allocatedCapital = strategy.capital_allocation?.value || strategy.min_capital;
    setAllocatedCapitalPercentage(Math.round((allocatedCapital / totalAvailableCapital) * 100));
  }, [strategy]);

  const handleConfigurationChange = (key: string, value: any) => {
    setConfigurationState(prev => ({ ...prev, [key]: value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setEditedStrategy(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleUniversalFieldChange = (field: keyof TradingStrategy, value: any) => {
    setEditedStrategy(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedUniversalFieldChange = (section: keyof TradingStrategy, key: string, value: any) => {
    setEditedStrategy(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
  };

  const handleCapitalAllocationSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    // Update capital allocation value based on slider
    const updatedCapitalAllocation = {
      ...editedStrategy.capital_allocation,
      value: currentAllocatedCapital
    };

    // Basic validation for min_capital vs allocated_capital
    if (currentAllocatedCapital < editedStrategy.min_capital) {
      alert(`Allocated capital (${formatCurrency(currentAllocatedCapital)}) is below the minimum required (${formatCurrency(editedStrategy.min_capital)}) for this strategy.`);
      return;
    }

    // No console.log('Saving strategy with configuration:', configurationState);

    const updatedStrategy: TradingStrategy = {
      ...editedStrategy,
      configuration: {
        ...configurationState,
        ...configurationState, // Strategy-specific config
      },
      capital_allocation: updatedCapitalAllocation, // Update universal capital allocation
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
      case 'spot_grid': return 'Spot Grid';
      case 'futures_grid': return 'Futures Grid';
      case 'infinity_grid': return 'Infinity Grid';
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
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedStrategy.is_active}
                        onChange={(e) => handleUniversalFieldChange('is_active', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-300">
                        {editedStrategy.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Universal Bot Fields */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Universal Bot Fields</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Account ID</label>
                  <input
                    type="text"
                    value={editedStrategy.account_id || ''}
                    onChange={(e) => handleUniversalFieldChange('account_id', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Alpaca-12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Asset Class</label>
                  <select
                    value={editedStrategy.asset_class || ''}
                    onChange={(e) => handleUniversalFieldChange('asset_class', e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Asset Class</option>
                    <option value="equity">Equity</option>
                    <option value="options">Options</option>
                    <option value="crypto">Crypto</option>
                    <option value="futures">Futures</option>
                    <option value="forex">Forex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Base Symbol</label>
                  <input
                    type="text"
                    value={editedStrategy.base_symbol || ''}
                    onChange={(e) => handleUniversalFieldChange('base_symbol', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., AAPL or BTC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Quote Currency</label>
                  <input
                    type="text"
                    value={editedStrategy.quote_currency || ''}
                    onChange={(e) => handleUniversalFieldChange('quote_currency', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., USD or USDT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Time Horizon</label>
                  <select
                    value={editedStrategy.time_horizon || ''}
                    onChange={(e) => handleUniversalFieldChange('time_horizon', e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Time Horizon</option>
                    <option value="intraday">Intraday</option>
                    <option value="swing">Swing</option>
                    <option value="long_term">Long Term</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Automation Level</label>
                  <select
                    value={editedStrategy.automation_level || ''}
                    onChange={(e) => handleUniversalFieldChange('automation_level', e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Automation Level</option>
                    <option value="fully_auto">Fully Automatic</option>
                    <option value="semi_auto">Semi-Automatic</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>

              {/* Capital Allocation */}
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-400" /> Capital Allocation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Mode</label>
                    <select
                      value={editedStrategy.capital_allocation?.mode || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('capital_allocation', 'mode', e.target.value as any)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="fixed_amount_usd">Fixed Amount (USD)</option>
                      <option value="percent_of_portfolio">Percent of Portfolio</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Value</label>
                    <input
                      type="number"
                      value={editedStrategy.capital_allocation?.value || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('capital_allocation', 'value', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Positions</label>
                    <input
                      type="number"
                      value={editedStrategy.capital_allocation?.max_positions || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('capital_allocation', 'max_positions', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Exposure (USD)</label>
                    <input
                      type="number"
                      value={editedStrategy.capital_allocation?.max_exposure_usd || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('capital_allocation', 'max_exposure_usd', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Order Execution */}
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-green-400" /> Order Execution</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Default Order Type</label>
                    <select
                      value={editedStrategy.order_execution?.order_type_default || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('order_execution', 'order_type_default', e.target.value as any)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="market">Market</option>
                      <option value="limit">Limit</option>
                      <option value="limit_if_touched">Limit If Touched</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Limit Tolerance (%)</label>
                    <input
                      type="number"
                      value={editedStrategy.order_execution?.limit_tolerance_percent || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('order_execution', 'limit_tolerance_percent', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Allow Partial Fill</label>
                    <input
                      type="checkbox"
                      checked={editedStrategy.order_execution?.allow_partial_fill || false}
                      onChange={(e) => handleNestedUniversalFieldChange('order_execution', 'allow_partial_fill', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Combo Execution</label>
                    <select
                      value={editedStrategy.order_execution?.combo_execution || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('order_execution', 'combo_execution', e.target.value as any)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="atomic">Atomic</option>
                      <option value="legged">Legged</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Risk Controls */}
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-purple-400" /> Risk Controls</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Take Profit (%)</label>
                    <input
                      type="number"
                      value={editedStrategy.risk_controls?.take_profit_percent || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('risk_controls', 'take_profit_percent', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Stop Loss (%)</label>
                    <input
                      type="number"
                      value={editedStrategy.risk_controls?.stop_loss_percent || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('risk_controls', 'stop_loss_percent', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Daily Loss (USD)</label>
                    <input
                      type="number"
                      value={editedStrategy.risk_controls?.max_daily_loss_usd || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('risk_controls', 'max_daily_loss_usd', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Drawdown (%)</label>
                    <input
                      type="number"
                      value={editedStrategy.risk_controls?.max_drawdown_percent || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('risk_controls', 'max_drawdown_percent', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Data Filters */}
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2"><Filter className="w-5 h-5 text-yellow-400" /> Data Filters</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Min Liquidity</label>
                    <input
                      type="number"
                      value={editedStrategy.data_filters?.min_liquidity || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('data_filters', 'min_liquidity', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Bid/Ask Spread (%)</label>
                    <input
                      type="number"
                      value={editedStrategy.data_filters?.max_bid_ask_spread_pct || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('data_filters', 'max_bid_ask_spread_pct', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      step="0.0001"
                    />
                  </div>
                  {editedStrategy.asset_class === 'options' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">IV Rank Threshold</label>
                        <input
                          type="number"
                          value={editedStrategy.data_filters?.iv_rank_threshold || ''}
                          onChange={(e) => handleNestedUniversalFieldChange('data_filters', 'iv_rank_threshold', Number(e.target.value))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Min Open Interest</label>
                        <input
                          type="number"
                          value={editedStrategy.data_filters?.min_open_interest || ''}
                          onChange={(e) => handleNestedUniversalFieldChange('data_filters', 'min_open_interest', Number(e.target.value))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-orange-400" /> Notifications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Alerts</label>
                    <input
                      type="checkbox"
                      checked={editedStrategy.notifications?.email_alerts || false}
                      onChange={(e) => handleNestedUniversalFieldChange('notifications', 'email_alerts', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Push Notifications</label>
                    <input
                      type="checkbox"
                      checked={editedStrategy.notifications?.push_notifications || false}
                      onChange={(e) => handleNestedUniversalFieldChange('notifications', 'push_notifications', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Webhook URL</label>
                    <input
                      type="text"
                      value={editedStrategy.notifications?.webhook_url || ''}
                      onChange={(e) => handleNestedUniversalFieldChange('notifications', 'webhook_url', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      placeholder="https://your-webhook.com/endpoint"
                    />
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
                      value={allocatedCapitalPercentage} // This is the percentage
                      onChange={handleCapitalAllocationSliderChange}
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
                         style={{ left: `calc(${point}% - 2px)` }}
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
            {['spot_grid', 'futures_grid', 'infinity_grid'].includes(editedStrategy.type) && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Grid3X3 className="w-5 h-5 text-blue-400" /> Grid Bot Configuration</h3>
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
                        type="number" // This should be part of configurationState
                        value={configurationState.price_floor || ''}
                        onChange={(e) => handleConfigurationChange('price_floor', Number(e.target.value))}
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
                        type="number" // This should be part of configurationState
                        value={configurationState.price_ceiling || ''}
                        onChange={(e) => handleConfigurationChange('price_ceiling', Number(e.target.value))}
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
                      type="number" // This should be part of configurationState
                      value={configurationState.price_floor || ''}
                      onChange={(e) => handleConfigurationChange('price_floor', Number(e.target.value))}
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
                      type="number" // This should be part of configurationState
                      value={configurationState.grid_count || ''}
                      onChange={(e) => handleConfigurationChange('grid_count', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="Number of grids"
                      min="2"
                      max="1000"
                    />
                    {numberOfGrids > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Profit/grid: ~{(configurationState.total_investment / configurationState.grid_count).toFixed(2)} USDT (fee deducted)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Total Investment (USDT)
                    </label>
                    <input
                      type="number" // This should be part of configurationState
                      value={configurationState.total_investment || ''}
                      onChange={(e) => handleConfigurationChange('total_investment', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="Total investment (USDT)"
                      min="0"
                      step="10"
                    />
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>0%</span> {/* This is incorrect, should be based on totalInvestment / min_capital */}
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
                        type="number" // This should be part of configurationState
                        value={configurationState.trigger_price || ''}
                        onChange={(e) => handleConfigurationChange('trigger_price', e.target.value ? Number(e.target.value) : undefined)}
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
                          type="number" // This should be part of configurationState
                          value={configurationState.take_profit || ''}
                          onChange={(e) => handleConfigurationChange('take_profit', e.target.value ? Number(e.target.value) : undefined)}
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
                          type="number" // This should be part of configurationState
                          value={configurationState.stop_loss || ''}
                          onChange={(e) => handleConfigurationChange('stop_loss', e.target.value ? Number(e.target.value) : undefined)}
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
                          onClick={() => handleConfigurationChange('grid_mode', 'geometric')}
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
                          onClick={() => handleConfigurationChange('grid_mode', 'arithmetic')}
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
                {configurationState.symbol && (
                  <div>
                    <span className="text-gray-400">Symbol:</span>
                    <span className="text-white ml-2">{editedStrategy.base_symbol}</span>
                  </div>
                )}
                {['spot_grid', 'futures_grid', 'infinity_grid'].includes(editedStrategy.type) && (
                  <>
                    <div>
                      <span className="text-gray-400">Price Range:</span>
                      <span className="text-white ml-2">
                        {editedStrategy.type === 'infinity_grid' 
                          ? `${configurationState.price_floor}+ USDT`
                          : `${configurationState.price_floor} - ${configurationState.price_ceiling} USDT`
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Grids:</span>
                      <span className="text-white ml-2">{configurationState.grid_count}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Investment:</span>
                      <span className="text-white ml-2">{formatCurrency(currentAllocatedCapital)}</span>
                    </div>
                    {configurationState.trigger_price && (
                      <div>
                        <span className="text-gray-400">Trigger:</span>
                        <span className="text-white ml-2">{configurationState.trigger_price} USDT</span>
                      </div>
                    )}
                    {configurationState.take_profit && (
                      <div>
                        <span className="text-gray-400">Take Profit:</span>
                        <span className="text-green-400 ml-2">{configurationState.take_profit} USDT</span>
                      </div>
                    )}
                    {configurationState.stop_loss && (
                      <div>
                        <span className="text-gray-400">Stop Loss:</span>
                        <span className="text-red-400 ml-2">{configurationState.stop_loss} USDT</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Dynamic Strategy-Specific Configuration */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h4 className="font-semibold text-white mb-4">Strategy-Specific Parameters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(configurationState)
                  .filter(([key]) => {
                    // Exclude fields that are now universal or handled by specific UI elements
                    const universalFields = ['symbol', 'allocated_capital', 'price_range_lower', 'price_range_upper', 'number_of_grids', 'total_investment', 'trigger_price', 'take_profit', 'stop_loss', 'grid_mode'];
                    return !universalFields.includes(key);
                  })
                  .map(([key, value]) => (
                    <div key={key} className={
                      key === 'assets' || 
                      (typeof value === 'object' && value !== null && !Array.isArray(value) && 
                       (key === 'stop_loss' || key === 'take_profit')) 
                        ? 'md:col-span-2' : ''
                    }>
                      <label className="block text-sm font-medium text-gray-300 mb-2 capitalize">
                        {key.replace(/_/g, ' ')}
                      </label>
                      {key === 'assets' && Array.isArray(value) ? (
                        <div className="space-y-3">
                          {value.map((asset: any, index: number) => (
                            <div key={index} className="flex gap-3 items-end">
                              <div className="flex-1">
                                <label className="block text-xs text-gray-400 mb-1">Symbol</label>
                                <input
                                  type="text"
                                  value={asset.symbol || ''}
                                  onChange={(e) => {
                                    const newAssets = [...value];
                                    newAssets[index] = { ...asset, symbol: e.target.value };
                                    handleConfigurationChange(key, newAssets);
                                  }}
                                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                  placeholder="Add Symbol"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs text-gray-400 mb-1">Allocation %</label>
                                <input
                                  type="number"
                                  value={asset.allocation || 0}
                                  onChange={(e) => {
                                    const newAssets = [...value];
                                    newAssets[index] = { ...asset, allocation: Number(e.target.value) };
                                    handleConfigurationChange(key, newAssets);
                                  }}
                                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                  min="0"
                                  max="100"
                                  step="1"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newAssets = value.filter((_: any, i: number) => i !== index);
                                  handleConfigurationChange(key, newAssets);
                                }}
                                className="text-red-400 hover:text-red-300 px-2 py-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newAssets = [...value, { symbol: '', allocation: 0 }];
                              handleConfigurationChange(key, newAssets);
                            }}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Asset
                          </Button>
                          <div className="text-xs text-gray-400">
                            Total allocation: {value.reduce((sum: number, asset: any) => sum + (asset.allocation || 0), 0)}%
                          </div>
                        </div>
                      ) : (key === 'stop_loss' || key === 'take_profit') && typeof value === 'object' && value !== null ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Value</label>
                            <input
                              type="number"
                              value={value.value || 0}
                              onChange={(e) => {
                                handleConfigurationChange(key, { 
                                  ...value, 
                                  value: Number(e.target.value) 
                                });
                              }}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Type</label>
                            <select
                              value={value.type || 'percentage'}
                              onChange={(e) => {
                                handleConfigurationChange(key, { 
                                  ...value, 
                                 type: e.target.value
                                });
                              }}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="percentage">Percentage</option>
                              <option value="absolute">Absolute</option>
                            </select>
                          </div>
                        </div>
                      ) : key === 'trigger_type' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2 capitalize">
                            Trigger Type
                          </label>
                          <select
                            value={value}
                            onChange={(e) => handleConfigurationChange(key, e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="threshold">Threshold</option>
                            <option value="time">Time</option>
                          </select>
                        </div>
                      ) : key === 'rebalance_frequency' && configurationState.trigger_type === 'time' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2 capitalize">
                            Rebalance Frequency
                          </label>
                          <select
                            value={value}
                            onChange={(e) => handleConfigurationChange(key, e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="1h">1 Hour</option>
                            <option value="6h">6 Hours</option>
                            <option value="24h">24 Hours</option>
                            <option value="1 week">1 Week</option>
                            <option value="1 month">1 Month</option>
                            <option value="6 months">6 Months</option>
                            <option value="1 year">1 Year</option>
                          </select>
                        </div>
                      ) : typeof value === 'boolean' ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleConfigurationChange(key, e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <span className="text-sm text-gray-300">Enabled</span>
                        </label>
                      ) : typeof value === 'number' ? (
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => handleConfigurationChange(key, Number(e.target.value))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                          step={key.includes('percent') || key.includes('delta') || key.includes('ratio') ? '0.01' : '1'}
                        />
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleConfigurationChange(key, e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                onClick={() => onDelete(editedStrategy.id)}
                className="text-red-400 border-red-500/20 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Strategy
              </Button>
              
              <div className="flex-1" />
              
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}