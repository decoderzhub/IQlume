import React from 'react';
import { TrendingUp, TrendingDown, Info, Activity } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';

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

  const symbol = strategy.base_symbol || strategy.type.toUpperCase();
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
        <div>
          <h3 className="text-lg font-semibold text-white">{strategy.name}</h3>
          <p className="text-sm text-gray-400">
            Active for {timeActive} {strategy.created_at && `(Created ${new Date(strategy.created_at).toLocaleDateString()})`}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="bg-gray-800/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-400">Investment</span>
            <span className="text-xs text-gray-500">USD</span>
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
            <span className="text-sm text-gray-400">Grid profit</span>
            <span className="text-xs text-gray-500">USD</span>
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
            <span className="text-sm text-gray-400">Holding profit</span>
            <span className="text-xs text-gray-500">USD</span>
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
            <span className="text-sm text-gray-400">Annualized return</span>
          </div>
          <div className={`${annualizedReturn >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold`}>
            {annualizedReturn >= 0 ? '+' : ''}{annualizedReturn.toFixed(1)}%
          </div>
          <div className="text-gray-400 text-sm">Per year</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <div className="text-sm text-gray-400 mb-1">24H/Total Transactions</div>
          <div className="text-white font-semibold">
            {last24hTransactions}/{totalTransactions} times
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-400 mb-1">
            Price range <span className="text-xs">USD</span>
          </div>
          {priceRangeLower > 0 && priceRangeUpper > 0 ? (
            <>
              <div className="text-white font-semibold">
                {formatCurrency(priceRangeLower)} - {formatCurrency(priceRangeUpper)}
              </div>
              {gridLevels > 0 && (
                <div className="text-gray-400 text-sm">({gridLevels} grids)</div>
              )}
            </>
          ) : (
            <div className="text-gray-500 text-sm">Not configured</div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm text-gray-400">Total profit</span>
            <span className="text-xs text-gray-500">USD</span>
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
            <div className="text-sm text-gray-400 mb-1">
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
            <div className="text-sm text-gray-400 mb-1">
              Start price <span className="text-xs">USD</span>
            </div>
            <div className="text-white font-semibold text-lg">
              {formatCurrency(startPrice)}
            </div>
          </div>
        </div>
      )}

      {historicalData && historicalData.length > 0 && (
        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id={`gradient-${strategy.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isProfit ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isProfit ? "#10b981" : "#ef4444"} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timeLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#d1d5db' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['dataMin - 10', 'dataMax + 10']}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#d1d5db' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isProfit ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                fill={`url(#gradient-${strategy.id})`}
                dot={false}
                activeDot={{ r: 4, fill: isProfit ? '#10b981' : '#ef4444', strokeWidth: 2, stroke: '#ffffff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
