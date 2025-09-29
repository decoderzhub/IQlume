import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowDown } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';

interface CreateShortPutModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateShortPutModal({ onClose, onSave }: CreateShortPutModalProps) {
  const [formData, setFormData] = useState({
    name: 'Cash-Secured Put Strategy',
    description: 'Generate income by selling cash-secured puts',
    risk_level: 'medium' as const,
    min_capital: 15000,
    symbol: '',
    strike_delta: -0.30,
    expiration_days: 30,
    minimum_premium: 150,
    profit_target: 50,
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!formData.symbol) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const strategy: Omit<TradingStrategy, 'id'> = {
        name: formData.name,
        type: 'short_put',
        description: formData.description,
        risk_level: formData.risk_level,
        min_capital: formData.min_capital,
        is_active: false,
        configuration: {
          symbol: formData.symbol,
          strike_delta: formData.strike_delta,
          expiration_days: formData.expiration_days,
          minimum_premium: formData.minimum_premium,
          profit_target: formData.profit_target,
        },
      };

      await onSave(strategy);
    } catch (error) {
      console.error('Error creating short put strategy:', error);
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
              <h2 className="text-2xl font-bold text-white mb-2">Create Cash-Secured Put Strategy</h2>
              <p className="text-gray-400">Generate income by selling cash-secured puts</p>
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

            {/* Trading Symbol */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Trading Symbol
              </label>
              <SymbolSearchInput
                value={formData.symbol}
                onChange={(value) => setFormData(prev => ({ ...prev, symbol: value }))}
                placeholder="Search for a symbol (e.g., AAPL, MSFT)"
                className="w-full"
              />
            </div>

            {/* Put Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strike Delta
                </label>
                <NumericInput
                  value={formData.strike_delta}
                  onChange={(value) => setFormData(prev => ({ ...prev, strike_delta: value }))}
                  min={-0.5}
                  max={-0.1}
                  step={0.05}
                  placeholder="-0.30"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration Days
                </label>
                <NumericInput
                  value={formData.expiration_days}
                  onChange={(value) => setFormData(prev => ({ ...prev, expiration_days: value }))}
                  min={7}
                  max={90}
                  step={1}
                  placeholder="30"
                  className="w-full"
                />
              </div>
            </div>

            {/* Premium and Profit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Premium
                </label>
                <NumericInput
                  value={formData.minimum_premium}
                  onChange={(value) => setFormData(prev => ({ ...prev, minimum_premium: value }))}
                  min={50}
                  step={25}
                  prefix="$"
                  placeholder="150"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Profit Target (% of premium)
                </label>
                <NumericInput
                  value={formData.profit_target}
                  onChange={(value) => setFormData(prev => ({ ...prev, profit_target: value }))}
                  min={10}
                  max={100}
                  step={5}
                  suffix="%"
                  placeholder="50"
                  className="w-full"
                />
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
                placeholder="15000"
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
                disabled={!formData.symbol || isCreating}
                isLoading={isCreating}
                className="flex-1"
              >
                Create Cash-Secured Put Strategy
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}