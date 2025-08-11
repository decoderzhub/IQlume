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
    name: 'AAPL Long Call Strategy',
    type: 'long_call',
    description: 'Buy a call option to profit from significant upward movement in Apple stock.',
    risk_level: 'medium',
    min_capital: 5000,
    is_active: false,
    configuration: {
      underlying_symbol: 'AAPL',
      strike_price_above_current: 5, // $5 above current
      expiration_days: 30,
      entry_signal: 'momentum_breakout',
      max_premium_to_pay: 500,
      stop_loss_percent: 50,
      take_profit_percent: 200
    }
  },
  {
    name: 'SPY Long Straddle Strategy',
    type: 'long_straddle',
    description: 'Buy a call and a put at the same strike and expiry to profit from large moves in either direction.',
    risk_level: 'medium',
    min_capital: 8000,
    is_active: false,
    configuration: {
      underlying_symbol: 'SPY',
      strike_price_atm: true,
      expiration_days: 21,
      volatility_threshold: 25,
      max_combined_premium: 1000,
      entry_trigger: 'earnings_release',
      exit_rules: 'Close at 50% profit or 21 DTE'
    }
  },
  {
    name: 'QQQ Long Condor Strategy',
    type: 'long_condor',
    description: 'Buy a lower strike call, sell a mid-low strike call, sell a mid-high strike call, and buy a higher strike call.',
    risk_level: 'low',
    min_capital: 3000,
    is_active: false,
    configuration: {
      underlying_symbol: 'QQQ',
      strike_1: 350, // Lower strike
      strike_2: 360, // Mid-low strike
      strike_3: 370, // Mid-high strike
      strike_4: 380, // Higher strike
      expiration_days: 45,
      target_price_range_lower: 360,
      target_price_range_upper: 370,
      volatility_filter: 20,
      credit_received: 200,
      exit_target_percent: 50
    }
  },
  {
    name: 'TSLA Iron Butterfly Strategy',
    type: 'iron_butterfly',
    description: 'Sell ATM call and put, buy OTM call and put to limit risk. Profits from low volatility near strike price.',
    risk_level: 'medium',
    min_capital: 4000,
    is_active: false,
    configuration: {
      underlying_symbol: 'TSLA',
      short_strike_atm: true,
      long_strikes_otm: 20, // $20 OTM
      expiration_days: 30,
      premium_collected: 300,
      volatility_filter: 30,
      exit_percent_profit_loss: 50
    }
  },
  {
    name: 'NVDA Short Call Strategy',
    type: 'short_call',
    description: 'Sell a call option, expecting the price will stay below the strike. High risk if underlying rises.',
    risk_level: 'high',
    min_capital: 15000,
    is_active: false,
    configuration: {
      underlying_symbol: 'NVDA',
      strike_price_above_current: 10, // $10 above current
      expiration_days: 21,
      minimum_premium: 200,
      margin_requirements: 5000,
      exit_stop_loss_percent: 200
    }
  },
  {
    name: 'META Short Straddle Strategy',
    type: 'short_straddle',
    description: 'Sell call and put at the same strike and expiry, betting on low volatility.',
    risk_level: 'high',
    min_capital: 20000,
    is_active: false,
    configuration: {
      underlying_symbol: 'META',
      strike_atm: true,
      expiration_days: 14,
      premium_threshold: 500,
      volatility_filter: 25,
      stop_loss_per_leg: 300,
      max_loss_allowed: 2000
    }
  },
  {
    name: 'SPY Iron Condor Strategy',
    type: 'iron_condor',
    description: 'Sell OTM call spread and OTM put spread; profit from underlying staying in a range.',
    risk_level: 'medium',
    min_capital: 5000,
    is_active: false,
    configuration: {
      underlying_symbol: 'SPY',
      short_strikes_both_sides: 10, // $10 OTM both sides
      long_strikes_both_sides: 20, // $20 OTM both sides
      expiration_days: 45,
      net_credit: 150,
      volatility_filter: 20,
      exit_targets: 'Close at 25% profit or 21 DTE'
    }
  },
  {
    name: 'IWM Long Butterfly Strategy',
    type: 'long_butterfly',
    description: 'Buy lower strike call, sell two ATM calls, buy higher strike call. Profits from price staying near middle strike.',
    risk_level: 'low',
    min_capital: 2500,
    is_active: false,
    configuration: {
      underlying_symbol: 'IWM',
      lower_strike: 180,
      middle_strike: 190,
      higher_strike: 200,
      expiration_days: 30,
      debit_paid: 100,
      range_expectation: '185-195',
      exit_percent_gain: 100
    }
  },
  {
    name: 'AAPL Covered Calls Enhanced',
    type: 'covered_calls',
    description: 'Own Apple stock and sell call against it to generate income with enhanced exit rules.',
    risk_level: 'low',
    min_capital: 20000,
    is_active: false,
    configuration: {
      underlying_symbol: 'AAPL',
      position_size: 100, // shares
      strike_above_cost_basis: 5, // %
      expiration_days: 30,
      minimum_premium: 150,
      exit_rules: 'Roll when ITM, close at 50% profit'
    }
  },
  {
    name: 'QQQ Long Strangle Strategy',
    type: 'long_strangle',
    description: 'Buy OTM call and OTM put to profit from large moves in either direction.',
    risk_level: 'medium',
    min_capital: 6000,
    is_active: false,
    configuration: {
      underlying_symbol: 'QQQ',
      call_strike_above: 10, // $10 above current
      put_strike_below: 10, // $10 below current
      expiration_days: 30,
      volatility_filter: 20,
      entry_trigger: 'earnings_announcement',
      exit_rules: 'Close at 100% profit or 7 DTE'
    }
  },
  {
    name: 'MSFT Short Call Vertical',
    type: 'short_call_vertical',
    description: 'Sell call at one strike, buy higher strike call to cap risk. Bearish to neutral view.',
    risk_level: 'medium',
    min_capital: 3000,
    is_active: false,
    configuration: {
      underlying_symbol: 'MSFT',
      short_strike: 380, // Sell strike
      long_strike: 390, // Buy strike (higher)
      expiration_days: 30,
      net_credit: 200,
      max_risk_percent: 80,
      stop_loss_exit_percent: 200
    }
  },
  {
    name: 'AMZN Short Put Strategy',
    type: 'short_put',
    description: 'Sell a put option expecting price to stay above strike. Cash-secured strategy.',
    risk_level: 'medium',
    min_capital: 15000,
    is_active: false,
    configuration: {
      underlying_symbol: 'AMZN',
      strike_below_current: 5, // $5 below current
      expiration_days: 30,
      minimum_premium: 100,
      margin_requirements: 15000,
      stop_loss_rules: 'Close at 200% of premium received'
    }
  },
  {
    name: 'GOOGL Short Strangle Strategy',
    type: 'short_strangle',
    description: 'Sell OTM call and OTM put to profit from low volatility.',
    risk_level: 'high',
    min_capital: 25000,
    is_active: false,
    configuration: {
      underlying_symbol: 'GOOGL',
      call_strike_above: 15, // $15 above current
      put_strike_below: 15, // $15 below current
      expiration_days: 21,
      premium_target: 400,
      volatility_filter: 25,
      stop_loss_rules: 'Close individual legs at 200% premium'
    }
  },
  {
    name: 'SPY Short Put Vertical',
    type: 'short_put_vertical',
    description: 'Sell put at one strike, buy lower strike put to limit risk. Bullish to neutral view.',
    risk_level: 'medium',
    min_capital: 2500,
    is_active: false,
    configuration: {
      underlying_symbol: 'SPY',
      short_strike: 470, // Sell strike
      long_strike: 460, // Buy strike (lower)
      expiration_days: 30,
      net_credit: 150,
      risk_percent: 75,
      exit_percent_profit_loss: 50
    }
  },
  {
    name: 'AAPL Broken-Wing Butterfly',
    type: 'broken_wing_butterfly',
    description: 'Like a butterfly spread but one wing is further OTM, reducing cost or adding a directional bias.',
    risk_level: 'medium',
    min_capital: 3500,
    is_active: false,
    configuration: {
      underlying_symbol: 'AAPL',
      lower_strike: 185,
      middle_strike: 195, // ATM
      higher_strike: 210, // Asymmetric - further OTM
      expiration_days: 45,
      debit_credit: -50, // Small debit
      target_price_range: '190-200',
      exit_rules: 'Close at 100% profit or 14 DTE'
    }
  },
  {
    name: 'TSLA Option Collar Strategy',
    type: 'option_collar',
    description: 'Own stock, buy a protective put, sell a covered call to offset cost.',
    risk_level: 'low',
    min_capital: 25000,
    is_active: false,
    configuration: {
      underlying_symbol: 'TSLA',
      position_size: 100, // shares
      put_strike_below: 10, // $10 below current
      call_strike_above: 15, // $15 above current
      expiration_days: 60,
      net_debit_credit: 25, // Small net debit
      exit_triggers: 'Roll collar monthly or close at assignment'
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