import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Zap, AlertTriangle } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';

interface CreateFuturesGridModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateFuturesGridModal({ onClose, onSave }: CreateFuturesGridModalProps) {
  const [formData, setFormData] = useState({
    name: 'Futures Grid Bot',
    description: 'Grid trading on futures market with leverage support',
    risk_level: 'medium' as const,
    min_capital: 2000,
    symbol: '',
    lower_price: 0,
    upper_price: 0,
    number_of_grids: 25,
    allocated_capital: 2000,
    direction: 'long',
    leverage: 3,
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!formData.symbol || formData.lower_price <= 0 || formData.upper_price <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const strategy: Omit<TradingStrategy, 'id'> = {
        name: formData.name,
        type: 'futures_grid',
        description: formData.description,
        risk_level: formData.risk_level,
        min_capital: formData.min_capital,
        is_active: false,
        configuration: {
          symbol: formData.symbol,
          price_range_lower: formData.lower_price,
          price_range_upper: formData.upper_price,
          number_of_grids: formData.number_of_grids,
          allocated_capital: formData.allocated_capital,
          direction: formData.direction,
          leverage: formData.leverage,
        },
      };

      await onSave(strategy);
    } catch (error) {
      console.error('Error creating futures grid strategy:', error);
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
              <h2 className="text-2xl font-bold text-white mb-2">Create Futures Grid Bot</h2>
              <p className="text-gray-400">Grid trading on futures market with leverage</p>
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
                placeholder="Search for a symbol (e.g., BTC/USDT)"
                className="w-full"
              />
            </div>

            {/* Leverage Warning */}
            <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-400 mb-2">Leverage Trading Warning</h4>
                  <p className="text-sm text-yellow-300">
                    Futures trading with leverage amplifies both gains and losses. 
                    You can lose more than your initial investment.
                  </p>
                </div>
              </div>
            </Card>

            {/* Futures Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Direction
                </label>
                <select
                  value={formData.direction}
                  onChange={(e) => setFormData(prev => ({ ...prev, direction: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Leverage
                </label>
                <NumericInput
                  value={formData.leverage}
                  onChange={(value) => setFormData(prev => ({ ...prev, leverage: value }))}
                  min={1}
                  max={10}
                  step={1}
                  suffix="x"
                  placeholder="3"
                  className="w-full"
                />
              </div>
            </div>

            {/* Grid Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lower Price
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
                  Upper Price
                </label>
                <NumericInput
                  value={formData.upper_price}
                  onChange={(value) => setFormData(prev => ({ ...prev, upper_price: value }))}
                  min={0}
                  step={0.01}
                  prefix="$"
                  placeholder="Enter upper price"
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
                  placeholder="25"
                  className="w-full"
                />
              </div>
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
                disabled={!formData.symbol || formData.lower_price <= 0 || formData.upper_price <= 0 || isCreating}
                isLoading={isCreating}
                className="flex-1"
              >
                Create Futures Grid Bot
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}