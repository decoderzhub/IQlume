/*
  # Production-Ready Platform Infrastructure

  ## Overview
  This migration adds all necessary tables for a production-ready trading platform including:
  - User profiles with subscription management
  - Community strategy marketplace
  - Risk management and safety features
  - Backtesting infrastructure
  - Notification and alert system

  ## New Tables

  ### 1. `user_profiles`
  Extended user information beyond auth.users
  - Subscription tier management (starter, pro, elite)
  - Risk tolerance and experience level
  - Onboarding status and feature flags
  - Platform preferences

  ### 2. `community_strategies`
  Public marketplace for sharing strategies
  - Creator attribution and revenue sharing
  - Rating and review system
  - Performance verification
  - Tier-based access control

  ### 3. `strategy_reviews`
  User reviews and ratings for community strategies
  - 5-star rating system
  - Written feedback
  - Verified performance indicator

  ### 4. `backtests`
  Backtest results and historical simulation data
  - Strategy configuration snapshot
  - Performance metrics over time
  - Market regime analysis
  - Risk scoring

  ### 5. `user_notifications`
  Notification and alert system
  - Trade execution alerts
  - Risk event notifications
  - Strategy performance updates
  - System announcements

  ### 6. `platform_config`
  Global platform configuration
  - Feature flags
  - Maintenance windows
  - API rate limits
  - Default risk parameters

  ## Security
  - Enable RLS on all new tables
  - Policies ensure users can only access their own data
  - Community strategies have public read with creator write
  - Admin role for platform_config management

  ## Indexes
  - All foreign keys indexed
  - Performance-critical fields indexed
  - Composite indexes for common queries
*/

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Subscription Management
  subscription_tier text NOT NULL DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'pro', 'elite')),
  subscription_status text NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  subscription_started_at timestamptz,
  subscription_ends_at timestamptz,
  trial_ends_at timestamptz,
  
  -- User Profile
  display_name text,
  avatar_url text,
  bio text,
  
  -- Trading Preferences
  risk_tolerance text DEFAULT 'medium' CHECK (risk_tolerance IN ('conservative', 'medium', 'aggressive')),
  experience_level text DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  preferred_asset_classes text[] DEFAULT ARRAY['stocks']::text[],
  
  -- Onboarding
  onboarding_completed boolean DEFAULT false,
  onboarding_step integer DEFAULT 0,
  
  -- Platform Features
  developer_mode_enabled boolean DEFAULT false,
  paper_trading_mode boolean DEFAULT true,
  notifications_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT false,
  
  -- Statistics
  total_strategies_created integer DEFAULT 0,
  total_trades_executed integer DEFAULT 0,
  community_strategies_shared integer DEFAULT 0,
  
  -- Verification
  kyc_verified boolean DEFAULT false,
  kyc_verified_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Community Strategies Table
CREATE TABLE IF NOT EXISTS community_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Strategy Information
  name text NOT NULL,
  description text NOT NULL,
  strategy_type text NOT NULL,
  
  -- Configuration (snapshot of the strategy config)
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Access Control
  tier_required text NOT NULL DEFAULT 'starter' CHECK (tier_required IN ('starter', 'pro', 'elite')),
  is_public boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  
  -- Performance Metrics
  avg_return_percent numeric DEFAULT 0,
  avg_win_rate numeric DEFAULT 0,
  avg_sharpe_ratio numeric,
  max_drawdown_percent numeric DEFAULT 0,
  
  -- Community Engagement
  clone_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  avg_rating numeric DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
  review_count integer DEFAULT 0,
  
  -- Revenue Sharing (for future implementation)
  revenue_share_enabled boolean DEFAULT false,
  revenue_share_percent numeric DEFAULT 0 CHECK (revenue_share_percent >= 0 AND revenue_share_percent <= 100),
  
  -- Tags for Discovery
  tags text[] DEFAULT ARRAY[]::text[],
  
  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'suspended')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Strategy Reviews Table
CREATE TABLE IF NOT EXISTS strategy_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_strategy_id uuid NOT NULL REFERENCES community_strategies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Review Content
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  
  -- Performance Verification
  verified_performance boolean DEFAULT false,
  actual_return_percent numeric,
  days_used integer,
  
  -- Moderation
  is_hidden boolean DEFAULT false,
  flagged boolean DEFAULT false,
  flag_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one review per user per strategy
  UNIQUE(community_strategy_id, user_id)
);

-- Backtests Table
CREATE TABLE IF NOT EXISTS backtests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES trading_strategies(id) ON DELETE SET NULL,
  
  -- Backtest Configuration
  strategy_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  backtest_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Time Period
  start_date date NOT NULL,
  end_date date NOT NULL,
  
  -- Results
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_return_percent numeric DEFAULT 0,
  annualized_return_percent numeric DEFAULT 0,
  max_drawdown_percent numeric DEFAULT 0,
  sharpe_ratio numeric,
  sortino_ratio numeric,
  win_rate numeric DEFAULT 0,
  total_trades integer DEFAULT 0,
  winning_trades integer DEFAULT 0,
  losing_trades integer DEFAULT 0,
  avg_trade_return_percent numeric DEFAULT 0,
  
  -- Risk Score (0-100, higher is riskier)
  risk_score numeric DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_factors jsonb DEFAULT '{}'::jsonb,
  
  -- Market Regime Analysis
  bull_market_return numeric,
  bear_market_return numeric,
  sideways_market_return numeric,
  high_volatility_return numeric,
  
  -- Execution Details
  execution_time_ms integer,
  error_message text,
  
  -- Trade Log (detailed transaction history)
  trade_log jsonb DEFAULT '[]'::jsonb,
  equity_curve jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- User Notifications Table
CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification Type
  type text NOT NULL CHECK (type IN (
    'trade_executed',
    'strategy_started',
    'strategy_stopped',
    'risk_event',
    'position_closed',
    'stop_loss_triggered',
    'take_profit_hit',
    'daily_summary',
    'system_announcement',
    'strategy_update'
  )),
  
  -- Notification Content
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  
  -- Related Entities
  strategy_id uuid REFERENCES trading_strategies(id) ON DELETE SET NULL,
  trade_id uuid REFERENCES trades(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Status
  is_read boolean DEFAULT false,
  read_at timestamptz,
  
  -- Priority
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  
  created_at timestamptz DEFAULT now()
);

-- Platform Configuration Table (Admin Only)
CREATE TABLE IF NOT EXISTS platform_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  
  -- Change Tracking
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

-- Add trigger to update user_profiles.updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Add trigger to update community_strategies.updated_at
CREATE TRIGGER update_community_strategies_updated_at_trigger
  BEFORE UPDATE ON community_strategies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to update strategy_reviews.updated_at
CREATE TRIGGER update_strategy_reviews_updated_at_trigger
  BEFORE UPDATE ON strategy_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update community strategy rating
CREATE OR REPLACE FUNCTION update_community_strategy_rating()
RETURNS TRIGGER AS $$
DECLARE
  new_avg_rating numeric;
  new_review_count integer;
BEGIN
  -- Calculate new average rating and count
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO new_avg_rating, new_review_count
  FROM strategy_reviews
  WHERE community_strategy_id = COALESCE(NEW.community_strategy_id, OLD.community_strategy_id)
    AND is_hidden = false;
  
  -- Update community strategy
  UPDATE community_strategies
  SET 
    avg_rating = new_avg_rating,
    review_count = new_review_count,
    updated_at = now()
  WHERE id = COALESCE(NEW.community_strategy_id, OLD.community_strategy_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rating when reviews change
CREATE TRIGGER update_community_strategy_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON strategy_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_community_strategy_rating();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier ON user_profiles(subscription_tier);

CREATE INDEX IF NOT EXISTS idx_community_strategies_creator ON community_strategies(creator_id);
CREATE INDEX IF NOT EXISTS idx_community_strategies_type ON community_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_community_strategies_tier ON community_strategies(tier_required);
CREATE INDEX IF NOT EXISTS idx_community_strategies_public ON community_strategies(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_community_strategies_verified ON community_strategies(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_community_strategies_rating ON community_strategies(avg_rating DESC);

CREATE INDEX IF NOT EXISTS idx_strategy_reviews_strategy ON strategy_reviews(community_strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_reviews_user ON strategy_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_reviews_rating ON strategy_reviews(rating);

CREATE INDEX IF NOT EXISTS idx_backtests_user ON backtests(user_id);
CREATE INDEX IF NOT EXISTS idx_backtests_strategy ON backtests(strategy_id);
CREATE INDEX IF NOT EXISTS idx_backtests_status ON backtests(status);
CREATE INDEX IF NOT EXISTS idx_backtests_created ON backtests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_user_notifications_created ON user_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for community_strategies
CREATE POLICY "Public strategies visible to all authenticated users"
  ON community_strategies FOR SELECT
  TO authenticated
  USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Users can create community strategies"
  ON community_strategies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own strategies"
  ON community_strategies FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own strategies"
  ON community_strategies FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- RLS Policies for strategy_reviews
CREATE POLICY "Reviews visible to all authenticated users"
  ON strategy_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own reviews"
  ON strategy_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON strategy_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON strategy_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for backtests
CREATE POLICY "Users can view their own backtests"
  ON backtests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own backtests"
  ON backtests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backtests"
  ON backtests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backtests"
  ON backtests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_notifications
CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON user_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON user_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for platform_config (read-only for all, admin write)
CREATE POLICY "All authenticated users can view platform config"
  ON platform_config FOR SELECT
  TO authenticated
  USING (true);

-- Insert default platform configuration
INSERT INTO platform_config (key, value, description) VALUES
  ('max_active_strategies_per_user', '{"starter": 3, "pro": 10, "elite": 50}', 'Maximum number of active strategies per subscription tier'),
  ('max_daily_trades_per_user', '{"starter": 10, "pro": 100, "elite": 1000}', 'Maximum daily trades per subscription tier'),
  ('paper_trading_required_days', '7', 'Required days of paper trading before live trading'),
  ('default_risk_limits', '{"max_position_size_percent": 20, "max_daily_loss_percent": 5, "max_portfolio_drawdown_percent": 20}', 'Default risk limits for new strategies'),
  ('maintenance_mode', 'false', 'Platform maintenance mode flag')
ON CONFLICT (key) DO NOTHING;
