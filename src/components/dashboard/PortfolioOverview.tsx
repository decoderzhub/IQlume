import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { useStore } from '../../store/useStore';

// Mock data - replace with real data from your API
const mockPortfolio = {
  total_value: 125420.50,
  day_change: 1247.82,
  day_change_percent: 1.01,
  accounts: [
    {
      id: '1',
      user_id: '1',
      brokerage: 'alpaca' as const,
      account_name: 'Main Trading',
      account_type: 'stocks' as const,
      balance: 85420.50,
      is_connected: true,
      last_sync: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      user_id: '1',
      brokerage: 'binance' as const,
      account_name: 'Crypto Portfolio',
      account_type: 'crypto' as const,
      balance: 40000.00,
      is_connected: true,
      last_sync: '2024-01-15T10:25:00Z',
    },
  ],
};

export function PortfolioOverview() {
  const { portfolio: storePortfolio } = useStore();
  const portfolio = storePortfolio ?? mockPortfolio;
  const isPositive = portfolio.day_change >= 0;

  const stats = [
    {
      label: 'Total Value',
      value: formatCurrency(portfolio.total_value),
      icon: DollarSign,
      color: 'text-blue-400',
    },
    {
      label: 'Today\'s Change',
      value: formatCurrency(Math.abs(portfolio.day_change)),
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Day Change %',
      value: formatPercent(Math.abs(portfolio.day_change_percent)),
      icon: Activity,
      color: isPositive ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Connected Accounts',
      value: portfolio.accounts.filter(acc => acc.is_connected).length.toString(),
      icon: Activity,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card hoverable className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Connected Accounts</h3>
        <div className="space-y-4">
          {portfolio.accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${account.is_connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <p className="font-medium text-white">{account.account_name}</p>
                  <p className="text-sm text-gray-400 capitalize">
                    {account.brokerage} • {account.account_type}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">{formatCurrency(account.balance)}</p>
                <p className="text-sm text-gray-400">Last sync: just now</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}