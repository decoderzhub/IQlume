import { useAPI } from '../useAPI';
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
  return useAPI<MarketPrice>(
    symbol ? `/market_data/price/${symbol}` : null,
    {
      refetchInterval: 5000,
      cacheTime: 3000,
    }
  );
}

export function useMarketPrices(symbols?: string[]) {
  const symbolsQuery = symbols?.join(',');

  return useAPI<MarketPrice[]>(
    symbolsQuery ? `/market_data/prices?symbols=${symbolsQuery}` : null,
    {
      refetchInterval: 5000,
      cacheTime: 3000,
    }
  );
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
