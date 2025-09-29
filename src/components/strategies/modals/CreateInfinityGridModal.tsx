import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Infinity } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';

interface CreateInfinityGridModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateInfinityGridModal({ onClose, onSave }: CreateInfinityGridModalProps) {
  const [formData, setFormData] = useState({
    name: 'Infinity Grid Bot',
    description: 'Grid trading without upper price limit for trending markets',
    risk_level: 'medium' as const,
    min_capital: 1500,
    symbol: '',
    lower_price: 0,
    number_of_grids: 30,
    allocated_capital: 1500,
    grid_mode: 'geometric',
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!formData.symbol || formData.lower_price <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const strategy: Omit<TradingStrategy, 'id'> = {
        name: formData.name,
        type: 'infinity_grid',
        description: formData.description,
        risk_level: formData.risk_level,
        min_capital: formData.min_capital,
        is_active: false,
        configuration: {
          symbol: formData.symbol,
          price_range_lower: formData.lower_price,
          number_of_grids: formData.number_of_grids,
          allocated_capital: formData.allocated_capital,
          grid_mode: formData.grid_mode,
        },
      };

      await onSave(strategy);
    } catch (error) {
      console.error('Error creating infinity grid strategy:', error);
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
              <h2 className="text-2xl font-bold text-white mb-2">Create Infinity Grid Bot</h2>
              <p className="text-gray-400">Grid trading without upper limit for bull markets</p>
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
                placeholder="Search for a symbol (e.g., ETH/USDT)"
                className="w-full"
              />
            </div>

            {/* Grid Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lower Price (Entry Point)
                </label>
                <NumericInput
                  value={formData.lower_price}
                  onChange={(value) => setFormData(prev => ({ ...prev, lower_price: value }))}
                  min={0}
                  step={0.01}
                  prefix="$"
                  placeholder="Enter lower price"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Grids
                </label>
                <NumericInput
                  value={formData.number_of_grids}
                  onChange={(value) => setFormData(prev => ({ ...prev, number_of_grids: value }))}
                  min={5}
                  max={100}
                  step={1}
                  placeholder="30"
                  className="w-full"
                />
              </div>
            </div>

            {/* Grid Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Grid Mode
              </label>
              <select
                value={formData.grid_mode}
                onChange={(e) => setFormData(prev => ({ ...prev, grid_mode: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="arithmetic">Arithmetic</option>
                <option value="geometric">Geometric</option>
              </select>
            </div>

            {/* Allocated Capital */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Allocated Capital
              </label>
              <NumericInput
                value={formData.allocated_capital}
                onChange={(value) => setFormData(prev => ({ ...prev, allocated_capital: value, min_capital: value }))}
                min={100}
                step={100}
                prefix="$"
                placeholder="Enter allocated capital"
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
                disabled={!formData.symbol || formData.lower_price <= 0 || isCreating}
                isLoading={isCreating}
                className="flex-1"
              >
                Create Infinity Grid Bot
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}