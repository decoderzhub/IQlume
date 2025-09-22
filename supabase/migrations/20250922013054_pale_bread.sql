/*
  # Add missing strategy types to enum

  1. Database Updates
    - Add all missing strategy types to the strategy_type enum
    - Ensure all strategy types from the frontend are supported
    - Maintain backward compatibility with existing strategies

  2. New Strategy Types Added
    - long_call, long_straddle, long_condor, iron_butterfly
    - short_call, short_straddle, long_butterfly, short_put
    - short_strangle, short_put_vertical, short_call_vertical
    - broken_wing_butterfly, option_collar, long_strangle
    - mean_reversion, momentum_breakout, pairs_trading
    - scalping, swing_trading, arbitrage, news_based_trading
*/

-- Add missing strategy types to the enum
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'long_call';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'long_straddle';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'long_condor';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'iron_butterfly';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'short_call';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'short_straddle';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'long_butterfly';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'short_put';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'short_strangle';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'short_put_vertical';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'short_call_vertical';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'broken_wing_butterfly';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'option_collar';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'long_strangle';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'mean_reversion';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'momentum_breakout';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'pairs_trading';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'scalping';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'swing_trading';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'arbitrage';
ALTER TYPE strategy_type ADD VALUE IF NOT EXISTS 'news_based_trading';