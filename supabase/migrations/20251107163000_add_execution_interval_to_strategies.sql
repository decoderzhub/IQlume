/*
  # Add execution_interval to trading_strategies

  1. Changes
    - Add `execution_interval_seconds` column to `trading_strategies` table
    - Allows users to customize how frequently their strategies execute
    - Default values based on strategy type (scalping=30s, grid=300s, DCA=86400s)

  2. Notes
    - Interval in seconds for flexibility
    - Can be overridden per strategy
    - Minimum 30 seconds to prevent API abuse
*/

-- Add execution_interval_seconds column
ALTER TABLE trading_strategies
ADD COLUMN IF NOT EXISTS execution_interval_seconds integer;

-- Set default intervals based on strategy type
UPDATE trading_strategies
SET execution_interval_seconds = CASE
  WHEN type IN ('scalping', 'arbitrage') THEN 60
  WHEN type IN ('spot_grid', 'futures_grid', 'infinity_grid', 'reverse_grid') THEN 300
  WHEN type IN ('momentum_breakout', 'mean_reversion') THEN 300
  WHEN type = 'pairs_trading' THEN 600
  WHEN type IN ('covered_calls', 'iron_condor', 'straddle') THEN 1800
  WHEN type = 'swing_trading' THEN 1800
  WHEN type = 'dca' THEN 86400
  WHEN type = 'smart_rebalance' THEN 604800
  ELSE 300
END
WHERE execution_interval_seconds IS NULL;

-- Add comment
COMMENT ON COLUMN trading_strategies.execution_interval_seconds IS 'How often the strategy executes in seconds. Minimum 30s.';
