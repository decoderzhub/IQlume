import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PortfolioOverview } from './PortfolioOverview';
import { PositionsCard } from './PositionsCard';
import { TradingStrategies } from './TradingStrategies';
import { RecentTrades } from './RecentTrades';
import { BotStatusDashboard } from '../bots/BotStatusDashboard';
import { Activity, AlertCircle, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { apiClient } from '../../lib/api-client';

export function Dashboard() {
  const [showBotDashboard, setShowBotDashboard] = useState(false);
  const [alpacaConnected, setAlpacaConnected] = useState<boolean | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAlpacaConnection = async () => {
      try {
        const status = await apiClient.get<{ connected: boolean }>('/api/alpaca/connection-status');
        setAlpacaConnected(status.connected);
      } catch (err) {
        console.error('Error checking Alpaca connection:', err);
        setAlpacaConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    };

    checkAlpacaConnection();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Beta Disclaimer Banner */}
      <Card className="p-6 border border-blue-500/50 bg-blue-500/5">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">
              BETA - Paper Trading Only
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              BrokerNomex is currently in beta testing. All strategies execute with <strong>paper trading only</strong> (simulated trading with virtual money).
              No real money is at risk. Live trading will be enabled after successful beta validation.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Strategy execution is fully automated and orders are sent to Alpaca's paper trading environment for testing.
            </p>
          </div>
        </div>
      </Card>

      {/* Alpaca Connection Status Banner */}
      {!checkingConnection && (
        <Card className={`p-6 border ${
          alpacaConnected === false
            ? 'border-yellow-500/50 bg-yellow-500/5'
            : alpacaConnected === true
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-gray-700 bg-gray-800/30'
        }`}>
          <div className="flex items-start gap-4">
            {alpacaConnected === false ? (
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            ) : alpacaConnected === true ? (
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            ) : (
              <XCircle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              {alpacaConnected === false ? (
                <>
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                    No Alpaca Account Connected
                  </h3>
                  <p className="text-gray-300 mb-4">
                    You need to connect your Alpaca brokerage account to access market data, view portfolio information, and execute trades.
                    The connection is secure and uses OAuth 2.0 authentication.
                  </p>
                  <ul className="text-sm text-gray-400 mb-4 space-y-1 list-disc list-inside">
                    <li>All current market data requests are returning "Unauthorized" errors</li>
                    <li>Portfolio and position data cannot be fetched</li>
                    <li>Trading functionality is disabled</li>
                  </ul>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => navigate('/accounts')}
                      className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Connect Alpaca Account Now
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => window.open('https://alpaca.markets', '_blank')}
                    >
                      Learn About Alpaca
                    </Button>
                  </div>
                </>
              ) : alpacaConnected === true ? (
                <>
                  <h3 className="text-lg font-semibold text-green-400 mb-2">
                    Alpaca Account Connected
                  </h3>
                  <p className="text-gray-300">
                    Your Alpaca brokerage account is connected and ready for trading.
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <button
          onClick={() => setShowBotDashboard(!showBotDashboard)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Activity className="w-5 h-5" />
          {showBotDashboard ? 'Hide' : 'Show'} Bot Status
        </button>
      </div>

      {showBotDashboard && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <BotStatusDashboard />
        </motion.div>
      )}

      <PortfolioOverview />

      <PositionsCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TradingStrategies />
        <RecentTrades />
      </div>
    </motion.div>
  );
}