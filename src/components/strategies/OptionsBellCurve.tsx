import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Info } from 'lucide-react';

interface OptionsBellCurveProps {
  currentPrice: number;
  selectedStrike: number;
  impliedVolatility: number;
  timeToExpiration: number;
  targetPoS: number;
  optionType: 'call' | 'put';
  className?: string;
}

export function OptionsBellCurve({
  currentPrice,
  selectedStrike,
  impliedVolatility,
  timeToExpiration,
  targetPoS,
  optionType,
  className = ''
}: OptionsBellCurveProps) {
  // Calculate standard deviation for the time period
  const annualizedStdDev = impliedVolatility * Math.sqrt(timeToExpiration);
  const priceStdDev = currentPrice * annualizedStdDev;
  
  // Calculate price range for the bell curve (±3 standard deviations)
  const minPrice = Math.max(0, currentPrice - 3 * priceStdDev);
  const maxPrice = currentPrice + 3 * priceStdDev;
  const priceRange = maxPrice - minPrice;
  
  // Generate bell curve points
  const generateBellCurve = () => {
    const points = [];
    const numPoints = 100;
    
    for (let i = 0; i <= numPoints; i++) {
      const price = minPrice + (priceRange * i) / numPoints;
      const z = (price - currentPrice) / priceStdDev;
      const probability = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
      
      // Normalize to fit in our chart (0-100 height)
      const normalizedProb = probability * priceStdDev * 100;
      
      points.push({
        x: (i / numPoints) * 100, // 0-100% of chart width
        y: 100 - Math.min(normalizedProb, 100), // Flip Y axis
        price: price
      });
    }
    
    return points;
  };

  const bellCurvePoints = generateBellCurve();
  const pathData = bellCurvePoints.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  // Calculate positions on the chart
  const currentPricePosition = ((currentPrice - minPrice) / priceRange) * 100;
  const strikePosition = ((selectedStrike - minPrice) / priceRange) * 100;
  
  // Calculate standard deviation markers
  const stdDev1Position = ((currentPrice + priceStdDev - minPrice) / priceRange) * 100;
  const stdDevNeg1Position = ((currentPrice - priceStdDev - minPrice) / priceRange) * 100;
  const stdDev2Position = ((currentPrice + 2 * priceStdDev - minPrice) / priceRange) * 100;
  const stdDevNeg2Position = ((currentPrice - 2 * priceStdDev - minPrice) / priceRange) * 100;

  // Calculate the area representing probability of success
  const getSuccessArea = () => {
    if (optionType === 'call') {
      // For calls, success is price staying below strike
      const successPoints = bellCurvePoints.filter(point => point.price <= selectedStrike);
      if (successPoints.length === 0) return '';
      
      const areaPath = [
        `M ${successPoints[0].x} 100`,
        ...successPoints.map(point => `L ${point.x} ${point.y}`),
        `L ${successPoints[successPoints.length - 1].x} 100`,
        'Z'
      ].join(' ');
      
      return areaPath;
    } else {
      // For puts, success is price staying above strike
      const successPoints = bellCurvePoints.filter(point => point.price >= selectedStrike);
      if (successPoints.length === 0) return '';
      
      const areaPath = [
        `M ${successPoints[0].x} 100`,
        ...successPoints.map(point => `L ${point.x} ${point.y}`),
        `L ${successPoints[successPoints.length - 1].x} 100`,
        'Z'
      ].join(' ');
      
      return areaPath;
    }
  };

  const successAreaPath = getSuccessArea();

  return (
    <div className={`bg-gray-800/30 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h4 className="font-semibold text-white">Probability Distribution</h4>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Info className="w-4 h-4 text-blue-400" />
          <span className="text-gray-400">At Expiration</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-48 bg-gray-900/50 rounded-lg p-4 mb-4">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="bellCurveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="successGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          
          {/* Success area */}
          {successAreaPath && (
            <path
              d={successAreaPath}
              fill="url(#successGradient)"
              stroke="none"
            />
          )}
          
          {/* Bell curve */}
          <path
            d={pathData}
            stroke="#8b5cf6"
            strokeWidth="0.5"
            fill="url(#bellCurveGradient)"
            fillOpacity="0.3"
          />
          
          {/* Standard deviation lines */}
          <line x1={stdDevNeg2Position} y1="0" x2={stdDevNeg2Position} y2="100" stroke="#6b7280" strokeWidth="0.3" strokeDasharray="2,2" />
          <line x1={stdDevNeg1Position} y1="0" x2={stdDevNeg1Position} y2="100" stroke="#9ca3af" strokeWidth="0.4" strokeDasharray="1,1" />
          <line x1={stdDev1Position} y1="0" x2={stdDev1Position} y2="100" stroke="#9ca3af" strokeWidth="0.4" strokeDasharray="1,1" />
          <line x1={stdDev2Position} y1="0" x2={stdDev2Position} y2="100" stroke="#6b7280" strokeWidth="0.3" strokeDasharray="2,2" />
          
          {/* Current price line */}
          <line x1={currentPricePosition} y1="0" x2={currentPricePosition} y2="100" stroke="#3b82f6" strokeWidth="0.8" />
          
          {/* Strike price line */}
          <line x1={strikePosition} y1="0" x2={strikePosition} y2="100" stroke="#ef4444" strokeWidth="0.8" />
        </svg>
        
        {/* Price labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 px-2">
          <span>${minPrice.toFixed(0)}</span>
          <span>${maxPrice.toFixed(0)}</span>
        </div>
        
        {/* Current price label */}
        <div 
          className="absolute top-0 transform -translate-x-1/2 text-xs"
          style={{ left: `${currentPricePosition}%` }}
        >
          <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
            Current: ${currentPrice.toFixed(2)}
          </div>
        </div>
        
        {/* Strike price label */}
        <div 
          className="absolute bottom-0 transform -translate-x-1/2 text-xs"
          style={{ left: `${strikePosition}%` }}
        >
          <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
            Strike: ${selectedStrike.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Legend and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h5 className="font-medium text-white text-sm">Legend</h5>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span className="text-gray-400">Current Price</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-red-500"></div>
              <span className="text-gray-400">Strike Price</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-green-500 opacity-60"></div>
              <span className="text-gray-400">Success Zone ({targetPoS.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-gray-500 opacity-50" style={{ borderTop: '1px dashed' }}></div>
              <span className="text-gray-400">±1σ, ±2σ</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h5 className="font-medium text-white text-sm">Statistics</h5>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Implied Volatility:</span>
              <span className="text-white">{(impliedVolatility * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Days to Expiration:</span>
              <span className="text-white">{Math.round(timeToExpiration * 365)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Expected Move (±1σ):</span>
              <span className="text-white">±${priceStdDev.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Probability of Success:</span>
              <span className={`font-medium ${targetPoS >= 70 ? 'text-green-400' : targetPoS >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {targetPoS.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}