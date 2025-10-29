/*
  # Add Comprehensive Take Profit and Stop Loss Configuration

  ## Overview
  This migration adds comprehensive support for configurable take profit and stop loss functionality
  across all trading strategies, positions, and order management.

  ## New Tables

  ### 1. exit_events
  Tracks all position exit events including take profit, stop loss, and manual exits
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `position_id` (uuid, references bot_positions)
  - `strategy_id` (uuid, references trading_strategies)
  - `exit_type` (text) - 'take_profit', 'stop_loss', 'manual', 'timeout', 'risk_limit'
  - `exit_price` (numeric)
  - `exit_quantity` (numeric)
  - `exit_reason` (text)
  - `profit_loss` (numeric)
  - `profit_loss_percent` (numeric)
  - `executed_at` (timestamptz)
  - `alpaca_order_id` (text)

  ### 2. exit_performance_metrics
  Stores analytics on exit strategy effectiveness
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `strategy_id` (uuid, references trading_strategies)
  - `total_take_profit_hits` (integer)
  - `total_stop_loss_hits` (integer)
  - `total_manual_exits` (integer)
  - `avg_take_profit_percent` (numeric)
  - `avg_stop_loss_percent` (numeric)
  - `avg_holding_period_hours` (numeric)
  - `total_exits` (integer)
  - `win_rate` (numeric)
  - `calculated_at` (timestamptz)

  ## Schema Changes

  ### trading_strategies table enhancements
  - Add `stop_loss_type` column for different stop types
  - Add `trailing_stop_distance_percent` for trailing stops
  - Add `breakeven_trigger_percent` for breakeven stop activation
  - Add `time_based_exit_hours` for maximum holding period

  ### bot_positions table enhancements
  - Add `take_profit_price` for target exit price
  - Add `stop_loss_price` for stop exit price
  - Add `trailing_stop_price` for current trailing stop level
  - Add `highest_price_reached` for trailing stop calculation
  - Add `lowest_price_reached` for reverse positions
  - Add `breakeven_stop_active` boolean flag
  - Add `exit_type` to track how position was closed
  - Add `exit_reason` for detailed exit explanation

  ## Security
  - Enable RLS on all new tables
  - Add policies for authenticated users to access their own data
  - Ensure data isolation between users
*/

-- Create exit_events table for tracking all position exits
CREATE TABLE IF NOT EXISTS exit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  position_id uuid REFERENCES bot_positions(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES trading_strategies(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  exit_type text NOT NULL CHECK (exit_type IN ('take_profit', 'stop_loss', 'trailing_stop', 'manual', 'timeout', 'risk_limit', 'portfolio_stop', 'breakeven')),
  exit_price numeric NOT NULL,
  entry_price numeric NOT NULL,
  exit_quantity numeric NOT NULL,
  exit_reason text,
  profit_loss numeric NOT NULL DEFAULT 0,
  profit_loss_percent numeric NOT NULL DEFAULT 0,
  executed_at timestamptz NOT NULL DEFAULT now(),
  alpaca_order_id text,
  created_at timestamptz DEFAULT now()
);

-- Create exit_performance_metrics table
CREATE TABLE IF NOT EXISTS exit_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  strategy_id uuid REFERENCES trading_strategies(id) ON DELETE CASCADE,
  total_take_profit_hits integer DEFAULT 0,
  total_stop_loss_hits integer DEFAULT 0,
  total_trailing_stop_hits integer DEFAULT 0,
  total_manual_exits integer DEFAULT 0,
  total_timeout_exits integer DEFAULT 0,
  avg_take_profit_percent numeric DEFAULT 0,
  avg_stop_loss_percent numeric DEFAULT 0,
  avg_holding_period_hours numeric DEFAULT 0,
  total_exits integer DEFAULT 0,
  win_rate numeric DEFAULT 0,
  total_profit numeric DEFAULT 0,
  total_loss numeric DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, strategy_id)
);

-- Add TP/SL columns to trading_strategies table
DO $$
BEGIN
  -- Stop loss type configuration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_strategies' AND column_name = 'stop_loss_type'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN stop_loss_type text DEFAULT 'fixed' CHECK (stop_loss_type IN ('fixed', 'trailing', 'atr_based', 'volatility_adjusted', 'time_adjusted'));
  END IF;

  -- Trailing stop distance
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_strategies' AND column_name = 'trailing_stop_distance_percent'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN trailing_stop_distance_percent numeric DEFAULT 0;
  END IF;

  -- Breakeven stop trigger
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_strategies' AND column_name = 'breakeven_trigger_percent'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN breakeven_trigger_percent numeric DEFAULT 0;
  END IF;

  -- Time-based exit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_strategies' AND column_name = 'time_based_exit_hours'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN time_based_exit_hours numeric DEFAULT 0;
  END IF;

  -- ATR-based stop multiplier
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_strategies' AND column_name = 'atr_stop_multiplier'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN atr_stop_multiplier numeric DEFAULT 2.0;
  END IF;

  -- Partial exit enabled flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trading_strategies' AND column_name = 'partial_exit_enabled'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN partial_exit_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add TP/SL columns to bot_positions table
DO $$
BEGIN
  -- Take profit price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bot_positions' AND column_name = 'take_profit_price'
  ) THEN
    ALTER TABLE bot_positions ADD COLUMN take_profit_price numeric;
  END IF;

  -- Stop loss price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bot_positions' AND column_name = 'stop_loss_price'
  ) THEN
    ALTER TABLE bot_positions ADD COLUMN stop_loss_price numeric;
  END IF;

  -- Trailing stop price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bot_positions' AND column_name = 'trailing_stop_price'
  ) THEN
    ALTER TABLE bot_positions ADD COLUMN trailing_stop_price numeric;
  END IF;

  -- Highest price reached
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bot_positions' AND column_name = 'highest_price_reached'
  ) THEN
    ALTER TABLE bot_positions ADD COLUMN highest_price_reached numeric;
  END IF;

  -- Lowest price reached
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bot_positions' AND column_name = 'lowest_price_reached'
  ) THEN
    ALTER TABLE bot_positions ADD COLUMN lowest_price_reached numeric;
  END IF;

  -- Breakeven stop active flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bot_positions' AND column_name = 'breakeven_stop_active'
  ) THEN
    ALTER TABLE bot_positions ADD COLUMN breakeven_stop_active boolean DEFAULT false;
  END IF;

  -- Exit type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bot_positions' AND column_name = 'exit_type'
  ) THEN
    ALTER TABLE bot_positions ADD COLUMN exit_type text;
  END IF;

  -- Exit reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bot_positions' AND column_name = 'exit_reason'
  ) THEN
    ALTER TABLE bot_positions ADD COLUMN exit_reason text;
  END IF;

  -- Exit order ID for tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bot_positions' AND column_name = 'exit_alpaca_order_id'
  ) THEN
    ALTER TABLE bot_positions ADD COLUMN exit_alpaca_order_id text;
  END IF;

  -- Multiple take profit levels as JSONB array
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bot_positions' AND column_name = 'take_profit_levels'
  ) THEN
    ALTER TABLE bot_positions ADD COLUMN take_profit_levels jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exit_events_user_id ON exit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_exit_events_strategy_id ON exit_events(strategy_id);
CREATE INDEX IF NOT EXISTS idx_exit_events_position_id ON exit_events(position_id);
CREATE INDEX IF NOT EXISTS idx_exit_events_executed_at ON exit_events(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_exit_events_exit_type ON exit_events(exit_type);

CREATE INDEX IF NOT EXISTS idx_exit_performance_user_id ON exit_performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_exit_performance_strategy_id ON exit_performance_metrics(strategy_id);

CREATE INDEX IF NOT EXISTS idx_bot_positions_tp_sl ON bot_positions(take_profit_price, stop_loss_price) WHERE is_closed = false;
CREATE INDEX IF NOT EXISTS idx_bot_positions_open_with_exits ON bot_positions(user_id, is_closed) WHERE take_profit_price IS NOT NULL OR stop_loss_price IS NOT NULL;

-- Enable RLS
ALTER TABLE exit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exit_events
CREATE POLICY "Users can view own exit events"
  ON exit_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exit events"
  ON exit_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for exit_performance_metrics
CREATE POLICY "Users can view own exit performance"
  ON exit_performance_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exit performance"
  ON exit_performance_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exit performance"
  ON exit_performance_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update exit performance metrics
CREATE OR REPLACE FUNCTION update_exit_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update performance metrics when new exit event is created
  INSERT INTO exit_performance_metrics (
    user_id,
    strategy_id,
    total_take_profit_hits,
    total_stop_loss_hits,
    total_trailing_stop_hits,
    total_manual_exits,
    total_timeout_exits,
    total_exits,
    win_rate,
    total_profit,
    total_loss,
    calculated_at
  )
  SELECT
    NEW.user_id,
    NEW.strategy_id,
    COUNT(*) FILTER (WHERE exit_type = 'take_profit'),
    COUNT(*) FILTER (WHERE exit_type = 'stop_loss'),
    COUNT(*) FILTER (WHERE exit_type = 'trailing_stop'),
    COUNT(*) FILTER (WHERE exit_type = 'manual'),
    COUNT(*) FILTER (WHERE exit_type = 'timeout'),
    COUNT(*),
    (COUNT(*) FILTER (WHERE profit_loss > 0)::numeric / NULLIF(COUNT(*), 0) * 100),
    SUM(CASE WHEN profit_loss > 0 THEN profit_loss ELSE 0 END),
    SUM(CASE WHEN profit_loss < 0 THEN ABS(profit_loss) ELSE 0 END),
    now()
  FROM exit_events
  WHERE user_id = NEW.user_id AND strategy_id = NEW.strategy_id
  ON CONFLICT (user_id, strategy_id)
  DO UPDATE SET
    total_take_profit_hits = EXCLUDED.total_take_profit_hits,
    total_stop_loss_hits = EXCLUDED.total_stop_loss_hits,
    total_trailing_stop_hits = EXCLUDED.total_trailing_stop_hits,
    total_manual_exits = EXCLUDED.total_manual_exits,
    total_timeout_exits = EXCLUDED.total_timeout_exits,
    total_exits = EXCLUDED.total_exits,
    win_rate = EXCLUDED.win_rate,
    total_profit = EXCLUDED.total_profit,
    total_loss = EXCLUDED.total_loss,
    calculated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic metrics update
DROP TRIGGER IF EXISTS trigger_update_exit_performance ON exit_events;
CREATE TRIGGER trigger_update_exit_performance
  AFTER INSERT ON exit_events
  FOR EACH ROW
  EXECUTE FUNCTION update_exit_performance_metrics();

-- Add comments for documentation
COMMENT ON TABLE exit_events IS 'Tracks all position exit events including take profit, stop loss, and manual exits';
COMMENT ON TABLE exit_performance_metrics IS 'Aggregated performance metrics for exit strategies';
COMMENT ON COLUMN trading_strategies.stop_loss_type IS 'Type of stop loss: fixed, trailing, atr_based, volatility_adjusted, time_adjusted';
COMMENT ON COLUMN trading_strategies.trailing_stop_distance_percent IS 'Distance from peak for trailing stop in percent';
COMMENT ON COLUMN trading_strategies.breakeven_trigger_percent IS 'Profit percent at which stop moves to breakeven';
COMMENT ON COLUMN bot_positions.take_profit_levels IS 'Array of take profit levels with price, quantity_percent, and status';
