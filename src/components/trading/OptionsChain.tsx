import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';

interface OptionData {
  bid: number;
  ask: number;
  last: number;
  volume: number;
  open_interest: number;
  implied_volatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  probability_of_success: number;
}

interface OptionStrike {
  strike: number;
  expiration: string;
  days_to_expiration: number;
  call: OptionData;
  put: OptionData;
}

interface OptionsChainData {
  symbol: string;
  current_price: number;
  expirations: string[];
  selected_expiration: string;
  options: OptionStrike[];
  implied_volatility_avg: number;
}

interface OptionsChainProps {
  symbol: string;
  onSelectOption: (type: 'call' | 'put', strike: number, expiration: string, optionData: OptionData) => void;
}

export function OptionsChain({ symbol, onSelectOption }: OptionsChainProps) {
  const [chainData, setChainData] = useState<OptionsChainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [showGreeks, setShowGreeks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOptionsChain = async (expiration?: string) => {
    if (!symbol) return;

    try {
      setLoading(true);
      setError(null);
      const { supabase } = await import('../../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const url = expiration
        ? `${API_BASE}/api/market-data/options-chain?symbol=${symbol}&expiration=${expiration}`
        : `${API_BASE}/api/market-data/options-chain?symbol=${symbol}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch options chain: ${response.statusText}`);
      }

      const data = await response.json();
      setChainData(data);
      setSelectedExpiration(data.selected_expiration);
    } catch (error) {
      console.error('Error fetching options chain:', error);
      setError(error instanceof Error ? error.message : 'Failed to load options chain');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptionsChain();
  }, [symbol]);

  const handleExpirationChange = (expiration: string) => {
    setSelectedExpiration(expiration);
    fetchOptionsChain(expiration);
  };

  const getMoneyness = (strike: number, currentPrice: number) => {
    const diff = ((currentPrice - strike) / strike) * 100;
    if (Math.abs(diff) < 2) return 'ATM';
    if (diff > 0) return 'ITM';
    return 'OTM';
  };

  const getMoneynessColor = (moneyness: string) => {
    switch (moneyness) {
      case 'ITM': return 'text-green-400';
      case 'ATM': return 'text-yellow-400';
      case 'OTM': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  if (!symbol) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-gray-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Select a symbol to view options chain</p>
        </div>
      </Card>
    );
  }

  if (loading && !chainData) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-400" />
          <p className="text-gray-400">Loading options chain...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="text-red-400 mb-2">Failed to load options chain</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => fetchOptionsChain()}
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-white"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  if (!chainData) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Options Chain - {symbol}</h3>
            <p className="text-sm text-gray-400">
              Current Price: ${chainData.current_price.toFixed(2)} | IV: {chainData.implied_volatility_avg}%
            </p>
          </div>
          <button
            onClick={() => fetchOptionsChain(selectedExpiration)}
            disabled={loading}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Expiration Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Expiration Date
          </label>
          <select
            value={selectedExpiration}
            onChange={(e) => handleExpirationChange(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            {chainData.expirations.map((exp) => {
              const daysToExp = Math.ceil((new Date(exp).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              return (
                <option key={exp} value={exp}>
                  {new Date(exp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ({daysToExp} days)
                </option>
              );
            })}
          </select>
        </div>

        {/* Greeks Toggle */}
        <button
          onClick={() => setShowGreeks(!showGreeks)}
          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showGreeks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showGreeks ? 'Hide' : 'Show'} Greeks
        </button>

        {/* Options Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-800 z-10">
              <tr className="text-xs text-gray-400 border-b border-gray-700">
                <th colSpan={5} className="py-2 px-3 text-center border-r border-gray-700 bg-green-500/10">
                  <span className="flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    CALLS
                  </span>
                </th>
                <th className="py-2 px-3 text-center bg-gray-800/50">Strike</th>
                <th colSpan={5} className="py-2 px-3 text-center border-l border-gray-700 bg-red-500/10">
                  <span className="flex items-center justify-center gap-1">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    PUTS
                  </span>
                </th>
              </tr>
              <tr className="text-xs text-gray-400">
                {/* Call Headers */}
                <th className="py-2 px-2 text-left">Bid</th>
                <th className="py-2 px-2 text-left">Ask</th>
                <th className="py-2 px-2 text-left">Vol</th>
                <th className="py-2 px-2 text-left">OI</th>
                <th className="py-2 px-2 text-left border-r border-gray-700">IV</th>
                {/* Strike */}
                <th className="py-2 px-3 text-center bg-gray-800/50"></th>
                {/* Put Headers */}
                <th className="py-2 px-2 text-left border-l border-gray-700">IV</th>
                <th className="py-2 px-2 text-left">OI</th>
                <th className="py-2 px-2 text-left">Vol</th>
                <th className="py-2 px-2 text-left">Ask</th>
                <th className="py-2 px-2 text-left">Bid</th>
              </tr>
            </thead>
            <tbody>
              {chainData.options.map((option, index) => {
                const moneyness = getMoneyness(option.strike, chainData.current_price);
                const isNearMoney = moneyness === 'ATM';

                return (
                  <React.Fragment key={index}>
                    <tr
                      className={`text-sm border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                        isNearMoney ? 'bg-yellow-500/5' : ''
                      }`}
                    >
                      {/* Call Data */}
                      <td
                        className="py-2 px-2 text-white cursor-pointer hover:bg-green-500/20"
                        onClick={() => onSelectOption('call', option.strike, option.expiration, option.call)}
                      >
                        ${option.call.bid.toFixed(2)}
                      </td>
                      <td
                        className="py-2 px-2 text-white cursor-pointer hover:bg-green-500/20"
                        onClick={() => onSelectOption('call', option.strike, option.expiration, option.call)}
                      >
                        ${option.call.ask.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-gray-400">{option.call.volume.toLocaleString()}</td>
                      <td className="py-2 px-2 text-gray-400">{option.call.open_interest.toLocaleString()}</td>
                      <td className="py-2 px-2 text-gray-400 border-r border-gray-700">
                        {option.call.implied_volatility}%
                      </td>

                      {/* Strike */}
                      <td className={`py-2 px-3 text-center font-semibold bg-gray-800/50 ${getMoneynessColor(moneyness)}`}>
                        ${option.strike.toFixed(2)}
                        {isNearMoney && <span className="text-xs ml-1">ATM</span>}
                      </td>

                      {/* Put Data */}
                      <td className="py-2 px-2 text-gray-400 border-l border-gray-700">
                        {option.put.implied_volatility}%
                      </td>
                      <td className="py-2 px-2 text-gray-400">{option.put.open_interest.toLocaleString()}</td>
                      <td className="py-2 px-2 text-gray-400">{option.put.volume.toLocaleString()}</td>
                      <td
                        className="py-2 px-2 text-white cursor-pointer hover:bg-red-500/20"
                        onClick={() => onSelectOption('put', option.strike, option.expiration, option.put)}
                      >
                        ${option.put.ask.toFixed(2)}
                      </td>
                      <td
                        className="py-2 px-2 text-white cursor-pointer hover:bg-red-500/20"
                        onClick={() => onSelectOption('put', option.strike, option.expiration, option.put)}
                      >
                        ${option.put.bid.toFixed(2)}
                      </td>
                    </tr>

                    {/* Greeks Row (if enabled) */}
                    {showGreeks && (
                      <tr className="text-xs bg-gray-800/30 border-b border-gray-800">
                        <td colSpan={5} className="py-2 px-2 border-r border-gray-700">
                          <div className="grid grid-cols-5 gap-2 text-gray-400">
                            <div>Δ: {option.call.delta.toFixed(3)}</div>
                            <div>Γ: {option.call.gamma.toFixed(4)}</div>
                            <div>Θ: {option.call.theta.toFixed(3)}</div>
                            <div>V: {option.call.vega.toFixed(3)}</div>
                            <div>PoS: {option.call.probability_of_success.toFixed(1)}%</div>
                          </div>
                        </td>
                        <td className="py-2 px-3 bg-gray-800/50"></td>
                        <td colSpan={5} className="py-2 px-2 border-l border-gray-700">
                          <div className="grid grid-cols-5 gap-2 text-gray-400">
                            <div>PoS: {option.put.probability_of_success.toFixed(1)}%</div>
                            <div>V: {option.put.vega.toFixed(3)}</div>
                            <div>Θ: {option.put.theta.toFixed(3)}</div>
                            <div>Γ: {option.put.gamma.toFixed(4)}</div>
                            <div>Δ: {option.put.delta.toFixed(3)}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-800">
          <p><strong>Moneyness:</strong> ITM (In The Money) | ATM (At The Money) | OTM (Out of The Money)</p>
          <p><strong>Greeks:</strong> Δ=Delta | Γ=Gamma | Θ=Theta | V=Vega | PoS=Probability of Success</p>
          <p><strong>Tip:</strong> Click on bid/ask prices to select an option for trading</p>
        </div>
      </div>
    </Card>
  );
}
