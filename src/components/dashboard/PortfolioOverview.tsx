import React from 'react';
import { PortfolioStats } from './PortfolioStats';
import { MarketDataCard } from './MarketDataCard';
import { ConnectedAccountsList } from './ConnectedAccountsList';
import { useStore } from '../../store/useStore';
import { usePortfolioData } from '../../hooks/usePortfolioData';
import { useStrategyPerformance } from '../../hooks/api/useStrategyPerformance';

export function PortfolioOverview() {
  const { portfolio, brokerageAccounts, custodialWallets, user } = useStore();
  const { loading: portfolioLoading, accountsLoading } = usePortfolioData();
  const { strategiesData, loading: strategiesLoading } = useStrategyPerformance(user?.id);

  return (
    <div className="space-y-6">
      <PortfolioStats
        totalValue={portfolio?.total_value || 0}
        buyingPower={portfolio?.buying_power || 0}
        dayChange={portfolio?.day_change || 0}
        dayChangePercent={portfolio?.day_change_percent || 0}
        loading={portfolioLoading}
      />

      {strategiesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading active strategies...</span>
          </div>
        </div>
      ) : strategiesData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {strategiesData.map((strategyData) => (
            <MarketDataCard
              key={strategyData.strategy.id}
              strategyData={strategyData}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <p className="text-gray-400 mb-2">No active strategies found</p>
          <p className="text-sm text-gray-500">Create and activate a strategy to see performance data here</p>
        </div>
      )}

      <ConnectedAccountsList
        brokerageAccounts={brokerageAccounts}
        custodialWallets={custodialWallets}
        loading={accountsLoading}
      />
    </div>
  );
}