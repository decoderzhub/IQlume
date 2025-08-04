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
}

export function StrategyDetailsModal({ strategy, onClose, onSave }: StrategyDetailsModalProps) {
  const [editedStrategy, setEditedStrategy] = useState<TradingStrategy>(strategy);
  const [activeTab, setActiveTab] = useState<'config' | 'performance' | 'logs'>('config');

  const handleSave = () => {
    onSave(editedStrategy);
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
                    <input
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
                    <input
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
                      type="button"
                      onClick={() => {
                        const newAssets = (config.assets || []).filter((_: any, i: number) => i !== index);
                        updateConfiguration('assets', newAssets);
                      }}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {(!config.assets || config.assets.length < 6) && (
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
                  Strike Delta
                </label>
                <input
                  type="number"
                  value={config.strike_delta || 0.3}
                  onChange={(e) => updateConfiguration('strike_delta', Number(e.target.value))}
                  step="0.05"
                  min="0.1"
                  max="0.5"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  DTE Target (days)
                </label>
                <input
                  type="number"
                  value={config.dte_target || 30}
                  onChange={(e) => updateConfiguration('dte_target', Number(e.target.value))}
                  min="7"
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
                  value={(config.profit_target || 0.5) * 100}
                  onChange={(e) => updateConfiguration('profit_target', Number(e.target.value) / 100)}
                  min="10"
                  max="90"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position Size
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
                      <option value="medium">Medium Risk</option>
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

            <Button variant="ghost" className="text-red-400 hover:text-red-300">
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