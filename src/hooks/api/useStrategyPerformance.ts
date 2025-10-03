import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { TradingStrategy } from '../../types';

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
      setLoading(false);
      return;
    }

    try {
      console.log('📊 Fetching active strategies with performance data...');

      const { data: strategies, error: strategiesError } = await supabase
        .from('trading_strategies')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (strategiesError) {
        console.error('❌ Error fetching strategies:', strategiesError);
        setStrategiesData([]);
        setLoading(false);
        return;
      }

      if (!strategies || strategies.length === 0) {
        console.log('ℹ️ No active strategies found for user');
        setStrategiesData([]);
        setLoading(false);
        return;
      }

      console.log(`✅ Found ${strategies.length} active strategies`);

      const performanceData: StrategyPerformanceData[] = await Promise.all(
        strategies.map(async (strategy) => {
          const { data: trades, error: tradesError } = await supabase
            .from('trades')
            .select('*')
            .eq('strategy_id', strategy.id)
            .eq('status', 'executed')
            .order('created_at', { ascending: false });

          if (tradesError) {
            console.error(`❌ Error fetching trades for strategy ${strategy.id}:`, tradesError);
          }

          const executedTrades = trades || [];

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

          const startPrice = config.entry_price ||
                            config.start_price ||
                            priceRangeLower;

          const lastTrade = executedTrades[0];
          const currentPrice = lastTrade?.price || startPrice;

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
        console.log('✅ Strategy performance data calculated:', performanceData.length);
        setStrategiesData(performanceData);
      }
    } catch (error) {
      console.error('❌ Error calculating strategy performance:', error);
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

    const interval = setInterval(fetchStrategyPerformance, 60000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [userId]);

  return {
    strategiesData,
    loading,
    refetch: fetchStrategyPerformance,
  };
}
