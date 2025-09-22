import React from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Settings, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Target,
  Shield
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency, formatPercent, cn } from '../../lib/utils';
import { INITIAL_LAUNCH_STRATEGY_TYPES, STRATEGY_TIERS, SubscriptionTier } from '../../lib/constants';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';

interface StrategyCardProps {
  strategy: TradingStrategy;
  onToggle: () => Promise<void>;
  onViewDetails: () => void;
  onBacktest: () => void;
  onExecute?: () => Promise<void>;
}

export function StrategyCard({ strategy, onToggle, onViewDetails, onBacktest, onExecute }: StrategyCardProps) {
  const { user, getEffectiveSubscriptionTier } = useStore();
  const [isExecuting, setIsExecuting] = React.useState(false);
  
  // Check if strategy is implemented
  const isImplemented = INITIAL_LAUNCH_STRATEGY_TYPES.includes(strategy.type as any);
  
  // Check if user has access to this strategy tier
  const requiredTier = STRATEGY_TIERS[strategy.type as keyof typeof STRATEGY_TIERS] as SubscriptionTier;
  const userTier = getEffectiveSubscriptionTier();
  
  const tierOrder = { starter: 0, pro: 1, elite: 2 };
  const hasAccess = tierOrder[userTier] >= tierOrder[requiredTier];
  
  // Determine card state
  const isComingSoon = !isImplemented;
  const needsUpgrade = isImplemented && !hasAccess;
  const isAvailable = isImplemented && hasAccess;

  const handleExecuteStrategy = async () => {
    if (!user || !strategy.is_active) return;
    
    setIsExecuting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/strategies/${strategy.id}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to execute strategy: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      alert(`Strategy executed: ${result.message}`);
      
      if (onExecute) {
        await onExecute();
      }
    } catch (error) {
      console.error('Error executing strategy:', error);
      alert(`Failed to execute strategy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getStrategyTypeLabel = (type: string) => {
    switch (type) {
      case 'long_call': return 'Long Call';
      case 'long_straddle': return 'Long Straddle';
      case 'long_condor': return 'Long Condor';
      case 'iron_butterfly': return 'Iron Butterfly';
      case 'short_call': return 'Short Call';
      case 'short_straddle': return 'Short Straddle';
      case 'long_butterfly': return 'Long Butterfly';
      case 'short_put': return 'Short Put';
      case 'short_strangle': return 'Short Strangle';
      case 'short_put_vertical': return 'Short Put Vertical';
      case 'short_call_vertical': return 'Short Call Vertical';
      case 'broken_wing_butterfly': return 'Broken-Wing Butterfly';
      case 'option_collar': return 'Option Collar';
      case 'mean_reversion': return 'Mean Reversion';
      case 'momentum_breakout': return 'Momentum Breakout';
      case 'pairs_trading': return 'Pairs Trading';
      case 'scalping': return 'Scalping';
      case 'swing_trading': return 'Swing Trading';
      case 'arbitrage': return 'Arbitrage';
      case 'news_based_trading': return 'News-Based Trading';
      case 'long_strangle': return 'Long Strangle';
      case 'covered_calls': return 'Covered Calls';
      case 'spot_grid': return 'Spot Grid Bot';
      case 'futures_grid': return 'Futures Grid Bot';
      case 'infinity_grid': return 'Infinity Grid Bot';
      case 'dca': return 'DCA Bot';
      case 'smart_rebalance': return 'Smart Rebalance';
      case 'wheel': return 'The Wheel';
      case 'orb': return 'ORB Strategy';
      default: return type;
    }
  };

  const performance = strategy.performance;
  const isPositiveReturn = (performance?.total_return || 0) >= 0;

  const getUpgradeText = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'pro': return 'Upgrade to Pro';
      case 'elite': return 'Upgrade to Elite';
      default: return 'Upgrade Required';
    }
  };
  return (
    <Card hoverable className={cn("p-6 h-full relative", (isComingSoon || needsUpgrade) && "opacity-75")}>
      {isComingSoon && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70 z-10 rounded-xl">
          <span className="text-white text-xl font-bold bg-blue-600 px-4 py-2 rounded-lg shadow-lg">
            Coming Soon
          </span>
        </div>
      )}
      
      {needsUpgrade && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70 z-10 rounded-xl">
          <div className="text-center">
            <span className="text-white text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 rounded-lg shadow-lg block mb-2">
              {getUpgradeText(requiredTier)}
            </span>
            <span className="text-sm text-gray-300 capitalize">{requiredTier} Plan Required</span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-white text-lg">{strategy.name}</h3>
            <div className={`w-3 h-3 rounded-full ${strategy.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
          </div>
          <p className="text-sm text-gray-400 mb-3">{strategy.description}</p>
          
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(strategy.risk_level)}`}>
              {strategy.risk_level} risk
            </span>
            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-400/10 text-blue-400 border border-blue-400/20">
              {getStrategyTypeLabel(strategy.type)}
            </span>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {performance && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              {isPositiveReturn ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className="text-xs text-gray-400">Total Return</span>
            </div>
            <p className={`font-semibold ${isPositiveReturn ? 'text-green-400' : 'text-red-400'}`}>
              {formatPercent(performance.total_return)}
            </p>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Win Rate</span>
            </div>
            <p className="font-semibold text-blue-400">
              {formatPercent(performance.win_rate)}
            </p>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">Max Drawdown</span>
            </div>
            <p className="font-semibold text-purple-400">
              {formatPercent(performance.max_drawdown)}
            </p>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400">Trades</span>
            </div>
            <p className="font-semibold text-yellow-400">
              {performance.total_trades || 0}
            </p>
          </div>
        </div>
      )}

      {/* Capital Requirements */}
      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-1">Minimum Capital</p>
        <p className="font-semibold text-white">{formatCurrency(strategy.min_capital)}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant={strategy.is_active ? 'secondary' : 'primary'}
          size="sm"
          onClick={onToggle}
          disabled={isComingSoon || needsUpgrade}
          className="flex-1"
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

        {strategy.is_active && isAvailable && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExecuteStrategy}
            disabled={isExecuting}
            title="Execute one iteration of this strategy"
          >
            {isExecuting ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          disabled={isComingSoon || needsUpgrade}
          onClick={onViewDetails}
        >
          <Settings className="w-4 h-4" />
        </Button>

        <Button
          disabled={isComingSoon || needsUpgrade}
          variant="ghost"
          size="sm"
          onClick={onBacktest}
        >
          <BarChart3 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}