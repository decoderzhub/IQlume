import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

interface MarketData {
  [symbol: string]: {
    price: number;
    change: number;
    change_percent: number;
    high: number;
    low: number;
    open?: number;
  };
}

interface HistoricalDataPoint {
  time: number;
  timeLabel: string;
  price: number;
  value: number;
}

export function usePortfolioData() {
  const { user, setPortfolio, setBrokerageAccounts, updatePortfolioFromAccounts } = useStore();
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [historicalData, setHistoricalData] = useState<Record<string, HistoricalDataPoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);

  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const generateMockHistoricalData = (currentPrice: number, symbol: string): HistoricalDataPoint[] => {
    const points = 50;
    const data: HistoricalDataPoint[] = [];
    let price = currentPrice * 0.95;

    for (let i = 0; i < points; i++) {
      const change = (Math.random() - 0.5) * 0.02;
      price = price * (1 + change);
      const now = new Date();
      const time = new Date(now.getTime() - (points - i) * 30000);
      data.push({
        time: time.getTime(),
        timeLabel: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: price,
        value: price,
      });
    }

    data[data.length - 1].price = currentPrice;
    data[data.length - 1].value = currentPrice;

    return data;
  };

  const loadBrokerageAccounts = async () => {
    if (!user) {
      setAccountsLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setAccountsLoading(false);
        return;
      }

      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const portfolioResponse = await fetch(`${baseURL}/api/portfolio`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json();

        if (mountedRef.current) {
          setPortfolio({
            total_value: portfolioData.total_value || 0,
            buying_power: portfolioData.buying_power || 0,
            day_change: portfolioData.day_change || 0,
            day_change_percent: portfolioData.day_change_percent || 0,
            accounts: [],
          });

          const accountsResponse = await fetch(`${baseURL}/api/alpaca/accounts`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (accountsResponse.ok) {
            const accountsData = await accountsResponse.json();
            const accounts = accountsData.accounts || [];

            const transformedAccounts = accounts.map((account: any) => ({
              id: account.id,
              user_id: account.user_id,
              brokerage: account.brokerage,
              account_name: account.account_name,
              account_type: account.account_type,
              balance: portfolioData.total_value || account.balance,
              is_connected: account.is_connected,
              last_sync: new Date().toISOString(),
              oauth_token: account.oauth_token,
              account_number: account.account_number,
              routing_number: account.routing_number,
            }));

            if (mountedRef.current) {
              setBrokerageAccounts(transformedAccounts);
              updatePortfolioFromAccounts();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading brokerage accounts:', error);
    } finally {
      if (mountedRef.current) {
        setAccountsLoading(false);
      }
    }
  };

  const fetchMarketData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const symbols = ['AAPL', 'MSFT', 'BTC', 'ETH'].join(',');

      const response = await fetch(`${baseURL}/api/market-data/live-prices?symbols=${symbols}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (mountedRef.current) {
          setMarketData(data);

          const newHistoricalData: Record<string, HistoricalDataPoint[]> = {};
          Object.entries(data).forEach(([symbol, quote]: [string, any]) => {
            if (!historicalData[symbol]) {
              newHistoricalData[symbol] = generateMockHistoricalData(quote.price, symbol);
            }
          });

          setHistoricalData((prev) => ({ ...prev, ...newHistoricalData }));
        }
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    loadBrokerageAccounts();

    return () => {
      mountedRef.current = false;
    };
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;
    fetchMarketData();

    intervalRef.current = setInterval(fetchMarketData, 30000);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    if (marketData && mountedRef.current) {
      const now = new Date();
      const updatedHistoricalData = { ...historicalData };

      Object.entries(marketData).forEach(([symbol, quote]: [string, any]) => {
        if (updatedHistoricalData[symbol]) {
          const newPoint: HistoricalDataPoint = {
            time: now.getTime(),
            timeLabel: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            price: quote.price,
            value: quote.price,
          };
          updatedHistoricalData[symbol] = [...updatedHistoricalData[symbol].slice(-49), newPoint];
        }
      });

      setHistoricalData(updatedHistoricalData);
    }
  }, [marketData]);

  return {
    marketData,
    historicalData,
    loading,
    accountsLoading,
    refetchMarketData: fetchMarketData,
    refetchAccounts: loadBrokerageAccounts,
  };
}
