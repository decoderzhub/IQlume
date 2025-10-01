import React from 'react';
import { TrendingUp, Info } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Card } from '../ui/Card';

interface HistoricalDataPoint {
  time: number;
  timeLabel: string;
  price: number;
  value: number;
}

interface MarketDataCardProps {
  symbol: string;
  data: {
    price: number;
    change: number;
    change_percent: number;
    open?: number;
    high: number;
    low: number;
  };
  historicalData?: HistoricalDataPoint[];
}

export function MarketDataCard({ symbol, data, historicalData }: MarketDataCardProps) {
  return (
    <Card className="p-6" hoverable>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {symbol === 'BTC' ? '₿' : symbol === 'ETH' ? 'Ξ' : symbol.charAt(0)}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{symbol}/USDT Grid Trading</h3>
          <p className="text-sm text-gray-400">
            Active for {Math.floor(Math.random() * 24)}h {Math.floor(Math.random() * 60)}m (Created{' '}
            {new Date().toLocaleDateString()})
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="bg-gray-800/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-400">Investment</span>
            <span className="text-xs text-gray-500">USDT</span>
          </div>
          <div className="text-xl lg:text-2xl font-bold text-white break-words">
            {(Math.random() * 5000 + 1000).toFixed(1)}
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-600/20 to-green-500/20 border border-green-500/30 rounded-lg p-4 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-green-400">Current profit</span>
            <span className="text-xs text-green-400">USDT</span>
            <Info className="w-3 h-3 text-green-400" />
          </div>
          <div className="text-lg lg:text-xl xl:text-2xl font-bold text-green-400 break-words overflow-hidden">
            +{(data.change * 10).toFixed(4)}({data.change_percent?.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm text-gray-400">Grid profit</span>
            <span className="text-xs text-gray-500">USDT</span>
          </div>
          <div className="text-green-400 font-semibold">+{(Math.random() * 50).toFixed(4)}</div>
          <div className="text-green-400 text-sm">+{(Math.random() * 0.1).toFixed(2)}%</div>
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm text-gray-400">Holding profit</span>
            <span className="text-xs text-gray-500">USDT</span>
          </div>
          <div className="text-green-400 font-semibold">+{(data.change * 8).toFixed(4)}</div>
          <div className="text-green-400 text-sm">+{(Math.random() * 1 + 0.5).toFixed(2)}%</div>
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm text-gray-400">Grid/Total annualized</span>
          </div>
          <div className="text-green-400 font-semibold">{(Math.random() * 10 + 5).toFixed(1)}%</div>
          <div className="text-green-400 text-sm">{(Math.random() * 200 + 50).toFixed(2)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <div className="text-sm text-gray-400 mb-1">24H/Total Transactions</div>
          <div className="text-white font-semibold">
            {Math.floor(Math.random() * 5)}/{Math.floor(Math.random() * 20 + 5)} times
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-400 mb-1">
            Price range <span className="text-xs">USDT</span>
          </div>
          <div className="text-white font-semibold">
            {(data.low * 0.95).toFixed(0)} - {(data.high * 1.05).toFixed(0)}
          </div>
          <div className="text-gray-400 text-sm">({Math.floor(Math.random() * 50 + 20)} grids)</div>
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm text-gray-400">Accum grid/</span>
            <span className="text-xs text-gray-500">USDT</span>
            <span className="text-sm text-gray-400">Total profit</span>
          </div>
          <div className="text-green-400 font-semibold">+{(Math.random() * 50).toFixed(4)}</div>
          <div className="text-green-400 text-sm">+{(data.change * 10).toFixed(4)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-sm text-gray-400 mb-1">
            Price <span className="text-xs">USDT</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-lg">{data.price?.toFixed(3)}</span>
            <TrendingUp className="w-4 h-4 text-orange-400" />
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-400 mb-1">
            Start price <span className="text-xs">USDT</span>
          </div>
          <div className="text-white font-semibold text-lg">
            {(data.open || data.price * 0.98)?.toFixed(3)}
          </div>
        </div>
      </div>

      {historicalData && historicalData.length > 0 && (
        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
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
                domain={['dataMin - 1', 'dataMax + 1']}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#d1d5db' }}
                tickFormatter={(value) => `${value.toFixed(0)}`}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                fill={`url(#gradient-${symbol})`}
                dot={false}
                activeDot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
