import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Bot, TrendingUp, BarChart3, Zap, AlertTriangle, DollarSign } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { NumericInput } from '../../ui/NumericInput';
import { SymbolSearchInput } from '../../ui/SymbolSearchInput';
import { TradingStrategy } from '../../../types';
import { supabase } from '../../../lib/supabase';

interface CreateSpotGridModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => Promise<TradingStrategy | null>;
}

export function CreateSpotGridModal({ onClose, onSave }: CreateSpotGridModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: 'Spot Grid Bot',
    description: 'Automate buy-low/sell-high trades within a defined price range',
    risk_level: 'low' as const,
    min_capital: 1000,
    symbol: '',
    lower_price: 0,
    upper_price: 0,
    number_of_grids: 20,
    allocated_capital: 1000,
  });
  const [aiConfiguring, setAiConfiguring] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleAIConfigureGrid = async () => {
    if (!formData.symbol) {
      alert('Please enter a trading symbol first');
      return;
    }

    setAiConfiguring(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/market-data/ai-configure-grid-range`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          symbol: formData.symbol,
          allocated_capital: formData.allocated_capital,
          number_of_grids: formData.number_of_grids,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI configuration failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      setAiResult(result);
      
      // Auto-apply the AI recommendations
      setFormData(prev => ({
        ...prev,
        lower_price: result.lower_limit,
        upper_price: result.upper_limit,
      }));

      alert(`🤖 AI Configuration Complete!\n\nOptimal Grid Range: $${result.lower_limit} - $${result.upper_limit}\n\n${result.reasoning}`);
    } catch (error) {
      console.error('Error in AI grid configuration:', error);
      alert(`Failed to configure grid with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAiConfiguring(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.symbol || formData.lower_price <= 0 || formData.upper_price <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const strategy: Omit<TradingStrategy, 'id'> = {
        name: formData.name,
        type: 'spot_grid',
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
        },
      };

      await onSave(strategy);
    } catch (error) {
      console.error('Error creating spot grid strategy:', error);
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
              <h2 className="text-2xl font-bold text-white mb-2">Create Spot Grid Bot</h2>
              <p className="text-gray-400">Automate buy-low/sell-high trades within a defined price range</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* AI Grid Configuration Section */}
          {formData.symbol && (
            <Card className="p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">AI Grid Configuration</h3>
                  <p className="text-sm text-purple-300">Let AI analyze {formData.symbol} and optimize your grid range</p>
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-purple-400 mb-2">How AI Analysis Works:</h4>
                <ul className="text-sm text-purple-300 space-y-1">
                  <li>• Analyzes 1-year historical price data for {formData.symbol}</li>
                  <li>• Calculates Bollinger Bands for mean-reversion range</li>
                  <li>• Considers RSI and momentum indicators</li>
                  <li>• Adjusts for recent volatility patterns</li>
                  <li>• Ensures current price is safely within range</li>
                  <li>• Optimizes for {formData.number_of_grids} grid levels</li>
                </ul>
              </div>

              <Button
                onClick={handleAIConfigureGrid}
                disabled={aiConfiguring}
                isLoading={aiConfiguring}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Bot className="w-4 h-4 mr-2" />
                {aiConfiguring ? 'Analyzing Market Data...' : `🤖 AI Configure Grid for ${formData.symbol}`}
              </Button>

              {aiResult && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-green-400" />
                    <span className="font-medium text-green-400">AI Configuration Applied</span>
                  </div>
                  <div className="text-sm text-green-300">
                    <p>Range: ${aiResult.lower_limit} - ${aiResult.upper_limit}</p>
                    <p className="text-xs text-gray-400 mt-1">Grid spacing optimized for current market conditions</p>
                  </div>
                </div>
              )}
            </Card>
          )}

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
                placeholder="Search for a symbol (e.g., BTC, AAPL)"
                className="w-full"
              />
            </div>

            {/* AI Grid Configuration Section */}
            {formData.symbol && (
              <Card className="p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">AI Grid Configuration</h3>
                    <p className="text-sm text-purple-300">Let AI analyze {formData.symbol} and optimize your grid range</p>
                  </div>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-purple-400 mb-2">How AI Analysis Works:</h4>
                  <ul className="text-sm text-purple-300 space-y-1">
                    <li>• Analyzes 1-year historical price data for {formData.symbol}</li>
                    <li>• Calculates Bollinger Bands for mean-reversion range</li>
                    <li>• Considers RSI and momentum indicators</li>
                    <li>• Adjusts for recent volatility patterns</li>
                    <li>• Ensures current price is safely within range</li>
                    <li>• Optimizes for {formData.number_of_grids} grid levels</li>
                  </ul>
                </div>

                <Button
                  onClick={handleAIConfigureGrid}
                  disabled={aiConfiguring}
                  isLoading={aiConfiguring}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  {aiConfiguring ? 'Analyzing Market Data...' : `🤖 AI Configure Grid for ${formData.symbol}`}
                </Button>

                {aiResult && (
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-green-400" />
                      <span className="font-medium text-green-400">AI Configuration Applied</span>
                    </div>
                    <div className="text-sm text-green-300">
                      <p>Range: ${aiResult.lower_limit} - ${aiResult.upper_limit}</p>
                      <p className="text-xs text-gray-400 mt-1">Grid spacing optimized for current market conditions</p>
                    </div>
                  </div>
                )}
              </Card>
            )}

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
                  placeholder="20"
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
                Create Spot Grid Bot
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}