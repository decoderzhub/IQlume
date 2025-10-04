import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';

interface AlpacaConnectionStatus {
  connected: boolean;
  account_id?: string;
  account_name?: string;
  alpaca_account_id?: string;
  environment?: string;
  is_paper?: boolean;
  api_base?: string;
  account_status?: string;
  balance?: number;
  last_sync?: string;
  connected_at?: string;
  message?: string;
}

export function AlpacaConnectionStatus() {
  const [status, setStatus] = useState<AlpacaConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnectionStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/alpaca/connection-status`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch connection status: ${response.statusText}`);
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Error fetching Alpaca connection status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch connection status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Checking Alpaca connection...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-500/50">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  if (!status?.connected) {
    return (
      <Card className="p-6 border-yellow-500/50">
        <div className="flex items-center gap-2 text-yellow-400">
          <AlertCircle className="w-5 h-5" />
          <span>{status?.message || 'No Alpaca account connected'}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-green-500/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">
              Alpaca Connected
            </h3>
          </div>
          <button
            onClick={fetchConnectionStatus}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400">Account Name</p>
            <p className="text-white font-medium">{status.account_name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-400">Environment</p>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  status.is_paper
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {status.is_paper ? 'PAPER TRADING' : 'LIVE TRADING'}
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400">Account ID</p>
            <p className="text-white font-mono text-sm">{status.alpaca_account_id}</p>
          </div>

          <div>
            <p className="text-sm text-gray-400">Status</p>
            <p className="text-white capitalize">{status.account_status}</p>
          </div>

          <div>
            <p className="text-sm text-gray-400">API Base</p>
            <p className="text-white text-sm font-mono break-all">{status.api_base}</p>
          </div>

          <div>
            <p className="text-sm text-gray-400">Balance</p>
            <p className="text-white font-medium">
              ${status.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {status.is_paper && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-400">
              📝 <strong>Paper Trading Mode:</strong> All orders will be executed in Alpaca's paper trading environment.
              No real money is at risk. Orders will be visible in your Alpaca paper trading dashboard.
            </p>
          </div>
        )}

        {!status.is_paper && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">
              ⚠️ <strong>Live Trading Mode:</strong> Orders will be executed with real money in your Alpaca live account.
              Please ensure you understand the risks before trading.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
