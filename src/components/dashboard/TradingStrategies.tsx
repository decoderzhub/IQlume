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
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">Active Strategies</h3>
        <Button size="sm" onClick={() => setActiveView('strategies')} className="h-7 text-xs">
          <TrendingUp className="w-3 h-3 mr-1.5" />
          View All
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      ) : strategies.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <p className="text-sm">No active strategies</p>
        </div>
      ) : (
      <div className="space-y-2.5">
        {strategies.map((strategy, index) => (
          <motion.div
            key={strategy.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-white text-sm truncate">
                    {strategy.name}
                  </h4>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${strategy.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-mono">ID: {strategy.id?.slice(0, 8)}</span>
                  {(strategy.base_symbol || strategy.configuration?.symbol) && (
                    <span className="text-xs text-blue-400 font-medium">
                      {strategy.base_symbol || strategy.configuration?.symbol}
                    </span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getRiskColor(strategy.risk_level)}`}>
                    {strategy.risk_level}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">
                {formatCurrency(strategy.min_capital)}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white h-7 px-2"
                  onClick={() => setActiveView('strategies')}
                >
                  <Settings className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={strategy.is_active ? 'secondary' : 'primary'}
                  size="sm"
                  className="h-7"
                >
                  {strategy.is_active ? (
                    <>
                      <Pause className="w-3 h-3 mr-1.5" />
                      <span className="text-xs">Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-1.5" />
                      <span className="text-xs">Start</span>
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