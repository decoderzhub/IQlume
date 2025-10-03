/*
  # Add Strategy Performance Tracking and USD Support

  1. Changes to trading_strategies table
    - Add currency field (default 'USD')
    - Add total_profit_loss field for quick access
    - Add last_execution timestamp
    - Add execution_count for tracking strategy runs
    
  2. New Tables
    - `strategy_performance_snapshots`
      - `id` (uuid, primary key)
      - `strategy_id` (uuid, foreign key to trading_strategies)
      - `user_id` (uuid, foreign key to auth.users)
      - `total_value` (numeric, total strategy value)
      - `profit_loss_usd` (numeric, profit/loss in USD)
      - `profit_loss_percent` (numeric, profit/loss percentage)
      - `grid_profit_usd` (numeric, profit from grid trades)
      - `holding_profit_usd` (numeric, profit from holdings)
      - `total_trades` (integer, number of executed trades)
      - `win_rate_percent` (numeric, percentage of winning trades)
      - `annualized_return_percent` (numeric, annualized return)
      - `snapshot_at` (timestamptz, when snapshot was taken)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on `strategy_performance_snapshots` table
    - Add policies for users to read their own performance data

  4. Indexes
    - Index on strategy_id and snapshot_at for time-series queries
    - Index on user_id for user-specific queries
*/

-- Add new columns to trading_strategies table
DO $$
BEGIN
  -- Add currency field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'currency'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN currency text DEFAULT 'USD';
  END IF;

  -- Add total_profit_loss field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'total_profit_loss'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN total_profit_loss numeric DEFAULT 0;
  END IF;

  -- Add last_execution field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'last_execution'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN last_execution timestamptz;
  END IF;

  -- Add execution_count field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'execution_count'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN execution_count integer DEFAULT 0;
  END IF;

  -- Add active_orders_count field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'active_orders_count'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN active_orders_count integer DEFAULT 0;
  END IF;

  -- Add grid_utilization_percent field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'grid_utilization_percent'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN grid_utilization_percent numeric DEFAULT 0;
  END IF;
END $$;

-- Create strategy_performance_snapshots table
CREATE TABLE IF NOT EXISTS strategy_performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES trading_strategies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_value numeric DEFAULT 0,
  profit_loss_usd numeric DEFAULT 0,
  profit_loss_percent numeric DEFAULT 0,
  grid_profit_usd numeric DEFAULT 0,
  holding_profit_usd numeric DEFAULT 0,
  total_trades integer DEFAULT 0,
  win_rate_percent numeric DEFAULT 0,
  annualized_return_percent numeric DEFAULT 0,
  snapshot_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE strategy_performance_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies for strategy_performance_snapshots
CREATE POLICY "Users can view their own performance snapshots"
  ON strategy_performance_snapshots
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance snapshots"
  ON strategy_performance_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_strategy_performance_snapshots_strategy_id 
  ON strategy_performance_snapshots(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_performance_snapshots_user_id 
  ON strategy_performance_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_performance_snapshots_snapshot_at 
  ON strategy_performance_snapshots(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategy_performance_snapshots_strategy_snapshot 
  ON strategy_performance_snapshots(strategy_id, snapshot_at DESC);

-- Function to calculate strategy performance from trades
CREATE OR REPLACE FUNCTION calculate_strategy_performance(p_strategy_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_total_profit numeric;
  v_total_trades integer;
  v_winning_trades integer;
  v_win_rate numeric;
BEGIN
  -- Calculate total profit/loss and trade counts
  SELECT 
    COALESCE(SUM(profit_loss), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE profit_loss > 0)
  INTO v_total_profit, v_total_trades, v_winning_trades
  FROM trades
  WHERE strategy_id = p_strategy_id AND status = 'executed';

  -- Calculate win rate
  IF v_total_trades > 0 THEN
    v_win_rate := (v_winning_trades::numeric / v_total_trades::numeric) * 100;
  ELSE
    v_win_rate := 0;
  END IF;

  -- Build result JSON
  v_result := jsonb_build_object(
    'total_profit_loss', v_total_profit,
    'total_trades', v_total_trades,
    'win_rate', v_win_rate
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to update strategy performance after trade
CREATE OR REPLACE FUNCTION update_strategy_performance_on_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_performance jsonb;
BEGIN
  -- Only update for executed trades
  IF NEW.status = 'executed' AND NEW.strategy_id IS NOT NULL THEN
    -- Calculate current performance
    v_performance := calculate_strategy_performance(NEW.strategy_id);
    
    -- Update trading_strategies table
    UPDATE trading_strategies
    SET 
      total_profit_loss = (v_performance->>'total_profit_loss')::numeric,
      last_execution = NEW.updated_at,
      execution_count = COALESCE(execution_count, 0) + 1,
      performance = jsonb_set(
        COALESCE(performance, '{}'::jsonb),
        '{total_trades}',
        to_jsonb((v_performance->>'total_trades')::integer)
      ),
      performance = jsonb_set(
        COALESCE(performance, '{}'::jsonb),
        '{win_rate}',
        to_jsonb((v_performance->>'win_rate')::numeric)
      ),
      performance = jsonb_set(
        COALESCE(performance, '{}'::jsonb),
        '{total_return}',
        to_jsonb((v_performance->>'total_profit_loss')::numeric)
      )
    WHERE id = NEW.strategy_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update strategy performance when trades are executed
DROP TRIGGER IF EXISTS update_strategy_performance_trigger ON trades;
CREATE TRIGGER update_strategy_performance_trigger
  AFTER INSERT OR UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_strategy_performance_on_trade();
