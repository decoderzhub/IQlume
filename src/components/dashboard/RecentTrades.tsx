import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Trade } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';

const mockTrades: Trade[] = [
  {
    id: '1',
    strategy_id: '1',
    symbol: 'AAPL',
    type: 'sell',
    quantity: 1,
    price: 175.50,
    timestamp: '2024-01-15T14:30:00Z',
    profit_loss: 125.50,
    status: 'executed',
  },
  {
    id: '2',
    strategy_id: '2',
    symbol: 'SPY',
    type: 'buy',
    quantity: 4,
    price: 470.25,
    timestamp: '2024-01-15T13:45:00Z',
    profit_loss: -45.00,
    status: 'executed',
  },
  {
    id: '3',
    strategy_id: '3',
    symbol: 'BTCUSD',
    type: 'buy',
    quantity: 0.1,
    price: 42150.00,
    timestamp: '2024-01-15T12:20:00Z',
    profit_loss: 0,
    status: 'pending',
  },
];

export function RecentTrades() {
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
      
      <div className="space-y-4">
        {mockTrades.map((trade, index) => (
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
    </Card>
  );
}