import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, BarChart3, Clock, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { OrderEntryForm, OrderData } from './OrderEntryForm';
import { OrderPreviewModal } from './OrderPreviewModal';
import { OrderHistory } from './OrderHistory';

interface MarketData {
  price: number;
  bid_price: number;
  ask_price: number;
  change: number;
  change_percent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  timestamp?: string;
}

type AssetClass = 'stocks' | 'options' | 'crypto';

export function TradingView() {
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<OrderData | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loadingMarketData, setLoadingMarketData] = useState(false);
  const [assetClass, setAssetClass] = useState<AssetClass>('stocks');

  const currentPrice = marketData?.price || 0;

  const handleAssetClassChange = (newClass: AssetClass) => {
    setAssetClass(newClass);
    setSelectedSymbol('');
    setMarketData(null);
  };

  const fetchMarketData = async (symbol: string) => {
    if (!symbol) {
      setMarketData(null);
      return;
    }

    try {
      setLoadingMarketData(true);
      const { supabase } = await import('../../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/market-data/symbol/${symbol}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch market data: ${response.statusText}`);
      }

      const data = await response.json();
      setMarketData(data);
    } catch (error) {
      console.error('Error fetching market data:', error);
      setMarketData(null);
    } finally {
      setLoadingMarketData(false);
    }
  };

  React.useEffect(() => {
    if (selectedSymbol) {
      fetchMarketData(selectedSymbol);

      const interval = setInterval(() => {
        fetchMarketData(selectedSymbol);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [selectedSymbol]);

  const handleOrderSubmit = (order: OrderData) => {
    setPendingOrder(order);
    setShowPreviewModal(true);
  };

  const handleOrderConfirm = async () => {
    if (!pendingOrder) return;

    setIsSubmittingOrder(true);

    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pendingOrder),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to place order');
      }

      const result = await response.json();
      console.log('Order placed successfully:', result);

      alert(`Order placed successfully!\n\nOrder ID: ${result.order_id}\nStatus: ${result.status}`);

      setShowPreviewModal(false);
      setPendingOrder(null);
    } catch (error) {
      console.error('Error submitting order:', error);
      alert(`Failed to submit order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Live Trading</h1>
          <p className="text-gray-400 mt-1">Place manual trades with real-time market data</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-400 font-medium">Market Open</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Buying Power</p>
              <p className="text-xl font-bold text-green-400">$0.00</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Day P&L</p>
              <p className="text-xl font-bold text-white">$0.00</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Open Orders</p>
              <p className="text-xl font-bold text-white">0</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400 opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Positions</p>
              <p className="text-xl font-bold text-white">0</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Data Panel - Left (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Symbol Search and Quote */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Market Data</h3>

            {/* Options Notice */}
            {assetClass === 'options' && (
              <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-sm text-purple-300 font-medium mb-1">Options Trading</p>
                <p className="text-xs text-purple-400">
                  Options order entry requires additional features like strike selection, expiration dates, and Greeks display. This will be added in a future update.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Symbol Search Input */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Search Symbol
                </label>
                <input
                  type="text"
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
                  placeholder={
                    assetClass === 'stocks' ? 'Enter symbol (e.g., AAPL, TSLA, SPY)' :
                    assetClass === 'crypto' ? 'Enter crypto (e.g., BTC/USD, ETH/USD)' :
                    'Enter underlying (e.g., AAPL, SPY)'
                  }
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                {assetClass === 'crypto' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Use format: BTC/USD, ETH/USD, etc.
                  </p>
                )}
              </div>

              {/* Popular Symbols Quick Select */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Popular {assetClass === 'stocks' ? 'Stocks' : assetClass === 'crypto' ? 'Crypto' : 'Underlyings'}:</p>
                <div className="flex flex-wrap gap-2">
                  {assetClass === 'stocks' && ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'SPY', 'QQQ'].map(symbol => (
                    <button
                      key={symbol}
                      onClick={() => setSelectedSymbol(symbol)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        selectedSymbol === symbol
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {symbol}
                    </button>
                  ))}
                  {assetClass === 'crypto' && ['BTC/USD', 'ETH/USD', 'LTC/USD', 'BCH/USD', 'LINK/USD', 'UNI/USD'].map(symbol => (
                    <button
                      key={symbol}
                      onClick={() => setSelectedSymbol(symbol)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        selectedSymbol === symbol
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {symbol}
                    </button>
                  ))}
                  {assetClass === 'options' && ['AAPL', 'TSLA', 'SPY', 'QQQ', 'NVDA', 'AMZN'].map(symbol => (
                    <button
                      key={symbol}
                      onClick={() => setSelectedSymbol(symbol)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        selectedSymbol === symbol
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quote Display */}
              {selectedSymbol ? (
                loadingMarketData && !marketData ? (
                  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                    <span className="text-gray-400">Loading market data...</span>
                  </div>
                ) : marketData ? (
                  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-2xl font-bold text-white">{selectedSymbol}</h4>
                        <p className="text-sm text-gray-400">Real-time Quote</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${marketData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${marketData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className={`text-sm ${marketData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {marketData.change >= 0 ? '+' : ''}
                          ${marketData.change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({marketData.change >= 0 ? '+' : ''}{marketData.change_percent.toFixed(2)}%)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Bid</p>
                        <p className="text-sm font-medium text-white">
                          ${marketData.bid_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Ask</p>
                        <p className="text-sm font-medium text-white">
                          ${marketData.ask_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Spread</p>
                        <p className="text-sm font-medium text-white">
                          ${(marketData.ask_price - marketData.bid_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Volume</p>
                        <p className="text-sm font-medium text-white">
                          {marketData.volume.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">Failed to load market data for {selectedSymbol}</p>
                  </div>
                )
              ) : (
                <div className="p-8 text-center text-gray-400 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Enter a symbol to view market data</p>
                </div>
              )}
            </div>
          </Card>

          {/* Price Chart Placeholder */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Price Chart</h3>
            <div className="h-64 flex items-center justify-center bg-gray-800/30 rounded-lg border border-gray-700/50">
              <div className="text-center text-gray-400">
                <BarChart3 className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p>Chart will be displayed here</p>
                <p className="text-sm mt-1">Coming in Stage 6</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Order Entry Panel - Right (1/3 width) */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Order Entry</h3>
            {assetClass === 'options' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-purple-400" />
                </div>
                <p className="text-gray-400 mb-2">Options Trading</p>
                <p className="text-sm text-gray-500">
                  Options order entry interface coming soon
                </p>
              </div>
            ) : (
              <OrderEntryForm
                symbol={selectedSymbol}
                currentPrice={currentPrice}
                onSubmit={handleOrderSubmit}
                disabled={assetClass === 'options'}
              />
            )}
          </Card>

        </div>
      </div>

      {/* Order History - Full Width */}
      <OrderHistory />

      {/* Asset Class Tabs */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleAssetClassChange('stocks')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              assetClass === 'stocks'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Stocks
          </button>
          <button
            onClick={() => handleAssetClassChange('options')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              assetClass === 'options'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Options
          </button>
          <button
            onClick={() => handleAssetClassChange('crypto')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              assetClass === 'crypto'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Crypto
          </button>
          <div className="ml-auto flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${assetClass === 'stocks' ? 'bg-blue-400' : assetClass === 'options' ? 'bg-purple-400' : 'bg-orange-400'}`} />
            <span className="text-sm text-gray-400">
              {assetClass === 'stocks' ? 'Trading Equities' : assetClass === 'options' ? 'Options Coming Soon' : 'Trading Crypto'}
            </span>
          </div>
        </div>
      </Card>

      {/* Order Preview Modal */}
      {pendingOrder && (
        <OrderPreviewModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setPendingOrder(null);
          }}
          order={pendingOrder}
          estimatedPrice={currentPrice}
          onConfirm={handleOrderConfirm}
          isSubmitting={isSubmittingOrder}
        />
      )}
    </motion.div>
  );
}
