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

interface TradeStats {
  total_trades: number;
  total_profit_loss: number;
  win_rate: number;
  avg_trade_duration: number;
}

// Mock brokerage accounts for demo
const mockBrokerageAccounts = [
  {
    id: '1',
    user_id: '1',
    brokerage: 'alpaca' as const,
    account_name: 'Alpaca Paper Trading',
    account_type: 'stocks' as const,
    balance: 85420.50,
    is_connected: true,
    last_sync: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    user_id: '1',
    brokerage: 'schwab' as const,
    account_name: 'Charles Schwab Brokerage',
    account_type: 'stocks' as const,
    balance: 125420.50,
    is_connected: true,
    last_sync: '2024-01-15T10:25:00Z',
  },
  {
    id: '3',
    user_id: '1',
    brokerage: 'coinbase' as const,
    account_name: 'Coinbase Pro',
    account_type: 'crypto' as const,
    balance: 45000.00,
    is_connected: true,
    last_sync: '2024-01-15T10:20:00Z',
  },
  {
    id: '4',
    user_id: '1',
    brokerage: 'binance' as const,
    account_name: 'Binance Trading',
    account_type: 'crypto' as const,
    balance: 32500.00,
    is_connected: false,
    last_sync: '2024-01-14T15:30:00Z',
  },
];

// Generate mock trades for a specific account
const generateMockTradesForAccount = (accountId: string): Trade[] => {
  const account = mockBrokerageAccounts.find(acc => acc.id === accountId);
  if (!account) return [];

  const symbols = account.account_type === 'crypto' 
    ? ['BTC', 'ETH', 'ADA', 'SOL', 'MATIC', 'DOT']
    : ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'SPY', 'QQQ'];

  const trades: Trade[] = [];
  const tradeCount = Math.floor(Math.random() * 30) + 20; // 20-50 trades

  for (let i = 0; i < tradeCount; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const type = Math.random() > 0.5 ? 'buy' : 'sell';
    const quantity = account.account_type === 'crypto' 
      ? Math.random() * 10 + 0.1 
      : Math.floor(Math.random() * 100) + 1;
    
    const basePrice = account.account_type === 'crypto'
      ? symbol === 'BTC' ? 43000 : symbol === 'ETH' ? 2600 : Math.random() * 100 + 1
      : Math.random() * 300 + 50;
    
    const price = basePrice * (0.9 + Math.random() * 0.2); // ±10% variation
    const profitLoss = type === 'sell' ? (Math.random() - 0.3) * quantity * price * 0.1 : 0;
    
    const daysAgo = Math.floor(Math.random() * 90);
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - daysAgo);
    
    const statuses: Trade['status'][] = ['executed', 'executed', 'executed', 'pending', 'failed'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    trades.push({
      id: `${accountId}-${i}`,
      strategy_id: Math.random() > 0.7 ? 'manual' : `strategy-${Math.floor(Math.random() * 5) + 1}`,
      symbol: symbol,
      type: type,
      quantity: parseFloat(quantity.toFixed(account.account_type === 'crypto' ? 4 : 0)),
      price: parseFloat(price.toFixed(2)),
      timestamp: timestamp.toISOString(),
      profit_loss: parseFloat(profitLoss.toFixed(2)),
      status: status,
    });
  }

  return trades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export function TradesView() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'executed' | 'pending' | 'failed'>('all');
  const [dateRange, setDateRange] = useState<'all' | '1d' | '7d' | '30d' | '90d'>('30d');
  const { user } = useStore();

  const selectedAccount = mockBrokerageAccounts.find(acc => acc.id === selectedAccountId);

  const loadTradesForAccount = (accountId: string) => {
    setLoading(true);
    setError(null);

    // Simulate loading delay
    setTimeout(() => {
      const accountTrades = generateMockTradesForAccount(accountId);
      
      // Apply date range filter
      let filteredTrades = accountTrades;
      if (dateRange !== 'all') {
        const days = dateRange === '1d' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        filteredTrades = accountTrades.filter(trade => new Date(trade.timestamp) >= cutoffDate);
      }
      
      setTrades(filteredTrades);
      
      // Calculate stats
      const executedTrades = filteredTrades.filter(t => t.status === 'executed');
      const totalProfitLoss = executedTrades.reduce((sum, t) => sum + t.profit_loss, 0);
      const winningTrades = executedTrades.filter(t => t.profit_loss > 0).length;
      const winRate = executedTrades.length > 0 ? winningTrades / executedTrades.length : 0;
      
      setStats({
        total_trades: filteredTrades.length,
        total_profit_loss: totalProfitLoss,
        win_rate: winRate,
        avg_trade_duration: 2.5, // Mock average
      });
      
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    loadTradesForAccount(selectedAccountId);
  }, [selectedAccountId, dateRange]);

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
          {mockBrokerageAccounts.map((account) => (
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

      {/* Selected Account Info */}
      {selectedAccount && (
        <Card className="p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl">{getBrokerageIcon(selectedAccount.brokerage)}</span>
              <div>
                <h3 className="font-semibold text-white">{selectedAccount.account_name}</h3>
                <p className="text-sm text-gray-400 capitalize">
                  {selectedAccount.brokerage} • {selectedAccount.account_type} • {formatCurrency(selectedAccount.balance)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${selectedAccount.is_connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-300">
                {selectedAccount.is_connected ? 'Connected' : 'Disconnected'}
              </span>
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
            Trade History - {selectedAccount?.account_name}
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
                  ? 'No trades found for this account. Start trading to see your history here.'
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