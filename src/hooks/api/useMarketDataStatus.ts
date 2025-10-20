import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';

interface MarketDataStatus {
  available: boolean;
  total_symbols: number;
  total_records: number;
  symbols: string[];
  last_updated: string;
  message?: string;
}

export function useMarketDataStatus() {
  const [status, setStatus] = useState<MarketDataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api/market-data/data-status');
      setStatus(response);
    } catch (err: any) {
      console.error('Error fetching market data status:', err);
      setError(err.message || 'Failed to fetch market data status');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { status, loading, error, refetch: fetchStatus };
}
