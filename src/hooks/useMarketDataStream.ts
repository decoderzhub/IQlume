import { useEffect, useState, useCallback } from 'react';
import { wsManager } from '../services/WebSocketManager';

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
  const { enabled = true, autoConnect = true } = options;
  const [data, setData] = useState<StreamData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkConnection = useCallback(() => {
    setIsConnected(wsManager.isConnected());
  }, []);

  useEffect(() => {
    if (!symbol || !enabled) return;

    if (autoConnect && !wsManager.isConnected()) {
      wsManager.connect().catch(err => {
        console.error('[useMarketDataStream] Connection error:', err);
        setError(err);
      });
    }

    const handleData = (streamData: StreamData) => {
      setData(streamData);
      setError(null);
    };

    const unsubscribe = wsManager.subscribe(symbol, handleData);

    const connectionCheckInterval = setInterval(checkConnection, 5000);
    checkConnection();

    return () => {
      unsubscribe();
      clearInterval(connectionCheckInterval);
    };
  }, [symbol, enabled, autoConnect, checkConnection]);

  const reconnect = useCallback(async () => {
    try {
      await wsManager.connect();
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  return {
    data,
    isConnected,
    error,
    reconnect,
    connectionState: wsManager.getConnectionState(),
  };
}
