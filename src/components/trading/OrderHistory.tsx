import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, RefreshCw, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../ui/Card';

interface Order {
  id: string;
  order_id?: string;
  symbol: string;
  side?: string;
  type?: string;
  quantity: number;
  order_type?: string;
  filled_qty?: number;
  filled_avg_price?: number;
  status: string;
  timestamp: string;
  price?: number;
  limit_price?: number;
  stop_price?: number;
  time_in_force?: string;
}

interface OrderHistoryProps {
  className?: string;
}

export function OrderHistory({ className = '' }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'filled' | 'cancelled'>('all');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { supabase } = await import('../../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return;
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/trades?limit=50`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const trades = data.trades || [];

        const transformedOrders = trades.map((trade: any) => ({
          id: trade.id,
          order_id: trade.alpaca_order_id || trade.id,
          symbol: trade.symbol || '',
          side: trade.type || trade.side || '',
          type: trade.order_type || trade.type || 'market',
          quantity: trade.quantity || 0,
          order_type: trade.order_type || 'market',
          filled_qty: trade.filled_qty || 0,
          // Only use filled_avg_price if it's actually filled (> 0), otherwise use limit/stop price for display
          filled_avg_price: (trade.filled_avg_price && trade.filled_avg_price > 0.01) ? trade.filled_avg_price : 0,
          status: trade.status || 'unknown',
          timestamp: trade.timestamp || new Date().toISOString(),
          price: trade.price,
          limit_price: trade.limit_price,
          stop_price: trade.stop_price,
          time_in_force: trade.time_in_force || 'day',
        }));

        setOrders(transformedOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'pending') return order.status === 'pending' || order.status === 'new' || order.status === 'partially_filled';
    if (filter === 'filled') return order.status === 'executed' || order.status === 'filled';
    if (filter === 'cancelled') return order.status === 'cancelled' || order.status === 'expired';
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executed':
      case 'filled':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'cancelled':
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
      case 'new':
      case 'partially_filled':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executed':
      case 'filled':
        return 'text-green-400';
      case 'cancelled':
      case 'expired':
        return 'text-red-400';
      case 'pending':
      case 'new':
      case 'partially_filled':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className={className}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Order History</h3>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Pending ({orders.filter(o => o.status === 'pending' || o.status === 'new').length})
          </button>
          <button
            onClick={() => setFilter('filled')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              filter === 'filled'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Filled ({orders.filter(o => o.status === 'executed' || o.status === 'filled').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              filter === 'cancelled'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Cancelled ({orders.filter(o => o.status === 'cancelled' || o.status === 'expired').length})
          </button>
        </div>

        {/* Orders List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loading && orders.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 opacity-50" />
              <p>Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No {filter !== 'all' ? filter : ''} orders found</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {(order.side === 'buy' || (!order.side && order.type === 'buy')) ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className="font-semibold text-white">{order.symbol}</span>
                    {(order.side || order.type) && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        (order.side === 'buy' || order.type === 'buy') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {(order.side || order.type || '').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    <span className={`text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {order.order_type && (
                    <div>
                      <span className="text-gray-400">Type: </span>
                      <span className="text-white capitalize">{order.order_type.replace('_', ' ')}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Qty: </span>
                    <span className="text-white">{order.quantity.toLocaleString()}</span>
                  </div>
                  {(order.status === 'executed' || order.status === 'filled') && order.filled_avg_price > 0 && (
                    <>
                      <div>
                        <span className="text-gray-400">Filled: </span>
                        <span className="text-white">{(order.filled_qty || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Avg Price: </span>
                        <span className="text-white">${order.filled_avg_price.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {(order.status === 'pending' || order.status === 'new') && order.order_type === 'market' && (
                    <div className="col-span-2">
                      <span className="text-gray-400">Market Order - </span>
                      <span className="text-yellow-400">Pending execution when market opens</span>
                    </div>
                  )}
                  {(order.limit_price && order.limit_price > 0) && (
                    <div>
                      <span className="text-gray-400">Limit: </span>
                      <span className="text-white">${order.limit_price.toFixed(2)}</span>
                    </div>
                  )}
                  {(order.stop_price && order.stop_price > 0) && (
                    <div>
                      <span className="text-gray-400">Stop: </span>
                      <span className="text-white">${order.stop_price.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-gray-400">Time: </span>
                    <span className="text-white">{formatDate(order.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
