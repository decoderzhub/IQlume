import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define all strategies with their configurations based on the chart
const strategiesToSeed = [
  {
    name: 'Spot Grid Bot',
    type: 'spot_grid',
    description: 'Automates buy-low/sell-high trades within a defined price range for cryptocurrency trading.',
    risk_level: 'low',
    min_capital: 1000,
    is_active: false,
    configuration: {
      allocated_capital: 1000,
      price_range_lower: 0,
      price_range_upper: 0,
      number_of_grids: 20,
      grid_mode: 'arithmetic'
    }
  },
  {
    name: 'Futures Grid Bot',
    type: 'futures_grid',
    description: 'Grid trading on futures market with leverage support for advanced traders.',
    risk_level: 'medium',
    min_capital: 2000,
    is_active: false,
    configuration: {
      allocated_capital: 2000,
      price_range_lower: 0,
      price_range_upper: 0,
      number_of_grids: 25,
      grid_mode: 'arithmetic',
      direction: 'long',
      leverage: 3
    }
  },
  {
    name: 'Infinity Grid Bot',
    type: 'infinity_grid',
    description: 'Grid trading without upper price limit for trending markets and bull runs.',
    risk_level: 'medium',
    min_capital: 1500,
    is_active: false,
    configuration: {
      allocated_capital: 1500,
      price_range_lower: 0,
      number_of_grids: 30,
      grid_mode: 'geometric'
    }
  },
  {
    name: 'DCA Bot (Dollar-Cost Averaging)',
    type: 'dca',
    description: 'Automatically invests at fixed intervals to minimize volatility risk through systematic purchasing.',
    risk_level: 'low',
    min_capital: 500,
    is_active: false,
    configuration: {
      allocated_capital: 500,
      investment_amount_per_interval: 50,
      frequency: 'daily',
      investment_target_percent: 25
    }
  },
  {
    name: 'Smart Rebalance Bot',
    type: 'smart_rebalance',
    description: 'Maintains target allocations in a portfolio of selected assets through automatic rebalancing.',
    risk_level: 'low',
    min_capital: 5000,
    is_active: false,
    configuration: {
      allocated_capital: 5000,
      assets: [],
      trigger_type: 'threshold',
      threshold_deviation_percent: 5,
      rebalance_frequency: 'weekly'
    }
  },
  {
    name: 'Covered Calls',
    type: 'covered_calls',
    description: 'Generate income by selling call options on owned stocks while maintaining the underlying position.',
    risk_level: 'low',
    min_capital: 15000,
    is_active: false,
    configuration: {
      allocated_capital: 15000,
      position_size: 100,
      strike_delta: 0.30,
      expiration_days: 30,
      minimum_premium: 200,
      profit_target: 50,
      roll_when_itm: true
    },
    performance: {
      total_return: 0.085,
      win_rate: 0.82,
      max_drawdown: 0.04,
      sharpe_ratio: 1.65,
      total_trades: 28,
      avg_trade_duration: 30,
      volatility: 0.08,
      standard_deviation: 0.07,
      beta: 0.68,
      alpha: 0.022,
      value_at_risk: -0.012,
    }
  },
  {
    name: 'Iron Condor',
    type: 'iron_condor',
    description: 'Profit from low volatility with defined risk spreads on an underlying asset.',
    risk_level: 'medium',
    min_capital: 5000,
    is_active: false,
    configuration: {
      allocated_capital: 5000,
      wing_width: 10,
      short_strike_delta: 0.20,
      expiration_days: 45,
      net_credit_target: 200,
      profit_target: 25,
      stop_loss: { value: 200, type: 'percentage' }
    },
    performance: {
      total_return: 0.095,
      win_rate: 0.75,
      max_drawdown: 0.08,
      sharpe_ratio: 1.25,
      total_trades: 36,
      avg_trade_duration: 35,
      volatility: 0.16,
      standard_deviation: 0.14,
      beta: 0.85,
      alpha: 0.012,
      value_at_risk: -0.024,
    }
  },
  {
    name: 'Long Straddle',
    type: 'straddle',
    description: 'Profit from high volatility in either direction using long straddle options strategy.',
    risk_level: 'medium',
    min_capital: 8000,
    is_active: false,
    configuration: {
      allocated_capital: 8000,
      strike_selection: 'atm',
      expiration_days: 30,
      volatility_threshold: 20,
      max_premium_percent: 12,
      stop_loss: { value: 50, type: 'percentage' },
      take_profit: { value: 100, type: 'percentage' }
    }
  },
  {
    name: 'The Wheel',
    type: 'wheel',
    description: 'Systematic approach combining cash-secured puts and covered calls for consistent income generation.',
    risk_level: 'low',
    min_capital: 20000,
    is_active: false,
    configuration: {
      allocated_capital: 20000,
      position_size: 100,
      put_strike_delta: -0.30,
      call_strike_delta: 0.30,
      expiration_days: 30,
      minimum_premium: 150,
      assignment_handling: 'automatic'
    }
  },
  {
    name: 'Opening Range Breakout (ORB)',
    type: 'orb',
    description: 'Trade breakouts from the first 15-30 minutes of market open for momentum capture.',
    risk_level: 'medium',
    min_capital: 5000,
    is_active: false,
    configuration: {
      allocated_capital: 5000,
      orb_period: 30,
      breakout_threshold: 0.002,
      stop_loss: { value: 1, type: 'percentage' },
      take_profit: { value: 2, type: 'percentage' },
      max_position_size: 100
    }
  },
  {
    name: 'Long Call - Bullish Momentum',
    type: 'long_call',
    description: 'Bullish momentum play using long call options for leveraged upside exposure on an underlying asset.',
    risk_level: 'medium',
    min_capital: 5000,
    is_active: false,
    configuration: {
      allocated_capital: 5000,
      strike_delta: 0.30,
      expiration_days: 30,
      max_premium_percent: 10,
      stop_loss: { value: 50, type: 'percentage' }
    }
  },
  {
    name: 'Long Straddle - Volatility Play',
    type: 'long_straddle',
    description: 'Volatility play around earnings using long straddle on an underlying asset for directional movement profits.',
    risk_level: 'medium',
    min_capital: 8000,
    is_active: false,
    configuration: {
      allocated_capital: 8000,
      strike_selection: 'atm',
      expiration_days: 30,
      volatility_threshold: 20,
      max_premium_percent: 12,
      stop_loss: { value: 50, type: 'percentage' },
      take_profit: { value: 100, type: 'percentage' }
    }
  },
  {
    name: 'Long Condor - Range Bound',
    type: 'long_condor',
    description: 'Range-bound profit strategy using long condor spreads on an underlying asset for sideways market conditions.',
    risk_level: 'low',
    min_capital: 3000,
    is_active: false,
    configuration: {
      allocated_capital: 3000,
      wing_width: 10,
      body_width: 10,
      expiration_days: 45,
      max_debit_percent: 8,
      profit_target: 50,
      stop_loss: { value: 100, type: 'percentage' }
    }
  },
  {
    name: 'Iron Butterfly - Low Volatility',
    type: 'iron_butterfly',
    description: 'Low volatility income strategy using iron butterfly on an underlying stock for range-bound markets.',
    risk_level: 'medium',
    min_capital: 4000,
    is_active: false,
    configuration: {
      allocated_capital: 4000,
      wing_width: 20,
      expiration_days: 30,
      net_credit_target: 300,
      volatility_filter: 25,
      profit_target: 50,
      stop_loss: { value: 200, type: 'percentage' }
    }
  },
  {
    name: 'Short Call - Premium Collection',
    type: 'short_call',
    description: 'High-risk premium collection strategy selling naked calls on an underlying stock with defined risk management.',
    risk_level: 'high',
    min_capital: 15000,
    is_active: false,
    configuration: {
      allocated_capital: 15000,
      strike_delta: 0.20,
      expiration_days: 30,
      minimum_premium: 300,
      stop_loss: { value: 200, type: 'percentage' },
      margin_requirement: 10000
    }
  },
  {
    name: 'Short Straddle - Ultra High Risk',
    type: 'short_straddle',
    description: 'Ultra-high risk volatility selling strategy using short straddles on an underlying stock for premium income.',
    risk_level: 'high',
    min_capital: 20000,
    is_active: false,
    configuration: {
      allocated_capital: 20000,
      strike_selection: 'atm',
      expiration_days: 21,
      minimum_premium: 600,
      volatility_filter: 25,
      stop_loss: { value: 200, type: 'percentage' },
      max_loss_per_trade: 3000
    }
  },
  {
    name: 'Long Butterfly - Precision Targeting',
    type: 'long_butterfly',
    description: 'Precision targeting strategy using long butterfly spreads on an underlying asset for specific price level profits.',
    risk_level: 'low',
    min_capital: 2500,
    is_active: false,
    configuration: {
      allocated_capital: 2500,
      wing_width: 10,
      expiration_days: 30,
      max_debit: 150,
      profit_target: 100,
      stop_loss: { value: 50, type: 'percentage' }
    }
  },
  {
    name: 'Long Strangle - Directional Volatility',
    type: 'long_strangle',
    description: 'Directional volatility strategy using long strangles on an underlying asset for large directional moves.',
    risk_level: 'medium',
    min_capital: 6000,
    is_active: false,
    configuration: {
      allocated_capital: 6000,
      call_delta: 0.25,
      put_delta: -0.25,
      expiration_days: 30,
      volatility_threshold: 25,
      profit_target: 100,
      stop_loss: { value: 50, type: 'percentage' }
    }
  },
  {
    name: 'Short Call Vertical - Bearish Spread',
    type: 'short_call_vertical',
    description: 'Bearish spread strategy using short call verticals on an underlying stock with defined maximum risk.',
    risk_level: 'medium',
    min_capital: 3000,
    is_active: false,
    configuration: {
      allocated_capital: 3000,
      wing_width: 10,
      short_strike_delta: 0.30,
      expiration_days: 30,
      net_credit_target: 250,
      profit_target: 50,
      stop_loss: { value: 200, type: 'percentage' }
    }
  },
  {
    name: 'Short Put - Cash Secured',
    type: 'short_put',
    description: 'Cash-secured put strategy on an underlying stock for income generation with potential stock acquisition.',
    risk_level: 'medium',
    min_capital: 15000,
    is_active: false,
    configuration: {
      allocated_capital: 15000,
      strike_delta: -0.30,
      expiration_days: 30,
      minimum_premium: 150,
      profit_target: 50,
      stop_loss: { value: 200, type: 'percentage' }
    }
  },
  {
    name: 'Short Strangle - Premium Collection',
    type: 'short_strangle',
    description: 'Premium collection strategy using short strangles on an underlying stock for low volatility environments.',
    risk_level: 'high',
    min_capital: 25000,
    is_active: false,
    configuration: {
      allocated_capital: 25000,
      call_delta: 0.20,
      put_delta: -0.20,
      expiration_days: 21,
      minimum_premium: 500,
      volatility_filter: 25,
      profit_target: 50,
      stop_loss: { value: 200, type: 'percentage' }
    }
  },
  {
    name: 'Short Put Vertical - Bullish Spread',
    type: 'short_put_vertical',
    description: 'Bullish spread strategy using short put verticals on an underlying asset with limited risk profile.',
    risk_level: 'medium',
    min_capital: 2500,
    is_active: false,
    configuration: {
      allocated_capital: 2500,
      wing_width: 10,
      short_strike_delta: -0.30,
      expiration_days: 30,
      net_credit_target: 200,
      profit_target: 50,
      stop_loss: { value: 200, type: 'percentage' }
    }
  },
  {
    name: 'Broken-Wing Butterfly - Asymmetric',
    type: 'broken_wing_butterfly',
    description: 'Asymmetric spread strategy using broken-wing butterfly on an underlying stock with directional bias.',
    risk_level: 'medium',
    min_capital: 3500,
    is_active: false,
    configuration: {
      allocated_capital: 3500,
      short_wing_width: 10,
      long_wing_width: 15,
      expiration_days: 45,
      max_debit: 100,
      profit_target: 100,
      stop_loss: { value: 150, type: 'percentage' }
    }
  },
  {
    name: 'Option Collar - Protective Strategy',
    type: 'option_collar',
    description: 'Protective strategy using option collars on an underlying stock to limit downside while capping upside.',
    risk_level: 'low',
    min_capital: 25000,
    is_active: false,
    configuration: {
      allocated_capital: 25000,
      position_size: 100,
      put_delta: -0.25,
      call_delta: 0.25,
      expiration_days: 45,
      net_cost_target: 50,
      roll_frequency: 'monthly'
    }
  },
  {
    name: 'Mean Reversion - Contrarian',
    type: 'mean_reversion',
    description: 'Contrarian strategy that profits from price reversions to the mean using statistical analysis.',
    risk_level: 'medium',
    min_capital: 7500,
    is_active: false,
    configuration: {
      allocated_capital: 7500,
      lookback_period: 20,
      deviation_threshold: 2.0,
      position_size: 100,
      stop_loss: { value: 1, type: 'percentage' },
      take_profit: { value: 1.5, type: 'percentage' }
    }
  },
  {
    name: 'Momentum Breakout - Trend Following',
    type: 'momentum_breakout',
    description: 'Trend following strategy that captures momentum breakouts using technical indicators.',
    risk_level: 'medium',
    min_capital: 6000,
    is_active: false,
    configuration: {
      allocated_capital: 6000,
      breakout_threshold: 0.03,
      volume_confirmation: true,
      position_size: 100,
      stop_loss: { value: 2, type: 'percentage' },
      take_profit: { value: 5, type: 'percentage' }
    }
  },
  {
    name: 'Pairs Trading - Market Neutral',
    type: 'pairs_trading',
    description: 'Market neutral strategy trading correlated pairs to profit from relative price movements.',
    risk_level: 'low',
    min_capital: 10000,
    is_active: false,
    configuration: {
      allocated_capital: 10000,
      correlation_threshold: 0.8,
      z_score_entry: 2.0,
      z_score_exit: 0.5,
      lookback_period: 60,
      position_ratio: 1.0
    }
  },
  {
    name: 'Scalping - High Frequency',
    type: 'scalping',
    description: 'High frequency scalping strategy for quick profits on small price movements.',
    risk_level: 'high',
    min_capital: 15000,
    is_active: false,
    configuration: {
      allocated_capital: 15000,
      time_frame: '1m',
      profit_target: 0.1,
      stop_loss: { value: 0.05, type: 'percentage' },
      max_trades_per_day: 50,
      position_size: 100
    }
  },
  {
    name: 'Swing Trading - Multi-Day Holds',
    type: 'swing_trading',
    description: 'Multi-day swing trading strategy capturing intermediate price movements using technical analysis.',
    risk_level: 'medium',
    min_capital: 8000,
    is_active: false,
    configuration: {
      allocated_capital: 8000,
      holding_period_min: 2,
      holding_period_max: 10,
      rsi_oversold: 30,
      rsi_overbought: 70,
      position_size: 100,
      stop_loss: { value: 3, type: 'percentage' },
      take_profit: { value: 6, type: 'percentage' }
    }
  },
  {
    name: 'Arbitrage - Cross-Exchange',
    type: 'arbitrage',
    description: 'Cross-exchange arbitrage strategy exploiting price differences between trading venues.',
    risk_level: 'low',
    min_capital: 12000,
    is_active: false,
    configuration: {
      allocated_capital: 12000,
      min_spread_threshold: 0.5,
      execution_speed: 'fast',
      max_position_size: 1000,
      exchanges: ['primary', 'secondary']
    }
  },
  {
    name: 'News-Based Trading - Event Driven',
    type: 'news_based_trading',
    description: 'Event-driven strategy that trades based on news sentiment and market reactions.',
    risk_level: 'high',
    min_capital: 10000,
    is_active: false,
    configuration: {
      allocated_capital: 10000,
      sentiment_threshold: 0.7,
      news_sources: ['reuters', 'bloomberg', 'cnbc'],
      reaction_window: 30,
      position_size: 100,
      stop_loss: { value: 2, type: 'percentage' },
      take_profit: { value: 4, type: 'percentage' }
    }
  }
];

async function seedStrategies() {
  try {
    console.log('🌱 Starting strategy seeding process...');
    
    // Get the current user (you'll need to replace this with actual user ID)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user found. Please ensure you are logged in.');
      console.error('You may need to manually set a user_id in this script for seeding.');
      
      // For seeding purposes, you can uncomment and set a specific user ID:
      // const userId = 'your-user-id-here';
      // console.log('Using manual user ID for seeding:', userId);
      
      return;
    }
    
    const userId = user.id;
    console.log('✅ Found user:', user.email, 'ID:', userId);
    
    // Check if strategies already exist to avoid duplicates
    const { data: existingStrategies, error: checkError } = await supabase
      .from('trading_strategies')
      .select('name, type')
      .eq('user_id', userId);
    
    if (checkError) {
      console.error('❌ Error checking existing strategies:', checkError);
      return;
    }
    
    const existingNames = new Set(existingStrategies?.map(s => s.name) || []);
    const existingTypes = new Set(existingStrategies?.map(s => s.type) || []);
    
    console.log(`📊 Found ${existingStrategies?.length || 0} existing strategies`);
    
    // Filter out strategies that already exist (by name or type)
    const newStrategies = strategiesToSeed.filter(strategy => 
      !existingNames.has(strategy.name) && !existingTypes.has(strategy.type)
    );
    
    if (newStrategies.length === 0) {
      console.log('✅ All strategies already exist. No new strategies to seed.');
      return;
    }
    
    console.log(`🚀 Seeding ${newStrategies.length} new strategies...`);
    
    // Insert strategies one by one for better error handling
    let successCount = 0;
    let errorCount = 0;
    
    for (const strategy of newStrategies) {
      try {
        const { data, error } = await supabase
          .from('trading_strategies')
          .insert([{
            user_id: userId,
            name: strategy.name,
            type: strategy.type,
            description: strategy.description,
            risk_level: strategy.risk_level,
            min_capital: strategy.min_capital,
            is_active: strategy.is_active,
            configuration: strategy.configuration
          }])
          .select()
          .single();
        
        if (error) {
          console.error(`❌ Failed to create strategy "${strategy.name}":`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Created strategy: "${strategy.name}" (ID: ${data.id})`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Unexpected error creating strategy "${strategy.name}":`, err);
        errorCount++;
      }
    }
    
    console.log('\n📈 Seeding Summary:');
    console.log(`✅ Successfully created: ${successCount} strategies`);
    console.log(`❌ Failed to create: ${errorCount} strategies`);
    console.log(`📊 Total strategies in database: ${(existingStrategies?.length || 0) + successCount}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Strategy seeding completed successfully!');
      console.log('💡 You can now view these strategies in the Strategies section of your app.');
      console.log('⚙️  Remember to configure and backtest each strategy before activating.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during strategy seeding:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedStrategies()
  .then(() => {
    console.log('🏁 Seeding process completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding process failed:', error);
    process.exit(1);
  });