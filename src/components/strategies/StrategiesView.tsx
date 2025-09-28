import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, TrendingUp, Activity, Settings, Play, Pause, BarChart3, Grid3X3, Bot, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StrategyCard } from './StrategyCard';
import { CreateStrategyModal } from './CreateStrategyModal';
import { StrategyDetailsModal } from './StrategyDetailsModal';
import { BacktestModal } from './BacktestModal';
import { TradingStrategy } from '../../types';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { INITIAL_LAUNCH_STRATEGY_TYPES } from '../../lib/constants';

// Strategy categorization
const strategyCategories = {
  'Grid Bots': {
    icon: Grid3X3,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    description: 'Automated buy-low/sell-high trading within defined price ranges',
    types: ['spot_grid', 'futures_grid', 'infinity_grid']
  },
  'Autonomous Bots': {
    icon: Bot,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    description: 'Set-and-forget strategies for systematic investing and rebalancing',
    types: ['dca', 'smart_rebalance']
  },
  'Options Strategies': {
    icon: Target,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    description: 'Income generation and risk management using options contracts',
    types: ['covered_calls', 'wheel', 'short_put', 'iron_condor', 'straddle', 'long_call', 'long_straddle', 'long_condor', 'iron_butterfly', 'short_call', 'short_straddle', 'long_butterfly', 'short_strangle', 'short_put_vertical', 'short_call_vertical', 'broken_wing_butterfly', 'option_collar', 'long_strangle']
  },
  'Algorithmic Trading': {
    icon: Activity,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    description: 'Advanced algorithmic strategies for momentum and mean reversion',
    types: ['mean_reversion', 'momentum_breakout', 'pairs_trading', 'scalping', 'swing_trading', 'arbitrage', 'news_based_trading', 'orb']
  }
};

export function StrategiesView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Grid Bots': true,
    'Autonomous Bots': true,
    'Options Strategies': true,
    'Algorithmic Trading': true,
  });
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No valid session found. Please log in again.');
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/strategies/`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch strategies: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          setStrategies(data);
        } else {
          console.error('API response is not a strategies array:', data);
          setStrategies([]);
        }
      } catch (error) {
        console.error('Unexpected error loading strategies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStrategies();
  }, [user]);
  // Filter strategies based on initial launch types

  // Calculate KPIs only for initial launch strategies
  const initialLaunchStrategiesForKPIs = strategies.filter(s => INITIAL_LAUNCH_STRATEGY_TYPES.includes(s.type));
  const activeStrategies = initialLaunchStrategiesForKPIs.filter(s => s.is_active).length;
  const totalReturn = initialLaunchStrategiesForKPIs.length > 0 ?
    initialLaunchStrategiesForKPIs.reduce((sum, s) => sum + (s.performance?.total_return || 0), 0) / initialLaunchStrategiesForKPIs.length : 0;
  const avgWinRate = initialLaunchStrategiesForKPIs.length > 0 ?
    initialLaunchStrategiesForKPIs.reduce((sum, s) => sum + (s.performance?.win_rate || 0), 0) / initialLaunchStrategiesForKPIs.length : 0;

  const displayStrategies = strategies.filter(strategy => {
    const matchesSearch = strategy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         strategy.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === 'all' || strategy.risk_level === filterRisk;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && strategy.is_active) ||
                         (filterStatus === 'inactive' && !strategy.is_active);
    return matchesSearch && matchesRisk && matchesStatus;
  });

  // Group strategies by category
  const categorizedStrategies = Object.entries(strategyCategories).reduce((acc, [categoryName, categoryData]) => {
    const categoryStrategies = displayStrategies.filter(strategy => 
      categoryData.types.includes(strategy.type)
    );
    
    if (categoryStrategies.length > 0) {
      acc[categoryName] = {
        ...categoryData,
        strategies: categoryStrategies
      };
    }
    
    return acc;
  }, {} as Record<string, any>);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const handleToggleStrategy = (strategyId: string) => {
    return new Promise<void>(async (resolve, reject) => {
      try {
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy || !user) return;

    const newActiveStatus = !strategy.is_active;
    console.log(`🔄 Toggling strategy ${strategy.name}: ${strategy.is_active ? 'PAUSE' : 'START'}`);
    
    // Optimistically update local state
    setStrategies(prev => prev.map(s => 
      s.id === strategyId 
        ? { ...s, is_active: newActiveStatus }
        : s
    ));

    // Persist to database
    const updateStrategyStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No valid session found. Please log in again.');
        }

        console.log(`📡 Sending ${newActiveStatus ? 'START' : 'PAUSE'} request to backend...`);
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/strategies/${strategyId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ is_active: newActiveStatus }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Failed to ${newActiveStatus ? 'start' : 'pause'} strategy:`, errorText);
          // Revert local state on error
          setStrategies(prev => prev.map(s => 
            s.id === strategyId 
              ? { ...s, is_active: !newActiveStatus }
              : s
          ));
          alert(`Failed to ${newActiveStatus ? 'start' : 'pause'} strategy.`);
        } else {
          const updatedStrategy = await response.json();
          console.log(`✅ Strategy ${newActiveStatus ? 'started' : 'paused'} successfully:`, updatedStrategy);
          
          if (newActiveStatus) {
            alert(`🚀 Strategy "${strategy.name}" is now ACTIVE and will execute automatically based on market conditions.`);
          } else {
            alert(`⏸️ Strategy "${strategy.name}" has been PAUSED and will no longer execute trades.`);
          }
        }
      } catch (error) {
        console.error('Unexpected error updating strategy:', error);
        // Revert local state on error
        setStrategies(prev => prev.map(s => 
          s.id === strategyId 
            ? { ...s, is_active: !newActiveStatus }
            : s
        ));
        alert('An unexpected error occurred while updating the strategy');
      }
    };
    
    updateStrategyStatus();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleExecuteStrategy = async () => {
    // Refresh strategies after execution
    setTimeout(() => {
      window.location.reload();
    }, 2000);
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

    console.log('Creating strategy with data:', strategyData);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      // Prepare the strategy data for the backend API
      const strategyPayload = {
        name: strategyData.name,
        type: strategyData.type,
        description: strategyData.description || '',
        risk_level: strategyData.risk_level,
        min_capital: strategyData.min_capital,
        is_active: strategyData.is_active || false,
        
        // Universal bot fields
        account_id: strategyData.account_id || null,
        asset_class: strategyData.asset_class || 'equity',
        base_symbol: strategyData.base_symbol || null,
        quote_currency: strategyData.quote_currency || 'USD',
        time_horizon: strategyData.time_horizon || 'swing',
        automation_level: strategyData.automation_level || 'fully_auto',
        
        // JSONB fields
        capital_allocation: strategyData.capital_allocation || {},
        position_sizing: strategyData.position_sizing || {},
        trade_window: strategyData.trade_window || {},
        order_execution: strategyData.order_execution || {},
        risk_controls: strategyData.risk_controls || {},
        data_filters: strategyData.data_filters || {},
        notifications: strategyData.notifications || {},
        backtest_mode: strategyData.backtest_mode || 'paper',
        backtest_params: strategyData.backtest_params || {},
        telemetry_id: strategyData.telemetry_id || null,
        
        // Strategy-specific configuration
        configuration: strategyData.configuration || {},
        performance: strategyData.performance || null,
      };

      console.log('Sending strategy payload to API:', strategyPayload);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/strategies/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(strategyPayload),
      });

      console.log('API Response Status:', response.status);
      console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to create strategy: ${response.status} ${errorText}`);
      }

      const newStrategy = await response.json();
      console.log('Strategy created successfully:', newStrategy);
      
      setStrategies(prev => [...prev, newStrategy]);
      setShowCreateModal(false);
      alert('Strategy created successfully!');
      return newStrategy;
    } catch (error) {
      console.error('Error creating strategy:', error);
      alert(`Failed to create strategy: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    if (!user) {
      console.error('No user found');
      alert('You must be logged in to delete strategies');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/strategies/${strategyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete strategy: ${response.status} ${errorText}`);
      }

      setStrategies(prev => prev.filter(strategy => strategy.id !== strategyId));
      setShowDetailsModal(false);
      alert('Strategy deleted successfully!');
    } catch (error) {
      console.error('Unexpected error deleting strategy:', error);
      alert('An unexpected error occurred while deleting the strategy');
    }
  };
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

      {/* Categorized Strategies */}
      <div className="space-y-8">
        {Object.entries(categorizedStrategies).map(([categoryName, categoryData]) => {
          const Icon = categoryData.icon;
          const isExpanded = expandedCategories[categoryName];
          
          return (
            <motion.div
              key={categoryName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Category Header */}
              <Card className={`p-6 ${categoryData.bgColor} ${categoryData.borderColor} border`}>
                <button
                  onClick={() => toggleCategory(categoryName)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${categoryData.bgColor} rounded-xl flex items-center justify-center border ${categoryData.borderColor}`}>
                      <Icon className={`w-6 h-6 ${categoryData.color}`} />
                    </div>
                    <div className="text-left">
                      <h3 className={`text-xl font-bold ${categoryData.color}`}>{categoryName}</h3>
                      <p className="text-gray-300 text-sm">{categoryData.description}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {categoryData.strategies.length} strateg{categoryData.strategies.length === 1 ? 'y' : 'ies'} • {categoryData.strategies.filter((s: TradingStrategy) => s.is_active).length} active
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryData.bgColor} ${categoryData.color} border ${categoryData.borderColor}`}>
                      {categoryData.strategies.length}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
              </Card>

              {/* Category Strategies */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {categoryData.strategies.map((strategy: TradingStrategy, index: number) => (
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
                        onExecute={handleExecuteStrategy}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {Object.keys(categorizedStrategies).length === 0 && (
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
            // Optimistically update local state
            setStrategies(prev => prev.map(s => 
              s.id === updatedStrategy.id ? updatedStrategy : s
            ));
            
            const updateStrategyInDB = async () => {
              if (!user) return;
              
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                  throw new Error('No valid session found. Please log in again.');
                }

                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/strategies/${updatedStrategy.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify(updatedStrategy),
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`Failed to save strategy changes: ${response.status} ${errorText}`);
                } else {
                  console.log('Strategy updated successfully in database');
                }
              } catch (error) {
                console.error('Unexpected error updating strategy:', error);
                alert('An unexpected error occurred while saving the strategy');
              }
            };
            
            updateStrategyInDB();
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
          onSave={(updatedStrategy) => {
            // Optimistically update local state
            setStrategies(prev => prev.map(s => 
              s.id === updatedStrategy.id ? updatedStrategy : s
            ));
            
            const updateStrategyInDB = async () => {
              if (!user) return;
              
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                  throw new Error('No valid session found. Please log in again.');
                }

                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/strategies/${updatedStrategy.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify(updatedStrategy),
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`Failed to save strategy changes after backtest: ${response.status} ${errorText}`);
                } else {
                  console.log('Strategy updated successfully after backtest');
                }
              } catch (error) {
                console.error('Unexpected error updating strategy after backtest:', error);
                alert('An unexpected error occurred while saving the strategy');
              }
            };            
            updateStrategyInDB();
            setShowBacktestModal(false);
          }}
        />
      )}
        </>
      )}
    </motion.div>
  );
}