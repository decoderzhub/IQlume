import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, BarChart3, Plus, Trash2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';

interface CreateSmartRebalanceModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

interface AssetAllocation {
  symbol: string;
  allocation: number;
}

export function CreateSmartRebalanceModal({ onClose, onSave }: CreateSmartRebalanceModalProps) {
  const [formData, setFormData] = useState({
    name: 'Smart Rebalance Bot',
    description: 'Maintains target allocations through automatic rebalancing',
    risk_level: 'low' as const,
    min_capital: 5000,
    trigger_type: 'threshold',
    threshold_deviation_percent: 5,
    rebalance_frequency: 'weekly',
  });
  const [assets, setAssets] = useState<AssetAllocation[]>([
    { symbol: 'BTC', allocation: 40 },
    { symbol: 'ETH', allocation: 30 },
    { symbol: 'USDT', allocation: 30 },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  const addAsset = () => {
    setAssets(prev => [...prev, { symbol: '', allocation: 0 }]);
  };

  const removeAsset = (index: number) => {
    setAssets(prev => prev.filter((_, i) => i !== index));
  };

  const updateAsset = (index: number, field: keyof AssetAllocation, value: string | number) => {
    setAssets(prev => prev.map((asset, i) => 
      i === index ? { ...asset, [field]: value } : asset
    ));
  };

  const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation, 0);

  const handleSubmit = async () => {
    if (assets.some(asset => !asset.symbol) || totalAllocation !== 100) {
      alert('Please ensure all assets have symbols and allocations total 100%');
      return;
    }

    setIsCreating(true);
    try {
      const strategy: Omit<TradingStrategy, 'id'> = {
        name: formData.name,
        type: 'smart_rebalance',
        description: formData.description,
        risk_level: formData.risk_level,
        min_capital: formData.min_capital,
        is_active: false,
        configuration: {
          assets: assets,
          trigger_type: formData.trigger_type,
          threshold_deviation_percent: formData.threshold_deviation_percent,
          rebalance_frequency: formData.rebalance_frequency,
        },
      };

      await onSave(strategy);
    } catch (error) {
      console.error('Error creating smart rebalance strategy:', error);
    } finally {
      setIsCreating(false);
    }
  };

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
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Create Smart Rebalance Bot</h2>
              <p className="text-gray-400">Maintain target allocations through automatic rebalancing</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Strategy Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Strategy Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter strategy name"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe your strategy"
              />
            </div>

            {/* Risk Level */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Risk Level
              </label>
              <select
                value={formData.risk_level}
                onChange={(e) => setFormData(prev => ({ ...prev, risk_level: e.target.value as 'low' | 'medium' | 'high' }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>

            {/* Asset Allocations */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-300">
                  Asset Allocations
                </label>
                <Button variant="outline" size="sm" onClick={addAsset}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Asset
                </Button>
              </div>

              <div className="space-y-3">
                {assets.map((asset, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex-1">
                      <SymbolSearchInput
                        value={asset.symbol}
                        onChange={(value) => updateAsset(index, 'symbol', value)}
                        placeholder="Symbol"
                        className="w-full"
                      />
                    </div>
                    <div className="w-24">
                      <NumericInput
                        value={asset.allocation}
                        onChange={(value) => updateAsset(index, 'allocation', value)}
                        min={0}
                        max={100}
                        step={1}
                        suffix="%"
                        placeholder="0"
                        className="w-full"
                      />
                    </div>
                    {assets.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAsset(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Total Allocation:</span>
                <span className={`font-medium ${totalAllocation === 100 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalAllocation}%
                </span>
              </div>
            </div>

            {/* Rebalance Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Threshold Deviation
                </label>
                <NumericInput
                  value={formData.threshold_deviation_percent}
                  onChange={(value) => setFormData(prev => ({ ...prev, threshold_deviation_percent: value }))}
                  min={1}
                  max={20}
                  step={1}
                  suffix="%"
                  placeholder="5"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rebalance Frequency
                </label>
                <select
                  value={formData.rebalance_frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, rebalance_frequency: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            {/* Minimum Capital */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Capital
              </label>
              <NumericInput
                value={formData.min_capital}
                onChange={(value) => setFormData(prev => ({ ...prev, min_capital: value }))}
                min={1000}
                step={1000}
                prefix="$"
                placeholder="5000"
                className="w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-800">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={assets.some(asset => !asset.symbol) || totalAllocation !== 100 || isCreating}
                isLoading={isCreating}
                className="flex-1"
              >
                Create Smart Rebalance Bot
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}