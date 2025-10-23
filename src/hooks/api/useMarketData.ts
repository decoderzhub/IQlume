import { useMarketData as useMarketDataCentralized, useMarketDataBatch } from '../useMarketData';
import { apiClient } from '../../lib/api-client';

export interface MarketPrice {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  timestamp: string;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export function useMarketPrice(symbol?: string) {
  const { data, loading, error, refetch } = useMarketDataCentralized(symbol || null);

  return {
    data: data ? {
      symbol: data.symbol,
      price: data.price,
      change: data.change,
      change_percent: data.change_percent,
      volume: data.volume,
      timestamp: new Date(data.timestamp).toISOString(),
    } : null,
    isLoading: loading,
    error,
    refetch,
  };
}

export function useMarketPrices(symbols?: string[]) {
  const { data, loading, error, refetch } = useMarketDataBatch(symbols || []);

  const formattedData = Array.from(data.values()).map(marketData => ({
    symbol: marketData.symbol,
    price: marketData.price,
    change: marketData.change,
    change_percent: marketData.change_percent,
    volume: marketData.volume,
    timestamp: new Date(marketData.timestamp).toISOString(),
  }));

  return {
    data: formattedData,
    isLoading: loading,
    error,
    refetch,
  };
}

export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  if (!query || query.length < 1) {
    return [];
  }

  try {
    return await apiClient.get<SymbolSearchResult[]>('/market_data/search', {
      params: { q: query },
    });
  } catch (error) {
    console.error('Symbol search error:', error);
    return [];
  }
}

export function useSymbolSearch(query?: string) {
  return useAPI<SymbolSearchResult[]>(
    query && query.length > 0 ? `/market_data/search?q=${query}` : null,
    {
      cacheTime: 600000,
    }
  );
}

export interface OptionsChain {
  symbol: string;
  expiration_dates: string[];
  calls: OptionContract[];
  puts: OptionContract[];
}

export interface OptionContract {
  strike: number;
  expiration: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  open_interest: number;
  implied_volatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export function useOptionsChain(symbol?: string, expiration?: string) {
  const params: Record<string, string> = {};
  if (expiration) params.expiration = expiration;

  const queryString = Object.keys(params).length > 0
    ? `?${new URLSearchParams(params).toString()}`
    : '';

  return useAPI<OptionsChain>(
    symbol ? `/market_data/options/${symbol}${queryString}` : null,
    {
      refetchInterval: 30000,
      cacheTime: 60000,
    }
  );
}
