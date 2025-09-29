import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, DollarSign, Clock, Target } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';
import { formatCurrency } from '../../../lib/utils';

interface CreateDCAModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateDCAModal({ onClose, onSave }: CreateDCAModalProps) {
  const [step, setStep] = useState<'configure' | 'review'>('configure');
  const [strategyName, setStrategyName] = useState('DCA Bot');
  const [brokerageAccount, setBrokerageAccount] = useState('');
  const [minCapital, setMinCapital] = useState(500);
  const [allocatedCapital, setAllocatedCapital] = useState(500);
  const [description, setDescription] = useState('Dollar-cost averaging for systematic investment');
  const [symbol, setSymbol] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState(50);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [investmentTarget, setInvestmentTarget] = useState(25);

  const handleSave = async () => {
    const strategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: 'dca',
      description,
      risk_level: 'low',
      min_capital: minCapital,
      is_active: false,
      account_id: brokerageAccount || undefined,
      asset_class: 'crypto',
      base_symbol: symbol,
      quote_currency: 'USD',
      time_horizon: 'long_term',
      automation_level: 'fully_auto',
      configuration: {
        symbol,
        allocated_capital: allocatedCapital,
        investment_amount_per_interval: investmentAmount,
        frequency,
        investment_target_percent: investmentTarget,
      },
    };

    await onSave(strategy);
  };

  const isValid = strategyName && symbol && allocatedCapital > 0 && investmentAmount > 0;

  if (step === 'review') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <Card className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Review DCA Bot</h2>
                  <p className="text-gray-400">Confirm your strategy configuration</p>
                </div>
              </div>
              <Button variant="ghost" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Strategy Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white ml-2">{strategyName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Symbol:</span>
                    <span className="text-white ml-2">{symbol}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Investment Amount:</span>
                    <span className="text-white ml-2">{formatCurrency(investmentAmount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Frequency:</span>
                    <span className="text-white ml-2 capitalize">{frequency}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="secondary" onClick={() => setStep('configure')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Create DCA Bot
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

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
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create DCA Bot</h2>
                <p className="text-gray-400">Dollar-cost averaging for systematic investment</p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Strategy Name and Brokerage Account */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Strategy Name</label>
                <input
                  type="text"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter strategy name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Brokerage Account</label>
                <select
                  value={brokerageAccount}
                  onChange={(e) => setBrokerageAccount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select an account</option>
                  <option value="alpaca_main">Alpaca Trading Account</option>
                  <option value="alpaca_paper">Alpaca Paper Trading</option>
                </select>
              </div>
            </div>

            {/* Minimum Capital and Allocated Capital */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Capital</label>
                <NumericInput
                  value={minCapital}
                  onChange={setMinCapital}
                  min={100}
                  step={100}
                  prefix="$"
                  placeholder="Enter minimum capital"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Allocated Capital</label>
                <NumericInput
                  value={allocatedCapital}
                  onChange={setAllocatedCapital}
                  min={100}
                  step={100}
                  prefix="$"
                  placeholder="Enter allocated capital"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe your strategy"
              />
            </div>

            {/* DCA Configuration */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-6">DCA Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Trading Symbol</label>
                  <SymbolSearchInput
                    value={symbol}
                    onChange={setSymbol}
                    placeholder="Search for a symbol (e.g., BTC, ETH)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Investment Amount</label>
                  <NumericInput
                    value={investmentAmount}
                    onChange={setInvestmentAmount}
                    min={1}
                    step={1}
                    prefix="$"
                    placeholder="50"
                  />
                  <p className="text-xs text-gray-400 mt-1">Amount to invest per interval</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Investment Target (%)</label>
                <NumericInput
                  value={investmentTarget}
                  onChange={setInvestmentTarget}
                  min={1}
                  max={100}
                  step={1}
                  suffix="%"
                  placeholder="25"
                />
                <p className="text-xs text-gray-400 mt-1">Percentage of allocated capital to deploy</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => setStep('review')} 
              disabled={!isValid}
              className="flex-1"
            >
              Review
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}