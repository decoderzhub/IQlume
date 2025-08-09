import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, TrendingUp, Shield, DollarSign } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';

interface StrategyCreationModalProps {
  onClose: () => void;
  onCreateStrategy: (strategy: Omit<TradingStrategy, 'id'>) => void;
  strategyData: {
    name: string;
    type: TradingStrategy['type'];
    description: string;
    risk_level: TradingStrategy['risk_level'];
    min_capital: number;
    configuration: Record<string, any>;
    reasoning: string;
  };
}

export function StrategyCreationModal({ onClose, onCreateStrategy, strategyData }: StrategyCreationModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateStrategy = async () => {
    if (!agreed) return;
    
    setIsCreating(true);
    
    // Simulate creation delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const strategy: Omit<TradingStrategy, 'id'> = {
      name: strategyData.name,
      type: strategyData.type,
      description: strategyData.description,
      risk_level: strategyData.risk_level,
      min_capital: strategyData.min_capital,
      is_active: false,
      configuration: strategyData.configuration,
    };
    
    onCreateStrategy(strategy);
    setIsCreating(false);
  };

  const getRiskColor = (level: TradingStrategy['risk_level']) => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">AI Strategy Creation</h2>
                <p className="text-gray-400">Review and approve the AI-generated strategy</p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Strategy Overview */}
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{strategyData.name}</h3>
                  <p className="text-gray-300 mb-3">{strategyData.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(strategyData.risk_level)}`}>
                  {strategyData.risk_level} risk
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Min Capital</p>
                    <p className="font-semibold text-white">${strategyData.min_capital.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-400">Risk Level</p>
                    <p className="font-semibold text-white capitalize">{strategyData.risk_level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-400">Strategy Type</p>
                    <p className="font-semibold text-white capitalize">{strategyData.type.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Reasoning */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                AI Analysis & Reasoning
              </h4>
              <p className="text-gray-300 leading-relaxed">{strategyData.reasoning}</p>
            </div>

            {/* Configuration Preview */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h4 className="font-semibold text-white mb-3">Strategy Configuration</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {Object.entries(strategyData.configuration).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
                    <span className="text-white font-medium">
                      {typeof value === 'number' ? value.toLocaleString() : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Disclaimer */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-400 mb-3">Important Disclaimer</h4>
                  <div className="space-y-2 text-sm text-yellow-300">
                    <p>• This strategy was generated by AI and should be thoroughly reviewed before use</p>
                    <p>• Past performance does not guarantee future results</p>
                    <p>• All trading involves risk of loss, including potential total loss of capital</p>
                    <p>• You are responsible for understanding the strategy before implementation</p>
                    <p>• Consider consulting with a financial advisor before trading</p>
                    <p>• Start with paper trading or small amounts to test the strategy</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Agreement Checkbox */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="text-sm">
                  <p className="text-white font-medium mb-1">
                    I understand and agree to the terms above
                  </p>
                  <p className="text-gray-400">
                    I acknowledge that this is an AI-generated strategy and I am responsible for 
                    reviewing and understanding it before use. I understand the risks involved in trading.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleCreateStrategy}
              disabled={!agreed || isCreating}
              isLoading={isCreating}
              className="flex-1"
            >
              {isCreating ? 'Creating Strategy...' : 'Create Strategy'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}