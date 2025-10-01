import React from 'react';
import { PortfolioStats } from './PortfolioStats';
import { MarketDataCard } from './MarketDataCard';
import { ConnectedAccountsList } from './ConnectedAccountsList';
import { useStore } from '../../store/useStore';
import { usePortfolioData } from '../../hooks/usePortfolioData';

export function PortfolioOverview() {
  const { portfolio, brokerageAccounts, custodialWallets } = useStore();
  const { marketData, historicalData, loading, accountsLoading } = usePortfolioData();

  return (
    <div className="space-y-6">
      <PortfolioStats
        totalValue={portfolio?.total_value || 0}
        buyingPower={portfolio?.buying_power || 0}
        dayChange={portfolio?.day_change || 0}
        dayChangePercent={portfolio?.day_change_percent || 0}
        loading={loading}
      />

      {marketData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(marketData).map(([symbol, data]: [string, any]) => (
            <MarketDataCard
              key={symbol}
              symbol={symbol}
              data={data}
              historicalData={historicalData[symbol]}
            />
          ))}
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