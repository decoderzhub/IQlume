import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Info, Activity } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { StrategyCandlestickChart } from '../charts/StrategyCandlestickChart';
import { getMarketStatus } from '../../lib/marketHours';
import { useStore } from '../../store/useStore';

interface StrategyPerformanceData {
  strategy: {
    id: string;
    name: string;
    type: string;
    base_symbol?: string;
    created_at?: string;
  };
  totalInvestment: number;
  currentValue: number;
  currentProfit: number;
  currentProfitPercent: number;
  gridProfit: number;
  holdingProfit: number;
  gridProfitPercent: number;
  annualizedReturn: number;
  totalTransactions: number;
  last24hTransactions: number;
  priceRangeUpper: number;
  priceRangeLower: number;
  gridLevels: number;
  startPrice: number;
  currentPrice: number;
  historicalData: Array<{
    time: number;
    timeLabel: string;
    price: number;
    value: number;
  }>;
}

interface MarketDataCardProps {
  strategyData: StrategyPerformanceData;
}

export function MarketDataCard({ strategyData }: MarketDataCardProps) {
  const {
    strategy,
    totalInvestment,
    currentProfit,
    currentProfitPercent,
    gridProfit,
    holdingProfit,
    gridProfitPercent,
    annualizedReturn,
    totalTransactions,
    last24hTransactions,
    priceRangeUpper,
    priceRangeLower,
    gridLevels,
    startPrice,
    currentPrice,
    historicalData,
  } = strategyData;

  const { user } = useStore();
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const marketStatus = getMarketStatus();

  React.useEffect(() => {
    console.log('[MarketDataCard] Rendering strategy:', strategy.name, 'ID:', strategy.id);
    console.log('[MarketDataCard] Current profit:', currentProfit, 'Total investment:', totalInvestment);
  }, [strategy.id, strategy.name, currentProfit, totalInvestment]);

  // Fetch historical chart data
  useEffect(() => {
    const fetchChartData = async () => {
      if (!strategy.base_symbol || !user) return;

      try {
        setLoadingChart(true);
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

        // Get data for the last 30 days
        const end = new Date();
        const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const { data: { session } } = await import('../../lib/supabase').then(m => m.supabase.auth.getSession());
        if (!session) return;

        // Normalize crypto symbols: BTC/USD -> BTCUSD for API compatibility
        // The backend's normalize_crypto_symbol function expects symbols without slashes in the URL path
        const normalizedSymbol = strategy.base_symbol.replace('/', '').toUpperCase();
        console.log(`[MarketDataCard] Symbol: ${strategy.base_symbol} -> ${normalizedSymbol}`);

        const response = await fetch(
          `${API_BASE}/api/market-data/${normalizedSymbol}/historical?timeframe=1Day&start=${startStr}&end=${endStr}&limit=100`,
          {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          }
        );

        console.log(`[MarketDataCard] Response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[MarketDataCard] Failed to fetch chart data:', response.status, errorText);
          return;
        }

        const data = await response.json();
        console.log(`[MarketDataCard] Received historical data:`, data);

        // The /{symbol}/historical endpoint returns a direct array of bars
        const bars = Array.isArray(data) ? data : [];
        console.log(`[MarketDataCard] Number of bars: ${bars.length}`);

        if (bars.length > 0) {
          const formattedData = bars.map((bar: any) => ({
            time: new Date(bar.timestamp).getTime() / 1000,
            open: parseFloat(bar.open),
            high: parseFloat(bar.high),
            low: parseFloat(bar.low),
            close: parseFloat(bar.close),
            volume: bar.volume || 0,
          }));
          setChartData(formattedData);
          console.log('[MarketDataCard] Loaded', formattedData.length, 'chart bars for', strategy.base_symbol);
        } else {
          console.warn('[MarketDataCard] No historical data available for', strategy.base_symbol);
        }
      } catch (error) {
        console.error('[MarketDataCard] Error fetching chart data:', error);
      } finally {
        setLoadingChart(false);
      }
    };

    fetchChartData();
  }, [strategy.base_symbol, strategy.id, user]);

  // Get symbol from multiple possible locations
  // Priority: base_symbol > configuration.symbol > type
  const symbol = strategy.base_symbol ||
                 (strategy as any).configuration?.symbol ||
                 strategy.type.toUpperCase();
  const isProfit = currentProfit >= 0;
  const isPriceUp = currentPrice >= startPrice;
  const timeActive = strategy.created_at
    ? formatDistanceToNow(new Date(strategy.created_at), { addSuffix: false })
    : 'N/A';

  return (
    <Card className="p-6" hoverable>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-teal-500 to-green-500 rounded-full flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">
              {strategy.name}
            </h3>
            {symbol && symbol !== strategy.type.toUpperCase() && (
              <span className="text-sm text-blue-400 font-semibold">({symbol})</span>
            )}
            {strategy.id && (
              <span className="text-xs text-white font-mono">
                ID: {strategy.id.slice(0, 8)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-300">
            Active for {timeActive} {strategy.created_at && `(Created ${new Date(strategy.created_at).toLocaleDateString()})`}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="bg-gray-800/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-white">Investment</span>
            <span className="text-xs text-gray-300">USD</span>
          </div>
          <div className="text-xl lg:text-2xl font-bold text-white break-words">
            {formatCurrency(totalInvestment)}
          </div>
        </div>

        <div className={`bg-gradient-to-r ${isProfit ? 'from-green-600/20 to-green-500/20 border-green-500/30' : 'from-red-600/20 to-red-500/20 border-red-500/30'} border rounded-lg p-4 flex-1`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-sm ${isProfit ? 'text-green-400' : 'text-red-400'}`}>Current profit</span>
            <span className={`text-xs ${isProfit ? 'text-green-400' : 'text-red-400'}`}>USD</span>
            <Info className={`w-3 h-3 ${isProfit ? 'text-green-400' : 'text-red-400'}`} />
          </div>
          <div className={`text-lg lg:text-xl xl:text-2xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'} break-words overflow-hidden`}>
            {isProfit ? '+' : ''}{formatCurrency(currentProfit)} ({currentProfitPercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm text-white">Grid profit</span>
            <span className="text-xs text-gray-300">USD</span>
          </div>
          <div className={`${gridProfit >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold`}>
            {gridProfit >= 0 ? '+' : ''}{formatCurrency(gridProfit)}
          </div>
          <div className={`${gridProfitPercent >= 0 ? 'text-green-400' : 'text-red-400'} text-sm`}>
            {gridProfitPercent >= 0 ? '+' : ''}{gridProfitPercent.toFixed(2)}%
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm text-white">Holding profit</span>
            <span className="text-xs text-gray-300">USD</span>
          </div>
          <div className={`${holdingProfit >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold`}>
            {holdingProfit >= 0 ? '+' : ''}{formatCurrency(holdingProfit)}
          </div>
          <div className={`${holdingProfit >= 0 ? 'text-green-400' : 'text-red-400'} text-sm`}>
            {holdingProfit >= 0 ? '+' : ''}{((holdingProfit / totalInvestment) * 100).toFixed(2)}%
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm text-white">Annualized return</span>
          </div>
          <div className={`${annualizedReturn >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold`}>
            {annualizedReturn >= 0 ? '+' : ''}{annualizedReturn.toFixed(1)}%
          </div>
          <div className="text-gray-300 text-sm">Per year</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <div className="text-sm text-white mb-1">24H/Total Transactions</div>
          <div className="text-white font-semibold">
            {last24hTransactions}/{totalTransactions} times
          </div>
        </div>

        <div>
          <div className="text-sm text-white mb-1">
            Price range <span className="text-xs">USD</span>
          </div>
          {priceRangeLower > 0 && priceRangeUpper > 0 ? (
            <>
              <div className="text-white font-semibold">
                {formatCurrency(priceRangeLower)} - {formatCurrency(priceRangeUpper)}
              </div>
              {gridLevels > 0 && (
                <div className="text-gray-300 text-sm">({gridLevels} grids)</div>
              )}
            </>
          ) : (
            <div className="text-gray-500 text-sm">Not configured</div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm text-white">Total profit</span>
            <span className="text-xs text-gray-300">USD</span>
          </div>
          <div className={`${currentProfit >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold`}>
            {currentProfit >= 0 ? '+' : ''}{formatCurrency(currentProfit)}
          </div>
          <div className={`${currentProfit >= 0 ? 'text-green-400' : 'text-red-400'} text-sm`}>
            {currentProfit >= 0 ? '+' : ''}{currentProfitPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {currentPrice > 0 && startPrice > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-sm text-white mb-1">
              Current price <span className="text-xs">USD</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-lg">{formatCurrency(currentPrice)}</span>
              {isPriceUp ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
          </div>

          <div>
            <div className="text-sm text-white mb-1">
              Start price <span className="text-xs">USD</span>
            </div>
            <div className="text-white font-semibold text-lg">
              {formatCurrency(startPrice)}
            </div>
          </div>
        </div>
      )}

      {/* Candlestick Chart - Show when we have data */}
      {chartData.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-white">Price Chart (30 Days)</span>
            <span className="text-xs text-gray-300 font-medium">{strategy.base_symbol || symbol}</span>
          </div>
          <StrategyCandlestickChart
            symbol={strategy.base_symbol || symbol}
            candleData={chartData}
            trades={[]}
            gridLevels={priceRangeLower > 0 && priceRangeUpper > 0 ? {
              lower: priceRangeLower,
              upper: priceRangeUpper,
            } : undefined}
            loading={loadingChart}
          />
        </div>
      )}

      {/* Loading state */}
      {loadingChart && chartData.length === 0 && (
        <div className="h-48 mb-4 flex items-center justify-center bg-gray-800/30 rounded-lg">
          <div className="text-gray-400 text-sm">Loading chart data...</div>
        </div>
      )}

      {/* No data state */}
      {!loadingChart && chartData.length === 0 && strategy.base_symbol && (
        <div className="h-48 mb-4 flex items-center justify-center bg-gray-800/30 rounded-lg border border-gray-700">
          <div className="text-center">
            <Activity className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <div className="text-gray-300 text-sm">No chart data available for {strategy.base_symbol}</div>
            <div className="text-gray-400 text-xs mt-1">Historical data will load when available</div>
          </div>
        </div>
      )}
    </Card>
  );
}
