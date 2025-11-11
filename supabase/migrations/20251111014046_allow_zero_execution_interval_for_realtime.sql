/*
  # Allow Zero Execution Interval for Real-Time Mode

  1. Changes
    - Update comment on `execution_interval_seconds` to allow 0 for real-time mode
    - Remove minimum constraint of 30 seconds
    - 0 = Real-time WebSocket-driven execution
    - > 0 = Scheduled polling execution

  2. Notes
    - Spot grid bots created with execution_interval=0 will use live WebSocket streams
    - Strategies with execution_interval > 0 will continue using scheduled execution
*/

-- Update comment to reflect that 0 is allowed for real-time mode
COMMENT ON COLUMN trading_strategies.execution_interval_seconds IS 'Execution frequency in seconds. 0 = Real-time WebSocket mode, >0 = Scheduled polling (min 30s recommended for non-realtime).';
