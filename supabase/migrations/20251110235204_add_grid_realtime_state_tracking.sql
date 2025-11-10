/*
  # Grid Real-Time State Tracking

  1. Schema Changes
    - Add `grid_level_states` JSONB column to `grid_orders` table
      - Tracks which grid levels have active positions
      - Format: { "level_0": {"has_position": true, "last_buy_price": 95000, "quantity": 0.001}, ... }
    
    - Add `last_triggered_at` timestamptz to track when level last executed
    - Add `trigger_price` numeric to record exact price that triggered the trade
    - Add `is_realtime_mode` boolean to `trading_strategies` for execution interval = 0

  2. Purpose
    - Enable event-driven trading based on WebSocket price streams
    - Prevent infinite loops by tracking grid level fill states
    - Support "trade once per trigger" logic
    - Reset level state after opposite side completes

  3. Notes
    - Grid level states stored as JSONB for flexible querying
    - Real-time mode strategies (interval=0) use WebSocket triggers
    - Non-real-time strategies continue using scheduled execution
*/

-- Add grid level state tracking to grid_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grid_orders' AND column_name = 'last_triggered_at'
  ) THEN
    ALTER TABLE grid_orders 
    ADD COLUMN last_triggered_at timestamptz,
    ADD COLUMN trigger_price numeric CHECK (trigger_price >= 0);
    
    COMMENT ON COLUMN grid_orders.last_triggered_at IS 'Timestamp when this grid level was last triggered by price action';
    COMMENT ON COLUMN grid_orders.trigger_price IS 'Exact market price that triggered this order';
  END IF;
END $$;

-- Add real-time mode flag to trading_strategies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'is_realtime_mode'
  ) THEN
    ALTER TABLE trading_strategies 
    ADD COLUMN is_realtime_mode boolean DEFAULT false;
    
    COMMENT ON COLUMN trading_strategies.is_realtime_mode IS 'True when execution_interval=0, enables WebSocket-driven real-time execution';
  END IF;
END $$;

-- Create grid_level_states table for centralized state tracking
CREATE TABLE IF NOT EXISTS grid_level_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES trading_strategies(id) ON DELETE CASCADE,
  grid_level integer NOT NULL,
  has_position boolean DEFAULT false,
  last_buy_price numeric,
  last_sell_price numeric,
  position_quantity numeric DEFAULT 0 CHECK (position_quantity >= 0),
  buy_order_id uuid REFERENCES grid_orders(id) ON DELETE SET NULL,
  sell_order_id uuid REFERENCES grid_orders(id) ON DELETE SET NULL,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(strategy_id, grid_level)
);

-- Enable RLS
ALTER TABLE grid_level_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own grid level states"
  ON grid_level_states
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_strategies
      WHERE trading_strategies.id = grid_level_states.strategy_id
      AND trading_strategies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own grid level states"
  ON grid_level_states
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_strategies
      WHERE trading_strategies.id = grid_level_states.strategy_id
      AND trading_strategies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own grid level states"
  ON grid_level_states
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_strategies
      WHERE trading_strategies.id = grid_level_states.strategy_id
      AND trading_strategies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_strategies
      WHERE trading_strategies.id = grid_level_states.strategy_id
      AND trading_strategies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own grid level states"
  ON grid_level_states
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_strategies
      WHERE trading_strategies.id = grid_level_states.strategy_id
      AND trading_strategies.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_grid_level_states_strategy ON grid_level_states(strategy_id);
CREATE INDEX IF NOT EXISTS idx_grid_level_states_level ON grid_level_states(strategy_id, grid_level);
CREATE INDEX IF NOT EXISTS idx_grid_level_states_position ON grid_level_states(strategy_id, has_position);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_grid_level_states_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_grid_level_states_timestamp
  BEFORE UPDATE ON grid_level_states
  FOR EACH ROW
  EXECUTE FUNCTION update_grid_level_states_timestamp();

-- Add comment
COMMENT ON TABLE grid_level_states IS 'Tracks state of each grid level for real-time event-driven trading';
