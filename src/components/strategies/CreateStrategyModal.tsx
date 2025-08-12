import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, DollarSign, Shield, Plus, Minus, BookOpen } from 'lucide-react';
import { 
  X, 
  TrendingUp, 
  DollarSign, 
  Shield, 
  AlertTriangle,
  Bot,
  Target,
  BarChart3,
  Zap,
  Grid3X3,
  Repeat,
  ArrowUpDown,
  TrendingDown,
  Activity,
  Coins,
  ChevronLeft,
  Info
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency } from '../../lib/utils';

// Strategy categories organized by type (not user sophistication)
const categorizedStrategies = {
  'Beginner': {
    icon: BookOpen,
    description: 'Basic concepts, low complexity, easy to automate',
    color: 'from-blue-600 to-purple-600',
    borderColor: 'border-purple-500/20',
    strategies: [
      { id: 'dca', name: 'DCA Bot', description: 'Dollar-Cost Averaging - Simple entry schedule, minimal decision-making', risk_level: 'low' as const, min_capital: 500 },
      { id: 'smart_rebalance', name: 'Smart Rebalance Bot', description: 'Automatic portfolio optimization without complex strategy work', risk_level: 'low' as const, min_capital: 5000 },
      { id: 'pairs_trading', name: 'Pairs Trading', description: 'Market neutral strategy trading correlated pairs', risk_level: 'low' as const, min_capital: 10000 },
      { id: 'arbitrage', name: 'Arbitrage', description: 'Cross-exchange arbitrage exploiting price differences', risk_level: 'low' as const, min_capital: 12000 },
      'covered_calls',
      'wheel',
    ]
  },
  'Moderate': {
    icon: TrendingUp,
    description: 'Some options knowledge, risk management, and market awareness needed',
    color: 'from-yellow-500 to-orange-600',
    strategies: [
      'option_collar',
      'short_put_vertical',
      'short_call_vertical',
      'iron_condor',
      'broken_wing_butterfly',
      'infinity_grid',
      'futures_grid',
      'orb',
    ]
  },
  'Advanced': {
    icon: '📈',
    description: 'Complex adjustments, high precision, and active management required',
    color: 'from-orange-600 to-red-600',
    borderColor: 'border-orange-500/20',
    strategies: [
      // Sorted by risk: low to high
      { id: 'long_condor', name: 'Long Condor', description: 'Range-bound profit strategy for sideways market conditions', risk_level: 'low' as const, min_capital: 3000 },
      { id: 'long_call', name: 'Long Call', description: 'Bullish momentum play using long call options for leveraged upside', risk_level: 'medium' as const, min_capital: 5000 },
      { id: 'long_straddle', name: 'Long Straddle', description: 'Profit from high volatility in either direction', risk_level: 'medium' as const, min_capital: 8000 },
      { id: 'long_strangle', name: 'Long Strangle', description: 'Directional volatility strategy for large directional moves', risk_level: 'medium' as const, min_capital: 6000 },
      { id: 'short_call', name: 'Short Call (Naked)', description: 'High-risk premium collection with unlimited upside risk', risk_level: 'high' as const, min_capital: 15000 },
      { id: 'short_straddle', name: 'Short Straddle', description: 'Ultra-high risk volatility selling strategy', risk_level: 'high' as const, min_capital: 20000 },
      { id: 'short_strangle', name: 'Short Strangle', description: 'Premium collection strategy for low volatility environments', risk_level: 'high' as const, min_capital: 25000 },
      'short_put',
    ]
  },
};

const strategyCategories = {
  'Grid Trading Bots': [
    {
      id: 'spot_grid',
      name: 'Spot Grid Bot',
      description: 'Automated grid trading for spot markets with defined price ranges.',
      risk_level: 'low' as const,
      min_capital: 1000,
      icon: Grid3X3,
    },
    {
      id: 'futures_grid',
      name: 'Futures Grid Bot',
      description: 'Grid trading with leverage for futures markets.',
      risk_level: 'medium' as const,
      min_capital: 2000,
      icon: Zap,
    },
    {
      id: 'infinity_grid',
      name: 'Infinity Grid Bot',
      description: 'Grid trading without upper price limit for trending markets.',
      risk_level: 'medium' as const,
      min_capital: 1500,
      icon: Repeat,
    },
  ],
  'Automated Core Strategies': [
    {
      id: 'dca',
      name: 'Dollar-Cost Averaging (DCA)',
      description: 'Systematic investment strategy with regular purchases over time.',
      risk_level: 'low' as const,
      min_capital: 500,
      icon: TrendingUp,
    },
    {
      id: 'smart_rebalance',
      name: 'Smart Rebalance',
      description: 'Automated portfolio rebalancing based on target allocations.',
      risk_level: 'low' as const,
      min_capital: 5000,
      icon: BarChart3,
    },
    {
      id: 'orb',
      name: 'Opening Range Breakout',
      description: 'Momentum strategy based on early trading session price action.',
      risk_level: 'medium' as const,
      min_capital: 5000,
      icon: Target,
    },
    {
      id: 'mean_reversion',
      name: 'Mean Reversion',
      description: 'Statistical arbitrage strategy exploiting price deviations.',
      risk_level: 'medium' as const,
      min_capital: 10000,
      icon: Activity,
    },
    {
      id: 'momentum_breakout',
      name: 'Momentum Breakout',
      description: 'Trend-following strategy capturing strong price movements.',
      risk_level: 'medium' as const,
      min_capital: 7500,
      icon: TrendingUp,
    },
    {
      id: 'pairs_trading',
      name: 'Pairs Trading',
      description: 'Market-neutral strategy trading correlated asset pairs.',
      risk_level: 'medium' as const,
      min_capital: 15000,
      icon: ArrowUpDown,
    },
    {
      id: 'scalping',
      name: 'Scalping',
      description: 'High-frequency trading capturing small price movements.',
      risk_level: 'high' as const,
      min_capital: 5000,
      icon: Zap,
    },
    {
      id: 'swing_trading',
      name: 'Swing Trading',
      description: 'Medium-term strategy holding positions for days to weeks.',
      risk_level: 'medium' as const,
      min_capital: 10000,
      icon: TrendingDown,
    },
    {
      id: 'arbitrage',
      name: 'Arbitrage',
      description: 'Risk-free profit from price differences across markets.',
      risk_level: 'low' as const,
      min_capital: 20000,
      icon: Coins,
    },
    {
      id: 'news_based_trading',
      name: 'News-Based Trading',
      description: 'Algorithmic trading based on news sentiment analysis.',
      risk_level: 'high' as const,
      min_capital: 15000,
      icon: Bot,
    },
  ],
  'Options Income Strategies': [
    {
      id: 'covered_calls',
      name: 'Covered Calls',
      description: 'Generate income by selling call options on owned stocks.',
      risk_level: 'low' as const,
      min_capital: 15000,
      icon: Shield,
    },
    {
      id: 'wheel',
      name: 'The Wheel Strategy',
      description: 'Systematic approach combining cash-secured puts and covered calls.',
      risk_level: 'low' as const,
      min_capital: 20000,
      icon: Repeat,
    },
    {
      id: 'iron_condor',
      name: 'Iron Condor',
      description: 'Range-bound strategy selling both call and put spreads.',
      risk_level: 'medium' as const,
      min_capital: 5000,
      icon: Shield,
    },
    {
      id: 'short_put_vertical',
      name: 'Short Put Vertical',
      description: 'Bullish spread strategy with limited risk and reward.',
      risk_level: 'medium' as const,
      min_capital: 2500,
      icon: TrendingUp,
    },
    {
      id: 'short_call_vertical',
      name: 'Short Call Vertical',
      description: 'Bearish spread strategy with defined maximum loss.',
      risk_level: 'medium' as const,
      min_capital: 3000,
      icon: TrendingDown,
    },
    {
      id: 'iron_butterfly',
      name: 'Iron Butterfly',
      description: 'Neutral strategy profiting from low volatility.',
      risk_level: 'medium' as const,
      min_capital: 4000,
      icon: Shield,
    },
    {
      id: 'broken_wing_butterfly',
      name: 'Broken-Wing Butterfly',
      description: 'Directional butterfly with skewed risk/reward profile.',
      risk_level: 'medium' as const,
      min_capital: 3500,
      icon: Target,
    },
    {
      id: 'option_collar',
      name: 'Option Collar',
      description: 'Protective strategy combining covered calls and protective puts.',
      risk_level: 'low' as const,
      min_capital: 25000,
      icon: Shield,
    },
  ],
  'Options Directional & Volatility': [
    {
      id: 'long_call',
      name: 'Long Call',
      description: 'Bullish strategy with unlimited upside potential.',
      risk_level: 'medium' as const,
      min_capital: 5000,
      icon: TrendingUp,
    },
    {
      id: 'short_call',
      name: 'Short Call (Naked)',
      description: 'Bearish strategy with unlimited risk - requires margin.',
      risk_level: 'high' as const,
      min_capital: 15000,
      icon: AlertTriangle,
    },
    {
      id: 'short_put',
      name: 'Short Put (Naked)',
      description: 'Bullish strategy with obligation to buy at strike price.',
      risk_level: 'medium' as const,
      min_capital: 15000,
      icon: DollarSign,
    },
    {
      id: 'straddle',
      name: 'Long Straddle',
      description: 'Volatility strategy profiting from large price movements.',
      risk_level: 'medium' as const,
      min_capital: 8000,
      icon: ArrowUpDown,
    },
    {
      id: 'short_straddle',
      name: 'Short Straddle',
      description: 'High-risk strategy profiting from low volatility.',
      risk_level: 'high' as const,
      min_capital: 20000,
      icon: ArrowUpDown,
    },
    {
      id: 'long_strangle',
      name: 'Long Strangle',
      description: 'Volatility strategy with lower cost than straddles.',
      risk_level: 'medium' as const,
      min_capital: 6000,
      icon: ArrowUpDown,
    },
    {
      id: 'long_butterfly',
      name: 'Long Butterfly',
      description: 'Neutral strategy with limited risk and reward.',
      risk_level: 'medium' as const,
      min_capital: 3000,
      icon: Target,
    },
    {
      id: 'long_condor',
      name: 'Long Condor',
      description: 'Range-bound strategy with wider profit zone than butterfly.',
      risk_level: 'medium' as const,
      min_capital: 4000,
      icon: Target,
    },
  ],
};

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => void;
}

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const [step, setStep] = useState<'category' | 'strategy' | 'configure'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStrategyType, setSelectedStrategyType] = useState<TradingStrategy['type'] | null>(null);
  const [selectedStrategyDetails, setSelectedStrategyDetails] = useState<any>(null);
  
  // Basic strategy info
  const [strategyName, setStrategyName] = useState('');
  const [description, setDescription] = useState('');
  const [minCapital, setMinCapital] = useState(1000);
  
  // Common parameters
  const [symbol, setSymbol] = useState('AAPL');
  const [allocatedCapital, setAllocatedCapital] = useState(10000);
  
  // Grid bot parameters
  const [priceRangeLower, setPriceRangeLower] = useState(40000);
  const [priceRangeUpper, setPriceRangeUpper] = useState(50000);
  const [numberOfGrids, setNumberOfGrids] = useState(25);
  const [gridMode, setGridMode] = useState<'arithmetic' | 'geometric'>('arithmetic');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState(3);
  const [triggerPrice, setTriggerPrice] = useState<number | undefined>(undefined);
  const [takeProfit, setTakeProfit] = useState<number | undefined>(undefined);
  const [stopLoss, setStopLoss] = useState<number | undefined>(undefined);
  
  // DCA parameters
  const [investmentAmountPerInterval, setInvestmentAmountPerInterval] = useState(100);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [investmentTargetPercent, setInvestmentTargetPercent] = useState(25);
  const [maxBuyPrice, setMaxBuyPrice] = useState<number | undefined>(undefined);
  const [minBuyPrice, setMinBuyPrice] = useState<number | undefined>(undefined);
  
  // Smart rebalance parameters
  const [assets, setAssets] = useState([
    { symbol: 'BTC', allocation: 40 },
    { symbol: 'ETH', allocation: 30 },
    { symbol: 'USDT', allocation: 30 },
  ]);
  const [triggerType, setTriggerType] = useState<'threshold' | 'time'>('threshold');
  const [thresholdDeviationPercent, setThresholdDeviationPercent] = useState(5);
  const [rebalanceFrequency, setRebalanceFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [minTradeAmount, setMinTradeAmount] = useState(100);
  
  // Options parameters
  const [positionSize, setPositionSize] = useState(100);
  const [strikeDelta, setStrikeDelta] = useState(0.30);
  const [expirationDays, setExpirationDays] = useState(30);
  const [profitTarget, setProfitTarget] = useState(50);
  const [minimumPremium, setMinimumPremium] = useState(200);
  const [rollWhenItm, setRollWhenItm] = useState(true);
  const [wingWidth, setWingWidth] = useState(10);
  const [netCreditTarget, setNetCreditTarget] = useState(200);
  const [volatilityFilter, setVolatilityFilter] = useState(25);
  const [strikeSelection, setStrikeSelection] = useState<'atm' | 'otm' | 'itm'>('atm');
  const [maxPremiumPercent, setMaxPremiumPercent] = useState(10);
  const [callDelta, setCallDelta] = useState(0.25);
  const [putDelta, setPutDelta] = useState(-0.25);
  const [volatilityThreshold, setVolatilityThreshold] = useState(20);
  const [assignmentHandling, setAssignmentHandling] = useState<'automatic' | 'manual'>('automatic');
  const [marginRequirement, setMarginRequirement] = useState(10000);
  const [maxLossPerTrade, setMaxLossPerTrade] = useState(3000);
  const [maxDebit, setMaxDebit] = useState(150);
  const [bodyWidth, setBodyWidth] = useState(10);
  const [shortWingWidth, setShortWingWidth] = useState(10);
  const [longWingWidth, setLongWingWidth] = useState(15);
  const [netCostTarget, setNetCostTarget] = useState(50);
  const [rollFrequency, setRollFrequency] = useState<'weekly' | 'monthly'>('monthly');
  
  // Algorithmic strategy parameters
  const [orbPeriod, setOrbPeriod] = useState(30);
  const [breakoutThreshold, setBreakoutThreshold] = useState(0.002);
  const [maxPositionSize, setMaxPositionSize] = useState(100);
  const [volumeConfirmation, setVolumeConfirmation] = useState(true);
  const [lookbackPeriod, setLookbackPeriod] = useState(20);
  const [deviationThreshold, setDeviationThreshold] = useState(2.0);
  const [momentumPeriod, setMomentumPeriod] = useState(14);
  const [pairSymbols, setPairSymbols] = useState(['AAPL', 'MSFT']);
  const [correlationThreshold, setCorrelationThreshold] = useState(0.8);
  const [zScoreEntry, setZScoreEntry] = useState(2.0);
  const [zScoreExit, setZScoreExit] = useState(0.5);
  const [positionRatio, setPositionRatio] = useState(1.0);
  const [timeFrame, setTimeFrame] = useState<'1m' | '5m' | '15m' | '1h' | '1d'>('1m');
  const [maxTradesPerDay, setMaxTradesPerDay] = useState(50);
  const [holdingPeriodMin, setHoldingPeriodMin] = useState(2);
  const [holdingPeriodMax, setHoldingPeriodMax] = useState(10);
  const [rsiOversold, setRsiOversold] = useState(30);
  const [rsiOverbought, setRsiOverbought] = useState(70);
  const [minSpreadThreshold, setMinSpreadThreshold] = useState(0.5);
  const [executionSpeed, setExecutionSpeed] = useState<'fast' | 'medium' | 'slow'>('fast');
  const [exchanges, setExchanges] = useState(['primary', 'secondary']);
  const [sentimentThreshold, setSentimentThreshold] = useState(0.7);
  const [newsSources, setNewsSources] = useState(['reuters', 'bloomberg', 'cnbc']);
  const [reactionWindow, setReactionWindow] = useState(30);

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setStep('strategy');
  };

  const handleStrategySelect = (strategyDetails: any) => {
    setSelectedStrategyType(strategyDetails.id);
    setSelectedStrategyDetails(strategyDetails);
    setStrategyName(strategyDetails.name);
    setDescription(strategyDetails.description);
    setMinCapital(strategyDetails.min_capital);
    setAllocatedCapital(strategyDetails.min_capital);
    setStep('configure');
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setStep('category');
  };

  const handleBackToStrategies = () => {
    setSelectedStrategyType(null);
    setSelectedStrategyDetails(null);
    setStep('strategy');
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Grid Trading Bots': return Grid3X3;
      case 'Automated Core Strategies': return Bot;
      case 'Options Income Strategies': return Shield;
      case 'Options Directional & Volatility': return TrendingUp;
      default: return Activity;
    }
  };

  const getCategoryDescription = (categoryName: string) => {
    switch (categoryName) {
      case 'Grid Trading Bots': return 'Automated trading bots that profit from market volatility within defined ranges';
      case 'Automated Core Strategies': return 'Algorithmic strategies using technical analysis and market patterns';
      case 'Options Income Strategies': return 'Conservative options strategies focused on generating consistent income';
      case 'Options Directional & Volatility': return 'Directional and volatility-based options strategies for active traders';
      default: return 'Trading strategies';
    }
  };

  const handleSave = () => {
    if (!selectedStrategyType || !selectedStrategyDetails) return;

    // Build configuration based on strategy type
    let configuration: Record<string, any> = {
      symbol,
      allocated_capital: allocatedCapital,
    };

    // Add strategy-specific configuration
    switch (selectedStrategyType) {
      case 'spot_grid':
      case 'futures_grid':
        configuration = {
          ...configuration,
          price_range_lower: priceRangeLower,
          price_range_upper: priceRangeUpper,
          number_of_grids: numberOfGrids,
          grid_mode: gridMode,
          trigger_price: triggerPrice,
          take_profit: takeProfit,
          stop_loss: stopLoss,
          ...(selectedStrategyType === 'futures_grid' && {
            direction,
            leverage,
          }),
        };
        break;

      case 'infinity_grid':
        configuration = {
          ...configuration,
          price_range_lower: priceRangeLower,
          number_of_grids: numberOfGrids,
          grid_mode: gridMode,
          trigger_price: triggerPrice,
          take_profit: takeProfit,
          stop_loss: stopLoss,
        };
        break;

      case 'dca':
        configuration = {
          ...configuration,
          investment_amount_per_interval: investmentAmountPerInterval,
          frequency,
          investment_target_percent: investmentTargetPercent,
          max_buy_price: maxBuyPrice,
          min_buy_price: minBuyPrice,
        };
        break;

      case 'smart_rebalance':
        configuration = {
          ...configuration,
          assets,
          trigger_type: triggerType,
          threshold_deviation_percent: thresholdDeviationPercent,
          rebalance_frequency: rebalanceFrequency,
          min_trade_amount: minTradeAmount,
        };
        break;

      case 'covered_calls':
        configuration = {
          ...configuration,
          position_size: positionSize,
          strike_delta: strikeDelta,
          expiration_days: expirationDays,
          minimum_premium: minimumPremium,
          profit_target: profitTarget,
          roll_when_itm: rollWhenItm,
        };
        break;

      case 'wheel':
        configuration = {
          ...configuration,
          position_size: positionSize,
          put_strike_delta: putDelta,
          call_strike_delta: callDelta,
          expiration_days: expirationDays,
          minimum_premium: minimumPremium,
          assignment_handling: assignmentHandling,
        };
        break;

      case 'iron_condor':
        configuration = {
          ...configuration,
          wing_width: wingWidth,
          short_strike_delta: strikeDelta,
          expiration_days: expirationDays,
          net_credit_target: netCreditTarget,
          profit_target: profitTarget,
          stop_loss: { value: stopLoss || 200, type: 'percentage' },
        };
        break;

      case 'straddle':
      case 'long_straddle':
        configuration = {
          ...configuration,
          strike_selection: strikeSelection,
          expiration_days: expirationDays,
          volatility_threshold: volatilityThreshold,
          max_premium_percent: maxPremiumPercent,
          stop_loss: { value: stopLoss || 50, type: 'percentage' },
          take_profit: { value: takeProfit || 100, type: 'percentage' },
        };
        break;

      case 'long_call':
        configuration = {
          ...configuration,
          strike_delta: strikeDelta,
          expiration_days: expirationDays,
          max_premium_percent: maxPremiumPercent,
          stop_loss: { value: stopLoss || 50, type: 'percentage' },
        };
        break;

      case 'short_call':
        configuration = {
          ...configuration,
          strike_delta: strikeDelta,
          expiration_days: expirationDays,
          minimum_premium: minimumPremium,
          stop_loss: { value: stopLoss || 200, type: 'percentage' },
          margin_requirement: marginRequirement,
        };
        break;

      case 'short_straddle':
        configuration = {
          ...configuration,
          strike_selection: strikeSelection,
          expiration_days: expirationDays,
          minimum_premium: minimumPremium,
          volatility_filter: volatilityFilter,
          profit_target: profitTarget,
          stop_loss: { value: stopLoss || 200, type: 'percentage' },
          max_loss_per_trade: maxLossPerTrade,
        };
        break;

      case 'long_butterfly':
        configuration = {
          ...configuration,
          wing_width: wingWidth,
          expiration_days: expirationDays,
          max_debit: maxDebit,
          profit_target: profitTarget,
          stop_loss: { value: stopLoss || 50, type: 'percentage' },
        };
        break;

      case 'long_strangle':
        configuration = {
          ...configuration,
          call_delta: callDelta,
          put_delta: putDelta,
          expiration_days: expirationDays,
          volatility_threshold: volatilityThreshold,
          profit_target: profitTarget,
          stop_loss: { value: stopLoss || 50, type: 'percentage' },
        };
        break;

      case 'short_call_vertical':
        configuration = {
          ...configuration,
          wing_width: wingWidth,
          short_strike_delta: strikeDelta,
          expiration_days: expirationDays,
          net_credit_target: netCreditTarget,
          profit_target: profitTarget,
          stop_loss: { value: stopLoss || 200, type: 'percentage' },
        };
        break;

      case 'long_condor':
        configuration = {
          ...configuration,
          wing_width: wingWidth,
          body_width: bodyWidth,
          expiration_days: expirationDays,
          max_debit_percent: maxPremiumPercent,
          profit_target: profitTarget,
          stop_loss: { value: stopLoss || 100, type: 'percentage' },
        };
        break;

      case 'iron_butterfly':
        configuration = {
          ...configuration,
          wing_width: wingWidth,
          expiration_days: expirationDays,
          net_credit_target: netCreditTarget,
          volatility_filter: volatilityFilter,
          profit_target: profitTarget,
          stop_loss: { value: stopLoss || 200, type: 'percentage' },
        };
        break;

      case 'short_put':
        configuration = {
          ...configuration,
          strike_delta: strikeDelta,
          expiration_days: expirationDays,
          minimum_premium: minimumPremium,
          profit_target: profitTarget,
          stop_loss: { value: stopLoss || 200, type: 'percentage' },
        };
        break;

      case 'short_strangle':
        configuration = {
          ...configuration,
          call_delta: callDelta,
          put_delta: putDelta,
          expiration_days: expirationDays,
          minimum_premium: minimumPremium,
          volatility_filter: volatilityFilter,
          profit_target: profitTarget,
          stop_loss: { value: stopLoss || 200, type: 'percentage' },
        };
        break;

      case 'short_put_vertical':
        configuration = {
          ...configuration,
          wing_width: wingWidth,
          short_strike_delta: strikeDelta,
          expiration_days: expirationDays,
          net_credit_target: netCreditTarget,
          profit_target: profitTarget,
          stop_loss: { value: stopLoss || 200, type: 'percentage' },
        };
        break;

      case 'broken_wing_butterfly':
        configuration = {
          ...configuration,
          short_wing_width: shortWingWidth,
          long_wing_width: longWingWidth,
          expiration_days: expirationDays,
          max_debit: maxDebit,
          profit_target: profitTarget,
          stop_loss: { value: stopLoss || 150, type: 'percentage' },
        };
        break;

      case 'option_collar':
        configuration = {
          ...configuration,
          position_size: positionSize,
          put_delta: putDelta,
          call_delta: callDelta,
          expiration_days: expirationDays,
          net_cost_target: netCostTarget,
          roll_frequency: rollFrequency,
        };
        break;

      case 'orb':
        configuration = {
          ...configuration,
          orb_period: orbPeriod,
          breakout_threshold: breakoutThreshold,
          stop_loss: { value: stopLoss || 1, type: 'percentage' },
          take_profit: { value: takeProfit || 2, type: 'percentage' },
          max_position_size: maxPositionSize,
          volume_confirmation: volumeConfirmation,
        };
        break;

      case 'mean_reversion':
        configuration = {
          ...configuration,
          lookback_period: lookbackPeriod,
          deviation_threshold: deviationThreshold,
          position_size: positionSize,
          stop_loss: { value: stopLoss || 1, type: 'percentage' },
          take_profit: { value: takeProfit || 1.5, type: 'percentage' },
        };
        break;

      case 'momentum_breakout':
        configuration = {
          ...configuration,
          breakout_threshold: breakoutThreshold,
          momentum_period: momentumPeriod,
          volume_confirmation: volumeConfirmation,
          position_size: positionSize,
          stop_loss: { value: stopLoss || 2, type: 'percentage' },
          take_profit: { value: takeProfit || 5, type: 'percentage' },
        };
        break;

      case 'pairs_trading':
        configuration = {
          ...configuration,
          pair_symbols: pairSymbols,
          correlation_threshold: correlationThreshold,
          z_score_entry: zScoreEntry,
          z_score_exit: zScoreExit,
          lookback_period: lookbackPeriod,
          position_ratio: positionRatio,
        };
        break;

      case 'scalping':
        configuration = {
          ...configuration,
          time_frame: timeFrame,
          profit_target: profitTarget / 100, // Convert to decimal
          stop_loss: { value: (stopLoss || 5) / 100, type: 'percentage' },
          max_trades_per_day: maxTradesPerDay,
          position_size: positionSize,
        };
        break;

      case 'swing_trading':
        configuration = {
          ...configuration,
          holding_period_min: holdingPeriodMin,
          holding_period_max: holdingPeriodMax,
          rsi_oversold: rsiOversold,
          rsi_overbought: rsiOverbought,
          position_size: positionSize,
          stop_loss: { value: stopLoss || 3, type: 'percentage' },
          take_profit: { value: takeProfit || 6, type: 'percentage' },
        };
        break;

      case 'arbitrage':
        configuration = {
          ...configuration,
          min_spread_threshold: minSpreadThreshold,
          execution_speed: executionSpeed,
          max_position_size: maxPositionSize,
          exchanges,
        };
        break;

      case 'news_based_trading':
        configuration = {
          ...configuration,
          sentiment_threshold: sentimentThreshold,
          news_sources: newsSources,
          reaction_window: reactionWindow,
          position_size: positionSize,
          stop_loss: { value: stopLoss || 2, type: 'percentage' },
          take_profit: { value: takeProfit || 4, type: 'percentage' },
        };
        break;
    }

    const newStrategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: selectedStrategyType,
      description,
      risk_level: selectedStrategyDetails.risk_level, // Use the default risk level from strategy definition
      min_capital: minCapital,
      is_active: false,
      configuration,
    };

    onSave(newStrategy);
  };

  const renderCategorySelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Choose Strategy Category</h3>
        <p className="text-gray-400">Select a category to explore available trading strategies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(strategyCategories).map(([categoryName, strategies]) => {
          const Icon = getCategoryIcon(categoryName);
          const strategyCount = strategies.length;
          const riskDistribution = strategies.reduce((acc, strategy) => {
            acc[strategy.risk_level] = (acc[strategy.risk_level] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          return (
            <motion.div
              key={categoryName}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCategorySelect(categoryName)}
              className="p-6 bg-gray-800/30 border border-gray-700 rounded-xl cursor-pointer hover:border-blue-500 transition-all group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    {categoryName}
                  </h4>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {getCategoryDescription(categoryName)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{strategyCount} strategies</span>
                </div>
                <div className="flex gap-1">
                  {riskDistribution.low && (
                    <span className="px-2 py-1 bg-green-400/10 text-green-400 text-xs rounded border border-green-400/20">
                      {riskDistribution.low} Low
                    </span>
                  )}
                  {riskDistribution.medium && (
                    <span className="px-2 py-1 bg-yellow-400/10 text-yellow-400 text-xs rounded border border-yellow-400/20">
                      {riskDistribution.medium} Med
                    </span>
                  )}
                  {riskDistribution.high && (
                    <span className="px-2 py-1 bg-red-400/10 text-red-400 text-xs rounded border border-red-400/20">
                      {riskDistribution.high} High
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderStrategySelection = () => {
    if (!selectedCategory) return null;
    
    const strategies = strategyCategories[selectedCategory as keyof typeof strategyCategories];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackToCategories}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Categories
          </Button>
          <div>
            <h3 className="text-xl font-semibold text-white">{selectedCategory}</h3>
            <p className="text-gray-400">{getCategoryDescription(selectedCategory)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {strategies.map((strategy) => {
            const Icon = strategy.icon;
            return (
              <motion.div
                key={strategy.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleStrategySelect(strategy)}
                className="p-6 bg-gray-800/30 border border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {strategy.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(strategy.risk_level)}`}>
                          {strategy.risk_level} risk
                        </span>
                        <span className="text-sm text-gray-400">
                          {formatCurrency(strategy.min_capital)} min
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {strategy.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStrategyConfiguration = () => {
    if (!selectedStrategyType || !selectedStrategyDetails) return null;

    const isGridBot = ['spot_grid', 'futures_grid', 'infinity_grid'].includes(selectedStrategyType);
    const isDCA = selectedStrategyType === 'dca';
    const isSmartRebalance = selectedStrategyType === 'smart_rebalance';
    const isOptionsStrategy = [
      'covered_calls', 'wheel', 'iron_condor', 'straddle', 'long_straddle', 'long_call', 
      'short_call', 'short_straddle', 'long_butterfly', 'long_strangle', 'short_call_vertical',
      'long_condor', 'iron_butterfly', 'short_put', 'short_strangle', 'short_put_vertical',
      'broken_wing_butterfly', 'option_collar'
    ].includes(selectedStrategyType);
    const isAlgorithmicStrategy = [
      'orb', 'mean_reversion', 'momentum_breakout', 'pairs_trading', 'scalping', 
      'swing_trading', 'arbitrage', 'news_based_trading'
    ].includes(selectedStrategyType);

    const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation, 0);

    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackToStrategies}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Strategies
          </Button>
          <div>
            <h3 className="text-xl font-semibold text-white">{selectedStrategyDetails.name}</h3>
            <p className="text-gray-400">Configure your strategy parameters</p>
          </div>
        </div>

        {/* Strategy Overview */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">{selectedStrategyDetails.name}</h4>
              <p className="text-gray-300 mb-3">{selectedStrategyDetails.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(selectedStrategyDetails.risk_level)}`}>
                {selectedStrategyDetails.risk_level} risk
              </span>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Info className="w-3 h-3" />
                <span>Dynamic</span>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              <strong>Risk Level Note:</strong> This is the default risk level for this strategy type. 
              After backtesting with historical data, the risk level will be dynamically updated based on 
              actual performance metrics including volatility, Sharpe ratio, and maximum drawdown.
            </p>
          </div>
        </div>

        {/* Basic Configuration */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold text-white">Basic Configuration</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Strategy Name</label>
              <input
                type="text"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter strategy name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Capital</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  value={minCapital}
                  onChange={(e) => setMinCapital(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="100"
                  step="100"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Recommended minimum for this strategy type</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe your strategy..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Allocated Capital</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  value={allocatedCapital}
                  onChange={(e) => setAllocatedCapital(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={minCapital}
                  step="1000"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Amount of capital to allocate to this strategy</p>
            </div>
          </div>
        </div>

        {/* Strategy-Specific Configuration */}
        {isGridBot && (
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white">Grid Bot Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Trading Pair</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="BTC/USDT"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Number of Grids</label>
                <input
                  type="number"
                  value={numberOfGrids}
                  onChange={(e) => setNumberOfGrids(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="2"
                  max="1000"
                />
                <p className="text-xs text-gray-400 mt-1">More grids = more frequent trades, less profit per trade</p>
              </div>

              {selectedStrategyType !== 'infinity_grid' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Lowest Price (USDT)</label>
                    <input
                      type="number"
                      value={priceRangeLower}
                      onChange={(e) => setPriceRangeLower(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Highest Price (USDT)</label>
                    <input
                      type="number"
                      value={priceRangeUpper}
                      onChange={(e) => setPriceRangeUpper(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </>
              )}

              {selectedStrategyType === 'infinity_grid' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Lowest Price (USDT)</label>
                  <input
                    type="number"
                    value={priceRangeLower}
                    onChange={(e) => setPriceRangeLower(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-400 mt-1">Infinity grid has no upper price limit</p>
                </div>
              )}
            </div>

            {/* Grid Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Grid Mode</label>
              <div className="flex rounded-lg bg-gray-800 border border-gray-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setGridMode('arithmetic')}
                  className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
                    gridMode === 'arithmetic' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Arithmetic
                </button>
                <button
                  type="button"
                  onClick={() => setGridMode('geometric')}
                  className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
                    gridMode === 'geometric' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Geometric
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {gridMode === 'arithmetic'
                  ? 'Equal price differences between grids. Better for trending markets.'
                  : 'Equal percentage changes between grids. Better for volatile markets.'
                }
              </p>
            </div>

            {/* Futures-specific parameters */}
            {selectedStrategyType === 'futures_grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Direction</label>
                  <div className="flex rounded-lg bg-gray-800 border border-gray-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDirection('long')}
                      className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
                        direction === 'long' 
                          ? 'bg-green-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Long
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('short')}
                      className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
                        direction === 'short' 
                          ? 'bg-red-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Short
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Leverage</label>
                  <select
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1x (No Leverage)</option>
                    <option value={2}>2x</option>
                    <option value={3}>3x</option>
                    <option value={5}>5x</option>
                    <option value={10}>10x</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Higher leverage increases both profit potential and risk</p>
                </div>
              </div>
            )}

            {/* Advanced Grid Settings */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h5 className="font-medium text-white mb-4">Advanced Settings (Optional)</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Trigger Price (USDT)</label>
                  <input
                    type="number"
                    value={triggerPrice || ''}
                    onChange={(e) => setTriggerPrice(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Take Profit (USDT)</label>
                  <input
                    type="number"
                    value={takeProfit || ''}
                    onChange={(e) => setTakeProfit(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stop Loss (USDT)</label>
                  <input
                    type="number"
                    value={stopLoss || ''}
                    onChange={(e) => setStopLoss(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DCA Configuration */}
        {isDCA && (
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white">DCA Bot Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Asset to Buy</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="BTC, ETH, AAPL, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Investment Amount per Interval</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    value={investmentAmountPerInterval}
                    onChange={(e) => setInvestmentAmountPerInterval(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="10"
                    step="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Target Portfolio Allocation (%)</label>
                <input
                  type="number"
                  value={investmentTargetPercent}
                  onChange={(e) => setInvestmentTargetPercent(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="100"
                />
                <p className="text-xs text-gray-400 mt-1">Stop buying when this allocation is reached</p>
              </div>
            </div>

            {/* Advanced DCA Settings */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h5 className="font-medium text-white mb-4">Price Limits (Optional)</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Maximum Buy Price</label>
                  <input
                    type="number"
                    value={maxBuyPrice || ''}
                    onChange={(e) => setMaxBuyPrice(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="No limit"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-400 mt-1">Don't buy if price exceeds this level</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Buy Price</label>
                  <input
                    type="number"
                    value={minBuyPrice || ''}
                    onChange={(e) => setMinBuyPrice(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="No limit"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-400 mt-1">Don't buy if price falls below this level</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Smart Rebalance Configuration */}
        {isSmartRebalance && (
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white">Smart Rebalance Configuration</h4>
            
            {/* Asset Allocation Table */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Asset Allocation</label>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="space-y-3">
                  {assets.map((asset, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={asset.symbol}
                          onChange={(e) => {
                            const newAssets = [...assets];
                            newAssets[index].symbol = e.target.value.toUpperCase();
                            setAssets(newAssets);
                          }}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                          placeholder="Symbol"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="relative">
                          <input
                            type="number"
                            value={asset.allocation}
                            onChange={(e) => {
                              const newAssets = [...assets];
                              newAssets[index].allocation = Number(e.target.value);
                              setAssets(newAssets);
                            }}
                            className="w-full px-3 py-2 pr-8 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                            min="0"
                            max="100"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (assets.length > 2) {
                            setAssets(assets.filter((_, i) => i !== index));
                          }
                        }}
                        disabled={assets.length <= 2}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAssets([...assets, { symbol: '', allocation: 0 }])}
                      disabled={assets.length >= 10}
                    >
                      Add Asset
                    </Button>
                    <div className={`text-sm font-medium ${
                      totalAllocation === 100 ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      Total: {totalAllocation}%
                    </div>
                  </div>
                  
                  {totalAllocation !== 100 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                      <p className="text-sm text-yellow-400">
                        Total allocation must equal 100%. Current total: {totalAllocation}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Trigger Type</label>
                <div className="flex rounded-lg bg-gray-800 border border-gray-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTriggerType('threshold')}
                    className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
                      triggerType === 'threshold' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Threshold
                  </button>
                  <button
                    type="button"
                    onClick={() => setTriggerType('time')}
                    className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
                      triggerType === 'time' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Time-based
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {triggerType === 'threshold' ? 'Deviation Threshold (%)' : 'Rebalance Frequency'}
                </label>
                {triggerType === 'threshold' ? (
                  <input
                    type="number"
                    value={thresholdDeviationPercent}
                    onChange={(e) => setThresholdDeviationPercent(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="50"
                  />
                ) : (
                  <select
                    value={rebalanceFrequency}
                    onChange={(e) => setRebalanceFrequency(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Trade Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    value={minTradeAmount}
                    onChange={(e) => setMinTradeAmount(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    min="10"
                    step="10"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Ignore rebalances smaller than this amount</p>
              </div>
            </div>
          </div>
        )}

        {/* Options Strategy Configuration */}
        {isOptionsStrategy && (
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white">Options Strategy Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Underlying Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="AAPL, SPY, QQQ, etc."
                />
              </div>

              {['covered_calls', 'wheel', 'option_collar'].includes(selectedStrategyType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Position Size (Shares)</label>
                  <input
                    type="number"
                    value={positionSize}
                    onChange={(e) => setPositionSize(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    min="100"
                    step="100"
                  />
                  <p className="text-xs text-gray-400 mt-1">Must be in multiples of 100 (1 contract = 100 shares)</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {selectedStrategyType === 'wheel' ? 'Put Strike Delta' : 'Strike Delta'}
                </label>
                <input
                  type="number"
                  value={selectedStrategyType === 'wheel' ? putDelta : strikeDelta}
                  onChange={(e) => {
                    if (selectedStrategyType === 'wheel') {
                      setPutDelta(Number(e.target.value));
                    } else {
                      setStrikeDelta(Number(e.target.value));
                    }
                  }}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  min="-1"
                  max="1"
                  step="0.05"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {selectedStrategyType === 'wheel' ? 'Negative values for puts (e.g., -0.30)' : 'Distance from current price (0.30 = 30% OTM)'}
                </p>
              </div>

              {selectedStrategyType === 'wheel' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Call Strike Delta</label>
                  <input
                    type="number"
                    value={callDelta}
                    onChange={(e) => setCallDelta(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                  <p className="text-xs text-gray-400 mt-1">Positive values for calls (e.g., 0.30)</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Days to Expiration (DTE)</label>
                <input
                  type="number"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="365"
                />
                <p className="text-xs text-gray-400 mt-1">Target expiration for new positions</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Premium ($)</label>
                <input
                  type="number"
                  value={minimumPremium}
                  onChange={(e) => setMinimumPremium(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  min="10"
                  step="10"
                />
                <p className="text-xs text-gray-400 mt-1">Minimum premium to collect per contract</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Profit Target (%)</label>
                <input
                  type="number"
                  value={profitTarget}
                  onChange={(e) => setProfitTarget(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  min="10"
                  max="100"
                />
                <p className="text-xs text-gray-400 mt-1">Close position when this profit % is reached</p>
              </div>
            </div>

            {/* Spread-specific parameters */}
            {['iron_condor', 'iron_butterfly', 'short_call_vertical', 'short_put_vertical', 'broken_wing_butterfly'].includes(selectedStrategyType) && (
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h5 className="font-medium text-white mb-4">Spread Configuration</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {selectedStrategyType === 'broken_wing_butterfly' ? 'Short Wing Width' : 'Wing Width'}
                    </label>
                    <input
                      type="number"
                      value={selectedStrategyType === 'broken_wing_butterfly' ? shortWingWidth : wingWidth}
                      onChange={(e) => {
                        if (selectedStrategyType === 'broken_wing_butterfly') {
                          setShortWingWidth(Number(e.target.value));
                        } else {
                          setWingWidth(Number(e.target.value));
                        }
                      }}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="5"
                      max="50"
                      step="5"
                    />
                  </div>

                  {selectedStrategyType === 'broken_wing_butterfly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Long Wing Width</label>
                      <input
                        type="number"
                        value={longWingWidth}
                        onChange={(e) => setLongWingWidth(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        min="5"
                        max="50"
                        step="5"
                      />
                    </div>
                  )}

                  {['iron_condor', 'iron_butterfly', 'short_call_vertical', 'short_put_vertical'].includes(selectedStrategyType) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Net Credit Target ($)</label>
                      <input
                        type="number"
                        value={netCreditTarget}
                        onChange={(e) => setNetCreditTarget(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        min="50"
                        step="25"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Volatility strategies */}
            {['straddle', 'long_straddle', 'short_straddle', 'long_strangle', 'short_strangle'].includes(selectedStrategyType) && (
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h5 className="font-medium text-white mb-4">Volatility Configuration</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Strike Selection</label>
                    <select
                      value={strikeSelection}
                      onChange={(e) => setStrikeSelection(e.target.value as any)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="atm">At-the-Money (ATM)</option>
                      <option value="otm">Out-of-the-Money (OTM)</option>
                      <option value="itm">In-the-Money (ITM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Volatility Threshold (%)</label>
                    <input
                      type="number"
                      value={volatilityThreshold}
                      onChange={(e) => setVolatilityThreshold(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="10"
                      max="100"
                    />
                    <p className="text-xs text-gray-400 mt-1">Only trade when IV is above this level</p>
                  </div>

                  {['long_strangle', 'short_strangle'].includes(selectedStrategyType) && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Call Delta</label>
                        <input
                          type="number"
                          value={callDelta}
                          onChange={(e) => setCallDelta(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                          min="0.1"
                          max="0.5"
                          step="0.05"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Put Delta</label>
                        <input
                          type="number"
                          value={putDelta}
                          onChange={(e) => setPutDelta(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                          min="-0.5"
                          max="-0.1"
                          step="0.05"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* High-risk options specific */}
            {['short_call', 'short_straddle', 'short_strangle'].includes(selectedStrategyType) && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-red-400 mb-2">High-Risk Strategy Settings</h5>
                    <p className="text-sm text-red-300">
                      These strategies involve unlimited risk. Ensure proper risk management.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedStrategyType === 'short_call' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Margin Requirement ($)</label>
                      <input
                        type="number"
                        value={marginRequirement}
                        onChange={(e) => setMarginRequirement(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        min="5000"
                        step="1000"
                      />
                    </div>
                  )}

                  {selectedStrategyType === 'short_straddle' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Max Loss per Trade ($)</label>
                      <input
                        type="number"
                        value={maxLossPerTrade}
                        onChange={(e) => setMaxLossPerTrade(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        min="1000"
                        step="500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Volatility Filter (%)</label>
                    <input
                      type="number"
                      value={volatilityFilter}
                      onChange={(e) => setVolatilityFilter(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="10"
                      max="100"
                    />
                    <p className="text-xs text-gray-400 mt-1">Only trade when IV is below this level</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Algorithmic Strategy Configuration */}
        {isAlgorithmicStrategy && (
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white">Algorithmic Strategy Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedStrategyType !== 'pairs_trading' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="AAPL, SPY, BTC/USDT, etc."
                  />
                </div>
              )}

              {selectedStrategyType === 'pairs_trading' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Trading Pair</label>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={pairSymbols[0]}
                      onChange={(e) => setPairSymbols([e.target.value.toUpperCase(), pairSymbols[1]])}
                      className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="AAPL"
                    />
                    <span className="flex items-center text-gray-400">vs</span>
                    <input
                      type="text"
                      value={pairSymbols[1]}
                      onChange={(e) => setPairSymbols([pairSymbols[0], e.target.value.toUpperCase()])}
                      className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="MSFT"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Choose two correlated assets for pairs trading</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Position Size</label>
                <input
                  type="number"
                  value={positionSize}
                  onChange={(e) => setPositionSize(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  min="1"
                  step="1"
                />
              </div>
            </div>

            {/* Strategy-specific parameters */}
            {selectedStrategyType === 'orb' && (
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h5 className="font-medium text-white mb-4">ORB Specific Settings</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Opening Range Period (minutes)</label>
                    <select
                      value={orbPeriod}
                      onChange={(e) => setOrbPeriod(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Breakout Threshold (%)</label>
                    <input
                      type="number"
                      value={breakoutThreshold * 100}
                      onChange={(e) => setBreakoutThreshold(Number(e.target.value) / 100)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="0.1"
                      max="5"
                      step="0.1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={volumeConfirmation}
                        onChange={(e) => setVolumeConfirmation(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300">Require volume confirmation for breakouts</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {selectedStrategyType === 'mean_reversion' && (
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h5 className="font-medium text-white mb-4">Mean Reversion Settings</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Lookback Period (days)</label>
                    <input
                      type="number"
                      value={lookbackPeriod}
                      onChange={(e) => setLookbackPeriod(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="5"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Deviation Threshold (σ)</label>
                    <input
                      type="number"
                      value={deviationThreshold}
                      onChange={(e) => setDeviationThreshold(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="5"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-400 mt-1">Standard deviations from mean to trigger trade</p>
                  </div>
                </div>
              </div>
            )}

            {selectedStrategyType === 'momentum_breakout' && (
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h5 className="font-medium text-white mb-4">Momentum Settings</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Momentum Period (days)</label>
                    <input
                      type="number"
                      value={momentumPeriod}
                      onChange={(e) => setMomentumPeriod(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="5"
                      max="50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Breakout Threshold (%)</label>
                    <input
                      type="number"
                      value={breakoutThreshold * 100}
                      onChange={(e) => setBreakoutThreshold(Number(e.target.value) / 100)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="10"
                      step="0.1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={volumeConfirmation}
                        onChange={(e) => setVolumeConfirmation(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300">Require volume confirmation for breakouts</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {selectedStrategyType === 'pairs_trading' && (
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h5 className="font-medium text-white mb-4">Pairs Trading Settings</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Correlation Threshold</label>
                    <input
                      type="number"
                      value={correlationThreshold}
                      onChange={(e) => setCorrelationThreshold(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="0.5"
                      max="1"
                      step="0.05"
                    />
                    <p className="text-xs text-gray-400 mt-1">Minimum correlation to consider pairs</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Z-Score Entry Level</label>
                    <input
                      type="number"
                      value={zScoreEntry}
                      onChange={(e) => setZScoreEntry(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="5"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Z-Score Exit Level</label>
                    <input
                      type="number"
                      value={zScoreExit}
                      onChange={(e) => setZScoreExit(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="0.1"
                      max="2"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Position Ratio</label>
                    <input
                      type="number"
                      value={positionRatio}
                      onChange={(e) => setPositionRatio(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="0.5"
                      max="2"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-400 mt-1">Ratio between long and short positions</p>
                  </div>
                </div>
              </div>
            )}

            {selectedStrategyType === 'scalping' && (
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h5 className="font-medium text-white mb-4">Scalping Settings</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Time Frame</label>
                    <select
                      value={timeFrame}
                      onChange={(e) => setTimeFrame(e.target.value as any)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1m">1 Minute</option>
                      <option value="5m">5 Minutes</option>
                      <option value="15m">15 Minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Trades per Day</label>
                    <input
                      type="number"
                      value={maxTradesPerDay}
                      onChange={(e) => setMaxTradesPerDay(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Profit Target (%)</label>
                    <input
                      type="number"
                      value={profitTarget}
                      onChange={(e) => setProfitTarget(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="0.01"
                      max="1"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Stop Loss (%)</label>
                    <input
                      type="number"
                      value={stopLoss || 0.05}
                      onChange={(e) => setStopLoss(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="0.01"
                      max="1"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedStrategyType === 'swing_trading' && (
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h5 className="font-medium text-white mb-4">Swing Trading Settings</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Min Holding Period (days)</label>
                    <input
                      type="number"
                      value={holdingPeriodMin}
                      onChange={(e) => setHoldingPeriodMin(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Holding Period (days)</label>
                    <input
                      type="number"
                      value={holdingPeriodMax}
                      onChange={(e) => setHoldingPeriodMax(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">RSI Oversold Level</label>
                    <input
                      type="number"
                      value={rsiOversold}
                      onChange={(e) => setRsiOversold(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="10"
                      max="40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">RSI Overbought Level</label>
                    <input
                      type="number"
                      value={rsiOverbought}
                      onChange={(e) => setRsiOverbought(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="60"
                      max="90"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedStrategyType === 'arbitrage' && (
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h5 className="font-medium text-white mb-4">Arbitrage Settings</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Min Spread Threshold (%)</label>
                    <input
                      type="number"
                      value={minSpreadThreshold}
                      onChange={(e) => setMinSpreadThreshold(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="0.1"
                      max="5"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Execution Speed</label>
                    <select
                      value={executionSpeed}
                      onChange={(e) => setExecutionSpeed(e.target.value as any)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="fast">Fast (Higher fees)</option>
                      <option value="medium">Medium</option>
                      <option value="slow">Slow (Lower fees)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {selectedStrategyType === 'news_based_trading' && (
              <div className="bg-gray-800/30 rounded-lg p-6">
                <h5 className="font-medium text-white mb-4">News-Based Trading Settings</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Sentiment Threshold</label>
                    <input
                      type="number"
                      value={sentimentThreshold}
                      onChange={(e) => setSentimentThreshold(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="0.1"
                      max="1"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-400 mt-1">Minimum sentiment score to trigger trade</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Reaction Window (minutes)</label>
                    <input
                      type="number"
                      value={reactionWindow}
                      onChange={(e) => setReactionWindow(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      min="5"
                      max="120"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">News Sources</label>
                    <div className="flex flex-wrap gap-2">
                      {['reuters', 'bloomberg', 'cnbc', 'wsj', 'marketwatch'].map((source) => (
                        <label key={source} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newsSources.includes(source)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewsSources([...newsSources, source]);
                              } else {
                                setNewsSources(newsSources.filter(s => s !== source));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-300 capitalize">{source}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Common risk management for algorithmic strategies */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h5 className="font-medium text-white mb-4">Risk Management</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stop Loss (%)</label>
                  <input
                    type="number"
                    value={stopLoss || (selectedStrategyType === 'scalping' ? 0.05 : 2)}
                    onChange={(e) => setStopLoss(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    min="0.01"
                    max="10"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Take Profit (%)</label>
                  <input
                    type="number"
                    value={takeProfit || (selectedStrategyType === 'scalping' ? 0.1 : 4)}
                    onChange={(e) => setTakeProfit(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    min="0.01"
                    max="20"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="flex-1"
            disabled={
              !strategyName || 
              !selectedStrategyType || 
              (isSmartRebalance && totalAllocation !== 100) ||
              (isGridBot && selectedStrategyType !== 'infinity_grid' && priceRangeLower >= priceRangeUpper)
            }
          >
            Create Strategy
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-6xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Create Trading Strategy</h2>
              <p className="text-gray-400">
                {step === 'category' && 'Choose a strategy category to get started'}
                {step === 'strategy' && 'Select a specific strategy from the category'}
                {step === 'configure' && 'Configure your strategy parameters'}
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {step === 'category' && (
              <motion.div
                key="category"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {renderCategorySelection()}
              </motion.div>
            )}

            {step === 'strategy' && (
              <motion.div
                key="strategy"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStrategySelection()}
              </motion.div>
            )}

            {step === 'configure' && (
              <motion.div
                key="configure"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStrategyConfiguration()}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}