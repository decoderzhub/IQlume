import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Portfolio, Position, PositionsSummary } from '../../types';

interface UsePortfolioStatsReturn {
  portfolio: Portfolio | null;
  positions: Position[];
  positionsSummary: PositionsSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePortfolioStats(autoRefreshInterval = 10000): UsePortfolioStatsReturn {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionsSummary, setPositionsSummary] = useState<PositionsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      // Fetch portfolio data
      const portfolioResponse = await fetch(`${API_BASE}/api/portfolio`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json();
        setPortfolio(portfolioData);
      } else {
        throw new Error('Failed to fetch portfolio');
      }

      // Fetch positions data
      const positionsResponse = await fetch(`${API_BASE}/api/positions`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (positionsResponse.ok) {
        const positionsData = await positionsResponse.json();
        setPositions(positionsData.positions || []);
        setPositionsSummary(positionsData.summary || null);
      } else {
        throw new Error('Failed to fetch positions');
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching portfolio stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();

    // Set up auto-refresh if interval is provided
    if (autoRefreshInterval > 0) {
      const intervalId = setInterval(fetchPortfolio, autoRefreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchPortfolio, autoRefreshInterval]);

  return {
    portfolio,
    positions,
    positionsSummary,
    loading,
    error,
    refetch: fetchPortfolio,
  };
}
