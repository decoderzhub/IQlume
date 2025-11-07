import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Info, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { TradingChart } from '../charts/TradingChart';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface AssetMetrics {
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  week52High?: number;
  week52Low?: number;
  avgVolume?: number;
  beta?: number;
  eps?: number;
}

interface AssetDetailPageProps {
  symbol: string;
  onBack: () => void;
  onTrade?: (symbol: string) => void;
}

interface PerformanceData {
  '1D': number;
  '1W': number;
  '1M': number;
  '3M': number;
  '1Y': number;
  'ALL': number;
}

export function AssetDetailPage({ symbol, onBack, onTrade }: AssetDetailPageProps) {
  const [assetData, setAssetData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<AssetMetrics>({});
  const [performance, setPerformance] = useState<PerformanceData>({
    '1D': 0,
    '1W': 0,
    '1M': 0,
    '3M': 0,
    '1Y': 0,
    'ALL': 0,
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState('1d');
  const [selectedPerformanceTab, setSelectedPerformanceTab] = useState<keyof PerformanceData>('1D');
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssetData();
    fetchChartData(selectedTimeframe);
    checkWatchlistStatus();
  }, [symbol]);

  const fetchAssetData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/market-data/symbol/${symbol}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch asset data');

      const data = await response.json();
      setAssetData(data);

      setMetrics({
        marketCap: data.market_cap,
        peRatio: data.pe_ratio,
        dividendYield: data.dividend_yield,
        week52High: data.week_52_high,
        week52Low: data.week_52_low,
        avgVolume: data.avg_volume,
        beta: data.beta,
        eps: data.eps,
      });

      setPerformance({
        '1D': data.day_change_percent || 0,
        '1W': data.week_change_percent || 0,
        '1M': data.month_change_percent || 0,
        '3M': data.three_month_change_percent || 0,
        '1Y': data.year_change_percent || 0,
        'ALL': data.all_time_change_percent || 0,
      });
    } catch (error) {
      console.error('Error fetching asset data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async (timeframe: string) => {
    try {
      console.log(`[AssetDetailPage] Fetching chart data for ${symbol} with timeframe ${timeframe}`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[AssetDetailPage] No session available for fetching chart data');
        return;
      }

      const timeframeMap: Record<string, string> = {
        '1m': '1Min',
        '5m': '5Min',
        '15m': '15Min',
        '30m': '15Min',
        '1h': '1Hour',
        '4h': '1Hour',
        '1d': '1Day',
        '1w': '1Day',
      };

      const apiTimeframe = timeframeMap[timeframe] || '1Day';

      // Calculate date range based on timeframe to get data up to market close
      const now = new Date();
      let startDate: Date;
      let limit = 100;

      // For intraday timeframes, get data from market open today (or previous trading day if after hours)
      if (['1m', '5m', '15m', '30m', '1h'].includes(timeframe)) {
        // Get data for today (or last 2 days to include previous close)
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 2);
        startDate.setHours(0, 0, 0, 0);
        limit = 390; // Full trading day at 1-minute bars
      } else if (timeframe === '4h') {
        // Last week for 4-hour bars
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        limit = 50;
      } else if (timeframe === '1d') {
        // Last 100 days for daily bars
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 100);
        limit = 100;
      } else {
        // Last 6 months for weekly
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6);
        limit = 26;
      }

      const startISO = startDate.toISOString().split('T')[0];
      const endISO = now.toISOString().split('T')[0];

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const url = `${API_BASE}/api/market-data/${symbol}/historical?timeframe=${apiTimeframe}&start=${startISO}&end=${endISO}&limit=${limit}`;

      console.log(`[AssetDetailPage] Fetching from: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AssetDetailPage] API error (${response.status}):`, errorText);
        throw new Error(`Failed to fetch chart data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[AssetDetailPage] Received ${Array.isArray(data) ? data.length : 0} bars from API:`, data?.slice(0, 2));

      if (!Array.isArray(data) || data.length === 0) {
        console.warn(`[AssetDetailPage] No data received for ${symbol}`);
        setChartData([]);
        return;
      }

      const formattedData = data
        .filter((bar: any) => {
          const isValid = bar &&
                         bar.timestamp &&
                         typeof bar.open === 'number' &&
                         typeof bar.high === 'number' &&
                         typeof bar.low === 'number' &&
                         typeof bar.close === 'number';
          if (!isValid) {
            console.warn('[AssetDetailPage] Invalid bar data:', bar);
          }
          return isValid;
        })
        .map((bar: any) => ({
          time: new Date(bar.timestamp).getTime(),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume || 0,
        }))
        .sort((a, b) => a.time - b.time); // Ensure chronological order

      console.log(`[AssetDetailPage] Formatted ${formattedData.length} valid bars for chart:`, formattedData.slice(0, 2));
      setChartData(formattedData);
    } catch (error) {
      console.error('[AssetDetailPage] Error fetching chart data:', error);
      setChartData([]);
    }
  };

  const checkWatchlistStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('watchlists')
        .select('symbols')
        .eq('user_id', session.user.id);

      if (error) throw error;

      const inWatchlist = data?.some(w => w.symbols.includes(symbol)) || false;
      setIsInWatchlist(inWatchlist);
    } catch (error) {
      console.error('Error checking watchlist status:', error);
    }
  };

  const toggleWatchlist = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: watchlists } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', session.user.id)
        .limit(1)
        .single();

      if (!watchlists) return;

      const currentSymbols = watchlists.symbols as string[];
      const updatedSymbols = isInWatchlist
        ? currentSymbols.filter(s => s !== symbol)
        : [...currentSymbols, symbol];

      await supabase
        .from('watchlists')
        .update({ symbols: updatedSymbols })
        .eq('id', watchlists.id);

      setIsInWatchlist(!isInWatchlist);
    } catch (error) {
      console.error('Error toggling watchlist:', error);
    }
  };

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    fetchChartData(timeframe);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading asset details...</span>
        </div>
      </div>
    );
  }

  if (!assetData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Failed to load asset data</p>
          <Button onClick={onBack} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  const isPriceUp = assetData.change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleWatchlist}
            className={`p-2 rounded-lg transition-colors ${
              isInWatchlist
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            <Star className={`w-5 h-5 ${isInWatchlist ? 'fill-current' : ''}`} />
          </button>
          {onTrade && (
            <Button onClick={() => onTrade(symbol)}>
              <DollarSign className="w-4 h-4 mr-2" />
              Trade
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{symbol}</h1>
            <p className="text-gray-400">{assetData.name || 'Loading company name...'}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white mb-1">
              ${assetData.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center gap-2 justify-end ${isPriceUp ? 'text-green-400' : 'text-red-400'}`}>
              {isPriceUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span className="text-lg font-semibold">
                {isPriceUp ? '+' : ''}{assetData.change?.toFixed(2)} ({isPriceUp ? '+' : ''}{assetData.change_percent?.toFixed(2)}%)
              </span>
            </div>
            <div className="text-sm text-gray-400 mt-1 flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" />
              <span>Real-time</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">Open</p>
            <p className="text-lg font-semibold text-white">
              ${assetData.open?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">High</p>
            <p className="text-lg font-semibold text-green-400">
              ${assetData.high?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">Low</p>
            <p className="text-lg font-semibold text-red-400">
              ${assetData.low?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">Volume</p>
            <p className="text-lg font-semibold text-white">
              {(assetData.volume / 1000000).toFixed(2)}M
            </p>
          </div>
        </div>
      </Card>

      <TradingChart
        symbol={symbol}
        data={chartData}
        currentTimeframe={selectedTimeframe}
        onTimeframeChange={handleTimeframeChange}
        height={500}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Performance
          </h3>
          <div className="flex gap-2 mb-4 flex-wrap">
            {(Object.keys(performance) as Array<keyof PerformanceData>).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPerformanceTab(period)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedPerformanceTab === period
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
          <div className="p-6 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">{selectedPerformanceTab} Change</span>
              <div className={`flex items-center gap-2 text-2xl font-bold ${
                performance[selectedPerformanceTab] >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {performance[selectedPerformanceTab] >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                <span>
                  {performance[selectedPerformanceTab] >= 0 ? '+' : ''}{performance[selectedPerformanceTab].toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            Key Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {metrics.marketCap && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Market Cap</p>
                <p className="text-white font-semibold">
                  ${(metrics.marketCap / 1000000000).toFixed(2)}B
                </p>
              </div>
            )}
            {metrics.peRatio && (
              <div>
                <p className="text-sm text-gray-400 mb-1">P/E Ratio</p>
                <p className="text-white font-semibold">{metrics.peRatio.toFixed(2)}</p>
              </div>
            )}
            {metrics.dividendYield && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Dividend Yield</p>
                <p className="text-white font-semibold">{metrics.dividendYield.toFixed(2)}%</p>
              </div>
            )}
            {metrics.week52High && (
              <div>
                <p className="text-sm text-gray-400 mb-1">52W High</p>
                <p className="text-white font-semibold">
                  ${metrics.week52High.toFixed(2)}
                </p>
              </div>
            )}
            {metrics.week52Low && (
              <div>
                <p className="text-sm text-gray-400 mb-1">52W Low</p>
                <p className="text-white font-semibold">
                  ${metrics.week52Low.toFixed(2)}
                </p>
              </div>
            )}
            {metrics.avgVolume && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Avg Volume</p>
                <p className="text-white font-semibold">
                  {(metrics.avgVolume / 1000000).toFixed(2)}M
                </p>
              </div>
            )}
            {metrics.beta && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Beta</p>
                <p className="text-white font-semibold">{metrics.beta.toFixed(2)}</p>
              </div>
            )}
            {metrics.eps && (
              <div>
                <p className="text-sm text-gray-400 mb-1">EPS</p>
                <p className="text-white font-semibold">${metrics.eps.toFixed(2)}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
