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
  Shield,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { cn } from '../../lib/utils';
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
  const [currentPrice, setCurrentPrice] = React.useState<number | null>(null);
  const [priceHistory, setPriceHistory] = React.useState<Array<{ time: number; price: number }>>([]);
  const [loading, setLoading] = React.useState(false);
  
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

  // Get trading symbol from configuration
  const tradingSymbol = strategy.configuration?.symbol || strategy.base_symbol || 'N/A';
  
  // Get grid configuration for grid strategies
  const isGridStrategy = ['spot_grid', 'futures_grid', 'infinity_grid'].includes(strategy.type);
  const gridConfig = isGridStrategy ? {
    lower: strategy.configuration?.price_range_lower || 0,
    upper: strategy.configuration?.price_range_upper || 0,
    grids: strategy.configuration?.number_of_grids || 0,
  } : null;

  // Fetch real-time price data for active strategies
  React.useEffect(() => {
    if (!strategy.is_active || !tradingSymbol || tradingSymbol === 'N/A' || !user) return;
    
    const fetchPriceData = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) return;

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/market-data/live-prices?symbols=${tradingSymbol}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📊 Market data response:', data);
          const symbolData = data[tradingSymbol.toUpperCase()];
          console.log('📈 Symbol data for', tradingSymbol, ':', symbolData);
          if (symbolData && typeof symbolData.price === 'number' && symbolData.price > 0) {
            setCurrentPrice(symbolData.price);
            
            // Add to price history
            const now = Date.now();
            setPriceHistory(prev => {
              const newHistory = [...prev, { time: now, price: symbolData.price }];
              // Keep only last 20 points
              return newHistory.slice(-20);
            });
          } else if (symbolData && (symbolData.bid_price || symbolData.ask_price)) {
            // Fallback to bid/ask if price is not available
            const fallbackPrice = symbolData.ask_price || symbolData.bid_price || 0;
            if (fallbackPrice > 0) {
              setCurrentPrice(fallbackPrice);
              const now = Date.now();
              setPriceHistory(prev => {
                const newHistory = [...prev, { time: now, price: fallbackPrice }];
                return newHistory.slice(-20);
              });
            }
          } else {
            console.error('❌ No price data for symbol:', tradingSymbol, 'in response:', data);
            // For demo purposes, set realistic prices
            if (tradingSymbol.toUpperCase() === 'BTC') {
              setCurrentPrice(52000 + Math.random() * 8000); // $52K-$60K range
            } else if (tradingSymbol.toUpperCase() === 'AAPL') {
              setCurrentPrice(240 + Math.random() * 20); // $240-$260 range
            }
          }
        } else {
          console.error('❌ Failed to fetch market data:', response.status, await response.text());
          // Set fallback prices for demo
          if (tradingSymbol.toUpperCase() === 'BTC') {
            setCurrentPrice(52000 + Math.random() * 8000);
          } else if (tradingSymbol.toUpperCase() === 'AAPL') {
            setCurrentPrice(240 + Math.random() * 20);
          }
        }
      } catch (error) {
        console.error('Error fetching price data:', error);
        // Set fallback prices for demo
        if (tradingSymbol.toUpperCase() === 'BTC') {
          setCurrentPrice(52000 + Math.random() * 8000);
        } else if (tradingSymbol.toUpperCase() === 'AAPL') {
          setCurrentPrice(240 + Math.random() * 20);
        }
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchPriceData();
    
    // Update every 30 seconds for active strategies
    const interval = setInterval(fetchPriceData, 30000);
    return () => clearInterval(interval);
  }, [strategy.is_active, tradingSymbol, user]);

  // Determine price position relative to grid
  const getPricePosition = () => {
    if (!gridConfig || !currentPrice || !gridConfig.lower || !gridConfig.upper) return null;
    
    if (currentPrice < gridConfig.lower) return 'below';
    if (currentPrice > gridConfig.upper) return 'above';
    return 'within';
  };

  const pricePosition = getPricePosition();
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
      
      // Show detailed execution result
      const executionResult = result.result;
      let message = `Strategy executed: ${result.message}`;
      
      if (executionResult) {
        // Ensure price is properly formatted
        const priceDisplay = executionResult.price ? `$${Number(executionResult.price).toFixed(2)}` : 'N/A';
        
        if (executionResult.action === 'buy') {
          message += `\n\n🟢 BUY ORDER PLACED:\n• Symbol: ${executionResult.symbol}\n• Quantity: ${executionResult.quantity}\n• Price: ${priceDisplay}\n• Order ID: ${executionResult.order_id}\n• Reason: ${executionResult.reason}`;
        } else if (executionResult.action === 'sell') {
          message += `\n\n🔴 SELL ORDER PLACED:\n• Symbol: ${executionResult.symbol}\n• Quantity: ${executionResult.quantity}\n• Price: ${priceDisplay}\n• Order ID: ${executionResult.order_id}\n• Reason: ${executionResult.reason}`;
        } else if (executionResult.action === 'hold') {
          message += `\n\n⏸️ HOLDING POSITION:\n• Current Price: ${priceDisplay}\n• Reason: ${executionResult.reason}`;
        } else if (executionResult.action === 'error') {
          message += `\n\n❌ EXECUTION ERROR:\n• Reason: ${executionResult.reason}`;
        }
      }
      
      alert(message);
      
      // Force refresh of strategy data and trades
      if (onExecute) {
        await onExecute();
      }
      
      // Also trigger a page refresh to update trade counts
      window.location.reload();
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
          
          {/* Trading Symbol and Current Price */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Trading:</span>
              <span className="font-bold text-blue-400 text-lg">{tradingSymbol}</span>
            </div>
            {currentPrice && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-400">@</span>
                <span className="font-semibold text-white">{formatCurrency(currentPrice)}</span>
                {loading && <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />}
              </div>
            )}
          </div>
          
          {/* Grid Configuration Display */}
          {isGridStrategy && gridConfig && gridConfig.lower && gridConfig.upper && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-400">Grid Range:</span>
                <span className="text-white">{gridConfig.grids} levels</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <ArrowDown className="w-3 h-3 text-green-400" />
                  <span className="text-green-400 font-medium">{formatCurrency(gridConfig.lower)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 text-red-400" />
                  <span className="text-red-400 font-medium">{formatCurrency(gridConfig.upper)}</span>
                </div>
              </div>
              
              {/* Price Position Indicator */}
              {currentPrice && pricePosition && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-400">Position:</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    pricePosition === 'below' ? 'bg-green-500/20 text-green-400' :
                    pricePosition === 'above' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {pricePosition === 'below' ? 'Buy Zone' : 
                     pricePosition === 'above' ? 'Sell Zone' : 
                     'In Range'}
                  </span>
                </div>
              )}
            </div>
          )}
          
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

      {/* Real-time Price Chart for Active Strategies */}
      {strategy.is_active && priceHistory.length > 5 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Price Movement</span>
            <span className="text-xs text-gray-500">Last 10 updates</span>
          </div>
          <div className="h-24 bg-gray-800/30 rounded-lg p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceHistory}>
                <defs>
                  <linearGradient id={`gradient-${strategy.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill={`url(#gradient-${strategy.id})`}
                  dot={false}
                />
                {/* Grid level lines for grid strategies */}
                {isGridStrategy && gridConfig && gridConfig.lower && gridConfig.upper && (
                  <>
                    {/* Lower bound line */}
                    <defs>
                      <pattern id={`lowerLine-${strategy.id}`} patternUnits="userSpaceOnUse" width="4" height="4">
                        <path d="M 0,4 l 4,0" stroke="#10b981" strokeWidth="1" strokeDasharray="2,2"/>
                      </pattern>
                      <pattern id={`upperLine-${strategy.id}`} patternUnits="userSpaceOnUse" width="4" height="4">
                        <path d="M 0,4 l 4,0" stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2"/>
                      </pattern>
                    </defs>
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Grid level indicators */}
          {isGridStrategy && gridConfig && gridConfig.lower && gridConfig.upper && (
            <div className="flex items-center justify-between text-xs mt-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-0.5 bg-green-400"></div>
                <span className="text-green-400">Buy: {formatCurrency(gridConfig.lower)}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-0.5 bg-red-400"></div>
                <span className="text-red-400">Sell: {formatCurrency(gridConfig.upper)}</span>
              </div>
            </div>
          )}
        </div>
      )}
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