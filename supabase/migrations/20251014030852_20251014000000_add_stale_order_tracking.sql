/*
  # Add Stale Order Tracking to Grid Orders

  1. Purpose
    - Reduce order_fill_monitor log spam by tracking which orders have been checked
    - Implement intelligent filtering to avoid repeatedly checking old/invalid orders
    - Improve query performance with proper indexing

  2. Changes
    - Add `last_checked_at` timestamp to track when order was last verified with Alpaca
    - Add `check_count` integer to count failed lookup attempts
    - Add `is_stale` boolean to mark orders that should no longer be actively monitored
    - Create composite index for efficient queries on (status, created_at, is_stale)

  3. Migration Strategy
    - Mark existing orders older than 7 days as stale to immediately reduce monitoring load
    - Initialize check_count to 0 for all existing orders
    - Maintain backward compatibility with existing queries

  4. Benefits
    - Reduces database query load
    - Eliminates repeated "order not found" warnings in logs
    - Improves order_fill_monitor performance
    - Maintains accuracy for recent, active orders
*/

-- Add tracking columns to grid_orders table
DO $$
BEGIN
  -- Add last_checked_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grid_orders' AND column_name = 'last_checked_at'
  ) THEN
    ALTER TABLE grid_orders ADD COLUMN last_checked_at timestamptz;
    COMMENT ON COLUMN grid_orders.last_checked_at IS 'Timestamp of last Alpaca API verification attempt';
  END IF;

  -- Add check_count counter
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grid_orders' AND column_name = 'check_count'
  ) THEN
    ALTER TABLE grid_orders ADD COLUMN check_count integer DEFAULT 0 NOT NULL;
    COMMENT ON COLUMN grid_orders.check_count IS 'Number of times order was checked but not found in Alpaca API';
  END IF;

  -- Add is_stale flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grid_orders' AND column_name = 'is_stale'
  ) THEN
    ALTER TABLE grid_orders ADD COLUMN is_stale boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN grid_orders.is_stale IS 'True if order is too old or has failed too many checks to monitor actively';
  END IF;
END $$;

-- Mark existing old orders as stale to immediately reduce monitoring load
-- This will prevent order_fill_monitor from repeatedly checking orders that will never be found
UPDATE grid_orders
SET
  is_stale = true,
  check_count = 5
WHERE
  status IN ('pending', 'partially_filled')
  AND created_at < NOW() - INTERVAL '7 days'
  AND is_stale = false;

-- Create composite index for efficient order_fill_monitor queries
-- This index supports: WHERE status IN (...) AND is_stale = false AND created_at > ...
CREATE INDEX IF NOT EXISTS idx_grid_orders_monitoring
ON grid_orders (status, is_stale, created_at DESC)
WHERE status IN ('pending', 'partially_filled') AND is_stale = false;

-- Create index for last_checked_at to support ordering by check time
CREATE INDEX IF NOT EXISTS idx_grid_orders_last_checked
ON grid_orders (last_checked_at)
WHERE status IN ('pending', 'partially_filled') AND is_stale = false;

-- Log the migration results
DO $$
DECLARE
  stale_count integer;
  active_count integer;
BEGIN
  SELECT COUNT(*) INTO stale_count FROM grid_orders WHERE is_stale = true;
  SELECT COUNT(*) INTO active_count FROM grid_orders WHERE status IN ('pending', 'partially_filled') AND is_stale = false;

  RAISE NOTICE '✅ Stale order tracking migration complete:';
  RAISE NOTICE '   - % orders marked as stale (will not be actively monitored)', stale_count;
  RAISE NOTICE '   - % active orders remaining in monitoring pool', active_count;
  RAISE NOTICE '   - Created composite indexes for efficient queries';
END $$;
