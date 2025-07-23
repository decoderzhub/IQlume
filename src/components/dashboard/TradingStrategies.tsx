import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Settings, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency } from '../../lib/utils';

const mockStrategies: TradingStrategy[] = [
  {
    id: '1',
    name: 'Covered Calls - AAPL',
    type: 'covered_calls',
    description: 'Conservative income strategy on Apple stock',
    risk_level: 'low',
    min_capital: 15000,
    is_active: true,
    configuration: {
      symbol: 'AAPL',
      strike_delta: 0.3,
      dte_target: 30,
      profit_target: 0.5,
    },
  },
  {
    id: '2',
    name: 'Iron Condor - SPY',
    type: 'iron_condor',
    description: 'Range-bound strategy on S&P 500 ETF',
    risk_level: 'medium',
    min_capital: 5000,
    is_active: false,
    configuration: {
      symbol: 'SPY',
      wing_width: 10,
      dte_target: 45,
      profit_target: 0.25,
    },
  },
  {
    id: '3',
    name: 'Crypto Martingale - BTC',
    type: 'martingale',
    description: 'Double-down strategy for Bitcoin',
    risk_level: 'high',
    min_capital: 10000,
    is_active: true,
    configuration: {
      symbol: 'BTCUSD',
      base_size: 0.01,
      max_levels: 5,
      grid_spacing: 0.02,
    },
  },
];

export function TradingStrategies() {
  const getRiskColor = (level: TradingStrategy['risk_level']) => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'high': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Active Strategies</h3>
        <Button size="sm">
          <TrendingUp className="w-4 h-4 mr-2" />
          New Strategy
        </Button>
      </div>

      <div className="space-y-4">
        {mockStrategies.map((strategy, index) => (
          <motion.div
            key={strategy.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-white">{strategy.name}</h4>
                <p className="text-sm text-gray-400">{strategy.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(strategy.risk_level)}`}>
                  {strategy.risk_level} risk
                </span>
                <div className={`w-2 h-2 rounded-full ${strategy.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Min Capital: {formatCurrency(strategy.min_capital)}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant={strategy.is_active ? 'secondary' : 'primary'}
                  size="sm"
                >
                  {strategy.is_active ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}