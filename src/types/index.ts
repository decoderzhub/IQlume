export interface User {
  id: string;
  email: string;
  subscription_tier: 'starter' | 'pro' | 'elite';
  created_at: string;
  is_verified: boolean;
}

export interface BrokerageAccount {
  id: string;
  user_id: string;
  brokerage: 'alpaca' | 'ibkr' | 'binance' | 'robinhood' | 'vanguard' | 'tdameritrade' | 'schwab' | 'coinbase' | 'gemini' | 'custodial_wallet';
  account_name: string;
  account_type: 'stocks' | 'crypto' | 'ira' | 'forex';
  balance: number;
  is_connected: boolean;
  last_sync: string;
  oauth_token?: string;
  account_number?: string;
  routing_number?: string;
}

export interface BankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_name: string;
  account_type: 'checking' | 'savings';
  account_number_masked: string;
  routing_number: string;
  balance: number;
  is_verified: boolean;
  plaid_account_id: string;
  plaid_access_token: string;
  last_sync: string;
}

export interface CustodialWallet {
  id: string;
  user_id: string;
  wallet_name: string;
  balance_usd: number;
  balance_treasuries: number;
  apy: number;
  is_fdic_insured: boolean;
  created_at: string;
}

export interface Portfolio {
  total_value: number;
  buying_power: number;
  day_change: number;
  day_change_percent: number;
  accounts: BrokerageAccount[];
  bank_accounts?: BankAccount[];
  custodial_wallets?: CustodialWallet[];
}

export interface TradingStrategy {
  id: string;
  name: string;
  type: 'covered_calls' | 'straddle' | 'iron_condor' | 'wheel' | 'spot_grid' | 'futures_grid' | 'infinity_grid' | 'smart_rebalance' | 'dca' | 'orb' | 'long_call' | 'long_straddle' | 'long_condor' | 'iron_butterfly' | 'short_call' | 'short_straddle' | 'long_butterfly' | 'short_put' | 'short_strangle' | 'short_put_vertical' | 'option_collar' | 'short_call_vertical' | 'broken_wing_butterfly' | 'mean_reversion' | 'momentum_breakout' | 'pairs_trading' | 'scalping' | 'swing_trading' | 'arbitrage' | 'news_based_trading';
  description?: string;
  risk_level: 'low' | 'medium' | 'high';
  skill_level?: 'beginner' | 'moderate' | 'advanced';
  min_capital: number;
  is_active: boolean;

  // Universal Bot Fields
  account_id?: string; // Map to Alpaca / broker account
  asset_class?: 'equity' | 'options' | 'crypto' | 'futures' | 'forex';
  base_symbol?: string; // e.g., AAPL or BTC-USD; if options, base underlying symbol
  quote_currency?: string; // USD, USDT, etc.
  time_horizon?: 'intraday' | 'swing' | 'long_term';
  automation_level?: 'fully_auto' | 'semi_auto' | 'manual';

  capital_allocation?: {
    mode: 'fixed_amount_usd' | 'percent_of_portfolio';
    value: number; // USD amount or percentage
    max_positions?: number; // cap
    max_exposure_usd?: number; // cap
  };

  position_sizing?: {
    mode: 'fixed_units' | 'percent_equity' | 'volatility_target';
    value: number; // units, percentage, or target volatility
  };

  trade_window?: {
    enabled: boolean;
    start_time?: string; // "HH:MM"
    end_time?: string; // "HH:MM"
    days_of_week?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  };

  order_execution?: {
    order_type_default: 'market' | 'limit' | 'limit_if_touched';
    limit_tolerance_percent?: number; // how far from mid/ask acceptable
    allow_partial_fill: boolean;
    combo_execution: 'atomic' | 'legged'; // prefer atomic when broker supports combos
  };

  risk_controls?: {
    take_profit_percent?: number;
    take_profit_usd?: number;
    stop_loss_percent?: number;
    stop_loss_usd?: number;
    max_daily_loss_usd?: number;
    max_drawdown_percent?: number;
    pause_on_event_flags?: string[]; // e.g., ['earnings', 'FOMC']
  };

  data_filters?: {
    min_liquidity?: number; // volume / open interest
    max_bid_ask_spread_pct?: number;
    iv_rank_threshold?: number; // options
    min_open_interest?: number;
  };

  notifications?: {
    email_alerts: boolean;
    push_notifications: boolean;
    webhook_url?: string;
  };

  backtest_mode?: 'paper' | 'sim' | 'live';
  backtest_params?: {
    slippage?: number;
    commission?: number;
  };
  telemetry_id?: string;

  // Strategy-specific configuration (only parameters unique to the strategy type)
  configuration: Record<string, any>;

  performance?: {
    total_return: number;
    win_rate: number;
    max_drawdown: number;
    sharpe_ratio?: number;
    total_trades?: number;
    avg_trade_duration?: number;
    volatility?: number;
    standard_deviation?: number;
    beta?: number;
    alpha?: number;
    value_at_risk?: number;
  };
  
  // Enhanced spot grid configuration
  grid_mode?: 'arithmetic' | 'geometric';
  quantity_per_grid?: number;
  stop_loss_percent?: number;
  trailing_stop_loss_percent?: number;
  take_profit_levels?: Array<{
    percent: number;
    quantity_percent: number;
  }>;
  technical_indicators?: {
    rsi?: {
      enabled: boolean;
      period: number;
      buy_threshold: number;
      sell_threshold: number;
    };
    macd?: {
      enabled: boolean;
      period: number;
      additional_params: {
        fast_period: number;
        slow_period: number;
        signal_period: number;
      };
    };
    bollinger_bands?: {
      enabled: boolean;
      period: number;
      additional_params: {
        std_dev: number;
      };
    };
  };
  volume_threshold?: number;
  price_movement_threshold?: number;
  auto_start?: boolean;
  telemetry_data?: {
    allocated_capital_usd: number;
    allocated_capital_base: number;
    active_grid_levels: number;
    upper_price_limit: number;
    lower_price_limit: number;
    current_profit_loss_usd: number;
    current_profit_loss_percent: number;
    grid_spacing_interval: number;
    stop_loss_price?: number;
    stop_loss_distance_percent?: number;
    next_take_profit_price?: number;
    take_profit_progress_percent?: number;
    active_orders_count: number;
    fill_rate_percent: number;
    grid_utilization_percent: number;
    initial_buy_order_submitted?: boolean;
    last_updated: string;
  };
  last_execution?: string;
  execution_count?: number;
  total_profit_loss?: number;
  active_orders_count?: number;
  grid_utilization_percent?: number;
  
  created_at?: string;
  updated_at?: string;
}

export interface AssetAllocation {
  symbol: string;
  allocation: number;
}

export interface MarketCapData {
  symbol: string;
  market_cap: number;
  price: number;
  name?: string;
}

export interface Trade {
  id: string;
  strategy_id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: string;
  profit_loss: number;
  status: 'pending' | 'executed' | 'failed';
  order_type?: string;
  time_in_force?: string;
  filled_qty?: number;
  filled_avg_price?: number;
  commission?: number;
  fees?: number;
  alpaca_order_id?: string;
}

export interface OptionsChain {
  symbol: string;
  expiry: string;
  strike: number;
  call_bid: number;
  call_ask: number;
  put_bid: number;
  put_ask: number;
  implied_volatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}