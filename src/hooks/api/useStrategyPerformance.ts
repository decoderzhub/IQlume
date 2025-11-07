import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { TradingStrategy } from '../../types';
import { marketDataManager } from '../../services/MarketDataManager';
import { getMarketStatus } from '../../lib/marketHours';

interface StrategyPerformanceData {
  strategy: TradingStrategy;
  totalInvestment: number;
  currentValue: number;
  currentProfit: number;
  currentProfitPercent: number;
  gridProfit: number;
  holdingProfit: number;
  gridProfitPercent: number;
  annualizedReturn: number;
  totalTransactions: number;
  last24hTransactions: number;
  priceRangeUpper: number;
  priceRangeLower: number;
  gridLevels: number;
  startPrice: number;
  currentPrice: number;
  historicalData: Array<{
    time: number;
    timeLabel: string;
    price: number;
    value: number;
  }>;
}

export function useStrategyPerformance(userId?: string) {
  const [strategiesData, setStrategiesData] = useState<StrategyPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const strategiesRef = useRef<TradingStrategy[]>([]);

  const calculateAnnualizedReturn = (
    totalReturn: number,
    initialCapital: number,
    createdAt: string
  ): number => {
    const daysSinceCreation = Math.max(
      1,
      Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    );
    const returnPercent = (totalReturn / initialCapital) * 100;
    const annualizedReturn = (returnPercent * 365) / daysSinceCreation;
    return annualizedReturn;
  };

  const generateHistoricalData = (
    currentValue: number,
    profitLoss: number,
    startDate: string
  ) => {
    const points = 50;
    const data = [];
    const initialValue = currentValue - profitLoss;
    const now = Date.now();
    const startTime = new Date(startDate).getTime();
    const timeRange = now - startTime;
    const intervalMs = timeRange / points;

    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      const value = initialValue + profitLoss * progress * (0.7 + Math.random() * 0.6);
      const time = startTime + intervalMs * i;
      const date = new Date(time);

      data.push({
        time,
        timeLabel: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        price: value,
        value: value,
      });
    }

    return data;
  };

  const fetchStrategyPerformance = async () => {
    if (!userId) {
      console.log('[useStrategyPerformance] No user ID provided, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      console.log('[useStrategyPerformance] Fetching active strategies for user:', userId);

      const { data: strategies, error: strategiesError } = await supabase
        .from('trading_strategies')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (strategiesError) {
        console.error('[useStrategyPerformance] ❌ Error fetching strategies:', strategiesError);
        setStrategiesData([]);
        setLoading(false);
        return;
      }

      if (!strategies || strategies.length === 0) {
        console.log('[useStrategyPerformance] ℹ️ No active strategies found for user');
        setStrategiesData([]);
        setLoading(false);
        return;
      }

      console.log(`[useStrategyPerformance] ✅ Found ${strategies.length} active strategies`);

      strategiesRef.current = strategies;

      const performanceData: StrategyPerformanceData[] = await Promise.all(
        strategies.map(async (strategy) => {
          const { data: trades, error: tradesError } = await supabase
            .from('trades')
            .select('*')
            .eq('strategy_id', strategy.id)
            .eq('status', 'executed')
            .order('created_at', { ascending: false });

          if (tradesError) {
            console.error(`[useStrategyPerformance] ❌ Error fetching trades for strategy ${strategy.id}:`, tradesError);
          }

          const executedTrades = trades || [];

          // Find the first buy trade (earliest by created_at)
          const buyTrades = executedTrades
            .filter((t) => t.type === 'buy')
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const firstBuyTrade = buyTrades[0];

          const totalProfit = strategy.total_profit_loss || 0;
          const totalTrades = executedTrades.length;

          const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const last24hTrades = executedTrades.filter(
            (t) => new Date(t.created_at) >= last24h
          );

          const capitalAllocation = strategy.configuration?.capital_allocation ||
                                    strategy.capital_allocation;
          const investmentAmount = capitalAllocation?.value || strategy.min_capital || 1000;

          const currentValue = investmentAmount + totalProfit;
          const profitPercent = (totalProfit / investmentAmount) * 100;

          const gridProfit = totalProfit * 0.3;
          const holdingProfit = totalProfit * 0.7;
          const gridProfitPercent = (gridProfit / investmentAmount) * 100;

          const annualizedReturn = calculateAnnualizedReturn(
            totalProfit,
            investmentAmount,
            strategy.created_at || new Date().toISOString()
          );

          const telemetryData = strategy.telemetry_data || {};
          const config = strategy.configuration || {};

          // Extract grid configuration with correct field names
          // Grid strategies store configuration as: price_range_lower, price_range_upper, number_of_grids
          const priceRangeUpper = config.price_range_upper ||
                                  telemetryData.upper_price_limit ||
                                  config.upper_price ||
                                  config.price_upper ||
                                  0;
          const priceRangeLower = config.price_range_lower ||
                                  telemetryData.lower_price_limit ||
                                  config.lower_price ||
                                  config.price_lower ||
                                  0;
          const gridLevels = config.number_of_grids ||
                            telemetryData.active_grid_levels ||
                            config.num_grids ||
                            config.grid_levels ||
                            0;

          // Use the first buy trade's filled price as the start price
          // This represents the actual price at which the initial buy took place
          const startPrice = firstBuyTrade?.filled_avg_price ||
                            firstBuyTrade?.price ||
                            config.entry_price ||
                            config.start_price ||
                            priceRangeLower;

          const lastTrade = executedTrades[0];
          const currentPrice = lastTrade?.filled_avg_price || lastTrade?.price || startPrice;

          const historicalData = generateHistoricalData(
            currentValue,
            totalProfit,
            strategy.created_at || new Date().toISOString()
          );

          return {
            strategy,
            totalInvestment: investmentAmount,
            currentValue,
            currentProfit: totalProfit,
            currentProfitPercent: profitPercent,
            gridProfit,
            holdingProfit,
            gridProfitPercent,
            annualizedReturn,
            totalTransactions: totalTrades,
            last24hTransactions: last24hTrades.length,
            priceRangeUpper,
            priceRangeLower,
            gridLevels,
            startPrice,
            currentPrice,
            historicalData,
          };
        })
      );

      if (mountedRef.current) {
        console.log('[useStrategyPerformance] ✅ Strategy performance data calculated:', performanceData.length);
        setStrategiesData(performanceData);
      }
    } catch (error) {
      console.error('[useStrategyPerformance] ❌ Error calculating strategy performance:', error);
      if (mountedRef.current) {
        setStrategiesData([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchStrategyPerformance();

    const realtimeChannel = supabase
      .channel('strategy_performance_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_strategies',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('[useStrategyPerformance] Strategy changed, refetching');
          fetchStrategyPerformance();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
        },
        () => {
          console.log('[useStrategyPerformance] Trade changed, refetching');
          fetchStrategyPerformance();
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      realtimeChannel.unsubscribe();
    };
  }, [userId]);

  // Fetch latest prices for strategies - respects market hours
  const fetchLatestPrices = async () => {
    if (strategiesRef.current.length === 0) return;

    const symbols = strategiesRef.current
      .map(s => s.base_symbol || s.symbol || (s.configuration as any)?.symbol)
      .filter((symbol): symbol is string => !!symbol);

    if (symbols.length === 0) return;

    const marketStatus = getMarketStatus();
    console.log(`[useStrategyPerformance] Market is ${marketStatus.isOpen ? 'OPEN' : 'CLOSED'}`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      // Fetch prices for all symbols
      const pricePromises = symbols.map(async (symbol) => {
        try {
          const response = await fetch(`${API_BASE}/api/market-data/symbol/${symbol}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          });

          if (!response.ok) return null;
          const data = await response.json();
          return { symbol, price: data.current_price || data.price };
        } catch (error) {
          console.error(`[useStrategyPerformance] Error fetching price for ${symbol}:`, error);
          return null;
        }
      });

      const prices = await Promise.all(pricePromises);
      const priceMap = new Map(prices.filter(p => p !== null).map(p => [p!.symbol, p!.price]));

      if (mountedRef.current && priceMap.size > 0) {
        setStrategiesData(prev => {
          return prev.map(strategyData => {
            const symbol = strategyData.strategy.base_symbol ||
                          strategyData.strategy.symbol ||
                          (strategyData.strategy.configuration as any)?.symbol;
            const currentPrice = priceMap.get(symbol);

            if (!currentPrice || !symbol) return strategyData;

            const totalInvestment = strategyData.totalInvestment;
            const startPrice = strategyData.startPrice;
            const priceChange = currentPrice - startPrice;
            const holdingProfit = (priceChange / startPrice) * totalInvestment;
            const gridProfit = strategyData.gridProfit;
            const totalProfit = gridProfit + holdingProfit;
            const currentValue = totalInvestment + totalProfit;

            return {
              ...strategyData,
              currentPrice,
              currentValue,
              currentProfit: totalProfit,
              currentProfitPercent: (totalProfit / totalInvestment) * 100,
              holdingProfit,
            };
          });
        });
      }
    } catch (error) {
      console.error('[useStrategyPerformance] Error fetching latest prices:', error);
    }
  };

  useEffect(() => {
    if (strategiesRef.current.length === 0) return;

    const symbols = strategiesRef.current
      .map(s => s.base_symbol || s.symbol || (s.configuration as any)?.symbol)
      .filter((symbol): symbol is string => !!symbol);

    if (symbols.length === 0) return;

    // Initial price fetch
    fetchLatestPrices();

    const marketStatus = getMarketStatus();

    // During market hours: subscribe to live updates
    // After hours: poll every 30 seconds for latest closing prices
    if (marketStatus.isOpen) {
      console.log('[useStrategyPerformance] Market OPEN - Subscribing to live market data for:', symbols);

      const unsubscribers = symbols.map(symbol => {
        return marketDataManager.subscribe(symbol, (marketData) => {
          if (!mountedRef.current) return;

          setStrategiesData(prev => {
            return prev.map(strategyData => {
              const strategySymbol = strategyData.strategy.base_symbol ||
                                    strategyData.strategy.symbol ||
                                    (strategyData.strategy.configuration as any)?.symbol;

              if (strategySymbol === symbol) {
                const currentPrice = marketData.price;
                const totalInvestment = strategyData.totalInvestment;
                const startPrice = strategyData.startPrice;
                const priceChange = currentPrice - startPrice;
                const holdingProfit = (priceChange / startPrice) * totalInvestment;
                const gridProfit = strategyData.gridProfit;
                const totalProfit = gridProfit + holdingProfit;
                const currentValue = totalInvestment + totalProfit;

                return {
                  ...strategyData,
                  currentPrice,
                  currentValue,
                  currentProfit: totalProfit,
                  currentProfitPercent: (totalProfit / totalInvestment) * 100,
                  holdingProfit,
                };
              }
              return strategyData;
            });
          });
        });
      });

      return () => {
        unsubscribers.forEach(unsub => unsub());
      };
    } else {
      console.log('[useStrategyPerformance] Market CLOSED - Using latest closing prices');

      // Poll for updated prices every 30 seconds when market is closed
      const pollInterval = setInterval(fetchLatestPrices, 30000);

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [strategiesRef.current.map(s => s.symbol).join(',')]);

  return {
    strategiesData,
    loading,
    refetch: fetchStrategyPerformance,
  };
}
