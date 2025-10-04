import React from 'react';
import { X, AlertTriangle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { OrderData } from './OrderEntryForm';

interface OrderPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderData;
  estimatedPrice: number;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function OrderPreviewModal({
  isOpen,
  onClose,
  order,
  estimatedPrice,
  onConfirm,
  isSubmitting = false,
}: OrderPreviewModalProps) {
  if (!isOpen) return null;

  const estimatedTotal = order.quantity * estimatedPrice;
  const isBuy = order.side === 'buy';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Confirm Order</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Order Details */}
        <div className="p-6 space-y-4">
          {/* Order Type Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isBuy ? (
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
              ) : (
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
              )}
              <div>
                <h3 className={`text-2xl font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                  {order.side.toUpperCase()} {order.symbol}
                </h3>
                <p className="text-sm text-gray-400 capitalize">{order.type.replace('_', ' ')} Order</p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-3 bg-gray-800/50 rounded-lg p-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Quantity:</span>
              <span className="text-white font-medium">{order.quantity.toLocaleString()}</span>
            </div>

            {order.type === 'market' && (
              <div className="flex justify-between">
                <span className="text-gray-400">Est. Price:</span>
                <span className="text-white font-medium">
                  ${estimatedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {(order.type === 'limit' || order.type === 'stop_limit') && order.limit_price && (
              <div className="flex justify-between">
                <span className="text-gray-400">Limit Price:</span>
                <span className="text-white font-medium">
                  ${order.limit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {(order.type === 'stop' || order.type === 'stop_limit') && order.stop_price && (
              <div className="flex justify-between">
                <span className="text-gray-400">Stop Price:</span>
                <span className="text-white font-medium">
                  ${order.stop_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-400">Time in Force:</span>
              <span className="text-white font-medium uppercase">{order.time_in_force}</span>
            </div>

            <div className="border-t border-gray-700 pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Est. Total:</span>
                <span className="text-white font-bold text-lg">
                  ${estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Warning for Market Orders */}
          {order.type === 'market' && (
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-300">
                <p className="font-medium mb-1">Market Order Notice</p>
                <p className="text-yellow-400">
                  Your order will execute at the best available price. The final execution price may differ from the estimated price shown.
                </p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {order.type !== 'market' && (
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">{order.type === 'limit' ? 'Limit' : order.type === 'stop' ? 'Stop' : 'Stop Limit'} Order</p>
                <p className="text-blue-400">
                  Your order will {order.type === 'stop' || order.type === 'stop_limit' ? 'trigger' : 'execute'} when market conditions are met.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-700">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className={`flex-1 font-semibold ${
              isBuy
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-red-500 hover:bg-red-600'
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Confirm Order'}
          </Button>
        </div>
      </div>
    </div>
  );
}
