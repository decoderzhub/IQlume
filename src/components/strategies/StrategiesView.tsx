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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No valid session found. Please log in again.');
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/strategies`, {
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
          console.error('API response is not an array:', data);
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
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy || !user) return;

    const newActiveStatus = !strategy.is_active;
    
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
          console.error('Error updating strategy active status:', errorText);
          // Revert local state on error
          setStrategies(prev => prev.map(s => 
            s.id === strategyId 
              ? { ...s, is_active: !newActiveStatus }
              : s
          ));
          alert(`Failed to ${newActiveStatus ? 'start' : 'pause'} strategy.`);
        } else {
          console.log(`Strategy ${newActiveStatus ? 'started' : 'paused'} successfully`);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/strategies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(strategyData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create strategy: ${response.status} ${errorText}`);
      }

      const newStrategy = await response.json();
      
      setStrategies(prev => [...prev, newStrategy]);
      setShowCreateModal(false);
      alert('Strategy created successfully!');
    } catch (error) {
      console.error('Error creating strategy:', error);
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