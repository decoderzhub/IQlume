export const INITIAL_LAUNCH_STRATEGY_TYPES = [
  'wheel',
  'covered_calls',
  'short_put', // Cash-Secured Put Bot
  'dca',
  'smart_rebalance',
  'spot_grid',
  'futures_grid',
  'infinity_grid',
];

// Strategy tier requirements based on subscription plans
export const STRATEGY_TIERS = {
  // Starter tier strategies (Free/$19)
  'dca': 'starter',
  'smart_rebalance': 'starter',
  
  // Pro tier strategies ($49)
  'wheel': 'pro',
  'covered_calls': 'pro',
  'short_put': 'pro',
  'spot_grid': 'pro',
  
  // Elite tier strategies ($149)
  'futures_grid': 'elite',
  'infinity_grid': 'elite',
  'iron_condor': 'elite',
  'straddle': 'elite',
  'long_call': 'elite',
  'short_call': 'elite',
  'long_straddle': 'elite',
  'short_straddle': 'elite',
  'long_butterfly': 'elite',
  'iron_butterfly': 'elite',
  'broken_wing_butterfly': 'elite',
  'option_collar': 'elite',
  'mean_reversion': 'elite',
  'momentum_breakout': 'elite',
  'pairs_trading': 'elite',
  'scalping': 'elite',
  'swing_trading': 'elite',
  'arbitrage': 'elite',
  'news_based_trading': 'elite',
} as const;
