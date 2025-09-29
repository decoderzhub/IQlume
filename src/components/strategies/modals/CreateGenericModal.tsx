import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, Clock } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';

interface CreateGenericModalProps {
  strategyType: TradingStrategy['type'];
  strategyName: string;
  strategyDescription: string;
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateGenericModal({ 
  strategyType, 
  strategyName, 
  strategyDescription, 
  onClose, 
  onSave 
}: CreateGenericModalProps) {
  const [formData, setFormData] = useState({
    name: strategyName,
    description: strategyDescription,
    risk_level: 'medium' as const,
    min_capital: 10000,
    symbol: '',
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
        type: strategyType,
        description: formData.description,
        risk_level: formData.risk_level,
        min_capital: formData.min_capital,
        is_active: false,
        configuration: {
          symbol: formData.symbol,
        },
      };

      await onSave(strategy);
    } catch (error) {
      console.error(`Error creating ${strategyType} strategy:`, error);
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
              <h2 className="text-2xl font-bold text-white mb-2">Create {strategyName}</h2>
              <p className="text-gray-400">{strategyDescription}</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Coming Soon Notice */}
          <Card className="p-6 bg-yellow-500/10 border-yellow-500/20 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-400 mb-2">Strategy Coming Soon</h3>
                <p className="text-sm text-yellow-300 mb-3">
                  The detailed configuration for {strategyName} is currently being developed. 
                  You can create a basic strategy now with standard parameters.
                </p>
                <ul className="text-sm text-yellow-300 space-y-1">
                  <li>• Basic strategy will be created with default settings</li>
                  <li>• Advanced configuration will be available in future updates</li>
                  <li>• You can edit and customize the strategy later</li>
                </ul>
              </div>
            </div>
          </Card>

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
                placeholder="Search for a symbol"
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
                placeholder="10000"
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
                Create {strategyName}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}