/*
  # Bot Infrastructure - Execution State, Positions, and Performance Tracking

  ## New Tables
  
  ### 1. `bot_execution_state`
  - Tracks real-time execution state for each active bot
  - Stores current grid levels, active orders, and execution metadata
  - Links to `trading_strategies` table
  
  ### 2. `bot_positions`
  - Tracks current open positions for each bot
  - Records entry price, quantity, current P&L
  - Supports multiple positions per strategy (for grid bots)
  
  ### 3. `bot_performance_history`
  - Time-series data for bot performance tracking
  - Daily snapshots of P&L, win rate, and other metrics
  - Enables historical performance charts
  
  ### 4. `bot_orders`
  - Tracks all orders placed by bots
  - Links to `trades` table when orders are filled
  - Stores order parameters and status updates
  
  ### 5. `bot_risk_events`
  - Logs risk management events (stop-loss triggers, margin calls, etc.)
  - Audit trail for risk control actions
  
  ## Security
  - Enable RLS on all new tables
  - Policies ensure users can only access their own bot data
*/

-- Bot execution state table
CREATE TABLE IF NOT EXISTS bot_execution_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES trading_strategies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Execution state
  state jsonb DEFAULT '{}'::jsonb NOT NULL,
  current_phase text,
  
  -- Grid trading specific
  active_grid_levels jsonb DEFAULT '[]'::jsonb,
  filled_grid_levels jsonb DEFAULT '[]'::jsonb,
  
  -- Position tracking
  current_position_size numeric DEFAULT 0,
  avg_entry_price numeric DEFAULT 0,
  unrealized_pnl numeric DEFAULT 0,
  
  -- Execution metadata
  last_action text,
  last_action_timestamp timestamptz,
  next_scheduled_action timestamptz,
  
  -- Error tracking
  last_error text,
  error_count integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bot positions table
CREATE TABLE IF NOT EXISTS bot_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES trading_strategies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Position details
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('long', 'short')),
  quantity numeric NOT NULL CHECK (quantity > 0),
  entry_price numeric NOT NULL CHECK (entry_price > 0),
  current_price numeric DEFAULT 0,
  
  -- P&L tracking
  unrealized_pnl numeric DEFAULT 0,
  unrealized_pnl_percent numeric DEFAULT 0,
  realized_pnl numeric DEFAULT 0,
  
  -- Position metadata
  position_type text CHECK (position_type IN ('stock', 'option', 'crypto', 'futures')),
  entry_timestamp timestamptz DEFAULT now(),
  
  -- Grid-specific fields
  grid_level integer,
  is_grid_position boolean DEFAULT false,
  
  -- Options-specific fields
  option_type text CHECK (option_type IN ('call', 'put', NULL)),
  strike_price numeric,
  expiration_date date,
  
  -- Status
  is_closed boolean DEFAULT false,
  close_price numeric,
  close_timestamp timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bot performance history table
CREATE TABLE IF NOT EXISTS bot_performance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES trading_strategies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Time period
  snapshot_date date NOT NULL,
  snapshot_timestamp timestamptz DEFAULT now(),
  
  -- Performance metrics
  total_pnl numeric DEFAULT 0,
  daily_pnl numeric DEFAULT 0,
  win_rate numeric DEFAULT 0 CHECK (win_rate >= 0 AND win_rate <= 100),
  total_trades integer DEFAULT 0,
  winning_trades integer DEFAULT 0,
  losing_trades integer DEFAULT 0,
  
  -- Advanced metrics
  sharpe_ratio numeric,
  sortino_ratio numeric,
  max_drawdown numeric DEFAULT 0,
  max_drawdown_percent numeric DEFAULT 0,
  
  -- Portfolio value
  portfolio_value numeric DEFAULT 0,
  capital_deployed numeric DEFAULT 0,
  
  -- Strategy-specific metrics
  custom_metrics jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  
  -- Ensure one snapshot per strategy per day
  UNIQUE(strategy_id, snapshot_date)
);

-- Bot orders table
CREATE TABLE IF NOT EXISTS bot_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES trading_strategies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id uuid REFERENCES trades(id) ON DELETE SET NULL,
  
  -- Order details
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity numeric NOT NULL CHECK (quantity > 0),
  order_type text NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
  
  -- Pricing
  limit_price numeric,
  stop_price numeric,
  filled_price numeric,
  
  -- Status
  status text NOT NULL CHECK (status IN ('pending', 'submitted', 'filled', 'partial', 'canceled', 'rejected', 'expired')),
  filled_quantity numeric DEFAULT 0,
  
  -- Order metadata
  broker_order_id text,
  time_in_force text DEFAULT 'day' CHECK (time_in_force IN ('day', 'gtc', 'ioc', 'fok')),
  
  -- Grid-specific
  grid_level integer,
  is_grid_order boolean DEFAULT false,
  
  -- Execution tracking
  submitted_at timestamptz,
  filled_at timestamptz,
  canceled_at timestamptz,
  
  -- Error handling
  rejection_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bot risk events table
CREATE TABLE IF NOT EXISTS bot_risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES trading_strategies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event details
  event_type text NOT NULL CHECK (event_type IN (
    'stop_loss_triggered',
    'take_profit_hit',
    'margin_call',
    'max_loss_reached',
    'position_size_exceeded',
    'volatility_threshold_hit',
    'liquidity_warning',
    'execution_failure',
    'emergency_shutdown'
  )),
  
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- Event context
  event_data jsonb DEFAULT '{}'::jsonb,
  action_taken text,
  
  -- Related entities
  position_id uuid REFERENCES bot_positions(id) ON DELETE SET NULL,
  order_id uuid REFERENCES bot_orders(id) ON DELETE SET NULL,
  
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bot_execution_state_strategy ON bot_execution_state(strategy_id);
CREATE INDEX IF NOT EXISTS idx_bot_execution_state_user ON bot_execution_state(user_id);

CREATE INDEX IF NOT EXISTS idx_bot_positions_strategy ON bot_positions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_bot_positions_user ON bot_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_positions_symbol ON bot_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_bot_positions_is_closed ON bot_positions(is_closed);

CREATE INDEX IF NOT EXISTS idx_bot_performance_history_strategy ON bot_performance_history(strategy_id);
CREATE INDEX IF NOT EXISTS idx_bot_performance_history_date ON bot_performance_history(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_bot_orders_strategy ON bot_orders(strategy_id);
CREATE INDEX IF NOT EXISTS idx_bot_orders_user ON bot_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_orders_status ON bot_orders(status);
CREATE INDEX IF NOT EXISTS idx_bot_orders_created ON bot_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bot_risk_events_strategy ON bot_risk_events(strategy_id);
CREATE INDEX IF NOT EXISTS idx_bot_risk_events_user ON bot_risk_events(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_risk_events_severity ON bot_risk_events(severity);
CREATE INDEX IF NOT EXISTS idx_bot_risk_events_created ON bot_risk_events(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE bot_execution_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_performance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_risk_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bot_execution_state
CREATE POLICY "Users can view own bot execution state"
  ON bot_execution_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot execution state"
  ON bot_execution_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot execution state"
  ON bot_execution_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bot execution state"
  ON bot_execution_state FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for bot_positions
CREATE POLICY "Users can view own bot positions"
  ON bot_positions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot positions"
  ON bot_positions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot positions"
  ON bot_positions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bot positions"
  ON bot_positions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for bot_performance_history
CREATE POLICY "Users can view own bot performance history"
  ON bot_performance_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot performance history"
  ON bot_performance_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for bot_orders
CREATE POLICY "Users can view own bot orders"
  ON bot_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot orders"
  ON bot_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot orders"
  ON bot_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bot orders"
  ON bot_orders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for bot_risk_events
CREATE POLICY "Users can view own bot risk events"
  ON bot_risk_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot risk events"
  ON bot_risk_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot risk events"
  ON bot_risk_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
