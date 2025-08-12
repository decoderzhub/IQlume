import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Shield, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CustodialWallet } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface CustodialWalletModalProps {
  onClose: () => void;
  onCreate: (wallet: Omit<CustodialWallet, 'id'>) => void;
}

const walletTypes = [
  {
    id: 'high_yield',
    name: 'High-Yield Treasury Wallet',
    apy: 0.0485,
    description: 'FDIC insured up to $250K, backed by US Treasury securities',
    min_deposit: 1000,
    features: ['FDIC Insured', 'Daily Liquidity', 'No Fees', 'Auto-Reinvestment'],
  },
  {
    id: 'money_market',
    name: 'Money Market Wallet',
    apy: 0.0425,
    description: 'Higher yields with institutional money market funds',
    min_deposit: 5000,
    features: ['SIPC Protected', 'Same-Day Liquidity', 'Low Fees', 'Professional Management'],
  },
  {
    id: 'stable_value',
    name: 'Stable Value Wallet',
    apy: 0.0365,
    description: 'Conservative option with capital preservation focus',
    min_deposit: 500,
    features: ['Capital Protection', 'Instant Liquidity', 'No Market Risk', 'Guaranteed Returns'],
  },
];

export function CustodialWalletModal({ onClose, onCreate }: CustodialWalletModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [walletName, setWalletName] = useState('');
  const [initialDeposit, setInitialDeposit] = useState(10000);
  const [isCreating, setIsCreating] = useState(false);

  const selectedWalletType = walletTypes.find(w => w.id === selectedType);

  const handleCreate = async () => {
    if (!selectedType || !walletName || !selectedWalletType) return;

    setIsCreating(true);
    
    // Simulate wallet creation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    onCreate({
      user_id: '1',
      wallet_name: walletName,
      balance_usd: initialDeposit * 0.2, // 20% in USD
      balance_treasuries: initialDeposit * 0.8, // 80% in treasuries
      apy: selectedWalletType.apy,
      is_fdic_insured: selectedType === 'high_yield',
      created_at: new Date().toISOString(),
    });
    
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Create Custodial Wallet</h2>
              <p className="text-gray-400">Secure, high-yield storage for your cash reserves</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {!selectedType ? (
            <div>
              <h3 className="text-lg font-semibold text-white mb-6">Choose Wallet Type</h3>
              <div className="space-y-4">
                {walletTypes.map((wallet) => (
                  <motion.div
                    key={wallet.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedType(wallet.id)}
                    className="p-6 bg-gray-800/30 border border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-white mb-2">{wallet.name}</h4>
                        <p className="text-sm text-gray-400 mb-3">{wallet.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400">
                          {(wallet.apy * 100).toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-400">APY</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {wallet.features.map((feature) => (
                          <span
                            key={feature}
                            className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/20"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                      <div className="text-sm text-gray-400">
                        Min: {formatCurrency(wallet.min_deposit)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Shield className="w-8 h-8 text-green-400" />
                <div>
                  <h3 className="font-semibold text-white">{selectedWalletType?.name}</h3>
                  <p className="text-sm text-gray-400">{selectedWalletType?.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-green-400 font-semibold">
                      {((selectedWalletType?.apy || 0) * 100).toFixed(2)}% APY
                    </span>
                    <span className="text-sm text-gray-400">
                      Min: {formatCurrency(selectedWalletType?.min_deposit || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Wallet Name
                  </label>
                  <input
                    type="text"
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={selectedWalletType?.name}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Initial Deposit
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      value={initialDeposit}
                      onChange={(e) => setInitialDeposit(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={selectedWalletType?.min_deposit}
                      step="1000"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    This amount will be available as trading capital on the platform
                  </p>
                </div>
              </div>

              {/* Projected Returns */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Projected Annual Returns
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-400">1 Year</p>
                    <p className="font-semibold text-green-400">
                      {formatCurrency(initialDeposit * (selectedWalletType?.apy || 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">3 Years</p>
                    <p className="font-semibold text-green-400">
                      {formatCurrency(initialDeposit * Math.pow(1 + (selectedWalletType?.apy || 0), 3) - initialDeposit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">5 Years</p>
                    <p className="font-semibold text-green-400">
                      {formatCurrency(initialDeposit * Math.pow(1 + (selectedWalletType?.apy || 0), 5) - initialDeposit)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Important Info */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-400 mb-2">Important Information</h4>
                    <ul className="text-sm text-blue-300 space-y-1">
                      <li>• Funds are held in a segregated custodial account</li>
                      <li>• {selectedType === 'high_yield' ? 'FDIC insured up to $250,000' : 'SIPC protected up to $500,000'}</li>
                      <li>• Interest is calculated daily and paid monthly</li>
                      <li>• No minimum balance requirements after initial deposit</li>
                      <li>• Withdrawals typically process within 1-2 business days</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedType(null)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!walletName || initialDeposit < (selectedWalletType?.min_deposit || 0) || isCreating}
                  isLoading={isCreating}
                  className="flex-1"
                >
                  {isCreating ? 'Creating Wallet...' : `Create Wallet`}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}