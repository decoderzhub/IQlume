import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  TrendingUp, 
  DollarSign, 
  Save, 
  ArrowLeft,
  Grid3X3,
  ShoppingBag,
  Shield,
  Zap,
  Target,
  Activity,
  BarChart3,
  Brain,
  Coins,
  RefreshCw,
  TrendingDown,
  Shuffle,
  Clock,
  Gauge,
  Plus,
  Trash2
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';

interface CreateStrategyModalProps {
  onClose: () => void;
  onSave: (strategy: Omit<TradingStrategy, 'id'>) => void;
}

interface StrategyTemplate {
  id: TradingStrategy['type'];
  name: string;
  description: string;
  skill_level: 'beginner' | 'moderate' | 'advanced';
  risk_level: 'low' | 'medium' | 'high';
  min_capital: number;
  // New Universal Bot Fields
  account_id?: string;
  asset_class?: 'equity' | 'options' | 'crypto' | 'futures' | 'forex';
  base_symbol?: string;
  quote_currency?: string;
  time_horizon?: 'intraday' | 'swing' | 'long_term';
  automation_level?: 'fully_auto' | 'semi_auto' | 'manual';
  capital_allocation?: TradingStrategy['capital_allocation'];
  position_sizing?: TradingStrategy['position_sizing'];
  trade_window?: TradingStrategy['trade_window'];
  order_execution?: TradingStrategy['order_execution'];
  risk_controls?: TradingStrategy['risk_controls'];
  data_filters?: TradingStrategy['data_filters'];
  notifications?: TradingStrategy['notifications'];
  icon: React.ComponentType<any>;
  category: string;
  defaultConfig: Record<string, any>;
}

const strategyTemplates: StrategyTemplate[] = [
  // Grid Trading Bots
  {
    id: 'spot_grid',
    name: 'Spot Grid Bot',
    description: 'Automated buy-low/sell-high within defined price ranges',
    skill_level: 'beginner',
    risk_level: 'low',
    min_capital: 1000,
    account_id: 'default_account_id',
    asset_class: 'crypto',
    base_symbol: 'BTC',
    quote_currency: 'USDT',
    time_horizon: 'intraday',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 1000, max_exposure_usd: 5000 },
    position_sizing: { mode: 'fixed_units', value: 0.001 },
    trade_window: { enabled: false, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 5, stop_loss_percent: 10, max_daily_loss_usd: 100, max_drawdown_percent: 20, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 1000000, max_bid_ask_spread_pct: 0.001, iv_rank_threshold: 0, min_open_interest: 0 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Grid3X3,
    category: 'Grid Trading Bots',
    defaultConfig: {
      // symbol: 'BTC/USDT', // Now handled by base_symbol
      // allocated_capital: 1000, // Now handled by capital_allocation
      price_range_lower: 40000,
      price_range_upper: 50000,
      number_of_grids: 20,
      grid_mode: 'arithmetic',
      trigger_type: 'threshold',
      threshold_deviation_percent: 5,
      rebalance_frequency: '24h',
    },
  },
  {
    id: 'futures_grid',
    name: 'Futures Grid Bot',
    description: 'Grid trading with leverage on futures markets',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 2000,
    account_id: 'default_account_id',
    asset_class: 'futures',
    base_symbol: 'BTC',
    quote_currency: 'USDT',
    time_horizon: 'intraday',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 2000, max_exposure_usd: 10000 },
    position_sizing: { mode: 'fixed_units', value: 0.001 },
    trade_window: { enabled: false, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 5, stop_loss_percent: 10, max_daily_loss_usd: 200, max_drawdown_percent: 25, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 1000000, max_bid_ask_spread_pct: 0.001, iv_rank_threshold: 0, min_open_interest: 0 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Zap,
    category: 'Grid Trading Bots',
    defaultConfig: {
      // allocated_capital: 2000, // Now handled by capital_allocation
      // symbol: 'BTC/USDT', // Now handled by base_symbol
      price_range_lower: 40000,
      price_range_upper: 50000,
      number_of_grids: 25,
      leverage: 3,
      direction: 'long',
      trigger_type: 'threshold',
      // Futures Grid Specific
      contract_symbol: 'BTC-PERP',
      exchange: 'Binance',
      margin_mode: 'isolated',
      liq_buffer_percent: 10,
      max_open_notional: 50000,
      funding_rate_threshold: 0.0005,
      rebalance_frequency: '24h',
    },
  },
  {
    id: 'infinity_grid',
    name: 'Infinity Grid Bot',
    description: 'Grid trading without upper limit for trending markets',
    skill_level: 'advanced',
    risk_level: 'high',
    min_capital: 1500,
    account_id: 'default_account_id',
    asset_class: 'crypto',
    base_symbol: 'ETH',
    quote_currency: 'USDT',
    time_horizon: 'swing',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 1500, max_exposure_usd: 7500 },
    position_sizing: { mode: 'fixed_units', value: 0.01 },
    trade_window: { enabled: false, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 5, stop_loss_percent: 10, max_daily_loss_usd: 150, max_drawdown_percent: 30, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 1000000, max_bid_ask_spread_pct: 0.001, iv_rank_threshold: 0, min_open_interest: 0 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: TrendingUp,
    category: 'Grid Trading Bots',
    defaultConfig: {
      // allocated_capital: 1500, // Now handled by capital_allocation
      // symbol: 'ETH/USDT', // Now handled by base_symbol
      price_range_lower: 2000,
      number_of_grids: 30,
      grid_mode: 'geometric',
      trigger_type: 'threshold',
      threshold_deviation_percent: 5,
      rebalance_frequency: '24h',
      // Infinity Grid Specific
      base_price: 2500,
      grid_step_percent: 0.01,
      buy_size: 0.01,
      sell_size: 0.01,
      inventory_cap_units: 1,
      profit_reinvest: true,
    },
  },

  // Automated Core Strategies
  {
    id: 'dca',
    name: 'DCA Bot',
    description: 'Dollar-cost averaging for consistent, low-risk investing',
    skill_level: 'beginner',
    risk_level: 'low',
    min_capital: 500,
    account_id: 'default_account_id',
    asset_class: 'crypto',
    base_symbol: 'BTC',
    quote_currency: 'USDT',
    time_horizon: 'long_term',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 500, max_exposure_usd: 5000 },
    position_sizing: { mode: 'fixed_units', value: 0.0001 },
    trade_window: { enabled: false, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'market', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 0, stop_loss_percent: 0, max_daily_loss_usd: 0, max_drawdown_percent: 0, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 1000000, max_bid_ask_spread_pct: 0.001, iv_rank_threshold: 0, min_open_interest: 0 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: RefreshCw,
    category: 'Automated Core Strategies',
    defaultConfig: {
      // allocated_capital: 500, // Now handled by capital_allocation
      // symbol: 'ETH/USDT', // Now handled by base_symbol
      investment_amount_per_interval: 100,
      frequency: 'daily',
      investment_target_percent: 25,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      // DCA Specific
      asset_list: ['ETH', 'BTC'],
      execution_time: '09:00',
      max_total_allocation_usd: 5000,
      slippage_max_percent: 0.005,
      stop_if_price_drop_percent: 0,
      cap_on_single_execution: 0,
    },
  },
  {
    id: 'smart_rebalance',
    name: 'Smart Rebalance',
    description: 'Automatically maintain target portfolio allocations',
    skill_level: 'beginner',
    risk_level: 'low',
    min_capital: 5000,
    account_id: 'default_account_id',
    asset_class: 'equity',
    base_symbol: 'SPY',
    quote_currency: 'USD',
    time_horizon: 'long_term',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 5000, max_exposure_usd: 25000 },
    position_sizing: { mode: 'percent_equity', value: 100 },
    trade_window: { enabled: false, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 0, stop_loss_percent: 0, max_daily_loss_usd: 0, max_drawdown_percent: 0, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 1000000, max_bid_ask_spread_pct: 0.001, iv_rank_threshold: 0, min_open_interest: 0 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Shuffle,
    category: 'Automated Core Strategies',
    defaultConfig: {
      // allocated_capital: 5000, // Now handled by capital_allocation
      assets: [
        { symbol: 'BTC', allocation: 40 },
        { symbol: 'ETH', allocation: 30 },
        { symbol: 'USDT', allocation: 30 },
      ],
      trigger_type: 'threshold',
      threshold_deviation_percent: 5,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      // Smart Rebalance Specific
      rebalance_trigger: 'band',
      calendar_interval: 'monthly',
      min_trade_size_usd: 10,
    },
  },
  {
    id: 'orb',
    name: 'Opening Range Breakout (ORB)',
    description: 'Trade breakouts from the first 15-30 minutes of market open',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 5000,
    account_id: 'default_account_id',
    asset_class: 'equity',
    base_symbol: 'SPY',
    quote_currency: 'USD',
    time_horizon: 'intraday',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 5000, max_exposure_usd: 10000 },
    position_sizing: { mode: 'fixed_units', value: 100 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '10:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'market', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 2, stop_loss_percent: 1, max_daily_loss_usd: 100, max_drawdown_percent: 5, pause_on_event_flags: ['earnings', 'FOMC'] },
    data_filters: { min_liquidity: 10000000, max_bid_ask_spread_pct: 0.001, iv_rank_threshold: 0, min_open_interest: 0 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Clock,
    category: 'Automated Core Strategies',
    defaultConfig: {
      // allocated_capital: 5000, // Now handled by capital_allocation
      // symbol: 'SPY', // Now handled by base_symbol
      orb_period: 30,
      breakout_threshold: 0.002,
      stop_loss: { value: 1, type: 'percentage' },
      take_profit: { value: 2, type: 'percentage' },
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      max_position_size: 100,
      // ORB Specific
      session_timezone: 'America/New_York',
    },
  },
  {
    id: 'momentum_breakout',
    name: 'Momentum Breakout',
    description: 'Trend following strategy capturing momentum breakouts',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 6000,
    account_id: 'default_account_id',
    asset_class: 'equity',
    base_symbol: 'QQQ',
    quote_currency: 'USD',
    time_horizon: 'swing',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 6000, max_exposure_usd: 12000 },
    position_sizing: { mode: 'fixed_units', value: 100 },
    trade_window: { enabled: false, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'market', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 5, stop_loss_percent: 2, max_daily_loss_usd: 150, max_drawdown_percent: 15, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 10000000, max_bid_ask_spread_pct: 0.001, iv_rank_threshold: 0, min_open_interest: 0 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: TrendingUp,
    category: 'Automated Core Strategies',
    defaultConfig: {
      // allocated_capital: 6000, // Now handled by capital_allocation
      // symbol: 'QQQ', // Now handled by base_symbol
      breakout_threshold: 0.03,
      volume_confirmation: true,
      position_size: 100,
      stop_loss: { value: 2, type: 'percentage' },
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      take_profit: { value: 5, type: 'percentage' },
      // Momentum Breakout Specific
      indicator: 'MA',
      periods: 20,
    },
  },
  {
    id: 'pairs_trading',
    name: 'Pairs Trading',
    description: 'Market neutral strategy trading correlated pairs',
    skill_level: 'moderate',
    risk_level: 'low',
    min_capital: 10000,
    account_id: 'default_account_id',
    asset_class: 'equity',
    base_symbol: 'AAPL',
    quote_currency: 'USD',
    time_horizon: 'swing',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 10000, max_exposure_usd: 20000 },
    position_sizing: { mode: 'fixed_units', value: 100 },
    trade_window: { enabled: false, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 5, stop_loss_percent: 5, max_daily_loss_usd: 100, max_drawdown_percent: 5, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 10000000, max_bid_ask_spread_pct: 0.001, iv_rank_threshold: 0, min_open_interest: 0 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Activity,
    category: 'Automated Core Strategies',
    defaultConfig: {
      // allocated_capital: 10000, // Now handled by capital_allocation
      pair_symbols: ['AAPL', 'MSFT'],
      correlation_threshold: 0.8,
      z_score_entry: 2.0,
      z_score_exit: 0.5,
      lookback_period: 60,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      // Pairs Trading Specific
      spread_calculation: 'price_ratio',
      rebalance_frequency: 'daily',
    },
  },
  {
    id: 'mean_reversion',
    name: 'Mean Reversion',
    description: 'Contrarian strategy that profits from price reversions to the mean',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 7500,
    account_id: 'default_account_id',
    asset_class: 'equity',
    base_symbol: 'SPY',
    quote_currency: 'USD',
    time_horizon: 'intraday',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 7500, max_exposure_usd: 15000 },
    position_sizing: { mode: 'fixed_units', value: 100 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 1.5, stop_loss_percent: 1, max_daily_loss_usd: 100, max_drawdown_percent: 10, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 10000000, max_bid_ask_spread_pct: 0.001, iv_rank_threshold: 0, min_open_interest: 0 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: RefreshCw,
    category: 'Automated Core Strategies',
    defaultConfig: {
      // allocated_capital: 7500, // Now handled by capital_allocation
      // symbol: 'SPY', // Now handled by base_symbol
      lookback_period: 20,
      deviation_threshold: 2.0,
      position_size: 100,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      stop_loss: { value: 1, type: 'percentage' },
      take_profit: { value: 1.5, type: 'percentage' },
      // Mean Reversion Specific
      mean_type: 'SMA',
    },
  },
  {
    id: 'swing_trading',
    name: 'Swing Trading',
    description: 'Multi-day swing trading strategy capturing intermediate price movements',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 8000,
    account_id: 'default_account_id',
    asset_class: 'equity',
    base_symbol: 'QQQ',
    quote_currency: 'USD',
    time_horizon: 'swing',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 8000, max_exposure_usd: 16000 },
    position_sizing: { mode: 'volatility_target', value: 0.01 },
    trade_window: { enabled: false, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 6, stop_loss_percent: 3, max_daily_loss_usd: 200, max_drawdown_percent: 15, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 10000000, max_bid_ask_spread_pct: 0.001, iv_rank_threshold: 0, min_open_interest: 0 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Activity,
    category: 'Automated Core Strategies',
    defaultConfig: {
      // allocated_capital: 8000, // Now handled by capital_allocation
      // symbol: 'QQQ', // Now handled by base_symbol
      holding_period_min: 2,
      holding_period_max: 10,
      rsi_oversold: 30,
      rsi_overbought: 70,
      position_size: 100,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      stop_loss: { value: 3, type: 'percentage' },
      // Swing Trading Specific
      entry_indicators: ['RSI', 'MACD'],
      market_filter: 1000000,
    },
  },
  {
    id: 'arbitrage',
    name: 'Arbitrage',
    description: 'Cross-exchange arbitrage strategy exploiting price differences',
    skill_level: 'advanced',
    risk_level: 'low',
    min_capital: 12000,
    account_id: 'default_account_id',
    asset_class: 'crypto',
    base_symbol: 'BTC',
    quote_currency: 'USDT',
    time_horizon: 'intraday',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 12000, max_exposure_usd: 24000 },
    position_sizing: { mode: 'fixed_units', value: 0.001 },
    trade_window: { enabled: true, start_time: '00:00', end_time: '23:59', days_of_week: [0, 1, 2, 3, 4, 5, 6] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.001, allow_partial_fill: true, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 0.5, stop_loss_percent: 0.1, max_daily_loss_usd: 50, max_drawdown_percent: 1, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 100000000, max_bid_ask_spread_pct: 0.0001, iv_rank_threshold: 0, min_open_interest: 0 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Shuffle,
    category: 'Automated Core Strategies',
    defaultConfig: {
      // allocated_capital: 12000, // Now handled by capital_allocation
      // symbol: 'BTC/USDT', // Now handled by base_symbol
      min_spread_threshold: 0.5,
      execution_speed: 'fast',
      max_position_size: 1000,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      exchanges: ['primary', 'secondary'],
      // Arbitrage Specific
      legs: [{ symbol: 'BTC', exchange: 'Binance' }, { symbol: 'BTC', exchange: 'Coinbase' }],
      max_latency_ms: 50,
    },
  },
  {
    id: 'scalping',
    name: 'Scalping',
    description: 'High frequency scalping strategy for quick profits',
    skill_level: 'advanced',
    risk_level: 'high',
    min_capital: 15000,
    account_id: 'default_account_id',
    asset_class: 'equity',
    base_symbol: 'SPY',
    quote_currency: 'USD',
    time_horizon: 'intraday',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 15000, max_exposure_usd: 30000 },
    position_sizing: { mode: 'fixed_units', value: 100 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.001, allow_partial_fill: true, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 0.1, stop_loss_percent: 0.05, max_daily_loss_usd: 500, max_drawdown_percent: 5, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 100000000, max_bid_ask_spread_pct: 0.0001, iv_rank_threshold: 0, min_open_interest: 0 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Gauge,
    category: 'Automated Core Strategies',
    defaultConfig: {
      // allocated_capital: 15000, // Now handled by capital_allocation
      // symbol: 'SPY', // Now handled by base_symbol
      time_frame: '1m',
      profit_target: 0.1,
      stop_loss: { value: 0.05, type: 'percentage' },
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      max_trades_per_day: 50,
      position_size: 100,
      // Scalping Specific
      target_ticks: 2,
    },
  },
  {
    id: 'news_based_trading',
    name: 'News-Based Trading',
    description: 'Event-driven strategy that trades based on news sentiment',
    skill_level: 'advanced',
    risk_level: 'high',
    min_capital: 10000,
    account_id: 'default_account_id',
    asset_class: 'equity',
    base_symbol: 'SPY',
    quote_currency: 'USD',
    time_horizon: 'intraday',
    automation_level: 'semi_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 10000, max_exposure_usd: 20000 },
    position_sizing: { mode: 'fixed_units', value: 100 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'market', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 4, stop_loss_percent: 2, max_daily_loss_usd: 300, max_drawdown_percent: 10, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 10000000, max_bid_ask_spread_pct: 0.001, iv_rank_threshold: 0, min_open_interest: 0 },
    notifications: { email_alerts: true, push_notifications: true, webhook_url: '' },
    icon: Brain,
    category: 'Automated Core Strategies',
    defaultConfig: {
      // allocated_capital: 10000, // Now handled by capital_allocation
      // symbol: 'SPY', // Now handled by base_symbol
      sentiment_threshold: 0.7,
      news_sources: ['reuters', 'bloomberg', 'cnbc'],
      reaction_window: 30,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      position_size: 100,
      stop_loss: { value: 2, type: 'percentage' },
      // News-Based Trading Specific
      event_whitelist: ['earnings', 'FOMC'],
    },
  },

  // Options Income Strategies
  {
    id: 'covered_calls',
    name: 'Covered Calls',
    description: 'Generate income by selling call options on owned stocks',
    skill_level: 'beginner',
    risk_level: 'low',
    min_capital: 15000,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'AAPL',
    quote_currency: 'USD',
    time_horizon: 'swing',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 15000, max_exposure_usd: 30000 },
    position_sizing: { mode: 'fixed_units', value: 1 }, // 1 contract
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 50, stop_loss_percent: 20, max_daily_loss_usd: 100, max_drawdown_percent: 5, pause_on_event_flags: ['earnings'] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Shield,
    category: 'Options Income Strategies',
    defaultConfig: {
      // allocated_capital: 15000, // Now handled by capital_allocation
      // symbol: 'AAPL', // Now handled by base_symbol
      position_size: 100,
      strike_delta: 0.30,
      expiration_days: 30,
      minimum_premium: 200,
      profit_target: 50,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      // Covered Calls Specific
      shares_held: 100,
      call_strike_mode: 'delta_target',
      min_premium_usd: 200,
      assignment_action: 'accept_assign',
    },
  },
  {
    id: 'wheel',
    name: 'The Wheel',
    description: 'Systematic approach combining cash-secured puts and covered calls',
    skill_level: 'moderate',
    risk_level: 'low',
    min_capital: 20000,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'AAPL',
    quote_currency: 'USD',
    time_horizon: 'long_term',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 20000, max_exposure_usd: 40000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 50, stop_loss_percent: 20, max_daily_loss_usd: 100, max_drawdown_percent: 5, pause_on_event_flags: ['earnings'] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: RefreshCw,
    category: 'Options Income Strategies',
    defaultConfig: {
      // allocated_capital: 20000, // Now handled by capital_allocation
      // symbol: 'AAPL', // Now handled by base_symbol
      position_size: 100,
      put_strike_delta: -0.30,
      call_strike_delta: 0.30,
      expiration_days: 30,
      minimum_premium: 150,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      // The Wheel Specific
      initial_put_params: { strike_offset: -0.05, expiry_days: 30, min_premium_usd: 150 },
      call_params: { strike_offset_above_cost_basis: 0.05, expiry_days: 30 },
      max_round_trips: 5,
    },
  },
  {
    id: 'iron_condor',
    name: 'Iron Condor',
    description: 'Profit from low volatility with defined risk spreads',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 5000,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'SPY',
    quote_currency: 'USD',
    time_horizon: 'swing',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 5000, max_exposure_usd: 10000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 25, stop_loss_percent: 150, max_daily_loss_usd: 100, max_drawdown_percent: 10, pause_on_event_flags: ['FOMC'] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Target,
    category: 'Options Income Strategies',
    defaultConfig: {
      // allocated_capital: 5000, // Now handled by capital_allocation
      // symbol: 'SPY', // Now handled by base_symbol
      wing_width: 10,
      short_strike_delta: 0.20,
      expiration_days: 45,
      net_credit_target: 200,
      profit_target: 25,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      // Iron Condor Specific
      center_strike: 400,
      net_debit_or_credit_target: 200,
      roll_rules: 'none',
    },
  },
  {
    id: 'short_put',
    name: 'Cash-Secured Put',
    description: 'Cash-secured put strategy for income generation with potential stock acquisition',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 15000,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'AAPL',
    quote_currency: 'USD',
    time_horizon: 'swing',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 15000, max_exposure_usd: 30000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 50, stop_loss_percent: 20, max_daily_loss_usd: 100, max_drawdown_percent: 5, pause_on_event_flags: ['earnings'] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Shield,
    category: 'Options Income Strategies',
    defaultConfig: {
      // allocated_capital: 15000, // Now handled by capital_allocation
      // symbol: 'AAPL', // Now handled by base_symbol
      strike_delta: -0.30,
      expiration_days: 30,
      minimum_premium: 150,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      profit_target: 50,
      // Cash-Secured Put Specific
      cash_reserved: 15000,
      buyback_trigger_loss_percent: 50,
      assignment_preferences: 'accept_assignment',
    },
  },
  {
    id: 'long_butterfly',
    name: 'Long Butterfly',
    description: 'Precision targeting strategy using long butterfly spreads',
    skill_level: 'moderate',
    risk_level: 'low',
    min_capital: 2500,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'SPY',
    quote_currency: 'USD',
    time_horizon: 'swing',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 2500, max_exposure_usd: 5000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 100, stop_loss_percent: 50, max_daily_loss_usd: 50, max_drawdown_percent: 5, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Target,
    category: 'Options Income Strategies',
    defaultConfig: {
      // allocated_capital: 2500, // Now handled by capital_allocation
      // symbol: 'SPY', // Now handled by base_symbol
      wing_width: 10,
      expiration_days: 30,
      max_debit: 150,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      profit_target: 100,
      // Long Butterfly Specific
      center_strike: 400,
      net_debit_or_credit_target: 100,
      roll_rules: 'none',
    },
  },
  {
    id: 'iron_butterfly',
    name: 'Iron Butterfly',
    description: 'Low volatility income strategy using iron butterfly',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 4000,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'SPY',
    quote_currency: 'USD',
    time_horizon: 'swing',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 4000, max_exposure_usd: 8000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 50, stop_loss_percent: 200, max_daily_loss_usd: 100, max_drawdown_percent: 10, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Target,
    category: 'Options Income Strategies',
    defaultConfig: {
      // allocated_capital: 4000, // Now handled by capital_allocation
      // symbol: 'SPY', // Now handled by base_symbol
      wing_width: 20,
      expiration_days: 30,
      net_credit_target: 300,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      volatility_filter: 25,
      // Iron Butterfly Specific
      center_strike: 400,
      net_debit_or_credit_target: 300,
      roll_rules: 'none',
    },
  },
  {
    id: 'short_call_vertical',
    name: 'Short Call Vertical',
    description: 'Bearish spread strategy using short call verticals',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 3000,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'QQQ',
    quote_currency: 'USD',
    time_horizon: 'swing',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 3000, max_exposure_usd: 6000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 50, stop_loss_percent: 200, max_daily_loss_usd: 100, max_drawdown_percent: 10, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: TrendingDown,
    category: 'Options Income Strategies',
    defaultConfig: {
      // allocated_capital: 3000, // Now handled by capital_allocation
      // symbol: 'QQQ', // Now handled by base_symbol
      wing_width: 10,
      short_strike_delta: 0.30,
      expiration_days: 30,
      net_credit_target: 250,
      profit_target: 50,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      // Short Call Vertical Specific
      net_credit_target: 250,
      max_spread_width: 10,
      roll_rules: 'none',
    },
  },
  {
    id: 'short_put_vertical',
    name: 'Short Put Vertical',
    description: 'Bullish spread strategy using short put verticals',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 2500,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'QQQ',
    quote_currency: 'USD',
    time_horizon: 'swing',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 2500, max_exposure_usd: 5000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 50, stop_loss_percent: 200, max_daily_loss_usd: 100, max_drawdown_percent: 10, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: TrendingUp,
    category: 'Options Income Strategies',
    defaultConfig: {
      // allocated_capital: 2500, // Now handled by capital_allocation
      // symbol: 'QQQ', // Now handled by base_symbol
      wing_width: 10,
      short_strike_delta: -0.30,
      expiration_days: 30,
      net_credit_target: 200,
      profit_target: 50,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      // Short Put Vertical Specific
      net_credit_target: 200,
      max_spread_width: 10,
      roll_rules: 'none',
    },
  },

  // Options Directional & Volatility
  {
    id: 'long_call',
    name: 'Long Call',
    description: 'Bullish momentum play using long call options',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 5000,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'AAPL',
    quote_currency: 'USD',
    time_horizon: 'swing',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 5000, max_exposure_usd: 10000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 100, stop_loss_percent: 50, max_daily_loss_usd: 100, max_drawdown_percent: 10, pause_on_event_flags: ['earnings'] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: TrendingUp,
    category: 'Options Directional & Volatility',
    defaultConfig: {
      // allocated_capital: 5000, // Now handled by capital_allocation
      // symbol: 'AAPL', // Now handled by base_symbol
      strike_delta: 0.30,
      expiration_days: 30,
      max_premium_percent: 10,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      stop_loss: { value: 50, type: 'percentage' },
      // Long Call Specific
      expiry_selection: 'days_to_expiry',
      time_exit_days_before_expiry: 5,
    },
  },
  {
    id: 'straddle',
    name: 'Long Straddle',
    description: 'Profit from high volatility in either direction',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 8000,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'SPY',
    quote_currency: 'USD',
    time_horizon: 'intraday',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 8000, max_exposure_usd: 16000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 100, stop_loss_percent: 50, max_daily_loss_usd: 200, max_drawdown_percent: 15, pause_on_event_flags: ['earnings'] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Zap,
    category: 'Options Directional & Volatility',
    defaultConfig: {
      // allocated_capital: 8000, // Now handled by capital_allocation
      // symbol: 'SPY', // Now handled by base_symbol
      strike_selection: 'atm',
      expiration_days: 30,
      volatility_threshold: 20,
      max_premium_percent: 12,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      stop_loss: { value: 50, type: 'percentage' },
      // Long Straddle Specific
      expiry_selection: 'days_to_expiry',
      time_exit_days_before_expiry: 5,
    },
  },
  {
    id: 'long_strangle',
    name: 'Long Strangle',
    description: 'Directional volatility strategy using long strangles',
    skill_level: 'moderate',
    risk_level: 'medium',
    min_capital: 6000,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'SPY',
    quote_currency: 'USD',
    time_horizon: 'intraday',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 6000, max_exposure_usd: 12000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 100, stop_loss_percent: 50, max_daily_loss_usd: 150, max_drawdown_percent: 15, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Zap,
    category: 'Options Directional & Volatility',
    defaultConfig: {
      // allocated_capital: 6000, // Now handled by capital_allocation
      // symbol: 'SPY', // Now handled by base_symbol
      call_delta: 0.25,
      put_delta: -0.25,
      expiration_days: 30,
      volatility_threshold: 25,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      profit_target: 100,
      // Long Strangle Specific
      expiry_selection: 'days_to_expiry',
      time_exit_days_before_expiry: 5,
    },
  },
  {
    id: 'broken_wing_butterfly',
    name: 'Broken-Wing Butterfly',
    description: 'Asymmetric spread strategy with directional bias',
    skill_level: 'advanced',
    risk_level: 'medium',
    min_capital: 3500,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'SPY',
    quote_currency: 'USD',
    time_horizon: 'swing',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 3500, max_exposure_usd: 7000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 100, stop_loss_percent: 150, max_daily_loss_usd: 100, max_drawdown_percent: 10, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Target,
    category: 'Options Directional & Volatility',
    defaultConfig: {
      // allocated_capital: 3500, // Now handled by capital_allocation
      // symbol: 'SPY', // Now handled by base_symbol
      short_wing_width: 10,
      long_wing_width: 15,
      expiration_days: 45,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      max_debit: 100,
      // Broken-Wing Butterfly Specific
      center_strike: 400,
      net_debit_or_credit_target: 50,
      roll_rules: 'none',
    },
  },
  {
    id: 'option_collar',
    name: 'Option Collar',
    description: 'Protective strategy using option collars to limit downside',
    skill_level: 'moderate',
    risk_level: 'low',
    min_capital: 25000,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'AAPL',
    quote_currency: 'USD',
    time_horizon: 'long_term',
    automation_level: 'fully_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 25000, max_exposure_usd: 50000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: true, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 0, stop_loss_percent: 0, max_daily_loss_usd: 0, max_drawdown_percent: 0, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: Shield,
    category: 'Options Directional & Volatility',
    defaultConfig: {
      // allocated_capital: 25000, // Now handled by capital_allocation
      // symbol: 'AAPL', // Now handled by base_symbol
      position_size: 100,
      put_delta: -0.25,
      call_delta: 0.25,
      expiration_days: 45,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      net_cost_target: 50,
      // Option Collar Specific
      put_strike_below: 0.95,
      call_strike_above: 1.05,
      protect_threshold: 0.02,
    },
  },
  {
    id: 'short_call',
    name: 'Short Call',
    description: 'High-risk premium collection selling naked calls',
    skill_level: 'advanced',
    risk_level: 'high',
    min_capital: 15000,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'AAPL',
    quote_currency: 'USD',
    time_horizon: 'intraday',
    automation_level: 'semi_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 15000, max_exposure_usd: 30000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: false, combo_execution: 'legged' },
    risk_controls: { take_profit_percent: 50, stop_loss_percent: 200, max_daily_loss_usd: 500, max_drawdown_percent: 15, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 50, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: TrendingDown,
    category: 'Options Directional & Volatility',
    defaultConfig: {
      // allocated_capital: 15000, // Now handled by capital_allocation
      // symbol: 'AAPL', // Now handled by base_symbol
      strike_delta: 0.20,
      expiration_days: 30,
      minimum_premium: 300,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      stop_loss: { value: 200, type: 'percentage' },
      // Short Call Specific
      auto_hedge_rules: 'none',
      margin_buffer_percent: 10,
      account_type_restriction: 'margin',
    },
  },
  {
    id: 'short_straddle',
    name: 'Short Straddle',
    description: 'Ultra-high risk volatility selling strategy',
    skill_level: 'advanced',
    risk_level: 'high',
    min_capital: 20000,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'SPY',
    quote_currency: 'USD',
    time_horizon: 'intraday',
    automation_level: 'semi_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 20000, max_exposure_usd: 40000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: false, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 50, stop_loss_percent: 200, max_daily_loss_usd: 1000, max_drawdown_percent: 20, pause_on_event_flags: ['FOMC'] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 70, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: TrendingDown,
    category: 'Options Directional & Volatility',
    defaultConfig: {
      // allocated_capital: 20000, // Now handled by capital_allocation
      // symbol: 'SPY', // Now handled by base_symbol
      strike_selection: 'atm',
      expiration_days: 21,
      minimum_premium: 600,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      volatility_filter: 25,
      // Short Straddle Specific
      iv_rank_min: 70,
      max_percent_of_equity_at_risk: 2,
      dynamic_hedge_rules: 'none',
      panic_cutoff: 0.05,
    },
  },
  {
    id: 'short_strangle',
    name: 'Short Strangle',
    description: 'Premium collection strategy using short strangles',
    skill_level: 'advanced',
    risk_level: 'high',
    min_capital: 25000,
    account_id: 'default_account_id',
    asset_class: 'options',
    base_symbol: 'SPY',
    quote_currency: 'USD',
    time_horizon: 'intraday',
    automation_level: 'semi_auto',
    capital_allocation: { mode: 'fixed_amount_usd', value: 25000, max_exposure_usd: 50000 },
    position_sizing: { mode: 'fixed_units', value: 1 },
    trade_window: { enabled: true, start_time: '09:30', end_time: '16:00', days_of_week: [1, 2, 3, 4, 5] },
    order_execution: { order_type_default: 'limit', limit_tolerance_percent: 0.1, allow_partial_fill: false, combo_execution: 'atomic' },
    risk_controls: { take_profit_percent: 50, stop_loss_percent: 200, max_daily_loss_usd: 1000, max_drawdown_percent: 20, pause_on_event_flags: [] },
    data_filters: { min_liquidity: 100000, max_bid_ask_spread_pct: 0.05, iv_rank_threshold: 70, min_open_interest: 100 },
    notifications: { email_alerts: true, push_notifications: false, webhook_url: '' },
    icon: TrendingDown,
    category: 'Options Directional & Volatility',
    defaultConfig: {
      // allocated_capital: 25000, // Now handled by capital_allocation
      // symbol: 'SPY', // Now handled by base_symbol
      call_delta: 0.20,
      put_delta: -0.20,
      expiration_days: 21,
      take_profit: { value: 0, type: 'percentage' },
      stop_loss: { value: 0, type: 'percentage' },
      minimum_premium: 500,
      // Short Strangle Specific
      iv_rank_min: 70,
      max_percent_of_equity_at_risk: 2,
      dynamic_hedge_rules: 'none',
      panic_cutoff: 0.05,
    },
  },
];

const strategyCategories = [
  {
    name: 'Grid Trading Bots',
    description: 'Automated trading bots that profit from market volatility within defined ranges',
    icon: Grid3X3,
    color: 'from-green-500 to-emerald-600',
  },
  {
    name: 'Automated Core Strategies',
    description: 'Algorithmic strategies using technical analysis and market patterns',
    icon: Brain,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    name: 'Options Income Strategies',
    description: 'Conservative options strategies focused on generating consistent income',
    icon: Shield,
    color: 'from-purple-500 to-violet-600',
  },
  {
    name: 'Options Directional & Volatility',
    description: 'Directional and volatility-based options strategies for active traders',
    icon: TrendingUp,
    color: 'from-orange-500 to-red-600',
  },
];

export function CreateStrategyModal({ onClose, onSave }: CreateStrategyModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyTemplate | null>(null);
  const [strategyName, setStrategyName] = useState('');
  const [description, setDescription] = useState('');
  const [minCapital, setMinCapital] = useState(1000);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  
  // Universal Bot Fields State
  const [accountId, setAccountId] = useState('');
  const [assetClass, setAssetClass] = useState<TradingStrategy['asset_class']>();
  const [baseSymbol, setBaseSymbol] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState('');
  const [timeHorizon, setTimeHorizon] = useState<TradingStrategy['time_horizon']>();
  const [automationLevel, setAutomationLevel] = useState<TradingStrategy['automation_level']>();
  const [capitalAllocation, setCapitalAllocation] = useState<TradingStrategy['capital_allocation']>();
  const [positionSizing, setPositionSizing] = useState<TradingStrategy['position_sizing']>();
  const [tradeWindow, setTradeWindow] = useState<TradingStrategy['trade_window']>();
  const [orderExecution, setOrderExecution] = useState<TradingStrategy['order_execution']>();
  const [riskControls, setRiskControls] = useState<TradingStrategy['risk_controls']>();
  const [dataFilters, setDataFilters] = useState<TradingStrategy['data_filters']>();
  const [configuration, setConfiguration] = useState<Record<string, any>>({});

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
  };

  const handleStrategySelect = (strategy: StrategyTemplate) => {
    setSelectedStrategy(strategy);
    setStrategyName(strategy.name);
    setDescription(strategy.description);
    setMinCapital(strategy.min_capital);
    setRiskLevel(strategy.risk_level);
    // Set universal fields from template
    setAccountId(strategy.account_id || '');
    setAssetClass(strategy.asset_class);
    setBaseSymbol(strategy.base_symbol || '');
    setQuoteCurrency(strategy.quote_currency || '');
    setTimeHorizon(strategy.time_horizon);
    setAutomationLevel(strategy.automation_level);
    setCapitalAllocation(strategy.capital_allocation);
    setPositionSizing(strategy.position_sizing);
    setTradeWindow(strategy.trade_window);
    setOrderExecution(strategy.order_execution);
    setRiskControls(strategy.risk_controls);
    setDataFilters(strategy.data_filters);
    setConfiguration(strategy.defaultConfig);
  };

  const handleSave = () => {
    if (!selectedStrategy) return;

    const newStrategy: Omit<TradingStrategy, 'id'> = {
      name: strategyName,
      type: selectedStrategy.id,
      description: description,
      risk_level: riskLevel,
      skill_level: selectedStrategy.skill_level,
      min_capital: minCapital,
      account_id: accountId,
      asset_class: assetClass,
      base_symbol: baseSymbol,
      quote_currency: quoteCurrency,
      time_horizon: timeHorizon,
      automation_level: automationLevel,
      capital_allocation: capitalAllocation,
      position_sizing: positionSizing,
      trade_window: tradeWindow,
      order_execution: orderExecution,
      is_active: false,
      configuration: configuration,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(newStrategy);
  };

  const getStrategiesByCategory = (categoryName: string) => {
    return strategyTemplates.filter(strategy => strategy.category === categoryName);
  };

  const getCategoryStats = (categoryName: string) => {
    const strategies = getStrategiesByCategory(categoryName);
    const total = strategies.length;
    const lowRisk = strategies.filter(s => s.risk_level === 'low').length;
    const medRisk = strategies.filter(s => s.risk_level === 'medium').length;
    const highRisk = strategies.filter(s => s.risk_level === 'high').length;
    
    return { total, lowRisk, medRisk, highRisk };
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
    }
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
            <div className="flex items-center gap-4">
              {selectedCategory && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedStrategy(null);
                  }}
                  className="p-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div>
                <h2 className="text-2xl font-bold text-white">Create Trading Strategy</h2>
                <p className="text-gray-400">
                  {!selectedCategory 
                    ? 'Choose a strategy category to get started'
                    : selectedStrategy
                      ? 'Configure your strategy parameters'
                      : `Select a strategy from ${selectedCategory}`
                  }
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {!selectedCategory ? (
              // Category Selection View
              <motion.div
                key="categories"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Choose Strategy Category</h3>
                  <p className="text-gray-400 mb-6">Select a category to explore available trading strategies</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {strategyCategories.map((category) => {
                    const stats = getCategoryStats(category.name);
                    const Icon = category.icon;
                    
                    return (
                      <motion.div
                        key={category.name}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCategorySelect(category.name)}
                        className="p-6 bg-gray-800/30 border border-gray-700 rounded-xl cursor-pointer hover:border-blue-500 transition-all group"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-white mb-2">{category.name}</h4>
                            <p className="text-sm text-gray-400 leading-relaxed">{category.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300 font-medium">
                            {stats.total} strategies
                          </span>
                          <div className="flex gap-2">
                            {stats.lowRisk > 0 && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-green-400/10 text-green-400 border border-green-400/20">
                                {stats.lowRisk} Low
                              </span>
                            )}
                            {stats.medRisk > 0 && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                                {stats.medRisk} Med
                              </span>
                            )}
                            {stats.highRisk > 0 && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-red-400/10 text-red-400 border border-red-400/20">
                                {stats.highRisk} High
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : !selectedStrategy ? (
              // Strategy Selection View
              <motion.div
                key="strategies"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{selectedCategory}</h3>
                  <p className="text-gray-400 mb-6">Select a strategy to configure and create</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getStrategiesByCategory(selectedCategory).map((strategy) => {
                    const Icon = strategy.icon;
                    
                    return (
                      <motion.div
                        key={strategy.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleStrategySelect(strategy)}
                        className="p-6 bg-gray-800/30 border border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-all group"
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">{strategy.name}</h4>
                            <p className="text-sm text-gray-400 leading-relaxed">{strategy.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(strategy.risk_level)}`}>
                            {strategy.risk_level} risk
                          </span>
                          <span className="text-sm text-gray-400">
                            Min: ${strategy.min_capital.toLocaleString()}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              // Strategy Configuration View
              <motion.div
                key="configuration"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <selectedStrategy.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedStrategy.name}</h3>
                    <p className="text-gray-400">{selectedStrategy.description}</p>
                  </div>
                  <div className="ml-auto">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(selectedStrategy.risk_level)}`}>
                      {selectedStrategy.risk_level} risk
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Strategy Name
                    </label>
                    <input
                      type="text"
                      value={strategyName}
                      onChange={(e) => setStrategyName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter strategy name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Minimum Capital
                    </label>
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
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Describe your strategy..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Risk Level
                    </label>
                    <select
                      value={riskLevel}
                      onChange={(e) => setRiskLevel(e.target.value as any)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                    </select>
                  </div>
                </div>
                
                {/* Universal Bot Fields */}
                <div className="md:col-span-2 space-y-6">
                  <h3 className="text-lg font-semibold text-white">Universal Bot Fields</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Account ID</label>
                      <input
                        type="text"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Alpaca-12345"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Asset Class</label>
                      <select
                        value={assetClass || ''}
                        onChange={(e) => setAssetClass(e.target.value as any)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Asset Class</option>
                        <option value="equity">Equity</option>
                        <option value="options">Options</option>
                        <option value="crypto">Crypto</option>
                        <option value="futures">Futures</option>
                        <option value="forex">Forex</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Base Symbol</label>
                      <input
                        type="text"
                        value={baseSymbol}
                        onChange={(e) => setBaseSymbol(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., AAPL or BTC"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Quote Currency</label>
                      <input
                        type="text"
                        value={quoteCurrency}
                        onChange={(e) => setQuoteCurrency(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., USD or USDT"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Time Horizon</label>
                      <select
                        value={timeHorizon || ''}
                        onChange={(e) => setTimeHorizon(e.target.value as any)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Time Horizon</option>
                        <option value="intraday">Intraday</option>
                        <option value="swing">Swing</option>
                        <option value="long_term">Long Term</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Automation Level</label>
                      <select
                        value={automationLevel || ''}
                        onChange={(e) => setAutomationLevel(e.target.value as any)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Automation Level</option>
                        <option value="fully_auto">Fully Automatic</option>
                        <option value="semi_auto">Semi-Automatic</option>
                        <option value="manual">Manual</option>
                      </select>
                    </div>
                  </div>

                  {/* Capital Allocation */}
                  <div className="bg-gray-800/30 rounded-lg p-6">
                    <h4 className="font-semibold text-white mb-4">Capital Allocation</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Mode</label>
                        <select
                          value={capitalAllocation?.mode || ''}
                          onChange={(e) => setCapitalAllocation(prev => ({ ...prev, mode: e.target.value as any }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        >
                          <option value="fixed_amount_usd">Fixed Amount (USD)</option>
                          <option value="percent_of_portfolio">Percent of Portfolio</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Value</label>
                        <input
                          type="number"
                          value={capitalAllocation?.value || ''}
                          onChange={(e) => setCapitalAllocation(prev => ({ ...prev, value: Number(e.target.value) }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Max Positions</label>
                        <input
                          type="number"
                          value={capitalAllocation?.max_positions || ''}
                          onChange={(e) => setCapitalAllocation(prev => ({ ...prev, max_positions: Number(e.target.value) }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Max Exposure (USD)</label>
                        <input
                          type="number"
                          value={capitalAllocation?.max_exposure_usd || ''}
                          onChange={(e) => setCapitalAllocation(prev => ({ ...prev, max_exposure_usd: Number(e.target.value) }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Order Execution */}
                  <div className="bg-gray-800/30 rounded-lg p-6">
                    <h4 className="font-semibold text-white mb-4">Order Execution</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Default Order Type</label>
                        <select
                          value={orderExecution?.order_type_default || ''}
                          onChange={(e) => setOrderExecution(prev => ({ ...prev, order_type_default: e.target.value as any }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        >
                          <option value="market">Market</option>
                          <option value="limit">Limit</option>
                          <option value="limit_if_touched">Limit If Touched</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Limit Tolerance (%)</label>
                        <input
                          type="number"
                          value={orderExecution?.limit_tolerance_percent || ''}
                          onChange={(e) => setOrderExecution(prev => ({ ...prev, limit_tolerance_percent: Number(e.target.value) }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Allow Partial Fill</label>
                        <input
                          type="checkbox"
                          checked={orderExecution?.allow_partial_fill || false}
                          onChange={(e) => setOrderExecution(prev => ({ ...prev, allow_partial_fill: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Combo Execution</label>
                        <select
                          value={orderExecution?.combo_execution || ''}
                          onChange={(e) => setOrderExecution(prev => ({ ...prev, combo_execution: e.target.value as any }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        >
                          <option value="atomic">Atomic</option>
                          <option value="legged">Legged</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Risk Controls */}
                  <div className="bg-gray-800/30 rounded-lg p-6">
                    <h4 className="font-semibold text-white mb-4">Risk Controls</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Take Profit (%)</label>
                        <input
                          type="number"
                          value={riskControls?.take_profit_percent || ''}
                          onChange={(e) => setRiskControls(prev => ({ ...prev, take_profit_percent: Number(e.target.value) }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Stop Loss (%)</label>
                        <input
                          type="number"
                          value={riskControls?.stop_loss_percent || ''}
                          onChange={(e) => setRiskControls(prev => ({ ...prev, stop_loss_percent: Number(e.target.value) }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Max Daily Loss (USD)</label>
                        <input
                          type="number"
                          value={riskControls?.max_daily_loss_usd || ''}
                          onChange={(e) => setRiskControls(prev => ({ ...prev, max_daily_loss_usd: Number(e.target.value) }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Max Drawdown (%)</label>
                        <input
                          type="number"
                          value={riskControls?.max_drawdown_percent || ''}
                          onChange={(e) => setRiskControls(prev => ({ ...prev, max_drawdown_percent: Number(e.target.value) }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategy-specific configuration fields */}
                <div className="bg-gray-800/30 rounded-lg p-6">
                  <h4 className="font-semibold text-white mb-4">Strategy Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(configuration).map(([key, value]) => (
                      <div key={key} className={
                        key === 'assets' || 
                        (typeof value === 'object' && value !== null && !Array.isArray(value) && 
                         (key === 'stop_loss' || key === 'take_profit')) 
                          ? 'md:col-span-2' : ''
                      }>
                        <label className="block text-sm font-medium text-gray-300 mb-2 capitalize">
                          {key.replace(/_/g, ' ')}
                        </label>
                        {key === 'assets' && Array.isArray(value) ? (
                          <div className="space-y-3">
                            {value.map((asset: any, index: number) => (
                              <div key={index} className="flex gap-3 items-end">
                                <div className="flex-1">
                                  <label className="block text-xs text-gray-400 mb-1">Symbol</label>
                                  <input
                                    type="text"
                                    value={asset.symbol || ''}
                                    onChange={(e) => {
                                      const newAssets = [...value];
                                      newAssets[index] = { ...asset, symbol: e.target.value };
                                      setConfiguration(prev => ({ ...prev, [key]: newAssets }));
                                    }}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                    placeholder="BTC"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs text-gray-400 mb-1">Allocation %</label>
                                  <input
                                    type="number"
                                    value={asset.allocation || 0}
                                    onChange={(e) => {
                                      const newAssets = [...value];
                                      newAssets[index] = { ...asset, allocation: Number(e.target.value) };
                                      setConfiguration(prev => ({ ...prev, [key]: newAssets }));
                                    }}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                    min="0"
                                    max="100"
                                    step="1"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newAssets = value.filter((_: any, i: number) => i !== index);
                                    setConfiguration(prev => ({ ...prev, [key]: newAssets }));
                                  }}
                                  className="text-red-400 hover:text-red-300 px-2 py-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                               const newAssets = [...value, { symbol: '', allocation: 0 }];
                                setConfiguration(prev => ({ ...prev, [key]: newAssets }));
                              }}
                              className="w-full"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Asset
                            </Button>
                            <div className="text-xs text-gray-400">
                              Total allocation: {value.reduce((sum: number, asset: any) => sum + (asset.allocation || 0), 0)}%
                            </div>
                          </div>
                        ) : (key === 'stop_loss' || key === 'take_profit') && typeof value === 'object' && value !== null ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Value</label>
                              <input
                                type="number"
                                value={value.value || 0}
                                onChange={(e) => {
                                  setConfiguration(prev => ({ 
                                    ...prev, 
                                    [key]: { ...value, value: Number(e.target.value) }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Type</label>
                              <select
                                value={value.type || 'percentage'}
                                onChange={(e) => {
                                  setConfiguration(prev => ({ 
                                    ...prev, 
                                    [key]: { ...value, type: e.target.value }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="percentage">Percentage</option>
                                <option value="absolute">Absolute</option>
                              </select>
                            </div>
                          </div>
                        ) : typeof value === 'boolean' ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => setConfiguration(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-sm text-gray-300">Enabled</span>
                          </label>
                        ) : key === 'trigger_type' ? (
                          <div>
                            <select
                              value={value}
                              onChange={(e) => setConfiguration(prev => ({ ...prev, [key]: e.target.value }))}
                              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="threshold">Threshold</option>
                              <option value="time">Time</option>
                            </select>
                          </div>
                        ) : key === 'rebalance_frequency' && configuration.trigger_type === 'time' ? (
                          <div>
                            <select
                              value={value}
                              onChange={(e) => setConfiguration(prev => ({ ...prev, [key]: e.target.value }))}
                              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="1h">1 Hour</option>
                              <option value="6h">6 Hours</option>
                              <option value="24h">24 Hours</option>
                              <option value="1 week">1 Week</option>
                              <option value="1 month">1 Month</option>
                              <option value="6 months">6 Months</option>
                              <option value="1 year">1 Year</option>
                            </select>
                          </div>
                        ) : typeof value === 'boolean' ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => setConfiguration(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-sm text-gray-300">Enabled</span>
                          </label>
                        ) : typeof value === 'number' ? (
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => setConfiguration(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                            step={key.includes('percent') || key.includes('delta') ? '0.01' : '1'}
                          />
                        ) : (
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setConfiguration(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedStrategy(null)}
                    className="flex-1"
                  >
                    Back to Strategies
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!strategyName.trim()}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Create Strategy
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}