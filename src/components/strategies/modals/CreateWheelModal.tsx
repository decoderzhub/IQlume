import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, RotateCcw, Target, DollarSign, Calendar } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { useStore } from '../../../store/useStore';

interface CreateWheelModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateWheelModal({ onClose, onSave }: CreateWheelModalProps) {
  const { brokerageAccounts } = useStore();
  const [step, setStep] = useState<'configure' | 'review'>('configure');
  const [strategyName, setStrategyName] = useState('The Wheel');
  const [brokerageAccount, setBrokerageAccount] = useState('');
  const [minCapital, setMinCapital] = useState(20000);
  const [allocatedCapital, setAllocatedCapital] = useState(20000);
  const [description, setDescription] = useState('Systematic approach combining cash-secured puts and covered calls');
  const [symbol, setSymbol] = useState('');
  const [positionSize, setPositionSize] = useState(100);
  const [probabilityOfSuccess, setProbabilityOfSuccess] = useState(84); // Default 84%
  const [expirationDays, setExpirationDays] = useState(30);
  const [minimumPremium, setMinimumPremium] = useState(150);
  const [assignmentHandling, setAssignmentHandling] = useState<'automatic' | 'manual'>('automatic');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  // Calculate delta from probability: delta = 1 - (probability / 100)
  const putStrikeDelta = -(1 - probabilityOfSuccess / 100);
  const callStrikeDelta = 1 - probabilityOfSuccess / 100;

  // Fetch current stock price when symbol changes
  React.useEffect(() => {
    const fetchPrice = async () => {
      if (!symbol) {
        setCurrentPrice(null);
        return;
      }
      try {
        // Mock price fetch - in production, fetch from market data API
        const mockPrices: Record<string, number> = {
          'AAPL': 250.50,
          'MSFT': 420.75,
          'TSLA': 242.30,
          'NVDA': 195.80,
          'GOOGL': 175.40,
        };
        setCurrentPrice(mockPrices[symbol] || 100);
      } catch (error) {
        console.error('Error fetching price:', error);
      }
    };
    fetchPrice();
  }, [symbol]);

  // Estimate strike prices based on delta
  // This is a rough estimate - actual strikes would come from options chain
  const estimatedPutStrike = currentPrice ? Math.round(currentPrice * (1 + putStrikeDelta * 0.15)) : null;
  const estimatedCallStrike = currentPrice ? Math.round(currentPrice * (1 + callStrikeDelta * 0.15)) : null;

  const handleSave = async () => {
    const strategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: 'wheel',
      description,
      risk_level: 'low',
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
        position_size: positionSize,
        put_strike_delta: putStrikeDelta,
        call_strike_delta: callStrikeDelta,
        expiration_days: expirationDays,
        minimum_premium: minimumPremium,
        assignment_handling: assignmentHandling,
      },
    };

    await onSave(strategy);
  };

  const isValid = strategyName && symbol && allocatedCapital > 0 && positionSize > 0;

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
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Review Wheel Strategy</h2>
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
                    <span className="text-gray-400">Position Size:</span>
                    <span className="text-white ml-2">{positionSize} shares</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Capital:</span>
                    <span className="text-white ml-2">{formatCurrency(allocatedCapital)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Win Rate Target:</span>
                    <span className="text-white ml-2">{probabilityOfSuccess}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Expiration:</span>
                    <span className="text-white ml-2">{expirationDays} days</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Options Strategy</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-blue-500/30">
                    <div className="text-blue-400 font-medium mb-2">Cash-Secured Put</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Delta:</span>
                        <span className="text-white font-mono">{putStrikeDelta.toFixed(2)}</span>
                      </div>
                      {estimatedPutStrike && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Strike:</span>
                            <span className="text-white">${estimatedPutStrike}</span>
                          </div>
                          {currentPrice && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Distance:</span>
                              <span className="text-blue-400">
                                {((estimatedPutStrike / currentPrice - 1) * 100).toFixed(1)}% OTM
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-4 border border-green-500/30">
                    <div className="text-green-400 font-medium mb-2">Covered Call</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Delta:</span>
                        <span className="text-white font-mono">{callStrikeDelta.toFixed(2)}</span>
                      </div>
                      {estimatedCallStrike && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Strike:</span>
                            <span className="text-white">${estimatedCallStrike}</span>
                          </div>
                          {currentPrice && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Distance:</span>
                              <span className="text-green-400">
                                {((estimatedCallStrike / currentPrice - 1) * 100).toFixed(1)}% OTM
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-300">
                    With {probabilityOfSuccess}% probability of success, you have a {100 - probabilityOfSuccess}% chance of assignment per cycle.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="secondary" onClick={() => setStep('configure')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Create Wheel Strategy
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
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create Wheel Strategy</h2>
                <p className="text-gray-400">Systematic approach combining cash-secured puts and covered calls</p>
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
                  {brokerageAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} ({account.brokerage.toUpperCase()}) - {account.account_type}
                    </option>
                  ))}
                </select>
                {brokerageAccounts.length === 0 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    No brokerage accounts connected. Go to Accounts to connect one.
                  </p>
                )}
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

            {/* Wheel Configuration */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Wheel Configuration</h3>
              
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">Position Size (shares)</label>
                  <NumericInput
                    value={positionSize}
                    onChange={setPositionSize}
                    min={100}
                    step={100}
                    placeholder="100"
                  />
                  <p className="text-xs text-gray-400 mt-1">Must be multiples of 100</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Probability of Success (%)
                  </label>
                  <NumericInput
                    value={probabilityOfSuccess}
                    onChange={setProbabilityOfSuccess}
                    min={50}
                    max={95}
                    step={1}
                    placeholder="84"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                      <div className="text-gray-400 mb-1">Put Delta (Sell Cash-Secured Put)</div>
                      <div className="text-white font-mono text-lg">{putStrikeDelta.toFixed(2)}</div>
                      {estimatedPutStrike && currentPrice && (
                        <div className="text-blue-400 mt-1">
                          ~${estimatedPutStrike} strike ({((estimatedPutStrike / currentPrice - 1) * 100).toFixed(1)}% OTM)
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
                      <div className="text-gray-400 mb-1">Call Delta (Sell Covered Call)</div>
                      <div className="text-white font-mono text-lg">{callStrikeDelta.toFixed(2)}</div>
                      {estimatedCallStrike && currentPrice && (
                        <div className="text-green-400 mt-1">
                          ~${estimatedCallStrike} strike ({((estimatedCallStrike / currentPrice - 1) * 100).toFixed(1)}% OTM)
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {probabilityOfSuccess}% chance the option expires worthless (you keep the premium).
                    Lower delta = further OTM = higher win rate but lower premium.
                  </p>
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
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Assignment Handling</label>
                <select
                  value={assignmentHandling}
                  onChange={(e) => setAssignmentHandling(e.target.value as 'automatic' | 'manual')}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="automatic">Automatic</option>
                  <option value="manual">Manual</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">How to handle option assignments</p>
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