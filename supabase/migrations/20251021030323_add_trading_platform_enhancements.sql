/*
  # Trading Platform Enhancements - Watchlists, Alerts, and Data Caching

  1. New Tables
    - `watchlists`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `symbols` (jsonb array of symbols)
      - `order_index` (integer for ordering)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `price_alerts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `symbol` (text)
      - `target_price` (decimal)
      - `condition` (text: 'above', 'below', 'crosses_above', 'crosses_below')
      - `is_active` (boolean)
      - `is_triggered` (boolean)
      - `triggered_at` (timestamptz)
      - `notification_email` (boolean)
      - `notification_push` (boolean)
      - `created_at` (timestamptz)
    
    - `market_data_cache`
      - `id` (uuid, primary key)
      - `symbol` (text)
      - `timeframe` (text: '1m', '5m', '15m', '1h', '4h', '1d', '1w')
      - `timestamp` (timestamptz)
      - `open` (decimal)
      - `high` (decimal)
      - `low` (decimal)
      - `close` (decimal)
      - `volume` (bigint)
      - `cached_at` (timestamptz)
    
    - `portfolio_snapshots`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `total_value` (decimal)
      - `cash_balance` (decimal)
      - `positions_value` (decimal)
      - `day_change` (decimal)
      - `day_change_percent` (decimal)
      - `snapshot_at` (timestamptz)
    
    - `news_cache`
      - `id` (uuid, primary key)
      - `symbol` (text, nullable for market-wide news)
      - `headline` (text)
      - `summary` (text)
      - `author` (text)
      - `source` (text)
      - `url` (text)
      - `published_at` (timestamptz)
      - `sentiment` (text, nullable: 'bullish', 'bearish', 'neutral')
      - `cached_at` (timestamptz)
    
    - `chart_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `chart_type` (text: 'candlestick', 'line', 'area', 'bar')
      - `timeframe` (text: '1m', '5m', '15m', '1h', '4h', '1d', '1w')
      - `indicators` (jsonb array of enabled indicators)
      - `theme_colors` (jsonb)
      - `updated_at` (timestamptz)
    
    - `trading_environment_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique)
      - `default_environment` (text: 'paper', 'live')
      - `current_environment` (text: 'paper', 'live')
      - `show_confirmation_on_switch` (boolean)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add indexes for performance optimization

  3. Important Notes
    - All timestamps use timestamptz for proper timezone handling
    - JSONB columns for flexible data storage
    - Composite indexes for efficient querying
    - Cascading deletes for referential integrity
*/

-- Create watchlists table
CREATE TABLE IF NOT EXISTS watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'My Watchlist',
  symbols jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlists"
  ON watchlists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own watchlists"
  ON watchlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlists"
  ON watchlists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlists"
  ON watchlists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_symbols ON watchlists USING gin(symbols);

-- Create price_alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  target_price decimal NOT NULL,
  condition text NOT NULL CHECK (condition IN ('above', 'below', 'crosses_above', 'crosses_below')),
  is_active boolean DEFAULT true,
  is_triggered boolean DEFAULT false,
  triggered_at timestamptz,
  notification_email boolean DEFAULT true,
  notification_push boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON price_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
  ON price_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON price_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON price_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_symbol ON price_alerts(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active) WHERE is_active = true;

-- Create market_data_cache table
CREATE TABLE IF NOT EXISTS market_data_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  timeframe text NOT NULL CHECK (timeframe IN ('1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M')),
  timestamp timestamptz NOT NULL,
  open decimal NOT NULL,
  high decimal NOT NULL,
  low decimal NOT NULL,
  close decimal NOT NULL,
  volume bigint NOT NULL DEFAULT 0,
  cached_at timestamptz DEFAULT now()
);

ALTER TABLE market_data_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read market data cache"
  ON market_data_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timeframe ON market_data_cache(symbol, timeframe, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_cached_at ON market_data_cache(cached_at);

-- Create portfolio_snapshots table
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_value decimal NOT NULL DEFAULT 0,
  cash_balance decimal NOT NULL DEFAULT 0,
  positions_value decimal NOT NULL DEFAULT 0,
  day_change decimal NOT NULL DEFAULT 0,
  day_change_percent decimal NOT NULL DEFAULT 0,
  snapshot_at timestamptz DEFAULT now()
);

ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolio snapshots"
  ON portfolio_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own portfolio snapshots"
  ON portfolio_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_time ON portfolio_snapshots(user_id, snapshot_at DESC);

-- Create news_cache table
CREATE TABLE IF NOT EXISTS news_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text,
  headline text NOT NULL,
  summary text,
  author text,
  source text,
  url text,
  published_at timestamptz NOT NULL,
  sentiment text CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  cached_at timestamptz DEFAULT now()
);

ALTER TABLE news_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read news cache"
  ON news_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_news_cache_symbol ON news_cache(symbol, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_cache_published ON news_cache(published_at DESC);

-- Create chart_settings table
CREATE TABLE IF NOT EXISTS chart_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  chart_type text DEFAULT 'candlestick' CHECK (chart_type IN ('candlestick', 'line', 'area', 'bar')),
  timeframe text DEFAULT '1d' CHECK (timeframe IN ('1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M')),
  indicators jsonb DEFAULT '[]'::jsonb,
  theme_colors jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chart_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chart settings"
  ON chart_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chart settings"
  ON chart_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chart settings"
  ON chart_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chart_settings_user_id ON chart_settings(user_id);

-- Create trading_environment_preferences table
CREATE TABLE IF NOT EXISTS trading_environment_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  default_environment text DEFAULT 'paper' CHECK (default_environment IN ('paper', 'live')),
  current_environment text DEFAULT 'paper' CHECK (current_environment IN ('paper', 'live')),
  show_confirmation_on_switch boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trading_environment_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own environment preferences"
  ON trading_environment_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own environment preferences"
  ON trading_environment_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own environment preferences"
  ON trading_environment_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trading_env_prefs_user_id ON trading_environment_preferences(user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_watchlists_updated_at ON watchlists;
CREATE TRIGGER update_watchlists_updated_at
  BEFORE UPDATE ON watchlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chart_settings_updated_at ON chart_settings;
CREATE TRIGGER update_chart_settings_updated_at
  BEFORE UPDATE ON chart_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trading_env_prefs_updated_at ON trading_environment_preferences;
CREATE TRIGGER update_trading_env_prefs_updated_at
  BEFORE UPDATE ON trading_environment_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();