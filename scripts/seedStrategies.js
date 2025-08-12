import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define all strategies with their configurations based on the chart
const strategiesToSeed = [
  {
    name: 'Spot Grid Bot',
    type: 'spot_grid',
    description: 'Automates buy-low/sell-high trades within a defined price range for cryptocurrency trading.',
    risk_level: 'low',
    min_capital: 1000,
    is_active: false,
    configuration: {
      allocated_capital: 1000,
      price_range_lower: 0,
      price_range_upper: 0,
      number_of_grids: 20,
      grid_mode: 'arithmetic'
    }
  },
  {
    name: 'Futures Grid Bot',
    type: 'futures_grid',
    description: 'Grid trading on futures market with leverage support for advanced traders.',
    risk_level: 'medium',
    min_capital: 2000,
    is_active: false,
    configuration: {
      allocated_capital: 2000,
      symbol: 'BTC/USDT',
      price_range_lower: 0,
      price_range_upper: 0,
      number_of_grids: 25,
      grid_mode: 'arithmetic',
      direction: 'long',
      leverage: 3
    },
    performance: {
      total_return: 0.142,
      win_rate: 0.68,
      max_drawdown: 0.12,
      sharpe_ratio: 1.35,
      total_trades: 89,
      avg_trade_duration: 4,
      volatility: 0.18,
      standard_deviation: 0.16,
      beta: 1.15,
      alpha: 0.018,
      value_at_risk: -0.028,
    }
  },
  {
    name: 'Infinity Grid Bot',
    type: 'infinity_grid',
    description: 'Grid trading without upper price limit for trending markets and bull runs.',
    risk_level: 'medium',
    min_capital: 1500,
    is_active: false,
    configuration: {
      allocated_capital: 1500,
      symbol: 'ETH/USDT',
      price_range_lower: 0,
      number_of_grids: 30,
      grid_mode: 'geometric'
    },
    performance: {
      total_return: 0.186,
      win_rate: 0.71,
      max_drawdown: 0.14,
      sharpe_ratio: 1.28,
      total_trades: 124,
      avg_trade_duration: 3,
      volatility: 0.22,
      standard_deviation: 0.19,
      beta: 1.25,
      alpha: 0.022,
      value_at_risk: -0.032,
    }
  },
  {
    name: 'DCA Bot (Dollar-Cost Averaging)',
    type: 'dca',
    description: 'Automatically invests at fixed intervals to minimize volatility risk through systematic purchasing.',
    risk_level: 'low',
    min_capital: 500,
    is_active: false,
    configuration: {
      allocated_capital: 500,
      symbol: 'BTC/USDT',
      investment_amount_per_interval: 50,
      frequency: 'daily',
      investment_target_percent: 25
    },
    performance: {
      total_return: 0.095,
      win_rate: 0.92,
      max_drawdown: 0.08,
      sharpe_ratio: 1.55,
      total_trades: 365,
      avg_trade_duration: 1,
      volatility: 0.12,
      standard_deviation: 0.10,
      beta: 0.75,
      alpha: 0.015,
      value_at_risk: -0.018,
    }
  },
  {
    name: 'Smart Rebalance Bot',
    type: 'smart_rebalance',
    description: 'Maintains target allocations in a portfolio of selected assets through automatic rebalancing.',
    risk_level: 'low',
    min_capital: 5000,
    is_active: false,
    configuration: {
      allocated_capital: 5000,
      assets: [
        { symbol: 'BTC', allocation: 40 },
        { symbol: 'ETH', allocation: 30 },
        { symbol: 'USDT', allocation: 30 },
      ],
      trigger_type: 'threshold',
      threshold_deviation_percent: 5,
      rebalance_frequency: 'weekly'
    },
    performance: {
      total_return: 0.078,
      win_rate: 0.88,
      max_drawdown: 0.06,
      sharpe_ratio: 1.42,
      total_trades: 24,
      avg_trade_duration: 7,
      volatility: 0.09,
      standard_deviation: 0.08,
      beta: 0.65,
      alpha: 0.012,
      value_at_risk: -0.014,
    }
  },
  {
    name: 'Covered Calls',
    type: 'covered_calls',
    description: 'Generate income by selling call options on owned stocks while maintaining the underlying position.',
    risk_level: 'low',
    min_capital: 15000,
    is_active: false,
    configuration: {
      allocated_capital: 15000,
      symbol: 'AAPL',
      position_size: 100,
      strike_delta: 0.30,
      expiration_days: 30,
      minimum_premium: 200,
      profit_target: 50,
      roll_when_itm: true
    },
    performance: {
      total_return: 0.085,
      win_rate: 0.82,
      max_drawdown: 0.04,
      sharpe_ratio: 1.65,
      total_trades: 28,
      avg_trade_duration: 30,
      volatility: 0.08,
      standard_deviation: 0.07,
      beta: 0.68,
      alpha: 0.022,
      value_at_risk: -0.012,
    }
  },
  {
    name: 'Iron Condor',
    type: 'iron_condor',
    description: 'Profit from low volatility with defined risk spreads on an underlying asset.',
    risk_level: 'medium',
    min_capital: 5000,
    is_active: false,
    configuration: {
      allocated_capital: 5000,
      symbol: 'SPY',
      wing_width: 10,
      short_strike_delta: 0.20,
      expiration_days: 45,
      net_credit_target: 200,
      profit_target: 25,
      stop_loss: { value: 200, type: 'percentage' }
    },
    performance: {
      total_return: 0.095,
      win_rate: 0.75,
      max_drawdown: 0.08,
      sharpe_ratio: 1.25,
      total_trades: 36,
      avg_trade_duration: 35,
      volatility: 0.16,
      standard_deviation: 0.14,
      beta: 0.85,
      alpha: 0.012,
      value_at_risk: -0.024,
    }
  },
  {
    name: 'Long Straddle',
    type: 'straddle',
    description: 'Profit from high volatility in either direction using long straddle options strategy.',
    risk_level: 'medium',
    min_capital: 8000,
    is_active: false,
    configuration: {
      allocated_capital: 8000,
      symbol: 'SPY',
      strike_selection: 'atm',
      expiration_days: 30,
      volatility_threshold: 20,
      max_premium_percent: 12,
      stop_loss: { value: 50, type: 'percentage' },
      take_profit: { value: 100, type: 'percentage' }
    },
    performance: {
      total_return: 0.165,
      win_rate: 0.58,
      max_drawdown: 0.18,
      sharpe_ratio: 1.12,
      total_trades: 42,
      avg_trade_duration: 25,
      volatility: 0.28,
      standard_deviation: 0.24,
      beta: 1.35,
      alpha: 0.008,
      value_at_risk: -0.038,
    }
  },
  {
    name: 'The Wheel',
    type: 'wheel',
    description: 'Systematic approach combining cash-secured puts and covered calls for consistent income generation.',
    risk_level: 'low',
    min_capital: 20000,
    is_active: false,
    configuration: {
      allocated_capital: 20000,
      symbol: 'AAPL',
      position_size: 100,
      put_strike_delta: -0.30,
      call_strike_delta: 0.30,
      expiration_days: 30,
      minimum_premium: 150,
      assignment_handling: 'automatic'
    },
    performance: {
      total_return: 0.092,
      win_rate: 0.84,
      max_drawdown: 0.07,
      sharpe_ratio: 1.58,
      total_trades: 36,
      avg_trade_duration: 32,
      volatility: 0.11,
      standard_deviation: 0.09,
      beta: 0.72,
      alpha: 0.019,
      value_at_risk: -0.016,
    }
  },
  {
    name: 'Opening Range Breakout (ORB)',
    type: 'orb',
    description: 'Trade breakouts from the first 15-30 minutes of market open for momentum capture.',
    risk_level: 'medium',
    min_capital: 5000,
    is_active: false,
    configuration: {
      allocated_capital: 5000,
      symbol: 'SPY',
      orb_period: 30,
      breakout_threshold: 0.002,
      stop_loss: { value: 1, type: 'percentage' },
      take_profit: { value: 2, type: 'percentage' },
      max_position_size: 100
    },
    performance: {
      total_return: 0.128,
      win_rate: 0.65,
      max_drawdown: 0.11,
      sharpe_ratio: 1.25,
      total_trades: 156,
      avg_trade_duration: 2,
      volatility: 0.19,
      standard_deviation: 0.17,
      beta: 1.08,
      alpha: 0.014,
      value_at_risk: -0.026,
    }
  },
  {
    name: 'Long Call - Bullish Momentum',
    type: 'long_call',
    description: 'Bullish momentum play using long call options for leveraged upside exposure on an underlying asset.',
    risk_level: 'medium',
    min_capital: 5000,
    is_active: false,
    configuration: {
      allocated_capital: 5000,
      symbol: 'AAPL',
      strike_delta: 0.30,
      expiration_days: 30,
      max_premium_percent: 10,
      stop_loss: { value: 50, type: 'percentage' }
    },
    performance: {
      total_return: 0.245,
      win_rate: 0.52,
      max_drawdown: 0.22,
      sharpe_ratio: 0.95,
      total_trades: 28,
      avg_trade_duration: 18,
      volatility: 0.35,
      standard_deviation: 0.31,
      beta: 1.55,
      alpha: 0.025,
      value_at_risk: -0.048,
    }
  },
  {
    name: 'Long Straddle - Volatility Play',
    type: 'long_straddle',
    description: 'Volatility play around earnings using long straddle on an underlying asset for directional movement profits.',
    risk_level: 'medium',
    min_capital: 8000,
    is_active: false,
    configuration: {
      allocated_capital: 8000,
      symbol: 'SPY',
      strike_selection: 'atm',
      expiration_days: 30,
      volatility_threshold: 20,
      max_premium_percent: 12,
      stop_loss: { value: 50, type: 'percentage' },
      take_profit: { value: 100, type: 'percentage' }
    },
    performance: {
      total_return: 0.198,
      win_rate: 0.48,
      max_drawdown: 0.25,
      sharpe_ratio: 0.88,
      total_trades: 32,
      avg_trade_duration: 22,
      volatility: 0.42,
      standard_deviation: 0.38,
      beta: 1.68,
      alpha: 0.012,
      value_at_risk: -0.055,
    }
  },
  {
    name: 'Long Condor - Range Bound',
    type: 'long_condor',
    description: 'Range-bound profit strategy using long condor spreads on an underlying asset for sideways market conditions.',
    risk_level: 'low',
    min_capital: 3000,
    is_active: false,
    configuration: {
      allocated_capital: 3000,
      symbol: 'SPY',
      wing_width: 10,
      body_width: 10,
      expiration_days: 45,
      max_debit_percent: 8,
      profit_target: 50,
      stop_loss: { value: 100, type: 'percentage' }
    },
    performance: {
      total_return: 0.065,
      win_rate: 0.78,
      max_drawdown: 0.04,
      sharpe_ratio: 1.48,
      total_trades: 18,
      avg_trade_duration: 35,
      volatility: 0.08,
      standard_deviation: 0.07,
      beta: 0.58,
      alpha: 0.008,
      value_at_risk: -0.012,
    }
  },
  {
    name: 'Iron Butterfly - Low Volatility',
    type: 'iron_butterfly',
    description: 'Low volatility income strategy using iron butterfly on an underlying stock for range-bound markets.',
    risk_level: 'medium',
    min_capital: 4000,
    is_active: false,
    configuration: {
      allocated_capital: 4000,
      symbol: 'SPY',
      wing_width: 20,
      expiration_days: 30,
      net_credit_target: 300,
      volatility_filter: 25,
      profit_target: 50,
      stop_loss: { value: 200, type: 'percentage' }
    },
    performance: {
      total_return: 0.088,
      win_rate: 0.72,
      max_drawdown: 0.09,
      sharpe_ratio: 1.32,
      total_trades: 24,
      avg_trade_duration: 28,
      volatility: 0.14,
      standard_deviation: 0.12,
      beta: 0.85,
      alpha: 0.011,
      value_at_risk: -0.021,
    }
  },
  {
    name: 'Short Call - Premium Collection',
    type: 'short_call',
    description: 'High-risk premium collection strategy selling naked calls on an underlying stock with defined risk management.',
    risk_level: 'high',
    min_capital: 15000,
    is_active: false,
    configuration: {
      allocated_capital: 15000,
      symbol: 'AAPL',
      strike_delta: 0.20,
      expiration_days: 30,
      minimum_premium: 300,
      stop_loss: { value: 200, type: 'percentage' },
      margin_requirement: 10000
    },
    performance: {
      total_return: 0.156,
      win_rate: 0.45,
      max_drawdown: 0.28,
      sharpe_ratio: 0.72,
      total_trades: 36,
      avg_trade_duration: 25,
      volatility: 0.38,
      standard_deviation: 0.34,
      beta: 1.75,
      alpha: -0.005,
      value_at_risk: -0.052,
    }
  },
  {
    name: 'Short Straddle - Ultra High Risk',
    type: 'short_straddle',
    description: 'Ultra-high risk volatility selling strategy using short straddles on an underlying stock for premium income.',
    risk_level: 'high',
    min_capital: 20000,
    is_active: false,
    configuration: {
      allocated_capital: 20000,
      symbol: 'SPY',
      strike_selection: 'atm',
      expiration_days: 21,
      minimum_premium: 600,
      volatility_filter: 25,
      stop_loss: { value: 200, type: 'percentage' },
      max_loss_per_trade: 3000
    },
    performance: {
      total_return: 0.225,
      win_rate: 0.38,
      max_drawdown: 0.35,
      sharpe_ratio: 0.65,
      total_trades: 48,
      avg_trade_duration: 18,
      volatility: 0.48,
      standard_deviation: 0.42,
      beta: 1.95,
      alpha: -0.012,
      value_at_risk: -0.068,
    }
  },
  {
    name: 'Long Butterfly - Precision Targeting',
    type: 'long_butterfly',
    description: 'Precision targeting strategy using long butterfly spreads on an underlying asset for specific price level profits.',
    risk_level: 'low',
    min_capital: 2500,
    is_active: false,
    configuration: {
      allocated_capital: 2500,
      symbol: 'SPY',
      wing_width: 10,
      expiration_days: 30,
      max_debit: 150,
      profit_target: 100,
      stop_loss: { value: 50, type: 'percentage' }
    },
    performance: {
      total_return: 0.058,
      win_rate: 0.82,
      max_drawdown: 0.03,
      sharpe_ratio: 1.65,
      total_trades: 15,
      avg_trade_duration: 42,
      volatility: 0.06,
      standard_deviation: 0.05,
      beta: 0.45,
      alpha: 0.012,
      value_at_risk: -0.009,
    }
  },
  {
    name: 'Long Strangle - Directional Volatility',
    type: 'long_strangle',
    description: 'Directional volatility strategy using long strangles on an underlying asset for large directional moves.',
    risk_level: 'medium',
    min_capital: 6000,
    is_active: false,
    configuration: {
      allocated_capital: 6000,
      symbol: 'SPY',
      call_delta: 0.25,
      put_delta: -0.25,
      expiration_days: 30,
      volatility_threshold: 25,
      profit_target: 100,
      stop_loss: { value: 50, type: 'percentage' }
    },
    performance: {
      total_return: 0.138,
      win_rate: 0.55,
      max_drawdown: 0.16,
      sharpe_ratio: 1.08,
      total_trades: 38,
      avg_trade_duration: 20,
      volatility: 0.24,
      standard_deviation: 0.21,
      beta: 1.28,
      alpha: 0.006,
      value_at_risk: -0.034,
    }
  },
  {
    name: 'Short Call Vertical - Bearish Spread',
    type: 'short_call_vertical',
    description: 'Bearish spread strategy using short call verticals on an underlying stock with defined maximum risk.',
    risk_level: 'medium',
    min_capital: 3000,
    is_active: false,
    configuration: {
      allocated_capital: 3000,
      symbol: 'QQQ',
      wing_width: 10,
      short_strike_delta: 0.30,
      expiration_days: 30,
      net_credit_target: 250,
      profit_target: 50,
      stop_loss: { value: 200, type: 'percentage' }
    },
    performance: {
      total_return: 0.105,
      win_rate: 0.71,
      max_drawdown: 0.09,
      sharpe_ratio: 1.38,
      total_trades: 26,
      avg_trade_duration: 28,
      volatility: 0.15,
      standard_deviation: 0.13,
      beta: 0.88,
      alpha: 0.014,
      value_at_risk: -0.022,
    }
  },
  {
    name: 'Short Put - Cash Secured',
    type: 'short_put',
    description: 'Cash-secured put strategy on an underlying stock for income generation with potential stock acquisition.',
    risk_level: 'medium',
    min_capital: 15000,
    is_active: false,
    configuration: {
      allocated_capital: 15000,
      symbol: 'AAPL',
      strike_delta: -0.30,
      expiration_days: 30,
      minimum_premium: 150,
      profit_target: 50,
      stop_loss: { value: 200, type: 'percentage' }
    },
    performance: {
      total_return: 0.112,
      win_rate: 0.76,
      max_drawdown: 0.11,
      sharpe_ratio: 1.28,
      total_trades: 32,
      avg_trade_duration: 26,
      volatility: 0.17,
      standard_deviation: 0.15,
      beta: 0.95,
      alpha: 0.016,
      value_at_risk: -0.025,
    }
  },
  {
    name: 'Short Strangle - Premium Collection',
    type: 'short_strangle',
    description: 'Premium collection strategy using short strangles on an underlying stock for low volatility environments.',
    risk_level: 'high',
    min_capital: 25000,
    is_active: false,
    configuration: {
      allocated_capital: 25000,
      symbol: 'SPY',
      call_delta: 0.20,
      put_delta: -0.20,
      expiration_days: 21,
      minimum_premium: 500,
      volatility_filter: 25,
      profit_target: 50,
      stop_loss: { value: 200, type: 'percentage' }
    },
    performance: {
      total_return: 0.185,
      win_rate: 0.42,
      max_drawdown: 0.32,
      sharpe_ratio: 0.68,
      total_trades: 52,
      avg_trade_duration: 16,
      volatility: 0.45,
      standard_deviation: 0.39,
      beta: 1.85,
      alpha: -0.008,
      value_at_risk: -0.062,
    }
  },
  {
    name: 'Short Put Vertical - Bullish Spread',
    type: 'short_put_vertical',
    description: 'Bullish spread strategy using short put verticals on an underlying asset with limited risk profile.',
    risk_level: 'medium',
    min_capital: 2500,
    is_active: false,
    configuration: {
      allocated_capital: 2500,
      symbol: 'QQQ',
      wing_width: 10,
      short_strike_delta: -0.30,
      expiration_days: 30,
      net_credit_target: 200,
      profit_target: 50,
      stop_loss: { value: 200, type: 'percentage' }
    },
    performance: {
      total_return: 0.098,
      win_rate: 0.74,
      max_drawdown: 0.08,
      sharpe_ratio: 1.42,
      total_trades: 22,
      avg_trade_duration: 30,
      volatility: 0.13,
      standard_deviation: 0.11,
      beta: 0.82,
      alpha: 0.013,
      value_at_risk: -0.019,
    }
  },
  {
    name: 'Broken-Wing Butterfly - Asymmetric',
    type: 'broken_wing_butterfly',
    description: 'Asymmetric spread strategy using broken-wing butterfly on an underlying stock with directional bias.',
    risk_level: 'medium',
    min_capital: 3500,
    is_active: false,
    configuration: {
      allocated_capital: 3500,
      symbol: 'SPY',
      short_wing_width: 10,
      long_wing_width: 15,
      expiration_days: 45,
      max_debit: 100,
      profit_target: 100,
      stop_loss: { value: 150, type: 'percentage' }
    },
    performance: {
      total_return: 0.118,
      win_rate: 0.68,
      max_drawdown: 0.12,
      sharpe_ratio: 1.22,
      total_trades: 20,
      avg_trade_duration: 38,
      volatility: 0.18,
      standard_deviation: 0.16,
      beta: 0.92,
      alpha: 0.009,
      value_at_risk: -0.027,
    }
  },
  {
    name: 'Option Collar - Protective Strategy',
    type: 'option_collar',
    description: 'Protective strategy using option collars on an underlying stock to limit downside while capping upside.',
    risk_level: 'low',
    min_capital: 25000,
    is_active: false,
    configuration: {
      allocated_capital: 25000,
      symbol: 'AAPL',
      position_size: 100,
      put_delta: -0.25,
      call_delta: 0.25,
      expiration_days: 45,
      net_cost_target: 50,
      roll_frequency: 'monthly'
    },
    performance: {
      total_return: 0.072,
      win_rate: 0.85,
      max_drawdown: 0.05,
      sharpe_ratio: 1.52,
      total_trades: 12,
      avg_trade_duration: 45,
      volatility: 0.09,
      standard_deviation: 0.08,
      beta: 0.62,
      alpha: 0.008,
      value_at_risk: -0.013,
    }
  },
  {
    name: 'Mean Reversion - Contrarian',
    type: 'mean_reversion',
    description: 'Contrarian strategy that profits from price reversions to the mean using statistical analysis.',
    risk_level: 'medium',
    min_capital: 7500,
    is_active: false,
    configuration: {
      allocated_capital: 7500,
      symbol: 'SPY',
      lookback_period: 20,
      deviation_threshold: 2.0,
      position_size: 100,
      stop_loss: { value: 1, type: 'percentage' },
      take_profit: { value: 1.5, type: 'percentage' }
    },
    performance: {
      total_return: 0.125,
      win_rate: 0.64,
      max_drawdown: 0.13,
      sharpe_ratio: 1.18,
      total_trades: 85,
      avg_trade_duration: 5,
      volatility: 0.20,
      standard_deviation: 0.18,
      beta: 1.12,
      alpha: 0.011,
      value_at_risk: -0.029,
    }
  },
  {
    name: 'Momentum Breakout - Trend Following',
    type: 'momentum_breakout',
    description: 'Trend following strategy that captures momentum breakouts using technical indicators.',
    risk_level: 'medium',
    min_capital: 6000,
    is_active: false,
    configuration: {
      allocated_capital: 6000,
      symbol: 'QQQ',
      breakout_threshold: 0.03,
      volume_confirmation: true,
      position_size: 100,
      stop_loss: { value: 2, type: 'percentage' },
      take_profit: { value: 5, type: 'percentage' }
    },
    performance: {
      total_return: 0.148,
      win_rate: 0.58,
      max_drawdown: 0.15,
      sharpe_ratio: 1.08,
      total_trades: 72,
      avg_trade_duration: 8,
      volatility: 0.25,
      standard_deviation: 0.22,
      beta: 1.32,
      alpha: 0.018,
      value_at_risk: -0.035,
    }
  },
  {
    name: 'Pairs Trading - Market Neutral',
    type: 'pairs_trading',
    description: 'Market neutral strategy trading correlated pairs to profit from relative price movements.',
    risk_level: 'low',
    min_capital: 10000,
    is_active: false,
    configuration: {
      allocated_capital: 10000,
      pair_symbols: ['AAPL', 'MSFT'],
      correlation_threshold: 0.8,
      z_score_entry: 2.0,
      z_score_exit: 0.5,
      lookback_period: 60,
      position_ratio: 1.0
    },
    performance: {
      total_return: 0.082,
      win_rate: 0.79,
      max_drawdown: 0.06,
      sharpe_ratio: 1.45,
      total_trades: 34,
      avg_trade_duration: 12,
      volatility: 0.10,
      standard_deviation: 0.09,
      beta: 0.25,
      alpha: 0.015,
      value_at_risk: -0.015,
    }
  },
  {
    name: 'Scalping - High Frequency',
    type: 'scalping',
    description: 'High frequency scalping strategy for quick profits on small price movements.',
    risk_level: 'high',
    min_capital: 15000,
    is_active: false,
    configuration: {
      allocated_capital: 15000,
      symbol: 'SPY',
      time_frame: '1m',
      profit_target: 0.1,
      stop_loss: { value: 0.05, type: 'percentage' },
      max_trades_per_day: 50,
      position_size: 100
    },
    performance: {
      total_return: 0.285,
      win_rate: 0.48,
      max_drawdown: 0.32,
      sharpe_ratio: 0.58,
      total_trades: 1250,
      avg_trade_duration: 0.1,
      volatility: 0.52,
      standard_deviation: 0.48,
      beta: 2.15,
      alpha: -0.018,
      value_at_risk: -0.078,
    }
  },
  {
    name: 'Swing Trading - Multi-Day Holds',
    type: 'swing_trading',
    description: 'Multi-day swing trading strategy capturing intermediate price movements using technical analysis.',
    risk_level: 'medium',
    min_capital: 8000,
    is_active: false,
    configuration: {
      allocated_capital: 8000,
      symbol: 'QQQ',
      holding_period_min: 2,
      holding_period_max: 10,
      rsi_oversold: 30,
      rsi_overbought: 70,
      position_size: 100,
      stop_loss: { value: 3, type: 'percentage' },
      take_profit: { value: 6, type: 'percentage' }
    },
    performance: {
      total_return: 0.135,
      win_rate: 0.62,
      max_drawdown: 0.14,
      sharpe_ratio: 1.15,
      total_trades: 64,
      avg_trade_duration: 6,
      volatility: 0.22,
      standard_deviation: 0.19,
      beta: 1.18,
      alpha: 0.012,
      value_at_risk: -0.031,
    }
  },
  {
    name: 'Arbitrage - Cross-Exchange',
    type: 'arbitrage',
    description: 'Cross-exchange arbitrage strategy exploiting price differences between trading venues.',
    risk_level: 'low',
    min_capital: 12000,
    is_active: false,
    configuration: {
      allocated_capital: 12000,
      symbol: 'BTC/USDT',
      min_spread_threshold: 0.5,
      execution_speed: 'fast',
      max_position_size: 1000,
      exchanges: ['primary', 'secondary']
    },
    performance: {
      total_return: 0.045,
      win_rate: 0.95,
      max_drawdown: 0.02,
      sharpe_ratio: 2.15,
      total_trades: 156,
      avg_trade_duration: 0.5,
      volatility: 0.04,
      standard_deviation: 0.03,
      beta: 0.15,
      alpha: 0.025,
      value_at_risk: -0.006,
    }
  },
  {
    name: 'News-Based Trading - Event Driven',
    type: 'news_based_trading',
    description: 'Event-driven strategy that trades based on news sentiment and market reactions.',
    risk_level: 'high',
    min_capital: 10000,
    is_active: false,
    configuration: {
      allocated_capital: 10000,
      symbol: 'SPY',
      sentiment_threshold: 0.7,
      news_sources: ['reuters', 'bloomberg', 'cnbc'],
      reaction_window: 30,
      position_size: 100,
      stop_loss: { value: 2, type: 'percentage' },
      take_profit: { value: 4, type: 'percentage' }
    },
    performance: {
      total_return: 0.195,
      win_rate: 0.44,
      max_drawdown: 0.24,
      sharpe_ratio: 0.82,
      total_trades: 96,
      avg_trade_duration: 3,
      volatility: 0.38,
      standard_deviation: 0.34,
      beta: 1.65,
      alpha: 0.008,
      value_at_risk: -0.051,
    }
  }
];

async function seedStrategies() {
  try {
    console.log('🌱 Starting strategy seeding process...');
    
    // Get the current user (you'll need to replace this with actual user ID)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user found. Please ensure you are logged in.');
      console.error('You may need to manually set a user_id in this script for seeding.');
      
      // For seeding purposes, you can uncomment and set a specific user ID:
      // const userId = 'your-user-id-here';
      // console.log('Using manual user ID for seeding:', userId);
      
      return;
    }
    
    const userId = user.id;
    console.log('✅ Found user:', user.email, 'ID:', userId);
    
    // Check if strategies already exist to avoid duplicates
    const { data: existingStrategies, error: checkError } = await supabase
      .from('trading_strategies')
      .select('name, type')
      .eq('user_id', userId);
    
    if (checkError) {
      console.error('❌ Error checking existing strategies:', checkError);
      return;
    }
    
    const existingNames = new Set(existingStrategies?.map(s => s.name) || []);
    const existingTypes = new Set(existingStrategies?.map(s => s.type) || []);
    
    console.log(`📊 Found ${existingStrategies?.length || 0} existing strategies`);
    
    // Filter out strategies that already exist (by name or type)
    const newStrategies = strategiesToSeed.filter(strategy => 
      !existingNames.has(strategy.name) && !existingTypes.has(strategy.type)
    );
    
    if (newStrategies.length === 0) {
      console.log('✅ All strategies already exist. No new strategies to seed.');
      return;
    }
    
    console.log(`🚀 Seeding ${newStrategies.length} new strategies...`);
    
    // Insert strategies one by one for better error handling
    let successCount = 0;
    let errorCount = 0;
    
    for (const strategy of newStrategies) {
      try {
        const { data, error } = await supabase
          .from('trading_strategies')
          .insert([{
            user_id: userId,
            name: strategy.name,
            type: strategy.type,
            description: strategy.description,
            risk_level: strategy.risk_level,
            min_capital: strategy.min_capital,
            is_active: strategy.is_active,
            configuration: strategy.configuration
          }])
          .select()
          .single();
        
        if (error) {
          console.error(`❌ Failed to create strategy "${strategy.name}":`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Created strategy: "${strategy.name}" (ID: ${data.id})`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Unexpected error creating strategy "${strategy.name}":`, err);
        errorCount++;
      }
    }
    
    console.log('\n📈 Seeding Summary:');
    console.log(`✅ Successfully created: ${successCount} strategies`);
    console.log(`❌ Failed to create: ${errorCount} strategies`);
    console.log(`📊 Total strategies in database: ${(existingStrategies?.length || 0) + successCount}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Strategy seeding completed successfully!');
      console.log('💡 You can now view these strategies in the Strategies section of your app.');
      console.log('⚙️  Remember to configure and backtest each strategy before activating.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during strategy seeding:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedStrategies()
  .then(() => {
    console.log('🏁 Seeding process completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding process failed:', error);
    process.exit(1);
  });