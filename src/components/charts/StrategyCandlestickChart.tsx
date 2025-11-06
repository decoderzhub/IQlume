import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';

interface Trade {
  price: number;
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
    if (!chartContainerRef.current) return;

    // Create chart
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
      height: 200,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2B2B43',
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
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
    if (!candlestickSeriesRef.current || !candleData || candleData.length === 0) return;

    candlestickSeriesRef.current.setData(candleData);

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candleData]);

  // Add trade markers
  useEffect(() => {
    if (!candlestickSeriesRef.current || !trades || trades.length === 0) return;

    const markers = trades.map(trade => ({
      time: (new Date(trade.created_at).getTime() / 1000) as Time,
      position: trade.type === 'buy' ? 'belowBar' : 'aboveBar' as const,
      color: trade.type === 'buy' ? '#26a69a' : '#ef5350',
      shape: trade.type === 'buy' ? 'arrowUp' : 'arrowDown' as const,
      text: `${trade.type.toUpperCase()} @ ${trade.price.toFixed(2)}`,
    }));

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
      <div className="h-[200px] bg-gray-800/30 rounded-lg flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading chart data...</div>
      </div>
    );
  }

  if (!candleData || candleData.length === 0) {
    return (
      <div className="h-[200px] bg-gray-800/30 rounded-lg flex items-center justify-center">
        <div className="text-gray-400 text-sm">No market data available for {symbol}</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />
    </div>
  );
}
