import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Trade } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';

export function RecentTrades() {
  const { user } = useStore();
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchRecentTrades = async () => {
      if (!user) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) return;

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/trades?limit=5`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTrades(data.trades || []);
        }
      } catch (error) {
        console.error('Error fetching recent trades:', error);
        // Fallback to empty array on error
        setTrades([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentTrades();
  }, [user]);

  const getStatusColor = (status: Trade['status']) => {
    switch (status) {
      case 'executed': return 'text-green-400 bg-green-400/10';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'failed': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Recent Trades</h3>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading trades...</span>
          </div>
        </div>
      ) : trades.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No recent trades found</p>
        </div>
      ) : (
      <div className="space-y-4">
        {trades.map((trade, index) => (
          <motion.div
            key={trade.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${trade.type === 'buy' ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
                {trade.type === 'buy' ? (
                  <ArrowDownRight className="w-4 h-4 text-green-400" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-red-400" />
                )}
              </div>
              
              <div>
                <p className="font-medium text-white">
                  {trade.type.toUpperCase()} {trade.symbol}
                </p>
                <p className="text-sm text-gray-400">
                  {trade.quantity} @ {formatCurrency(trade.price)}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(trade.status)}`}>
                  {trade.status}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-3 h-3" />
                {formatDate(trade.timestamp)}
              </div>
              
              {trade.profit_loss !== 0 && (
                <p className={`text-sm font-medium ${trade.profit_loss > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.profit_loss > 0 ? '+' : ''}{formatCurrency(trade.profit_loss)}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      )}
    </Card>
  );
}