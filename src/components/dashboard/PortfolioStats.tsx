import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Activity, Wallet, LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCurrency, formatPercent } from '../../lib/utils';

interface StatConfig {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

interface PortfolioStatsProps {
  totalValue: number;
  buyingPower: number;
  dayChange: number;
  dayChangePercent: number;
  loading?: boolean;
}

export function PortfolioStats({
  totalValue,
  buyingPower,
  dayChange,
  dayChangePercent,
  loading = false,
}: PortfolioStatsProps) {
  const isPositive = dayChange >= 0;

  const stats: StatConfig[] = [
    {
      label: 'Total Value',
      value: formatCurrency(totalValue),
      icon: DollarSign,
      color: 'text-blue-400',
    },
    {
      label: 'Buying Power',
      value: formatCurrency(buyingPower),
      icon: Wallet,
      color: 'text-green-400',
    },
    {
      label: "Today's Change",
      value: formatCurrency(Math.abs(dayChange)),
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Day Change %',
      value: formatPercent(Math.abs(dayChangePercent)),
      icon: Activity,
      color: isPositive ? 'text-green-400' : 'text-red-400',
    },
  ];

  return (
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
                  {loading && stat.label === 'Total Value' && (
                    <p className="text-xs text-gray-500 mt-1">Updating...</p>
                  )}
                </div>
                <Icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
