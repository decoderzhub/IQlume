import React from 'react';
import { TrendingUp, TrendingDown, BarChart3, Target, DollarSign, Grid3X3 } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCurrency, formatPercent } from '../../lib/utils';

interface GridStatisticsProps {
  totalOrders: number;
  buyOrders: number;
  sellOrders: number;
  filledOrders: number;
  pendingOrders: number;
  allocatedCapital: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  gridUtilization: number;
  fillRate: number;
  avgGridSpacing: number;
  className?: string;
}

export function GridStatistics({
  totalOrders,
  buyOrders,
  sellOrders,
  filledOrders,
  pendingOrders,
  allocatedCapital,
  currentValue,
  unrealizedPnL,
  unrealizedPnLPercent,
  gridUtilization,
  fillRate,
  avgGridSpacing,
  className = '',
}: GridStatisticsProps) {
  const isProfit = unrealizedPnL >= 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Grid3X3 className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Total Orders</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalOrders}</p>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="text-green-400">{buyOrders} buy</span>
            <span className="text-gray-500">•</span>
            <span className="text-red-400">{sellOrders} sell</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Order Status</span>
          </div>
          <p className="text-2xl font-bold text-white">{pendingOrders}</p>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="text-gray-400">Pending</span>
            <span className="text-gray-500">•</span>
            <span className="text-green-400">{filledOrders} filled</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Grid Utilization</span>
          </div>
          <p className="text-2xl font-bold text-white">{gridUtilization.toFixed(1)}%</p>
          <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(gridUtilization, 100)}%` }}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {isProfit ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs text-gray-400">Unrealized P&L</span>
          </div>
          <p className={`text-2xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
            {isProfit ? '+' : ''}{formatCurrency(unrealizedPnL)}
          </p>
          <p className={`text-xs mt-1 ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
            {isProfit ? '+' : ''}{unrealizedPnLPercent.toFixed(2)}%
          </p>
        </Card>
      </div>

      {/* Capital Allocation */}
      <Card className="p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-400" />
          Capital Allocation
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">Allocated</p>
            <p className="text-lg font-bold text-white">{formatCurrency(allocatedCapital)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Current Value</p>
            <p className="text-lg font-bold text-white">{formatCurrency(currentValue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Fill Rate</p>
            <p className="text-lg font-bold text-blue-400">{fillRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Avg Grid Spacing</p>
            <p className="text-lg font-bold text-purple-400">{formatCurrency(avgGridSpacing)}</p>
          </div>
        </div>
      </Card>

      {/* Performance Insights */}
      <Card className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <h4 className="text-sm font-medium text-blue-300 mb-3">Grid Performance Insights</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Orders placed below current price:</span>
            <span className="text-green-400 font-medium">{buyOrders} ({buyOrders > 0 ? ((buyOrders / totalOrders) * 100).toFixed(0) : 0}%)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Orders placed above current price:</span>
            <span className="text-red-400 font-medium">{sellOrders} ({sellOrders > 0 ? ((sellOrders / totalOrders) * 100).toFixed(0) : 0}%)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Orders executed successfully:</span>
            <span className="text-blue-400 font-medium">{filledOrders} ({filledOrders > 0 && totalOrders > 0 ? ((filledOrders / (filledOrders + pendingOrders)) * 100).toFixed(0) : 0}%)</span>
          </div>
          <div className="flex items-center justify-between border-t border-blue-500/20 pt-2 mt-2">
            <span className="text-gray-300 font-medium">Grid efficiency rating:</span>
            <span className={`font-bold ${
              gridUtilization > 80 ? 'text-green-400' :
              gridUtilization > 50 ? 'text-yellow-400' : 'text-orange-400'
            }`}>
              {gridUtilization > 80 ? 'Excellent' : gridUtilization > 50 ? 'Good' : 'Fair'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
