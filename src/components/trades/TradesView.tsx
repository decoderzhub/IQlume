import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Filter, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Activity,
  DollarSign,
  RefreshCw,
  Calendar,
  Download
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Trade } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface TradeStats {
  total_trades: number;
  total_profit_loss: number;
  win_rate: number;
  avg_trade_duration: number;
}

export function TradesView() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'executed' | 'pending' | 'failed'>('all');
  const [dateRange, setDateRange] = useState<'all' | '1d' | '7d' | '30d' | '90d'>('30d');

  const fetchTrades = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (dateRange !== 'all') {
        const days = dateRange === '1d' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        params.append('start_date', startDate.toISOString().split('T')[0]);
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/trades?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch trades: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setTrades(data.trades || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [dateRange]);

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || trade.type === filterType;
    const matchesStatus = filterStatus === 'all' || trade.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: Trade['status']) => {
    switch (status) {
      case 'executed': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getTypeColor = (type: Trade['type']) => {
    return type === 'buy' ? 'text-green-400' : 'text-red-400';
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-12"
      >
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading trades...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <Card className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <Activity className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to Load Trades</h3>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            <Button onClick={fetchTrades}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Trades</p>
                <p className="text-2xl font-bold text-white">{stats.total_trades}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total P&L</p>
                <p className={`text-2xl font-bold ${stats.total_profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(stats.total_profit_loss)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Win Rate</p>
                <p className="text-2xl font-bold text-purple-400">
                  {(stats.win_rate * 100).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Avg Duration</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {stats.avg_trade_duration.toFixed(1)}d
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="buy">Buy Orders</option>
                <option value="sell">Sell Orders</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="executed">Executed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchTrades}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Trades Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Trade History</h3>
          <div className="text-sm text-gray-400">
            Showing {filteredTrades.length} of {trades.length} trades
          </div>
        </div>

        {filteredTrades.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No trades found</h3>
            <p className="text-gray-400">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Your trade history will appear here once you start trading.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Symbol</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Type</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-400">Quantity</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-400">Price</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-400">P&L</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-400">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade, index) => (
                  <motion.tr
                    key={trade.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${trade.type === 'buy' ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
                          {trade.type === 'buy' ? (
                            <ArrowDownRight className="w-4 h-4 text-green-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <span className="font-medium text-white">{trade.symbol}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`font-medium uppercase ${getTypeColor(trade.type)}`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-white">
                      {trade.quantity}
                    </td>
                    <td className="py-4 px-4 text-right text-white">
                      {formatCurrency(trade.price)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {trade.profit_loss !== 0 && (
                        <span className={`font-medium ${trade.profit_loss > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.profit_loss > 0 ? '+' : ''}{formatCurrency(trade.profit_loss)}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(trade.status)}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-gray-400 text-sm">
                      {formatDate(trade.timestamp)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </motion.div>
  );
}