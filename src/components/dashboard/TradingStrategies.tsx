import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Settings, TrendingUp, Plus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';

export function TradingStrategies() {
  const { user, setActiveView } = useStore();
  const [strategies, setStrategies] = React.useState<TradingStrategy[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStrategies = async () => {
      if (!user) return;
      
      try {
        console.log('📊 Fetching active strategies for dashboard from Supabase...');

        const { data, error } = await supabase
          .from('trading_strategies')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) {
          console.error('❌ Error loading strategies for dashboard:', error);
          setStrategies([]);
          return;
        }

        console.log('✅ Strategies loaded for dashboard:', data?.length || 0);
        setStrategies(data || []);
      } catch (error) {
        console.error('Unexpected error loading strategies:', error);
        setStrategies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
    
    // Refresh strategies every 60 seconds to pick up performance updates
    const interval = setInterval(fetchStrategies, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const getRiskColor = (level: TradingStrategy['risk_level']) => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'high': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Active Strategies</h3>
        <Button size="sm" onClick={() => setActiveView('strategies')}>
          <TrendingUp className="w-4 h-4 mr-2" />
          View All
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading strategies...</span>
          </div>
        </div>
      ) : strategies.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No active strategies found</p>
        </div>
      ) : (
      <div className="space-y-4">
        {strategies.map((strategy, index) => (
          <motion.div
            key={strategy.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-white">
                  {strategy.name}
                  {(strategy.base_symbol || strategy.configuration?.symbol) && (
                    <span className="ml-2 text-blue-400">
                      ({strategy.base_symbol || strategy.configuration?.symbol})
                    </span>
                  )}
                </h4>
                <p className="text-sm text-gray-400">{strategy.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(strategy.risk_level)}`}>
                  {strategy.risk_level} risk
                </span>
                <div className={`w-2 h-2 rounded-full ${strategy.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Min Capital: {formatCurrency(strategy.min_capital)}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant={strategy.is_active ? 'secondary' : 'primary'}
                  size="sm"
                >
                  {strategy.is_active ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      )}
    </Card>
  );
}