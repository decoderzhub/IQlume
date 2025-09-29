import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, BarChart3, Plus, Trash2, DollarSign, Target, AlertTriangle } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { useStore } from '../../../store/useStore';

interface Asset {
  symbol: string;
  allocation: number;
}

interface CreateSmartRebalanceModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateSmartRebalanceModal({ onClose, onSave }: CreateSmartRebalanceModalProps) {
  const { brokerageAccounts } = useStore();
  const [step, setStep] = useState<'configure' | 'review'>('configure');
  const [strategyName, setStrategyName] = useState('Smart Rebalance');
  const [brokerageAccount, setBrokerageAccount] = useState('');
  const [minCapital, setMinCapital] = useState(5000);
  const [allocatedCapital, setAllocatedCapital] = useState(5000);
  const [description, setDescription] = useState('Maintain target allocations through automatic rebalancing');
  const [allocationMethod, setAllocationMethod] = useState<'even_split' | 'market_cap_weighted' | 'majority_cash_market_cap' | 'majority_cash_even_split'>('even_split');
  const [cashBalance, setCashBalance] = useState(20);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [rebalanceFrequency, setRebalanceFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [deviationThreshold, setDeviationThreshold] = useState(5);

  const addAsset = () => {
    setAssets(prev => [...prev, { symbol: '', allocation: 0 }]);
  };

  const removeAsset = (index: number) => {
    setAssets(prev => prev.filter((_, i) => i !== index));
  };

  const updateAsset = (index: number, field: keyof Asset, value: string | number) => {
    setAssets(prev => prev.map((asset, i) => 
      i === index ? { ...asset, [field]: value } : asset
    ));
  };

  const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation, 0) + cashBalance;
  const isAllocationValid = Math.abs(totalAllocation - 100) < 0.01;

  const handleSave = async () => {
    const strategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: 'smart_rebalance',
      description,
      risk_level: 'low',
      min_capital: minCapital,
      is_active: false,
      account_id: brokerageAccount || undefined,
      asset_class: 'equity',
      time_horizon: 'long_term',
      automation_level: 'fully_auto',
      auto_start: true,
      configuration: {
        allocated_capital: allocatedCapital,
        allocation_method: allocationMethod,
        cash_balance_percent: cashBalance,
        assets: assets.filter(asset => asset.symbol && asset.allocation > 0),
        rebalance_frequency: rebalanceFrequency,
        deviation_threshold_percent: deviationThreshold,
      },
    };

    await onSave(strategy);
  };

  const isValid = strategyName && allocatedCapital > 0 && isAllocationValid && assets.some(asset => asset.symbol && asset.allocation > 0);

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
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Review Smart Rebalance</h2>
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
                    <span className="text-gray-400">Allocated Capital:</span>
                    <span className="text-white ml-2">{formatCurrency(allocatedCapital)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Cash Balance:</span>
                    <span className="text-white ml-2">{cashBalance}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Rebalance Frequency:</span>
                    <span className="text-white ml-2 capitalize">{rebalanceFrequency}</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium text-white mb-2">Asset Allocation</h4>
                  <div className="space-y-2">
                    {assets.map((asset, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-400">{asset.symbol}:</span>
                        <span className="text-white">{asset.allocation}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="secondary" onClick={() => setStep('configure')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Create Smart Rebalance
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
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create Smart Rebalance</h2>
                <p className="text-gray-400">Maintain target allocations through automatic rebalancing</p>
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

            {/* Smart Rebalance Configuration */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Smart Rebalance Configuration</h3>
              
              {/* Allocation Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">Allocation Method</label>
                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setAllocationMethod('even_split')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      allocationMethod === 'even_split'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <h4 className="font-medium text-white mb-2">Even Split</h4>
                    <p className="text-sm text-gray-400">Equal weight over all allocations</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setAllocationMethod('market_cap_weighted')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      allocationMethod === 'market_cap_weighted'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <h4 className="font-medium text-white mb-2">Market Cap Weighted</h4>
                    <p className="text-sm text-gray-400">Allocation by market cap</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setAllocationMethod('majority_cash_market_cap')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      allocationMethod === 'majority_cash_market_cap'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <h4 className="font-medium text-white mb-2">Majority Cash + Market Cap</h4>
                    <p className="text-sm text-gray-400">60% cash, 40% market cap weighted</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setAllocationMethod('majority_cash_even_split')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      allocationMethod === 'majority_cash_even_split'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    <h4 className="font-medium text-white mb-2">Majority Cash + Even Split</h4>
                    <p className="text-sm text-gray-400">60% cash, 40% evenly split</p>
                  </motion.div>
                </div>
              </div>

              {/* Cash Balance */}
              <div className="mb-6">
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="font-medium text-white">USD Cash Balance</p>
                      <p className="text-sm text-gray-400">Account cash allocation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      value={cashBalance}
                      onChange={setCashBalance}
                      min={0}
                      max={100}
                      step={1}
                      className="w-20 text-center"
                    />
                    <span className="text-white">%</span>
                  </div>
                </div>
              </div>

              {/* Portfolio Assets */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-white">Portfolio Assets</h4>
                  <Button onClick={addAsset} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Asset
                  </Button>
                </div>

                {assets.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                    <Target className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 mb-4">No assets added yet</p>
                    <Button onClick={addAsset} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Asset
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assets.map((asset, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex-1">
                          <SymbolSearchInput
                            value={asset.symbol}
                            onChange={(value) => updateAsset(index, 'symbol', value)}
                            placeholder="Search symbol"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <NumericInput
                            value={asset.allocation}
                            onChange={(value) => updateAsset(index, 'allocation', value)}
                            min={0}
                            max={100}
                            step={0.1}
                            className="w-20 text-center"
                            allowDecimals={true}
                          />
                          <span className="text-white">%</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAsset(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Allocation Summary */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Allocation:</span>
                  <span className={`font-bold ${isAllocationValid ? 'text-green-400' : 'text-red-400'}`}>
                    {totalAllocation.toFixed(1)}%
                  </span>
                </div>
                {!isAllocationValid && (
                  <p className="text-sm text-red-400 mt-2">
                    Total allocation must equal 100%
                  </p>
                )}
              </div>


              {/* Rebalance Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Rebalance Frequency</label>
                  <select
                    value={rebalanceFrequency}
                    onChange={(e) => setRebalanceFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Deviation Threshold</label>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      value={deviationThreshold}
                      onChange={setDeviationThreshold}
                      min={1}
                      max={50}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-white">%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Trigger rebalancing when allocation drifts by this amount
                  </p>
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