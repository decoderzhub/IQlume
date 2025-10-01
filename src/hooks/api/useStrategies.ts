import { useAPI, useMutation } from '../useAPI';
import { apiClient } from '../../lib/api-client';
import { TradingStrategy } from '../../types';

export function useStrategies(userId?: string) {
  return useAPI<TradingStrategy[]>(
    userId ? `/strategies?user_id=${userId}` : null,
    {
      refetchInterval: 30000,
      cacheTime: 60000,
    }
  );
}

export function useStrategy(strategyId?: string) {
  return useAPI<TradingStrategy>(
    strategyId ? `/strategies/${strategyId}` : null,
    {
      cacheTime: 60000,
    }
  );
}

interface CreateStrategyVariables {
  strategy: Omit<TradingStrategy, 'id'>;
}

export function useCreateStrategy() {
  return useMutation<TradingStrategy, CreateStrategyVariables>(
    async ({ strategy }) => {
      return await apiClient.post<TradingStrategy>('/strategies', strategy);
    }
  );
}

interface UpdateStrategyVariables {
  strategyId: string;
  updates: Partial<TradingStrategy>;
}

export function useUpdateStrategy() {
  return useMutation<TradingStrategy, UpdateStrategyVariables>(
    async ({ strategyId, updates }) => {
      return await apiClient.patch<TradingStrategy>(`/strategies/${strategyId}`, updates);
    }
  );
}

interface DeleteStrategyVariables {
  strategyId: string;
}

export function useDeleteStrategy() {
  return useMutation<void, DeleteStrategyVariables>(
    async ({ strategyId }) => {
      return await apiClient.delete<void>(`/strategies/${strategyId}`);
    }
  );
}

interface ToggleStrategyVariables {
  strategyId: string;
  isActive: boolean;
}

export function useToggleStrategy() {
  return useMutation<TradingStrategy, ToggleStrategyVariables>(
    async ({ strategyId, isActive }) => {
      return await apiClient.patch<TradingStrategy>(`/strategies/${strategyId}`, { is_active: isActive });
    }
  );
}
