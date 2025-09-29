import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';

interface CreateDCAModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateDCAModal({ onClose, onSave }: CreateDCAModalProps) {
  const [formData, setFormData] = useState({
    name: 'DCA Bot',
    description: 'Automatically invests at fixed intervals to minimize volatility risk',
    risk_level: 'low' as const,
    min_capital: 500,
    symbol: '',
    investment_amount: 100,
    frequency: 'daily',
    investment_target_percent: 25,
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!formData.symbol || formData.investment_amount <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const strategy: Omit<TradingStrategy, 'id'> = {
        name: formData.name,
        type: 'dca',
        description: formData.description,
        risk_level: formData.risk_level,
        min_capital: formData.min_capital,
        is_active: false,
        configuration: {
          symbol: formData.symbol,
          investment_amount_per_interval: formData.investment_amount,
          frequency: formData.frequency,
          investment_target_percent: formData.investment_target_percent,
        },
      };

      await onSave(strategy);
    } catch (error) {
      console.error('Error creating DCA strategy:', error);
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
              <h2 className="text-2xl font-bold text-white mb-2">Create DCA Bot</h2>
              <p className="text-gray-400">Dollar-cost averaging for systematic investing</p>
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
                placeholder="Search for a symbol (e.g., BTC, ETH)"
                className="w-full"
              />
            </div>

            {/* DCA Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Investment Amount per Interval
                </label>
                <NumericInput
                  value={formData.investment_amount}
                  onChange={(value) => setFormData(prev => ({ ...prev, investment_amount: value }))}
                  min={1}
                  step={1}
                  prefix="$"
                  placeholder="100"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            {/* Investment Target */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Investment Target (% of portfolio)
              </label>
              <NumericInput
                value={formData.investment_target_percent}
                onChange={(value) => setFormData(prev => ({ ...prev, investment_target_percent: value }))}
                min={1}
                max={100}
                step={1}
                suffix="%"
                placeholder="25"
                className="w-full"
              />
            </div>

            {/* Minimum Capital */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Capital
              </label>
              <NumericInput
                value={formData.min_capital}
                onChange={(value) => setFormData(prev => ({ ...prev, min_capital: value }))}
                min={100}
                step={100}
                prefix="$"
                placeholder="500"
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
                disabled={!formData.symbol || formData.investment_amount <= 0 || isCreating}
                isLoading={isCreating}
                className="flex-1"
              >
                Create DCA Bot
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}