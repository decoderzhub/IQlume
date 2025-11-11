import React, { useState, useEffect } from 'react';
import { useMarketDataStats } from '../../hooks/useMarketData';
import { Card } from '../ui/Card';
import { Activity, Wifi, WifiOff, RefreshCw, Radio } from 'lucide-react';
import { wsManager } from '../../services/WebSocketManager';

export function MarketDataDebugPanel() {
  const stats = useMarketDataStats();
  const [wsStatus, setWsStatus] = useState(wsManager.getConnectionState());

  useEffect(() => {
    const interval = setInterval(() => {
      setWsStatus(wsManager.getConnectionState());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number | null) => {
    if (ms === null) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getWsStatusColor = () => {
    switch (wsStatus) {
      case 'CONNECTED': return 'text-green-400';
      case 'CONNECTING': return 'text-yellow-400';
      case 'CLOSING': return 'text-orange-400';
      case 'DISCONNECTED': return 'text-gray-500';
      default: return 'text-red-400';
    }
  };

  return (
    <Card className="p-6 bg-gray-800/50 border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Market Data Manager Stats</h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {stats.isPolling ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-gray-500" />
            )}
            <span className="text-sm text-gray-400">Polling Status</span>
          </div>
          <p className="text-xl font-bold text-white">
            {stats.isPolling ? 'Active' : 'Inactive'}
          </p>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Radio className={`w-4 h-4 ${getWsStatusColor()}`} />
            <span className="text-sm text-gray-400">WebSocket</span>
          </div>
          <p className={`text-xl font-bold ${getWsStatusColor()}`}>
            {wsStatus}
          </p>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">Active Subscriptions</span>
          </div>
          <p className="text-xl font-bold text-white">{stats.activeSubscriptions}</p>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-400">Cached Symbols</span>
          </div>
          <p className="text-xl font-bold text-white">{stats.cachedSymbols}</p>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-400">Poll Interval</span>
          </div>
          <p className="text-xl font-bold text-white">
            {(stats.currentInterval / 1000).toFixed(0)}s
          </p>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-gray-400">Last Update</span>
          </div>
          <p className="text-xl font-bold text-white">
            {formatTime(stats.timeSinceLastFetch)}
          </p>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-400">Error Count</span>
          </div>
          <p className="text-xl font-bold text-white">{stats.errorCount}</p>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">Market Status</span>
          </div>
          <p className="text-xl font-bold text-white">
            {stats.isMarketOpen ? 'Open' : 'Closed'}
          </p>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-gray-400">Tab Status</span>
          </div>
          <p className="text-xl font-bold text-white">
            {stats.isTabActive ? 'Active' : 'Inactive'}
          </p>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          <strong>Network Optimization:</strong> All market data is now fetched through a single centralized manager.
          Instead of multiple components each polling independently, there is ONE coordinated request that serves all subscribers.
        </p>
        <ul className="mt-2 text-xs text-blue-200 space-y-1">
          <li>• Polling adjusts based on market hours and tab visibility</li>
          <li>• WebSocket integration provides real-time updates when available</li>
          <li>• Automatic subscription cleanup prevents memory leaks</li>
          <li>• Shared cache eliminates redundant network requests</li>
        </ul>
      </div>
    </Card>
  );
}
