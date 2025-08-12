import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Activity, 
  Target,
  Shield,
  Calendar,
  DollarSign,
  Percent,
  Clock,
  Award
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line
} from 'recharts';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatCurrency, formatPercent } from '../../lib/utils';

// Mock data for analytics
const portfolioPerformanceData = [
  { date: '2024-01-01', value: 100000, benchmark: 100000 },
  { date: '2024-01-15', value: 102500, benchmark: 101200 },
  { date: '2024-02-01', value: 105800, benchmark: 103500 },
  { date: '2024-02-15', value: 108200, benchmark: 105100 },
  { date: '2024-03-01', value: 112400, benchmark: 107800 },
  { date: '2024-03-15', value: 115600, benchmark: 109200 },
  { date: '2024-04-01', value: 118900, benchmark: 111500 },
  { date: '2024-04-15', value: 122300, benchmark: 113800 },
  { date: '2024-05-01', value: 125420, benchmark: 115200 },
];

const strategyPerformanceData = [
  { name: 'BTC Grid Bot', return: 15.2, sharpe: 1.8, maxDrawdown: -8.5, trades: 156 },
  { name: 'ETH DCA', return: 12.8, sharpe: 1.6, maxDrawdown: -12.3, trades: 45 },
  { name: 'Smart Rebalance', return: 8.9, sharpe: 1.4, maxDrawdown: -6.2, trades: 12 },
  { name: 'Covered Calls', return: 6.5, sharpe: 1.2, maxDrawdown: -4.1, trades: 28 },
];

const assetAllocationData = [
  { name: 'Stocks', value: 45, color: '#3b82f6' },
  { name: 'Crypto', value: 30, color: '#8b5cf6' },
  { name: 'Cash', value: 15, color: '#10b981' },
  { name: 'Options', value: 10, color: '#f59e0b' },
];

const monthlyReturnsData = [
  { month: 'Jan', return: 2.5 },
  { month: 'Feb', return: 3.8 },
  { month: 'Mar', return: 1.2 },
  { month: 'Apr', return: 4.1 },
  { month: 'May', return: 2.8 },
  { month: 'Jun', return: -1.2 },
  { month: 'Jul', return: 3.5 },
  { month: 'Aug', return: 2.1 },
];

const riskMetricsData = [
  { metric: 'Portfolio Beta', value: 0.85, description: 'Lower than market volatility', unit: '' },
  { metric: 'Value at Risk (95%)', value: -2.8, description: 'Maximum expected loss', unit: '%' },
  { metric: 'Portfolio Volatility', value: 14.2, description: 'Annualized price fluctuation', unit: '%' },
  { metric: 'Sharpe Ratio', value: 1.68, description: 'Risk-adjusted return measure', unit: '' },
  { metric: 'Portfolio Alpha', value: 2.1, description: 'Excess return vs benchmark', unit: '%' },
  { metric: 'Standard Deviation', value: 12.8, description: 'Return variability measure', unit: '%' },
];

export function AnalyticsView() {
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M');
  const [selectedMetric, setSelectedMetric] = useState<'return' | 'sharpe' | 'drawdown'>('return');

  const kpis = [
    {
      label: 'Total Return',
      value: '25.42%',
      change: '+2.1%',
      icon: TrendingUp,
      color: 'text-green-400',
      positive: true,
    },
    {
      label: 'Sharpe Ratio',
      value: '1.68',
      change: '+0.12',
      icon: Target,
      color: 'text-blue-400',
      positive: true,
    },
    {
      label: 'Max Drawdown',
      value: '-8.5%',
      change: '+1.2%',
      icon: Shield,
      color: 'text-purple-400',
      positive: true,
    },
    {
      label: 'Win Rate',
      value: '73.2%',
      change: '+2.8%',
      icon: Award,
      color: 'text-yellow-400',
      positive: true,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-gray-400">Advanced portfolio performance and risk analysis</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card hoverable className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Icon className={`w-8 h-8 ${kpi.color}`} />
                  <span className={`text-sm font-medium ${kpi.positive ? 'text-green-400' : 'text-red-400'}`}>
                    {kpi.change}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">{kpi.label}</p>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Portfolio Performance Chart */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Portfolio Performance vs Benchmark</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-sm text-gray-400">Portfolio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full" />
                <span className="text-sm text-gray-400">S&P 500</span>
              </div>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioPerformanceData}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6b7280" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6b7280" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb'
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'value' ? 'Portfolio' : 'S&P 500'
                  ]}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  dataKey="benchmark"
                  stroke="#6b7280"
                  strokeWidth={2}
                  fill="url(#benchmarkGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#portfolioGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Asset Allocation */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Asset Allocation</h3>
          
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                {/* @ts-ignore */}
                <Pie 
                  data={assetAllocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {assetAllocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb'
                  }}
                  formatter={(value: number) => [`${value}%`, 'Allocation']}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-3">
            {assetAllocationData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-300">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Returns */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Monthly Returns</h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyReturnsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb'
                  }}
                  formatter={(value: number) => [`${value}%`, 'Return']}
                />
                <Bar 
                  dataKey="return" 
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Strategy Performance Comparison */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Strategy Performance Comparison</h3>
          <div className="flex gap-2">
            {(['return', 'sharpe', 'drawdown'] as const).map((metric) => (
              <Button
                key={metric}
                variant={selectedMetric === metric ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedMetric(metric)}
              >
                {metric === 'return' && 'Return'}
                {metric === 'sharpe' && 'Sharpe'}
                {metric === 'drawdown' && 'Drawdown'}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 font-medium text-gray-400">Strategy</th>
                <th className="text-right py-3 px-4 font-medium text-gray-400">Total Return</th>
                <th className="text-right py-3 px-4 font-medium text-gray-400">Sharpe Ratio</th>
                <th className="text-right py-3 px-4 font-medium text-gray-400">Max Drawdown</th>
                <th className="text-right py-3 px-4 font-medium text-gray-400">Total Trades</th>
              </tr>
            </thead>
            <tbody>
              {strategyPerformanceData.map((strategy, index) => (
                <motion.tr
                  key={strategy.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className="font-medium text-white">{strategy.name}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-medium text-green-400">
                      {formatPercent(strategy.return)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-medium text-blue-400">
                      {strategy.sharpe.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-medium text-red-400">
                      {formatPercent(strategy.maxDrawdown)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-medium text-white">{strategy.trades}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Risk Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Risk Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {riskMetricsData.map((metric, index) => (
            <motion.div
              key={metric.metric}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-gray-800/30 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">{metric.metric}</span>
                <span className="text-lg font-bold text-white">
                  {typeof metric.value === 'number' 
                    ? metric.value > 0 && metric.metric !== 'Value at Risk (95%)'
                      ? `+${metric.value.toFixed(2)}`
                      : metric.value.toFixed(2)
                    : metric.value
                  }
                  {metric.unit}
                </span>
              </div>
              <p className="text-xs text-gray-400">{metric.description}</p>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}