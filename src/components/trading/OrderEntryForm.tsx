import React, { useState } from 'react';
import { AlertCircle, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { NumericInput } from '../ui/NumericInput';

type OrderSide = 'buy' | 'sell';
type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok';

interface OrderEntryFormProps {
  symbol: string;
  currentPrice: number;
  onSubmit: (order: OrderData) => void;
  disabled?: boolean;
  buyingPower?: number;
}

export interface OrderData {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limit_price?: number;
  stop_price?: number;
  time_in_force: TimeInForce;
}

export function OrderEntryForm({ symbol, currentPrice, onSubmit, disabled, buyingPower = 0 }: OrderEntryFormProps) {
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [quantity, setQuantity] = useState<string>('');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('day');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  const validateOrder = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newWarnings: string[] = [];

    if (!symbol) {
      newErrors.symbol = 'Please select a symbol';
    }

    const qty = parseFloat(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (orderType === 'limit' || orderType === 'stop_limit') {
      const limit = parseFloat(limitPrice);
      if (!limitPrice || isNaN(limit) || limit <= 0) {
        newErrors.limitPrice = 'Limit price is required';
      } else if (side === 'buy' && limit > currentPrice * 1.1) {
        newWarnings.push('Limit price is 10%+ above market price');
      } else if (side === 'sell' && limit < currentPrice * 0.9) {
        newWarnings.push('Limit price is 10%+ below market price');
      }
    }

    if (orderType === 'stop' || orderType === 'stop_limit') {
      const stop = parseFloat(stopPrice);
      if (!stopPrice || isNaN(stop) || stop <= 0) {
        newErrors.stopPrice = 'Stop price is required';
      } else if (side === 'buy' && stop < currentPrice) {
        newWarnings.push('Stop price below market (will trigger immediately)');
      } else if (side === 'sell' && stop > currentPrice) {
        newWarnings.push('Stop price above market (will trigger immediately)');
      }
    }

    const estimatedCost = calculateEstimatedCost();
    if (side === 'buy' && estimatedCost > buyingPower && buyingPower > 0) {
      newErrors.quantity = `Insufficient buying power. Available: $${buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (estimatedCost > 100000) {
      newWarnings.push('Large order value (>$100k) - verify quantity');
    }

    if (qty > 1000) {
      newWarnings.push('Large quantity - may impact market price');
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateOrder()) {
      return;
    }

    const orderData: OrderData = {
      symbol,
      side,
      type: orderType,
      quantity: parseFloat(quantity),
      time_in_force: timeInForce,
    };

    if (orderType === 'limit' || orderType === 'stop_limit') {
      orderData.limit_price = parseFloat(limitPrice);
    }

    if (orderType === 'stop' || orderType === 'stop_limit') {
      orderData.stop_price = parseFloat(stopPrice);
    }

    onSubmit(orderData);
  };

  const calculateEstimatedCost = (): number => {
    const qty = parseFloat(quantity) || 0;
    let price = currentPrice;

    if (orderType === 'limit' || orderType === 'stop_limit') {
      price = parseFloat(limitPrice) || currentPrice;
    }

    return qty * price;
  };

  const estimatedCost = calculateEstimatedCost();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Side Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Side
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide('buy')}
            className={`py-3 rounded-lg font-semibold transition-colors ${
              side === 'buy'
                ? 'bg-green-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            BUY
          </button>
          <button
            type="button"
            onClick={() => setSide('sell')}
            className={`py-3 rounded-lg font-semibold transition-colors ${
              side === 'sell'
                ? 'bg-red-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <TrendingDown className="w-4 h-4 inline mr-2" />
            SELL
          </button>
        </div>
      </div>

      {/* Order Type */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Order Type
        </label>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as OrderType)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
          <option value="stop">Stop</option>
          <option value="stop_limit">Stop Limit</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {orderType === 'market' && 'Execute immediately at current market price'}
          {orderType === 'limit' && 'Execute at specified price or better'}
          {orderType === 'stop' && 'Trigger market order when price reaches stop price'}
          {orderType === 'stop_limit' && 'Trigger limit order when price reaches stop price'}
        </p>
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Quantity
        </label>
        <NumericInput
          value={quantity}
          onChange={setQuantity}
          placeholder="0"
          min={0}
          className={errors.quantity ? 'border-red-500' : ''}
        />
        {errors.quantity && (
          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.quantity}
          </p>
        )}
      </div>

      {/* Limit Price */}
      {(orderType === 'limit' || orderType === 'stop_limit') && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Limit Price
          </label>
          <NumericInput
            value={limitPrice}
            onChange={setLimitPrice}
            placeholder={currentPrice.toFixed(2)}
            min={0}
            step={0.01}
            className={errors.limitPrice ? 'border-red-500' : ''}
          />
          {errors.limitPrice && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.limitPrice}
            </p>
          )}
        </div>
      )}

      {/* Stop Price */}
      {(orderType === 'stop' || orderType === 'stop_limit') && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Stop Price
          </label>
          <NumericInput
            value={stopPrice}
            onChange={setStopPrice}
            placeholder={currentPrice.toFixed(2)}
            min={0}
            step={0.01}
            className={errors.stopPrice ? 'border-red-500' : ''}
          />
          {errors.stopPrice && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.stopPrice}
            </p>
          )}
        </div>
      )}

      {/* Time in Force */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Time in Force
        </label>
        <select
          value={timeInForce}
          onChange={(e) => setTimeInForce(e.target.value as TimeInForce)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="day">Day (Cancel at market close)</option>
          <option value="gtc">GTC (Good til canceled)</option>
          <option value="ioc">IOC (Immediate or cancel)</option>
          <option value="fok">FOK (Fill or kill)</option>
        </select>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <div key={index} className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-300">{warning}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estimated Cost */}
      {quantity && !isNaN(parseFloat(quantity)) && (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Estimated Cost:</span>
              <span className="text-white font-semibold">
                ${estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {buyingPower > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Buying Power:</span>
                <span className={`font-medium ${estimatedCost > buyingPower ? 'text-red-400' : 'text-gray-400'}`}>
                  ${buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className={`w-full py-3 font-semibold ${
          side === 'buy'
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-red-500 hover:bg-red-600'
        }`}
        disabled={disabled || !symbol}
      >
        <DollarSign className="w-4 h-4 inline mr-2" />
        {side === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
      </Button>

      {!symbol && (
        <p className="text-xs text-yellow-400 text-center flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Select a symbol to enable order entry
        </p>
      )}
    </form>
  );
}