import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Grid3X3, Activity } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { GridStatistics } from './GridStatistics';

interface GridOrder {
  id: string;
  grid_level: number;
  side: 'buy' | 'sell';
  limit_price: number;
  quantity: number;
  status: 'pending' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';
  grid_price: number;
  filled_qty: number;
}

interface GridOrdersDisplayProps {
  strategyId: string;
  symbol: string;
  lowerPrice: number;
  upperPrice: number;
  numberOfGrids: number;
  currentPrice?: number;
  allocatedCapital: number;
}

export function GridOrdersDisplay({
  strategyId,
  symbol,
  lowerPrice,
  upperPrice,
  numberOfGrids,
  currentPrice: initialPrice,
  allocatedCapital,
}: GridOrdersDisplayProps) {
  const [gridOrders, setGridOrders] = useState<GridOrder[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(initialPrice || 0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Calculate grid levels
  const calculateGridLevels = () => {
    const levels: number[] = [];
    const step = (upperPrice - lowerPrice) / (numberOfGrids - 1);
    for (let i = 0; i < numberOfGrids; i++) {
      levels.push(lowerPrice + step * i);
    }
    return levels;
  };

  const gridLevels = calculateGridLevels();
  const quantityPerGrid = allocatedCapital / numberOfGrids / (currentPrice || 1);

  // Fetch grid orders from Supabase
  const fetchGridOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('grid_orders')
        .select('*')
        .eq('strategy_id', strategyId)
        .in('status', ['pending', 'partially_filled'])
        .order('grid_level', { ascending: true });

      if (error) throw error;

      setGridOrders(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching grid orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current market price
  const fetchCurrentPrice = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/market-data/live-prices?symbols=${symbol}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const symbolData = data[symbol.toUpperCase()];
        if (symbolData && symbolData.price > 0) {
          setCurrentPrice(symbolData.price);
        }
      }
    } catch (error) {
      console.error('Error fetching current price:', error);
    }
  };

  useEffect(() => {
    fetchGridOrders();
    fetchCurrentPrice();

    // Set up real-time subscription for grid orders
    const channel = supabase
      .channel(`grid_orders_${strategyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grid_orders',
          filter: `strategy_id=eq.${strategyId}`,
        },
        () => {
          fetchGridOrders();
        }
      )
      .subscribe();

    // Refresh price every 10 seconds
    const priceInterval = setInterval(fetchCurrentPrice, 10000);

    return () => {
      channel.unsubscribe();
      clearInterval(priceInterval);
    };
  }, [strategyId]);

  // Calculate percentage distance from current price
  const calculateDistance = (targetPrice: number) => {
    if (!currentPrice || currentPrice === 0) return 0;
    return ((targetPrice - currentPrice) / currentPrice) * 100;
  };

  // Get order at specific grid level
  const getOrderAtLevel = (level: number, side: 'buy' | 'sell') => {
    return gridOrders.find(order => order.grid_level === level && order.side === side);
  };

  // Calculate current price position in range (0-100%)
  const pricePosition = currentPrice && lowerPrice && upperPrice
    ? ((currentPrice - lowerPrice) / (upperPrice - lowerPrice)) * 100
    : 50;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-gray-400">Loading grid orders...</span>
        </div>
      </Card>
    );
  }

  const buyOrders = gridOrders.filter(o => o.side === 'buy');
  const sellOrders = gridOrders.filter(o => o.side === 'sell');
  const filledOrders = gridOrders.filter(o => o.status === 'filled');
  const pendingOrders = gridOrders.filter(o => o.status === 'pending' || o.status === 'partially_filled');

  // Calculate statistics
  const gridSpacing = (upperPrice - lowerPrice) / (numberOfGrids - 1);
  const currentValue = allocatedCapital; // Simplified - would need actual position value
  const unrealizedPnL = 0; // Would be calculated from actual fills
  const unrealizedPnLPercent = 0;
  const gridUtilization = (gridOrders.length / numberOfGrids) * 100;
  const fillRate = filledOrders.length > 0 ? (filledOrders.length / (filledOrders.length + pendingOrders.length)) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Grid Statistics */}
      <GridStatistics
        totalOrders={gridOrders.length}
        buyOrders={buyOrders.length}
        sellOrders={sellOrders.length}
        filledOrders={filledOrders.length}
        pendingOrders={pendingOrders.length}
        allocatedCapital={allocatedCapital}
        currentValue={currentValue}
        unrealizedPnL={unrealizedPnL}
        unrealizedPnLPercent={unrealizedPnLPercent}
        gridUtilization={gridUtilization}
        fillRate={fillRate}
        avgGridSpacing={gridSpacing}
      />
      {/* Header Card */}
      <Card className="p-6 bg-gradient-to-r from-gray-800 to-gray-900">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700/50 rounded-lg mb-3">
            <Grid3X3 className="w-5 h-5 text-blue-400" />
            <span className="text-gray-300 font-medium">Quantity per grid</span>
            <span className="text-white font-bold">{quantityPerGrid.toFixed(6)} {symbol}</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-gray-400">Current price</span>
            <span className="text-2xl font-bold text-white">{symbol}/USDT =</span>
            <span className="text-2xl font-bold text-blue-400">{formatCurrency(currentPrice)}</span>
            <Activity className="w-5 h-5 text-green-500 animate-pulse" />
          </div>

          <div className="text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>

        {/* Price Range Slider */}
        <div className="relative h-16 mb-8">
          {/* Background bar */}
          <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 bg-gray-700 rounded-full overflow-hidden">
            {/* Green zone (buy zone) */}
            <div
              className="absolute left-0 h-full bg-gradient-to-r from-green-500 to-green-600"
              style={{ width: `${Math.min(pricePosition, 100)}%` }}
            />
            {/* Red zone (sell zone) */}
            <div
              className="absolute right-0 h-full bg-gradient-to-r from-red-600 to-red-500"
              style={{ width: `${Math.max(0, 100 - pricePosition)}%` }}
            />
          </div>

          {/* Current price indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-all duration-300"
            style={{ left: `${Math.min(Math.max(pricePosition, 0), 100)}%` }}
          >
            <div className="relative">
              <div className="w-1 h-12 bg-white rounded-full shadow-lg" />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 px-3 py-1 rounded-lg border border-white shadow-lg">
                <div className="text-xs text-white font-bold">{formatCurrency(currentPrice)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Range labels */}
        <div className="flex justify-between text-sm">
          <div className="text-left">
            <div className="text-gray-400 mb-1">Buy price</div>
            <div className="text-green-400 font-bold">{formatCurrency(lowerPrice)}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-400 mb-1">Sell price</div>
            <div className="text-red-400 font-bold">{formatCurrency(upperPrice)}</div>
          </div>
        </div>
      </Card>

      {/* Grid Orders Table */}
      <Card className="overflow-hidden">
        <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-blue-400" />
            Open Grid Orders
            <span className="ml-auto text-sm text-gray-400">
              {gridOrders.length} active orders
            </span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Grid Level
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Buy Price
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  How far to fill
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Sell Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {gridLevels.map((level, index) => {
                const buyOrder = getOrderAtLevel(index, 'buy');
                const sellOrder = getOrderAtLevel(index, 'sell');
                const buyDistance = calculateDistance(level);
                const sellDistance = calculateDistance(level);
                const isNearPrice = Math.abs(buyDistance) < 2;

                return (
                  <tr
                    key={index}
                    className={`transition-colors ${
                      isNearPrice
                        ? 'bg-blue-500/10 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-800/30'
                    }`}
                  >
                    {/* Grid Level Badge */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {buyOrder && (
                            <span className="inline-flex items-center justify-center w-7 h-7 bg-green-500 text-white text-xs font-bold rounded">
                              {index + 1}
                            </span>
                          )}
                          {sellOrder && (
                            <span className="inline-flex items-center justify-center w-7 h-7 bg-red-500 text-white text-xs font-bold rounded">
                              {index + 1}
                            </span>
                          )}
                          {!buyOrder && !sellOrder && (
                            <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-700 text-gray-400 text-xs font-bold rounded">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        {isNearPrice && (
                          <span className="text-xs text-blue-400 font-medium">← Current</span>
                        )}
                      </div>
                    </td>

                    {/* Buy Price */}
                    <td className="px-4 py-4 text-right">
                      {buyOrder ? (
                        <div>
                          <div className="text-white font-medium">{formatCurrency(level)}</div>
                          <div className="text-xs text-gray-400">
                            {buyOrder.quantity.toFixed(6)} {symbol}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    {/* Distance to Fill */}
                    <td className="px-4 py-4 text-center">
                      {buyOrder && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 rounded-full">
                          <TrendingDown className="w-3 h-3 text-green-400" />
                          <span className="text-green-400 font-medium text-sm">
                            {buyDistance.toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {sellOrder && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 rounded-full">
                          <TrendingUp className="w-3 h-3 text-red-400" />
                          <span className="text-red-400 font-medium text-sm">
                            +{sellDistance.toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {!buyOrder && !sellOrder && (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </td>

                    {/* Sell Price */}
                    <td className="px-4 py-4 text-right">
                      {sellOrder ? (
                        <div>
                          <div className="text-white font-medium">{formatCurrency(level)}</div>
                          <div className="text-xs text-gray-400">
                            {sellOrder.quantity.toFixed(6)} {symbol}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="bg-gray-800/30 px-6 py-4 border-t border-gray-700">
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-gray-400 mb-1">Buy Orders</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-white font-bold text-lg">{buyOrders.length}</span>
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Sell Orders</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-white font-bold text-lg">{sellOrders.length}</span>
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Total Active</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-white font-bold text-lg">{gridOrders.length}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
