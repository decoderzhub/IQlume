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

  const selectedAccount = brokerageAccounts.find(acc => acc.id === selectedAccountId);

  // Set default selected account to first connected account
  useEffect(() => {
    if (brokerageAccounts.length > 0 && selectedAccountId === null) {
      const firstConnectedAccount = brokerageAccounts.find(acc => acc.is_connected);
      if (firstConnectedAccount) {
        setSelectedAccountId(firstConnectedAccount.id);
      } else {
        setSelectedAccountId(brokerageAccounts[0].id);
      }
    } else if (brokerageAccounts.length === 0) {
      setSelectedAccountId(null);
    }
  }, [brokerageAccounts, selectedAccountId]);

  const loadTradesForAccount = async (accountId: string | null) => {
    if (!user || !accountId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`📋 Loading trades for ${accountId ? `account ${accountId}` : 'all accounts'} with date range: ${dateRange}`);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      // Build query parameters for date range filtering
      const params = new URLSearchParams();
      params.append('limit', '100');
      
      if (accountId) {
        params.append('account_id', accountId);
      }
      
      if (dateRange !== 'all') {
        const days = dateRange === '1d' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        
        params.append('start_date', startDate.toISOString().split('T')[0]);
        params.append('end_date', endDate.toISOString().split('T')[0]);
        console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/trades?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`Failed to fetch trades: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Trades data received:', data);
      
      // Set trades and stats from API response
      setTrades(data.trades || []);
      setStats(data.stats || {
        total_trades: 0,
        executed_trades: 0,
        pending_trades: 0,
        failed_trades: 0,
        total_profit_loss: 0,
        win_rate: 0,
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
    // Also load trades when no account is selected to show all trades
    else if (!selectedAccountId && user && brokerageAccounts.length > 0) {
      loadTradesForAccount(null);
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

      {/* Add "All Accounts" option */}
      {brokerageAccounts.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">View Options</h3>
          </div>
          
          <div className="flex gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedAccountId(null)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedAccountId === null
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📊</span>
                <div className={`w-2 h-2 rounded-full bg-blue-500`} />
              </div>
              <h4 className="font-medium text-white text-sm mb-1">All Accounts</h4>
              <p className="text-xs text-gray-400 mb-2">
                View trades from all strategies
              </p>
              <p className="text-sm font-medium text-blue-400">
                All Trades
              </p>
            </motion.div>
          </div>
        </Card>
      )}

      {/* Selected Account Info */}
      {selectedAccountId && selectedAccount && (
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
      )}

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
            Trade History{selectedAccount ? ` - ${selectedAccount.account_name}` : ''}
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