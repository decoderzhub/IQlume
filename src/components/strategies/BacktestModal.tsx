import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Calendar, TrendingUp, TrendingDown, BarChart3, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { generateRiskMetrics, determineRiskLevel } from '../../lib/riskUtils';

interface BacktestModalProps {
  strategy: TradingStrategy;
  onClose: () => void;
  onSave?: (strategy: TradingStrategy) => void;
}

interface BacktestResult {
  total_return: number;
  win_rate: number;
  max_drawdown: number;
  sharpe_ratio: number;
  total_trades: number;
  avg_trade_duration: number;
  profit_factor: number;
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_capital: number;
  volatility: number;
  standard_deviation: number;
  beta: number;
  alpha: number;
  value_at_risk: number;
}

export function BacktestModal({ strategy, onClose, onSave }: BacktestModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2024-01-15');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [updatedStrategy, setUpdatedStrategy] = useState<TradingStrategy | null>(null);

  const runBacktest = async () => {
    setIsRunning(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Generate base mock results
    const baseResults = {
      total_return: 0.156,
      win_rate: 0.73,
      max_drawdown: 0.08,
      total_trades: 48,
      avg_trade_duration: 28,
      profit_factor: 1.85,
      start_date: startDate,
      end_date: endDate,
      initial_capital: initialCapital,
      final_capital: initialCapital * (1 + 0.156),
    };
    
    // Generate realistic risk metrics based on strategy type and performance
    const riskMetrics = generateRiskMetrics(
      strategy.type,
      baseResults.total_return,
      baseResults.max_drawdown,
      baseResults.win_rate
    );
    
    // Combine base results with risk metrics
    const mockResults: BacktestResult = {
      ...baseResults,
      ...riskMetrics,
    };
    
    setResults(mockResults);
    
    // Create updated strategy with new performance data and dynamic risk level
    const newPerformance = {
      total_return: mockResults.total_return,
      win_rate: mockResults.win_rate,
      max_drawdown: mockResults.max_drawdown,
      sharpe_ratio: mockResults.sharpe_ratio,
      total_trades: mockResults.total_trades,
      avg_trade_duration: mockResults.avg_trade_duration,
      volatility: mockResults.volatility,
      standard_deviation: mockResults.standard_deviation,
      beta: mockResults.beta,
      alpha: mockResults.alpha,
      value_at_risk: mockResults.value_at_risk,
    };
    
    // Dynamically determine risk level based on calculated metrics
    const dynamicRiskLevel = determineRiskLevel(newPerformance);
    
    const strategyWithUpdatedRisk: TradingStrategy = {
      ...strategy,
      risk_level: dynamicRiskLevel,
      performance: newPerformance,
      updated_at: new Date().toISOString(),
    };
    
    setUpdatedStrategy(strategyWithUpdatedRisk);
    setIsRunning(false);
  };

  const handleSaveUpdatedStrategy = () => {
    if (updatedStrategy && onSave) {
      onSave(updatedStrategy);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Backtest Strategy</h2>
              <p className="text-gray-400">{strategy.name}</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {!results ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Initial Capital
                  </label>
                  <input
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    min="10000"
                    step="10000"
                  />
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-6">
                <h3 className="font-medium text-white mb-4">Strategy Configuration</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Symbol:</span>
                    <span className="text-white ml-2">{strategy.configuration.symbol}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white ml-2 capitalize">{strategy.type.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Risk Level:</span>
                    <span className="text-white ml-2 capitalize">{strategy.risk_level}</span>
                  </div>
                  {strategy.configuration.strike_delta && (
                    <div>
                      <span className="text-gray-400">Strike Delta:</span>
                      <span className="text-white ml-2">{strategy.configuration.strike_delta}</span>
                    </div>
                  )}
                  {strategy.configuration.dte_target && (
                    <div>
                      <span className="text-gray-400">DTE Target:</span>
                      <span className="text-white ml-2">{strategy.configuration.dte_target} days</span>
                    </div>
                  )}
                  {strategy.configuration.profit_target && (
                    <div>
                      <span className="text-gray-400">Profit Target:</span>
                      <span className="text-white ml-2">{formatPercent(strategy.configuration.profit_target)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={runBacktest}
                  disabled={isRunning}
                  isLoading={isRunning}
                  size="lg"
                  className="px-8"
                >
                  {isRunning ? (
                    'Running Backtest...'
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Run Backtest
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {results.total_return >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    )}
                    <span className="text-sm text-gray-400">Total Return</span>
                  </div>
                  <p className={`text-xl font-bold ${results.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercent(results.total_return)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-gray-400">Win Rate</span>
                  </div>
                  <p className="text-xl font-bold text-blue-400">
                    {formatPercent(results.win_rate)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-400">Max Drawdown</span>
                  </div>
                  <p className="text-xl font-bold text-purple-400">
                    {formatPercent(results.max_drawdown)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-400">Volatility</span>
                  </div>
                  <p className="text-xl font-bold text-purple-400">
                    {(results.volatility * 100).toFixed(2)}%
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-gray-400">Beta</span>
                  </div>
                  <p className="text-xl font-bold text-blue-400">
                    {results.beta.toFixed(2)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                    <span className="text-sm text-gray-400">Value at Risk</span>
                  </div>
                  <p className="text-xl font-bold text-red-400">
                    {(results.value_at_risk * 100).toFixed(2)}%
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm text-gray-400">Alpha</span>
                  </div>
                  <p className="text-xl font-bold text-yellow-400">
                    {(results.alpha * 100).toFixed(2)}%
                  </p>
                </Card>
              </div>

              {/* Detailed Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="p-6">
                  <h3 className="font-semibold text-white mb-4">Performance Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Initial Capital:</span>
                      <span className="text-white">{formatCurrency(results.initial_capital)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Final Capital:</span>
                      <span className="text-white">{formatCurrency(results.final_capital)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Profit:</span>
                      <span className={results.total_return >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatCurrency(results.final_capital - results.initial_capital)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Profit Factor:</span>
                      <span className="text-white">{results.profit_factor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sharpe Ratio:</span>
                      <span className="text-white">{results.sharpe_ratio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Standard Deviation:</span>
                      <span className="text-white">{(results.standard_deviation * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold text-white mb-4">Trade Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Trades:</span>
                      <span className="text-white">{results.total_trades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Winning Trades:</span>
                      <span className="text-green-400">{Math.round(results.total_trades * results.win_rate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Losing Trades:</span>
                      <span className="text-red-400">{results.total_trades - Math.round(results.total_trades * results.win_rate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Trade Duration:</span>
                      <span className="text-white">{results.avg_trade_duration} days</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Dynamic Risk Assessment */}
              {updatedStrategy && updatedStrategy.risk_level !== strategy.risk_level && (
                <Card className="p-6 bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-yellow-400 mb-2">Risk Level Updated</h3>
                      <p className="text-sm text-yellow-300 mb-3">
                        Based on the backtest results and calculated risk metrics, this strategy's risk level 
                        has been updated from <span className="font-semibold capitalize">{strategy.risk_level}</span> to{' '}
                        <span className="font-semibold capitalize">{updatedStrategy.risk_level}</span>.
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-400">Volatility:</span>
                          <span className="text-white ml-2">{(results!.volatility * 100).toFixed(2)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Sharpe Ratio:</span>
                          <span className="text-white ml-2">{results!.sharpe_ratio.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Beta:</span>
                          <span className="text-white ml-2">{results!.beta.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">VaR (95%):</span>
                          <span className="text-white ml-2">{(results!.value_at_risk * 100).toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Chart Placeholder */}
              <Card className="p-6">
                <h3 className="font-semibold text-white mb-4">Equity Curve</h3>
                <div className="h-64 bg-gray-800/30 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                    <p>Interactive equity curve chart would be displayed here</p>
                    <p className="text-sm">Showing portfolio value over time</p>
                  </div>
                </div>
              </Card>

              <div className="flex gap-4">
                <Button variant="secondary" onClick={() => setResults(null)}>
                  Run New Backtest
                </Button>
                {updatedStrategy && onSave && (
                  <Button onClick={handleSaveUpdatedStrategy} variant="primary">
                    Save Updated Strategy
                  </Button>
                )}
                <Button onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}