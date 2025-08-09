import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Wallet, CreditCard, Building, Shield, TrendingUp, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ConnectBrokerageModal } from './ConnectBrokerageModal';
import { ConnectBankModal } from './ConnectBankModal';
import { CustodialWalletModal } from './CustodialWalletModal';
import { TransferAssetsModal } from './TransferAssetsModal';
import { BrokerageAccount, BankAccount, CustodialWallet } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';

const mockBrokerageAccounts: BrokerageAccount[] = [
  {
    id: '1',
    user_id: '1',
    brokerage: 'schwab',
    account_name: 'Charles Schwab Brokerage',
    account_type: 'stocks',
    balance: 125420.50,
    is_connected: true,
    last_sync: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    user_id: '1',
    brokerage: 'coinbase',
    account_name: 'Coinbase Pro',
    account_type: 'crypto',
    balance: 45000.00,
    is_connected: true,
    last_sync: '2024-01-15T10:25:00Z',
  },
];

const mockBankAccounts: BankAccount[] = [
  {
    id: '1',
    user_id: '1',
    bank_name: 'Chase',
    account_name: 'Chase Checking',
    account_type: 'checking',
    account_number_masked: '****1234',
    routing_number: '021000021',
    balance: 15420.50,
    is_verified: true,
    plaid_account_id: 'plaid_123',
    plaid_access_token: 'access_token_123',
    last_sync: '2024-01-15T09:30:00Z',
  },
];

const mockCustodialWallets: CustodialWallet[] = [
  {
    id: '1',
    user_id: '1',
    wallet_name: 'High-Yield Treasury Wallet',
    balance_usd: 25000.00,
    balance_treasuries: 75000.00,
    apy: 0.0485,
    is_fdic_insured: true,
    created_at: '2024-01-01T00:00:00Z',
  },
];

export function AccountsView() {
  const [showBrokerageModal, setShowBrokerageModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [brokerageAccounts, setBrokerageAccounts] = useState(mockBrokerageAccounts);
  const [bankAccounts, setBankAccounts] = useState(mockBankAccounts);
  const [custodialWallets, setCustodialWallets] = useState(mockCustodialWallets);

  const totalBrokerageValue = brokerageAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalBankValue = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalWalletValue = custodialWallets.reduce((sum, wallet) => sum + wallet.balance_usd + wallet.balance_treasuries, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Brokerage</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalBrokerageValue)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Bank Accounts</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(totalBankValue)}</p>
            </div>
            <Building className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Custodial Wallets</p>
              <p className="text-2xl font-bold text-purple-400">{formatCurrency(totalWalletValue)}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Assets</p>
              <p className="text-2xl font-bold text-yellow-400">
                {formatCurrency(totalBrokerageValue + totalBankValue + totalWalletValue)}
              </p>
            </div>
            <Wallet className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => setShowBrokerageModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Connect Brokerage
        </Button>
        <Button variant="secondary" onClick={() => setShowBankModal(true)}>
          <Building className="w-4 h-4 mr-2" />
          Link Bank Account
        </Button>
        <Button variant="outline" onClick={() => setShowWalletModal(true)}>
          <Shield className="w-4 h-4 mr-2" />
          Create Custodial Wallet
        </Button>
        <Button variant="outline" onClick={() => setShowTransferModal(true)}>
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Transfer Assets
        </Button>
      </div>

      {/* Brokerage Accounts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Brokerage Accounts</h3>
          <Button size="sm" variant="ghost">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync All
          </Button>
        </div>
        
        <div className="space-y-4">
          {brokerageAccounts.map((account) => (
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
                <p className="text-sm text-gray-400">
                  Last sync: {formatDate(account.last_sync)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Bank Accounts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Bank Accounts</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Shield className="w-4 h-4" />
            Secured by Plaid
          </div>
        </div>
        
        <div className="space-y-4">
          {bankAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${account.is_verified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div>
                  <p className="font-medium text-white">{account.account_name}</p>
                  <p className="text-sm text-gray-400">
                    {account.bank_name} • {account.account_number_masked}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">{formatCurrency(account.balance)}</p>
                <p className="text-sm text-gray-400">
                  {account.is_verified ? 'Verified' : 'Pending verification'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Custodial Wallets */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Custodial Wallets</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Shield className="w-4 h-4" />
            FDIC Insured
          </div>
        </div>
        
        <div className="space-y-4">
          {custodialWallets.map((wallet) => (
            <div key={wallet.id} className="p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-white">{wallet.wallet_name}</p>
                  <p className="text-sm text-gray-400">
                    APY: {(wallet.apy * 100).toFixed(2)}% • FDIC Insured
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">
                    {formatCurrency(wallet.balance_usd + wallet.balance_treasuries)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">USD Balance:</span>
                  <span className="text-white ml-2">{formatCurrency(wallet.balance_usd)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Treasury Balance:</span>
                  <span className="text-white ml-2">{formatCurrency(wallet.balance_treasuries)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modals */}
      {showBrokerageModal && (
        <ConnectBrokerageModal
          onClose={() => setShowBrokerageModal(false)}
          onConnect={(account) => {
            setBrokerageAccounts(prev => [...prev, { ...account, id: Date.now().toString() }]);
            setShowBrokerageModal(false);
          }}
        />
      )}

      {showBankModal && (
        <ConnectBankModal
          onClose={() => setShowBankModal(false)}
          onConnect={(account) => {
            setBankAccounts(prev => [...prev, { ...account, id: Date.now().toString() }]);
            setShowBankModal(false);
          }}
        />
      )}

      {showWalletModal && (
        <CustodialWalletModal
          onClose={() => setShowWalletModal(false)}
          onCreate={(wallet) => {
            setCustodialWallets(prev => [...prev, { ...wallet, id: Date.now().toString() }]);
            setShowWalletModal(false);
          }}
        />
      )}

      {showTransferModal && (
        <TransferAssetsModal
          onClose={() => setShowTransferModal(false)}
          brokerageAccounts={brokerageAccounts}
        />
      )}
    </motion.div>
  );
}