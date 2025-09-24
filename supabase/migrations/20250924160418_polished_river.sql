/*
  # Enhanced Spot Grid Trading Bot Configuration

  1. Database Schema Updates
    - Add advanced grid configuration fields to trading_strategies table
    - Support for stop loss, take profit, technical indicators
    - Telemetry and performance tracking fields
    - Auto-start and autonomous operation settings

  2. New Configuration Fields
    - Grid mode (arithmetic/geometric)
    - Quantity per grid level
    - Stop loss and trailing stop loss
    - Multiple take profit levels
    - Technical indicator settings
    - Volume and price movement thresholds
    - Auto-start capabilities

  3. Telemetry and Monitoring
    - Real-time performance metrics
    - Grid utilization tracking
    - Order execution statistics
    - Risk management status
*/

-- Add enhanced grid configuration fields to trading_strategies table
DO $$
BEGIN
  -- Grid configuration enhancements
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'grid_mode'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN grid_mode text DEFAULT 'arithmetic';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'quantity_per_grid'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN quantity_per_grid numeric DEFAULT 0;
  END IF;

  -- Stop loss configuration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'stop_loss_percent'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN stop_loss_percent numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'trailing_stop_loss_percent'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN trailing_stop_loss_percent numeric DEFAULT 0;
  END IF;

  -- Take profit configuration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'take_profit_levels'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN take_profit_levels jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Technical indicators
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'technical_indicators'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN technical_indicators jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Execution triggers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'volume_threshold'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN volume_threshold numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'price_movement_threshold'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN price_movement_threshold numeric DEFAULT 0;
  END IF;

  -- Automation settings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'auto_start'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN auto_start boolean DEFAULT false;
  END IF;

  -- Telemetry and monitoring
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'telemetry_data'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN telemetry_data jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'last_execution'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN last_execution timestamp with time zone DEFAULT null;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'execution_count'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN execution_count integer DEFAULT 0;
  END IF;

  -- Performance tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'total_profit_loss'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN total_profit_loss numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'active_orders_count'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN active_orders_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_strategies' AND column_name = 'grid_utilization_percent'
  ) THEN
    ALTER TABLE trading_strategies ADD COLUMN grid_utilization_percent numeric DEFAULT 0;
  END IF;
END $$;

-- Add constraints for new fields
DO $$
BEGIN
  -- Grid mode constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'trading_strategies' AND constraint_name = 'trading_strategies_grid_mode_check'
  ) THEN
    ALTER TABLE trading_strategies ADD CONSTRAINT trading_strategies_grid_mode_check 
    CHECK (grid_mode IN ('arithmetic', 'geometric'));
  END IF;

  -- Stop loss constraints
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'trading_strategies' AND constraint_name = 'trading_strategies_stop_loss_percent_check'
  ) THEN
    ALTER TABLE trading_strategies ADD CONSTRAINT trading_strategies_stop_loss_percent_check 
    CHECK (stop_loss_percent >= 0 AND stop_loss_percent <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'trading_strategies' AND constraint_name = 'trading_strategies_trailing_stop_loss_percent_check'
  ) THEN
    ALTER TABLE trading_strategies ADD CONSTRAINT trading_strategies_trailing_stop_loss_percent_check 
    CHECK (trailing_stop_loss_percent >= 0 AND trailing_stop_loss_percent <= 100);
  END IF;

  -- Quantity and threshold constraints
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'trading_strategies' AND constraint_name = 'trading_strategies_quantity_per_grid_check'
  ) THEN
    ALTER TABLE trading_strategies ADD CONSTRAINT trading_strategies_quantity_per_grid_check 
    CHECK (quantity_per_grid >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'trading_strategies' AND constraint_name = 'trading_strategies_volume_threshold_check'
  ) THEN
    ALTER TABLE trading_strategies ADD CONSTRAINT trading_strategies_volume_threshold_check 
    CHECK (volume_threshold >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'trading_strategies' AND constraint_name = 'trading_strategies_price_movement_threshold_check'
  ) THEN
    ALTER TABLE trading_strategies ADD CONSTRAINT trading_strategies_price_movement_threshold_check 
    CHECK (price_movement_threshold >= 0);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trading_strategies_auto_start ON trading_strategies(auto_start);
CREATE INDEX IF NOT EXISTS idx_trading_strategies_last_execution ON trading_strategies(last_execution);
CREATE INDEX IF NOT EXISTS idx_trading_strategies_grid_mode ON trading_strategies(grid_mode);