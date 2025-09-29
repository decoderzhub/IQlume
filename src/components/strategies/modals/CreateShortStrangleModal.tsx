import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Target, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { TradingStrategy } from '../../../types';

interface CreateShortStrangleModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateShortStrangleModal({ onClose, onSave }: CreateShortStrangleModalProps) {
  const [strategyName, setStrategyName] = useState('Short Strangle');
  const [description, setDescription] = useState('Premium collection strategy using short strangles for low volatility environments');
  const [minCapital, setMinCapital] = useState(25000);

  const handleSave = async () => {
    const strategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: 'short_strangle',
      description,
      risk_level: 'high',
      min_capital: minCapital,
      is_active: false,
      configuration: {},
    };

    await onSave(strategy);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-purple-600 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create Short Strangle</h2>
                <p className="text-gray-400">Coming Soon - Advanced options strategy</p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="text-center py-12">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Short Strangle Strategy</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              This advanced options strategy will be available in a future release. 
              It will allow you to collect premium income from low volatility markets.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 text-sm font-medium">
              Coming Soon
            </div>
          </div>

          <div className="flex gap-4">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}