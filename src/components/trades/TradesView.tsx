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
  Download,
  Building,
  Plus,
  ExternalLink
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Trade } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { TradeRow } from './TradeRow';

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
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'executed' | 'pending' | 'failed'>('all');
  const [dateRange, setDateRange] = useState<'all' | '1d' | '7d' | '30d' | '90d'>('30d');
  const { user, brokerageAccounts } = useStore();

  const selectedAccount = selectedAccountId === 'all' ? null : brokerageAccounts.find(acc => acc.id === selectedAccountId);

  // Set default selected account to first connected account
  useEffect(() => {
    if (brokerageAccounts.length > 0 && selectedAccountId === null) {
      // Default to "All Accounts" to show all trades including Smart Rebalance
      setSelectedAccountId('all');
    } else if (brokerageAccounts.length === 0) {
      setSelectedAccountId(null);
      setLoading(false);
    }
  }, [brokerageAccounts, selectedAccountId]);

  const loadTradesForAccount = async (accountId: string | null) => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`📋 Loading trades for ${accountId ? `account ${accountId}` : 'all accounts'} with date range: ${dateRange}`);

      // Build Supabase query
      let query = supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      // Filter by date range
      if (dateRange !== 'all') {
        const days = dateRange === '1d' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('created_at', startDate.toISOString());
        console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to now`);
      }

      const { data: tradesData, error: fetchError } = await query;

      if (fetchError) {
        console.error('❌ Supabase Error:', fetchError);
        throw new Error(`Failed to fetch trades: ${fetchError.message}`);
      }

      console.log('✅ Trades data received:', tradesData);

      // Calculate stats from trades
      const allTrades = tradesData || [];
      const executedTrades = allTrades.filter(t => t.status === 'executed');
      const totalProfitLoss = executedTrades.reduce((sum, t) => sum + (Number(t.profit_loss) || 0), 0);
      const winningTrades = executedTrades.filter(t => (Number(t.profit_loss) || 0) > 0);
      const winRate = executedTrades.length > 0 ? (winningTrades.length / executedTrades.length) * 100 : 0;

      // Set trades and calculated stats
      setTrades(allTrades);
      setStats({
        total_trades: allTrades.length,
        total_profit_loss: totalProfitLoss,
        win_rate: winRate,
        avg_trade_duration: 0,
      });

    } catch (error) {
      console.error('Error fetching trades:', error);
      setError(error instanceof Error ? error.message : 'Failed to load trades');
      setTrades([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccountId && user) {
      loadTradesForAccount(selectedAccountId);
    }
  }, [selectedAccountId, dateRange, user]);

  const filteredTrades = trades.filter(trade => {
    if (!user) return false;
    const matchesSearch = searchTerm === '' || trade.symbol.toLowerCase().includes(searchTerm.toLowerCase());
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

  const getBrokerageIcon = (brokerage: string) => {
    const icons: Record<string, string> = {
      alpaca: '🦙', schwab: '🏦', coinbase: '₿', binance: '🟡'
    };
    return icons[brokerage] || '📊';
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
          <span>Loading trades from Alpaca...</span>
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
            <Button onClick={() => loadTradesForAccount(selectedAccountId)}>
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
      {/* Account Selector */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Select Brokerage Account</h3>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Connect Account
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* All Accounts Option */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedAccountId('all')}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              selectedAccountId === 'all'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📊</span>
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            </div>
            <h4 className="font-medium text-white text-sm mb-1">All Accounts</h4>
            <p className="text-xs text-gray-400 mb-2">
              All strategies • All accounts
            </p>
            <p className="text-sm font-medium text-purple-400">
              {formatCurrency(brokerageAccounts.reduce((sum, acc) => sum + acc.balance, 0))}
            </p>
            <p className="text-xs text-gray-500">
              Combined view
            </p>
          </motion.div>

          {brokerageAccounts.map((account) => (
            <motion.div
              key={account.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedAccountId(account.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedAccountId === account.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{getBrokerageIcon(account.brokerage)}</span>
                <div className={`w-2 h-2 rounded-full ${account.is_connected ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              <h4 className="font-medium text-white text-sm mb-1">{account.account_name}</h4>
              <p className="text-xs text-gray-400 capitalize mb-2">
                {account.brokerage} • {account.account_type}
              </p>
              <p className="text-sm font-medium text-green-400">
                {formatCurrency(account.balance)}
              </p>
              <p className="text-xs text-gray-500">
                {account.is_connected ? 'Connected' : 'Disconnected'}
              </p>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Show message if no accounts are connected */}
      {brokerageAccounts.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Building className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Brokerage Accounts Connected</h3>
            <p className="text-sm text-gray-400 mb-4">
              Connect a brokerage account from the Accounts section to view your trade history.
            </p>
            <Button onClick={() => useStore.getState().setActiveView('accounts')}>
              <Plus className="w-4 h-4 mr-2" />
              Go to Accounts
            </Button>
          </div>
        </Card>
      )}

      {/* Selected Account Info */}
      {selectedAccount ? (
        <Card className="p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl">{getBrokerageIcon(selectedAccount.brokerage)}</span>
              <div>
                <h3 className="font-semibold text-white">{selectedAccount.account_name}</h3>
                <p className="text-sm text-gray-400 capitalize">
                  {selectedAccount.brokerage} • {selectedAccount.account_type} • {formatCurrency(selectedAccount.balance)}
                </p>
                {selectedAccount.account_number && (
                  <p className="text-xs text-gray-500">
                    Account: {selectedAccount.account_number}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${selectedAccount.is_connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-300">
                {selectedAccount.is_connected ? 'Connected' : 'Disconnected'}
              </span>
              {selectedAccount.is_connected && (
                <div className="ml-2 text-xs text-green-400">
                  Market Status: {new Date().getHours() >= 9 && new Date().getHours() < 16 ? 'Open' : 'Closed'}
                </div>
              )}
              <Button variant="ghost" size="sm">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ) : selectedAccountId === 'all' ? (
        <Card className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl">📊</span>
              <div>
                <h3 className="font-semibold text-white">All Accounts</h3>
                <p className="text-sm text-gray-400">
                  Showing trades from all strategies and accounts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm text-gray-300">Combined View</span>
            </div>
          </div>
        </Card>
      ) : null}

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
                  {stats.win_rate.toFixed(1)}%
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
            <Button variant="outline" onClick={() => loadTradesForAccount(selectedAccountId)}>
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
          <h3 className="text-lg font-semibold text-white">
            Trade History{selectedAccount ? ` - ${selectedAccount.account_name}` : selectedAccountId === 'all' ? ' - All Accounts' : ''}
          </h3>
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
                : selectedAccount?.is_connected 
                  ? 'No trades found for this account in the selected time period.'
                  : 'This account is not connected. Please reconnect to view trade history.'
              }
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
                  <TradeRow
                    key={trade.id}
                    trade={trade}
                    index={index}
                    getTypeColor={getTypeColor}
                    getStatusColor={getStatusColor}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </motion.div>
  );
}