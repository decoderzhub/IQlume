import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, Package } from 'lucide-react';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';

interface Position {
  id: string;
  source: 'alpaca' | 'bot';
  symbol: string;
  quantity: number;
  side: string;
  entry_price: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  asset_class: string;
  strategy_id?: string | null;
  is_closed: boolean;
  grid_level?: number | null;
  is_grid_position?: boolean;
}

interface PositionsSummary {
  total_positions: number;
  total_market_value: number;
  total_cost_basis: number;
  total_unrealized_pnl: number;
  avg_unrealized_pnl_percent: number;
  alpaca_positions_count: number;
  bot_positions_count: number;
}

interface PositionsResponse {
  positions: Position[];
  summary: PositionsSummary;
}

export function PositionsCard() {
  const [data, setData] = useState<PositionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/positions`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.statusText}`);
      }

      const positionsData = await response.json();
      setData(positionsData);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading positions...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-500/50">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  if (!data || data.positions.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Open Positions</h3>
          <button
            onClick={fetchPositions}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh positions"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="text-center py-8 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No open positions</p>
          <p className="text-sm mt-1">Your positions will appear here once you start trading</p>
        </div>
      </Card>
    );
  }

  const { positions, summary } = data;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Open Positions</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
              {summary.alpaca_positions_count} Alpaca
            </span>
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
              {summary.bot_positions_count} Bot
            </span>
          </div>
        </div>
        <button
          onClick={fetchPositions}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Refresh positions"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Total Value</p>
          <p className="text-xl font-semibold text-white">
            ${summary.total_market_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Cost Basis</p>
          <p className="text-xl font-semibold text-white">
            ${summary.total_cost_basis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Unrealized P&L</p>
          <div className="flex items-center gap-2">
            {summary.total_unrealized_pnl >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            <p className={`text-xl font-semibold ${summary.total_unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${Math.abs(summary.total_unrealized_pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Avg Return</p>
          <p className={`text-xl font-semibold ${summary.avg_unrealized_pnl_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {summary.avg_unrealized_pnl_percent >= 0 ? '+' : ''}{summary.avg_unrealized_pnl_percent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Positions Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
              <th className="pb-3 font-medium">Symbol</th>
              <th className="pb-3 font-medium">Side</th>
              <th className="pb-3 font-medium">Quantity</th>
              <th className="pb-3 font-medium">Entry</th>
              <th className="pb-3 font-medium">Current</th>
              <th className="pb-3 font-medium">P&L</th>
              <th className="pb-3 font-medium">P&L %</th>
              <th className="pb-3 font-medium">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {positions.map((position) => (
              <tr key={position.id} className="text-sm hover:bg-gray-800/30 transition-colors">
                <td className="py-3 font-medium text-white">
                  {position.symbol}
                  {position.is_grid_position && (
                    <span className="ml-2 text-xs text-purple-400">
                      Grid L{position.grid_level}
                    </span>
                  )}
                </td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    position.side === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {position.side.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 text-gray-300">{position.quantity.toLocaleString()}</td>
                <td className="py-3 text-gray-300">
                  ${position.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 text-gray-300">
                  ${position.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={`py-3 font-medium ${position.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {position.unrealized_pnl >= 0 ? '+' : ''}${Math.abs(position.unrealized_pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={`py-3 font-medium ${position.unrealized_pnl_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {position.unrealized_pnl_percent >= 0 ? '+' : ''}{position.unrealized_pnl_percent.toFixed(2)}%
                </td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    position.source === 'alpaca' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {position.source}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
