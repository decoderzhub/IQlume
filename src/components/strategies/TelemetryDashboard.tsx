import React from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  DollarSign,
  BarChart3,
  Clock,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../ui/Card';
import { TradingStrategy } from '../../types';
import { formatCurrency, formatPercent } from '../../lib/utils';

interface TelemetryDashboardProps {
  strategy: TradingStrategy;
  className?: string;
}

export function TelemetryDashboard({ strategy, className = '' }: TelemetryDashboardProps) {
  const telemetry = strategy.telemetry_data;
  
  if (!telemetry || !strategy.is_active) {
    return (
      <div className={`bg-gray-800/30 rounded-lg p-6 text-center ${className}`}>
        <Activity className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400">No telemetry data available</p>
        <p className="text-xs text-gray-500">Strategy must be active to show live data</p>
      </div>
    );
  }

  const isProfit = telemetry.current_profit_loss_usd >= 0;
  const stopLossRisk = telemetry.stop_loss_distance_percent && telemetry.stop_loss_distance_percent < 5;
  const takeProfitNear = telemetry.take_profit_progress_percent && telemetry.take_profit_progress_percent > 80;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Live Telemetry
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-400">Live</span>
          <span className="text-gray-400">
            {new Date(telemetry.last_updated).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Allocated Capital */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Allocated Capital</span>
          </div>
          <p className="font-bold text-white text-lg">
            {formatCurrency(telemetry.allocated_capital_usd)}
          </p>
          <p className="text-xs text-gray-400">
            {telemetry.allocated_capital_base.toFixed(6)} {strategy.base_symbol || 'BASE'}
          </p>
        </Card>

        {/* Current P&L */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {isProfit ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs text-gray-400">Current P&L</span>
          </div>
          <p className={`font-bold text-lg ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
            {isProfit ? '+' : ''}{formatCurrency(telemetry.current_profit_loss_usd)}
          </p>
          <p className={`text-xs ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
            {isProfit ? '+' : ''}{telemetry.current_profit_loss_percent.toFixed(2)}%
          </p>
        </Card>

        {/* Active Grid Levels */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Active Grids</span>
          </div>
          <p className="font-bold text-white text-lg">
            {telemetry.active_grid_levels}
          </p>
          <p className="text-xs text-gray-400">
            of {strategy.configuration?.number_of_grids || 0} total
          </p>
        </Card>

        {/* Grid Utilization */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Utilization</span>
          </div>
          <p className="font-bold text-white text-lg">
            {telemetry.grid_utilization_percent.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400">
            Capital deployed
          </p>
        </Card>
      </div>

      {/* Price Boundaries */}
      <Card className="p-4">
        <h4 className="font-medium text-white mb-3">Price Boundaries</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Lower Limit:</span>
            <span className="text-green-400 ml-2 font-medium">
              {formatCurrency(telemetry.lower_price_limit)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Upper Limit:</span>
            <span className="text-red-400 ml-2 font-medium">
              {formatCurrency(telemetry.upper_price_limit)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Grid Spacing:</span>
            <span className="text-white ml-2 font-medium">
              {formatCurrency(telemetry.grid_spacing_interval)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Fill Rate:</span>
            <span className="text-blue-400 ml-2 font-medium">
              {telemetry.fill_rate_percent.toFixed(1)}%
            </span>
          </div>
        </div>
      </Card>

      {/* Risk Management Status */}
      {(telemetry.stop_loss_price || telemetry.next_take_profit_price) && (
        <Card className="p-4">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Risk Management Status
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stop Loss */}
            {telemetry.stop_loss_price && (
              <div className={`p-3 rounded-lg border ${
                stopLossRisk 
                  ? 'bg-red-500/20 border-red-500/40' 
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {stopLossRisk && <AlertTriangle className="w-4 h-4 text-red-400" />}
                  <span className="text-sm font-medium text-red-400">Stop Loss</span>
                </div>
                <p className="text-red-400 font-bold">
                  {formatCurrency(telemetry.stop_loss_price)}
                </p>
                {telemetry.stop_loss_distance_percent !== undefined && (
                  <p className={`text-xs ${stopLossRisk ? 'text-red-300' : 'text-gray-400'}`}>
                    {telemetry.stop_loss_distance_percent.toFixed(1)}% away
                    {stopLossRisk && ' - CLOSE TO TRIGGER!'}
                  </p>
                )}
              </div>
            )}

            {/* Take Profit */}
            {telemetry.next_take_profit_price && (
              <div className={`p-3 rounded-lg border ${
                takeProfitNear 
                  ? 'bg-green-500/20 border-green-500/40' 
                  : 'bg-green-500/10 border-green-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {takeProfitNear && <Target className="w-4 h-4 text-green-400" />}
                  <span className="text-sm font-medium text-green-400">Next Take Profit</span>
                </div>
                <p className="text-green-400 font-bold">
                  {formatCurrency(telemetry.next_take_profit_price)}
                </p>
                {telemetry.take_profit_progress_percent !== undefined && (
                  <p className={`text-xs ${takeProfitNear ? 'text-green-300' : 'text-gray-400'}`}>
                    {telemetry.take_profit_progress_percent.toFixed(1)}% progress
                    {takeProfitNear && ' - NEAR TARGET!'}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Active Orders */}
      <Card className="p-4">
        <h4 className="font-medium text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Order Activity
        </h4>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-400">{telemetry.active_orders_count}</p>
            <p className="text-xs text-gray-400">Active Orders</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{telemetry.fill_rate_percent.toFixed(0)}%</p>
            <p className="text-xs text-gray-400">Fill Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">{strategy.execution_count || 0}</p>
            <p className="text-xs text-gray-400">Total Executions</p>
          </div>
        </div>
      </Card>

      {/* Performance Summary */}
      {strategy.performance && (
        <Card className="p-4">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Performance Summary
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Return:</span>
              <span className={`ml-2 font-medium ${
                strategy.performance.total_return >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatPercent(strategy.performance.total_return)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Win Rate:</span>
              <span className="text-blue-400 ml-2 font-medium">
                {formatPercent(strategy.performance.win_rate)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Max Drawdown:</span>
              <span className="text-purple-400 ml-2 font-medium">
                {formatPercent(strategy.performance.max_drawdown)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Total Trades:</span>
              <span className="text-white ml-2 font-medium">
                {strategy.performance.total_trades || 0}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}