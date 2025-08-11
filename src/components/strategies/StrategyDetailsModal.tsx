import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Settings, BarChart3, Play, Pause, Trash2, Save } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency, formatPercent } from '../../lib/utils';

interface StrategyDetailsModalProps {
  strategy: TradingStrategy;
  onClose: () => void;
  onSave: (strategy: TradingStrategy) => void;
  onDelete?: (strategyId: string) => void;
}

export function StrategyDetailsModal({ strategy, onClose, onSave, onDelete }: StrategyDetailsModalProps) {
  const [editedStrategy, setEditedStrategy] = useState<TradingStrategy>(strategy);
  const [activeTab, setActiveTab] = useState<'config' | 'performance' | 'logs'>('config');

  const handleSave = () => {
    onSave(editedStrategy);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the strategy "${strategy.name}"? This action cannot be undone.`)) {
      if (onDelete) {
        onDelete(strategy.id);
      }
    }
  };

  const updateConfiguration = (key: string, value: any) => {
    setEditedStrategy(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        [key]: value,
      },
    }));
  };

  const renderConfigurationForm = () => {
    const config = editedStrategy.configuration;

    switch (editedStrategy.type) {
      case 'spot_grid':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lower Price Range
                </label>
                <input
                  type="number"
                  value={config.price_range_lower || 0}
                  onChange={(e) => updateConfiguration('price_range_lower', Number(e.target.value))}
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upper Price Range
                </label>
                <input
                  type="number"
                  value={config.price_range_upper || 0}
                  onChange={(e) => updateConfiguration('price_range_upper', Number(e.target.value))}
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Grids
                </label>
                <input
                  type="number"
                  value={config.number_of_grids || 25}
                  onChange={(e) => updateConfiguration('number_of_grids', Number(e.target.value))}
                  min="5"
                  max="100"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Grid Spacing (%)
                </label>
                <input
                  type="number"
                  value={config.grid_spacing_percent || 1.0}
                  onChange={(e) => updateConfiguration('grid_spacing_percent', Number(e.target.value))}
                  min="0.1"
                  max="10"
                  step="0.1"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mode
              </label>
              <select
                value={config.mode || 'auto'}
                onChange={(e) => updateConfiguration('mode', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="auto">Auto (KuCoin defaults)</option>
                <option value="customize">Customize</option>
              </select>
            </div>
          </div>
        );

      case 'futures_grid':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Direction
                </label>
                <select
                  value={config.direction || 'long'}
                  onChange={(e) => updateConfiguration('direction', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Leverage (1x-10x)
                </label>
                <input
                  type="number"
                  value={config.leverage || 3}
                  onChange={(e) => updateConfiguration('leverage', Number(e.target.value))}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lower Price Range
                </label>
                <input
                  type="number"
                  value={config.price_range_lower || 0}
                  onChange={(e) => updateConfiguration('price_range_lower', Number(e.target.value))}
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upper Price Range
                </label>
                <input
                  type="number"
                  value={config.price_range_upper || 0}
                  onChange={(e) => updateConfiguration('price_range_upper', Number(e.target.value))}
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Grids
                </label>
                <input
                  type="number"
                  value={config.number_of_grids || 20}
                  onChange={(e) => updateConfiguration('number_of_grids', Number(e.target.value))}
                  min="5"
                  max="50"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Margin Amount ($)
                </label>
                <input
                  type="number"
                  value={config.margin_amount || 1000}
                  onChange={(e) => updateConfiguration('margin_amount', Number(e.target.value))}
                  min="100"
                  step="100"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        );

      case 'infinity_grid':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lowest Price (Stop Price)
                </label>
                <input
                  type="number"
                  value={config.lowest_price || 0}
                  onChange={(e) => updateConfiguration('lowest_price', Number(e.target.value))}
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Profit per Grid (%)
                </label>
                <input
                  type="number"
                  value={config.profit_per_grid_percent || 1.0}
                  onChange={(e) => updateConfiguration('profit_per_grid_percent', Number(e.target.value))}
                  min="0.2"
                  max="10"
                  step="0.1"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mode
              </label>
              <select
                value={config.mode || 'auto'}
                onChange={(e) => updateConfiguration('mode', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="auto">Auto (KuCoin defaults)</option>
                <option value="customize">Customize</option>
              </select>
            </div>
          </div>
        );

      case 'dca':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Investment Amount per Interval ($)
                </label>
                <input
                  type="number"
                  value={config.investment_amount_per_interval || 100}
                  onChange={(e) => updateConfiguration('investment_amount_per_interval', Number(e.target.value))}
                  min="10"
                  step="10"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Frequency
                </label>
                <select
                  value={config.frequency || 'daily'}
                  onChange={(e) => updateConfiguration('frequency', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="hourly">Every Hour</option>
                  <option value="4h">Every 4 Hours</option>
                  <option value="8h">Every 8 Hours</option>
                  <option value="12h">Every 12 Hours</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Investment Target (% Gain Alert)
              </label>
              <input
                type="number"
                value={config.investment_target_percent || 20}
                onChange={(e) => updateConfiguration('investment_target_percent', Number(e.target.value))}
                min="5"
                max="100"
                step="5"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
              <p className="text-xs text-gray-400 mt-1">Alert when profit reaches this percentage</p>
            </div>
          </div>
        );

      case 'smart_rebalance':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Trigger Type
                </label>
                <select
                  value={config.trigger_type || 'threshold'}
                  onChange={(e) => updateConfiguration('trigger_type', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="time">Time-Based</option>
                  <option value="threshold">Threshold-Based</option>
                </select>
              </div>
              <div>
                {config.trigger_type === 'time' ? (
                  <>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Rebalance Frequency
                    </label>
                    <select
                      value={config.rebalance_frequency || 'daily'}
                      onChange={(e) => updateConfiguration('rebalance_frequency', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="4h">Every 4 Hours</option>
                      <option value="8h">Every 8 Hours</option>
                      <option value="12h">Every 12 Hours</option>
                      <option value="daily">Daily</option>
                    </select>
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Threshold Deviation (%)
                    </label>
                    <input
                      type="number"
                      value={config.threshold_deviation_percent || 5}
                      onChange={(e) => updateConfiguration('threshold_deviation_percent', Number(e.target.value))}
                      min="1"
                      max="20"
                      step="1"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Asset Allocations (up to 6 assets)
              </label>
              <div className="space-y-2">
                {(config.assets || []).map((asset: any, index: number) => (
                  <div key={index} className="grid grid-cols-3 gap-2">
                    <input // Asset Symbol Input
                      // Ensure there are always at least 2 assets
                      // Disable removal if only 2 assets are left
                      // Max 12 assets
                      type="text"
                      value={asset.symbol}
                      onChange={(e) => {
                        const newAssets = [...(config.assets || [])];
                        newAssets[index] = { ...asset, symbol: e.target.value.toUpperCase() };
                        updateConfiguration('assets', newAssets);
                      }}
                      placeholder="Symbol"
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                    <input // Allocation Percentage Input
                      type="number"
                      value={asset.allocation}
                      onChange={(e) => {
                        const newAssets = [...(config.assets || [])];
                        newAssets[index] = { ...asset, allocation: Number(e.target.value) };
                        updateConfiguration('assets', newAssets);
                      }}
                      placeholder="Allocation %"
                      min="1"
                      max="100"
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                    <button
                      type="button" // Remove Asset Button
                      onClick={() => {
                        const newAssets = (config.assets || []).filter((_: any, i: number) => i !== index);
                        updateConfiguration('assets', newAssets);
                      }}
                      disabled={(config.assets || []).length <= 2} // Disable if only 2 assets left
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {(!config.assets || config.assets.length < 12) && ( // Max 12 assets
                  <button
                    type="button"
                    onClick={() => {
                      const newAssets = [...(config.assets || []), { symbol: '', allocation: 0 }];
                      updateConfiguration('assets', newAssets);
                    }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm"
                  >
                    Add Asset
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case 'covered_calls':
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
                  Strike Above Cost Basis (%)
                </label>
                <input
                  type="number"
                  value={config.strike_above_cost_basis || 5}
                  onChange={(e) => updateConfiguration('strike_above_cost_basis', Number(e.target.value))}
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Premium (%)
                </label>
                <input
                  type="number"
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
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
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
        );

      case 'iron_condor':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Wing Width ($)
                </label>
                <input
                  type="number"
                  value={config.wing_width || 10}
                  onChange={(e) => updateConfiguration('wing_width', Number(e.target.value))}
                  min="5"
                  max="50"
                  step="5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  DTE Target (days)
                </label>
                <input
                  type="number"
                  value={config.dte_target || 45}
                  onChange={(e) => updateConfiguration('dte_target', Number(e.target.value))}
                  min="14"
                  max="90"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Profit Target (%)
                </label>
                <input
                  type="number"
                  value={(config.profit_target || 0.25) * 100}
                  onChange={(e) => updateConfiguration('profit_target', Number(e.target.value) / 100)}
                  min="10"
                  max="50"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Loss (%)
                </label>
                <input
                  type="number"
                  value={(config.max_loss || 0.5) * 100}
                  onChange={(e) => updateConfiguration('max_loss', Number(e.target.value) / 100)}
                  min="25"
                  max="100"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        );

      case 'orb':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ORB Period (minutes)
                </label>
                <input
                  type="number"
                  value={config.orb_period || 15}
                  onChange={(e) => updateConfiguration('orb_period', Number(e.target.value))}
                  min="5"
                  max="60"
                  step="5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Breakout Threshold (%)
                </label>
                <input
                  type="number"
                  value={(config.breakout_threshold || 0.002) * 100}
                  onChange={(e) => updateConfiguration('breakout_threshold', Number(e.target.value) / 100)}
                  min="0.1"
                  max="2"
                  step="0.1"
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
                  value={(config.stop_loss || 0.01) * 100}
                  onChange={(e) => updateConfiguration('stop_loss', Number(e.target.value) / 100)}
                  min="0.5"
                  max="5"
                  step="0.1"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Take Profit (%)
                </label>
                <input
                  type="number"
                  value={(config.take_profit || 0.02) * 100}
                  onChange={(e) => updateConfiguration('take_profit', Number(e.target.value) / 100)}
                  min="1"
                  max="10"
                  step="0.1"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center text-gray-400 py-8">
            <p>Configuration options for this strategy type are not yet implemented.</p>
          </div>
        );
    }
  };

  const renderPerformanceTab = () => {
    const perf = strategy.performance;
    if (!perf) {
      return (
        <div className="text-center text-gray-400 py-8">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p>No performance data available yet.</p>
          <p className="text-sm">Start the strategy to begin collecting metrics.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/30 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Total Return</p>
            <p className={`text-xl font-bold ${perf.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatPercent(perf.total_return)}
            </p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Win Rate</p>
            <p className="text-xl font-bold text-blue-400">
              {formatPercent(perf.win_rate)}
            </p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Max Drawdown</p>
            <p className="text-xl font-bold text-purple-400">
              {formatPercent(perf.max_drawdown)}
            </p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Sharpe Ratio</p>
            <p className="text-xl font-bold text-yellow-400">
              {perf.sharpe_ratio?.toFixed(2) || 'N/A'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/30 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Total Trades</p>
            <p className="text-lg font-semibold text-white">{perf.total_trades || 0}</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Avg Trade Duration</p>
            <p className="text-lg font-semibold text-white">{perf.avg_trade_duration || 0} days</p>
          </div>
        </div>
      </div>
    );
  };

  const renderLogsTab = () => {
    const mockLogs = [
      { timestamp: '2024-01-15T14:30:00Z', level: 'info', message: 'Strategy started successfully' },
      { timestamp: '2024-01-15T14:25:00Z', level: 'success', message: 'Position opened: AAPL 175C' },
      { timestamp: '2024-01-15T14:20:00Z', level: 'info', message: 'Market conditions analyzed' },
      { timestamp: '2024-01-15T14:15:00Z', level: 'warning', message: 'High volatility detected' },
      { timestamp: '2024-01-15T14:10:00Z', level: 'info', message: 'Scanning for opportunities' },
    ];

    return (
      <div className="space-y-3">
        {mockLogs.map((log, index) => (
          <div key={index} className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg">
            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
              log.level === 'success' ? 'bg-green-500' :
              log.level === 'warning' ? 'bg-yellow-500' :
              log.level === 'error' ? 'bg-red-500' :
              'bg-blue-500'
            }`} />
            <div className="flex-1">
              <p className="text-white text-sm">{log.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(log.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
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
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">{strategy.name}</h2>
                <div className={`w-3 h-3 rounded-full ${strategy.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
              </div>
              <p className="text-gray-400">{strategy.description}</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 bg-gray-800/30 rounded-lg p-1">
            {[
              { id: 'config', label: 'Configuration', icon: Settings },
              { id: 'performance', label: 'Performance', icon: BarChart3 },
              { id: 'logs', label: 'Logs', icon: Play },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="mb-8">
            {activeTab === 'config' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Strategy Name
                    </label>
                    <input
                      type="text"
                      value={editedStrategy.name}
                      onChange={(e) => setEditedStrategy(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Symbol
                    </label>
                    <input
                      type="text"
                      value={editedStrategy.configuration.symbol || ''}
                      onChange={(e) => updateConfiguration('symbol', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Risk Level
                    </label>
                    <select
                      value={editedStrategy.risk_level}
                      onChange={(e) => setEditedStrategy(prev => ({ ...prev, risk_level: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="low">Low Risk</option>
                      <option value="auto">Auto</option>
                      <option value="high">High Risk</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editedStrategy.description}
                    onChange={(e) => setEditedStrategy(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <h4 className="font-medium text-white mb-4">Strategy Parameters</h4>
                  {renderConfigurationForm()}
                </div>
              </div>
            )}

            {activeTab === 'performance' && renderPerformanceTab()}
            {activeTab === 'logs' && renderLogsTab()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-800">
            <Button
              variant="outline"
              onClick={() => setEditedStrategy(prev => ({ ...prev, is_active: !prev.is_active }))}
              className="flex items-center gap-2"
            >
              {editedStrategy.is_active ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause Strategy
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Strategy
                </>
              )}
            </Button>

            <div className="flex-1" />

            <Button 
              variant="ghost" 
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>

            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>

            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}