export interface User {
  id: string;
  email: string;
  subscription_tier: 'starter' | 'pro' | 'performance';
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
  day_change: number;
  day_change_percent: number;
  accounts: BrokerageAccount[];
  bank_accounts?: BankAccount[];
  custodial_wallets?: CustodialWallet[];
}

export interface TradingStrategy {
  id: string;
  name: string;
  type: 'covered_calls' | 'straddle' | 'iron_condor' | 'wheel' | 'spot_grid' | 'futures_grid' | 'infinity_grid' | 'smart_rebalance' | 'dca' | 'orb';
  type: 'covered_calls' | 'long_call' | 'long_straddle' | 'long_condor' | 'iron_butterfly' | 'short_call' | 'short_straddle' | 'iron_condor' | 'long_butterfly' | 'short_put' | 'short_strangle' | 'short_put_vertical' | 'option_collar' | 'wheel' | 'spot_grid' | 'futures_grid' | 'infinity_grid' | 'smart_rebalance' | 'dca' | 'orb' | 'short_call_vertical' | 'broken_wing_butterfly';
  description: string;
  risk_level: 'low' | 'medium' | 'high';
  min_capital: number;
  is_active: boolean;
  configuration: Record<string, any>;
  performance?: {
    total_return: number;
    win_rate: number;
    max_drawdown: number;
    sharpe_ratio?: number;
    total_trades?: number;
    avg_trade_duration?: number;
  };
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