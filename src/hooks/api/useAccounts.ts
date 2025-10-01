import { useAPI, useMutation } from '../useAPI';
import { apiClient } from '../../lib/api-client';

export interface BrokerageAccount {
  id: string;
  user_id: string;
  broker: string;
  account_number: string;
  account_type: string;
  status: 'active' | 'inactive' | 'pending';
  balance: number;
  buying_power: number;
  created_at: string;
  updated_at: string;
}

export function useBrokerageAccounts(userId?: string) {
  return useAPI<BrokerageAccount[]>(
    userId ? `/accounts?user_id=${userId}` : null,
    {
      refetchInterval: 60000,
      cacheTime: 120000,
    }
  );
}

export function useBrokerageAccount(accountId?: string) {
  return useAPI<BrokerageAccount>(
    accountId ? `/accounts/${accountId}` : null,
    {
      refetchInterval: 60000,
      cacheTime: 120000,
    }
  );
}

interface ConnectBrokerageVariables {
  broker: string;
  credentials: Record<string, any>;
}

export function useConnectBrokerage() {
  return useMutation<BrokerageAccount, ConnectBrokerageVariables>(
    async ({ broker, credentials }) => {
      return await apiClient.post<BrokerageAccount>('/accounts/connect', {
        broker,
        credentials,
      });
    }
  );
}

interface DisconnectBrokerageVariables {
  accountId: string;
}

export function useDisconnectBrokerage() {
  return useMutation<void, DisconnectBrokerageVariables>(
    async ({ accountId }) => {
      return await apiClient.delete<void>(`/accounts/${accountId}`);
    }
  );
}

interface RefreshAccountVariables {
  accountId: string;
}

export function useRefreshAccount() {
  return useMutation<BrokerageAccount, RefreshAccountVariables>(
    async ({ accountId }) => {
      return await apiClient.post<BrokerageAccount>(`/accounts/${accountId}/refresh`);
    }
  );
}
