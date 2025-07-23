import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, TrendingUp, Activity, Settings, Play, Pause, BarChart3 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StrategyCard } from './StrategyCard';
import { CreateStrategyModal } from './CreateStrategyModal';
import { StrategyDetailsModal } from './StrategyDetailsModal';
import { BacktestModal } from './BacktestModal';
import { TradingStrategy } from '../../types';
import { useStore } from '../../store/useStore';

const mockStrategies: TradingStrategy[] = [
  {
    id: '1',
    name: 'Conservative Covered Calls',
    type: 'covered_calls',
    description: 'Generate income from AAPL holdings with 30-45 DTE covered calls',
    risk_level: 'low',
    min_capital: 15000,
    is_active: true,
    configuration: {
      symbol: 'AAPL',
      strike_delta: 0.3,
      dte_target: 35,
      profit_target: 0.5,
      max_loss: 0.1,
      position_size: 100,
    },
    performance: {
      total_return: 0.12,
      win_rate: 0.85,
      max_drawdown: 0.03,
      sharpe_ratio: 1.8,
      total_trades: 24,
      avg_trade_duration: 28,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'SPY Iron Condor',
    type: 'iron_condor',
    description: 'Range-bound strategy on S&P 500 ETF with tight profit targets',
    risk_level: 'medium',
    min_capital: 5000,
    is_active: false,
    configuration: {
      symbol: 'SPY',
      wing_width: 10,
      dte_target: 45,
      profit_target: 0.25,
      max_loss: 0.5,
      position_size: 1,
    },
    performance: {
      total_return: 0.08,
      win_rate: 0.72,
      max_drawdown: 0.08,
      sharpe_ratio: 1.2,
      total_trades: 18,
      avg_trade_duration: 35,
    },
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-14T15:20:00Z',
  },
  {
    id: '3',
    name: 'BTC Grid Trading',
    type: 'martingale',
    description: 'Automated grid trading on Bitcoin with dynamic position sizing',
    risk_level: 'high',
    min_capital: 10000,
    is_active: true,
    configuration: {
      symbol: 'BTCUSD',
      base_size: 0.01,
      max_levels: 5,
      grid_spacing: 0.02,
      take_profit: 0.015,
      stop_loss: 0.1,
    },
    performance: {
      total_return: 0.24,
      win_rate: 0.68,
      max_drawdown: 0.15,
      sharpe_ratio: 1.5,
      total_trades: 156,
      avg_trade_duration: 4,
    },
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-15T09:45:00Z',
  },
];

export function StrategiesView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<TradingStrategy | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBacktestModal, setShowBacktestModal] = useState(false);
  const [strategies, setStrategies] = useState(mockStrategies);

  const filteredStrategies = strategies.filter(strategy => {
    const matchesSearch = strategy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         strategy.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === 'all' || strategy.risk_level === filterRisk;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && strategy.is_active) ||
                         (filterStatus === 'inactive' && !strategy.is_active);
    
    return matchesSearch && matchesRisk && matchesStatus;
  });

  const handleToggleStrategy = (strategyId: string) => {
    setStrategies(prev => prev.map(strategy => 
      strategy.id === strategyId 
        ? { ...strategy, is_active: !strategy.is_active }
        : strategy
    ));
  };

  const handleViewDetails = (strategy: TradingStrategy) => {
    setSelectedStrategy(strategy);
    setShowDetailsModal(true);
  };

  const handleBacktest = (strategy: TradingStrategy) => {
    setSelectedStrategy(strategy);
    setShowBacktestModal(true);
  };

  const activeStrategies = strategies.filter(s => s.is_active).length;
  const totalReturn = strategies.reduce((sum, s) => sum + (s.performance?.total_return || 0), 0) / strategies.length;
  const avgWinRate = strategies.reduce((sum, s) => sum + (s.performance?.win_rate || 0), 0) / strategies.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Strategies</p>
              <p className="text-2xl font-bold text-white">{strategies.length}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Bots</p>
              <p className="text-2xl font-bold text-green-400">{activeStrategies}</p>
            </div>
            <Activity className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Avg Return</p>
              <p className="text-2xl font-bold text-purple-400">
                {(totalReturn * 100).toFixed(1)}%
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Win Rate</p>
              <p className="text-2xl font-bold text-yellow-400">
                {(avgWinRate * 100).toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>
      </div>

      {/* Controls */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search strategies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value as any)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Strategy
          </Button>
        </div>
      </Card>

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredStrategies.map((strategy, index) => (
          <motion.div
            key={strategy.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <StrategyCard
              strategy={strategy}
              onToggle={() => handleToggleStrategy(strategy.id)}
              onViewDetails={() => handleViewDetails(strategy)}
              onBacktest={() => handleBacktest(strategy)}
            />
          </motion.div>
        ))}
      </div>

      {filteredStrategies.length === 0 && (
        <Card className="p-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No strategies found</h3>
          <p className="text-gray-400 mb-6">
            {searchTerm || filterRisk !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters or search terms.'
              : 'Create your first trading strategy to get started.'}
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Strategy
          </Button>
        </Card>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateStrategyModal
          onClose={() => setShowCreateModal(false)}
          onSave={(strategy) => {
            setStrategies(prev => [...prev, { ...strategy, id: Date.now().toString() }]);
            setShowCreateModal(false);
          }}
        />
      )}

      {showDetailsModal && selectedStrategy && (
        <StrategyDetailsModal
          strategy={selectedStrategy}
          onClose={() => setShowDetailsModal(false)}
          onSave={(updatedStrategy) => {
            setStrategies(prev => prev.map(s => 
              s.id === updatedStrategy.id ? updatedStrategy : s
            ));
            setShowDetailsModal(false);
          }}
        />
      )}

      {showBacktestModal && selectedStrategy && (
        <BacktestModal
          strategy={selectedStrategy}
          onClose={() => setShowBacktestModal(false)}
        />
      )}
    </motion.div>
  );
}