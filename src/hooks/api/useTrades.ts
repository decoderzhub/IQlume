import { useAPI, useMutation } from '../useAPI';
import { apiClient } from '../../lib/api-client';

export interface Trade {
  id: string;
  strategy_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  status: 'pending' | 'filled' | 'canceled' | 'rejected';
  executed_at?: string;
  created_at: string;
}

export function useTrades(userId?: string, strategyId?: string) {
  const params: Record<string, string> = {};
  if (userId) params.user_id = userId;
  if (strategyId) params.strategy_id = strategyId;

  const queryString = Object.keys(params).length > 0
    ? `?${new URLSearchParams(params).toString()}`
    : '';

  return useAPI<Trade[]>(
    userId ? `/trades${queryString}` : null,
    {
      refetchInterval: 15000,
      cacheTime: 30000,
    }
  );
}

export function useTrade(tradeId?: string) {
  return useAPI<Trade>(
    tradeId ? `/trades/${tradeId}` : null,
    {
      cacheTime: 60000,
    }
  );
}

interface CreateTradeVariables {
  trade: Omit<Trade, 'id' | 'created_at'>;
}

export function useCreateTrade() {
  return useMutation<Trade, CreateTradeVariables>(
    async ({ trade }) => {
      return await apiClient.post<Trade>('/trades', trade);
    }
  );
}

interface CancelTradeVariables {
  tradeId: string;
}

export function useCancelTrade() {
  return useMutation<Trade, CancelTradeVariables>(
    async ({ tradeId }) => {
      return await apiClient.post<Trade>(`/trades/${tradeId}/cancel`);
    }
  );
}
