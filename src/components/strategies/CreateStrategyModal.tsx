import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Shield, DollarSign, Info, AlertTriangle, Target, Clock, Zap, BarChart3 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => void;
}

// Strategy templates with default risk levels and configurations
const strategyTemplates = {
  // Grid Trading Bots
  spot_grid: {
    name: 'Spot Grid Bot',
    description: 'Automated buy-low/sell-high within defined price range',
    defaultRisk: 'low' as const,
    minCapital: 1000,
    category: 'Grid Trading',
    icon: '🔄',
    defaultConfig: {
      symbol: 'BTC/USDT',
      price_range_lower: 40000,
      price_range_upper: 50000,
      number_of_grids: 25,
      grid_mode: 'arithmetic',
      trigger_price: undefined,
      take_profit: undefined,
      stop_loss: undefined,
    }
  },
  futures_grid: {
    name: 'Futures Grid Bot',
    description: 'Grid trading with leverage on futures markets',
    defaultRisk: 'medium' as const,
    minCapital: 2000,
    category: 'Grid Trading',
    icon: '⚡',
    defaultConfig: {
      symbol: 'BTC/USDT',
      price_range_lower: 40000,
      price_range_upper: 50000,
      number_of_grids: 25,
      grid_mode: 'arithmetic',
      direction: 'long',
      leverage: 3,
      trigger_price: undefined,
      take_profit: undefined,
      stop_loss: undefined,
    }
  },
  infinity_grid: {
    name: 'Infinity Grid Bot',
    description: 'Grid trading without upper limit for trending markets',
    defaultRisk: 'medium' as const,
    minCapital: 1500,
    category: 'Grid Trading',
    icon: '♾️',
    defaultConfig: {
      symbol: 'ETH/USDT',
      price_range_lower: 2500,
      number_of_grids: 30,
      grid_mode: 'geometric',
      trigger_price: undefined,
      take_profit: undefined,
      stop_loss: undefined,
    }
  },

  // Automated Strategies
  dca: {
    name: 'DCA Bot',
    description: 'Dollar-cost averaging for systematic investing',
    defaultRisk: 'low' as const,
    minCapital: 500,
    category: 'Automated',
    icon: '📈',
    defaultConfig: {
      symbol: 'BTC/USDT',
      investment_amount_per_interval: 100,
      frequency: 'weekly',
      investment_target_percent: 25,
      max_price_threshold: undefined,
      min_price_threshold: undefined,
    }
  },
  smart_rebalance: {
    name: 'Smart Rebalance Bot',
    description: 'Maintains target allocations through automatic rebalancing',
    defaultRisk: 'low' as const,
    minCapital: 5000,
    category: 'Automated',
    icon: '⚖️',
    defaultConfig: {
      assets: [
        { symbol: 'BTC', allocation: 40 },
        { symbol: 'ETH', allocation: 30 },
        { symbol: 'USDT', allocation: 30 },
      ],
      trigger_type: 'threshold',
      threshold_deviation_percent: 5,
      rebalance_frequency: 'weekly',
      min_trade_amount: 100,
    }
  },

  // Options Income Strategies
  covered_calls: {
    name: 'Covered Calls',
    description: 'Generate income by selling calls on owned stocks',
    defaultRisk: 'low' as const,
    minCapital: 15000,
    category: 'Options Income',
    icon: '📞',
    defaultConfig: {
      symbol: 'AAPL',
      position_size: 100,
      strike_delta: 0.30,
      expiration_days: 30,
      minimum_premium: 200,
      profit_target: 50,
      roll_when_itm: true,
      max_loss_per_trade: 1000,
    }
  },
  wheel: {
    name: 'The Wheel',
    description: 'Systematic cash-secured puts and covered calls',
    defaultRisk: 'low' as const,
    minCapital: 20000,
    category: 'Options Income',
    icon: '🎡',
    defaultConfig: {
      symbol: 'AAPL',
      position_size: 100,
      put_strike_delta: -0.30,
      call_strike_delta: 0.30,
      expiration_days: 30,
      minimum_premium: 150,
      assignment_handling: 'automatic',
      profit_target: 50,
    }
  },

  // Options Spreads
  iron_condor: {
    name: 'Iron Condor',
    description: 'Profit from low volatility with defined risk',
    defaultRisk: 'medium' as const,
    minCapital: 5000,
    category: 'Options Spreads',
    icon: '🦅',
    defaultConfig: {
      symbol: 'SPY',
      wing_width: 10,
      short_strike_delta: 0.20,
      expiration_days: 45,
      net_credit_target: 200,
      profit_target: 25,
      stop_loss_percent: 200,
      volatility_filter: 25,
    }
  },
  straddle: {
    name: 'Long Straddle',
    description: 'Profit from high volatility in either direction',
    defaultRisk: 'medium' as const,
    minCapital: 8000,
    category: 'Options Volatility',
    icon: '🎯',
    defaultConfig: {
      symbol: 'SPY',
      strike_selection: 'atm',
      expiration_days: 30,
      volatility_threshold: 20,
      max_premium_percent: 12,
      stop_loss_percent: 50,
      take_profit_percent: 100,
    }
  },
  long_condor: {
    name: 'Long Condor',
    description: 'Range-bound profit with limited risk',
    defaultRisk: 'low' as const,
    minCapital: 3000,
    category: 'Options Spreads',
    icon: '🦅',
    defaultConfig: {
      symbol: 'SPY',
      wing_width: 10,
      body_width: 10,
      expiration_days: 45,
      max_debit_percent: 8,
      profit_target: 50,
      stop_loss_percent: 100,
    }
  },
  iron_butterfly: {
    name: 'Iron Butterfly',
    description: 'Low volatility income with tight profit zone',
    defaultRisk: 'medium' as const,
    minCapital: 4000,
    category: 'Options Spreads',
    icon: '🦋',
    defaultConfig: {
      symbol: 'SPY',
      wing_width: 20,
      expiration_days: 30,
      net_credit_target: 300,
      volatility_filter: 25,
      profit_target: 50,
      stop_loss_percent: 200,
    }
  },
  long_butterfly: {
    name: 'Long Butterfly',
    description: 'Precision targeting for specific price levels',
    defaultRisk: 'low' as const,
    minCapital: 2500,
    category: 'Options Spreads',
    icon: '🦋',
    defaultConfig: {
      symbol: 'SPY',
      wing_width: 10,
      expiration_days: 30,
      max_debit: 150,
      profit_target: 100,
      stop_loss_percent: 50,
    }
  },
  long_strangle: {
    name: 'Long Strangle',
    description: 'Directional volatility with wider profit zones',
    defaultRisk: 'medium' as const,
    minCapital: 6000,
    category: 'Options Volatility',
    icon: '🎯',
    defaultConfig: {
      symbol: 'SPY',
      call_delta: 0.25,
      put_delta: -0.25,
      expiration_days: 30,
      volatility_threshold: 25,
      profit_target: 100,
      stop_loss_percent: 50,
    }
  },
  short_call_vertical: {
    name: 'Short Call Vertical',
    description: 'Bearish spread with defined maximum risk',
    defaultRisk: 'medium' as const,
    minCapital: 3000,
    category: 'Options Spreads',
    icon: '📉',
    defaultConfig: {
      symbol: 'QQQ',
      wing_width: 10,
      short_strike_delta: 0.30,
      expiration_days: 30,
      net_credit_target: 250,
      profit_target: 50,
      stop_loss_percent: 200,
    }
  },
  short_put_vertical: {
    name: 'Short Put Vertical',
    description: 'Bullish spread with limited risk profile',
    defaultRisk: 'medium' as const,
    minCapital: 2500,
    category: 'Options Spreads',
    icon: '📈',
    defaultConfig: {
      symbol: 'QQQ',
      wing_width: 10,
      short_strike_delta: -0.30,
      expiration_days: 30,
      net_credit_target: 200,
      profit_target: 50,
      stop_loss_percent: 200,
    }
  },
  broken_wing_butterfly: {
    name: 'Broken-Wing Butterfly',
    description: 'Asymmetric spread with directional bias',
    defaultRisk: 'medium' as const,
    minCapital: 3500,
    category: 'Options Spreads',
    icon: '🦋',
    defaultConfig: {
      symbol: 'SPY',
      short_wing_width: 10,
      long_wing_width: 15,
      expiration_days: 45,
      max_debit: 100,
      profit_target: 100,
      stop_loss_percent: 150,
    }
  },
  option_collar: {
    name: 'Option Collar',
    description: 'Protective strategy limiting downside and upside',
    defaultRisk: 'low' as const,
    minCapital: 25000,
    category: 'Options Protection',
    icon: '🛡️',
    defaultConfig: {
      symbol: 'AAPL',
      position_size: 100,
      put_delta: -0.25,
      call_delta: 0.25,
      expiration_days: 45,
      net_cost_target: 50,
      roll_frequency: 'monthly',
    }
  },

  // High-Risk Options
  short_call: {
    name: 'Short Call',
    description: 'High-risk premium collection selling naked calls',
    defaultRisk: 'high' as const,
    minCapital: 15000,
    category: 'Options High-Risk',
    icon: '⚠️',
    defaultConfig: {
      symbol: 'AAPL',
      strike_delta: 0.20,
      expiration_days: 30,
      minimum_premium: 300,
      stop_loss_percent: 200,
      margin_requirement: 10000,
      max_loss_per_trade: 2000,
    }
  },
  short_straddle: {
    name: 'Short Straddle',
    description: 'Ultra-high risk volatility selling strategy',
    defaultRisk: 'high' as const,
    minCapital: 20000,
    category: 'Options High-Risk',
    icon: '⚠️',
    defaultConfig: {
      symbol: 'SPY',
      strike_selection: 'atm',
      expiration_days: 21,
      minimum_premium: 600,
      volatility_filter: 25,
      stop_loss_percent: 200,
      max_loss_per_trade: 3000,
    }
  },
  short_put: {
    name: 'Short Put',
    description: 'Cash-secured puts for income and stock acquisition',
    defaultRisk: 'medium' as const,
    minCapital: 15000,
    category: 'Options Income',
    icon: '📉',
    defaultConfig: {
      symbol: 'AAPL',
      strike_delta: -0.30,
      expiration_days: 30,
      minimum_premium: 150,
      profit_target: 50,
      stop_loss_percent: 200,
      cash_secured: true,
    }
  },
  short_strangle: {
    name: 'Short Strangle',
    description: 'Premium collection in low volatility environments',
    defaultRisk: 'high' as const,
    minCapital: 25000,
    category: 'Options High-Risk',
    icon: '⚠️',
    defaultConfig: {
      symbol: 'SPY',
      call_delta: 0.20,
      put_delta: -0.20,
      expiration_days: 21,
      minimum_premium: 500,
      volatility_filter: 25,
      profit_target: 50,
      stop_loss_percent: 200,
    }
  },

  // Directional Options
  long_call: {
    name: 'Long Call',
    description: 'Bullish momentum with leveraged upside exposure',
    defaultRisk: 'medium' as const,
    minCapital: 5000,
    category: 'Options Directional',
    icon: '📈',
    defaultConfig: {
      symbol: 'AAPL',
      strike_delta: 0.30,
      expiration_days: 30,
      max_premium_percent: 10,
      stop_loss_percent: 50,
      take_profit_percent: 100,
      position_size_percent: 20,
    }
  },

  // Algorithmic Strategies
  orb: {
    name: 'Opening Range Breakout',
    description: 'Trade breakouts from market open range',
    defaultRisk: 'medium' as const,
    minCapital: 5000,
    category: 'Algorithmic',
    icon: '🌅',
    defaultConfig: {
      symbol: 'SPY',
      orb_period: 30,
      breakout_threshold: 0.002,
      stop_loss_percent: 1,
      take_profit_percent: 2,
      max_position_size: 100,
      volume_confirmation: true,
    }
  },
  mean_reversion: {
    name: 'Mean Reversion',
    description: 'Contrarian strategy profiting from price reversions',
    defaultRisk: 'medium' as const,
    minCapital: 7500,
    category: 'Algorithmic',
    icon: '↩️',
    defaultConfig: {
      symbol: 'SPY',
      lookback_period: 20,
      deviation_threshold: 2.0,
      position_size: 100,
      stop_loss_percent: 1,
      take_profit_percent: 1.5,
      rsi_oversold: 30,
      rsi_overbought: 70,
    }
  },
  momentum_breakout: {
    name: 'Momentum Breakout',
    description: 'Trend following strategy capturing momentum',
    defaultRisk: 'medium' as const,
    minCapital: 6000,
    category: 'Algorithmic',
    icon: '🚀',
    defaultConfig: {
      symbol: 'QQQ',
      breakout_threshold: 0.03,
      volume_confirmation: true,
      position_size: 100,
      stop_loss_percent: 2,
      take_profit_percent: 5,
      momentum_period: 14,
    }
  },
  pairs_trading: {
    name: 'Pairs Trading',
    description: 'Market neutral strategy trading correlated pairs',
    defaultRisk: 'low' as const,
    minCapital: 10000,
    category: 'Algorithmic',
    icon: '👥',
    defaultConfig: {
      pair_symbols: ['AAPL', 'MSFT'],
      correlation_threshold: 0.8,
      z_score_entry: 2.0,
      z_score_exit: 0.5,
      lookback_period: 60,
      position_ratio: 1.0,
      max_holding_period: 30,
    }
  },
  scalping: {
    name: 'Scalping',
    description: 'High frequency trading for quick profits',
    defaultRisk: 'high' as const,
    minCapital: 15000,
    category: 'High Frequency',
    icon: '⚡',
    defaultConfig: {
      symbol: 'SPY',
      time_frame: '1m',
      profit_target_percent: 0.1,
      stop_loss_percent: 0.05,
      max_trades_per_day: 50,
      position_size: 100,
      spread_threshold: 0.01,
    }
  },
  swing_trading: {
    name: 'Swing Trading',
    description: 'Multi-day holds capturing intermediate moves',
    defaultRisk: 'medium' as const,
    minCapital: 8000,
    category: 'Algorithmic',
    icon: '🌊',
    defaultConfig: {
      symbol: 'QQQ',
      holding_period_min: 2,
      holding_period_max: 10,
      rsi_oversold: 30,
      rsi_overbought: 70,
      position_size: 100,
      stop_loss_percent: 3,
      take_profit_percent: 6,
    }
  },
  arbitrage: {
    name: 'Arbitrage',
    description: 'Risk-free profits from price differences',
    defaultRisk: 'low' as const,
    minCapital: 12000,
    category: 'Algorithmic',
    icon: '⚖️',
    defaultConfig: {
      symbol: 'BTC/USDT',
      min_spread_threshold: 0.5,
      execution_speed: 'fast',
      max_position_size: 1000,
      exchanges: ['primary', 'secondary'],
      slippage_tolerance: 0.1,
    }
  },
  news_based_trading: {
    name: 'News-Based Trading',
    description: 'Event-driven trading based on news sentiment',
    defaultRisk: 'high' as const,
    minCapital: 10000,
    category: 'Event-Driven',
    icon: '📰',
    defaultConfig: {
      symbol: 'SPY',
      sentiment_threshold: 0.7,
      news_sources: ['reuters', 'bloomberg', 'cnbc'],
      reaction_window: 30,
      position_size: 100,
      stop_loss_percent: 2,
      take_profit_percent: 4,
    }
  },
};

const cryptoSymbols = ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'SOL/USDT', 'MATIC/USDT', 'DOT/USDT', 'AVAX/USDT', 'LINK/USDT'];
const stockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'SPY', 'QQQ', 'IWM'];
const frequencies = ['daily', 'weekly', 'monthly'];
const gridModes = ['arithmetic', 'geometric'];
const directions = ['long', 'short'];
const strikeSelections = ['atm', 'otm', 'itm'];
const triggerTypes = ['threshold', 'time_based'];

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const [selectedType, setSelectedType] = useState<TradingStrategy['type'] | null>(null);
  const [strategyName, setStrategyName] = useState('');
  const [description, setDescription] = useState('');
  const [minCapital, setMinCapital] = useState(1000);
  
  // Grid bot configuration
  const [gridSymbol, setGridSymbol] = useState('BTC/USDT');
  const [priceLower, setPriceLower] = useState(40000);
  const [priceUpper, setPriceUpper] = useState(50000);
  const [numGrids, setNumGrids] = useState(25);
  const [gridMode, setGridMode] = useState<'arithmetic' | 'geometric'>('arithmetic');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState(3);
  const [triggerPrice, setTriggerPrice] = useState<number | undefined>();
  const [takeProfit, setTakeProfit] = useState<number | undefined>();
  const [stopLoss, setStopLoss] = useState<number | undefined>();

  // DCA configuration
  const [dcaSymbol, setDcaSymbol] = useState('BTC/USDT');
  const [investmentAmount, setInvestmentAmount] = useState(100);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [targetPercent, setTargetPercent] = useState(25);
  const [maxPriceThreshold, setMaxPriceThreshold] = useState<number | undefined>();
  const [minPriceThreshold, setMinPriceThreshold] = useState<number | undefined>();

  // Smart rebalance configuration
  const [assets, setAssets] = useState([
    { symbol: 'BTC', allocation: 40 },
    { symbol: 'ETH', allocation: 30 },
    { symbol: 'USDT', allocation: 30 },
  ]);
  const [triggerType, setTriggerType] = useState<'threshold' | 'time_based'>('threshold');
  const [thresholdPercent, setThresholdPercent] = useState(5);
  const [rebalanceFreq, setRebalanceFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [minTradeAmount, setMinTradeAmount] = useState(100);

  // Options strategies configuration
  const [optionsSymbol, setOptionsSymbol] = useState('AAPL');
  const [positionSize, setPositionSize] = useState(100);
  const [strikeDelta, setStrikeDelta] = useState(0.30);
  const [expirationDays, setExpirationDays] = useState(30);
  const [minimumPremium, setMinimumPremium] = useState(200);
  const [profitTarget, setProfitTarget] = useState(50);
  const [stopLossPercent, setStopLossPercent] = useState(200);
  const [wingWidth, setWingWidth] = useState(10);
  const [volatilityFilter, setVolatilityFilter] = useState(25);
  const [putStrikeDelta, setPutStrikeDelta] = useState(-0.30);
  const [callStrikeDelta, setCallStrikeDelta] = useState(0.30);
  const [rollWhenItm, setRollWhenItm] = useState(true);
  const [assignmentHandling, setAssignmentHandling] = useState<'automatic' | 'manual'>('automatic');

  // Algorithmic strategies configuration
  const [algoSymbol, setAlgoSymbol] = useState('SPY');
  const [lookbackPeriod, setLookbackPeriod] = useState(20);
  const [deviationThreshold, setDeviationThreshold] = useState(2.0);
  const [breakoutThreshold, setBreakoutThreshold] = useState(0.002);
  const [volumeConfirmation, setVolumeConfirmation] = useState(true);
  const [orbPeriod, setOrbPeriod] = useState(30);
  const [rsiOversold, setRsiOversold] = useState(30);
  const [rsiOverbought, setRsiOverbought] = useState(70);
  const [correlationThreshold, setCorrelationThreshold] = useState(0.8);
  const [zScoreEntry, setZScoreEntry] = useState(2.0);
  const [zScoreExit, setZScoreExit] = useState(0.5);
  const [pairSymbols, setPairSymbols] = useState(['AAPL', 'MSFT']);
  const [sentimentThreshold, setSentimentThreshold] = useState(0.7);
  const [newsSources, setNewsSources] = useState(['reuters', 'bloomberg', 'cnbc']);
  const [reactionWindow, setReactionWindow] = useState(30);
  const [timeFrame, setTimeFrame] = useState('1m');
  const [maxTradesPerDay, setMaxTradesPerDay] = useState(50);
  const [spreadThreshold, setSpreadThreshold] = useState(0.01);
  const [holdingPeriodMin, setHoldingPeriodMin] = useState(2);
  const [holdingPeriodMax, setHoldingPeriodMax] = useState(10);
  const [minSpreadThreshold, setMinSpreadThreshold] = useState(0.5);
  const [executionSpeed, setExecutionSpeed] = useState<'fast' | 'medium' | 'slow'>('fast');
  const [exchanges, setExchanges] = useState(['primary', 'secondary']);
  const [slippageTolerance, setSlippageTolerance] = useState(0.1);

  const selectedTemplate = selectedType ? strategyTemplates[selectedType] : null;

  useEffect(() => {
    if (selectedTemplate) {
      setStrategyName(selectedTemplate.name);
      setDescription(selectedTemplate.description);
      setMinCapital(selectedTemplate.minCapital);
      
      // Set configuration defaults based on strategy type
      const config = selectedTemplate.defaultConfig;
      
      // Grid bot configs
      if ('symbol' in config && typeof config.symbol === 'string') {
        setGridSymbol(config.symbol);
        setDcaSymbol(config.symbol);
        setAlgoSymbol(config.symbol);
        setOptionsSymbol(config.symbol);
      }
      if ('price_range_lower' in config) setPriceLower(config.price_range_lower || 0);
      if ('price_range_upper' in config) setPriceUpper(config.price_range_upper || 0);
      if ('number_of_grids' in config) setNumGrids(config.number_of_grids || 25);
      if ('grid_mode' in config) setGridMode(config.grid_mode || 'arithmetic');
      if ('direction' in config) setDirection(config.direction || 'long');
      if ('leverage' in config) setLeverage(config.leverage || 3);
      
      // DCA configs
      if ('investment_amount_per_interval' in config) setInvestmentAmount(config.investment_amount_per_interval || 100);
      if ('frequency' in config) setFrequency(config.frequency || 'weekly');
      if ('investment_target_percent' in config) setTargetPercent(config.investment_target_percent || 25);
      
      // Smart rebalance configs
      if ('assets' in config) setAssets(config.assets || []);
      if ('trigger_type' in config) setTriggerType(config.trigger_type || 'threshold');
      if ('threshold_deviation_percent' in config) setThresholdPercent(config.threshold_deviation_percent || 5);
      if ('rebalance_frequency' in config) setRebalanceFreq(config.rebalance_frequency || 'weekly');
      if ('min_trade_amount' in config) setMinTradeAmount(config.min_trade_amount || 100);
      
      // Options configs
      if ('position_size' in config) setPositionSize(config.position_size || 100);
      if ('strike_delta' in config) setStrikeDelta(config.strike_delta || 0.30);
      if ('expiration_days' in config) setExpirationDays(config.expiration_days || 30);
      if ('minimum_premium' in config) setMinimumPremium(config.minimum_premium || 200);
      if ('profit_target' in config) setProfitTarget(config.profit_target || 50);
      if ('wing_width' in config) setWingWidth(config.wing_width || 10);
      if ('volatility_filter' in config) setVolatilityFilter(config.volatility_filter || 25);
      if ('put_strike_delta' in config) setPutStrikeDelta(config.put_strike_delta || -0.30);
      if ('call_strike_delta' in config) setCallStrikeDelta(config.call_strike_delta || 0.30);
      if ('roll_when_itm' in config) setRollWhenItm(config.roll_when_itm || true);
      if ('assignment_handling' in config) setAssignmentHandling(config.assignment_handling || 'automatic');
      
      // Algorithmic configs
      if ('lookback_period' in config) setLookbackPeriod(config.lookback_period || 20);
      if ('deviation_threshold' in config) setDeviationThreshold(config.deviation_threshold || 2.0);
      if ('breakout_threshold' in config) setBreakoutThreshold(config.breakout_threshold || 0.002);
      if ('volume_confirmation' in config) setVolumeConfirmation(config.volume_confirmation || true);
      if ('orb_period' in config) setOrbPeriod(config.orb_period || 30);
      if ('rsi_oversold' in config) setRsiOversold(config.rsi_oversold || 30);
      if ('rsi_overbought' in config) setRsiOverbought(config.rsi_overbought || 70);
      if ('correlation_threshold' in config) setCorrelationThreshold(config.correlation_threshold || 0.8);
      if ('z_score_entry' in config) setZScoreEntry(config.z_score_entry || 2.0);
      if ('z_score_exit' in config) setZScoreExit(config.z_score_exit || 0.5);
      if ('pair_symbols' in config) setPairSymbols(config.pair_symbols || ['AAPL', 'MSFT']);
      if ('sentiment_threshold' in config) setSentimentThreshold(config.sentiment_threshold || 0.7);
      if ('news_sources' in config) setNewsSources(config.news_sources || ['reuters', 'bloomberg', 'cnbc']);
      if ('reaction_window' in config) setReactionWindow(config.reaction_window || 30);
      if ('time_frame' in config) setTimeFrame(config.time_frame || '1m');
      if ('max_trades_per_day' in config) setMaxTradesPerDay(config.max_trades_per_day || 50);
      if ('spread_threshold' in config) setSpreadThreshold(config.spread_threshold || 0.01);
      if ('holding_period_min' in config) setHoldingPeriodMin(config.holding_period_min || 2);
      if ('holding_period_max' in config) setHoldingPeriodMax(config.holding_period_max || 10);
      if ('min_spread_threshold' in config) setMinSpreadThreshold(config.min_spread_threshold || 0.5);
      if ('execution_speed' in config) setExecutionSpeed(config.execution_speed || 'fast');
      if ('exchanges' in config) setExchanges(config.exchanges || ['primary', 'secondary']);
      if ('slippage_tolerance' in config) setSlippageTolerance(config.slippage_tolerance || 0.1);
    }
  }, [selectedTemplate]);

  const handleCreate = () => {
    if (!selectedType || !selectedTemplate) return;

    let configuration: Record<string, any> = {};

    // Build configuration based on strategy type
    if (['spot_grid', 'futures_grid', 'infinity_grid'].includes(selectedType)) {
      configuration = {
        symbol: gridSymbol,
        price_range_lower: priceLower,
        ...(selectedType !== 'infinity_grid' && { price_range_upper: priceUpper }),
        number_of_grids: numGrids,
        grid_mode: gridMode,
        ...(triggerPrice && { trigger_price: triggerPrice }),
        ...(takeProfit && { take_profit: takeProfit }),
        ...(stopLoss && { stop_loss: stopLoss }),
        ...(selectedType === 'futures_grid' && { 
          direction: direction,
          leverage: leverage 
        }),
      };
    } else if (selectedType === 'dca') {
      configuration = {
        symbol: dcaSymbol,
        investment_amount_per_interval: investmentAmount,
        frequency: frequency,
        investment_target_percent: targetPercent,
        ...(maxPriceThreshold && { max_price_threshold: maxPriceThreshold }),
        ...(minPriceThreshold && { min_price_threshold: minPriceThreshold }),
      };
    } else if (selectedType === 'smart_rebalance') {
      configuration = {
        assets: assets,
        trigger_type: triggerType,
        threshold_deviation_percent: thresholdPercent,
        rebalance_frequency: rebalanceFreq,
        min_trade_amount: minTradeAmount,
      };
    } else if (['covered_calls', 'wheel', 'short_put'].includes(selectedType)) {
      configuration = {
        symbol: optionsSymbol,
        position_size: positionSize,
        ...(selectedType === 'wheel' ? {
          put_strike_delta: putStrikeDelta,
          call_strike_delta: callStrikeDelta,
          assignment_handling: assignmentHandling,
        } : {
          strike_delta: strikeDelta,
        }),
        expiration_days: expirationDays,
        minimum_premium: minimumPremium,
        profit_target: profitTarget,
        ...(selectedType === 'covered_calls' && { roll_when_itm: rollWhenItm }),
        ...(stopLossPercent && { stop_loss_percent: stopLossPercent }),
      };
    } else if (['iron_condor', 'long_condor', 'iron_butterfly', 'long_butterfly', 'broken_wing_butterfly'].includes(selectedType)) {
      configuration = {
        symbol: optionsSymbol,
        wing_width: wingWidth,
        expiration_days: expirationDays,
        profit_target: profitTarget,
        stop_loss_percent: stopLossPercent,
        ...(selectedType === 'iron_condor' && {
          short_strike_delta: strikeDelta,
          net_credit_target: minimumPremium,
          volatility_filter: volatilityFilter,
        }),
        ...(selectedType === 'long_condor' && {
          body_width: 10,
          max_debit_percent: 8,
        }),
        ...(selectedType === 'iron_butterfly' && {
          net_credit_target: minimumPremium,
          volatility_filter: volatilityFilter,
        }),
        ...(selectedType === 'long_butterfly' && {
          max_debit: minimumPremium,
        }),
        ...(selectedType === 'broken_wing_butterfly' && {
          short_wing_width: wingWidth,
          long_wing_width: wingWidth + 5,
          max_debit: minimumPremium,
        }),
      };
    } else if (['straddle', 'long_strangle'].includes(selectedType)) {
      configuration = {
        symbol: optionsSymbol,
        expiration_days: expirationDays,
        volatility_threshold: volatilityFilter,
        profit_target: profitTarget,
        stop_loss_percent: stopLossPercent,
        ...(selectedType === 'straddle' && {
          strike_selection: 'atm',
          max_premium_percent: 12,
        }),
        ...(selectedType === 'long_strangle' && {
          call_delta: callStrikeDelta,
          put_delta: putStrikeDelta,
        }),
      };
    } else if (['short_call', 'short_straddle', 'short_strangle'].includes(selectedType)) {
      configuration = {
        symbol: optionsSymbol,
        expiration_days: expirationDays,
        minimum_premium: minimumPremium,
        stop_loss_percent: stopLossPercent,
        ...(selectedType === 'short_call' && {
          strike_delta: strikeDelta,
          margin_requirement: 10000,
        }),
        ...(selectedType === 'short_straddle' && {
          strike_selection: 'atm',
          volatility_filter: volatilityFilter,
          max_loss_per_trade: 3000,
        }),
        ...(selectedType === 'short_strangle' && {
          call_delta: callStrikeDelta,
          put_delta: putStrikeDelta,
          volatility_filter: volatilityFilter,
        }),
      };
    } else if (['short_call_vertical', 'short_put_vertical'].includes(selectedType)) {
      configuration = {
        symbol: optionsSymbol,
        wing_width: wingWidth,
        short_strike_delta: selectedType === 'short_call_vertical' ? strikeDelta : putStrikeDelta,
        expiration_days: expirationDays,
        net_credit_target: minimumPremium,
        profit_target: profitTarget,
        stop_loss_percent: stopLossPercent,
      };
    } else if (selectedType === 'option_collar') {
      configuration = {
        symbol: optionsSymbol,
        position_size: positionSize,
        put_delta: putStrikeDelta,
        call_delta: callStrikeDelta,
        expiration_days: expirationDays,
        net_cost_target: 50,
        roll_frequency: 'monthly',
      };
    } else if (selectedType === 'long_call') {
      configuration = {
        symbol: optionsSymbol,
        strike_delta: strikeDelta,
        expiration_days: expirationDays,
        max_premium_percent: 10,
        stop_loss_percent: stopLossPercent,
        take_profit_percent: 100,
        position_size_percent: 20,
      };
    } else if (selectedType === 'orb') {
      configuration = {
        symbol: algoSymbol,
        orb_period: orbPeriod,
        breakout_threshold: breakoutThreshold,
        stop_loss_percent: 1,
        take_profit_percent: 2,
        max_position_size: positionSize,
        volume_confirmation: volumeConfirmation,
      };
    } else if (selectedType === 'mean_reversion') {
      configuration = {
        symbol: algoSymbol,
        lookback_period: lookbackPeriod,
        deviation_threshold: deviationThreshold,
        position_size: positionSize,
        stop_loss_percent: 1,
        take_profit_percent: 1.5,
        rsi_oversold: rsiOversold,
        rsi_overbought: rsiOverbought,
      };
    } else if (selectedType === 'momentum_breakout') {
      configuration = {
        symbol: algoSymbol,
        breakout_threshold: breakoutThreshold,
        volume_confirmation: volumeConfirmation,
        position_size: positionSize,
        stop_loss_percent: 2,
        take_profit_percent: 5,
        momentum_period: 14,
      };
    } else if (selectedType === 'pairs_trading') {
      configuration = {
        pair_symbols: pairSymbols,
        correlation_threshold: correlationThreshold,
        z_score_entry: zScoreEntry,
        z_score_exit: zScoreExit,
        lookback_period: lookbackPeriod,
        position_ratio: 1.0,
        max_holding_period: 30,
      };
    } else if (selectedType === 'scalping') {
      configuration = {
        symbol: algoSymbol,
        time_frame: timeFrame,
        profit_target_percent: 0.1,
        stop_loss_percent: 0.05,
        max_trades_per_day: maxTradesPerDay,
        position_size: positionSize,
        spread_threshold: spreadThreshold,
      };
    } else if (selectedType === 'swing_trading') {
      configuration = {
        symbol: algoSymbol,
        holding_period_min: holdingPeriodMin,
        holding_period_max: holdingPeriodMax,
        rsi_oversold: rsiOversold,
        rsi_overbought: rsiOverbought,
        position_size: positionSize,
        stop_loss_percent: 3,
        take_profit_percent: 6,
      };
    } else if (selectedType === 'arbitrage') {
      configuration = {
        symbol: gridSymbol, // Use crypto symbol for arbitrage
        min_spread_threshold: minSpreadThreshold,
        execution_speed: executionSpeed,
        max_position_size: positionSize,
        exchanges: exchanges,
        slippage_tolerance: slippageTolerance,
      };
    } else if (selectedType === 'news_based_trading') {
      configuration = {
        symbol: algoSymbol,
        sentiment_threshold: sentimentThreshold,
        news_sources: newsSources,
        reaction_window: reactionWindow,
        position_size: positionSize,
        stop_loss_percent: 2,
        take_profit_percent: 4,
      };
    }

    const strategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: selectedType,
      description: description,
      risk_level: selectedTemplate.defaultRisk,
      min_capital: minCapital,
      is_active: false,
      configuration: configuration,
    };

    onSave(strategy);
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
    }
  };

  const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation, 0);
  const isValidAllocation = totalAllocation === 100;

  const renderStrategySelection = () => {
    const categories = Array.from(new Set(Object.values(strategyTemplates).map(t => t.category)));
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Choose Strategy Type</h3>
          <p className="text-gray-400 mb-6">Select a strategy template to customize for your trading needs</p>
        </div>

        {categories.map((category) => (
          <div key={category}>
            <h4 className="text-md font-medium text-gray-300 mb-3">{category}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(strategyTemplates)
                .filter(([_, template]) => template.category === category)
                .map(([type, template]) => (
                <motion.div
                  key={type}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedType(type as TradingStrategy['type'])}
                  className="p-4 bg-gray-800/30 border border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{template.icon}</div>
                    <div className="flex-1">
                      <h5 className="font-medium text-white mb-1">{template.name}</h5>
                      <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(template.defaultRisk)}`}>
                          {template.defaultRisk} risk
                        </span>
                        <span className="text-xs text-gray-500">
                          Min: {formatCurrency(template.minCapital)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGridBotConfiguration = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Trading Pair</label>
          <select
            value={gridSymbol}
            onChange={(e) => setGridSymbol(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            {cryptoSymbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Number of Grids</label>
          <input
            type="number"
            value={numGrids}
            onChange={(e) => setNumGrids(Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            min="2"
            max="1000"
          />
          <p className="text-xs text-gray-400 mt-1">More grids = smaller profit per grid but more trading opportunities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Lowest Price (USDT)</label>
          <input
            type="number"
            value={priceLower}
            onChange={(e) => setPriceLower(Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
          <p className="text-xs text-gray-400 mt-1">Grid will place buy orders starting from this price</p>
        </div>

        {selectedType !== 'infinity_grid' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Highest Price (USDT)</label>
            <input
              type="number"
              value={priceUpper}
              onChange={(e) => setPriceUpper(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-gray-400 mt-1">Grid will place sell orders up to this price</p>
          </div>
        )}
      </div>

      {selectedType === 'infinity_grid' && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-400 mb-2">Infinity Grid</h4>
              <p className="text-sm text-blue-300">
                This grid has no upper price limit, making it ideal for trending bull markets. 
                It will continue placing sell orders as the price rises indefinitely.
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Grid Mode</label>
        <div className="flex rounded-lg bg-gray-800 border border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setGridMode('arithmetic')}
            className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
              gridMode === 'arithmetic' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Arithmetic
          </button>
          <button
            type="button"
            onClick={() => setGridMode('geometric')}
            className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
              gridMode === 'geometric' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Geometric
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {gridMode === 'arithmetic'
            ? 'Equal price differences between grids. Better for sideways/bullish markets.'
            : 'Equal percentage changes between grids. Better for volatile/bearish markets.'
          }
        </p>
      </div>

      {selectedType === 'futures_grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Direction</label>
            <div className="flex rounded-lg bg-gray-800 border border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setDirection('long')}
                className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
                  direction === 'long' ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Long (Bullish)
              </button>
              <button
                type="button"
                onClick={() => setDirection('short')}
                className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
                  direction === 'short' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Short (Bearish)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Leverage (1-10x)</label>
            <input
              type="number"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="1"
              max="10"
            />
            <p className="text-xs text-gray-400 mt-1">Higher leverage increases both profit potential and risk</p>
          </div>
        </div>
      )}

      <div className="bg-gray-800/30 rounded-lg p-4">
        <h4 className="font-medium text-white mb-3">Advanced Settings (Optional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Trigger Price</label>
            <input
              type="number"
              value={triggerPrice || ''}
              onChange={(e) => setTriggerPrice(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Auto"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Take Profit</label>
            <input
              type="number"
              value={takeProfit || ''}
              onChange={(e) => setTakeProfit(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="None"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Stop Loss</label>
            <input
              type="number"
              value={stopLoss || ''}
              onChange={(e) => setStopLoss(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="None"
              step="0.01"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderDCAConfiguration = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Asset to Purchase</label>
          <select
            value={dcaSymbol}
            onChange={(e) => setDcaSymbol(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            {cryptoSymbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Investment Amount per Interval</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="number"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(Number(e.target.value))}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="10"
              step="10"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Amount to invest at each interval</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Investment Frequency</label>
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
            value={targetPercent}
            onChange={(e) => setTargetPercent(Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            min="1"
            max="100"
          />
          <p className="text-xs text-gray-400 mt-1">Stop DCA when this allocation is reached</p>
        </div>
      </div>

      <div className="bg-gray-800/30 rounded-lg p-4">
        <h4 className="font-medium text-white mb-3">Price Thresholds (Optional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Max Buy Price</label>
            <input
              type="number"
              value={maxPriceThreshold || ''}
              onChange={(e) => setMaxPriceThreshold(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="No limit"
              step="0.01"
            />
            <p className="text-xs text-gray-400 mt-1">Stop buying if price exceeds this level</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Min Buy Price</label>
            <input
              type="number"
              value={minPriceThreshold || ''}
              onChange={(e) => setMinPriceThreshold(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="No limit"
              step="0.01"
            />
            <p className="text-xs text-gray-400 mt-1">Stop buying if price falls below this level</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSmartRebalanceConfiguration = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Asset Allocation</label>
        <div className="space-y-3">
          {assets.map((asset, index) => (
            <div key={index} className="grid grid-cols-2 gap-4">
              <select
                value={asset.symbol}
                onChange={(e) => {
                  const newAssets = [...assets];
                  newAssets[index].symbol = e.target.value;
                  setAssets(newAssets);
                }}
                className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                {[...cryptoSymbols.map(s => s.split('/')[0]), 'USDT'].map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
              <div className="relative">
                <input
                  type="number"
                  value={asset.allocation}
                  onChange={(e) => {
                    const newAssets = [...assets];
                    newAssets[index].allocation = Number(e.target.value);
                    setAssets(newAssets);
                  }}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-400">Total Allocation:</span>
          <span className={`font-medium ${isValidAllocation ? 'text-green-400' : 'text-red-400'}`}>
            {totalAllocation}%
          </span>
        </div>
        
        {!isValidAllocation && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <p className="text-sm text-yellow-400">
                Total allocation must equal 100%. Current total: {totalAllocation}%
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Trigger Type</label>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as any)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="threshold">Threshold-based</option>
            <option value="time_based">Time-based</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            {triggerType === 'threshold' 
              ? 'Rebalance when allocation deviates by threshold'
              : 'Rebalance at regular time intervals'
            }
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {triggerType === 'threshold' ? 'Deviation Threshold (%)' : 'Rebalance Frequency'}
          </label>
          {triggerType === 'threshold' ? (
            <input
              type="number"
              value={thresholdPercent}
              onChange={(e) => setThresholdPercent(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="1"
              max="50"
            />
          ) : (
            <select
              value={rebalanceFreq}
              onChange={(e) => setRebalanceFreq(e.target.value as any)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Trade Amount</label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="number"
            value={minTradeAmount}
            onChange={(e) => setMinTradeAmount(Number(e.target.value))}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            min="10"
            step="10"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">Skip rebalancing if trade amount is below this threshold</p>
      </div>
    </div>
  );

  const renderOptionsConfiguration = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Underlying Symbol</label>
          <select
            value={optionsSymbol}
            onChange={(e) => setOptionsSymbol(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            {stockSymbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Position Size (Shares)</label>
          <input
            type="number"
            value={positionSize}
            onChange={(e) => setPositionSize(Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            min="100"
            step="100"
          />
          <p className="text-xs text-gray-400 mt-1">Options contracts are typically 100 shares each</p>
        </div>
      </div>

      {['covered_calls', 'short_put', 'long_call'].includes(selectedType!) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Strike Delta</label>
            <input
              type="number"
              value={strikeDelta}
              onChange={(e) => setStrikeDelta(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="-1"
              max="1"
              step="0.05"
            />
            <p className="text-xs text-gray-400 mt-1">
              {selectedType === 'short_put' ? 'Negative delta for puts (e.g., -0.30)' : 'Positive delta for calls (e.g., 0.30)'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Days to Expiration</label>
            <input
              type="number"
              value={expirationDays}
              onChange={(e) => setExpirationDays(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="7"
              max="90"
            />
            <p className="text-xs text-gray-400 mt-1">Target expiration for new positions</p>
          </div>
        </div>
      )}

      {selectedType === 'wheel' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Put Strike Delta</label>
            <input
              type="number"
              value={putStrikeDelta}
              onChange={(e) => setPutStrikeDelta(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="-1"
              max="0"
              step="0.05"
            />
            <p className="text-xs text-gray-400 mt-1">Delta for cash-secured puts (e.g., -0.30)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Call Strike Delta</label>
            <input
              type="number"
              value={callStrikeDelta}
              onChange={(e) => setCallStrikeDelta(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="0"
              max="1"
              step="0.05"
            />
            <p className="text-xs text-gray-400 mt-1">Delta for covered calls (e.g., 0.30)</p>
          </div>
        </div>
      )}

      {['iron_condor', 'long_condor', 'iron_butterfly', 'long_butterfly', 'broken_wing_butterfly', 'short_call_vertical', 'short_put_vertical'].includes(selectedType!) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Wing Width ($)</label>
            <input
              type="number"
              value={wingWidth}
              onChange={(e) => setWingWidth(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="5"
              max="50"
              step="5"
            />
            <p className="text-xs text-gray-400 mt-1">Distance between strikes in the spread</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Expiration Days</label>
            <input
              type="number"
              value={expirationDays}
              onChange={(e) => setExpirationDays(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="14"
              max="90"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Premium ($)</label>
          <input
            type="number"
            value={minimumPremium}
            onChange={(e) => setMinimumPremium(Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            min="50"
            step="50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Profit Target ($)</label>
          <input
            type="number"
            value={profitTarget}
            onChange={(e) => setProfitTarget(Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            min="10"
            step="10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Stop Loss (%)</label>
          <input
            type="number"
            value={stopLossPercent}
            onChange={(e) => setStopLossPercent(Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            min="50"
            max="500"
            step="50"
          />
        </div>
      </div>

      {['iron_condor', 'iron_butterfly', 'short_straddle', 'short_strangle'].includes(selectedType!) && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Volatility Filter (%)</label>
          <input
            type="number"
            value={volatilityFilter}
            onChange={(e) => setVolatilityFilter(Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            min="10"
            max="100"
          />
          <p className="text-xs text-gray-400 mt-1">Only enter trades when implied volatility is below this level</p>
        </div>
      )}

      {selectedType === 'covered_calls' && (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="rollWhenItm"
            checked={rollWhenItm}
            onChange={(e) => setRollWhenItm(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="rollWhenItm" className="text-sm text-gray-300">
            Automatically roll when in-the-money
          </label>
        </div>
      )}

      {selectedType === 'wheel' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Assignment Handling</label>
          <select
            value={assignmentHandling}
            onChange={(e) => setAssignmentHandling(e.target.value as any)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">How to handle option assignments</p>
        </div>
      )}
    </div>
  );

  const renderAlgorithmicConfiguration = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {selectedType === 'pairs_trading' ? 'Primary Symbol' : 'Trading Symbol'}
          </label>
          <select
            value={algoSymbol}
            onChange={(e) => setAlgoSymbol(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            {stockSymbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Position Size</label>
          <input
            type="number"
            value={positionSize}
            onChange={(e) => setPositionSize(Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            min="1"
            step="1"
          />
          <p className="text-xs text-gray-400 mt-1">Number of shares per trade</p>
        </div>
      </div>

      {selectedType === 'pairs_trading' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Secondary Symbol</label>
            <select
              value={pairSymbols[1]}
              onChange={(e) => setPairSymbols([pairSymbols[0], e.target.value])}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              {stockSymbols.filter(s => s !== pairSymbols[0]).map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Correlation Threshold</label>
              <input
                type="number"
                value={correlationThreshold}
                onChange={(e) => setCorrelationThreshold(Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                min="0.5"
                max="1"
                step="0.05"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Z-Score Entry</label>
              <input
                type="number"
                value={zScoreEntry}
                onChange={(e) => setZScoreEntry(Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                min="1"
                max="5"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Z-Score Exit</label>
              <input
                type="number"
                value={zScoreExit}
                onChange={(e) => setZScoreExit(Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                min="0.1"
                max="2"
                step="0.1"
              />
            </div>
          </div>
        </div>
      )}

      {['mean_reversion', 'swing_trading'].includes(selectedType!) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">RSI Oversold</label>
            <input
              type="number"
              value={rsiOversold}
              onChange={(e) => setRsiOversold(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="10"
              max="40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">RSI Overbought</label>
            <input
              type="number"
              value={rsiOverbought}
              onChange={(e) => setRsiOverbought(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="60"
              max="90"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Lookback Period</label>
            <input
              type="number"
              value={lookbackPeriod}
              onChange={(e) => setLookbackPeriod(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="5"
              max="100"
            />
          </div>
        </div>
      )}

      {selectedType === 'orb' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">ORB Period (minutes)</label>
            <input
              type="number"
              value={orbPeriod}
              onChange={(e) => setOrbPeriod(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="15"
              max="60"
              step="15"
            />
            <p className="text-xs text-gray-400 mt-1">Opening range period from market open</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Breakout Threshold (%)</label>
            <input
              type="number"
              value={breakoutThreshold * 100}
              onChange={(e) => setBreakoutThreshold(Number(e.target.value) / 100)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="0.1"
              max="2"
              step="0.1"
            />
            <p className="text-xs text-gray-400 mt-1">Minimum breakout percentage to trigger trade</p>
          </div>
        </div>
      )}

      {selectedType === 'scalping' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Time Frame</label>
            <select
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Max Trades/Day</label>
            <input
              type="number"
              value={maxTradesPerDay}
              onChange={(e) => setMaxTradesPerDay(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="1"
              max="200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Spread Threshold (%)</label>
            <input
              type="number"
              value={spreadThreshold * 100}
              onChange={(e) => setSpreadThreshold(Number(e.target.value) / 100)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="0.01"
              max="1"
              step="0.01"
            />
          </div>
        </div>
      )}

      {selectedType === 'news_based_trading' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sentiment Threshold</label>
              <input
                type="number"
                value={sentimentThreshold}
                onChange={(e) => setSentimentThreshold(Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                min="5"
                max="120"
                step="5"
              />
              <p className="text-xs text-gray-400 mt-1">Time window to react to news events</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">News Sources</label>
            <div className="flex flex-wrap gap-2">
              {['reuters', 'bloomberg', 'cnbc', 'marketwatch', 'yahoo'].map(source => (
                <label key={source} className="flex items-center gap-2">
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
      )}

      {selectedType === 'arbitrage' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Min Spread (%)</label>
            <input
              type="number"
              value={minSpreadThreshold}
              onChange={(e) => setMinSpreadThreshold(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
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
              <option value="fast">Fast</option>
              <option value="medium">Medium</option>
              <option value="slow">Slow</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Slippage Tolerance (%)</label>
            <input
              type="number"
              value={slippageTolerance}
              onChange={(e) => setSlippageTolerance(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="0.01"
              max="1"
              step="0.01"
            />
          </div>
        </div>
      )}

      {['swing_trading'].includes(selectedType!) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Min Holding Period (days)</label>
            <input
              type="number"
              value={holdingPeriodMin}
              onChange={(e) => setHoldingPeriodMin(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              min="1"
              max="90"
            />
          </div>
        </div>
      )}

      {['orb', 'momentum_breakout'].includes(selectedType!) && (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="volumeConfirmation"
            checked={volumeConfirmation}
            onChange={(e) => setVolumeConfirmation(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="volumeConfirmation" className="text-sm text-gray-300">
            Require volume confirmation for breakouts
          </label>
        </div>
      )}
    </div>
  );

  const renderConfiguration = () => {
    if (!selectedType) return null;

    const isGridBot = ['spot_grid', 'futures_grid', 'infinity_grid'].includes(selectedType);
    const isDCA = selectedType === 'dca';
    const isSmartRebalance = selectedType === 'smart_rebalance';
    const isOptions = ['covered_calls', 'wheel', 'iron_condor', 'straddle', 'long_condor', 'iron_butterfly', 'long_butterfly', 'long_strangle', 'short_call_vertical', 'short_put_vertical', 'broken_wing_butterfly', 'option_collar', 'short_call', 'short_straddle', 'short_put', 'short_strangle', 'long_call'].includes(selectedType);
    const isAlgorithmic = ['orb', 'mean_reversion', 'momentum_breakout', 'pairs_trading', 'scalping', 'swing_trading', 'arbitrage', 'news_based_trading'].includes(selectedType);

    return (
      <div className="space-y-8">
        {/* Strategy Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">{selectedTemplate?.icon}</div>
            <div>
              <h3 className="text-xl font-semibold text-white">{selectedTemplate?.name}</h3>
              <p className="text-gray-400">{selectedTemplate?.description}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setSelectedType(null)}>
            Change Strategy
          </Button>
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
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
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
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  min="100"
                  step="100"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe your strategy..."
            />
          </div>

          {/* Dynamic Risk Level Display */}
          <div className="bg-gray-800/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h4 className="font-medium text-white">Risk Assessment</h4>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(selectedTemplate?.defaultRisk || 'medium')}`}>
                {selectedTemplate?.defaultRisk} risk
              </span>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-300">
                  This is a preliminary risk assessment based on the strategy type. After backtesting with historical data, 
                  the system will calculate advanced risk metrics (volatility, Sharpe ratio, Beta, VaR, etc.) and may 
                  automatically adjust the risk classification based on actual performance data.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy-Specific Configuration */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold text-white">Strategy Parameters</h4>
          
          {isGridBot && renderGridBotConfiguration()}
          {isDCA && renderDCAConfiguration()}
          {isSmartRebalance && renderSmartRebalanceConfiguration()}
          {isOptions && renderOptionsConfiguration()}
          {isAlgorithmic && renderAlgorithmicConfiguration()}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6 border-t border-gray-800">
          <Button variant="secondary" onClick={() => setSelectedType(null)} className="flex-1">
            Back to Selection
          </Button>
          <Button 
            onClick={handleCreate} 
            className="flex-1"
            disabled={!strategyName || (isSmartRebalance && !isValidAllocation)}
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
                {selectedType ? 'Configure your strategy parameters' : 'Choose a strategy template and customize it for your needs'}
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {!selectedType ? (
              <motion.div
                key="selection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStrategySelection()}
              </motion.div>
            ) : (
              <motion.div
                key="configuration"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderConfiguration()}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}