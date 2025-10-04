import React, { useState } from 'react';
import { AlertCircle, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { NumericInput } from '../ui/NumericInput';

type OrderSide = 'buy' | 'sell';
type OrderType = 'market' | 'limit';
type TimeInForce = 'day' | 'gtc';
type OptionType = 'call' | 'put';

interface OptionData {
  bid: number;
  ask: number;
  last: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  implied_volatility: number;
  probability_of_success: number;
}

interface OptionsOrderEntryProps {
  symbol: string;
  currentPrice: number;
  selectedOption: {
    type: OptionType;
    strike: number;
    expiration: string;
    data: OptionData;
  } | null;
  onSubmit: (order: OptionsOrderData) => void;
  disabled?: boolean;
  buyingPower?: number;
}

export interface OptionsOrderData {
  symbol: string;
  option_type: OptionType;
  strike: number;
  expiration: string;
  side: OrderSide;
  order_type: OrderType;
  contracts: number;
  limit_price?: number;
  time_in_force: TimeInForce;
}

export function OptionsOrderEntry({
  symbol,
  currentPrice,
  selectedOption,
  onSubmit,
  disabled,
  buyingPower = 0,
}: OptionsOrderEntryProps) {
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [contracts, setContracts] = useState<string>('');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('day');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  const validateOrder = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newWarnings: string[] = [];

    if (!symbol) {
      newErrors.symbol = 'Please select a symbol';
    }

    if (!selectedOption) {
      newErrors.option = 'Please select an option from the chain';
    }

    const numContracts = parseFloat(contracts);
    if (!contracts || isNaN(numContracts) || numContracts <= 0 || !Number.isInteger(numContracts)) {
      newErrors.contracts = 'Contracts must be a positive whole number';
    }

    if (orderType === 'limit') {
      const limit = parseFloat(limitPrice);
      if (!limitPrice || isNaN(limit) || limit <= 0) {
        newErrors.limitPrice = 'Limit price is required';
      } else if (selectedOption) {
        const midPrice = (selectedOption.data.bid + selectedOption.data.ask) / 2;
        if (side === 'buy' && limit > selectedOption.data.ask * 1.2) {
          newWarnings.push('Limit price is significantly above ask price');
        } else if (side === 'sell' && limit < selectedOption.data.bid * 0.8) {
          newWarnings.push('Limit price is significantly below bid price');
        }
      }
    }

    const estimatedCost = calculateEstimatedCost();
    if (side === 'buy' && estimatedCost > buyingPower && buyingPower > 0) {
      newErrors.contracts = `Insufficient buying power. Available: $${buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (numContracts > 100) {
      newWarnings.push('Large number of contracts - verify order size');
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateOrder() || !selectedOption) {
      return;
    }

    const orderData: OptionsOrderData = {
      symbol,
      option_type: selectedOption.type,
      strike: selectedOption.strike,
      expiration: selectedOption.expiration,
      side,
      order_type: orderType,
      contracts: parseFloat(contracts),
      time_in_force: timeInForce,
    };

    if (orderType === 'limit') {
      orderData.limit_price = parseFloat(limitPrice);
    }

    onSubmit(orderData);
  };

  const calculateEstimatedCost = (): number => {
    if (!selectedOption || !contracts) return 0;

    const numContracts = parseFloat(contracts) || 0;
    let price = (selectedOption.data.bid + selectedOption.data.ask) / 2;

    if (orderType === 'limit' && limitPrice) {
      price = parseFloat(limitPrice) || price;
    }

    return numContracts * price * 100;
  };

  const estimatedCost = calculateEstimatedCost();
  const daysToExpiration = selectedOption
    ? Math.ceil((new Date(selectedOption.expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selected Option Display */}
      {selectedOption ? (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Selected Option:</span>
              <span className={`text-xs px-2 py-1 rounded ${
                selectedOption.type === 'call' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {selectedOption.type.toUpperCase()}
              </span>
            </div>
            <div className="text-white font-semibold">
              {symbol} ${selectedOption.strike} {selectedOption.type.toUpperCase()}
            </div>
            <div className="text-sm text-gray-400">
              Exp: {new Date(selectedOption.expiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ({daysToExpiration} days)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-700">
              <div>
                <span className="text-gray-500">Bid:</span>
                <span className="text-white ml-1">${selectedOption.data.bid.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">Ask:</span>
                <span className="text-white ml-1">${selectedOption.data.ask.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">Delta:</span>
                <span className="text-white ml-1">{selectedOption.data.delta.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-gray-500">IV:</span>
                <span className="text-white ml-1">{selectedOption.data.implied_volatility}%</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300">Select an option from the chain above to begin</p>
          </div>
        </div>
      )}

      {/* Side Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Action
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
            BUY TO OPEN
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
            SELL TO OPEN
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {side === 'buy' ? 'Buy to open a long position' : 'Sell to open a short position (requires margin approval)'}
        </p>
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
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {orderType === 'market' && 'Execute immediately at best available price'}
          {orderType === 'limit' && 'Execute at specified price or better'}
        </p>
      </div>

      {/* Contracts */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Contracts
        </label>
        <NumericInput
          value={contracts}
          onChange={setContracts}
          placeholder="0"
          min={1}
          step={1}
          className={errors.contracts ? 'border-red-500' : ''}
        />
        {errors.contracts && (
          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.contracts}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Each contract controls 100 shares
        </p>
      </div>

      {/* Limit Price */}
      {orderType === 'limit' && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Limit Price (per share)
          </label>
          <NumericInput
            value={limitPrice}
            onChange={setLimitPrice}
            placeholder={selectedOption ? ((selectedOption.data.bid + selectedOption.data.ask) / 2).toFixed(2) : '0.00'}
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

      {/* Greeks Summary */}
      {selectedOption && contracts && (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">Position Greeks (per contract)</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Delta:</span>
                <span className="text-white ml-1">{selectedOption.data.delta.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-gray-400">Gamma:</span>
                <span className="text-white ml-1">{selectedOption.data.gamma.toFixed(4)}</span>
              </div>
              <div>
                <span className="text-gray-400">Theta:</span>
                <span className="text-white ml-1">${selectedOption.data.theta.toFixed(2)}/day</span>
              </div>
              <div>
                <span className="text-gray-400">Vega:</span>
                <span className="text-white ml-1">{selectedOption.data.vega.toFixed(3)}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-700">
              <span className="text-xs text-gray-400">Probability of Success:</span>
              <span className="text-sm text-white ml-2 font-semibold">
                {selectedOption.data.probability_of_success.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Estimated Cost */}
      {contracts && !isNaN(parseFloat(contracts)) && selectedOption && (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Estimated {side === 'buy' ? 'Cost' : 'Credit'}:</span>
              <span className="text-white font-semibold">
                ${estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Per Contract:</span>
              <span className="text-gray-400">
                ${(estimatedCost / parseFloat(contracts)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {buyingPower > 0 && side === 'buy' && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-700">
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
        disabled={disabled || !symbol || !selectedOption}
      >
        <DollarSign className="w-4 h-4 inline mr-2" />
        {side === 'buy' ? 'Buy to Open' : 'Sell to Open'}
      </Button>

      {!selectedOption && (
        <p className="text-xs text-yellow-400 text-center flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Select an option from the chain above to enable order entry
        </p>
      )}
    </form>
  );
}
