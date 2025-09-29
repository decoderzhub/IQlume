import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';

interface CreateWheelModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateWheelModal({ onClose, onSave }: CreateWheelModalProps) {
  const [formData, setFormData] = useState({
    name: 'The Wheel Strategy',
    description: 'Systematic approach combining cash-secured puts and covered calls',
    risk_level: 'low' as const,
    min_capital: 20000,
    symbol: '',
    position_size: 100,
    put_strike_delta: -0.30,
    call_strike_delta: 0.30,
    expiration_days: 30,
    minimum_premium: 150,
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!formData.symbol || formData.position_size <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const strategy: Omit<TradingStrategy, 'id'> = {
        name: formData.name,
        type: 'wheel',
        description: formData.description,
        risk_level: formData.risk_level,
        min_capital: formData.min_capital,
        is_active: false,
        configuration: {
          symbol: formData.symbol,
          position_size: formData.position_size,
          put_strike_delta: formData.put_strike_delta,
          call_strike_delta: formData.call_strike_delta,
          expiration_days: formData.expiration_days,
          minimum_premium: formData.minimum_premium,
        },
      };

      await onSave(strategy);
    } catch (error) {
      console.error('Error creating wheel strategy:', error);
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
              <h2 className="text-2xl font-bold text-white mb-2">Create Wheel Strategy</h2>
              <p className="text-gray-400">Systematic cash-secured puts and covered calls</p>
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

            {/* Wheel Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position Size (shares)
                </label>
                <NumericInput
                  value={formData.position_size}
                  onChange={(value) => setFormData(prev => ({ ...prev, position_size: value }))}
                  min={100}
                  step={100}
                  placeholder="100"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Put Strike Delta
                </label>
                <NumericInput
                  value={formData.put_strike_delta}
                  onChange={(value) => setFormData(prev => ({ ...prev, put_strike_delta: value }))}
                  min={-0.5}
                  max={-0.1}
                  step={0.05}
                  placeholder="-0.30"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Call Strike Delta
                </label>
                <NumericInput
                  value={formData.call_strike_delta}
                  onChange={(value) => setFormData(prev => ({ ...prev, call_strike_delta: value }))}
                  min={0.1}
                  max={0.5}
                  step={0.05}
                  placeholder="0.30"
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

            {/* Minimum Premium */}
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
                placeholder="20000"
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
                disabled={!formData.symbol || formData.position_size <= 0 || isCreating}
                isLoading={isCreating}
                className="flex-1"
              >
                Create Wheel Strategy
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}