import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { marketDataManager } from '../services/MarketDataManager';

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
          // Use actual day change data from backend API
          // These values should reflect real market performance, not mock data
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

  const subscribeToMarketData = () => {
    if (!user) return;

    const symbols = ['AAPL', 'MSFT', 'BTC', 'ETH'];
    console.log('[usePortfolioData] Subscribing to market data via centralized manager');

    const unsubscribers = symbols.map(symbol => {
      const cached = marketDataManager.getCached(symbol);
      if (cached && mountedRef.current) {
        const marketDataEntry = {
          price: cached.price,
          change: cached.change,
          change_percent: cached.change_percent,
          high: cached.high,
          low: cached.low,
          open: cached.open,
        };

        setMarketData(prev => ({ ...prev, [symbol]: marketDataEntry }));

        if (!historicalData[symbol]) {
          setHistoricalData(prev => ({
            ...prev,
            [symbol]: generateMockHistoricalData(cached.price, symbol),
          }));
        }
      }

      return marketDataManager.subscribe(symbol, (data) => {
        if (!mountedRef.current) return;

        const marketDataEntry = {
          price: data.price,
          change: data.change,
          change_percent: data.change_percent,
          high: data.high,
          low: data.low,
          open: data.open,
        };

        setMarketData(prev => ({ ...prev, [symbol]: marketDataEntry }));

        const now = new Date();
        setHistoricalData(prev => {
          const existing = prev[symbol] || [];
          const newPoint: HistoricalDataPoint = {
            time: now.getTime(),
            timeLabel: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            price: data.price,
            value: data.price,
          };
          return {
            ...prev,
            [symbol]: [...existing.slice(-49), newPoint],
          };
        });

        setLoading(false);
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
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
    const cleanup = subscribeToMarketData();

    return () => {
      mountedRef.current = false;
      cleanup?.();
    };
  }, [user]);

  return {
    marketData,
    historicalData,
    loading,
    accountsLoading,
    refetchMarketData: () => {
      const symbols = ['AAPL', 'MSFT', 'BTC', 'ETH'];
      marketDataManager.fetchOnce(symbols);
    },
    refetchAccounts: loadBrokerageAccounts,
  };
}
