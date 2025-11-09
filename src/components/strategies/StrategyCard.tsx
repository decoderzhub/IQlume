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
  Minus,
  Stethoscope
} from 'lucide-react';
import { CandlestickData, Time } from 'lightweight-charts';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { INITIAL_LAUNCH_STRATEGY_TYPES, STRATEGY_TIERS, SubscriptionTier } from '../../lib/constants';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { StrategyCandlestickChart } from '../charts/StrategyCandlestickChart';

interface StrategyCardProps {
  strategy: TradingStrategy;
  onToggle: () => Promise<void>;
  onViewDetails: () => void;
  onBacktest: () => void;
  onExecute?: () => Promise<void>;
  onDiagnose?: () => void;
}

export function StrategyCard({ strategy, onToggle, onViewDetails, onBacktest, onExecute, onDiagnose }: StrategyCardProps) {
  const { user, getEffectiveSubscriptionTier } = useStore();
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [currentPrice, setCurrentPrice] = React.useState<number | null>(null);
  const [candleData, setCandleData] = React.useState<CandlestickData<Time>[]>([]);
  const [strategyTrades, setStrategyTrades] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [chartLoading, setChartLoading] = React.useState(false);
  const [telemetryData, setTelemetryData] = React.useState<any>(null);
  
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

  // Helper function to determine if symbol is cryptocurrency
  const isCryptoSymbol = (symbol: string): boolean => {
    if (!symbol || symbol === 'N/A') return false;
    const s = symbol.toUpperCase();
    // Crypto symbols typically have "/" (e.g., BTC/USD) or are common crypto bases
    if (s.includes('/')) return true;
    const cryptoBases = ['BTC', 'ETH', 'LTC', 'BCH', 'LINK', 'UNI', 'AAVE', 'DOT', 'ADA', 'SOL', 'MATIC', 'AVAX'];
    return cryptoBases.some(base => s.includes(base));
  };

  const isCrypto = isCryptoSymbol(tradingSymbol);

  // Get grid configuration for grid strategies
  const isGridStrategy = ['spot_grid', 'futures_grid', 'infinity_grid'].includes(strategy.type);
  const gridConfig = isGridStrategy ? {
    lower: strategy.configuration?.price_range_lower || 0,
    upper: strategy.configuration?.price_range_upper || 0,
    grids: strategy.configuration?.number_of_grids || 0,
    mode: strategy.grid_mode || 'arithmetic',
    stopLoss: strategy.stop_loss_percent || 0,
    takeProfitLevels: strategy.take_profit_levels || [],
  } : null;

  // Debug candleData changes
  React.useEffect(() => {
    console.log(`🔍 [StrategyCard] CandleData changed for ${tradingSymbol}:`, candleData.length, 'bars');
  }, [candleData, tradingSymbol]);

  // Fetch historical candlestick data and trades for all strategies (both active and inactive)
  React.useEffect(() => {
    if (!tradingSymbol || tradingSymbol === 'N/A' || !user) {
      console.log(`⏭️ [StrategyCard] Skipping fetch - tradingSymbol: ${tradingSymbol}, user: ${!!user}`);
      return;
    }

    const fetchChartData = async () => {
      try {
        setChartLoading(true);
        console.log(`📈 [StrategyCard] Fetching candlestick data for ${tradingSymbol}...`);
        console.log(`📈 [StrategyCard] Strategy ID: ${strategy.id}, Type: ${strategy.type}`);
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          console.error('❌ [StrategyCard] No session token available');
          setChartLoading(false);
          return;
        }

        // Fetch historical bars (last 30 days, daily timeframe to show full trading days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        // Format dates as YYYY-MM-DD (backend expects date-only format)
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/market-data/${tradingSymbol}/historical?timeframe=1Day&start=${startStr}&end=${endStr}&limit=100`;
        console.log('📊 [StrategyCard] Fetching from:', apiUrl);

        const historicalResponse = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        console.log(`📊 [StrategyCard] Response status: ${historicalResponse.status}`);

        if (historicalResponse.ok) {
          const historicalData = await historicalResponse.json();
          console.log(`📊 [StrategyCard] Received historical data:`, historicalData);

          // The /{symbol}/historical endpoint returns a direct array of bars
          const bars = Array.isArray(historicalData) ? historicalData : [];
          console.log(`📊 [StrategyCard] Number of bars: ${bars.length}`);

          if (bars && bars.length > 0) {
            // Convert to lightweight-charts format (use date string for daily bars)
            const formattedData: CandlestickData<Time>[] = bars.map((bar: any) => {
              const timestamp = new Date(bar.timestamp).getTime() / 1000;
              return {
                time: timestamp as Time,
                open: parseFloat(bar.open),
                high: parseFloat(bar.high),
                low: parseFloat(bar.low),
                close: parseFloat(bar.close),
              };
            });

            console.log('📊 [StrategyCard] Formatted candle data (first 3):', formattedData.slice(0, 3));
            console.log('📊 [StrategyCard] Setting candleData state with', formattedData.length, 'bars');
            setCandleData(formattedData);

            // Set current price from latest bar
            const latestBar = bars[bars.length - 1];
            setCurrentPrice(latestBar.close);
            console.log(`📊 [StrategyCard] Current price from latest bar: $${latestBar.close}`);
          } else {
            console.warn('⚠️ [StrategyCard] No bars in historical data - chart will show empty state');
            setCandleData([]);
          }
        } else {
          const errorText = await historicalResponse.text();
          console.error(`❌ [StrategyCard] Failed to fetch historical data: ${historicalResponse.status}`, errorText);
          setCandleData([]);
        }

        // Fetch strategy trades
        const tradesUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/trades?strategy_id=${strategy.id}`;
        console.log('Fetching trades from:', tradesUrl);

        const tradesResponse = await fetch(tradesUrl, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (tradesResponse.ok) {
          const tradesData = await tradesResponse.json();
          console.log(`📈 Received trades response for strategy:`, tradesData);

          // Backend returns {trades: [], stats: {}} - extract the trades array
          const tradesArray = Array.isArray(tradesData) ? tradesData : (tradesData.trades || []);
          console.log(`📈 Extracted ${tradesArray.length} trades from response`);
          setStrategyTrades(tradesArray);
        } else {
          const errorText = await tradesResponse.text();
          console.error(`Failed to fetch trades: ${tradesResponse.status}`, errorText);
        }

        // Extract telemetry data from strategy if available
        if (strategy.telemetry_data) {
          setTelemetryData(strategy.telemetry_data);
        }
      } catch (error) {
        console.error(`❌ [StrategyCard] Error fetching chart data for ${tradingSymbol}:`, error);
        setCandleData([]);
      } finally {
        console.log(`📊 [StrategyCard] Finished loading chart data for ${tradingSymbol}`);
        setChartLoading(false);
      }
    };

    // Initial fetch
    fetchChartData();

    // Update interval based on asset type:
    // - Cryptocurrency: 30 seconds (markets are 24/7, more volatile)
    // - Stocks: 60 seconds (markets have limited hours)
    const updateInterval = isCrypto ? 30000 : 60000; // 30s for crypto, 60s for stocks

    console.log(`📊 [StrategyCard] Setting up ${isCrypto ? 'crypto (30s)' : 'stock (60s)'} update interval for ${tradingSymbol}`);

    const interval = setInterval(fetchChartData, updateInterval);
    return () => clearInterval(interval);
  }, [strategy.id, tradingSymbol, user, isCrypto]);

  // Determine price position relative to grid
  const getPricePosition = () => {
    if (!gridConfig || !currentPrice || !gridConfig.lower || !gridConfig.upper || gridConfig.lower <= 0 || gridConfig.upper <= 0) return null;
    
    if (currentPrice < gridConfig.lower) return 'below';
    if (currentPrice > gridConfig.upper) return 'above';
    return 'within';
  };

  const pricePosition = getPricePosition();
  const handleExecuteStrategy = async () => {
    if (!user || !strategy.is_active) return;
    
    setIsExecuting(true);
    try {
      console.log(`🤖 Executing strategy: ${strategy.name} (${strategy.type})`);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/strategies/${strategy.id}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Strategy execution failed:', errorText);
        throw new Error(`Failed to execute strategy: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Strategy execution result:', result);
      
      // Show detailed execution result
      const executionResult = result.result;
      let message = `✅ Strategy executed: ${result.message}`;
      
      if (executionResult) {
        // Format price properly and handle undefined
        const price = executionResult.price || 0;
        const priceDisplay = typeof price === 'number' && price > 0 ? `$${price.toFixed(2)}` : 'Price unavailable';
        
        if (executionResult.action === 'buy') {
          message += `\n\n🟢 BUY ORDER PLACED:\n• Symbol: ${executionResult.symbol}\n• Quantity: ${executionResult.quantity}\n• Price: ${priceDisplay}`;
          if (executionResult.order_id) {
            message += `\n• Order ID: ${executionResult.order_id}`;
          }
          message += `\n• Reason: ${executionResult.reason}`;
        } else if (executionResult.action === 'sell') {
          message += `\n\n🔴 SELL ORDER PLACED:\n• Symbol: ${executionResult.symbol}\n• Quantity: ${executionResult.quantity}\n• Price: ${priceDisplay}`;
          if (executionResult.order_id) {
            message += `\n• Order ID: ${executionResult.order_id}`;
          }
          message += `\n• Reason: ${executionResult.reason}`;
        } else if (executionResult.action === 'hold') {
          message += `\n\n⏸️ HOLDING POSITION:\n• Current Price: ${priceDisplay}\n• Reason: ${executionResult.reason}`;
        } else if (executionResult.action === 'error') {
          message += `\n\n❌ EXECUTION ERROR:\n• Reason: ${executionResult.reason}`;
        }
      }
      
      alert(message);
      
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
    <Card hoverable className={cn("p-4 h-full relative", (isComingSoon || needsUpgrade) && "opacity-75")}>
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

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-base">{strategy.name}</h3>
              <div className={`w-2.5 h-2.5 rounded-full ${strategy.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
            </div>
            <span className="text-sm text-white font-mono">
              {strategy.id ? `ID: ${strategy.id.slice(0, 8)}` : 'ID: N/A'}
            </span>
          </div>
          
          {/* Trading Symbol and Current Price */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500">{tradingSymbol}</span>
            {currentPrice && (
              <>
                <span className="text-xs text-gray-600">•</span>
                <span className="font-medium text-white text-sm">{formatCurrency(currentPrice)}</span>
                {loading && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />}
              </>
            )}
          </div>
          
          {/* Grid Configuration Display */}
          {isGridStrategy && gridConfig && gridConfig.lower && gridConfig.upper && (
            <div className="mb-3">
              {/* Enhanced Grid Info */}
              <div className="bg-gray-800/30 rounded-lg p-2 mb-2">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-400">Grid Mode:</span>
                  <span className="text-white capitalize">{gridConfig.mode}</span>
                </div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-400">Active Levels:</span>
                  <span className="text-green-400 font-medium">
                    {telemetryData?.active_grid_levels || gridConfig.grids}
                  </span>
                </div>
                {telemetryData?.grid_utilization_percent !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Utilization:</span>
                    <span className="text-blue-400 font-medium">
                      {telemetryData.grid_utilization_percent.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              
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
              
              {/* Stop Loss & Take Profit Indicators */}
              {(gridConfig.stopLoss > 0 || gridConfig.takeProfitLevels.length > 0) && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  {gridConfig.stopLoss > 0 && telemetryData?.stop_loss_price && (
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-red-400">Stop Loss:</span>
                      <div className="text-right">
                        <span className="text-red-400 font-medium">{formatCurrency(telemetryData.stop_loss_price)}</span>
                        {telemetryData.stop_loss_distance_percent !== undefined && (
                          <span className="text-gray-400 ml-2">
                            ({telemetryData.stop_loss_distance_percent.toFixed(1)}% away)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {gridConfig.takeProfitLevels.length > 0 && telemetryData?.next_take_profit_price && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-400">Next TP:</span>
                      <div className="text-right">
                        <span className="text-green-400 font-medium">{formatCurrency(telemetryData.next_take_profit_price)}</span>
                        {telemetryData.take_profit_progress_percent !== undefined && (
                          <span className="text-gray-400 ml-2">
                            ({telemetryData.take_profit_progress_percent.toFixed(1)}% progress)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
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
          
          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{strategy.description}</p>

          <div className="flex items-center gap-1.5 mb-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getRiskColor(strategy.risk_level)}`}>
              {strategy.risk_level}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-400/10 text-blue-400 border border-blue-400/20">
              {getStrategyTypeLabel(strategy.type)}
            </span>
          </div>
        </div>
      </div>

      {/* Candlestick Chart for All Strategies */}
      {tradingSymbol && tradingSymbol !== 'N/A' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Price Chart (30 Days)</span>
            <span className="text-[10px] text-gray-500">{tradingSymbol}</span>
          </div>

          <StrategyCandlestickChart
            symbol={tradingSymbol}
            candleData={candleData}
            trades={strategyTrades}
            gridLevels={isGridStrategy && gridConfig ? {
              lower: gridConfig.lower,
              upper: gridConfig.upper,
            } : undefined}
            loading={chartLoading}
          />

          {/* Grid level indicators */}
          {isGridStrategy && gridConfig && gridConfig.lower && gridConfig.upper && (
            <div className="space-y-1 mt-3">
              <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-0.5 bg-green-400"></div>
                <span className="text-green-400">Buy: {formatCurrency(gridConfig.lower)}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-0.5 bg-red-400"></div>
                <span className="text-red-400">Sell: {formatCurrency(gridConfig.upper)}</span>
              </div>
            </div>
              
              {/* Stop Loss & Take Profit Indicators */}
              {(telemetryData?.stop_loss_price || telemetryData?.next_take_profit_price) && (
                <div className="flex items-center justify-between text-xs">
                  {telemetryData?.stop_loss_price && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-0.5 bg-red-600"></div>
                      <span className="text-red-400">SL: {formatCurrency(telemetryData.stop_loss_price)}</span>
                    </div>
                  )}
                  {telemetryData?.next_take_profit_price && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-0.5 bg-green-600"></div>
                      <span className="text-green-400">TP: {formatCurrency(telemetryData.next_take_profit_price)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Performance Metrics */}
      {performance && typeof performance === 'object' && (
        <div className="space-y-3 mb-4">
          {/* Real-time Telemetry for Active Strategies */}
          {strategy.is_active && telemetryData && typeof telemetryData === 'object' && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
              <h5 className="text-[10px] font-medium text-blue-400 mb-1.5 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Live Telemetry
              </h5>
              
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-gray-400">P&L:</span>
                  <span className={`ml-2 font-medium ${
                    (telemetryData.current_profit_loss_usd || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(telemetryData.current_profit_loss_usd || 0) >= 0 ? '+' : ''}
                    {formatCurrency(telemetryData.current_profit_loss_usd || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Orders:</span>
                  <span className="text-white ml-2 font-medium">{telemetryData.active_orders_count || 0}</span>
                </div>
                <div>
                  <span className="text-gray-400">Fill Rate:</span>
                  <span className="text-blue-400 ml-2 font-medium">{(telemetryData.fill_rate_percent || 0).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Deployed:</span>
                  <span className="text-purple-400 ml-2 font-medium">{(telemetryData.grid_utilization_percent || 0).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Standard Performance Metrics */}
          <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800/30 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-0.5">
              {isPositiveReturn ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <span className="text-[10px] text-gray-400">Total Return</span>
            </div>
            <p className={`font-semibold text-sm ${isPositiveReturn ? 'text-green-400' : 'text-red-400'}`}>
              {formatPercent(performance.total_return)}
            </p>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-0.5">
              <Target className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-gray-400">Win Rate</span>
            </div>
            <p className="font-semibold text-sm text-blue-400">
              {formatPercent(performance.win_rate || 0)}
            </p>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-0.5">
              <Shield className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] text-gray-400">Max Drawdown</span>
            </div>
            <p className="font-semibold text-sm text-purple-400">
              {formatPercent(performance.max_drawdown || 0)}
            </p>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-0.5">
              <Clock className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-gray-400">Trades</span>
            </div>
            <p className="font-semibold text-sm text-yellow-400">
              {(performance.total_trades || 0)}
            </p>
          </div>
          </div>
        </div>
      )}

      {/* Capital Requirements */}
      <div className="mb-3">
        <p className="text-[10px] text-gray-400 mb-0.5">Minimum Capital</p>
        <p className="font-semibold text-sm text-white">{formatCurrency(strategy.min_capital)}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-1.5">
        <Button
          variant="primary"
          size="sm"
          onClick={onToggle}
          disabled={isComingSoon || needsUpgrade}
          className={`flex-1 transition-all duration-200 h-8 ${
            strategy.is_active
              ? 'bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-600/90 hover:to-red-700/90 text-white shadow-md hover:shadow-red-500/15'
              : 'bg-gradient-to-r from-green-600/80 to-green-700/80 hover:from-green-600/90 hover:to-green-700/90 text-white shadow-md hover:shadow-green-500/15'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {strategy.is_active ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Start</span>
              </>
            )}
          </div>
        </Button>

        {strategy.is_active && isAvailable && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExecuteStrategy}
            disabled={isExecuting}
            title="Execute one iteration of this strategy"
            className="h-8 px-2"
          >
            {isExecuting ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          disabled={isComingSoon || needsUpgrade}
          onClick={onViewDetails}
          className="h-8 px-2"
        >
          <Settings className="w-3.5 h-3.5" />
        </Button>

        <Button
          disabled={isComingSoon || needsUpgrade}
          variant="ghost"
          size="sm"
          onClick={onBacktest}
          className="h-8 px-2"
        >
          <BarChart3 className="w-3.5 h-3.5" />
        </Button>

        {isGridStrategy && onDiagnose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDiagnose}
            className="h-8 px-2"
            title="Run Diagnostics"
          >
            <Stethoscope className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
}