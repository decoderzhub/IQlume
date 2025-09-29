import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingDown, Target, DollarSign, Calendar } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';
import { formatCurrency } from '../../../lib/utils';

interface CreateShortPutModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateShortPutModal({ onClose, onSave }: CreateShortPutModalProps) {
  const [step, setStep] = useState<'configure' | 'review'>('configure');
  const [strategyName, setStrategyName] = useState('Cash-Secured Put');
  const [brokerageAccount, setBrokerageAccount] = useState('');
  const [minCapital, setMinCapital] = useState(15000);
  const [allocatedCapital, setAllocatedCapital] = useState(15000);
  const [description, setDescription] = useState('Cash-secured put strategy for income generation with potential stock acquisition');
  const [symbol, setSymbol] = useState('');
  const [strikeDelta, setStrikeDelta] = useState(-0.30);
  const [expirationDays, setExpirationDays] = useState(30);
  const [minimumPremium, setMinimumPremium] = useState(150);
  const [profitTarget, setProfitTarget] = useState(50);
  const [stopLoss, setStopLoss] = useState(200);

  const handleSave = async () => {
    const strategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: 'short_put',
      description,
      risk_level: 'medium',
      min_capital: minCapital,
      is_active: false,
      account_id: brokerageAccount || undefined,
      asset_class: 'options',
      base_symbol: symbol,
      quote_currency: 'USD',
      time_horizon: 'swing',
      automation_level: 'fully_auto',
      configuration: {
        symbol,
        allocated_capital: allocatedCapital,
        strike_delta: strikeDelta,
        expiration_days: expirationDays,
        minimum_premium: minimumPremium,
        profit_target: profitTarget,
        stop_loss: { value: stopLoss, type: 'percentage' },
      },
    };

    await onSave(strategy);
  };

  const isValid = strategyName && symbol && allocatedCapital > 0;

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
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Review Cash-Secured Put</h2>
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
                    <span className="text-gray-400">Strike Delta:</span>
                    <span className="text-white ml-2">{strikeDelta}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Expiration:</span>
                    <span className="text-white ml-2">{expirationDays} days</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="secondary" onClick={() => setStep('configure')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Create Cash-Secured Put
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
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create Cash-Secured Put</h2>
                <p className="text-gray-400">Cash-secured put strategy for income generation with potential stock acquisition</p>
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

            {/* Cash-Secured Put Configuration */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Cash-Secured Put Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stock Symbol</label>
                  <SymbolSearchInput
                    value={symbol}
                    onChange={setSymbol}
                    placeholder="Search for a stock (e.g., AAPL, MSFT)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Strike Delta</label>
                  <NumericInput
                    value={strikeDelta}
                    onChange={setStrikeDelta}
                    min={-0.5}
                    max={-0.1}
                    step={0.05}
                    allowDecimals={true}
                    placeholder="-0.30"
                  />
                  <p className="text-xs text-gray-400 mt-1">Target delta for put options</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Expiration (days)</label>
                  <NumericInput
                    value={expirationDays}
                    onChange={setExpirationDays}
                    min={7}
                    max={90}
                    step={7}
                    placeholder="30"
                  />
                  <p className="text-xs text-gray-400 mt-1">Days to expiration target</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Premium</label>
                  <NumericInput
                    value={minimumPremium}
                    onChange={setMinimumPremium}
                    min={50}
                    step={50}
                    prefix="$"
                    placeholder="150"
                  />
                  <p className="text-xs text-gray-400 mt-1">Minimum premium to collect</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Profit Target (%)</label>
                  <NumericInput
                    value={profitTarget}
                    onChange={setProfitTarget}
                    min={10}
                    max={90}
                    step={5}
                    suffix="%"
                    placeholder="50"
                  />
                  <p className="text-xs text-gray-400 mt-1">Close position at this profit</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stop Loss (%)</label>
                  <NumericInput
                    value={stopLoss}
                    onChange={setStopLoss}
                    min={100}
                    max={500}
                    step={50}
                    suffix="%"
                    placeholder="200"
                  />
                  <p className="text-xs text-gray-400 mt-1">Stop loss as % of premium</p>
                </div>
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