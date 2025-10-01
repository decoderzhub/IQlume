import React from 'react';
import { Wallet, Shield } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';

interface BrokerageAccount {
  id: string;
  brokerage: string;
  account_name: string;
  account_type: string;
  account_number?: string;
  balance: number;
  is_connected: boolean;
  last_sync?: string;
}

interface CustodialWallet {
  id: string;
  wallet_name: string;
  balance_usd: number;
  balance_treasuries: number;
  apy: number;
}

interface ConnectedAccountsListProps {
  brokerageAccounts: BrokerageAccount[];
  custodialWallets: CustodialWallet[];
  loading?: boolean;
}

export function ConnectedAccountsList({
  brokerageAccounts,
  custodialWallets,
  loading = false,
}: ConnectedAccountsListProps) {
  const getBrokerageIcon = (brokerage: string) => {
    const icons: Record<string, string> = {
      alpaca: '🦙',
      schwab: '🏦',
      coinbase: '₿',
      binance: '🟡',
    };
    return icons[brokerage] || '📊';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Connected Accounts</h3>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading accounts...</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Connected Accounts</h3>

      {brokerageAccounts.length === 0 ? (
        <div className="text-center py-8">
          <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-white mb-2">No Connected Accounts</h4>
          <p className="text-gray-400 mb-4">Connect your first brokerage account to start trading</p>
        </div>
      ) : (
        <div className="space-y-4">
          {brokerageAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-3 h-3 rounded-full ${
                    account.is_connected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <div className="text-2xl">{getBrokerageIcon(account.brokerage)}</div>
                <div>
                  <p className="font-medium text-white">{account.account_name}</p>
                  <p className="text-sm text-gray-400 capitalize">
                    {account.brokerage} • {account.account_type}
                  </p>
                  {account.account_number && (
                    <p className="text-xs text-gray-500">Account: {account.account_number}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">{formatCurrency(account.balance)}</p>
                <p className="text-sm text-gray-400">
                  Last sync: {account.last_sync ? new Date(account.last_sync).toLocaleString() : 'Never'}
                </p>
                <p className="text-xs text-gray-500">
                  {account.is_connected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {custodialWallets.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h4 className="text-md font-semibold text-white mb-4">Available Trading Capital</h4>
          <div className="space-y-3">
            {custodialWallets.map((wallet) => (
              <div
                key={wallet.id}
                className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="font-medium text-white text-sm">{wallet.wallet_name}</p>
                    <p className="text-xs text-gray-400">
                      APY: {(wallet.apy * 100).toFixed(2)}% • FDIC Insured
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-400">
                    {formatCurrency(wallet.balance_usd + wallet.balance_treasuries)}
                  </p>
                  <p className="text-xs text-gray-400">Available for trading</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
