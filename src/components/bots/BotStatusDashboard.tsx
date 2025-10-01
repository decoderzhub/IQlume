import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { apiClient } from '../../lib/api-client';
import { useStore } from '../../store/useStore';

interface BotPosition {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  is_closed: boolean;
  entry_timestamp: string;
}

interface BotMetrics {
  total_positions: number;
  total_value: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  avg_unrealized_pnl_percent: number;
  win_rate: number;
  closed_trades: number;
  winning_trades: number;
}

export function BotStatusDashboard() {
  const user = useStore((state) => state.user);
  const [positions, setPositions] = useState<BotPosition[]>([]);
  const [metrics, setMetrics] = useState<BotMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBotStatus();
    const interval = setInterval(loadBotStatus, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const loadBotStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [positionsData, metricsData] = await Promise.all([
        apiClient.get('/api/bots/positions'),
        apiClient.get('/api/bots/metrics')
      ]);

      setPositions(positionsData);
      setMetrics(metricsData);
      setError(null);
    } catch (err) {
      setError('Failed to load bot status');
      console.error('Error loading bot status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Bot Trading Dashboard</h2>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600 animate-pulse" />
          <span className="text-sm text-gray-600">Live Monitoring</span>
        </div>
      </div>

      {error && (
        <Card className="bg-red-50 border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Open Positions"
          value={metrics?.total_positions || 0}
          icon={<Target className="w-6 h-6" />}
          color="blue"
        />
        <MetricCard
          title="Total Value"
          value={`$${(metrics?.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
        <MetricCard
          title="Unrealized P&L"
          value={`$${(metrics?.total_unrealized_pnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={metrics && metrics.total_unrealized_pnl >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          color={metrics && metrics.total_unrealized_pnl >= 0 ? 'green' : 'red'}
          subtitle={`${(metrics?.avg_unrealized_pnl_percent || 0).toFixed(2)}%`}
        />
        <MetricCard
          title="Win Rate"
          value={`${(metrics?.win_rate || 0).toFixed(1)}%`}
          icon={<Activity className="w-6 h-6" />}
          color="purple"
          subtitle={`${metrics?.winning_trades || 0}/${metrics?.closed_trades || 0} trades`}
        />
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Open Positions</h3>
        {positions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No open positions. Bots are monitoring markets for opportunities.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Symbol</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Side</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Quantity</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Entry Price</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Current Price</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">P&L</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">P&L %</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Opened</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{position.symbol}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        position.side === 'long'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {position.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {position.quantity.toFixed(6)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      ${position.entry_price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      ${position.current_price.toFixed(2)}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      position.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${position.unrealized_pnl.toFixed(2)}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      position.unrealized_pnl_percent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {position.unrealized_pnl_percent > 0 ? '+' : ''}
                      {position.unrealized_pnl_percent.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(position.entry_timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'purple';
  subtitle?: string;
}

function MetricCard({ title, value, icon, color, subtitle }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
