import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, UTCTimestamp } from 'lightweight-charts';

interface Trade {
  price: number;
  filled_avg_price?: number;
  quantity: number;
  type: 'buy' | 'sell';
  created_at: string;
}

interface StrategyCandlestickChartProps {
  symbol: string;
  candleData: CandlestickData<Time>[];
  trades?: Trade[];
  gridLevels?: {
    lower: number;
    upper: number;
  };
  loading?: boolean;
}

export function StrategyCandlestickChart({
  symbol,
  candleData,
  trades = [],
  gridLevels,
  loading = false
}: StrategyCandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    console.log(`📊 [Chart ${symbol}] Initializing chart...`);

    if (!chartContainerRef.current) {
      console.error(`❌ [Chart ${symbol}] chartContainerRef.current is null!`);
      return;
    }

    console.log(`✅ [Chart ${symbol}] Creating chart with dimensions:`, chartContainerRef.current.clientWidth, 'x 250px');

    // Create chart with EST timezone
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 250,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2B2B43',
        tickMarkFormatter: (time: UTCTimestamp) => {
          const date = new Date((time as number) * 1000);
          return date.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            month: 'short',
            day: 'numeric'
          });
        },
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
      },
      localization: {
        timeFormatter: (time: UTCTimestamp) => {
          const date = new Date((time as number) * 1000);
          return date.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        },
      },
    });

    chartRef.current = chart;

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    candlestickSeriesRef.current = candlestickSeries;
    console.log(`✅ [Chart ${symbol}] Chart and series created successfully`);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update candle data
  useEffect(() => {
    console.log(`📊 [Chart ${symbol}] Update candle data effect - series:`, !!candlestickSeriesRef.current, 'data:', candleData?.length || 0);

    if (!candlestickSeriesRef.current) {
      console.warn(`⚠️ [Chart ${symbol}] candlestickSeriesRef.current is null!`);
      return;
    }

    if (!candleData || candleData.length === 0) {
      console.warn(`⚠️ [Chart ${symbol}] No candle data to display`);
      return;
    }

    console.log(`✅ [Chart ${symbol}] Setting ${candleData.length} bars on chart`);
    candlestickSeriesRef.current.setData(candleData);

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      console.log(`✅ [Chart ${symbol}] Fitted content to chart`);
    }
  }, [candleData, symbol]);

  // Add trade markers
  useEffect(() => {
    if (!candlestickSeriesRef.current || !trades || trades.length === 0) {
      console.log('No trades to display on chart');
      return;
    }

    console.log(`Adding ${trades.length} trade markers to chart:`, trades);

    const markers = trades
      .filter(trade => trade.created_at)
      .map(trade => {
        const tradePrice = trade.filled_avg_price || trade.price;
        return {
          time: (new Date(trade.created_at).getTime() / 1000) as Time,
          position: trade.type === 'buy' ? 'belowBar' : 'aboveBar' as const,
          color: trade.type === 'buy' ? '#26a69a' : '#ef5350',
          shape: trade.type === 'buy' ? 'arrowUp' : 'arrowDown' as const,
          text: `${trade.type.toUpperCase()} ${trade.quantity} @ $${tradePrice.toFixed(2)}`,
        };
      });

    console.log('Formatted markers:', markers);
    candlestickSeriesRef.current.setMarkers(markers);
  }, [trades]);

  // Add grid level lines
  useEffect(() => {
    if (!chartRef.current || !gridLevels) return;

    // Add price lines for grid boundaries
    if (candlestickSeriesRef.current) {
      candlestickSeriesRef.current.createPriceLine({
        price: gridLevels.lower,
        color: '#22c55e',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'Grid Lower',
      });

      candlestickSeriesRef.current.createPriceLine({
        price: gridLevels.upper,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'Grid Upper',
      });
    }
  }, [gridLevels]);

  if (loading) {
    return (
      <div className="h-[250px] bg-gray-800/30 rounded-lg flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading chart data...</div>
      </div>
    );
  }

  if (!candleData || candleData.length === 0) {
    return (
      <div className="h-[250px] bg-gray-800/30 rounded-lg flex items-center justify-center">
        <div className="text-gray-400 text-sm flex flex-col items-center gap-2">
          <div>No market data available for {symbol}</div>
          <div className="text-xs text-gray-500">Chart will load when market data is fetched</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />
    </div>
  );
}
