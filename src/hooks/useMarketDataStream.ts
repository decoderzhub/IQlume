import { useEffect, useState, useCallback } from 'react';
import { marketDataManager, MarketDataPoint } from '../services/MarketDataManager';

interface StreamData {
  type: 'trade' | 'quote' | 'bar';
  symbol: string;
  price?: number;
  bidPrice?: number;
  askPrice?: number;
  bidSize?: number;
  askSize?: number;
  size?: number;
  volume?: number;
  timestamp: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

interface UseMarketDataStreamOptions {
  enabled?: boolean;
  autoConnect?: boolean;
}

export function useMarketDataStream(
  symbol: string | null,
  options: UseMarketDataStreamOptions = {}
) {
  const { enabled = true } = options;
  const [data, setData] = useState<StreamData | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!symbol || !enabled) return;

    const handleData = (marketData: MarketDataPoint) => {
      const streamData: StreamData = {
        type: 'trade',
        symbol: marketData.symbol,
        price: marketData.price,
        volume: marketData.volume,
        timestamp: marketData.timestamp,
        open: marketData.open,
        high: marketData.high,
        low: marketData.low,
        close: marketData.price,
      };
      setData(streamData);
      setError(null);
      setIsConnected(true);
    };

    const unsubscribe = marketDataManager.subscribe(symbol, handleData);

    return () => {
      unsubscribe();
    };
  }, [symbol, enabled]);

  const reconnect = useCallback(async () => {
    console.log('[useMarketDataStream] Reconnect called (using centralized manager)');
    setError(null);
  }, []);

  return {
    data,
    isConnected,
    error,
    reconnect,
    connectionState: 'CONNECTED',
  };
}
