import React, { useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Shield, Info } from 'lucide-react';
import { Card } from '../ui/Card';

interface TakeProfitLevel {
  percent: number;
  quantity_percent: number;
}

interface TakeProfitStopLossConfigProps {
  stopLossPercent: number;
  onStopLossChange: (value: number) => void;
  takeProfitLevels: TakeProfitLevel[];
  onTakeProfitLevelsChange: (levels: TakeProfitLevel[]) => void;
  trailingStopPercent: number;
  onTrailingStopChange: (value: number) => void;
  stopLossType: string;
  onStopLossTypeChange: (type: string) => void;
  breakevenTriggerPercent: number;
  onBreakevenTriggerChange: (value: number) => void;
  timeBasedExitHours: number;
  onTimeBasedExitChange: (value: number) => void;
  entryPrice?: number;
  side?: 'long' | 'short';
  showAdvanced?: boolean;
}

export function TakeProfitStopLossConfig({
  stopLossPercent,
  onStopLossChange,
  takeProfitLevels,
  onTakeProfitLevelsChange,
  trailingStopPercent,
  onTrailingStopChange,
  stopLossType,
  onStopLossTypeChange,
  breakevenTriggerPercent,
  onBreakevenTriggerChange,
  timeBasedExitHours,
  onTimeBasedExitChange,
  entryPrice = 100,
  side = 'long',
  showAdvanced = true,
}: TakeProfitStopLossConfigProps) {
  const [showBreakeven, setShowBreakeven] = useState(breakevenTriggerPercent > 0);
  const [showTimeExit, setShowTimeExit] = useState(timeBasedExitHours > 0);

  const calculatePrice = (percent: number, isStopLoss: boolean) => {
    if (side === 'long') {
      return isStopLoss
        ? entryPrice * (1 - percent / 100)
        : entryPrice * (1 + percent / 100);
    } else {
      return isStopLoss
        ? entryPrice * (1 + percent / 100)
        : entryPrice * (1 - percent / 100);
    }
  };

  const calculateRiskReward = () => {
    if (stopLossPercent === 0 || takeProfitLevels.length === 0) return null;
    const firstTP = takeProfitLevels[0].percent;
    return (firstTP / stopLossPercent).toFixed(2);
  };

  const addTakeProfitLevel = () => {
    const newLevel: TakeProfitLevel = {
      percent: (takeProfitLevels.length + 1) * 5,
      quantity_percent: 50,
    };
    onTakeProfitLevelsChange([...takeProfitLevels, newLevel]);
  };

  const removeTakeProfitLevel = (index: number) => {
    const newLevels = takeProfitLevels.filter((_, i) => i !== index);
    onTakeProfitLevelsChange(newLevels);
  };

  const updateTakeProfitLevel = (index: number, field: keyof TakeProfitLevel, value: number) => {
    const newLevels = [...takeProfitLevels];
    newLevels[index] = { ...newLevels[index], [field]: value };
    onTakeProfitLevelsChange(newLevels);
  };

  const stopLossPrice = stopLossPercent > 0 ? calculatePrice(stopLossPercent, true) : null;
  const riskReward = calculateRiskReward();

  return (
    <div className="space-y-6">
      {/* Risk/Reward Summary */}
      {riskReward && (
        <Card className="bg-gradient-to-r from-blue-500/10 to-green-500/10 border-blue-500/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium">Risk/Reward Ratio</span>
              </div>
              <span className="text-2xl font-bold text-green-400">1:{riskReward}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              For every $1 risked, potential reward is ${riskReward}
            </p>
          </div>
        </Card>
      )}

      {/* Stop Loss Configuration */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold">Stop Loss</h3>
        </div>

        <div className="space-y-4">
          {/* Stop Loss Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Stop Loss Type</label>
            <select
              value={stopLossType}
              onChange={(e) => onStopLossTypeChange(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="fixed">Fixed Stop Loss</option>
              <option value="trailing">Trailing Stop Loss</option>
              <option value="atr_based">ATR-Based Stop</option>
              <option value="volatility_adjusted">Volatility Adjusted</option>
            </select>
          </div>

          {/* Stop Loss Percentage */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Stop Loss Percentage
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={stopLossPercent}
                onChange={(e) => onStopLossChange(parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                value={stopLossPercent}
                onChange={(e) => onStopLossChange(parseFloat(e.target.value) || 0)}
                className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-center"
                step="0.5"
                min="0"
                max="100"
              />
              <span className="text-sm text-gray-400">%</span>
            </div>
            {stopLossPrice && (
              <p className="text-sm text-gray-400 mt-2">
                Stop loss will trigger at ${stopLossPrice.toFixed(2)}
              </p>
            )}
          </div>

          {/* Trailing Stop (if selected) */}
          {stopLossType === 'trailing' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Trailing Distance
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={trailingStopPercent}
                  onChange={(e) => onTrailingStopChange(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  value={trailingStopPercent}
                  onChange={(e) => onTrailingStopChange(parseFloat(e.target.value) || 0)}
                  className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-center"
                  step="0.5"
                  min="0"
                  max="100"
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>Trail stop will follow price, maintaining this distance from the highest price reached</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Take Profit Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold">Take Profit Levels</h3>
          </div>
          <button
            onClick={addTakeProfitLevel}
            className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Level
          </button>
        </div>

        {takeProfitLevels.length === 0 ? (
          <Card className="border-dashed border-gray-700">
            <div className="p-8 text-center text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No take profit levels configured</p>
              <p className="text-xs mt-1">Click "Add Level" to create profit targets</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {takeProfitLevels.map((level, index) => {
              const targetPrice = calculatePrice(level.percent, false);
              return (
                <Card key={index} className="border-green-500/20 bg-green-500/5">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Level {index + 1}</span>
                      <button
                        onClick={() => removeTakeProfitLevel(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Profit Target %
                        </label>
                        <input
                          type="number"
                          value={level.percent}
                          onChange={(e) =>
                            updateTakeProfitLevel(index, 'percent', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                          step="0.5"
                          min="0"
                          max="1000"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Position to Close %
                        </label>
                        <input
                          type="number"
                          value={level.quantity_percent}
                          onChange={(e) =>
                            updateTakeProfitLevel(index, 'quantity_percent', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                          step="5"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 bg-gray-800/50 rounded px-3 py-2">
                      Close {level.quantity_percent}% of position when price reaches $
                      {targetPrice.toFixed(2)} (+{level.percent}%)
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-4 border-t border-gray-700 pt-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Advanced Options
          </h3>

          {/* Breakeven Stop */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBreakeven}
                onChange={(e) => {
                  setShowBreakeven(e.target.checked);
                  if (!e.target.checked) onBreakevenTriggerChange(0);
                }}
                className="w-4 h-4 rounded border-gray-700 bg-gray-800 checked:bg-blue-600"
              />
              <span className="text-sm font-medium">Enable Breakeven Stop</span>
            </label>

            {showBreakeven && (
              <div className="ml-6 space-y-2">
                <label className="block text-xs text-gray-400">
                  Move stop to breakeven when profit reaches
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={breakevenTriggerPercent}
                    onChange={(e) => onBreakevenTriggerChange(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={breakevenTriggerPercent}
                    onChange={(e) => onBreakevenTriggerChange(parseFloat(e.target.value) || 0)}
                    className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-center text-sm"
                    step="0.5"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Automatically move stop loss to entry price to protect gains</span>
                </p>
              </div>
            )}
          </div>

          {/* Time-Based Exit */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTimeExit}
                onChange={(e) => {
                  setShowTimeExit(e.target.checked);
                  if (!e.target.checked) onTimeBasedExitChange(0);
                }}
                className="w-4 h-4 rounded border-gray-700 bg-gray-800 checked:bg-blue-600"
              />
              <span className="text-sm font-medium">Enable Time-Based Exit</span>
            </label>

            {showTimeExit && (
              <div className="ml-6 space-y-2">
                <label className="block text-xs text-gray-400">
                  Maximum holding period (hours)
                </label>
                <input
                  type="number"
                  value={timeBasedExitHours}
                  onChange={(e) => onTimeBasedExitChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                  step="1"
                  min="0"
                  max="720"
                  placeholder="e.g., 24"
                />
                <p className="text-xs text-gray-500 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Automatically close position after this time regardless of price</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Profit/Loss Preview */}
      <Card className="bg-gray-800/50">
        <div className="p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-400">Exit Price Summary</h4>
          <div className="space-y-2 text-sm">
            {takeProfitLevels.length > 0 && (
              <div className="flex justify-between items-center text-green-400">
                <span>Take Profit Targets:</span>
                <span className="font-mono">
                  {takeProfitLevels.map((l, i) => (
                    <span key={i}>
                      ${calculatePrice(l.percent, false).toFixed(2)}
                      {i < takeProfitLevels.length - 1 && ', '}
                    </span>
                  ))}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-gray-400">
              <span>Entry Price:</span>
              <span className="font-mono">${entryPrice.toFixed(2)}</span>
            </div>
            {stopLossPrice && (
              <div className="flex justify-between items-center text-red-400">
                <span>Stop Loss:</span>
                <span className="font-mono">${stopLossPrice.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
