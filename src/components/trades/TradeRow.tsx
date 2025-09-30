import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronDown, 
  ChevronRight,
  BarChart3,
  Package
} from 'lucide-react';

interface Trade {
  id: string;
  strategy_id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: string;
  profit_loss: number;
  status: 'pending' | 'executed' | 'failed';
  order_type?: string;
  time_in_force?: string;
  filled_qty?: number;
  filled_avg_price?: number;
  commission?: number;
  fees?: number;
  alpaca_order_id?: string;
}

interface TradeRowProps {
  trade: Trade;
  index: number;
  getTypeColor: (type: Trade['type']) => string;
  getStatusColor: (status: Trade['status']) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

export function TradeRow({ 
  trade, 
  index, 
  getTypeColor, 
  getStatusColor, 
  formatCurrency, 
  formatDate 
}: TradeRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if this is a multi-asset trade (Smart Rebalance)
  const isMultiAsset = trade.symbol.includes(',') || trade.symbol.includes(' ');
  const symbols = isMultiAsset ? trade.symbol.split(/[,\s]+/).filter(s => s.trim()) : [trade.symbol];
  
  // For multi-asset trades, parse the order_id to get individual order details
  const getIndividualOrders = () => {
    if (!isMultiAsset || !trade.alpaca_order_id) return [];
    
    try {
      // Parse order IDs from the format "Portfolio: order1, order2, order3"
      const orderIdString = trade.alpaca_order_id.replace('Portfolio: ', '');
      const orderIds = orderIdString.split(', ');
      
      // Create individual order details (in production, you'd fetch these from the database)
      return symbols.map((symbol, index) => ({
        symbol: symbol.trim(),
        quantity: trade.quantity / symbols.length, // Estimate - in production, store actual quantities
        price: trade.price / symbols.length, // Estimate - in production, store actual prices
        order_id: orderIds[index] || `order-${index}`,
        status: trade.status,
      }));
    } catch (error) {
      console.error('Error parsing individual orders:', error);
      return [];
    }
  };

  const individualOrders = getIndividualOrders();

  if (isMultiAsset) {
    return (
      <>
        <motion.tr
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
        >
          <td className="py-4 px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded hover:bg-gray-700 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <div className={`p-2 rounded-lg ${trade.type === 'buy' ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
                <Package className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">Portfolio Rebalance</span>
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
                    {symbols.length} assets
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {symbols.slice(0, 3).join(', ')}{symbols.length > 3 ? ` +${symbols.length - 3} more` : ''}
                </p>
              </div>
            </div>
          </td>
          <td className="py-4 px-4">
            <span className={`font-medium uppercase ${getTypeColor(trade.type)}`}>
              {trade.type}
            </span>
          </td>
          <td className="py-4 px-4 text-right text-white">
            {symbols.length} orders
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

        {/* Expanded individual orders */}
        <AnimatePresence>
          {isExpanded && (
            <motion.tr
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <td colSpan={7} className="px-4 pb-4">
                <div className="bg-gray-800/30 rounded-lg p-4 ml-8">
                  <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Individual Orders
                  </h4>
                  <div className="space-y-2">
                    {individualOrders.length > 0 ? (
                      individualOrders.map((order, orderIndex) => (
                        <div key={orderIndex} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded ${trade.type === 'buy' ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
                              {trade.type === 'buy' ? (
                                <ArrowDownRight className="w-3 h-3 text-green-400" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3 text-red-400" />
                              )}
                            </div>
                            <span className="font-medium text-white text-sm">{order.symbol}</span>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right">
                              <p className="text-white">{order.quantity.toFixed(6)}</p>
                              <p className="text-xs text-gray-400">shares</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white">{formatCurrency(order.price)}</p>
                              <p className="text-xs text-gray-400">per share</p>
                            </div>
                            <div className="text-right">
                              <p className="text-green-400 font-medium">{formatCurrency(order.quantity * order.price)}</p>
                              <p className="text-xs text-gray-400">total value</p>
                            </div>
                            <div className="text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Fallback: show symbols as individual items
                      symbols.map((symbol, symbolIndex) => (
                        <div key={symbolIndex} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded ${trade.type === 'buy' ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
                              {trade.type === 'buy' ? (
                                <ArrowDownRight className="w-3 h-3 text-green-400" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3 text-red-400" />
                              )}
                            </div>
                            <span className="font-medium text-white text-sm">{symbol.trim()}</span>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right">
                              <p className="text-white">{(trade.quantity / symbols.length).toFixed(6)}</p>
                              <p className="text-xs text-gray-400">est. shares</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white">{formatCurrency(trade.price / symbols.length)}</p>
                              <p className="text-xs text-gray-400">est. price</p>
                            </div>
                            <div className="text-right">
                              <p className="text-green-400 font-medium">{formatCurrency((trade.quantity * trade.price) / symbols.length)}</p>
                              <p className="text-xs text-gray-400">est. value</p>
                            </div>
                            <div className="text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(trade.status)}`}>
                                {trade.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Order ID info */}
                  {trade.alpaca_order_id && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      <p className="text-xs text-gray-400">
                        Order IDs: {trade.alpaca_order_id}
                      </p>
                    </div>
                  )}
                </div>
              </td>
            </motion.tr>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Single asset trade (normal display)
  return (
    <motion.tr
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
  );
}