/*
  # Update Trading Strategies Schema for Production

  ## Overview
  Updates the trading_strategies table to support:
  - All strategy types from the platform (30+ strategies)
  - Universal bot fields for flexible configuration
  - Enhanced tracking and telemetry
  - Risk management fields

  ## Changes

  ### 1. Expand strategy_type enum
  Add all supported strategy types including options, grid bots, and algorithmic strategies

  ### 2. Add Universal Bot Fields
  - account_id: Link to brokerage account
  - asset_class: equity, options, crypto, futures, forex
  - base_symbol: Primary symbol for the strategy
  - quote_currency: USD, USDT, etc.
  - time_horizon: intraday, swing, long_term
  - automation_level: fully_auto, semi_auto, manual

  ### 3. Add Configuration Fields
  - capital_allocation: JSONB for flexible allocation rules
  - position_sizing: JSONB for position sizing logic
  - trade_window: JSONB for time-based restrictions
  - order_execution: JSONB for order execution preferences
  - risk_controls: JSONB for stop-loss, take-profit, etc.
  - data_filters: JSONB for liquidity and quality filters
  - notifications: JSONB for alert preferences
  - backtest_mode: paper, sim, live
  - backtest_params: JSONB for backtest configuration

  ### 4. Add Enhanced Grid Strategy Fields
  - grid_mode: arithmetic or geometric
  - quantity_per_grid: Fixed quantity per level
  - technical_indicators: JSONB for RSI, MACD, etc.
  - volume_threshold: Minimum volume requirements
  - telemetry_data: Real-time strategy metrics

  ## Security
  All changes maintain existing RLS policies
*/

-- First, drop the existing strategy_type enum constraint if it exists as a check
-- We'll recreate it as a text field to support all strategy types dynamically
DO $$
BEGIN
  -- Drop the old type constraint if it exists
  ALTER TABLE trading_strategies DROP CONSTRAINT IF EXISTS trading_strategies_type_check;
  
  -- Change type column to text if it's not already
  ALTER TABLE trading_strategies ALTER COLUMN type TYPE text;
EXCEPTION
  WHEN others THEN
    -- Column might already be text, continue
    NULL;
END $$;

-- Add new columns to trading_strategies table if they don't exist
DO $$
BEGIN
  -- Universal Bot Fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'account_id') THEN
    ALTER TABLE trading_strategies ADD COLUMN account_id uuid REFERENCES brokerage_accounts(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'asset_class') THEN
    ALTER TABLE trading_strategies ADD COLUMN asset_class text DEFAULT 'equity' CHECK (asset_class IN ('equity', 'options', 'crypto', 'futures', 'forex'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'base_symbol') THEN
    ALTER TABLE trading_strategies ADD COLUMN base_symbol text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'quote_currency') THEN
    ALTER TABLE trading_strategies ADD COLUMN quote_currency text DEFAULT 'USD';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'time_horizon') THEN
    ALTER TABLE trading_strategies ADD COLUMN time_horizon text DEFAULT 'swing' CHECK (time_horizon IN ('intraday', 'swing', 'long_term'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'automation_level') THEN
    ALTER TABLE trading_strategies ADD COLUMN automation_level text DEFAULT 'fully_auto' CHECK (automation_level IN ('fully_auto', 'semi_auto', 'manual'));
  END IF;

  -- Configuration JSONB Fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'capital_allocation') THEN
    ALTER TABLE trading_strategies ADD COLUMN capital_allocation jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'position_sizing') THEN
    ALTER TABLE trading_strategies ADD COLUMN position_sizing jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'trade_window') THEN
    ALTER TABLE trading_strategies ADD COLUMN trade_window jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'order_execution') THEN
    ALTER TABLE trading_strategies ADD COLUMN order_execution jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'risk_controls') THEN
    ALTER TABLE trading_strategies ADD COLUMN risk_controls jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'data_filters') THEN
    ALTER TABLE trading_strategies ADD COLUMN data_filters jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'notifications') THEN
    ALTER TABLE trading_strategies ADD COLUMN notifications jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'backtest_mode') THEN
    ALTER TABLE trading_strategies ADD COLUMN backtest_mode text DEFAULT 'paper' CHECK (backtest_mode IN ('paper', 'sim', 'live'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'backtest_params') THEN
    ALTER TABLE trading_strategies ADD COLUMN backtest_params jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Grid Strategy Specific Fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'grid_mode') THEN
    ALTER TABLE trading_strategies ADD COLUMN grid_mode text CHECK (grid_mode IN ('arithmetic', 'geometric'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'quantity_per_grid') THEN
    ALTER TABLE trading_strategies ADD COLUMN quantity_per_grid numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'stop_loss_percent') THEN
    ALTER TABLE trading_strategies ADD COLUMN stop_loss_percent numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'trailing_stop_loss_percent') THEN
    ALTER TABLE trading_strategies ADD COLUMN trailing_stop_loss_percent numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'take_profit_levels') THEN
    ALTER TABLE trading_strategies ADD COLUMN take_profit_levels jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'technical_indicators') THEN
    ALTER TABLE trading_strategies ADD COLUMN technical_indicators jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'volume_threshold') THEN
    ALTER TABLE trading_strategies ADD COLUMN volume_threshold numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'price_movement_threshold') THEN
    ALTER TABLE trading_strategies ADD COLUMN price_movement_threshold numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'auto_start') THEN
    ALTER TABLE trading_strategies ADD COLUMN auto_start boolean DEFAULT false;
  END IF;

  -- Telemetry and Real-time Tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'telemetry_id') THEN
    ALTER TABLE trading_strategies ADD COLUMN telemetry_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'telemetry_data') THEN
    ALTER TABLE trading_strategies ADD COLUMN telemetry_data jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Skill level for strategy recommendations
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'skill_level') THEN
    ALTER TABLE trading_strategies ADD COLUMN skill_level text CHECK (skill_level IN ('beginner', 'moderate', 'advanced'));
  END IF;

  -- Risk score from backtesting
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'risk_score') THEN
    ALTER TABLE trading_strategies ADD COLUMN risk_score numeric CHECK (risk_score >= 0 AND risk_score <= 100);
  END IF;

  -- Link to latest backtest
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_strategies' AND column_name = 'latest_backtest_id') THEN
    ALTER TABLE trading_strategies ADD COLUMN latest_backtest_id uuid REFERENCES backtests(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index on account_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_trading_strategies_account_id ON trading_strategies(account_id);
CREATE INDEX IF NOT EXISTS idx_trading_strategies_base_symbol ON trading_strategies(base_symbol);
CREATE INDEX IF NOT EXISTS idx_trading_strategies_asset_class ON trading_strategies(asset_class);
CREATE INDEX IF NOT EXISTS idx_trading_strategies_risk_score ON trading_strategies(risk_score);

-- Add a constraint to ensure strategy type is one of the supported types
ALTER TABLE trading_strategies ADD CONSTRAINT trading_strategies_type_valid CHECK (
  type IN (
    -- Options Strategies
    'covered_calls', 'wheel', 'short_put', 'iron_condor', 'straddle', 'long_call',
    'long_straddle', 'long_condor', 'iron_butterfly', 'short_call', 'short_straddle',
    'long_butterfly', 'short_strangle', 'short_put_vertical', 'option_collar',
    'short_call_vertical', 'broken_wing_butterfly', 'long_strangle',
    -- Grid Bots
    'spot_grid', 'futures_grid', 'infinity_grid', 'reverse_grid',
    -- Autonomous Bots
    'dca', 'smart_rebalance',
    -- Algorithmic Trading
    'mean_reversion', 'momentum_breakout', 'pairs_trading', 'scalping',
    'swing_trading', 'arbitrage', 'news_based_trading', 'orb'
  )
);

-- Create a view for strategy performance summary
CREATE OR REPLACE VIEW strategy_performance_summary AS
SELECT 
  ts.id,
  ts.user_id,
  ts.name,
  ts.type,
  ts.risk_level,
  ts.risk_score,
  ts.is_active,
  ts.base_symbol,
  ts.asset_class,
  ts.total_profit_loss,
  ts.execution_count,
  ts.last_execution,
  ts.active_orders_count,
  ts.grid_utilization_percent,
  ts.performance,
  -- Latest backtest metrics
  b.total_return_percent as backtest_return,
  b.max_drawdown_percent as backtest_max_drawdown,
  b.sharpe_ratio as backtest_sharpe_ratio,
  b.win_rate as backtest_win_rate,
  -- Open positions count
  (SELECT COUNT(*) FROM bot_positions WHERE strategy_id = ts.id AND is_closed = false) as open_positions_count,
  -- Total unrealized P&L
  (SELECT COALESCE(SUM(unrealized_pnl), 0) FROM bot_positions WHERE strategy_id = ts.id AND is_closed = false) as total_unrealized_pnl,
  ts.created_at,
  ts.updated_at
FROM trading_strategies ts
LEFT JOIN backtests b ON b.id = ts.latest_backtest_id;

-- Grant access to the view
GRANT SELECT ON strategy_performance_summary TO authenticated;

-- Add comment explaining the new structure
COMMENT ON TABLE trading_strategies IS 'Core strategy configuration table supporting 30+ strategy types with universal bot fields, flexible JSONB configuration, and real-time telemetry tracking';
