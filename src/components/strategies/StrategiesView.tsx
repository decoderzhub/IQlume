import React, { useState, useEffect } from 'react';
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
import { supabase } from '../../lib/supabase';

const mockStrategies: TradingStrategy[] = [
  {
    id: '1',
    name: 'BTC/USDT Spot Grid',
    type: 'spot_grid',
    description: 'Automated grid trading on Bitcoin within $40K-$50K range',
    risk_level: 'low',
    min_capital: 2000,
    is_active: true,
    configuration: {
      symbol: 'BTC/USDT',
      price_range_lower: 40000,
      price_range_upper: 50000,
      number_of_grids: 25,
      grid_spacing_percent: 1.0,
      mode: 'customize',
    },
    performance: {
      total_return: 0.08,
      win_rate: 0.78,
      max_drawdown: 0.05,
      sharpe_ratio: 1.4,
      total_trades: 156,
      avg_trade_duration: 2,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'ETH DCA Strategy',
    type: 'dca',
    description: 'Daily dollar-cost averaging into Ethereum',
    risk_level: 'low',
    min_capital: 500,
    is_active: true,
    configuration: {
      symbol: 'ETH/USDT',
      investment_amount_per_interval: 50,
      frequency: 'daily',
      investment_target_percent: 25,
    },
    performance: {
      total_return: 0.15,
      win_rate: 0.92,
      max_drawdown: 0.08,
      sharpe_ratio: 1.6,
      total_trades: 45,
      avg_trade_duration: 1,
    },
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-14T15:20:00Z',
  },
  {
    id: '3',
    name: 'Multi-Asset Rebalance',
    type: 'smart_rebalance',
    description: 'Maintains 50% BTC, 30% ETH, 20% USDT allocation',
    risk_level: 'medium',
    min_capital: 5000,
    is_active: false,
    configuration: {
      assets: [
        { symbol: 'BTC', allocation: 50 },
        { symbol: 'ETH', allocation: 30 },
        { symbol: 'USDT', allocation: 20 },
      ],
      trigger_type: 'threshold',
      threshold_deviation_percent: 5,
    },
    performance: {
      total_return: 0.12,
      win_rate: 0.88,
      max_drawdown: 0.06,
      sharpe_ratio: 1.8,
      total_trades: 12,
      avg_trade_duration: 7,
    },
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-15T09:45:00Z',
  },
  {
    id: '4',
    name: 'SOL Infinity Grid',
    type: 'infinity_grid',
    description: 'Trending market grid bot for Solana with no upper limit',
    risk_level: 'high',
    min_capital: 1500,
    is_active: false,
    configuration: {
      symbol: 'SOL/USDT',
      lowest_price: 80,
      profit_per_grid_percent: 1.5,
      mode: 'customize',
    },
    performance: {
      total_return: 0.24,
      win_rate: 0.72,
      max_drawdown: 0.15,
      sharpe_ratio: 1.3,
      total_trades: 89,
      avg_trade_duration: 3,
    },
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-01-15T11:30:00Z',
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
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useStore();

  // Load strategies from database on component mount
  useEffect(() => {
    const loadStrategies = async () => {
      if (!user) {
        console.log('No user found, cannot load strategies');
        setLoading(false);
        return;
      }

      try {
        console.log('Loading strategies for user:', user.id);
        
        const { data, error } = await supabase
          .from('trading_strategies')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading strategies:', error);
          // Fallback to mock data if database fails
          setStrategies(mockStrategies);
        } else {
          console.log('Loaded strategies from database:', data);
          // Transform database data to match TradingStrategy interface
          const transformedStrategies: TradingStrategy[] = data.map(strategy => ({
            id: strategy.id,
            name: strategy.name,
            type: strategy.type,
            description: strategy.description,
            risk_level: strategy.risk_level,
            min_capital: strategy.min_capital,
            is_active: strategy.is_active,
            configuration: strategy.configuration,
            performance: strategy.performance,
            created_at: strategy.created_at,
            updated_at: strategy.updated_at,
          }));
          
          setStrategies(transformedStrategies);
        }
      } catch (error) {
        console.error('Unexpected error loading strategies:', error);
        // Fallback to mock data
        setStrategies(mockStrategies);
      } finally {
        setLoading(false);
      }
    };

    loadStrategies();
  }, [user]);
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

  const handleCreateStrategy = async (strategyData: Omit<TradingStrategy, 'id'>) => {
    if (!user) {
      console.error('No user found');
      alert('You must be logged in to create strategies');
      return;
    }

    try {
      console.log('Saving strategy to database:', strategyData);
      
      // Insert strategy into Supabase
      const { data, error } = await supabase
        .from('trading_strategies')
        .insert([
          {
            user_id: user.id,
            name: strategyData.name,
            type: strategyData.type,
            description: strategyData.description,
            risk_level: strategyData.risk_level,
            min_capital: strategyData.min_capital,
            is_active: strategyData.is_active,
            configuration: strategyData.configuration,
            performance: strategyData.performance || null,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error saving strategy:', error);
        alert(`Failed to save strategy: ${error.message}`);
        return;
      }

      console.log('Strategy saved successfully:', data);
      
      // Add the new strategy to local state with the returned ID
      const newStrategy: TradingStrategy = {
        id: data.id,
        name: data.name,
        type: data.type,
        description: data.description,
        risk_level: data.risk_level,
        min_capital: data.min_capital,
        is_active: data.is_active,
        configuration: data.configuration,
        performance: data.performance,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setStrategies(prev => [...prev, newStrategy]);
      setShowCreateModal(false);
      
      // Show success message
      alert('Strategy created successfully!');
      
    } catch (error) {
      console.error('Unexpected error saving strategy:', error);
      alert('An unexpected error occurred while saving the strategy');
    }
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    if (!user) {
      console.error('No user found');
      alert('You must be logged in to delete strategies');
      return;
    }

    try {
      console.log('Deleting strategy from database:', strategyId);
      
      // Delete strategy from Supabase
      const { error } = await supabase
        .from('trading_strategies')
        .delete()
        .eq('id', strategyId)
        .eq('user_id', user.id); // Ensure user can only delete their own strategies

      if (error) {
        console.error('Error deleting strategy:', error);
        alert(`Failed to delete strategy: ${error.message}`);
        return;
      }

      console.log('Strategy deleted successfully');
      
      // Remove the strategy from local state
      setStrategies(prev => prev.filter(strategy => strategy.id !== strategyId));
      setShowDetailsModal(false);
      
      // Show success message
      alert('Strategy deleted successfully!');
      
    } catch (error) {
      console.error('Unexpected error deleting strategy:', error);
      alert('An unexpected error occurred while deleting the strategy');
    }
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
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading strategies...</span>
          </div>
        </div>
      ) : (
        <>
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
          onSave={handleCreateStrategy}
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
          onDelete={(strategyId) => {
            handleDeleteStrategy(strategyId);
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
        </>
      )}
    </motion.div>
  );
}