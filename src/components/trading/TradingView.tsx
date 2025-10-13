import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, BarChart3, Clock, RefreshCw, AlertCircle, CheckCircle, XCircle, Link } from 'lucide-react';
import { getMarketStatus, formatTimeUntil, isCryptoMarketOpen, type MarketStatus } from '../../lib/marketHours';
import { Card } from '../ui/Card';
import { OrderEntryForm, OrderData } from './OrderEntryForm';
import { OrderPreviewModal } from './OrderPreviewModal';
import { OrderHistory } from './OrderHistory';
import { OptionsChain } from './OptionsChain';
import { OptionsOrderEntry, OptionsOrderData } from './OptionsOrderEntry';

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
  const [pendingOptionsOrder, setPendingOptionsOrder] = useState<OptionsOrderData | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loadingMarketData, setLoadingMarketData] = useState(false);
  const [assetClass, setAssetClass] = useState<AssetClass>('stocks');
  const [selectedOption, setSelectedOption] = useState<{
    type: 'call' | 'put';
    strike: number;
    expiration: string;
    data: any;
  } | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(getMarketStatus());
  const [accountStatus, setAccountStatus] = useState<{
    connected: boolean;
    account_name?: string;
    alpaca_account_id?: string;
    environment?: string;
    loading: boolean;
  }>({ connected: false, loading: true });

  const currentPrice = marketData?.price || 0;

  // Check account connection status on mount
  useEffect(() => {
    const checkAccountStatus = async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setAccountStatus({ connected: false, loading: false });
          return;
        }

        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE}/api/alpaca/connection-status`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          setAccountStatus({ connected: false, loading: false });
          return;
        }

        const data = await response.json();
        setAccountStatus({
          connected: data.connected,
          account_name: data.account_name,
          alpaca_account_id: data.alpaca_account_id,
          environment: data.environment,
          loading: false,
        });
      } catch (error) {
        console.error('Error checking account status:', error);
        setAccountStatus({ connected: false, loading: false });
      }
    };

    checkAccountStatus();
  }, []);

  const handleAssetClassChange = (newClass: AssetClass) => {
    setAssetClass(newClass);
    setSelectedSymbol('');
    setMarketData(null);
  };

  const fetchMarketData = useCallback(async (symbol: string) => {
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
  }, []);

  useEffect(() => {
    if (selectedSymbol) {
      fetchMarketData(selectedSymbol);

      const interval = setInterval(() => {
        fetchMarketData(selectedSymbol);
      }, 5000);

      return () => clearInterval(interval);
    } else {
      setMarketData(null);
    }
  }, [selectedSymbol, fetchMarketData]);

  // Update market status every minute
  useEffect(() => {
    const updateMarketStatus = () => {
      setMarketStatus(getMarketStatus());
    };

    updateMarketStatus();
    const interval = setInterval(updateMarketStatus, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleOrderSubmit = (order: OrderData) => {
    setPendingOrder(order);
    setShowPreviewModal(true);
  };

  const handleOptionsOrderSubmit = (order: OptionsOrderData) => {
    setPendingOptionsOrder(order);
    setShowPreviewModal(true);
  };

  const handleOptionSelect = (type: 'call' | 'put', strike: number, expiration: string, data: any) => {
    setSelectedOption({ type, strike, expiration, data });
  };

  const handleOrderConfirm = async () => {
    if (!pendingOrder && !pendingOptionsOrder) return;

    setIsSubmittingOrder(true);

    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const orderPayload = pendingOptionsOrder ? {
        ...pendingOptionsOrder,
        asset_class: 'options',
      } : pendingOrder;

      const response = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to place order');
      }

      const result = await response.json();
      console.log('Order placed successfully:', result);

      const orderType = pendingOptionsOrder ? 'Options' : 'Stock';
      const accountInfo = result.account_name ? `\nAccount: ${result.account_name}\nAlpaca ID: ${result.alpaca_account_id}` : '';
      alert(`${orderType} order placed successfully!${accountInfo}\n\nOrder ID: ${result.order_id}\nStatus: ${result.status}\n\nYou can verify this order in your Alpaca account.`);

      setShowPreviewModal(false);
      setPendingOrder(null);
      setPendingOptionsOrder(null);
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
        <div className="flex items-center gap-4">
        {/* Account Connection Status */}
        {accountStatus.loading ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg">
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
            <span className="text-sm text-gray-400">Checking connection...</span>
          </div>
        ) : accountStatus.connected ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <div className="flex flex-col">
              <span className="text-sm text-green-400 font-medium">{accountStatus.account_name}</span>
              <span className="text-xs text-green-300/60">
                {accountStatus.environment?.toUpperCase()} • {accountStatus.alpaca_account_id}
              </span>
            </div>
          </div>
        ) : (
          <a
            href="/accounts"
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <XCircle className="w-4 h-4 text-red-400" />
            <div className="flex flex-col">
              <span className="text-sm text-red-400 font-medium">No Account Connected</span>
              <span className="text-xs text-red-300/60">Click to connect</span>
            </div>
          </a>
        )}

        {/* Market Status */}
        {assetClass === 'crypto' ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm text-blue-400 font-medium">24/7 Trading</span>
          </div>
        ) : marketStatus.isOpen ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <div className="flex flex-col">
              <span className="text-sm text-green-400 font-medium">Market Open</span>
              {marketStatus.nextClose && (
                <span className="text-xs text-green-300/60">Closes in {formatTimeUntil(marketStatus.nextClose)}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <div className="flex flex-col">
              <span className="text-sm text-red-400 font-medium">Market Closed</span>
              {marketStatus.nextOpen && (
                <span className="text-xs text-red-300/60">Opens in {formatTimeUntil(marketStatus.nextOpen)}</span>
              )}
            </div>
          </div>
        )
        }
        </div>
      </div>

      {/* Account Warning Banner */}
      {!accountStatus.loading && !accountStatus.connected && (
        <Card className="p-4 bg-red-500/10 border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-400 mb-1">Alpaca Account Required</h3>
              <p className="text-sm text-red-300/80 mb-3">
                You need to connect your Alpaca account before you can place trades. All orders will be routed through your connected account.
              </p>
              <a
                href="/accounts"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Link className="w-4 h-4" />
                Connect Alpaca Account
              </a>
            </div>
          </div>
        </Card>
      )}

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

          {/* Options Chain or Price Chart */}
          {assetClass === 'options' && selectedSymbol ? (
            <OptionsChain
              symbol={selectedSymbol}
              onSelectOption={handleOptionSelect}
            />
          ) : (
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
          )}
        </div>

        {/* Order Entry Panel - Right (1/3 width) */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Order Entry</h3>
            {assetClass === 'options' ? (
              <OptionsOrderEntry
                symbol={selectedSymbol}
                currentPrice={currentPrice}
                selectedOption={selectedOption}
                onSubmit={handleOptionsOrderSubmit}
              />
            ) : (
              <OrderEntryForm
                symbol={selectedSymbol}
                currentPrice={currentPrice}
                onSubmit={handleOrderSubmit}
                disabled={!accountStatus.connected}
              />
            )}
            {!accountStatus.connected && !accountStatus.loading && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-300 text-center">
                  Connect your Alpaca account to enable trading
                </p>
              </div>
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
              {assetClass === 'stocks' ? 'Trading Equities' : assetClass === 'options' ? 'Trading Options' : 'Trading Crypto'}
            </span>
          </div>
        </div>
      </Card>

      {/* Order Preview Modal */}
      {(pendingOrder || pendingOptionsOrder) && (
        <OrderPreviewModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setPendingOrder(null);
            setPendingOptionsOrder(null);
          }}
          order={pendingOrder || (pendingOptionsOrder ? {
            symbol: `${pendingOptionsOrder.symbol} $${pendingOptionsOrder.strike} ${pendingOptionsOrder.option_type.toUpperCase()}`,
            side: pendingOptionsOrder.side,
            type: pendingOptionsOrder.order_type,
            quantity: pendingOptionsOrder.contracts,
            limit_price: pendingOptionsOrder.limit_price,
            time_in_force: pendingOptionsOrder.time_in_force,
          } as OrderData : null)}
          estimatedPrice={currentPrice}
          onConfirm={handleOrderConfirm}
          isSubmitting={isSubmittingOrder}
        />
      )}
    </motion.div>
  );
}
