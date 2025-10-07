import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Wallet, CreditCard, Building, Shield, TrendingUp, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ConnectBrokerageModal } from './ConnectBrokerageModal';
import { ConnectBankModal } from './ConnectBankModal';
import { CustodialWalletModal } from './CustodialWalletModal';
import { TransferAssetsModal } from './TransferAssetsModal';
import { AlpacaConnectionStatus } from './AlpacaConnectionStatus';
import { AlpacaOAuthDebugger } from './AlpacaOAuthDebugger';
import { BrokerageAccount, BankAccount, CustodialWallet } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { DepositFundsModal } from './DepositFundsModal';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';

export function AccountsView() {
  const [showBrokerageModal, setShowBrokerageModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedWalletForDeposit, setSelectedWalletForDeposit] = useState<CustodialWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnectingAccountId, setDisconnectingAccountId] = useState<string | null>(null);
  
  const { 
    user,
    brokerageAccounts, 
    bankAccounts, 
    custodialWallets, 
    setBrokerageAccounts, 
    setBankAccounts, 
    setCustodialWallets,
    updatePortfolioFromAccounts 
  } = useStore();

  React.useEffect(() => {
    // Check for OAuth callback status in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const message = urlParams.get('message');
    
    if (status === 'success' && message) {
      alert(decodeURIComponent(message));
      // Clean up URL params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'error' && message) {
      alert(`Error: ${decodeURIComponent(message)}`);
      // Clean up URL params
      window.history.replaceState({}, '', window.location.pathname);
    }

    const fetchBrokerageAccounts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setError(null);

        // Fetch connected accounts from Supabase
        const { data: accounts, error: fetchError } = await supabase
          .from('brokerage_accounts')
          .select('*')
          .eq('user_id', user.id);

        if (fetchError) {
          throw new Error(`Failed to fetch brokerage accounts: ${fetchError.message}`);
        }

        const transformedAccounts: BrokerageAccount[] = (accounts || []).map((account: any) => ({
          id: account.id,
          user_id: account.user_id,
          brokerage: account.brokerage,
          account_name: account.account_name,
          account_type: account.account_type,
          balance: account.balance,
          is_connected: account.is_connected,
          last_sync: account.last_sync,
          oauth_token: account.oauth_token,
          account_number: account.account_number,
          routing_number: account.routing_number,
        }));

        setBrokerageAccounts(transformedAccounts);

        // Clear dummy data - these features are coming soon
        setBankAccounts([]);
        setCustodialWallets([]);
        updatePortfolioFromAccounts();

      } catch (error) {
        console.error('Error fetching brokerage accounts:', error);
        setError(error instanceof Error ? error.message : 'Failed to load accounts');
      } finally {
        setLoading(false);
      }
    };

    fetchBrokerageAccounts();
  }, [user, setBrokerageAccounts, setBankAccounts, setCustodialWallets, updatePortfolioFromAccounts]);

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

  const handleDisconnectBrokerage = async (accountId: string, accountName: string) => {
    if (!user) {
      alert('You must be logged in to disconnect accounts');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to disconnect "${accountName}"?\n\n` +
      'This will:\n' +
      '• Remove the account from your dashboard\n' +
      '• Stop all automated trading strategies using this account\n' +
      '• Revoke brokernomex\'s access to your Alpaca account\n\n' +
      'You can reconnect the account later if needed.'
    );

    if (!confirmed) return;

    setDisconnectingAccountId(accountId);

    try {
      // Delete from Supabase
      const { error: deleteError } = await supabase
        .from('brokerage_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user?.id);

      if (deleteError) {
        throw new Error(`Failed to disconnect account: ${deleteError.message}`);
      }

      // Remove from local state
      const updatedAccounts = brokerageAccounts.filter(acc => acc.id !== accountId);
      setBrokerageAccounts(updatedAccounts);
      updatePortfolioFromAccounts();

      alert(`"${accountName}" has been disconnected successfully.`);

    } catch (error) {
      console.error('Error disconnecting brokerage account:', error);
      alert(`Failed to disconnect account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDisconnectingAccountId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {error && (
        <Card className="p-6 bg-red-500/10 border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">!</span>
            </div>
            <div>
              <h3 className="font-medium text-red-400">Error Loading Accounts</h3>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        </Card>
      )}

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

      {/* Alpaca Connection Status */}
      <AlpacaConnectionStatus />

      {/* OAuth Configuration Debugger */}
      <AlpacaOAuthDebugger />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => setShowBrokerageModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Connect Brokerage
        </Button>
        <Button variant="secondary" disabled className="opacity-50 cursor-not-allowed">
          <Building className="w-4 h-4 mr-2" />
          Link Bank Account (Coming Soon)
        </Button>
        <Button variant="secondary" disabled className="opacity-50 cursor-not-allowed">
          <Shield className="w-4 h-4 mr-2" />
          Create Custodial Wallet (Coming Soon)
        </Button>
        <Button variant="secondary" disabled className="opacity-50 cursor-not-allowed">
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Transfer Assets (Coming Soon)
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
            <div key={account.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${account.is_connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="text-2xl">
                  {account.brokerage === 'alpaca' && '🦙'}
                  {account.brokerage === 'schwab' && '🏦'}
                  {account.brokerage === 'coinbase' && '₿'}
                  {account.brokerage === 'binance' && '🟡'}
                  {!['alpaca', 'schwab', 'coinbase', 'binance'].includes(account.brokerage) && '📊'}
                </div>
                <div>
                  <p className="font-medium text-white">{account.account_name}</p>
                  <p className="text-sm text-gray-400 capitalize">
                    {account.brokerage} • {account.account_type}
                  </p>
                  {account.account_number && (
                    <p className="text-xs text-gray-500">
                      Account: {account.account_number}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium text-white">{formatCurrency(account.balance)}</p>
                  <p className="text-sm text-gray-400">
                    Last sync: {formatDate(account.last_sync)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {account.is_connected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
                
                {/* Disconnect Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnectBrokerage(account.id, account.account_name)}
                  disabled={disconnectingAccountId === account.id}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
                  title="Disconnect account"
                >
                  {disconnectingAccountId === account.id ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
        )}
      </Card>

      {/* Disconnect Account Warning */}
      {brokerageAccounts.some(acc => acc.brokerage === 'alpaca') && (
        <Card className="p-6 bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-400 mb-2">Account Management</h4>
              <p className="text-sm text-yellow-300 leading-relaxed">
                You can disconnect any connected brokerage account using the trash icon. This will:
              </p>
              <ul className="text-sm text-yellow-300 mt-2 space-y-1">
                <li>• Remove the account from your brokernomex dashboard</li>
                <li>• Stop all automated strategies using that account</li>
                <li>• Revoke brokernomex's access to your brokerage account</li>
                <li>• Preserve your trading history for record-keeping</li>
              </ul>
              <p className="text-sm text-yellow-300 mt-2">
                You can always reconnect the same account later if needed.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Bank Accounts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Bank Accounts</h3>
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            Coming Soon
          </div>
        </div>
        
        <div className="text-center py-12">
          <Building className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h4 className="text-xl font-medium text-white mb-2">Bank Account Integration</h4>
          <p className="text-gray-400 mb-4 max-w-md mx-auto">
            Connect your bank accounts for seamless funding and withdrawals. 
            This feature will be available in the next release.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 text-sm font-medium">
            <Shield className="w-4 h-4" />
            Secured by Plaid • Coming Soon
          </div>
        </div>
      </Card>

      {/* Custodial Wallets */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Custodial Wallets</h3>
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            Coming Soon
          </div>
        </div>
        
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h4 className="text-xl font-medium text-white mb-2">High-Yield Custodial Wallets</h4>
          <p className="text-gray-400 mb-4 max-w-md mx-auto">
            Earn competitive yields on your cash reserves with FDIC-insured custodial wallets. 
            Perfect for parking funds between trades.
          </p>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              Up to 4.85% APY • Coming Soon
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-medium ml-2">
              <Shield className="w-4 h-4" />
              FDIC Insured
            </div>
          </div>
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