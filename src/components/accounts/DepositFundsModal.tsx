import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, DollarSign, Shield, TrendingUp, AlertCircle, CreditCard, Building } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CustodialWallet } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface DepositFundsModalProps {
  wallet: CustodialWallet;
  onClose: () => void;
  onDeposit: (walletId: string, amount: number) => void;
}

export function DepositFundsModal({ wallet, onClose, onDeposit }: DepositFundsModalProps) {
  const [depositAmount, setDepositAmount] = useState(1000);
  const [fundingSource, setFundingSource] = useState<'bank' | 'card'>('bank');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeposit = async () => {
    if (depositAmount <= 0) {
      alert('Deposit amount must be greater than $0');
      return;
    }

    setIsProcessing(true);
    
    // Simulate deposit processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    onDeposit(wallet.id, depositAmount);
    setIsProcessing(false);
  };

  const projectedBalance = wallet.balance_usd + wallet.balance_treasuries + depositAmount;
  const projectedAnnualReturn = depositAmount * wallet.apy;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Deposit Funds</h2>
              <p className="text-gray-400">Add funds to your custodial wallet for trading</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Wallet Info */}
            <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/20 rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <Shield className="w-8 h-8 text-green-400" />
                <div>
                  <h3 className="font-semibold text-white">{wallet.wallet_name}</h3>
                  <p className="text-sm text-gray-400">
                    Current Balance: {formatCurrency(wallet.balance_usd + wallet.balance_treasuries)}
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
                <div>
                  <span className="text-gray-400">APY:</span>
                  <span className="text-green-400 ml-2">{(wallet.apy * 100).toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">FDIC Insured:</span>
                  <span className="text-green-400 ml-2">{wallet.is_fdic_insured ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Deposit Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Deposit Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="100"
                  step="100"
                  placeholder="Enter deposit amount"
                />
              </div>
              
              {/* Quick Amount Buttons */}
              <div className="flex gap-2 mt-3">
                {[1000, 5000, 10000, 25000].map((amount) => (
                  <Button
                    key={amount}
                    variant="ghost"
                    size="sm"
                    onClick={() => setDepositAmount(amount)}
                    className="text-xs"
                  >
                    {formatCurrency(amount)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Funding Source */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Funding Source
              </label>
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setFundingSource('bank')}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    fundingSource === 'bank'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Building className="w-5 h-5 text-blue-400" />
                    <span className="font-medium text-white">Bank Transfer</span>
                  </div>
                  <p className="text-sm text-gray-400">3-5 business days • No fees</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setFundingSource('card')}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    fundingSource === 'card'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-white">Debit Card</span>
                  </div>
                  <p className="text-sm text-gray-400">Instant • 1.5% fee</p>
                </motion.div>
              </div>
            </div>

            {/* Projected Returns */}
            <div className="bg-gray-800/30 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Projected Returns on Deposit
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-400">Monthly</p>
                  <p className="font-semibold text-green-400">
                    {formatCurrency(projectedAnnualReturn / 12)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Annual</p>
                  <p className="font-semibold text-green-400">
                    {formatCurrency(projectedAnnualReturn)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">New Balance</p>
                  <p className="font-semibold text-white">
                    {formatCurrency(projectedBalance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Trading Capital Notice */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-400 mb-2">Increases Buying Power</h4>
                  <p className="text-sm text-blue-300">
                    This deposit will increase your buying power, making it immediately available as trading capital 
                    for your automated strategies. You can allocate these funds to any of your trading bots or 
                    strategies from the Strategies page.
                  </p>
                </div>
              </div>
            </div>

            {/* Fees Notice */}
            {fundingSource === 'card' && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-400 mb-2">Debit Card Fee</h4>
                    <p className="text-sm text-yellow-300">
                      A 1.5% processing fee ({formatCurrency(depositAmount * 0.015)}) will be charged for debit card deposits.
                      Total amount charged: {formatCurrency(depositAmount * 1.015)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleDeposit}
                disabled={depositAmount <= 0 || isProcessing}
                isLoading={isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Processing Deposit...' : `Deposit ${formatCurrency(depositAmount)}`}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}