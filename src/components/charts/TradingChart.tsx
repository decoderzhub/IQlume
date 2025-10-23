import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, LineData } from 'lightweight-charts';
import { Card } from '../ui/Card';
import { TrendingUp, Maximize2, Settings, BarChart2, Activity, TrendingDown } from 'lucide-react';

interface ChartDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingChartProps {
  symbol: string;
  data: ChartDataPoint[];
  chartType?: 'candlestick' | 'line' | 'area';
  height?: number;
  showVolume?: boolean;
  showGrid?: boolean;
  onTimeframeChange?: (timeframe: string) => void;
  currentTimeframe?: string;
}

type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
];

export function TradingChart({
  symbol,
  data,
  chartType = 'candlestick',
  height = 400,
  showVolume = true,
  showGrid = true,
  onTimeframeChange,
  currentTimeframe = '1d',
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<'candlestick' | 'line' | 'area'>(chartType);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    console.log(`[TradingChart] Rendering chart for ${symbol} with ${data.length} data points`);

    if (!chartContainerRef.current) {
      console.warn('[TradingChart] Chart container ref not available');
      return;
    }

    if (data.length === 0) {
      console.warn(`[TradingChart] No data available for ${symbol}`);
      return;
    }

    // Validate data format
    const invalidDataPoints = data.filter(d =>
      !d.time ||
      typeof d.open !== 'number' ||
      typeof d.high !== 'number' ||
      typeof d.low !== 'number' ||
      typeof d.close !== 'number'
    );

    if (invalidDataPoints.length > 0) {
      console.error('[TradingChart] Invalid data points detected:', invalidDataPoints.slice(0, 3));
    }

    console.log('[TradingChart] Sample data points:', data.slice(0, 2));

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1f2937' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: showGrid ? '#374151' : 'transparent' },
        horzLines: { color: showGrid ? '#374151' : 'transparent' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#374151',
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6b7280',
          width: 1,
          style: 3,
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          color: '#6b7280',
          width: 1,
          style: 3,
          labelBackgroundColor: '#3b82f6',
        },
      },
    });

    chartRef.current = chart;

    let mainSeries: ISeriesApi<any>;

    if (selectedChartType === 'candlestick') {
      mainSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });

      const candlestickData: CandlestickData[] = data.map(d => ({
        time: (d.time / 1000) as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      mainSeries.setData(candlestickData);
    } else if (selectedChartType === 'line') {
      mainSeries = chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
      });

      const lineData: LineData[] = data.map(d => ({
        time: (d.time / 1000) as Time,
        value: d.close,
      }));

      mainSeries.setData(lineData);
    } else {
      mainSeries = chart.addAreaSeries({
        topColor: 'rgba(59, 130, 246, 0.4)',
        bottomColor: 'rgba(59, 130, 246, 0.0)',
        lineColor: '#3b82f6',
        lineWidth: 2,
      });

      const areaData: LineData[] = data.map(d => ({
        time: (d.time / 1000) as Time,
        value: d.close,
      }));

      mainSeries.setData(areaData);
    }

    mainSeriesRef.current = mainSeries;

    if (showVolume && data.some(d => d.volume !== undefined)) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#6b7280',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.85,
          bottom: 0,
        },
      });

      const volumeData = data
        .filter(d => d.volume !== undefined)
        .map(d => ({
          time: (d.time / 1000) as Time,
          value: d.volume!,
          color: d.close >= d.open ? '#10b98180' : '#ef444480',
        }));

      volumeSeries.setData(volumeData);
      volumeSeriesRef.current = volumeSeries;
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [data, selectedChartType, showVolume, showGrid, height]);

  const handleChartTypeChange = (type: 'candlestick' | 'line' | 'area') => {
    setSelectedChartType(type);
  };

  const handleTimeframeClick = (timeframe: Timeframe) => {
    if (onTimeframeChange) {
      onTimeframeChange(timeframe);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const previousPrice = data.length > 1 ? data[data.length - 2].close : currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;
  const isPriceUp = priceChange >= 0;

  return (
    <Card className={`p-4 ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{symbol}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-white">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className={`flex items-center gap-1 text-sm ${isPriceUp ? 'text-green-400' : 'text-red-400'}`}>
                {isPriceUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>
                  {isPriceUp ? '+' : ''}{priceChange.toFixed(2)} ({isPriceUp ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <Maximize2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {TIMEFRAMES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleTimeframeClick(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentTimeframe === value
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleChartTypeChange('candlestick')}
            className={`p-2 rounded-lg transition-colors ${
              selectedChartType === 'candlestick'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
            title="Candlestick"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleChartTypeChange('line')}
            className={`p-2 rounded-lg transition-colors ${
              selectedChartType === 'line'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
            title="Line"
          >
            <TrendingUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleChartTypeChange('area')}
            className={`p-2 rounded-lg transition-colors ${
              selectedChartType === 'area'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
            title="Area"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="w-full"
        style={{ height: isFullscreen ? 'calc(100vh - 200px)' : `${height}px` }}
      />

      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400 max-w-md px-4">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No chart data available</p>
            <p className="text-sm mt-2">
              {symbol ? (
                <>
                  Unable to load historical data for <span className="font-mono text-blue-400">{symbol}</span>
                  <br />
                  <span className="text-xs mt-1 block">
                    Data is sourced from Alpaca Markets. Try a different symbol or check if markets are open.
                  </span>
                </>
              ) : (
                'Select a symbol and timeframe to view chart'
              )}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
