import React from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, DollarSign, Settings, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface InsufficientFundsModalProps {
  strategy: TradingStrategy;
  requiredAmount: number;
  availableAmount: number;
  onClose: () => void;
  onEditConfig: () => void;
  onDelete: () => void;
  onAddFunds: () => void;
}

export function InsufficientFundsModal({
  strategy,
  requiredAmount,
  availableAmount,
  onClose,
  onEditConfig,
  onDelete,
  onAddFunds,
}: InsufficientFundsModalProps) {
  const shortfall = requiredAmount - availableAmount;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg"
      >
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Insufficient Funds</h2>
                <p className="text-sm text-gray-400">Bot paused due to low balance</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-3">Strategy Details</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Bot Name:</span>
                  <span className="text-sm font-medium text-white">{strategy.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Symbol:</span>
                  <span className="text-sm font-medium text-white">{strategy.base_symbol || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
              <p className="text-sm text-red-400 mb-3 font-medium">Balance Issue</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Required:</span>
                  <span className="text-sm font-semibold text-white">{formatCurrency(requiredAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Available:</span>
                  <span className="text-sm font-semibold text-red-400">{formatCurrency(availableAmount)}</span>
                </div>
                <div className="h-px bg-gray-700 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">Shortfall:</span>
                  <span className="text-base font-bold text-red-400">{formatCurrency(shortfall)}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <p className="text-sm text-blue-400 font-medium mb-2">What happens now?</p>
              <ul className="space-y-1.5 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>Bot automatically paused to prevent failed trades</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>No new orders will be placed until resolved</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>Existing positions remain active</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={onAddFunds}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Add Funds to Account
            </Button>

            <Button
              onClick={onEditConfig}
              variant="outline"
              className="w-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Configuration
            </Button>

            <Button
              onClick={onDelete}
              variant="outline"
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Bot
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 mt-4">
            The bot will automatically resume when sufficient funds are available
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
