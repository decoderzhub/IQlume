import { useState, useEffect, useCallback, useRef } from 'react';
import { marketDataManager, MarketDataPoint } from '../services/MarketDataManager';

export interface UseMarketDataResult {
  data: MarketDataPoint | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMarketData(symbol: string | null): UseMarketDataResult {
  const [data, setData] = useState<MarketDataPoint | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      setLoading(false);
      return;
    }

    const cached = marketDataManager.getCached(symbol);
    if (cached && mountedRef.current) {
      setData(cached);
      setLoading(false);
    }

    const unsubscribe = marketDataManager.subscribe(symbol, (marketData) => {
      if (mountedRef.current) {
        setData(marketData);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [symbol]);

  const refetch = useCallback(() => {
    if (!symbol) return;

    marketDataManager.fetchOnce([symbol]).then((result) => {
      const marketData = result.get(symbol);
      if (marketData && mountedRef.current) {
        setData(marketData);
      }
    }).catch((err) => {
      if (mountedRef.current) {
        setError(err);
      }
    });
  }, [symbol]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}

export interface UseMarketDataBatchResult {
  data: Map<string, MarketDataPoint>;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMarketDataBatch(symbols: string[]): UseMarketDataBatchResult {
  const [data, setData] = useState<Map<string, MarketDataPoint>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (symbols.length === 0) {
      setData(new Map());
      setLoading(false);
      return;
    }

    const cached = marketDataManager.getCachedBatch(symbols);
    if (cached.size > 0 && mountedRef.current) {
      setData(cached);
      setLoading(false);
    }

    const unsubscribers = symbols.map(symbol => {
      return marketDataManager.subscribe(symbol, (marketData) => {
        if (mountedRef.current) {
          setData(prev => {
            const updated = new Map(prev);
            updated.set(symbol, marketData);
            return updated;
          });
          setLoading(false);
          setError(null);
        }
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [symbols.join(',')]);

  const refetch = useCallback(() => {
    if (symbols.length === 0) return;

    marketDataManager.fetchOnce(symbols).then((result) => {
      if (mountedRef.current) {
        setData(result);
      }
    }).catch((err) => {
      if (mountedRef.current) {
        setError(err);
      }
    });
  }, [symbols.join(',')]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}

export function useMarketDataSubscription(
  symbol: string | null,
  onUpdate?: (data: MarketDataPoint) => void
) {
  const [data, setData] = useState<MarketDataPoint | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      return;
    }

    const cached = marketDataManager.getCached(symbol);
    if (cached && mountedRef.current) {
      setData(cached);
      onUpdate?.(cached);
    }

    const unsubscribe = marketDataManager.subscribe(symbol, (marketData) => {
      if (mountedRef.current) {
        setData(marketData);
        onUpdate?.(marketData);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [symbol, onUpdate]);

  return data;
}

export function useMarketDataStats() {
  const [stats, setStats] = useState(marketDataManager.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(marketDataManager.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}
