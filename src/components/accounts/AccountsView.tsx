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
import { DepositFundsModal } from './DepositFundsModal';
import { useStore } from '../../store/useStore';

export function AccountsView() {
  const [showBrokerageModal, setShowBrokerageModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedWalletForDeposit, setSelectedWalletForDeposit] = useState<CustodialWallet | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { 
    brokerageAccounts, 
    bankAccounts, 
    custodialWallets, 
    setBrokerageAccounts, 
    setBankAccounts, 
    setCustodialWallets,
    updatePortfolioFromAccounts 
  } = useStore();

  React.useEffect(() => {
    // Simulate loading completion
    setLoading(false);
  }, []);

  const totalBrokerageValue = brokerageAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalBankValue = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalWalletValue = custodialWallets.reduce((sum, wallet) => sum + wallet.balance_usd + wallet.balance_treasuries, 0);
  const buyingPower = totalBankValue + custodialWallets.reduce((sum, wallet) => sum + wallet.balance_usd, 0);

  const handleBrokerageConnect = (account: Omit<BrokerageAccount, 'id'>) => {
    const newAccount = { ...account, id: Date.now().toString() };
    setBrokerageAccounts([...brokerageAccounts, newAccount]);
    updatePortfolioFromAccounts();
    setShowBrokerageModal(false);
  };

  const handleBankConnect = (account: Omit<BankAccount, 'id'>) => {
    const newAccount = { ...account, id: Date.now().toString() };
    setBankAccounts([...bankAccounts, newAccount]);
    updatePortfolioFromAccounts();
    setShowBankModal(false);
  };

  const handleWalletCreate = (wallet: Omit<CustodialWallet, 'id'>) => {
    const newWallet = { ...wallet, id: Date.now().toString() };
    setCustodialWallets([...custodialWallets, newWallet]);
    updatePortfolioFromAccounts();
    setShowWalletModal(false);
  };

  const handleDeposit = (walletId: string, amount: number) => {
    const updatedWallets = custodialWallets.map(wallet =>
      wallet.id === walletId
        ? { ...wallet, balance_usd: wallet.balance_usd + amount }
        : wallet
    );
    setCustodialWallets(updatedWallets);
    updatePortfolioFromAccounts();
    setShowDepositModal(false);
    setSelectedWalletForDeposit(null);
  };

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
              <p className="text-sm font-medium text-gray-400">Buying Power</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(buyingPower)}</p>
            </div>
            <Wallet className="w-8 h-8 text-green-400" />
          </div>
        </Card>

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
              <p className="text-2xl font-bold text-white">{formatCurrency(totalBankValue)}</p>
            </div>
            <Building className="w-8 h-8 text-blue-400" />
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
        <Button variant="secondary" onClick={() => setShowWalletModal(true)}>
          <Shield className="w-4 h-4 mr-2" />
          Create Custodial Wallet
        </Button>
        <Button variant="secondary" onClick={() => setShowTransferModal(true)}>
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
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-gray-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading accounts...</span>
            </div>
          </div>
        ) : brokerageAccounts.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-white mb-2">No Connected Accounts</h4>
            <p className="text-gray-400 mb-4">Connect your first brokerage account to start trading</p>
            <Button onClick={() => setShowBrokerageModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Connect Brokerage
            </Button>
          </div>
        ) : (
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
        )}
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedWalletForDeposit(wallet);
                      setShowDepositModal(true);
                    }}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Deposit
                  </Button>
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
          onConnect={handleBrokerageConnect}
        />
      )}

      {showBankModal && (
        <ConnectBankModal
          onClose={() => setShowBankModal(false)}
          onConnect={handleBankConnect}
        />
      )}

      {showWalletModal && (
        <CustodialWalletModal
          onClose={() => setShowWalletModal(false)}
          onCreate={handleWalletCreate}
        />
      )}

      {showDepositModal && selectedWalletForDeposit && (
        <DepositFundsModal
          wallet={selectedWalletForDeposit}
          onClose={() => {
            setShowDepositModal(false);
            setSelectedWalletForDeposit(null);
          }}
          onDeposit={handleDeposit}
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