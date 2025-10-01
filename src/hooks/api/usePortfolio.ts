import { useAPI } from '../useAPI';

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  profit_loss: number;
  profit_loss_percent: number;
}

export interface PortfolioData {
  total_value: number;
  cash_balance: number;
  positions: PortfolioPosition[];
  daily_change: number;
  daily_change_percent: number;
}

export function usePortfolio(userId?: string, accountId?: string) {
  const params: Record<string, string> = {};
  if (userId) params.user_id = userId;
  if (accountId) params.account_id = accountId;

  const queryString = Object.keys(params).length > 0
    ? `?${new URLSearchParams(params).toString()}`
    : '';

  return useAPI<PortfolioData>(
    userId ? `/portfolio${queryString}` : null,
    {
      refetchInterval: 30000,
      cacheTime: 60000,
    }
  );
}

export function usePortfolioHistory(userId?: string, period: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL' = '1M') {
  return useAPI<Array<{ timestamp: string; value: number }>>(
    userId ? `/portfolio/history?user_id=${userId}&period=${period}` : null,
    {
      cacheTime: 300000,
    }
  );
}
