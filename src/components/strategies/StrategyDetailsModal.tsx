import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Settings,
  TrendingUp,
  TrendingDown,
  Shield,
  DollarSign,
  Target,
  Clock,
  Save,
  Trash2,
  AlertTriangle,
  Grid3X3,
  BarChart3,
  Activity,
  Zap
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumericInput } from '../ui/NumericInput';
import { SymbolSearchInput } from '../ui/SymbolSearchInput';
import { TradingStrategy } from '../../types';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { TelemetryDashboard } from './TelemetryDashboard';
import { GridOrdersDisplay } from './GridOrdersDisplay';

interface StrategyDetailsModalProps {
  strategy: TradingStrategy;
  onClose: () => void;
  onSave: (strategy: TradingStrategy) => void;
  onDelete: (strategyId: string) => void;
}

export function StrategyDetailsModal({ strategy, onClose, onSave, onDelete }: StrategyDetailsModalProps) {
  const [editedStrategy, setEditedStrategy] = useState<TradingStrategy>({ ...strategy });
  const [activeTab, setActiveTab] = useState<'overview' | 'configuration' | 'performance' | 'risk'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleSave = () => {
    onSave(editedStrategy);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${strategy.name}"? This action cannot be undone.`)) {
      onDelete(strategy.id);
    }
  };

  const handleExecuteNow = async () => {
    try {
      setIsExecuting(true);
      const response = await fetch(`/api/strategies/${strategy.id}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to execute strategy');
      }

      const result = await response.json();
      console.log('Strategy execution result:', result);
      alert(`Strategy executed successfully! Action: ${result.action || 'completed'}`);
    } catch (error) {
      console.error('Error executing strategy:', error);
      alert('Failed to execute strategy. Please try again.');
    } finally {
      setIsExecuting(false);
    }
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getStrategyTypeLabel = (type: string) => {
    switch (type) {
      case 'covered_calls': return 'Covered Calls';
      case 'spot_grid': return 'Spot Grid Bot';
      case 'futures_grid': return 'Futures Grid Bot';
      case 'infinity_grid': return 'Infinity Grid Bot';
      case 'dca': return 'DCA Bot';
      case 'smart_rebalance': return 'Smart Rebalance';
      case 'wheel': return 'The Wheel';
      case 'short_put': return 'Cash-Secured Put';
      case 'iron_condor': return 'Iron Condor';
      case 'straddle': return 'Long Straddle';
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'telemetry', label: 'Live Telemetry', icon: Activity },
    { id: 'configuration', label: 'Configuration', icon: Settings },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'risk', label: 'Risk Analysis', icon: Shield },
  ];

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Strategy Name</label>
          {isEditing ? (
            <input
              type="text"
              value={editedStrategy.name}
              onChange={(e) => setEditedStrategy(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
          ) : (
            <p className="text-white font-medium">{strategy.name}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Strategy Type</label>
          <p className="text-white font-medium">{getStrategyTypeLabel(strategy.type)}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
        {isEditing ? (
          <textarea
            value={editedStrategy.description}
            onChange={(e) => setEditedStrategy(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
            rows={3}
          />
        ) : (
          <p className="text-gray-300">{strategy.description}</p>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-purple-400" />
            <div>
              <p className="text-sm text-gray-400">Risk Level</p>
              <span className={`px-2 py-1 rounded text-sm font-medium border ${getRiskColor(strategy.risk_level)}`}>
                {strategy.risk_level}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-sm text-gray-400">Min Capital</p>
              <p className="font-semibold text-white">{formatCurrency(strategy.min_capital)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${strategy.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className="text-white text-sm">{strategy.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Grid Orders Display for Spot Grid Strategies */}
      {strategy.type === 'spot_grid' && strategy.is_active && strategy.configuration && (
        <GridOrdersDisplay
          strategyId={strategy.id}
          symbol={strategy.base_symbol || strategy.configuration.symbol || 'BTC'}
          lowerPrice={strategy.configuration.price_range_lower || 0}
          upperPrice={strategy.configuration.price_range_upper || 0}
          numberOfGrids={strategy.configuration.number_of_grids || 20}
          currentPrice={strategy.telemetry_data?.current_price}
          allocatedCapital={strategy.configuration.allocated_capital || strategy.min_capital}
        />
      )}
    </div>
  );

  const renderConfigurationTab = () => (
    <div className="space-y-6">
      {/* Base Symbol Field */}
      {strategy.base_symbol && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Base Symbol</label>
          {isEditing ? (
            <SymbolSearchInput
              value={editedStrategy.base_symbol || ''}
              onChange={(value) => setEditedStrategy(prev => ({ ...prev, base_symbol: value }))}
              placeholder="Search for a symbol"
              className="w-full"
            />
          ) : (
            <div className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg">
              <span className="text-white font-medium">{strategy.base_symbol}</span>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Spot Grid Configuration Display */}
      {strategy.type === 'spot_grid' && (
        <div className="space-y-4">
          <h4 className="font-medium text-white">Enhanced Grid Configuration</h4>
          
          {/* Grid Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/30 rounded-lg p-3">
              <h5 className="text-sm font-medium text-blue-400 mb-2">Grid Setup</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mode:</span>
                  {isEditing ? (
                    <select
                      value={editedStrategy.grid_mode || 'arithmetic'}
                      onChange={(e) => setEditedStrategy(prev => ({ ...prev, grid_mode: e.target.value as 'arithmetic' | 'geometric' }))}
                      className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                    >
                      <option value="arithmetic">Arithmetic</option>
                      <option value="geometric">Geometric</option>
                    </select>
                  ) : (
                    <span className="text-white capitalize">{strategy.grid_mode || 'arithmetic'}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quantity per Grid:</span>
                  {isEditing ? (
                    <NumericInput
                      value={editedStrategy.quantity_per_grid || 0}
                      onChange={(value) => setEditedStrategy(prev => ({ ...prev, quantity_per_grid: value }))}
                      min={0}
                      step={0.001}
                      allowDecimals={true}
                      className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                      placeholder="Auto"
                    />
                  ) : (
                    <span className="text-white">{strategy.quantity_per_grid || 'Auto-calculate'}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Volume Threshold:</span>
                  {isEditing ? (
                    <NumericInput
                      value={editedStrategy.volume_threshold || 0}
                      onChange={(value) => setEditedStrategy(prev => ({ ...prev, volume_threshold: value }))}
                      min={0}
                      step={1000}
                      className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                      placeholder="None"
                    />
                  ) : (
                    <span className="text-white">{strategy.volume_threshold || 'None'}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price Movement Threshold:</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <NumericInput
                        value={editedStrategy.price_movement_threshold || 0}
                        onChange={(value) => setEditedStrategy(prev => ({ ...prev, price_movement_threshold: value }))}
                        min={0}
                        max={100}
                        step={0.1}
                        allowDecimals={true}
                        className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                      />
                      <span className="text-gray-400 text-xs">%</span>
                    </div>
                  ) : (
                    <span className="text-white">{strategy.price_movement_threshold || 0}%</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/30 rounded-lg p-3">
              <h5 className="text-sm font-medium text-purple-400 mb-2">Automation</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Auto Start:</span>
                  {isEditing ? (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedStrategy.auto_start || false}
                        onChange={(e) => setEditedStrategy(prev => ({ ...prev, auto_start: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  ) : (
                    <span className={`${strategy.auto_start ? 'text-green-400' : 'text-gray-400'}`}>
                      {strategy.auto_start ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Execution Interval:</span>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <NumericInput
                        value={editedStrategy.execution_interval_seconds || 300}
                        onChange={(value) => setEditedStrategy(prev => ({
                          ...prev,
                          execution_interval_seconds: Math.max(30, value)
                        }))}
                        min={30}
                        step={30}
                        className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      />
                      <span className="text-xs text-gray-500">seconds</span>
                    </div>
                  ) : (
                    <span className="text-white">
                      {strategy.execution_interval_seconds
                        ? strategy.execution_interval_seconds >= 3600
                          ? `${Math.floor(strategy.execution_interval_seconds / 3600)}h ${Math.floor((strategy.execution_interval_seconds % 3600) / 60)}m`
                          : strategy.execution_interval_seconds >= 60
                            ? `${Math.floor(strategy.execution_interval_seconds / 60)} min`
                            : `${strategy.execution_interval_seconds}s`
                        : '5 min'}
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Execution Count:</span>
                  <span className="text-white">{strategy.execution_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Execution:</span>
                  <span className="text-white">
                    {strategy.last_execution ? new Date(strategy.last_execution).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Risk Management */}
          {(strategy.stop_loss_percent || strategy.trailing_stop_loss_percent || (strategy.take_profit_levels && strategy.take_profit_levels.length > 0)) && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-red-400 mb-3">Risk Management</h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 text-sm">Stop Loss:</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1 mt-1">
                      <NumericInput
                        value={editedStrategy.stop_loss_percent || 0}
                        onChange={(value) => setEditedStrategy(prev => ({ ...prev, stop_loss_percent: value }))}
                        min={0}
                        max={100}
                        step={0.1}
                        allowDecimals={true}
                        className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                        placeholder="0"
                      />
                      <span className="text-gray-400 text-xs">%</span>
                    </div>
                  ) : (
                    <span className="text-red-400 ml-2 font-medium">
                      {strategy.stop_loss_percent ? `${strategy.stop_loss_percent}%` : 'Not set'}
                    </span>
                  )}
                </div>
                
                <div>
                  <span className="text-gray-400 text-sm">Trailing Stop:</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1 mt-1">
                      <NumericInput
                        value={editedStrategy.trailing_stop_loss_percent || 0}
                        onChange={(value) => setEditedStrategy(prev => ({ ...prev, trailing_stop_loss_percent: value }))}
                        min={0}
                        max={100}
                        step={0.1}
                        allowDecimals={true}
                        className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                        placeholder="0"
                      />
                      <span className="text-gray-400 text-xs">%</span>
                    </div>
                  ) : (
                    <span className="text-red-400 ml-2 font-medium">
                      {strategy.trailing_stop_loss_percent ? `${strategy.trailing_stop_loss_percent}%` : 'Not set'}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Take Profit Levels - Display only for now */}
              {strategy.take_profit_levels && strategy.take_profit_levels.length > 0 && (
                <div className="mt-3">
                  <h6 className="text-sm font-medium text-green-400 mb-2">Take Profit Levels</h6>
                  <div className="space-y-1">
                    {strategy.take_profit_levels.map((level: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-400">Level {index + 1}:</span>
                        <span className="text-green-400">
                          {level.percent}% profit → Close {level.quantity_percent}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Technical Indicators - Display only for now */}
          {strategy.technical_indicators && Object.values(strategy.technical_indicators).some((ind: any) => ind?.enabled) && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-purple-400 mb-3">Technical Indicators</h5>
              
              <div className="space-y-2">
                {strategy.technical_indicators.rsi?.enabled && (
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">RSI ({strategy.technical_indicators.rsi.period}):</span>
                      <span className="text-white">
                        Buy ≤{strategy.technical_indicators.rsi.buy_threshold}, Sell ≥{strategy.technical_indicators.rsi.sell_threshold}
                      </span>
                    </div>
                  </div>
                )}
                
                {strategy.technical_indicators.macd?.enabled && (
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">MACD:</span>
                      <span className="text-white">
                        {strategy.technical_indicators.macd.additional_params?.fast_period}/
                        {strategy.technical_indicators.macd.additional_params?.slow_period}/
                        {strategy.technical_indicators.macd.additional_params?.signal_period}
                      </span>
                    </div>
                  </div>
                )}
                
                {strategy.technical_indicators.bollinger_bands?.enabled && (
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Bollinger Bands:</span>
                      <span className="text-white">
                        Period {strategy.technical_indicators.bollinger_bands.period}, 
                        StdDev {strategy.technical_indicators.bollinger_bands.additional_params?.std_dev}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Standard Configuration */}
      <div>
        <h4 className="font-medium text-white mb-4">Strategy Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(strategy.configuration || {}).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-300 mb-2 capitalize">
                {key.replace('_', ' ')}
              </label>
              {isEditing ? (
                <div>
                  {key === 'symbol' ? (
                    <SymbolSearchInput
                      value={editedStrategy.configuration?.[key] || ''}
                      onChange={(newValue) => setEditedStrategy(prev => ({
                        ...prev,
                        configuration: {
                          ...prev.configuration,
                          [key]: newValue
                        }
                      }))}
                      placeholder="Search for a symbol"
                      className="w-full"
                    />
                  ) : typeof value === 'number' ? (
                    <NumericInput
                      value={editedStrategy.configuration?.[key] || 0}
                      onChange={(newValue) => setEditedStrategy(prev => ({
                        ...prev,
                        configuration: {
                          ...prev.configuration,
                          [key]: newValue
                        }
                      }))}
                      min={key.includes('percent') ? 0 : undefined}
                      max={key.includes('percent') ? 100 : undefined}
                      step={key.includes('percent') ? 0.1 : key.includes('price') ? 0.01 : 1}
                      allowDecimals={true}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  ) : typeof value === 'boolean' ? (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedStrategy.configuration?.[key] || false}
                        onChange={(e) => setEditedStrategy(prev => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            [key]: e.target.checked
                          }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  ) : typeof value === 'string' ? (
                    key === 'symbol' ? (
                      <SymbolSearchInput
                        value={editedStrategy.configuration?.[key] || ''}
                        onChange={(newValue) => setEditedStrategy(prev => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            [key]: newValue
                          }
                        }))}
                        placeholder="Search for a symbol"
                        className="w-full"
                      />
                    ) : (
                      <input
                        type="text"
                        value={editedStrategy.configuration?.[key] || ''}
                        onChange={(e) => setEditedStrategy(prev => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            [key]: e.target.value
                          }
                        }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      />
                    )
                  ) : (
                    <textarea
                      value={JSON.stringify(editedStrategy.configuration?.[key] || value, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsedValue = JSON.parse(e.target.value);
                          setEditedStrategy(prev => ({
                            ...prev,
                            configuration: {
                              ...prev.configuration,
                              [key]: parsedValue
                            }
                          }));
                        } catch (error) {
                          // Invalid JSON, don't update
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-xs"
                      rows={3}
                    />
                  )}
                </div>
              ) : (
                <div className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                  <span className="text-white">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Risk Level and Min Capital */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Risk Level</label>
          {isEditing ? (
            <select
              value={editedStrategy.risk_level}
              onChange={(e) => setEditedStrategy(prev => ({ ...prev, risk_level: e.target.value as 'low' | 'medium' | 'high' }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          ) : (
            <div className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg">
              <span className={`px-2 py-1 rounded text-sm font-medium border ${getRiskColor(strategy.risk_level)}`}>
                {strategy.risk_level}
              </span>
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Capital</label>
          {isEditing ? (
            <NumericInput
              value={editedStrategy.min_capital}
              onChange={(value) => setEditedStrategy(prev => ({ ...prev, min_capital: value }))}
              min={100}
              step={100}
              prefix="$"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
          ) : (
            <div className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg">
              <span className="text-white">{formatCurrency(strategy.min_capital)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTelemetryTab = () => (
    <TelemetryDashboard strategy={strategy} />
  );

  const renderPerformanceTab = () => {
    const performance = strategy.performance && typeof strategy.performance === 'object' ? strategy.performance : null;
    
    if (!performance) {
      return (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Performance Data</h3>
          <p className="text-gray-400">Run a backtest to see performance metrics</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400">Total Return</span>
            </div>
            <p className="text-xl font-bold text-green-400">
              {formatPercent(performance.total_return)}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Win Rate</span>
            </div>
            <p className="text-xl font-bold text-blue-400">
              {formatPercent(performance.win_rate || 0)}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-gray-400">Max Drawdown</span>
            </div>
            <p className="text-xl font-bold text-purple-400">
              {formatPercent(performance.max_drawdown || 0)}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-400">Total Trades</span>
            </div>
            <p className="text-xl font-bold text-yellow-400">
              {performance.total_trades || 0}
            </p>
          </Card>
        </div>

        {/* Additional Performance Metrics */}
        {((performance.sharpe_ratio && performance.sharpe_ratio !== 0) || (performance.volatility && performance.volatility !== 0) || (performance.beta && performance.beta !== 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(performance.sharpe_ratio && performance.sharpe_ratio !== 0) && (
              <Card className="p-4">
                <p className="text-sm text-gray-400 mb-1">Sharpe Ratio</p>
                <p className="text-lg font-bold text-white">{performance.sharpe_ratio.toFixed(2)}</p>
              </Card>
            )}
            {(performance.volatility && performance.volatility !== 0) && (
              <Card className="p-4">
                <p className="text-sm text-gray-400 mb-1">Volatility</p>
                <p className="text-lg font-bold text-white">{(performance.volatility * 100).toFixed(2)}%</p>
              </Card>
            )}
            {(performance.beta && performance.beta !== 0) && (
              <Card className="p-4">
                <p className="text-sm text-gray-400 mb-1">Beta</p>
                <p className="text-lg font-bold text-white">{performance.beta.toFixed(2)}</p>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderRiskTab = () => (
    <div className="space-y-6">
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-400 mb-2">Risk Disclosure</h4>
            <p className="text-sm text-yellow-300">
              All trading involves risk of loss. This strategy has been classified as{' '}
              <span className="font-semibold capitalize">{strategy.risk_level}</span> risk based on its 
              characteristics and historical performance.
            </p>
          </div>
        </div>
      </div>

      {/* Risk Controls */}
      <div>
        <h4 className="font-semibold text-white mb-4">Risk Controls</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strategy.risk_controls && Object.entries(strategy.risk_controls).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
              <span className="text-gray-400 capitalize">{key.replace('_', ' ')}</span>
              <span className="text-white font-medium">
                {typeof value === 'number' && key.includes('percent') ? `${value}%` : 
                 typeof value === 'number' && key.includes('usd') ? formatCurrency(value) :
                 String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

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
                <h2 className="text-2xl font-bold text-white">{strategy.name}</h2>
                <p className="text-gray-400">{getStrategyTypeLabel(strategy.type)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 bg-gray-800/30 p-1 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'telemetry' && <TelemetryDashboard strategy={strategy} />}
            {activeTab === 'configuration' && renderConfigurationTab()}
            {activeTab === 'performance' && renderPerformanceTab()}
            {activeTab === 'risk' && renderRiskTab()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-800">
            {isEditing ? (
              <>
                <Button variant="secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="text-red-400 border-red-500/20 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Strategy
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={handleExecuteNow}
                  disabled={isExecuting || !strategy.is_active}
                  className="border-green-500/20 hover:bg-green-500/10 text-green-400"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {isExecuting ? 'Executing...' : 'Execute Now'}
                </Button>
                <Button onClick={onClose}>
                  Close
                </Button>
              </>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}