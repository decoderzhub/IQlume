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
  Activity
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { TelemetryDashboard } from './TelemetryDashboard';
import { AssetAllocationManager } from './AssetAllocationManager';

interface StrategyDetailsModalProps {
  strategy: TradingStrategy;
  onClose: () => void;
  onSave: (strategy: TradingStrategy) => void;
  onDelete: (strategyId: string) => void;
}

interface AssetAllocationItem {
  symbol: string;
  allocation_percent: number;
  asset_class?: string;
  market_cap?: number;
  name?: string;
  exchange?: string;
}

export function StrategyDetailsModal({ strategy, onClose, onSave, onDelete }: StrategyDetailsModalProps) {
  const [editedStrategy, setEditedStrategy] = useState<TradingStrategy>({ ...strategy });
  const [activeTab, setActiveTab] = useState<'overview' | 'configuration' | 'performance' | 'risk'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  
  // Asset allocation state for smart_rebalance
  const [totalCapital, setTotalCapital] = useState(
    strategy.capital_allocation?.value || strategy.min_capital
  );
  const [assets, setAssets] = useState<AssetAllocationItem[]>(
    strategy.capital_allocation?.assets || []
  );
  const [allocationMode, setAllocationMode] = useState<'manual' | 'even_split' | 'market_cap_weighted' | 'majority_cash_even' | 'majority_cash_market_cap'>(
    strategy.capital_allocation?.allocation_mode || 'manual'
  );

  const handleSave = () => {
    // Update capital allocation for smart_rebalance strategies
    if (strategy.type === 'smart_rebalance') {
      editedStrategy.capital_allocation = {
        mode: 'fixed_amount_usd',
        value: totalCapital,
        assets: assets,
        allocation_mode: allocationMode,
      };
      editedStrategy.min_capital = totalCapital;
      editedStrategy.configuration = {
        ...editedStrategy.configuration,
        total_capital: totalCapital,
        allocation_mode: allocationMode,
        assets: assets,
        rebalance_threshold: 5.0,
        rebalance_frequency: 'weekly',
      };
    }
    
    onSave(editedStrategy);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${strategy.name}"? This action cannot be undone.`)) {
      onDelete(strategy.id);
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
    </div>
  );

  const renderConfigurationTab = () => (
    <div className="space-y-6">
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
                  <span className="text-white capitalize">{strategy.grid_mode || 'arithmetic'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quantity per Grid:</span>
                  <span className="text-white">{strategy.quantity_per_grid || 'Auto-calculate'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Volume Threshold:</span>
                  <span className="text-white">{strategy.volume_threshold || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price Movement Threshold:</span>
                  <span className="text-white">{strategy.price_movement_threshold || 0}%</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/30 rounded-lg p-3">
              <h5 className="text-sm font-medium text-purple-400 mb-2">Automation</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Auto Start:</span>
                  <span className={`${strategy.auto_start ? 'text-green-400' : 'text-gray-400'}`}>
                    {strategy.auto_start ? 'Enabled' : 'Disabled'}
                  </span>
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
                {strategy.stop_loss_percent && (
                  <div>
                    <span className="text-gray-400 text-sm">Stop Loss:</span>
                    <span className="text-red-400 ml-2 font-medium">{strategy.stop_loss_percent}%</span>
                  </div>
                )}
                
                {strategy.trailing_stop_loss_percent && (
                  <div>
                    <span className="text-gray-400 text-sm">Trailing Stop:</span>
                    <span className="text-red-400 ml-2 font-medium">{strategy.trailing_stop_loss_percent}%</span>
                  </div>
                )}
              </div>
              
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
          
          {/* Technical Indicators */}
          {strategy.technical_indicators && Object.values(strategy.technical_indicators).some((ind: any) => ind?.enabled) && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-purple-400 mb-3">Technical Indicators</h5>
              
              <div className="space-y-2">
                {strategy.technical_indicators.rsi?.enabled && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">RSI ({strategy.technical_indicators.rsi.period}):</span>
                    <span className="text-white">
                      Buy ≤{strategy.technical_indicators.rsi.buy_threshold}, Sell ≥{strategy.technical_indicators.rsi.sell_threshold}
                    </span>
                  </div>
                )}
                
                {strategy.technical_indicators.macd?.enabled && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">MACD:</span>
                    <span className="text-white">
                      {strategy.technical_indicators.macd.additional_params?.fast_period}/
                      {strategy.technical_indicators.macd.additional_params?.slow_period}/
                      {strategy.technical_indicators.macd.additional_params?.signal_period}
                    </span>
                  </div>
                )}
                
                {strategy.technical_indicators.bollinger_bands?.enabled && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Bollinger Bands:</span>
                    <span className="text-white">
                      Period {strategy.technical_indicators.bollinger_bands.period}, 
                      StdDev {strategy.technical_indicators.bollinger_bands.additional_params?.std_dev}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Standard Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(strategy.configuration || {}).map(([key, value]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-300 mb-2 capitalize">
              {key.replace('_', ' ')}
            </label>
            <div className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg">
              <span className="text-white">
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPerformanceTab = () => {
    const performance = strategy.performance;
    
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
              {formatPercent(performance.win_rate)}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-gray-400">Max Drawdown</span>
            </div>
            <p className="text-xl font-bold text-purple-400">
              {formatPercent(performance.max_drawdown)}
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
        {(performance.sharpe_ratio || performance.volatility || performance.beta) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {performance.sharpe_ratio && (
              <Card className="p-4">
                <p className="text-sm text-gray-400 mb-1">Sharpe Ratio</p>
                <p className="text-lg font-bold text-white">{performance.sharpe_ratio.toFixed(2)}</p>
              </Card>
            )}
            {performance.volatility && (
              <Card className="p-4">
                <p className="text-sm text-gray-400 mb-1">Volatility</p>
                <p className="text-lg font-bold text-white">{(performance.volatility * 100).toFixed(2)}%</p>
              </Card>
            )}
            {performance.beta && (
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
      
  const renderSmartRebalanceTab = () => (
    <div className="space-y-6">
      <h4 className="font-medium text-white">Asset Allocation Configuration</h4>
      
      {isEditing ? (
        <AssetAllocationManager
          totalCapital={totalCapital}
          onTotalCapitalChange={setTotalCapital}
          assets={assets}
          onAssetsChange={setAssets}
          allocationMode={allocationMode}
          onAllocationModeChange={setAllocationMode}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-400">Total Capital</span>
              </div>
              <p className="text-lg font-bold text-white">
                {formatCurrency(strategy.capital_allocation?.value || strategy.min_capital)}
              </p>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">Allocation Mode</span>
              </div>
              <p className="text-lg font-bold text-white capitalize">
                {(strategy.capital_allocation?.allocation_mode || 'manual').replace('_', ' ')}
              </p>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-400">Assets</span>
              </div>
              <p className="text-lg font-bold text-white">
                {strategy.capital_allocation?.assets?.length || 0}
              </p>
            </Card>
          </div>
          
          {strategy.capital_allocation?.assets && strategy.capital_allocation.assets.length > 0 && (
            <Card className="p-4">
              <h5 className="font-medium text-white mb-3">Current Allocation</h5>
              <div className="space-y-2">
                {strategy.capital_allocation.assets.map((asset: any) => (
                  <div key={asset.symbol} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{asset.symbol}</span>
                      {asset.name && (
                        <span className="text-sm text-gray-400">({asset.name})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">{asset.allocation_percent.toFixed(2)}%</span>
                      <span className="font-medium text-white min-w-[80px] text-right">
                        {formatCurrency((strategy.capital_allocation.value * asset.allocation_percent) / 100)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );

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
        {strategy.type !== 'smart_rebalance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(strategy.configuration || {}).map(([key, value]) => (
                <div key={key} className={key === 'assets' ? 'md:col-span-2' : ''}>
                  <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                    <span className="text-gray-400 capitalize">{key.replace('_', ' ')}</span>
                    <span className="text-white font-medium">
                      {typeof value === 'number' && key.includes('percent') ? `${value}%` : 
                       typeof value === 'number' && key.includes('usd') ? formatCurrency(value) :
                       key === 'assets' && Array.isArray(value) ? (
                        <div className="space-y-1">
                          {value.map((asset: any, index: number) => (
                            <div key={index} className="text-sm">
                              {asset.symbol}: {asset.allocation_percent?.toFixed(2)}%
                            </div>
                          ))}
                        </div>
                      ) : typeof value === 'object' ? (
                        <pre className="text-xs overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
                      ) : (
                        String(value)
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
            {activeTab === 'performance' && (
              <>
                {renderPerformanceTab()}
                {strategy.type === 'smart_rebalance' && renderSmartRebalanceTab()}
              </>
            )}
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