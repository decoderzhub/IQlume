/*
  # Fix duplicate performance column assignments in trigger

  1. Problem
    - The update_strategy_performance_on_trade trigger was assigning to the performance column multiple times
    - This causes PostgreSQL error: "multiple assignments to same column"

  2. Solution
    - Chain the jsonb_set calls instead of separate assignments
    - Build the performance JSONB object incrementally in a single assignment
*/

CREATE OR REPLACE FUNCTION update_strategy_performance_on_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_performance jsonb;
BEGIN
  -- Only update for executed trades
  IF NEW.status = 'executed' AND NEW.strategy_id IS NOT NULL THEN
    -- Calculate current performance
    v_performance := calculate_strategy_performance(NEW.strategy_id);
    
    -- Update trading_strategies table with chained jsonb_set calls
    UPDATE trading_strategies
    SET 
      total_profit_loss = (v_performance->>'total_profit_loss')::numeric,
      last_execution = NEW.updated_at,
      execution_count = COALESCE(execution_count, 0) + 1,
      performance = jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(performance, '{}'::jsonb),
            '{total_trades}',
            to_jsonb((v_performance->>'total_trades')::integer)
          ),
          '{win_rate}',
          to_jsonb((v_performance->>'win_rate')::numeric)
        ),
        '{total_return}',
        to_jsonb((v_performance->>'total_profit_loss')::numeric)
      )
    WHERE id = NEW.strategy_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;